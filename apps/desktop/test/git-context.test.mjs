import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readWorkspaceGitContext } from "../electron/main/git-context.ts";

function withTempDir(fn) {
  return async () => {
    const root = mkdtempSync(join(tmpdir(), "git-context-"));
    try {
      await fn(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };
}

/** A plain checkout: `.git` is a directory with HEAD. */
test(
  "reads branch and base commit from a plain checkout",
  withTempDir(async (root) => {
    const gitDir = join(root, ".git");
    mkdirSync(join(gitDir, "refs", "heads"), { recursive: true });
    writeFileSync(join(gitDir, "HEAD"), "ref: refs/heads/main\n");
    writeFileSync(join(gitDir, "refs", "heads", "main"), "a1b2c3d4e5f6\n");

    const context = await readWorkspaceGitContext(root);
    assert.equal(context?.branch, "main");
    assert.equal(context?.baseCommit, "a1b2c3d");
    assert.equal(context?.worktreeOf, undefined);
  }),
);

/** A linked worktree: `.git` is a pointer file and commondir names the main root. */
test(
  "resolves a linked worktree back to its main checkout",
  withTempDir(async (root) => {
    // Main checkout at <root>/main with .git dir; worktree at <root>/wt.
    const mainRoot = join(root, "main");
    const mainGitDir = join(mainRoot, ".git");
    const wtGitDir = join(mainGitDir, "worktrees", "wt");
    const wtRoot = join(root, "wt");
    mkdirSync(wtGitDir, { recursive: true });
    mkdirSync(wtRoot, { recursive: true });
    // A worktree's branch ref lives in the common gitdir's refs, not in the
    // private worktree gitdir — mirror git's real layout.
    mkdirSync(join(mainGitDir, "refs", "heads", "feat"), { recursive: true });

    writeFileSync(join(wtGitDir, "HEAD"), "ref: refs/heads/feat/x\n");
    writeFileSync(join(mainGitDir, "refs", "heads", "feat", "x"), "9f8e7d6c5b4a\n");
    writeFileSync(join(wtGitDir, "commondir"), "../..\n");
    writeFileSync(join(wtRoot, ".git"), `gitdir: ${wtGitDir}\n`);

    const context = await readWorkspaceGitContext(wtRoot);
    assert.equal(context?.branch, "feat/x");
    assert.equal(context?.baseCommit, "9f8e7d6");
    assert.equal(context?.worktreeOf, mainRoot);
  }),
);

/** A branch ref that only exists in packed-refs still resolves the base commit. */
test(
  "falls back to packed-refs for the base commit",
  withTempDir(async (root) => {
    const gitDir = join(root, ".git");
    mkdirSync(gitDir, { recursive: true });
    writeFileSync(join(gitDir, "HEAD"), "ref: refs/heads/main\n");
    writeFileSync(
      join(gitDir, "packed-refs"),
      "# pack-refs with: peeled fully-peeled sorted \n" +
        "a1b2c3d4e5f6 refs/heads/main\n" +
        "^deadbeef\n",
    );

    const context = await readWorkspaceGitContext(root);
    assert.equal(context?.branch, "main");
    assert.equal(context?.baseCommit, "a1b2c3d");
  }),
);

/** A worktree whose branch is packed in the common dir resolves through it. */
test(
  "reads a worktree base commit from the common dir packed-refs",
  withTempDir(async (root) => {
    const mainRoot = join(root, "main");
    const mainGitDir = join(mainRoot, ".git");
    const wtGitDir = join(mainGitDir, "worktrees", "wt");
    const wtRoot = join(root, "wt");
    mkdirSync(wtGitDir, { recursive: true });
    mkdirSync(wtRoot, { recursive: true });
    writeFileSync(join(wtGitDir, "HEAD"), "ref: refs/heads/feat/y\n");
    writeFileSync(join(wtGitDir, "commondir"), "../..\n");
    writeFileSync(join(wtRoot, ".git"), `gitdir: ${wtGitDir}\n`);
    writeFileSync(
      join(mainGitDir, "packed-refs"),
      "9f8e7d6c5b4a refs/heads/feat/y\n",
    );

    const context = await readWorkspaceGitContext(wtRoot);
    assert.equal(context?.branch, "feat/y");
    assert.equal(context?.baseCommit, "9f8e7d6");
    assert.equal(context?.worktreeOf, mainRoot);
  }),
);

/** Relative gitdir pointers resolve against the worktree root. */
test(
  "follows a relative gitdir pointer",
  withTempDir(async (root) => {
    const mainRoot = join(root, "main");
    const mainGitDir = join(mainRoot, ".git");
    const wtGitDir = join(mainGitDir, "worktrees", "wt");
    const wtRoot = join(root, "wt");
    mkdirSync(wtGitDir, { recursive: true });
    mkdirSync(wtRoot, { recursive: true });
    writeFileSync(join(wtGitDir, "HEAD"), "ref: refs/heads/dev\n");
    writeFileSync(join(wtGitDir, "commondir"), "../..\n");
    writeFileSync(
      join(wtRoot, ".git"),
      "gitdir: ../main/.git/worktrees/wt\n",
    );

    const context = await readWorkspaceGitContext(wtRoot);
    assert.equal(context?.branch, "dev");
    assert.equal(context?.worktreeOf, mainRoot);
  }),
);

/** Detached HEAD reports "detached" with the commit hash. */
test(
  "reports a detached HEAD",
  withTempDir(async (root) => {
    const gitDir = join(root, ".git");
    mkdirSync(gitDir, { recursive: true });
    writeFileSync(join(gitDir, "HEAD"), "0123456789abcdef\n");

    const context = await readWorkspaceGitContext(root);
    assert.equal(context?.branch, "detached");
    assert.equal(context?.baseCommit, "0123456");
    assert.equal(context?.worktreeOf, undefined);
  }),
);

/** Not a repository: no badge information at all. */
test(
  "returns null outside a git repository",
  withTempDir(async (root) => {
    assert.equal(await readWorkspaceGitContext(root), null);
  }),
);

/** A `.git` directory without HEAD degrades to null instead of guessing. */
test(
  "returns null when HEAD is unreadable",
  withTempDir(async (root) => {
    mkdirSync(join(root, ".git"), { recursive: true });
    assert.equal(await readWorkspaceGitContext(root), null);
  }),
);
