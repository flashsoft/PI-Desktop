import assert from "node:assert/strict";
import { register } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(join(here, "helpers/ts-import-hooks.mjs")));
// Smoke test only: the behavior assertions moved to
// packages/shared/src/review-turns.test.ts alongside the implementation.
const lib = await import("../src/lib/workspace-review.ts");
const shared = await import("@pi-desktop/shared");

test("lib/workspace-review re-exports the shared review turn helpers", () => {
  for (const name of [
    "groupReviewChangesByTurn",
    "reviewChangeFromMessage",
    "reviewChangesFromMessages",
    "summarizeReviewChanges",
    "withReviewChangeState",
  ]) {
    assert.equal(typeof lib[name], "function", `${name} must be re-exported`);
    assert.equal(lib[name], shared[name], `${name} must come from @pi-desktop/shared`);
  }
});

test("the re-exported helpers still group a minimal transcript", () => {
  const user = {
    id: "user-1",
    role: "user",
    content: "Edit the file",
    createdAt: "2026-07-28T00:00:00.000Z",
  };
  const tool = {
    id: "w1",
    role: "tool",
    content: "",
    createdAt: "2026-07-28T00:00:00.000Z",
    toolName: "Write",
    toolStatus: "success",
    toolResult: {
      details: {
        root: "workspace",
        review: {
          version: 1,
          snapshotId: "snap-1",
          messageId: "w1",
          path: "src/w1.ts",
          operation: "write",
          status: "modified",
          state: "active",
          additions: 1,
          deletions: 1,
          reversible: true,
        },
      },
    },
  };
  const groups = lib.groupReviewChangesByTurn(
    [user, tool],
    lib.reviewChangesFromMessages([user, tool]),
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0].anchorId, "user-1");
  assert.deepEqual(groups[0].snapshotIds, ["snap-1"]);
});
