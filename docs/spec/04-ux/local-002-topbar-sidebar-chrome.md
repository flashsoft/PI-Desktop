# Topbar and Sidebar Chrome (Fork Extension)

> Scope: **fork-only**. Describes shell-chrome changes implemented in this
> fork that are not in upstream `vastsa/PI-Desktop`, extending
> `docs/spec/04-ux/08-component-spec.md`. Pinned by
> `apps/desktop/src/features/app/AppShell.tsx`, the topbar, and the sidebar.

## Topbar session-context badges

The topbar shows session-context badges (project / session context) with an
**open-location split button** that lets the user open the session's
location. The open-location menu uses an opaque background
(`fix(desktop) 9eee58d64`).

The previous **topbar session path badge was removed**
(`feat(desktop) f8189da0e`); session context is carried by the remaining
badges, not a raw path chip.

## Sidebar entries

The **new-task** and **search** entries live in the sidebar
(`feat(sidebar) bf907dc6e`) rather than the topbar, keeping the topbar
focused on session context.

> Note: these behaviors intentionally diverge from upstream's component
> spec. Upstream `08-component-spec.md` describes the upstream shell; this
> document is the authoritative reference for the fork's chrome.
