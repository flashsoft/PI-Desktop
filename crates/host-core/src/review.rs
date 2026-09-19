//! Durable, message-scoped workspace change snapshots.
//!
//! Review evidence is captured at tool execution time instead of being
//! reconstructed from a mutable git working tree. The previous file content
//! lives outside the workspace so a later commit cannot erase the review
//! history, and rollback is guarded by the post-tool content hash.

use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use uuid::Uuid;

use crate::workspace::{self, ToolRoot};

const REVIEW_DIR: &str = "review-changes";
const MAX_SNAPSHOT_BYTES: u64 = 16 * 1024 * 1024;
const MAX_DIFF_BYTES: u64 = 512 * 1024;
const MAX_DIFF_LINES: usize = 4000;
const MAX_DIFF_CELLS: usize = 2_000_000;
const CONTEXT_LINES: usize = 3;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ReviewChangeOperation {
    Write,
    Edit,
    Delete,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ReviewChangeStatus {
    Added,
    Modified,
    Deleted,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ReviewChangeState {
    Active,
    RolledBack,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewDiffLine {
    #[serde(rename = "type")]
    line_type: String,
    text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewDiffHunk {
    header: String,
    lines: Vec<ReviewDiffLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewChange {
    pub version: u8,
    pub snapshot_id: String,
    pub message_id: String,
    pub path: String,
    pub operation: ReviewChangeOperation,
    pub status: ReviewChangeStatus,
    pub state: ReviewChangeState,
    pub additions: usize,
    pub deletions: usize,
    pub hunks: Vec<ReviewDiffHunk>,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub binary: bool,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub truncated: bool,
    pub reversible: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RollbackOutcome {
    pub status: &'static str,
    pub snapshot_id: String,
    pub message_id: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotMeta {
    version: u8,
    session_id: String,
    message_id: String,
    path: String,
    operation: ReviewChangeOperation,
    before_exists: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    before_hash: Option<String>,
    after_exists: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    after_hash: Option<String>,
    reversible: bool,
    state: ReviewChangeState,
}

#[derive(Debug)]
pub struct PendingChange {
    snapshot_dir: PathBuf,
    before_path: PathBuf,
    resolved: PathBuf,
    session_id: String,
    message_id: String,
    snapshot_id: String,
    path: String,
    operation: ReviewChangeOperation,
    before_exists: bool,
    before_hash: Option<String>,
    before_copied: bool,
}

#[derive(Debug, Clone)]
enum DiffOp {
    Equal(String),
    Add(String),
    Del(String),
}

fn safe_component(value: &str) -> bool {
    !value.is_empty()
        && value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn session_review_dir(data_dir: &Path, session_id: &str) -> Result<PathBuf> {
    if !safe_component(session_id) {
        return Err(anyhow!("invalid session id"));
    }
    Ok(data_dir.join(REVIEW_DIR).join(session_id))
}

fn snapshot_dir(data_dir: &Path, session_id: &str, snapshot_id: &str) -> Result<PathBuf> {
    if !safe_component(snapshot_id) {
        return Err(anyhow!("invalid snapshot id"));
    }
    Ok(session_review_dir(data_dir, session_id)?.join(snapshot_id))
}

fn metadata_path(dir: &Path) -> PathBuf {
    dir.join("meta.json")
}

fn before_path(dir: &Path) -> PathBuf {
    dir.join("before")
}

fn relative_path(root: &Path, path: &Path) -> String {
    let canonical_root = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());
    path.strip_prefix(&canonical_root)
        .or_else(|_| path.strip_prefix(root))
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

fn hash_file(path: &Path) -> Result<String> {
    let mut file = fs::File::open(path)
        .with_context(|| format!("open file for review hash: {}", path.display()))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(hex::encode(hasher.finalize()))
}

fn write_meta(path: &Path, meta: &SnapshotMeta) -> Result<()> {
    let temp = path.with_extension("json.tmp");
    fs::write(&temp, serde_json::to_vec_pretty(meta)?)?;
    fs::rename(&temp, path)?;
    Ok(())
}

fn read_meta(data_dir: &Path, session_id: &str, snapshot_id: &str) -> Result<SnapshotMeta> {
    let dir = snapshot_dir(data_dir, session_id, snapshot_id)?;
    let bytes = fs::read(metadata_path(&dir))
        .with_context(|| format!("review snapshot not found: {snapshot_id}"))?;
    let meta: SnapshotMeta = serde_json::from_slice(&bytes)?;
    if meta.session_id != session_id || meta.message_id.trim().is_empty() {
        return Err(anyhow!("review snapshot does not belong to this session"));
    }
    Ok(meta)
}

fn tool_operation(tool_name: &str) -> Option<ReviewChangeOperation> {
    match tool_name {
        "Write" => Some(ReviewChangeOperation::Write),
        "Edit" => Some(ReviewChangeOperation::Edit),
        _ => None,
    }
}

/// Capture the pre-tool file without making review a prerequisite for tool
/// success. A missing or unreadable old file simply produces a non-reversible
/// review record after the tool completes.
pub fn prepare_change(
    data_dir: &Path,
    session_id: &str,
    message_id: &str,
    workspace_root: Option<&Path>,
    scratch_root: Option<&Path>,
    tool_name: &str,
    args: &Value,
) -> Result<Option<PendingChange>> {
    let Some(operation) = tool_operation(tool_name) else {
        return Ok(None);
    };
    let Some(root) = workspace_root else {
        return Ok(None);
    };
    let Some(input) = args.get("path").and_then(Value::as_str) else {
        return Ok(None);
    };
    let Ok((resolved, root_kind)) = workspace::resolve_tool_path(root, scratch_root, input) else {
        return Ok(None);
    };
    if root_kind != ToolRoot::Workspace {
        return Ok(None);
    }

    let snapshot_id = Uuid::new_v4().to_string();
    let snapshot_dir = snapshot_dir(data_dir, session_id, &snapshot_id)?;
    fs::create_dir_all(&snapshot_dir)?;
    let before_path = before_path(&snapshot_dir);
    let metadata = fs::metadata(&resolved).ok();
    let before_exists = metadata.as_ref().is_some_and(|value| value.is_file());
    let before_hash = if before_exists {
        hash_file(&resolved).ok()
    } else {
        None
    };
    let before_copied = before_exists
        && metadata
            .as_ref()
            .is_some_and(|value| value.len() <= MAX_SNAPSHOT_BYTES)
        && fs::copy(&resolved, &before_path).is_ok();
    let path = relative_path(root, &resolved);

    Ok(Some(PendingChange {
        snapshot_dir,
        before_path,
        resolved,
        session_id: session_id.to_string(),
        message_id: message_id.to_string(),
        snapshot_id,
        path,
        operation,
        before_exists,
        before_hash,
        before_copied,
    }))
}

pub fn discard_change(pending: PendingChange) {
    let _ = fs::remove_dir_all(pending.snapshot_dir);
}

fn read_preview(path: Option<&Path>, exists: bool) -> Result<Option<Vec<u8>>> {
    if !exists {
        return Ok(Some(Vec::new()));
    }
    let Some(path) = path else {
        return Ok(None);
    };
    let metadata = fs::metadata(path)?;
    if !metadata.is_file() || metadata.len() > MAX_DIFF_BYTES {
        return Ok(None);
    }
    Ok(Some(fs::read(path)?))
}

fn diff_ops(before: &[String], after: &[String]) -> Option<Vec<DiffOp>> {
    if (before.len() + 1).saturating_mul(after.len() + 1) > MAX_DIFF_CELLS {
        return None;
    }
    let mut lcs = vec![vec![0_u32; after.len() + 1]; before.len() + 1];
    for old in (0..before.len()).rev() {
        for new in (0..after.len()).rev() {
            lcs[old][new] = if before[old] == after[new] {
                lcs[old + 1][new + 1] + 1
            } else {
                lcs[old + 1][new].max(lcs[old][new + 1])
            };
        }
    }

    let mut old = 0;
    let mut new = 0;
    let mut ops = Vec::with_capacity(before.len() + after.len());
    while old < before.len() || new < after.len() {
        if old < before.len() && new < after.len() && before[old] == after[new] {
            ops.push(DiffOp::Equal(before[old].clone()));
            old += 1;
            new += 1;
        } else if new == after.len()
            || (old < before.len() && lcs[old + 1][new] >= lcs[old][new + 1])
        {
            ops.push(DiffOp::Del(before[old].clone()));
            old += 1;
        } else {
            ops.push(DiffOp::Add(after[new].clone()));
            new += 1;
        }
    }
    Some(ops)
}

fn line_counts(ops: &[DiffOp]) -> (usize, usize) {
    let mut additions = 0;
    let mut deletions = 0;
    for op in ops {
        match op {
            DiffOp::Add(_) => additions += 1,
            DiffOp::Del(_) => deletions += 1,
            DiffOp::Equal(_) => {}
        }
    }
    (additions, deletions)
}

fn old_line_count(op: &DiffOp) -> usize {
    matches!(op, DiffOp::Equal(_) | DiffOp::Del(_)) as usize
}

fn new_line_count(op: &DiffOp) -> usize {
    matches!(op, DiffOp::Equal(_) | DiffOp::Add(_)) as usize
}

fn make_hunks(ops: &[DiffOp]) -> Vec<ReviewDiffHunk> {
    let changed: Vec<usize> = ops
        .iter()
        .enumerate()
        .filter_map(|(index, op)| (!matches!(op, DiffOp::Equal(_))).then_some(index))
        .collect();
    if changed.is_empty() {
        return Vec::new();
    }

    let mut ranges: Vec<(usize, usize)> = Vec::new();
    for index in changed {
        let start = index.saturating_sub(CONTEXT_LINES);
        let end = (index + CONTEXT_LINES + 1).min(ops.len());
        if let Some((_, previous_end)) = ranges.last_mut() {
            if start <= *previous_end {
                *previous_end = (*previous_end).max(end);
                continue;
            }
        }
        ranges.push((start, end));
    }

    let mut hunks = Vec::with_capacity(ranges.len());
    for (start, end) in ranges {
        let old_before = ops[..start].iter().map(old_line_count).sum::<usize>();
        let new_before = ops[..start].iter().map(new_line_count).sum::<usize>();
        let old_len = ops[start..end].iter().map(old_line_count).sum::<usize>();
        let new_len = ops[start..end].iter().map(new_line_count).sum::<usize>();
        let old_start = old_before + 1;
        let new_start = new_before + 1;
        let lines = ops[start..end]
            .iter()
            .map(|op| match op {
                DiffOp::Equal(text) => ReviewDiffLine {
                    line_type: "context".into(),
                    text: text.clone(),
                },
                DiffOp::Add(text) => ReviewDiffLine {
                    line_type: "add".into(),
                    text: text.clone(),
                },
                DiffOp::Del(text) => ReviewDiffLine {
                    line_type: "del".into(),
                    text: text.clone(),
                },
            })
            .collect();
        hunks.push(ReviewDiffHunk {
            header: format!("@@ -{old_start},{old_len} +{new_start},{new_len} @@"),
            lines,
        });
    }
    hunks
}

fn make_preview(
    before_path: Option<&Path>,
    before_exists: bool,
    after_path: Option<&Path>,
    after_exists: bool,
) -> (bool, bool, usize, usize, Vec<ReviewDiffHunk>) {
    let Ok(Some(before)) = read_preview(before_path, before_exists) else {
        return (false, true, 0, 0, Vec::new());
    };
    let Ok(Some(after)) = read_preview(after_path, after_exists) else {
        return (false, true, 0, 0, Vec::new());
    };
    if before.contains(&0) || after.contains(&0) {
        return (true, false, 0, 0, Vec::new());
    }
    let Ok(before) = String::from_utf8(before) else {
        return (true, false, 0, 0, Vec::new());
    };
    let Ok(after) = String::from_utf8(after) else {
        return (true, false, 0, 0, Vec::new());
    };
    let before_lines: Vec<String> = before.lines().map(str::to_string).collect();
    let after_lines: Vec<String> = after.lines().map(str::to_string).collect();
    if before_lines.len() > MAX_DIFF_LINES || after_lines.len() > MAX_DIFF_LINES {
        return (false, true, 0, 0, Vec::new());
    }
    let Some(ops) = diff_ops(&before_lines, &after_lines) else {
        return (false, true, 0, 0, Vec::new());
    };
    let (additions, deletions) = line_counts(&ops);
    let hunks = make_hunks(&ops);
    (false, false, additions, deletions, hunks)
}

pub fn finalize_change(pending: &PendingChange) -> Result<ReviewChange> {
    let after_exists = pending.resolved.is_file();
    let after_hash = if after_exists {
        Some(hash_file(&pending.resolved)?)
    } else {
        None
    };
    let (binary, truncated, additions, deletions, hunks) = make_preview(
        pending
            .before_copied
            .then_some(pending.before_path.as_path()),
        pending.before_exists,
        Some(pending.resolved.as_path()),
        after_exists,
    );
    let status = match (pending.before_exists, after_exists) {
        (false, true) => ReviewChangeStatus::Added,
        (true, false) => ReviewChangeStatus::Deleted,
        _ => ReviewChangeStatus::Modified,
    };
    // Existing files remain reversible even when the tool deleted them; new
    // files need to exist after the tool so rollback can remove them.
    let reversible = if pending.before_exists {
        pending.before_copied
    } else {
        after_exists
    };
    let meta = SnapshotMeta {
        version: 1,
        session_id: pending.session_id.clone(),
        message_id: pending.message_id.clone(),
        path: pending.path.clone(),
        operation: pending.operation,
        before_exists: pending.before_exists,
        before_hash: pending.before_hash.clone(),
        after_exists,
        after_hash,
        reversible,
        state: ReviewChangeState::Active,
    };
    write_meta(&metadata_path(&pending.snapshot_dir), &meta)?;
    Ok(ReviewChange {
        version: 1,
        snapshot_id: pending.snapshot_id.clone(),
        message_id: pending.message_id.clone(),
        path: pending.path.clone(),
        operation: pending.operation,
        status,
        state: ReviewChangeState::Active,
        additions,
        deletions,
        hunks,
        binary,
        truncated,
        reversible,
    })
}

fn restore_before(target: &Path, before: &Path) -> Result<()> {
    let bytes = fs::read(before).context("read review rollback snapshot")?;
    if bytes.len() as u64 > MAX_SNAPSHOT_BYTES {
        return Err(anyhow!("review rollback snapshot exceeds the size limit"));
    }
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(target, bytes).context("restore review rollback snapshot")?;
    Ok(())
}

pub fn rollback_change(
    data_dir: &Path,
    session_id: &str,
    snapshot_id: &str,
    workspace_root: Option<&Path>,
) -> Result<RollbackOutcome> {
    let dir = snapshot_dir(data_dir, session_id, snapshot_id)?;
    let mut meta = read_meta(data_dir, session_id, snapshot_id)?;
    let unavailable = || RollbackOutcome {
        status: "unavailable",
        snapshot_id: snapshot_id.to_string(),
        message_id: meta.message_id.clone(),
        path: meta.path.clone(),
    };
    if meta.state == ReviewChangeState::RolledBack {
        return Ok(RollbackOutcome {
            status: "alreadyRolledBack",
            snapshot_id: snapshot_id.to_string(),
            message_id: meta.message_id.clone(),
            path: meta.path.clone(),
        });
    }
    if !meta.reversible {
        return Ok(unavailable());
    }
    let Some(root) = workspace_root else {
        return Ok(unavailable());
    };
    let Ok(target) = workspace::resolve_in_workspace(root, &meta.path) else {
        return Ok(unavailable());
    };
    let current_exists = target.is_file();
    let current_hash = if current_exists {
        hash_file(&target).ok()
    } else {
        None
    };
    let unchanged = match (&meta.after_hash, current_exists) {
        (Some(expected), true) => current_hash.as_deref() == Some(expected.as_str()),
        (None, false) => true,
        _ => false,
    };
    if !unchanged {
        return Ok(RollbackOutcome {
            status: "conflict",
            snapshot_id: snapshot_id.to_string(),
            message_id: meta.message_id,
            path: meta.path,
        });
    }
    if meta.before_exists {
        restore_before(&target, &before_path(&dir))?;
    } else if target.exists() {
        if !target.is_file() {
            return Ok(unavailable());
        }
        fs::remove_file(&target).context("remove created file during rollback")?;
    }
    meta.state = ReviewChangeState::RolledBack;
    write_meta(&metadata_path(&dir), &meta)?;
    Ok(RollbackOutcome {
        status: "rolledBack",
        snapshot_id: snapshot_id.to_string(),
        message_id: meta.message_id,
        path: meta.path,
    })
}

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

pub fn remove_session(data_dir: &Path, session_id: &str) {
    if let Ok(dir) = session_review_dir(data_dir, session_id) {
        let _ = fs::remove_dir_all(dir);
    }
}

pub fn sweep(data_dir: &Path, live_session_ids: &std::collections::HashSet<String>) {
    let base = data_dir.join(REVIEW_DIR);
    let Ok(entries) = fs::read_dir(base) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let id = entry.file_name().to_string_lossy().to_string();
        if !live_session_ids.contains(&id) {
            let _ = fs::remove_dir_all(path);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use tempfile::tempdir;

    fn prepare(
        data: &Path,
        workspace_root: &Path,
        session: &str,
        message: &str,
        path: &str,
    ) -> PendingChange {
        prepare_change(
            data,
            session,
            message,
            Some(workspace_root),
            None,
            "Edit",
            &json!({ "path": path }),
        )
        .unwrap()
        .unwrap()
    }

    #[test]
    fn records_line_changes_and_rolls_back_without_git() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        let target = workspace.path().join("src.txt");
        fs::write(&target, "one\ntwo\n").unwrap();
        let pending = prepare(data.path(), workspace.path(), "s1", "m1", "src.txt");
        fs::write(&target, "one\nthree\n").unwrap();
        let change = finalize_change(&pending).unwrap();
        assert_eq!(change.status, ReviewChangeStatus::Modified);
        assert_eq!(change.additions, 1);
        assert_eq!(change.deletions, 1);
        assert!(change.reversible);
        assert!(!change.hunks.is_empty());

        let result = rollback_change(
            data.path(),
            "s1",
            &change.snapshot_id,
            Some(workspace.path()),
        )
        .unwrap();
        assert_eq!(result.status, "rolledBack");
        assert_eq!(fs::read_to_string(&target).unwrap(), "one\ntwo\n");
        let repeated = rollback_change(
            data.path(),
            "s1",
            &change.snapshot_id,
            Some(workspace.path()),
        )
        .unwrap();
        assert_eq!(repeated.status, "alreadyRolledBack");
    }

    #[test]
    fn refuses_to_overwrite_a_later_edit() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        let target = workspace.path().join("src.txt");
        fs::write(&target, "before\n").unwrap();
        let pending = prepare(data.path(), workspace.path(), "s1", "m1", "src.txt");
        fs::write(&target, "after\n").unwrap();
        let change = finalize_change(&pending).unwrap();
        fs::write(&target, "later\n").unwrap();
        let result = rollback_change(
            data.path(),
            "s1",
            &change.snapshot_id,
            Some(workspace.path()),
        )
        .unwrap();
        assert_eq!(result.status, "conflict");
        assert_eq!(fs::read_to_string(&target).unwrap(), "later\n");
    }

    #[test]
    fn added_file_rollback_removes_the_file() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        let pending = prepare(data.path(), workspace.path(), "s1", "m1", "new.txt");
        fs::write(workspace.path().join("new.txt"), "new\n").unwrap();
        let change = finalize_change(&pending).unwrap();
        assert_eq!(change.status, ReviewChangeStatus::Added);
        let result = rollback_change(
            data.path(),
            "s1",
            &change.snapshot_id,
            Some(workspace.path()),
        )
        .unwrap();
        assert_eq!(result.status, "rolledBack");
        assert!(!workspace.path().join("new.txt").exists());
    }

    #[test]
    fn deleted_file_rollback_restores_previous_bytes() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        let target = workspace.path().join("removed.txt");
        fs::write(&target, "keep me\n").unwrap();
        let pending = prepare(data.path(), workspace.path(), "s1", "m1", "removed.txt");
        fs::remove_file(&target).unwrap();
        let change = finalize_change(&pending).unwrap();
        assert_eq!(change.status, ReviewChangeStatus::Deleted);
        assert_eq!(change.additions, 0);
        assert_eq!(change.deletions, 1);

        let result = rollback_change(
            data.path(),
            "s1",
            &change.snapshot_id,
            Some(workspace.path()),
        )
        .unwrap();
        assert_eq!(result.status, "rolledBack");
        assert_eq!(fs::read_to_string(&target).unwrap(), "keep me\n");
    }

    /// Snapshot `path` in `session` and immediately apply `after` so the
    /// stored after hash matches the workspace. Returns the snapshot id.
    fn snapshot(
        data: &Path,
        workspace_root: &Path,
        session: &str,
        message: &str,
        path: &str,
        after: Option<&str>,
    ) -> String {
        let pending = prepare(data, workspace_root, session, message, path);
        let target = workspace_root.join(path);
        match after {
            Some(content) => fs::write(&target, content).unwrap(),
            None => fs::remove_file(&target).unwrap(),
        }
        finalize_change(&pending).unwrap().snapshot_id
    }

    fn check(data: &Path, workspace_root: &Path, session: &str, ids: &[String]) -> CheckTurnResult {
        check_snapshots_clean(data, session, ids, Some(workspace_root)).unwrap()
    }

    #[test]
    fn check_reports_clean_for_an_untouched_turn() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("a.txt"), "one\n").unwrap();
        let ids = vec![
            snapshot(
                data.path(),
                workspace.path(),
                "s1",
                "m1",
                "a.txt",
                Some("two\n"),
            ),
            snapshot(
                data.path(),
                workspace.path(),
                "s1",
                "m2",
                "a.txt",
                Some("three\n"),
            ),
        ];
        let result = check(data.path(), workspace.path(), "s1", &ids);
        assert!(result.clean);
        assert_eq!(result.files.len(), 1);
        assert!(result.files[0].clean);
        assert!(result.files[0].reversible);
        assert!(result.files[0].blocked_by.is_none());
    }

    #[test]
    fn check_flags_a_later_external_edit_without_blocked_by() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("a.txt"), "one\n").unwrap();
        let ids = vec![snapshot(
            data.path(),
            workspace.path(),
            "s1",
            "m1",
            "a.txt",
            Some("two\n"),
        )];
        fs::write(workspace.path().join("a.txt"), "external\n").unwrap();
        let result = check(data.path(), workspace.path(), "s1", &ids);
        assert!(!result.clean);
        assert!(!result.files[0].clean);
        assert!(result.files[0].reversible);
        assert!(result.files[0].blocked_by.is_none());
    }

    #[test]
    fn check_names_the_other_session_that_touched_the_file() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("a.txt"), "one\n").unwrap();
        let own = vec![snapshot(
            data.path(),
            workspace.path(),
            "s1",
            "m1",
            "a.txt",
            Some("two\n"),
        )];
        snapshot(
            data.path(),
            workspace.path(),
            "s2",
            "m9",
            "a.txt",
            Some("other\n"),
        );
        let result = check(data.path(), workspace.path(), "s1", &own);
        assert!(!result.clean);
        let blocked_by = result.files[0]
            .blocked_by
            .as_ref()
            .expect("another session produced the current content");
        assert_eq!(blocked_by.session_id, "s2");
        assert_eq!(blocked_by.message_id, "m9");
    }

    #[test]
    fn check_flags_a_deleted_file_after_an_added_snapshot() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        let ids = vec![snapshot(
            data.path(),
            workspace.path(),
            "s1",
            "m1",
            "new.txt",
            Some("new\n"),
        )];
        fs::remove_file(workspace.path().join("new.txt")).unwrap();
        let result = check(data.path(), workspace.path(), "s1", &ids);
        assert!(!result.clean);
        assert!(!result.files[0].clean);
    }

    #[test]
    fn check_treats_a_fully_rolled_back_group_as_clean() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("a.txt"), "one\n").unwrap();
        let ids = vec![snapshot(
            data.path(),
            workspace.path(),
            "s1",
            "m1",
            "a.txt",
            Some("two\n"),
        )];
        let outcomes = rollback_batch(data.path(), "s1", &ids, Some(workspace.path())).unwrap();
        assert_eq!(outcomes[0].status, "rolledBack");
        let result = check(data.path(), workspace.path(), "s1", &ids);
        assert!(result.clean);
        assert!(result.files[0].clean);
        assert!(result.files[0].reversible);
    }

    #[test]
    fn check_tolerates_a_missing_meta_as_not_clean_not_reversible() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("a.txt"), "one\n").unwrap();
        let valid = snapshot(
            data.path(),
            workspace.path(),
            "s1",
            "m1",
            "a.txt",
            Some("two\n"),
        );
        let ids = vec![valid, "missing-snapshot".to_string()];
        let result = check(data.path(), workspace.path(), "s1", &ids);
        assert!(!result.clean);
        assert_eq!(result.files.len(), 1);
        assert!(result.files[0].clean);
        assert!(!result.files[0].reversible);
    }

    #[test]
    fn check_marks_a_non_reversible_earliest_snapshot() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("a.txt"), "one\n").unwrap();
        let first = snapshot(
            data.path(),
            workspace.path(),
            "s1",
            "m1",
            "a.txt",
            Some("two\n"),
        );
        // Drop the stored before bytes so the earliest snapshot cannot restore.
        let dir = snapshot_dir(data.path(), "s1", &first).unwrap();
        fs::remove_file(before_path(&dir)).unwrap();
        let meta_path = metadata_path(&dir);
        let mut meta = read_meta(data.path(), "s1", &first).unwrap();
        meta.reversible = false;
        write_meta(&meta_path, &meta).unwrap();
        let second = snapshot(
            data.path(),
            workspace.path(),
            "s1",
            "m2",
            "a.txt",
            Some("three\n"),
        );
        let result = check(data.path(), workspace.path(), "s1", &[first, second]);
        assert!(!result.clean);
        assert!(result.files[0].clean);
        assert!(!result.files[0].reversible);
    }

    #[test]
    fn batch_restores_the_earliest_before_across_same_file_snapshots() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        let target = workspace.path().join("a.txt");
        fs::write(&target, "one\n").unwrap();
        let ids = vec![
            snapshot(
                data.path(),
                workspace.path(),
                "s1",
                "m1",
                "a.txt",
                Some("two\n"),
            ),
            snapshot(
                data.path(),
                workspace.path(),
                "s1",
                "m2",
                "a.txt",
                Some("three\n"),
            ),
            snapshot(
                data.path(),
                workspace.path(),
                "s1",
                "m3",
                "a.txt",
                Some("four\n"),
            ),
        ];
        let outcomes = rollback_batch(data.path(), "s1", &ids, Some(workspace.path())).unwrap();
        assert_eq!(outcomes.len(), 3);
        assert!(outcomes
            .iter()
            .all(|outcome| outcome.status == "rolledBack"));
        assert_eq!(fs::read_to_string(&target).unwrap(), "one\n");
        for id in &ids {
            let meta = read_meta(data.path(), "s1", id).unwrap();
            assert_eq!(meta.state, ReviewChangeState::RolledBack);
        }
    }

    #[test]
    fn batch_removes_a_created_file_and_restores_a_deleted_one() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("gone.txt"), "keep\n").unwrap();
        let added = snapshot(
            data.path(),
            workspace.path(),
            "s1",
            "m1",
            "new.txt",
            Some("new\n"),
        );
        let deleted = snapshot(data.path(), workspace.path(), "s1", "m2", "gone.txt", None);
        let ids = vec![added, deleted];
        let outcomes = rollback_batch(data.path(), "s1", &ids, Some(workspace.path())).unwrap();
        assert!(outcomes
            .iter()
            .all(|outcome| outcome.status == "rolledBack"));
        assert!(!workspace.path().join("new.txt").exists());
        assert_eq!(
            fs::read_to_string(workspace.path().join("gone.txt")).unwrap(),
            "keep\n"
        );
    }

    #[test]
    fn batch_conflict_on_one_file_does_not_abort_the_other_file() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("conflicted.txt"), "one\n").unwrap();
        fs::write(workspace.path().join("fine.txt"), "one\n").unwrap();
        let conflicted = snapshot(
            data.path(),
            workspace.path(),
            "s1",
            "m1",
            "conflicted.txt",
            Some("two\n"),
        );
        let fine = snapshot(
            data.path(),
            workspace.path(),
            "s1",
            "m2",
            "fine.txt",
            Some("two\n"),
        );
        fs::write(workspace.path().join("conflicted.txt"), "external\n").unwrap();
        let ids = vec![conflicted, fine];
        let outcomes = rollback_batch(data.path(), "s1", &ids, Some(workspace.path())).unwrap();
        assert_eq!(outcomes[0].status, "conflict");
        assert_eq!(outcomes[1].status, "rolledBack");
        assert_eq!(
            fs::read_to_string(workspace.path().join("conflicted.txt")).unwrap(),
            "external\n"
        );
        assert_eq!(
            fs::read_to_string(workspace.path().join("fine.txt")).unwrap(),
            "one\n"
        );
    }

    #[test]
    fn batch_io_failure_on_one_file_does_not_abort_the_other_file() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("broken.txt"), "one\n").unwrap();
        fs::write(workspace.path().join("fine.txt"), "one\n").unwrap();
        let broken = snapshot(
            data.path(),
            workspace.path(),
            "s1",
            "m1",
            "broken.txt",
            Some("two\n"),
        );
        let fine = snapshot(
            data.path(),
            workspace.path(),
            "s1",
            "m2",
            "fine.txt",
            Some("two\n"),
        );
        // Destroy the before-bytes after capture: the meta still claims the
        // snapshot is reversible and the guard passes, so the restore itself
        // fails and must degrade to "unavailable" without aborting the batch.
        let broken_before = data
            .path()
            .join(REVIEW_DIR)
            .join("s1")
            .join(&broken)
            .join("before");
        fs::remove_file(&broken_before).unwrap();
        let ids = vec![broken, fine];
        let outcomes = rollback_batch(data.path(), "s1", &ids, Some(workspace.path())).unwrap();
        assert_eq!(outcomes[0].status, "unavailable");
        assert_eq!(outcomes[1].status, "rolledBack");
        assert_eq!(
            fs::read_to_string(workspace.path().join("fine.txt")).unwrap(),
            "one\n"
        );
    }

    #[test]
    fn batch_repeated_rollback_reports_already_rolled_back() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("a.txt"), "one\n").unwrap();
        let ids = vec![snapshot(
            data.path(),
            workspace.path(),
            "s1",
            "m1",
            "a.txt",
            Some("two\n"),
        )];
        let first = rollback_batch(data.path(), "s1", &ids, Some(workspace.path())).unwrap();
        assert_eq!(first[0].status, "rolledBack");
        let second = rollback_batch(data.path(), "s1", &ids, Some(workspace.path())).unwrap();
        assert_eq!(second[0].status, "alreadyRolledBack");
        assert_eq!(second[0].message_id, "m1");
    }

    #[test]
    fn batch_reports_a_missing_snapshot_as_unavailable() {
        let data = tempdir().unwrap();
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("a.txt"), "one\n").unwrap();
        let valid = snapshot(
            data.path(),
            workspace.path(),
            "s1",
            "m1",
            "a.txt",
            Some("two\n"),
        );
        let ids = vec![valid, "missing-snapshot".to_string()];
        let outcomes = rollback_batch(data.path(), "s1", &ids, Some(workspace.path())).unwrap();
        // A missing meta anywhere makes the batch non-reversible.
        assert_eq!(outcomes[0].status, "unavailable");
        assert_eq!(outcomes[1].status, "unavailable");
        assert_eq!(outcomes[1].path, "");
        assert_eq!(outcomes[1].message_id, "");
        assert_eq!(
            fs::read_to_string(workspace.path().join("a.txt")).unwrap(),
            "two\n"
        );
    }
}
