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
