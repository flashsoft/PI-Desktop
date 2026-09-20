import { readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";

/**
 * Best-effort git context for one workspace root, resolved with plain file
 * reads so the workspace probes never spawn a git process.
 *
 * A linked worktree has a `.git` *file* (`gitdir: <path>`) instead of a
 * directory; its real HEAD and metadata live under that gitdir, and its
 * `commondir` points back at the main checkout's git directory. A plain
 * checkout has a `.git` directory with HEAD and no separate commondir.
 *
 * Everything is best-effort: any read or parse failure yields `null` and the
 * caller simply leaves the workspace fields unset, so submodule layouts,
 * separate-git-dir setups, and bare repos degrade to "no badge" rather than
 * wrong information.
 */
export type WorkspaceGitContext = {
  /** Branch name from HEAD, or "detached" when HEAD is a raw commit. */
  branch?: string;
  /** Short commit hash HEAD points at. */
  baseCommit?: string;
  /** Root path of the main checkout when this workspace is a linked worktree. */
  worktreeOf?: string;
};

async function readText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

/** Resolve the effective git directory for a workspace root, following a `.git` pointer file. */
async function resolveGitDir(root: string): Promise<string | null> {
  const dotGit = join(root, ".git");
  try {
    const info = await stat(dotGit);
    if (info.isDirectory()) return dotGit;
  } catch {
    // Not a directory; fall through and try to read it as a pointer file.
  }
  const pointer = await readText(dotGit);
  if (!pointer) return null;
  const match = pointer.match(/^gitdir:\s*(.+)$/m);
  if (!match) return null;
  const raw = match[1].trim();
  return isAbsolute(raw) ? raw : resolve(root, raw);
}

/** The shared git directory a worktree's commondir points at; null for a plain checkout. */
async function resolveCommonDir(gitDir: string): Promise<string | null> {
  const common = await readText(join(gitDir, "commondir"));
  if (!common) return null;
  const raw = common.trim();
  if (!raw) return null;
  return isAbsolute(raw) ? raw : resolve(gitDir, raw);
}

/** Derive the main checkout root from a common git dir (`<root>/.git`). */
function mainCheckoutRoot(commonGitDir: string): string | null {
  // The common dir of a linked worktree is the main checkout's `.git`
  // directory itself; anything else is not a layout we recognize.
  const name = commonGitDir.replace(/[/\\]+$/, "").split(/[/\\]/).pop();
  return name === ".git" ? dirname(commonGitDir) : null;
}

/** Look up a fully-qualified ref in a gitdir's packed-refs; undefined when absent. */
async function readPackedRef(gitDir: string, ref: string): Promise<string | undefined> {
  const packed = await readText(join(gitDir, "packed-refs"));
  if (!packed) return undefined;
  for (const line of packed.split("\n")) {
    // Lines are `<sha> <ref>`; `#` comments and `^` peeled lines are skipped.
    if (!line || line.startsWith("#") || line.startsWith("^")) continue;
    const space = line.indexOf(" ");
    if (space > 0 && line.slice(space + 1).trim() === ref) {
      return line.slice(0, space).trim().slice(0, 7) || undefined;
    }
  }
  return undefined;
}

export async function readWorkspaceGitContext(
  root: string,
): Promise<WorkspaceGitContext | null> {
  const gitDir = await resolveGitDir(root);
  if (!gitDir) return null;
  const head = await readText(join(gitDir, "HEAD"));
  if (!head) return null;

  const refMatch = head.match(/ref:\s*refs\/heads\/(.+)$/m);
  const branch = refMatch?.[1].trim() || "detached";

  // A commondir that differs from the gitdir marks a linked worktree; the
  // common dir is the main checkout's `.git`, so its parent is the main root.
  // Resolve it before the ref lookup: a worktree's branch refs live in the
  // common dir, not in its private gitdir.
  const commonGitDir = await resolveCommonDir(gitDir);
  const isWorktree = Boolean(commonGitDir && commonGitDir !== gitDir);

  let baseCommit: string | undefined;
  if (refMatch) {
    const name = refMatch[1].trim();
    // Loose ref first: the branch file sits in the common dir for a linked
    // worktree and in the gitdir itself for a plain checkout. Then fall back
    // to packed-refs, where refs land after clone or `git gc`.
    const loose = (await readText(join(commonGitDir ?? gitDir, "refs", "heads", name)))
      ?? (await readText(join(gitDir, "refs", "heads", name)));
    baseCommit = loose?.trim().slice(0, 7)
      || (await readPackedRef(commonGitDir ?? gitDir, `refs/heads/${name}`))
      || (isWorktree ? await readPackedRef(gitDir, `refs/heads/${name}`) : undefined);
  } else {
    baseCommit = head.trim().slice(0, 7) || undefined;
  }

  const context: WorkspaceGitContext = { branch, baseCommit };

  if (isWorktree && commonGitDir) {
    const mainRoot = mainCheckoutRoot(commonGitDir);
    if (mainRoot && mainRoot !== root) context.worktreeOf = mainRoot;
  }

  return context;
}
