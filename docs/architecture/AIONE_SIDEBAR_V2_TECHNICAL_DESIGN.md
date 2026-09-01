# AIONE Sidebar V2.0 Technical Design

Status: VALIDATING
Date: 2026-09-01
Depends on: AIONE Header V2.0 stable baseline

## 1. Architecture Goal

Upgrade Sidebar interaction without changing business navigation truth.

The implementation must remain platform-level and reversible.

## 2. Existing Architecture to Reuse

Reuse:

- primary-navigation.js
- sidebar-registry.js
- route-registry.js
- shared sidebar HTML component
- shared sidebar CSS
- existing accordion behavior
- existing Desktop/Mobile separation

Do not create a second business Sidebar.

## 3. State Model

First stable implementation exposes two user-facing states:

AUTO
- Sidebar rests in compact rail state
- expands on deliberate pointer/focus interaction
- returns to compact state after pointer/focus leaves with a short grace period

PINNED
- Sidebar remains expanded
- user explicitly returns to AUTO

Internal state may distinguish transient EXPANDED_AUTO from AUTO, but this must not become an extra user setting.

## 4. State Ownership

One shared Sidebar controller owns state.

Recommended interface:

getSidebarMode()
setSidebarMode(mode)
expandSidebar(reason)
collapseSidebar(reason)
pinSidebar()
unpinSidebar()

Initial preference storage may use localStorage with a versioned key.

Future canonical user preference storage must be swappable behind the same interface.

## 5. Layout Contract

Do not move the entire app grid by ad-hoc JS style mutations.

Use shared CSS variables / body or app-shell state attributes.

Recommended contract:

html[data-sidebar-mode="auto|pinned"]
body[data-sidebar-expanded="true|false"]

Shared layout variables:

--desktop-sidebar-expanded
--desktop-sidebar-rail
--desktop-header-total

Header total height must reflect Header V2.0 actual rows only.

Do not retain deleted Header row heights.

## 6. Preferred Rendering Strategy

AUTO compact state should keep a stable rail in the document flow.

When expanded automatically, Sidebar may expand as an overlay or temporarily widen using a controlled shell pattern, but Main must not jump repeatedly on every pointer movement.

PINNED mode may allocate full Sidebar width in the grid.

This avoids the layout collapse observed in the failed experiment.

## 7. Pointer / Focus Rules

AUTO expansion triggers:

- pointer enters Sidebar rail
- keyboard focus enters Sidebar

AUTO collapse triggers only when:

- pointer has left Sidebar
- focus is not inside Sidebar
- no Sidebar menu/popover is open
- grace delay has elapsed

Do not collapse while user is moving between parent and child links.

## 8. Accessibility

- Pin button must be a real button
- aria-label must describe current action
- expanded/collapsed state must not remove keyboard access
- compact rail icons require accessible names/tooltips
- current route retains aria-current

## 9. Desktop / Mobile Isolation

Desktop selectors must be scoped to `.desktop-sidebar` / `.desktop-sidebar-host`.

Do not query generic route or navigation elements across mobile Drawer.

Mobile Drawer behavior remains unchanged in Sidebar V2.0.

## 10. Business Navigation Contract

Sidebar Shell consumes navigation config as-is.

Shell implementation must not rewrite labels or routes at runtime.

Any change such as:

选品工作台 -> 选品

belongs to a separate Navigation Freeze and config commit.

This prevents UI infrastructure from silently changing Product Truth.

## 11. Route Guardrail

Before Preview approval, run a route reachability smoke set covering at least:

- selection root and children
- sampling root and children
- procurement root
- design root
- listing root
- operation root
- order root
- inventory root
- service root
- at least one Home page outside 美和跨境

Sidebar mode must not affect route resolution.

## 12. Rollback Design

Implementation must be removable by reverting one feature commit or disabling one feature flag/class.

No DB migration.
No route migration.
No business data mutation.
No permanent navigation rewrite.

## 13. Failed Experiment Finding

The prior `feat/aione-sidebar-v2` experiment modified layout behavior before defining the shared shell contract and caused visible shell collapse in Preview.

Lessons:

- do not patch app-grid width reactively without a stable state contract
- do not combine navigation renaming, header-height correction, sidebar interaction, and route work in one experiment
- validate platform shell independently before business navigation changes

## 14. Implementation Sequence

1. Correct shared Header total-height token/contract only if still stale on main
2. Add shared Sidebar state controller
3. Add rail/pinned visual states to shared Sidebar CSS
4. Add pin control to shared Sidebar component
5. Preserve existing navigation config unchanged
6. Run build/lint/type checks available in repo
7. Preview on fixed test domain
8. Validate route smoke set and Desktop/Mobile isolation
9. Only after acceptance, merge main
10. Start separate 美和跨境 Navigation Freeze
