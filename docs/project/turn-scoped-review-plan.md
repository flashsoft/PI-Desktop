# Turn-Scoped Review Grouping, Rollback, and Agent Notification Plan

- Status: Proposed (not yet implemented)
- Scope: Work-panel Review tab upgrade — group workspace changes by
  conversation turn, support turn-scoped rollback, and notify the agent after
  a rollback
- Verified against: `crates/host-core/src/review.rs`,
  `crates/host-core/src/rpc/mod.rs` (`review.rollback`, turn queue),
  `crates/host-core/src/turn_queue.rs`,
  `apps/desktop/src/lib/workspace-review.ts`,
  `apps/desktop/src/components/workpanel/ReviewTab.tsx`,
  `apps/desktop/src/lib/assistant-turns.ts`

## 1. Verified current state

- Snapshot mechanism (`crates/host-core/src/review.rs`): every `Write`/`Edit`
  tool call captures one chained snapshot. The pre-tool file bytes are stored
  outside the workspace under `review-changes/<session>/<snapshot>/`, and
  rollback is guarded by the post-tool content hash (`after_hash`); a file
  touched by any later change reports `conflict` instead of being overwritten.
- Current UI (`ReviewTab.tsx`): `reviewChangesFromMessages` flattens all
  records into a per-file list. Rollback exists only at single-file
  granularity (the `review.rollback` RPC plus the `rollbackWorkspaceChange`
  store action).
- Turn data already exists: persisted messages carry `turn_id`; the renderer
  can cut turns at user-message boundaries; subagent rows belong to their
  parent turn through `parentToolCallId` (ADR 0062).
- Notification channel already exists: the host-owned durable turn queue
  (`turn_queue`, D375 / ADR 0213) delivers entries in order as subsequent
  turns and survives restarts.

## 2. Core semantic decisions

Rolling back a turn from long ago can never be a clean "undo just that turn"
under chained snapshots: files touched by later turns necessarily conflict,
and cross-file semantic dependencies (later code referencing symbols added by
the rolled-back turn) cannot be guaranteed by any file-level mechanism.

1. **Surgical rollback ("roll back this turn") is offered only when clean**:
   the renderer pre-checks every snapshot's `after_hash` against the current
   file (new `review.checkTurn` RPC). The button is enabled only when no file
   was touched afterwards. Semantics: undo this step.
