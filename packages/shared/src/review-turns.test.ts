import { describe, expect, it } from "vitest";
import type { UiMessage, UiMessageRole } from "./types.js";
import {
  groupReviewChangesByTurn,
  reviewChangeFromMessage,
  reviewChangesFromMessages,
  summarizeReviewChanges,
} from "./review-turns.js";

function message(
  id: string,
  role: UiMessageRole,
  content: string,
  extra: Partial<UiMessage> = {},
): UiMessage {
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
function reviewMessage(
  id: string,
  snapshotId: string,
  extra: Partial<UiMessage> = {},
  reviewExtra: Record<string, unknown> = {},
): UiMessage {
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

function group(messages: UiMessage[]) {
  return groupReviewChangesByTurn(messages, reviewChangesFromMessages(messages));
}

const baseReview = {
  version: 1,
  snapshotId: "snapshot-1",
  messageId: "tool-1",
  path: "src/a.ts",
  operation: "edit",
  status: "modified",
  state: "active",
  additions: 4,
  deletions: 1,
  hunks: [
    {
      header: "@@ -1,2 +1,3 @@",
      lines: [
        { type: "context", text: "const before = true;" },
        { type: "del", text: "const removed = true;" },
        { type: "add", text: "const added = true;" },
      ],
    },
  ],
  reversible: true,
};

function toolMessage(overrides: Partial<UiMessage> = {}): UiMessage {
  return {
    id: "tool-1",
    role: "tool",
    content: "",
    createdAt: new Date().toISOString(),
    toolName: "Edit",
    toolStatus: "success",
    toolArgs: { path: "src/a.ts" },
    toolResult: { details: { root: "workspace", review: baseReview } },
    ...overrides,
  };
}

describe("reviewChangeFromMessage / reviewChangesFromMessages / summarizeReviewChanges", () => {
  it("reads review evidence from the successful message, not Git", () => {
    const change = reviewChangeFromMessage(toolMessage());
    expect(change?.path).toBe("src/a.ts");
    expect(change?.status).toBe("modified");
    expect(change?.additions).toBe(4);
    expect(change?.deletions).toBe(1);
    expect(change?.hunks[0].lines[1].type).toBe("del");

    const entries = reviewChangesFromMessages([
      toolMessage(),
      toolMessage({
        id: "tool-2",
        toolName: "Write",
        toolResult: {
          details: {
            root: "workspace",
            review: {
              ...baseReview,
              snapshotId: "snapshot-2",
              messageId: "tool-2",
              path: "new.ts",
              operation: "write",
              status: "added",
              additions: 3,
              deletions: 0,
            },
          },
        },
      }),
      toolMessage({
        id: "tool-3",
        toolResult: {
          details: {
            root: "workspace",
            review: {
              ...baseReview,
              snapshotId: "snapshot-3",
              messageId: "tool-3",
              path: "old.ts",
              status: "deleted",
              additions: 0,
              deletions: 8,
            },
          },
        },
      }),
    ]);
    expect(entries.map(({ change }) => [change.status, change.path])).toEqual([
      ["modified", "src/a.ts"],
      ["added", "new.ts"],
      ["deleted", "old.ts"],
    ]);
    expect(summarizeReviewChanges(entries)).toEqual({
      changeCount: 3,
      activeCount: 3,
      rolledBackCount: 0,
      additions: 7,
      deletions: 9,
    });
  });

  it("rejects failed and scratch tool rows as review evidence", () => {
    expect(
      reviewChangeFromMessage(toolMessage({ toolStatus: "error" })),
    ).toBeNull();
    expect(
      reviewChangeFromMessage(
        toolMessage({
          toolResult: { details: { root: "scratch", review: baseReview } },
        }),
      ),
    ).toBeNull();
    expect(
      reviewChangeFromMessage(
        toolMessage({ toolResult: { details: { root: "workspace" } } }),
      ),
    ).toBeNull();
  });
});

describe("groupReviewChangesByTurn", () => {
  it("parses the fabricated tool message as a review change", () => {
    const change = reviewChangeFromMessage(reviewMessage("w1", "snap-1"));
    expect(change?.snapshotId).toBe("snap-1");
    expect(change?.state).toBe("active");
  });

  it("groups changes under two user messages into two turn groups", () => {
    const groups = group([
      message("user-1", "user", "Fix the renderer bug"),
      reviewMessage("w1", "snap-1"),
      reviewMessage("w2", "snap-2", {}, { additions: 3, deletions: 2 }),
      message("user-2", "user", "Now update the store"),
      reviewMessage("w3", "snap-3", {}, { additions: 5, deletions: 4 }),
    ]);

    expect(groups.length).toBe(2);
    expect(groups.map((entry) => [entry.anchorId, entry.label, entry.turnIndex])).toEqual([
      ["user-1", "Fix the renderer bug", 1],
      ["user-2", "Now update the store", 2],
    ]);
    expect(groups[0].snapshotIds).toEqual(["snap-1", "snap-2"]);
    expect(groups[0].additions).toBe(4);
    expect(groups[0].deletions).toBe(3);
    expect(groups[0].activeCount).toBe(2);
    expect(groups[1].snapshotIds).toEqual(["snap-3"]);
    expect(groups[1].additions).toBe(5);
    expect(groups[1].deletions).toBe(4);
    expect(groups[1].activeCount).toBe(1);
  });

  it("keeps several Write/Edit tool messages under one user message in one group", () => {
    const messages = [
      message("user-1", "user", "Rewrite the module"),
      reviewMessage("w1", "snap-1"),
      reviewMessage("e1", "snap-2", { toolName: "Edit" }, { operation: "edit" }),
      reviewMessage("w2", "snap-3"),
    ];
    const groups = group(messages);

    expect(groups.length).toBe(1);
    expect(groups[0].anchorId).toBe("user-1");
    expect(groups[0].snapshotIds).toEqual(["snap-1", "snap-2", "snap-3"]);
    expect(groups[0].entries.length).toBe(3);
  });

  it("keeps a subagent tool row in its parent turn's group", () => {
    const groups = group([
      message("user-1", "user", "Delegate the cleanup"),
      reviewMessage("w1", "snap-1"),
      reviewMessage("w2", "snap-2", { parentToolCallId: "task-1" }),
    ]);

    expect(groups.length).toBe(1);
    expect(groups[0].anchorId).toBe("user-1");
    expect(groups[0].snapshotIds).toEqual(["snap-1", "snap-2"]);
  });

  it("does not cut a new turn at a steering user message", () => {
    const groups = group([
      message("user-1", "user", "Start the refactor"),
      reviewMessage("w1", "snap-1"),
      message("steer-1", "user", "Also cover the tests", { steering: true }),
      reviewMessage("w2", "snap-2"),
    ]);

    expect(groups.length).toBe(1);
    expect(groups[0].anchorId).toBe("user-1");
    expect(groups[0].label).toBe("Start the refactor");
    expect(groups[0].snapshotIds).toEqual(["snap-1", "snap-2"]);
  });

  it("merges changes before the first user message into the first group", () => {
    const groups = group([
      reviewMessage("w0", "snap-0"),
      message("user-1", "user", "First real turn"),
      reviewMessage("w1", "snap-1"),
    ]);

    expect(groups.length).toBe(1);
    expect(groups[0].anchorId).toBe("user-1");
    expect(groups[0].label).toBe("First real turn");
    expect(groups[0].snapshotIds).toEqual(["snap-0", "snap-1"]);
  });

  it("forms one fallback group when no user message exists at all", () => {
    const groups = group([
      reviewMessage("w1", "snap-1"),
      message("assistant-1", "assistant", "Done."),
      reviewMessage("w2", "snap-2"),
    ]);

    expect(groups.length).toBe(1);
    expect(groups[0].anchorId).toBe("");
    expect(groups[0].label).toBe("");
    expect(groups[0].turnIndex).toBe(1);
    expect(groups[0].snapshotIds).toEqual(["snap-1", "snap-2"]);
  });

  it("does not cut a turn at a system-role message between user messages", () => {
    const groups = group([
      message("user-1", "user", "First"),
      reviewMessage("w1", "snap-1"),
      message("system-1", "system", "Usage notice"),
      reviewMessage("w2", "snap-2"),
      message("user-2", "user", "Second"),
      reviewMessage("w3", "snap-3"),
    ]);

    expect(groups.length).toBe(2);
    expect(groups[0].snapshotIds).toEqual(["snap-1", "snap-2"]);
    expect(groups[0].anchorId).toBe("user-1");
    expect(groups[1].snapshotIds).toEqual(["snap-3"]);
    expect(groups[1].anchorId).toBe("user-2");
  });

  it("lowers activeCount for rolledBack changes but keeps them in the group", () => {
    const groups = group([
      message("user-1", "user", "Edit both files"),
      reviewMessage("w1", "snap-1"),
      reviewMessage("w2", "snap-2", {}, { state: "rolledBack" }),
    ]);

    expect(groups.length).toBe(1);
    expect(groups[0].entries.length).toBe(2);
    expect(groups[0].activeCount).toBe(1);
    expect(groups[0].snapshotIds).toEqual(["snap-1", "snap-2"]);
  });

  it("trims labels and truncates at 50 code points without splitting pairs", () => {
    const longContent = `  ${"a".repeat(49)}🚀tail  `;
    const groups = group([
      message("user-1", "user", longContent),
      reviewMessage("w1", "snap-1"),
    ]);

    expect([...groups[0].label].length).toBe(50);
    expect(groups[0].label).toBe(`${"a".repeat(49)}🚀`);
  });

  it("attaches stale entries whose message left the list to the last open group", () => {
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

    expect(groups.length).toBe(2);
    expect(groups[1].snapshotIds).toEqual(["snap-2", "snap-3"]);
  });

  it("omits turns with no changes and keeps turnIndex chronological", () => {
    const groups = group([
      message("user-1", "user", "No edits here"),
      message("assistant-1", "assistant", "Just a reply."),
      message("user-2", "user", "Now edit"),
      reviewMessage("w1", "snap-1"),
    ]);

    expect(groups.length).toBe(1);
    expect(groups[0].anchorId).toBe("user-2");
    expect(groups[0].turnIndex).toBe(1);
  });
});
