import assert from "node:assert/strict";
import test from "node:test";
import {
  effectiveSessionBranch,
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