2. **The primary operation for older turns is rewind** ("roll back to before
   this turn"): the snapshots of this turn and all later turns are rolled
   back together in strict reverse order, cleanly returning files to their
   state before that turn. The button copy states the consequence ("this
   reverts N turns / X file changes") and requires confirmation.
3. **Two blind spots are surfaced, not solved**: Bash-driven external side
   effects (installed dependencies, migrations, processes, commits) are not
   rolled back; after a rollback the project may sit in an intermediate state
   that needs a fresh build/test pass. The UI says so; no semantic impact
   analysis is attempted in this change.
4. **Busy guard**: rollback is rejected while the session has a running or
   queued execution (RPC-side rejection plus UI-side disabling) to avoid
   racing agent writes.

## 3. Change list

### host-core (Rust)

1. `crates/host-core/src/review.rs`
   - `check_turn_clean(...)`: given snapshot ids, read each meta and compare
     the current file hash with `after_hash`; report per-snapshot
     "untouched since change". Read-only.
   - `rollback_changes(...)`: batch driver over the existing
     `rollback_change`, in caller-supplied (newest-first) order; one conflict
     does not abort the batch; outcomes collected per snapshot.
2. `crates/host-core/src/rpc/mod.rs`
   - New `review.checkTurn`: `{ sessionId, snapshotIds[] }` →
     `{ clean, files: [{ snapshotId, path, unchanged }] }` for UI gating and
     consequence preview.
   - New `review.rollbackTurn`:
     `{ sessionId, snapshotIds[], mode: "turn" | "rewind" }`.
     - Reject when the session has a running/queued execution (reuse the
       existing `execution_state` query).
     - `mode: "rewind"` requires the caller to pass the snapshots of the
       target turn and every later turn; executed newest-first.
     - Successful snapshots reuse `hashline.invalidate_path` and
       `sessions::update_tool_review_state` via a helper shared with
       single-file `review.rollback` (no duplicated logic).
     - After any actual rollback, build an English notice (mode, restored
       files, conflicted files, reverted turn range for rewind, "do not
       reapply unless the user asks", external side effects not reverted)
       and push it through `turn_queue::push`; the `idempotency_key` is
       derived from the batch's snapshot ids to prevent duplicate notices.
   - Returns `{ outcomes: RollbackOutcome[] }`.

### Renderer (TypeScript)

3. `apps/desktop/src/lib/workspace-review.ts`
   - `groupReviewChangesByTurn(messages, entries): ReviewTurnGroup[]`: pure
     function cutting turns at user-message boundaries (steering messages
     stay in the current turn); each group carries
     `{ anchorId, label, entries, additions, deletions, activeCount,
     snapshotIds }`; changes before the first user message join the first
     group. Unit tests cover multiple turns, multi-tool turns, subagent
     rows, and steering messages.
4. `apps/desktop/src/components/workpanel/ReviewTab.tsx`
   - Grouped rendering: per-turn header (turn index, user-message excerpt,
     file count, aggregated +/-, group state), collapsible; existing
     `ReviewChangeCard` reused inside each group.
   - Actions: call `review.checkTurn` first — all clean → "Roll back this
     turn"; older or dirty turn → primary action "Roll back to before this
     turn" with a confirmation listing affected turns and files; everything
     disabled while the session runs.
   - Conflict results are annotated per file; copy advises re-running
     build/tests after a rollback.
5. `apps/desktop/src/stores/slices/transcript-slice.ts`, `app-state.ts`,
   `lib/api.ts`
   - New `checkWorkspaceTurn(snapshotIds)` and
     `rollbackWorkspaceTurn(snapshotIds, mode)` actions; the latter updates
     each message's local review state with the existing
     `withReviewChangeState` per outcome; toasts via i18n.
6. i18n: group header, `rollbackTurn`, `rollbackToBeforeTurn`, confirmation
   consequence copy, `rollbackTurnBusy`, conflict and re-verify hints
   (en + zh-CN).
7. `packages/shared`: request/result types for the two new RPCs.

## 4. Tests

- Rust: `check_turn_clean` branches (untouched / touched by later turn /
  file deleted / already rolled back); batch rollback order; conflict does
  not abort; repeated rollback; busy rejection; rewind reverse-order
  correctness; notice enqueue content and idempotency.
- TypeScript: grouping pure-function tests; `ReviewTab` component tests
  (grouping, pre-check-driven button states, rewind confirmation, disabled
  while running); store action tests.
- User path: two turns of edits → groups visible → surgical rollback of the
  latest turn succeeds and a notice turn appears in the transcript →
  surgical rollback unavailable for an older turn → rewind succeeds after
  confirmation → conflicted files annotated correctly.

## 5. Documentation sync (during implementation)

- `docs/spec/03-runtime/06-host-rpc-protocol.md`: register the two new RPCs.
- `docs/spec/04-ux/09-interaction-patterns.md`: grouping, surgical rollback,
  rewind, notification interactions and consequence copy.
- `docs/spec/08-meta/decisions-log.md`: record the "old rollback = rewind"
  semantic decision and the two blind spots (external side effects,
  intermediate project state).
- `docs/spec/03-runtime/04-data-storage.md`: note no schema change.

## 6. Validation

```bash
pnpm build:js
pnpm --filter @pi-desktop/desktop typecheck
pnpm lint
pnpm -r --if-present test   # affected packages
cargo fmt --check
cargo test -p host-core --locked
cargo clippy -p host-core --all-targets
```

`verify:ui:*` is not run without explicit authorization. Implementation
happens on a `feat/turn-scoped-review` branch cut from the latest
`origin/main`, following the standard delivery order.

## 7. Risks and stated boundaries

- Rewind discards all later file changes: controlled by the confirmation
  consequence list plus the notice recording the reverted range; no
  cross-file semantic impact analysis is provided.
- The notice consumes one short agent acknowledgement turn: accepted in
  exchange for keeping the agent's context consistent with the workspace.
- With entries already queued, the notice lands behind them, so earlier
  queued instructions may reference rolled-back code — documented as a
  boundary; no intervention logic in this change.
- Pre-check/execute race: if a file changes between `checkTurn` and the
  rollback, the per-snapshot hash guard still stops it and reports
  `conflict`; nothing is overwritten blindly.
