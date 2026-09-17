/**
 * Pure derivation of the conversation topbar's session-context badges: which
 * directory the session effectively works in and which branch to show. Kept
 * free of React and the store so `test/session-context.test.mjs` pins the
 * fallback order directly.
 */

export type SessionContextSource = {
  projectPath?: string | null;
};

export type WorkspaceContextSource = {
  path?: string | null;
  branch?: string | null;
};

function nonEmpty(value?: string | null): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || null;
}

/** Normalize separators/case so a session path can be compared to the workspace root. */
function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

/**
 * The directory the path badge copies and "open location" acts on: the
 * session's own project wins, and the current workspace root is the fallback
 * for sessions the host has not stamped yet.
 */
export function effectiveSessionPath(
  session?: SessionContextSource | null,
  workspace?: WorkspaceContextSource | null,
): string | null {
  return nonEmpty(session?.projectPath) ?? nonEmpty(workspace?.path);
}

/**
 * Branch shown on the badge. `workspace.branch` is resolved from the
 * workspace root's `.git/HEAD`, so it is only trustworthy when the session
 * actually works in that root; otherwise the badge hides.
 */
export function effectiveSessionBranch(
  session?: SessionContextSource | null,
  workspace?: WorkspaceContextSource | null,
): string | null {
  const workspacePath = nonEmpty(workspace?.path);
  const branch = nonEmpty(workspace?.branch);
  if (!workspacePath || !branch) return null;
  const sessionPath = nonEmpty(session?.projectPath);
  if (sessionPath && normalizePath(sessionPath) !== normalizePath(workspacePath)) {
    return null;
  }
  return branch;
}

/** Leading-elided display form: "…/workspaces/PI-Desktop" keeps the tail visible. */
export function elidePathHead(path: string, maxLength = 36): string {
  if (path.length <= maxLength) return path;
  const segments = path.split(/[/\\]/).filter(Boolean);
  for (let keep = segments.length; keep >= 1; keep -= 1) {
    const tail = `…/${segments.slice(-keep).join("/")}`;
    if (tail.length <= maxLength) return tail;
  }
  return `…${path.slice(-(maxLength - 1))}`;
}
