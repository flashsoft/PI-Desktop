# Turn-Scoped Review RPC (Fork Extension)

> Scope: **fork-only**. These two RPCs are implemented in this fork but not
> in upstream `vastsa/PI-Desktop`. They extend the host RPC surface beyond
> `docs/spec/03-runtime/06-host-rpc-protocol.md`. Wire names and behavior
> are pinned by `crates/host-core/src/rpc/mod.rs` and
> `packages/shared/src/protocol.ts`.

## `review.checkTurn`

Read-only precheck used by the renderer to gate turn-level rollback.

- Request: `{ sessionId, snapshotIds[] }`
- Result: `{ clean, files: [{ snapshotId, path, unchanged }] }`
- Semantics: for each snapshot, compare the current on-disk file hash with
  the recorded `after_hash`; report whether the file has been left untouched
  since the change. Never mutates state.

## `review.rollbackTurn`

Batch rollback over a set of snapshots, newest-first.

- Request: `{ sessionId, snapshotIds[], mode: "turn" | "rewind" }`
- Result: `{ outcomes: RollbackOutcome[] }`
- Semantics:
  - Rejects while the session has a running or queued execution, to avoid
    racing the agent's writes.
  - `mode: "turn"` is a surgical undo of a single turn, offered only when
    `review.checkTurn` reports every file clean.
  - `mode: "rewind"` requires the caller to pass the target turn **and every
    later turn's** snapshots; they roll back in strict newest-first order.
  - One conflicting file does not abort the batch; outcomes are collected
    per snapshot (`rolledBack` / `alreadyRolledBack` / `conflict`).
  - After any real rollback, an English notice is pushed through
    `turn_queue::push` (mode, restored/conflicting files, rewind range, "do
    not re-apply unless asked", external side effects not reverted). The
    `idempotency_key` derives from the batch snapshot ids to prevent
    duplicate notices.

## Renderer surface

- Store actions: `checkWorkspaceTurn({ snapshotIds })`,
  `rollbackWorkspaceTurn({ snapshotIds, mode })`
  (`apps/desktop/src/stores/slices/transcript-slice.ts`).
- API bridge: `api.workspaceReviewCheckTurn` / `api.workspaceReviewRollbackTurn`
  (`apps/desktop/src/lib/api.ts`).
