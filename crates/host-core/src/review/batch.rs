//! Turn-scoped batch guard and rollback over per-message snapshots.

use anyhow::{anyhow, Context, Result};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

use super::{
    before_path, hash_file, metadata_path, read_meta, restore_before, snapshot_dir, write_meta,
    ReviewChangeState, RollbackOutcome, SnapshotMeta, REVIEW_DIR,
};
use crate::workspace;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckTurnBlockedBy {
    pub session_id: String,
    pub message_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckTurnFile {
    pub path: String,
    pub clean: bool,
    pub reversible: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blocked_by: Option<CheckTurnBlockedBy>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckTurnResult {
    pub clean: bool,
    pub files: Vec<CheckTurnFile>,
}

/// One snapshot that belongs to a per-file rollback group.
struct GroupEntry {
    /// Position inside the caller-provided snapshot id slice.
    index: usize,
    snapshot_id: String,
    dir: PathBuf,
    meta: SnapshotMeta,
}

/// All snapshots of a turn batch that touched the same workspace file, in
/// chronological (caller-provided) order.
struct FileGroup {
    path: String,
    entries: Vec<GroupEntry>,
}

struct BatchPlan {
    groups: Vec<FileGroup>,
    /// Input indexes whose meta was missing, unreadable, or foreign.
    missing: Vec<usize>,
}

/// Load the requested snapshots and group them by workspace path. A snapshot
/// whose meta cannot be loaded is not an error: it is recorded as missing and
/// excluded from grouping so the rest of the batch can still be evaluated.
fn plan_batch(data_dir: &Path, session_id: &str, snapshot_ids: &[String]) -> BatchPlan {
    let mut groups: Vec<FileGroup> = Vec::new();
    let mut missing = Vec::new();
    for (index, snapshot_id) in snapshot_ids.iter().enumerate() {
        let Ok(meta) = read_meta(data_dir, session_id, snapshot_id) else {
            missing.push(index);
            continue;
        };
        let Ok(dir) = snapshot_dir(data_dir, session_id, snapshot_id) else {
            missing.push(index);
            continue;
        };
        let entry = GroupEntry {
            index,
            snapshot_id: snapshot_id.clone(),
            dir,
            meta,
        };
        match groups
            .iter_mut()
            .find(|group| group.path == entry.meta.path)
        {
            Some(group) => group.entries.push(entry),
            None => groups.push(FileGroup {
                path: entry.meta.path.clone(),
                entries: vec![entry],
            }),
        }
    }
    BatchPlan { groups, missing }
}

struct GroupEvaluation {
    clean: bool,
    reversible: bool,
    /// The guard could not run because the workspace target is unavailable.
    unavailable: bool,
    current_hash: Option<String>,
}

/// Evaluate one file group against the current workspace state. The guard
/// compares the current file against the LAST ACTIVE snapshot's after state
/// with exactly the match semantics of `rollback_change`.
fn evaluate_group(
    group: &FileGroup,
    workspace_root: Option<&Path>,
    batch_has_missing: bool,
) -> GroupEvaluation {
    let mut active = group
        .entries
        .iter()
        .filter(|entry| entry.meta.state == ReviewChangeState::Active);
    let Some(earliest_active) = active.next() else {
        // Every snapshot of this file is already rolled back.
        return GroupEvaluation {
            clean: true,
            reversible: true,
            unavailable: false,
            current_hash: None,
        };
    };
    let last_active = active.next_back().unwrap_or(earliest_active);
    let Some(root) = workspace_root else {
        return GroupEvaluation {
            clean: false,
            reversible: false,
            unavailable: true,
            current_hash: None,
        };
    };
    let Ok(target) = workspace::resolve_in_workspace(root, &group.path) else {
        return GroupEvaluation {
            clean: false,
            reversible: false,
            unavailable: true,
            current_hash: None,
        };
    };
    let current_exists = target.is_file();
    let current_hash = if current_exists {
        hash_file(&target).ok()
    } else {
        None
    };
    let clean = match (&last_active.meta.after_hash, current_exists) {
        (Some(expected), true) => current_hash.as_deref() == Some(expected.as_str()),
        (None, false) => true,
        _ => false,
    };
    let reversible = !batch_has_missing && earliest_active.meta.reversible;
    GroupEvaluation {
        clean,
        reversible,
        unavailable: false,
        current_hash,
    }
}

/// Scan every stored snapshot of every other session for an active change to
/// the same file whose after hash matches the current file content. That
/// proves the divergence came from another session rather than from an
/// external edit. Directory traversal is sorted so the result is
/// deterministic; unreadable entries are skipped.
/// Attribute a guard failure to another session's snapshot. Attribution is
/// advisory only — it never affects the guard itself — so two limitations are
/// accepted: the scan is O(all snapshots) per conflicted file, and metas do
/// not record workspace roots, so a same-path file with identical bytes in a
/// different project's session can produce a false (but harmless) attribution.
fn find_blocked_by(
    data_dir: &Path,
    session_id: &str,
    path: &str,
    current_hash: Option<&str>,
) -> Option<CheckTurnBlockedBy> {
    let current_hash = current_hash?;
    let base = data_dir.join(REVIEW_DIR);
    let entries = fs::read_dir(base).ok()?;
    let mut session_dirs: Vec<PathBuf> = entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| path.is_dir())
        .collect();
    session_dirs.sort();
    for session_dir in session_dirs {
        let other_session = session_dir.file_name()?.to_string_lossy().to_string();
        if other_session == session_id {
            continue;
        }
        let Ok(snapshots) = fs::read_dir(&session_dir) else {
            continue;
        };
        let mut snapshot_dirs: Vec<PathBuf> = snapshots
            .flatten()
            .map(|entry| entry.path())
            .filter(|path| path.is_dir())
            .collect();
        snapshot_dirs.sort();
        for snapshot_dir in snapshot_dirs {
            let Ok(bytes) = fs::read(metadata_path(&snapshot_dir)) else {
                continue;
            };
            let Ok(meta) = serde_json::from_slice::<SnapshotMeta>(&bytes) else {
                continue;
            };
            if meta.session_id == other_session
                && meta.path == path
                && meta.state == ReviewChangeState::Active
                && meta.after_hash.as_deref() == Some(current_hash)
            {
                return Some(CheckTurnBlockedBy {
                    session_id: other_session,
                    message_id: meta.message_id,
                });
            }
        }
    }
    None
}

/// Read-only turn guard: report per file whether the workspace still matches
/// the batch's newest after state and whether the batch can be rolled back.
pub fn check_snapshots_clean(
    data_dir: &Path,
    session_id: &str,
    snapshot_ids: &[String],
    workspace_root: Option<&Path>,
) -> Result<CheckTurnResult> {
    let plan = plan_batch(data_dir, session_id, snapshot_ids);
    let batch_has_missing = !plan.missing.is_empty();
    let mut clean = !batch_has_missing;
    let mut files = Vec::with_capacity(plan.groups.len());
    for group in &plan.groups {
        let evaluation = evaluate_group(group, workspace_root, batch_has_missing);
        let blocked_by = if !evaluation.clean && !evaluation.unavailable {
            find_blocked_by(
                data_dir,
                session_id,
                &group.path,
                evaluation.current_hash.as_deref(),
            )
        } else {
            None
        };
        clean = clean && evaluation.clean && evaluation.reversible;
        files.push(CheckTurnFile {
            path: group.path.clone(),
            clean: evaluation.clean,
            reversible: evaluation.reversible,
            blocked_by,
        });
    }
    Ok(CheckTurnResult { clean, files })
}

/// Roll back a whole turn batch. Snapshots touching the same file restore the
/// EARLIEST ACTIVE snapshot's before state in one pass, guarded by the LAST
/// ACTIVE snapshot's after hash. One file's conflict or unavailable result
/// never aborts the rest of the batch.
///
/// `snapshot_ids` must arrive in chronological (message) order: the earliest/
/// latest semantics that pick restore bytes and guard hashes are positional.
pub fn rollback_batch(
    data_dir: &Path,
    session_id: &str,
    snapshot_ids: &[String],
    workspace_root: Option<&Path>,
) -> Result<Vec<RollbackOutcome>> {
    let plan = plan_batch(data_dir, session_id, snapshot_ids);
    let batch_has_missing = !plan.missing.is_empty();
    let mut outcomes: Vec<Option<RollbackOutcome>> = snapshot_ids.iter().map(|_| None).collect();
    for index in &plan.missing {
        outcomes[*index] = Some(RollbackOutcome {
            status: "unavailable",
            snapshot_id: snapshot_ids[*index].clone(),
            message_id: String::new(),
            path: String::new(),
        });
    }
    for group in &plan.groups {
        let fill = |outcomes: &mut [Option<RollbackOutcome>], status: &'static str| {
            for entry in &group.entries {
                outcomes[entry.index] = Some(RollbackOutcome {
                    status,
                    snapshot_id: entry.snapshot_id.clone(),
                    message_id: entry.meta.message_id.clone(),
                    path: entry.meta.path.clone(),
                });
            }
        };
        let has_active = group
            .entries
            .iter()
            .any(|entry| entry.meta.state == ReviewChangeState::Active);
        if !has_active {
            fill(&mut outcomes, "alreadyRolledBack");
            continue;
        }
        let evaluation = evaluate_group(group, workspace_root, batch_has_missing);
        if evaluation.unavailable || !evaluation.reversible {
            fill(&mut outcomes, "unavailable");
            continue;
        }
        if !evaluation.clean {
            fill(&mut outcomes, "conflict");
            continue;
        }
        // The evaluation above already proved the root and target resolve.
        let Some(root) = workspace_root else {
            fill(&mut outcomes, "unavailable");
            continue;
        };
        let Ok(target) = workspace::resolve_in_workspace(root, &group.path) else {
            fill(&mut outcomes, "unavailable");
            continue;
        };
        let Some(earliest_active) = group
            .entries
            .iter()
            .find(|entry| entry.meta.state == ReviewChangeState::Active)
        else {
            fill(&mut outcomes, "unavailable");
            continue;
        };
        // Per-group I/O isolation: one failing file must not strand the rest
        // of the batch, so restore/meta errors degrade to "unavailable" for
        // this group instead of aborting the call. A meta write that fails
        // after a successful restore leaves the file reverted but its state
        // Active; the next preflight reports a conflict, never a blind write.
        let restore_result: Result<()> = (|| {
            if earliest_active.meta.before_exists {
                restore_before(&target, &before_path(&earliest_active.dir))?;
            } else if target.exists() {
                if !target.is_file() {
                    return Err(anyhow!("turn rollback target is not a file"));
                }
                fs::remove_file(&target).context("remove created file during rollback")?;
            }
            for entry in &group.entries {
                let mut meta = entry.meta.clone();
                meta.state = ReviewChangeState::RolledBack;
                write_meta(&metadata_path(&entry.dir), &meta)?;
            }
            Ok(())
        })();
        match restore_result {
            Ok(()) => fill(&mut outcomes, "rolledBack"),
            Err(error) => {
                tracing::warn!(
                    error = %error,
                    path = %group.path,
                    "turn rollback failed for file"
                );
                fill(&mut outcomes, "unavailable");
            }
        }
    }
    Ok(outcomes
        .into_iter()
        .map(|outcome| outcome.expect("every snapshot produced an outcome"))
        .collect())
}
