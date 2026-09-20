import assert from "node:assert/strict";
import test from "node:test";
import {
  effectiveSessionBranch,
  effectiveSessionGitContext,
  effectiveSessionPath,
  elidePathHead,
} from "../src/lib/session-context.ts";

test("path falls back from the session project to the workspace root", () => {
  assert.equal(
    effectiveSessionPath({ projectPath: "/repo" }, { path: "/workspace" }),
    "/repo",
  );
  assert.equal(effectiveSessionPath({ projectPath: "  " }, { path: "/workspace" }), "/workspace");
  assert.equal(effectiveSessionPath(null, { path: "/workspace" }), "/workspace");
  assert.equal(effectiveSessionPath(null, null), null);
});

test("branch shows only when the session works in the workspace root", () => {
  const workspace = { path: "/repo", branch: "main" };
  // Session without its own path inherits the workspace branch.
  assert.equal(effectiveSessionBranch(null, workspace), "main");
  // Same path (separator/case tolerant) keeps the branch.
  assert.equal(effectiveSessionBranch({ projectPath: "/repo/" }, workspace), "main");
  assert.equal(
    effectiveSessionBranch({ projectPath: "\\repo" }, { path: "/Repo", branch: "main" }),
    "main",
  );
  // A session in a different directory cannot trust the workspace branch.
  assert.equal(effectiveSessionBranch({ projectPath: "/other" }, workspace), null);
  // No branch resolved at all.
  assert.equal(effectiveSessionBranch(null, { path: "/repo" }), null);
});

test("git context follows the same workspace-root trust rule as the branch", () => {
  const workspace = {
    path: "/repo-wt",
    branch: "feat/x",
    baseCommit: "9f8e7d6",
    worktreeOf: "/repo",
  };
  // A session working in the worktree root inherits all of it.
  assert.deepEqual(effectiveSessionGitContext(null, workspace), {
    branch: "feat/x",
    baseCommit: "9f8e7d6",
    worktreeOf: "/repo",
  });
  assert.deepEqual(effectiveSessionGitContext({ projectPath: "/repo-wt/" }, workspace), {
    branch: "feat/x",
    baseCommit: "9f8e7d6",
    worktreeOf: "/repo",
  });
  // A session elsewhere must not borrow the worktree identity.
  assert.deepEqual(effectiveSessionGitContext({ projectPath: "/other" }, workspace), {
    branch: null,
    baseCommit: null,
    worktreeOf: null,
  });
  // A plain checkout simply has no worktreeOf.
  assert.deepEqual(
    effectiveSessionGitContext(null, { path: "/repo", branch: "main" }),
    { branch: "main", baseCommit: null, worktreeOf: null },
  );
});

test("elidePathHead keeps short paths intact and elides the head of long ones", () => {
  assert.equal(elidePathHead("/repo"), "/repo");
  const long = "/Users/flashsoft/workspaces/PI-Desktop";
  const elided = elidePathHead(long, 24);
  assert.ok(elided.length <= 24, elided);
  assert.ok(elided.startsWith("…"), elided);
  assert.ok(elided.endsWith("PI-Desktop"), elided);
  // Degenerate budget still terminates with a tail slice.
  const tight = elidePathHead(long, 4);
  assert.ok(tight.length <= 4, tight);
});
