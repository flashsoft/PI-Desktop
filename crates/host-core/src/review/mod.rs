//! Durable, message-scoped workspace change snapshots.
//!
//! Review evidence is captured at tool execution time instead of being
//! reconstructed from a mutable git working tree. The previous file content
//! lives outside the workspace so a later commit cannot erase the review
//! history, and rollback is guarded by the post-tool content hash.

mod batch;
mod diff;
#[cfg(test)]
mod tests;

pub use batch::*;

use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use uuid::Uuid;

use crate::workspace::{self, ToolRoot};
use diff::make_preview;

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
