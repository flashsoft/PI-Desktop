# ADR local-002: Review capabilities as a bundled plugin with shared turn semantics

- Status: Accepted
- Date: 2026-09-20
- Deciders: PI-Desktop runtime and plugin-system maintainers
- Related: ADR 0043 (message-owned review snapshots), ADR 0104 (plugin work-panel views), ADR 0170 (browser as bundled plugin), ADR 0203 (local MCP control plane), ADR 0241 (vendored file view plugin), D-turn-review

## Context

The core Review tab (D-turn-review) groups durable workspace-change snapshots
by conversation turn in the renderer and rolls snapshots back through two
host RPCs, `review.checkTurn` and `review.rollbackTurn`. The next product step
is an independent-agent review flow ("review this turn with a separate
agent"), which will iterate quickly and should not grow the already-hot
Electron main process or the core transcript code.

Two prerequisites blocked a plugin implementation:

1. The turn-grouping rules (steering messages do not cut, prelude merges into
   the first turn, stale entries attach to the last open turn) lived only in
   the renderer's `workspace-review.ts`. A plugin re-deriving turns would
   fork the definition of what a turn is.
2. The plugin/MCP control plane had no review operations at all: snapshot
   records were invisible and rollback unreachable for plugin code.

## Decision

1. **Turn semantics move to `@pi-desktop/shared`.** `reviewChangeFromMessage`,
   `groupReviewChangesByTurn`, `withReviewChangeState`, the summary helpers,
   and the `ReviewTurnGroup` / `ReviewChangeEntry` types live in
   `packages/shared/src/review-turns.ts`. The renderer keeps importing the
   same names through a thin re-export in
   `apps/desktop/src/lib/workspace-review.ts`, so the core Review tab is
   untouched and both surfaces share one definition of a turn.
2. **Three reviewed control-plane operations expose review primitives.** The
   host batch RPCs stay turn-agnostic; the control plane adds
   `review/reviewTurns` (read; Electron main groups a session's messages into
   turns via the shared functions), `review/checkBatch` (read-only preflight,
   same semantics as `review.checkTurn`), and `review/rollbackBatch`
   (dangerous, requires `confirm`, same semantics as `review.rollbackTurn`
   with `mode: "turn" | "rewind"`). Each operation maps to a dedicated IPC
   channel; no existing channel changes shape. The operations are reviewed
   additions to the ADR 0203 catalog, so both the local MCP control plane and
   `desktop.control`-permission plugins reach them through the same gateway
   with the same confirmation gates.
3. **A bundled first-party plugin `pi.review` carries the enhanced surface.**
   Shipped from `apps/desktop/resources/plugins` like `pi.browser`
   (ADR 0170), it declares `ui.view` + `desktop.control` and renders a
   turn-grouped change list with guarded turn rollback and rewind in its own
   work-panel view. The core Review tab stays as the always-available
   baseline; the plugin is the vehicle for the independent-agent review flow
   that follows.

## Consequences

- Turn semantics have a single source of truth that the renderer, Electron
  main, and any future plugin consume. Changing the definition of a turn is
  one edit in `packages/shared`.
- Review read/rollback primitives are now part of the public control-plane
  contract. `review/rollbackBatch` inherits the dangerous-operation
  confirmation path, and the host still refuses rollbacks while a session
  runs or has queued inputs, so plugin-triggered rollbacks keep the same
  safety properties as renderer-triggered ones.
- `desktop.control` remains a coarse, first-party-only permission; the
  catalog entries are narrow, but a plugin holding it can also reach the
  other reviewed operations. This matches the existing stance for bundled
  plugins (ADR 0208) and is revisited if third-party review plugins appear.
- Snapshot-range diffs (pinning a reviewer to the bytes between two
  snapshots) are deliberately out of scope here and remain a separate
  decision for the independent-agent review milestone.
