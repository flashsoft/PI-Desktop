# Turn-Scoped Review Interactions (Fork Extension)

> Scope: **fork-only**. Interaction patterns for the work-panel Review tab
> that group workspace changes by conversation turn and enable turn-level
> rollback. Extends `docs/spec/04-ux/09-interaction-patterns.md`. Pinned by
> `apps/desktop/src/components/workpanel/ReviewTab.tsx` and
> `apps/desktop/src/lib/workspace-review.ts`.

## Grouping

`groupReviewChangesByTurn(messages, entries)` splits flattened review
records into turn groups at user-message boundaries (steering messages stay
in the current turn). Each group carries `{ anchorId, label, entries,
additions, deletions, activeCount, snapshotIds }`; changes before the first
user message fold into the first group.

Each group renders a collapsible header: turn index, user-message excerpt,
file count, aggregate +/-, and group state. Group bodies reuse the existing
`ReviewChangeCard`.

## Actions

The group action is driven by `review.checkTurn`:

- All files clean → **"Roll back this turn"** (surgical undo,
  `mode: "turn"`).
- Earlier turn or dirty files → primary action **"Roll back to before this
  turn"** (`mode: "rewind"`); the confirm dialog lists the affected turns
  and files and states the consequence ("this restores N turns / X file
  changes").
- Everything is disabled while the session is running.

Conflicted results are annotated per file; copy advises re-running
build/tests after a rollback.

## Honest blind spots

Rollback does **not** revert Bash-driven external side effects (installed
dependencies, migrations, processes, commits), and the project may sit in an
intermediate state needing a rebuild. The UI states this rather than
attempting semantic impact analysis.
