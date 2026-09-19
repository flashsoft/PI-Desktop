import type {
  DiffHunk,
  ReviewChange,
  ReviewChangeState,
  ReviewChangeStatus,
  UiMessage,
} from "@pi-desktop/shared";

const REVIEW_CHANGE_TOOLS = new Set(["Write", "Edit"]);
const REVIEW_CHANGE_STATUSES = new Set<ReviewChangeStatus>([
  "added",
  "modified",
  "deleted",
]);
const REVIEW_CHANGE_OPERATIONS = new Set(["write", "edit", "delete"]);
const REVIEW_CHANGE_STATES = new Set<ReviewChangeState>([
  "active",
  "rolledBack",
]);

export type ReviewChangeEntry = {
  message: UiMessage;
  change: ReviewChange;
};

export type ReviewTurnGroup = {
  /** Id of the user message anchoring this turn; "" when no user message exists. */
  anchorId: string;
  /** First ~50 trimmed chars of the anchor user message content; "" for the fallback group. */
  label: string;
  /** 1-based position of the group. */
  turnIndex: number;
  entries: ReviewChangeEntry[];
  additions: number;
  deletions: number;
  /** Entries whose change.state is not "rolledBack". */
  activeCount: number;
  /** Snapshot ids in chronological (entry) order. */
  snapshotIds: string[];
};

export type ReviewChangesSummary = {
  changeCount: number;
  activeCount: number;
  rolledBackCount: number;
  additions: number;
  deletions: number;
};

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function toolResultDetails(message: UiMessage): Record<string, unknown> | null {
  return recordValue(recordValue(message.toolResult)?.details);
}

function parseHunks(value: unknown): DiffHunk[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((hunk) => {
    const record = recordValue(hunk);
    const header = nonEmptyString(record?.header);
    if (!header || !Array.isArray(record?.lines)) return [];
    const lines: DiffHunk["lines"] = record.lines.flatMap((line) => {
      const lineRecord = recordValue(line);
      const type = lineRecord?.type;
      const text = typeof lineRecord?.text === "string" ? lineRecord.text : null;
      const lineType =
        type === "add" || type === "del" || type === "context" ? type : null;
      if (
        text === null ||
        lineType === null
      ) {
        return [];
      }
      return [{ type: lineType, text }];
    });
    return [{ header, lines }];
  });
}

/**
 * Read the durable change record embedded in one successful tool message.
 * The message owns this evidence; no current Git state is consulted.
 */
export function reviewChangeFromMessage(message: UiMessage): ReviewChange | null {
  if (
    message.role !== "tool" ||
    message.toolStatus !== "success" ||
    !REVIEW_CHANGE_TOOLS.has(message.toolName || "")
  ) {
    return null;
  }

  const details = toolResultDetails(message);
  if (details?.root !== "workspace") return null;
  const review = recordValue(details.review);
  if (!review || review.version !== 1) return null;

  const snapshotId = nonEmptyString(review.snapshotId);
  const messageId = nonEmptyString(review.messageId);
  const path = nonEmptyString(review.path);
  const operation = review.operation;
  const status = review.status;
  const state = review.state;
  const additions = nonNegativeInteger(review.additions);
  const deletions = nonNegativeInteger(review.deletions);
  if (
    !snapshotId ||
    !messageId ||
    !path ||
    typeof operation !== "string" ||
    !REVIEW_CHANGE_OPERATIONS.has(operation) ||
    typeof status !== "string" ||
    !REVIEW_CHANGE_STATUSES.has(status as ReviewChangeStatus) ||
    typeof state !== "string" ||
    !REVIEW_CHANGE_STATES.has(state as ReviewChangeState) ||
    additions === null ||
    deletions === null
  ) {
    return null;
  }

  return {
    version: 1,
    snapshotId,
    messageId,
    path,
    operation: operation as ReviewChange["operation"],
    status: status as ReviewChangeStatus,
    state: state as ReviewChangeState,
    additions,
    deletions,
    hunks: parseHunks(review.hunks),
    ...(review.binary === true ? { binary: true } : {}),
    ...(review.truncated === true ? { truncated: true } : {}),
    reversible: review.reversible === true,
  };
}

export function reviewChangesFromMessages(
  messages: UiMessage[],
): ReviewChangeEntry[] {
  return messages.flatMap((message) => {
    const change = reviewChangeFromMessage(message);
    return change ? [{ message, change }] : [];
  });
}

