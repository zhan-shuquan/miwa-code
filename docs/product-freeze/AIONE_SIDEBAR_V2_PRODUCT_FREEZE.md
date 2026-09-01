# AIONE Sidebar V2.0 Product Freeze

Status: VALIDATING
Date: 2026-09-01
Scope: Global AIONE Sidebar platform behavior only

## 1. Product Truth

AIONE Sidebar is a contextual navigation surface, not a globally fixed business directory.

Header owns global/current-business context. Sidebar owns navigation inside the current business/home/center/work area.

Desktop Sidebar MUST NOT repeat the current business name when Header already provides that context.

Business navigation content is configuration-driven and varies by:

Business -> Home/Center/Work Area -> Page Type -> Current Context

The platform locks behavior and visual rules, not one universal list of business items.

## 2. Global Responsibilities

The shared Sidebar platform owns:

- width and responsive behavior
- expand/collapse/auto-hide behavior
- current-item and current-group state
- accordion/tree interaction
- navigation rendering
- user preference persistence
- keyboard/accessibility behavior
- route-safe navigation hooks
- mobile/desktop behavior boundaries

Business modules own only navigation configuration and route definitions.

## 3. Desktop Interaction Model

Target states:

- auto: default candidate; compact when idle, expands on deliberate pointer interaction
- expanded: pinned open
- collapsed: optional future compact state if real use proves necessary

V2.0 first implementation SHOULD prioritize only two stable user-facing states:

- Auto Hide
- Pinned Open

Do not add a third state until real use demonstrates value.

User preference MAY be stored locally first, but the storage interface must remain replaceable by a future canonical user-preference service.

## 4. Accordion Rule

At most one primary navigation group should be expanded in a business work area unless a page type explicitly requires otherwise.

The group owning the current route expands automatically.

Opening another group collapses the previous group.

## 5. Naming Rule

Sidebar labels should use the shortest precise business term.

Avoid redundant suffixes such as:

- 工作台
- 中心
- 管理

when the surrounding context already communicates that level.

However, business navigation naming is NOT changed by Sidebar Shell implementation itself. Naming changes require a separate Navigation Freeze.

## 6. Layout Rule

Sidebar Shell must consume the actual current Header height.

It MUST NOT retain historical header-height assumptions after Header rows are removed or moved.

No page-level top-gap patch is allowed.

Header/Sidebar/Main/Aside layout must be derived from shared shell tokens or shared layout state.

## 7. Mobile Boundary

Desktop Sidebar behavior must not be forced onto mobile.

Mobile continues to use the mobile Drawer / mobile navigation pattern unless separately Product-Frozen.

Desktop and mobile DOM/query scopes must be isolated to prevent cross-container mutation.

## 8. Route Safety

Sidebar Shell development MUST NOT change business route definitions.

Route fixes and navigation-content changes are separate workstreams.

A Sidebar interaction change is not allowed to make an existing route unreachable.

## 9. Architecture Rule

There must be one shared Sidebar implementation:

Shared Sidebar Shell
+ Sidebar Registry / Navigation Config
+ Route Registry
+ User Preference Adapter

No business page may create a second Sidebar implementation.

No page-specific CSS patch may redefine global Sidebar behavior.

## 10. Acceptance Criteria

Sidebar V2.0 Shell can enter stable baseline only when all are true:

- Header V2.0 remains visually and functionally unchanged
- existing routes remain reachable
- Main and Aside layout remain stable
- no unexplained blank top area
- auto-hide works without layout collapse
- pinned-open works without overlaying Main incorrectly
- current route remains visible and highlighted
- accordion state follows current route
- Desktop and Mobile do not interfere with each other
- behavior is implemented in shared Shell code, not page patches
- disabling/removing Sidebar V2 behavior restores existing Sidebar without data or route changes

## 11. Explicit Non-Goals for Shell V2.0

The following are NOT part of the first Shell implementation:

- redesigning 美和跨境 business directory
- changing selection/sampling/procurement routes
- fixing direct-listing business pages
- adding business data
- building Search
- connecting 1688 API

These follow after Sidebar Shell is stable.

## 12. Governance

Previous broken experiment branch `feat/aione-sidebar-v2` is evidence only and must not be merged into main.

Current stable baseline remains `main`.

Implementation workflow:

Product Freeze -> Technical Design -> clean implementation branch -> automated checks -> Preview -> Review -> Merge main
