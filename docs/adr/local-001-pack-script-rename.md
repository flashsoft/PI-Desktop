# ADR local-001: Root packaging script renamed to `package`

- Status: accepted (fork-only)
- Date: 2026-09-19
- Fork commit: `3c2d14941`

## Context

Bare `pnpm pack` resolves to pnpm's built-in tarball command, which shadowed
the root packaging script and produced an npm tarball instead of the
Electron app.

## Decision

Rename the root script to `package` (not a pnpm builtin) and add a
`package` alias in `apps/desktop`. The desktop `pack` script keeps its name
since tests and filters already address it explicitly.

## Consequences

- Root: `pnpm package` builds the Electron app; `pnpm pack` no longer
  shadows the packaging intent.
- This supersedes the `pnpm pack` reference in upstream
  `docs/adr/0289-signed-macos-github-releases.md` (point 4) for this fork:
  local `pnpm dist:mac` / `pnpm package` remain unsigned when no identity is
  configured.
