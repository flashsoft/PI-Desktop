import assert from "node:assert/strict";
import { register } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(join(here, "helpers/ts-import-hooks.mjs")));
const {
  groupReviewChangesByTurn,
  reviewChangeFromMessage,
  reviewChangesFromMessages,
} = await import("../src/lib/workspace-review.ts");

function message(id, role, content, extra = {}) {
  return {
    id,
    role,
    content,
    createdAt: "2026-07-28T00:00:00.000Z",
    ...extra,
  };
}

// Mirrors the record reviewChangeFromMessage parses out of a successful
// Write/Edit tool message (details.root "workspace", review.version 1).
function reviewMessage(id, snapshotId, extra = {}, reviewExtra = {}) {
  return message(id, "tool", "", {
    toolName: "Write",
    toolStatus: "success",
    toolResult: {
      details: {
        root: "workspace",
        review: {
          version: 1,
          snapshotId,
          messageId: id,
          path: `src/${id}.ts`,
          operation: "write",
          status: "modified",
          state: "active",
          additions: 1,
          deletions: 1,
          reversible: true,
          ...reviewExtra,
        },
      },
    },
    ...extra,
  });
}

function group(messages) {
  return groupReviewChangesByTurn(messages, reviewChangesFromMessages(messages));
}

test("the fabricated tool message parses as a review change", () => {
  const change = reviewChangeFromMessage(reviewMessage("w1", "snap-1"));
  assert.equal(change.snapshotId, "snap-1");
  assert.equal(change.state, "active");
});

test("changes under two user messages land in two turn groups", () => {
  const groups = group([
    message("user-1", "user", "Fix the renderer bug"),
    reviewMessage("w1", "snap-1"),
    reviewMessage("w2", "snap-2", {}, { additions: 3, deletions: 2 }),
    message("user-2", "user", "Now update the store"),
    reviewMessage("w3", "snap-3", {}, { additions: 5, deletions: 4 }),
  ]);

  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map((entry) => [entry.anchorId, entry.label, entry.turnIndex]),
    [
      ["user-1", "Fix the renderer bug", 1],
      ["user-2", "Now update the store", 2],
    ],
  );
  assert.deepEqual(groups[0].snapshotIds, ["snap-1", "snap-2"]);
  assert.equal(groups[0].additions, 4);
  assert.equal(groups[0].deletions, 3);
  assert.equal(groups[0].activeCount, 2);
  assert.deepEqual(groups[1].snapshotIds, ["snap-3"]);
  assert.equal(groups[1].additions, 5);
  assert.equal(groups[1].deletions, 4);
  assert.equal(groups[1].activeCount, 1);
});

test("several Write/Edit tool messages under one user message form one group", () => {
  const messages = [
    message("user-1", "user", "Rewrite the module"),
    reviewMessage("w1", "snap-1"),
    reviewMessage("e1", "snap-2", { toolName: "Edit" }, { operation: "edit" }),
    reviewMessage("w2", "snap-3"),
  ];
  const groups = group(messages);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].anchorId, "user-1");
  assert.deepEqual(groups[0].snapshotIds, ["snap-1", "snap-2", "snap-3"]);
  assert.equal(groups[0].entries.length, 3);
});

test("a subagent tool row stays in its parent turn's group", () => {
  const groups = group([
    message("user-1", "user", "Delegate the cleanup"),
    reviewMessage("w1", "snap-1"),
    reviewMessage("w2", "snap-2", { parentToolCallId: "task-1" }),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].anchorId, "user-1");
  assert.deepEqual(groups[0].snapshotIds, ["snap-1", "snap-2"]);
});

test("a steering user message does not cut a new turn", () => {
  const groups = group([
    message("user-1", "user", "Start the refactor"),
    reviewMessage("w1", "snap-1"),
    message("steer-1", "user", "Also cover the tests", { steering: true }),
    reviewMessage("w2", "snap-2"),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].anchorId, "user-1");
  assert.equal(groups[0].label, "Start the refactor");
  assert.deepEqual(groups[0].snapshotIds, ["snap-1", "snap-2"]);
});

test("changes before the first user message join the first group", () => {
  const groups = group([
    reviewMessage("w0", "snap-0"),
    message("user-1", "user", "First real turn"),
    reviewMessage("w1", "snap-1"),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].anchorId, "user-1");
  assert.equal(groups[0].label, "First real turn");
  assert.deepEqual(groups[0].snapshotIds, ["snap-0", "snap-1"]);
});

test("with no user message at all everything forms one fallback group", () => {
  const groups = group([
    reviewMessage("w1", "snap-1"),
    message("assistant-1", "assistant", "Done."),
    reviewMessage("w2", "snap-2"),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].anchorId, "");
  assert.equal(groups[0].label, "");
  assert.equal(groups[0].turnIndex, 1);
  assert.deepEqual(groups[0].snapshotIds, ["snap-1", "snap-2"]);
});

test("a system-role message between user messages does not cut a turn", () => {
  const groups = group([
    message("user-1", "user", "First"),
    reviewMessage("w1", "snap-1"),
    message("system-1", "system", "Usage notice"),
    reviewMessage("w2", "snap-2"),
    message("user-2", "user", "Second"),
    reviewMessage("w3", "snap-3"),
  ]);

  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].snapshotIds, ["snap-1", "snap-2"]);
  assert.equal(groups[0].anchorId, "user-1");
  assert.deepEqual(groups[1].snapshotIds, ["snap-3"]);
  assert.equal(groups[1].anchorId, "user-2");
});

test("rolledBack changes lower activeCount but stay in the group", () => {
  const groups = group([
    message("user-1", "user", "Edit both files"),
    reviewMessage("w1", "snap-1"),
    reviewMessage("w2", "snap-2", {}, { state: "rolledBack" }),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].entries.length, 2);
  assert.equal(groups[0].activeCount, 1);
  assert.deepEqual(groups[0].snapshotIds, ["snap-1", "snap-2"]);
});

test("labels trim and truncate at 50 code points without splitting pairs", () => {
  const longContent = `  ${"a".repeat(49)}🚀tail  `;
  const groups = group([
    message("user-1", "user", longContent),
    reviewMessage("w1", "snap-1"),
  ]);

  assert.equal([...groups[0].label].length, 50);
  assert.equal(groups[0].label, `${"a".repeat(49)}🚀`);
});

test("stale entries whose message left the list join the last open group", () => {
  const messages = [
    message("user-1", "user", "First"),
    reviewMessage("w1", "snap-1"),
    message("user-2", "user", "Second"),
    reviewMessage("w2", "snap-2"),
  ];
  const entries = reviewChangesFromMessages([
    ...messages,
    reviewMessage("w3", "snap-3"),
  ]);
  const groups = groupReviewChangesByTurn(messages, entries);

  assert.equal(groups.length, 2);
  assert.deepEqual(groups[1].snapshotIds, ["snap-2", "snap-3"]);
});

test("turns with no changes are omitted and turnIndex stays chronological", () => {
  const groups = group([
    message("user-1", "user", "No edits here"),
    message("assistant-1", "assistant", "Just a reply."),
    message("user-2", "user", "Now edit"),
    reviewMessage("w1", "snap-1"),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].anchorId, "user-2");
  assert.equal(groups[0].turnIndex, 1);
});
