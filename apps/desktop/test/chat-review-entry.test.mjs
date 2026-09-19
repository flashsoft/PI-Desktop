import {
  readStoreSource,
  readStoreModule,
  readTranscriptSource,
} from "./helpers/source-contracts.mjs";
import { readAppSource } from "./helpers/source-contracts.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const transcriptSource = await readTranscriptSource();
const cardSource = await readFile(
  new URL("../src/components/ReviewChangeCard.tsx", import.meta.url),
  "utf8",
);
const reviewSource = await readFile(
  new URL("../src/components/workpanel/ReviewTab.tsx", import.meta.url),
  "utf8",
);
const messageStylesSource = await readFile(
  new URL("../src/styles/messages.css", import.meta.url),
  "utf8",
);
const workPanelStylesSource = await readFile(
  new URL("../src/styles/work-panel.css", import.meta.url),
  "utf8",
);
const responsiveStylesSource = await readFile(
  new URL("../src/styles/responsive.css", import.meta.url),
  "utf8",
);
const appSource = await readAppSource();
const storeSource = await readStoreSource();
const appStoreSource = await readStoreModule("app-store.ts");
const eventsSource = await readStoreModule("slices/events-slice.ts");

test("chat renders one message-owned card immediately after its tool row", () => {
  assert.equal(transcriptSource.includes("<WorkspaceChangesEntry />"), false);
  assert.equal(transcriptSource.includes("review-changes-entry"), false);
  assert.match(
    transcriptSource,
    /<ToolRow message=\{item\.message\} \/>[\s\S]*<ReviewChangeCard message=\{item\.message\} \/>/,
  );
  assert.doesNotMatch(transcriptSource, /workspaceDiff|findWorkspaceChange/);
  assert.match(cardSource, /aria-expanded=\{open\}/);
  assert.match(cardSource, /chat\.reviewChangeShow/);
  assert.match(cardSource, /change\.hunks\.map/);
  assert.match(cardSource, /workspaceReviewRollback|rollbackWorkspaceChange/);
  assert.match(
    storeSource,
    /rollbackWorkspaceChange:[\s\S]*api\.workspaceReviewRollback[\s\S]*withReviewChangeState/,
  );
  assert.doesNotMatch(
    eventsSource,
    /shouldOpenReviewArtifact|toolWorkPanelTab\("review"\)/,
  );
  assert.doesNotMatch(storeSource, /workspaceReviewSessions/);
});

test("Review is a session change history and no longer refreshes a Git diff", () => {
  assert.match(reviewSource, /reviewChangesFromMessages\(messages\)/);
  assert.match(reviewSource, /<ReviewChangeCard/);
  assert.match(reviewSource, /panel\.review\.noChanges/);
  assert.doesNotMatch(reviewSource, /workspaceDiff|refreshWorkspaceDiff|api\.workspaceDiff/);
  assert.doesNotMatch(appSource, /reviewRev|refreshWorkspaceDiff|workspaceDiff/);
});

test("review surfaces keep visual state, focus, and motion feedback", () => {
  assert.match(cardSource, /data-state=\{change\.state\}/);
  assert.match(cardSource, /data-status=\{change\.status\}/);
  assert.match(messageStylesSource, /\.review-change-card-header:focus-visible/);
  assert.match(messageStylesSource, /\.review-change-card\[data-status="added"\]/);
  assert.match(messageStylesSource, /@keyframes review-change-reveal/);
  assert.match(workPanelStylesSource, /\.review-toolbar-counts/);
  assert.match(responsiveStylesSource, /\.review-change-card-body\s*\{[\s\S]*animation: none/);
});

test("a recorded change is a single flat row, not a card", () => {
  // Status travels as a git-style letter plus color, never color alone, and
  // the localized word stays in the accessible name.
  assert.match(cardSource, /review-change-card-mark/);
  assert.match(cardSource, /added: "A"[\s\S]*modified: "M"[\s\S]*deleted: "D"/);
  assert.doesNotMatch(
    cardSource,
    /review-change-card-(icon|status|state|main|meta)\b/,
  );
  assert.match(cardSource, /rolledBack"\s*\?\s*`\$\{baseLabel\}/);
  assert.match(
    messageStylesSource,
    /\.review-change-card-mark\s*\{[\s\S]*var\(--review-change-rail\)/,
  );
  // The row borrows the tool-row rhythm: no card border, rail, or shadow.
  const cardRule = messageStylesSource.match(/\n\.review-change-card \{[\s\S]*?\n\}/)?.[0];
  assert.ok(cardRule, "expected a .review-change-card rule");
  assert.doesNotMatch(cardRule, /^\s*(border|box-shadow|background)\s*:/m);
  assert.match(
    messageStylesSource,
    /\.review-change-card-header \{[\s\S]*min-height: 24px/,
  );
  // The Git-diff era file rows are gone; only the +/− counts helper survives.
  assert.doesNotMatch(workPanelStylesSource, /\.diff-file/);
  assert.match(workPanelStylesSource, /\.diff-counts \{/);
});
