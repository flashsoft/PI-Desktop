/** Shared public types grouped by the owning application domain. */
// --- Work panel (review / browser / files / plugin views) ---

export type DiffLineType = "add" | "del" | "context";

export type DiffLine = {
  type: DiffLineType;
  text: string;
};

export type DiffHunk = {
  /** Raw `@@ -a,b +c,d @@ …` header line. */
  header: string;
  lines: DiffLine[];
};

export type ReviewChangeOperation = "write" | "edit" | "delete";
export type ReviewChangeStatus = "added" | "modified" | "deleted";
export type ReviewChangeState = "active" | "rolledBack";

/**
 * Durable, message-owned change evidence returned by a workspace mutation.
 * Unlike WorkspaceDiff, this record remains valid after a git commit.
 */
export type ReviewChange = {
  version: 1;
  snapshotId: string;
  messageId: string;
  path: string;
  operation: ReviewChangeOperation;
  status: ReviewChangeStatus;
  state: ReviewChangeState;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
  binary?: boolean;
  truncated?: boolean;
  reversible: boolean;
};

export type ReviewRollbackStatus =
  | "rolledBack"
  | "alreadyRolledBack"
  | "conflict"
  | "unavailable";

export type ReviewRollbackResult = {
  status: ReviewRollbackStatus;
  snapshotId: string;
  messageId?: string;
  path?: string;
};

/** Per-file verdict of a `review.checkTurn` preflight. */
export type ReviewCheckTurnFile = {
  path: string;
  /** Current bytes still match the batch's newest after-hash for this file. */
  clean: boolean;
  /** The batch's earliest active snapshot for this file can be restored. */
  reversible: boolean;
  /**
   * Another session's active snapshot whose after-hash matches the current
   * bytes — the strongest available attribution for a conflict. Absent when
   * the mismatch came from an external (non-snapshot) modification.
   */
  blockedBy?: { sessionId: string; messageId: string };
};

export type ReviewCheckTurnResult = {
  clean: boolean;
  files: ReviewCheckTurnFile[];
};

/** "turn" reverts one turn; "rewind" reverts that turn and every later turn. */
export type ReviewRollbackTurnMode = "turn" | "rewind";

export type ReviewRollbackTurnResult = {
  mode: ReviewRollbackTurnMode;
  outcomes: ReviewRollbackResult[];
};

export type DiffFileStatus =
  | "added"
  | "modified"
  | "deleted"
  | "renamed"
  | "untracked";

export type DiffFile = {
  path: string;
  oldPath?: string;
  status: DiffFileStatus;
  additions: number;
  deletions: number;
  binary?: boolean;
  /** Patch exceeded the per-file cap; hunks are omitted. */
  tooLarge?: boolean;
  hunks: DiffHunk[];
};

export type WorkspaceDiff = {
  /** Workspace root is a git work tree. */
  repo: boolean;
  /** No pending changes (only meaningful when repo). */
  clean: boolean;
  files: DiffFile[];
  /** File list hit the cap; more changes exist than listed. */
  truncated?: boolean;
};

export type BrowserAction = "back" | "forward" | "reload" | "stop";

export type BrowserState = {
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
};
