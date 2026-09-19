//! Unified-diff preview computation for review snapshots.

use anyhow::Result;
use std::fs;
use std::path::Path;

use super::{
    ReviewDiffHunk, ReviewDiffLine, CONTEXT_LINES, MAX_DIFF_BYTES, MAX_DIFF_CELLS, MAX_DIFF_LINES,
};

#[derive(Debug, Clone)]
enum DiffOp {
    Equal(String),
    Add(String),
    Del(String),
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

pub(super) fn make_preview(
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
