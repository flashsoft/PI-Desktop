import assert from "node:assert/strict";
import { register } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(join(here, "helpers/ts-import-hooks.mjs")));
const { buildRollbackNotice, appendRollbackNotice } = await import(
  "../src/lib/rollback-notice.ts"
);

const outcome = (status, path, snapshotId = `s-${path}`) => ({
  status,
  snapshotId,
  messageId: `m-${path}`,
  path,
});

test("returns null when nothing was rolled back", () => {
  assert.equal(
    buildRollbackNotice({
      mode: "turn",
      outcomes: [outcome("conflict", "a.ts")],
    }),
    null,
  );
});

test("turn notice names restored files and the no-reapply rule", () => {
  const notice = buildRollbackNotice({
    mode: "turn",
    outcomes: [outcome("rolledBack", "b.ts"), outcome("rolledBack", "a.ts")],
  });
  assert.ok(notice.includes("one conversation turn"));
  assert.ok(notice.includes("Restored files: a.ts, b.ts."));
  assert.ok(notice.includes("Do not re-apply"));
  assert.ok(notice.includes("External side effects"));
});

test("rewind notice states the rewind semantics", () => {
  const notice = buildRollbackNotice({
    mode: "rewind",
    outcomes: [outcome("rolledBack", "a.ts")],
  });
  assert.ok(notice.includes("every later turn were reverted"));
});

test("a partial rewind does not claim every later turn was reverted", () => {
  const notice = buildRollbackNotice({
    mode: "rewind",
    outcomes: [outcome("rolledBack", "a.ts"), outcome("conflict", "c.ts")],
  });
  assert.ok(notice.includes("toward the state before an earlier turn"));
  assert.ok(!notice.includes("every later turn were reverted"));
});

test("conflicted and unavailable files are listed as left as-is", () => {
  const notice = buildRollbackNotice({
    mode: "rewind",
    outcomes: [
      outcome("rolledBack", "a.ts"),
      outcome("conflict", "c.ts"),
      outcome("unavailable", "u.ts"),
    ],
  });
  assert.ok(notice.includes("c.ts"));
  assert.ok(notice.includes("u.ts"));
  assert.ok(notice.includes("left as-is"));
});

test("duplicate paths across snapshots are listed once", () => {
  const notice = buildRollbackNotice({
    mode: "turn",
    outcomes: [
      outcome("rolledBack", "a.ts", "s1"),
      outcome("rolledBack", "a.ts", "s2"),
    ],
  });
  assert.equal(notice.match(/a\.ts/g).length, 1);
});

test("appendRollbackNotice chains multiple pending notices", () => {
  assert.equal(appendRollbackNotice(undefined, "one"), "one");
  assert.equal(appendRollbackNotice("one", "two"), "one\n\ntwo");
});