export function summarizeReviewChanges(
  changes: ReviewChangeEntry[] | ReviewChange[],
): ReviewChangesSummary {
  return changes.reduce<ReviewChangesSummary>(
    (summary, entry) => {
      const change = "change" in entry ? entry.change : entry;
      summary.changeCount += 1;
      summary.additions += change.additions;
      summary.deletions += change.deletions;
      if (change.state === "rolledBack") summary.rolledBackCount += 1;
      else summary.activeCount += 1;
      return summary;
    },
    {
      changeCount: 0,
      activeCount: 0,
      rolledBackCount: 0,
      additions: 0,
      deletions: 0,
    },
  );
}

/** Update only the persisted message-local review state after a rollback. */
export function withReviewChangeState(
  message: UiMessage,
  state: ReviewChangeState,
): UiMessage {
  const toolResult = recordValue(message.toolResult);
  const details = recordValue(toolResult?.details);
  const review = recordValue(details?.review);
  if (!toolResult || !details || !review) return message;
  return {
    ...message,
    toolResult: {
      ...toolResult,
      details: {
        ...details,
        review: {
          ...review,
          state,
        },
      },
    },
  };
}

/** First `limit` Unicode code points of the trimmed anchor text. */
function turnLabel(content: string | undefined, limit = 50): string {
  return [...(content || "").trim()].slice(0, limit).join("");
}

/**
 * Group review changes into user-level turns, cut at user-message anchors.
 *
 * A turn opens at each user message that is not a steering input (steering was
 * accepted into the turn already running, so it must not cut). Entries land in
 * the turn of the latest anchor at or before their message; changes recorded
 * before the first user message join that first turn, mirroring how the
 * transcript renders a prelude inside the opening turn. Entries whose message
 * is no longer in the list (stale) attach to the last open turn, and when no
 * user message exists at all everything falls back into one unanchored group.
 * Turns with no changes are omitted; turnIndex is assigned after that filter.
 */
/**
 * Group flat review entries by conversation turn. Turns are cut at
 * user-message anchors; steering messages stay in the current turn and
 * system rows never cut. `snapshotIds` in each group stay chronological —
 * the host's batch rollback derives restore bytes and guard hashes
 * positionally, so callers must not reorder them. Entries whose message is
 * absent from `messages` (stale) append to the last open group and can break
 * that chronology; the only current caller derives both lists from the same
 * message array, so stale entries cannot occur there.
 */
export function groupReviewChangesByTurn(
  messages: UiMessage[],
  entries: ReviewChangeEntry[],
): ReviewTurnGroup[] {
  type MutableGroup = { anchorId: string; label: string; entries: ReviewChangeEntry[] };

  const entriesByMessageId = new Map<string, ReviewChangeEntry[]>();
  const staleEntries: ReviewChangeEntry[] = [];
  const messageIds = new Set(messages.map((message) => message.id));
  for (const entry of entries) {
    if (!messageIds.has(entry.message.id)) {
      staleEntries.push(entry);
      continue;
    }
    const bucket = entriesByMessageId.get(entry.message.id);
    if (bucket) bucket.push(entry);
    else entriesByMessageId.set(entry.message.id, [entry]);
  }

  const groups: MutableGroup[] = [];
  let current: MutableGroup | null = null;
  let sawAnchor = false;
  // Changes recorded before the first anchor wait here and merge into that
  // first turn when it opens; with no anchor at all they form the fallback.
  let prelude: ReviewChangeEntry[] | null = null;
  for (const message of messages) {
    if (message.role === "user" && !message.steering) {
      sawAnchor = true;
      current = {
        anchorId: message.id,
        label: turnLabel(message.content),
        entries: prelude ?? [],
      };
      prelude = null;
      groups.push(current);
    }
    const bucket = entriesByMessageId.get(message.id);
    if (!bucket) continue;
    if (current) current.entries.push(...bucket);
    else (prelude ??= []).push(...bucket);
  }

  if (!sawAnchor) {
    const fallbackEntries = [...(prelude ?? []), ...staleEntries];
    if (fallbackEntries.length > 0) {
      groups.push({ anchorId: "", label: "", entries: fallbackEntries });
    }
  } else if (staleEntries.length > 0) {
    // Stale entries attach to the last open turn; an anchored turn always
    // exists here because sawAnchor implies at least one group was pushed.
    (current ?? groups[groups.length - 1]).entries.push(...staleEntries);
  }

  const summaryGroups = groups.filter((group) => group.entries.length > 0);
  return summaryGroups.map((group, index) => ({
    anchorId: group.anchorId,
    label: group.label,
    turnIndex: index + 1,
    entries: group.entries,
    additions: group.entries.reduce((total, entry) => total + entry.change.additions, 0),
    deletions: group.entries.reduce((total, entry) => total + entry.change.deletions, 0),
    activeCount: group.entries.filter((entry) => entry.change.state !== "rolledBack").length,
    snapshotIds: group.entries.map((entry) => entry.change.snapshotId),
  }));
}
