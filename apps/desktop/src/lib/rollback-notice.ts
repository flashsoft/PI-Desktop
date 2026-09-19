import type { ReviewRollbackResult, ReviewRollbackTurnMode } from "@pi-desktop/shared";

/**
 * English context block prepended to the next real user input after a
 * turn-scoped rollback (D-turn-review). The renderer records the rollback and
 * the composer send path consumes it once, so the agent's context stays
 * consistent with the workspace without spending a turn on a notice.
 */
export function buildRollbackNotice(input: {
  mode: ReviewRollbackTurnMode;
  outcomes: ReviewRollbackResult[];
}): string | null {
  const rolledBack = new Set(
    input.outcomes
      .filter((outcome) => outcome.status === "rolledBack")
      .map((outcome) => outcome.path)
      .filter((path): path is string => Boolean(path)),
  );
  if (rolledBack.size === 0) return null;
  const conflicted = new Set(
    input.outcomes
      .filter((outcome) => outcome.status === "conflict")
      .map((outcome) => outcome.path)
      .filter((path): path is string => Boolean(path)),
  );
  const unavailable = new Set(
    input.outcomes
      .filter((outcome) => outcome.status === "unavailable")
      .map((outcome) => outcome.path)
      .filter((path): path is string => Boolean(path)),
  );
  const partial = conflicted.size > 0 || unavailable.size > 0;
  const lines = [
    input.mode === "rewind"
      ? partial
        ? "[Workspace notice] The user rolled the workspace back toward the state before an earlier turn; the reverted and skipped files are listed below."
        : "[Workspace notice] The user rolled the workspace back to before an earlier turn; that turn and every later turn were reverted."
      : "[Workspace notice] The user rolled back the file changes of one conversation turn.",
    `Restored files: ${[...rolledBack].sort().join(", ")}.`,
  ];
  if (conflicted.size > 0) {
    lines.push(
      `Skipped files (changed afterwards, left as-is): ${[...conflicted].sort().join(", ")}.`,
    );
  }
  if (unavailable.size > 0) {
    lines.push(
      `Files without a usable snapshot (left as-is): ${[...unavailable].sort().join(", ")}.`,
    );
  }
  lines.push(
    "Do not re-apply the reverted changes unless the user explicitly asks.",
    "External side effects (shell commands, installs, migrations, commits) were not reverted, and the project may need a fresh build/test pass.",
  );
  return lines.join("\n");
}

/** Merge a new notice with one already pending for the session. */
export function appendRollbackNotice(
  pending: string | undefined,
  next: string,
): string {
  return pending ? `${pending}\n\n${next}` : next;
}
