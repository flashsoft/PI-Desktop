import { readStoreModule } from "./helpers/source-contracts.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const reviewTabSource = await readFile(
  new URL("../src/components/workpanel/ReviewTab.tsx", import.meta.url),
  "utf8",
);
const transcriptSliceSource = await readStoreModule(
  "slices/transcript-slice.ts",
);
const queueSliceSource = await readStoreModule("slices/queue-slice.ts");
const appStateSource = await readStoreModule("app-state.ts");

test("ReviewTab groups the flat snapshot history by conversation turn", () => {
  assert.match(reviewTabSource, /groupReviewChangesByTurn\(messages, entries\)/);
  assert.match(reviewTabSource, /type ReviewTurnGroup/);
  // Group headers expose the turn index, anchor excerpt, file count and +/-.
  assert.match(reviewTabSource, /panel\.review\.turnLabel/);
  assert.match(reviewTabSource, /group\.label/);
  assert.match(reviewTabSource, /panel\.review\.filesChanged/);
  assert.match(reviewTabSource, /group\.additions/);
  assert.match(reviewTabSource, /group\.deletions/);
  // Groups are collapsible.
  assert.match(reviewTabSource, /aria-expanded=\{open\}/);
});

test("every group is preflighted and the surgical button requires a clean check", () => {
  assert.match(
    reviewTabSource,
    /checkWorkspaceTurn\(\{ snapshotIds: group\.snapshotIds \}\)/,
  );
  // The preflight re-runs when any review state flips (a rollback landing).
  assert.match(reviewTabSource, /refreshToken/);
  assert.match(reviewTabSource, /check\?\.clean === true/);
  assert.match(reviewTabSource, /runRollback\("turn"\)/);
});

test("the rewind path goes through a consequence confirmation", () => {
  assert.match(reviewTabSource, /setConfirming\(true\)/);
  assert.match(reviewTabSource, /runRollback\("rewind"\)/);
  assert.match(reviewTabSource, /panel\.review\.rollbackTurnConfirmTitle/);
  assert.match(reviewTabSource, /panel\.review\.rollbackTurnConfirmBody/);
  // The confirmation scopes the consequence: this turn plus every later turn.
  assert.match(reviewTabSource, /candidate\.turnIndex >= group\.turnIndex/);
  // A rewind sends the later turns' snapshot ids to the host, in order —
  // otherwise their files would stay behind (regression: critical review #1).
  assert.match(
    reviewTabSource,
    /candidate\.turnIndex >= group\.turnIndex && candidate\.activeCount > 0/,
  );
  assert.match(
    reviewTabSource,
    /flatMap\(\(candidate\) => candidate\.snapshotIds\)/,
  );
  assert.match(
    reviewTabSource,
    /mode === "rewind" \? rewindSnapshotIds\(\) : group\.snapshotIds/,
  );
  // Unusable snapshots and cross-session attribution surface in the dialog.
  assert.match(reviewTabSource, /panel\.review\.rollbackTurnUnavailable/);
  assert.match(reviewTabSource, /panel\.review\.rollbackTurnBlockedBy/);
});

test("rollback actions are disabled while the session runs", () => {
  assert.match(reviewTabSource, /disabled=\{running \|\| rollingBack !== null/);
  assert.match(reviewTabSource, /panel\.review\.rollbackTurnBusy/);
  // Groups whose changes all rolled back offer no further action.
  assert.match(reviewTabSource, /group\.activeCount === 0/);
});

test("store rollback action wires host outcomes into messages, notice and system row", () => {
  const block = transcriptSliceSource.match(
    /rollbackWorkspaceTurn: async[\s\S]*?\n    \},\n\n    abort:/,
  )?.[0] ?? "";
  assert.ok(block.length > 0, "rollbackWorkspaceTurn action found");
  assert.match(block, /api\.workspaceReviewRollbackTurn\(\{[\s\S]*?snapshotIds,[\s\S]*?mode,/);
  // Busy sessions never reach the host.
  assert.match(block, /state\.isRunning/);
  // Rolled-back outcomes flip the owning messages' local review state.
  assert.match(block, /withReviewChangeState\(message, "rolledBack"\)/);
  // The English notice is recorded for the next real user input.
  assert.match(block, /buildRollbackNotice\(\{ mode, outcomes: result\.outcomes \}\)/);
  assert.match(block, /appendRollbackNotice\(/);
  assert.match(block, /pendingRollbackNotices/);
  // A renderer-local system row narrates the rollback in the live transcript.
  assert.match(block, /local-rollback-/);
  assert.match(block, /role: "system"/);
  // Host busy rejection surfaces as the busy toast.
  assert.match(block, /code === "CONFLICT"/);
  assert.match(block, /panel\.review\.rollbackTurnBusy/);
});

test("the composer send path prepends and clears the pending rollback notice", () => {
  assert.match(queueSliceSource, /pendingRollbackNotices\[startedIn\]/);
  assert.match(queueSliceSource, /contentForPrompt/);
  assert.match(queueSliceSource, /content: contentForPrompt,/);
  assert.match(
    queueSliceSource,
    /withoutRecordKey\(\s*state\.pendingRollbackNotices,\s*startedIn,\s*\)/,
  );
});

test("app state carries the per-session pending rollback notices", () => {
  assert.match(appStateSource, /pendingRollbackNotices: Record<string, string>/);
  assert.match(appStateSource, /checkWorkspaceTurn/);
  assert.match(appStateSource, /rollbackWorkspaceTurn/);
});
