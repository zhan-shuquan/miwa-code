# V1.9.5 Sidebar + Aside Lock Candidate

Date: 2026-08-24

## Scope

This candidate implements the formally locked Sidebar / Aside architecture on top of V1.9.4 Smart Header Lock Candidate. Header architecture is not reopened in this phase.

## Sidebar

- Replaces the previous three-section Sidebar with one Universal Sidebar component.
- Navigation area uses a familiar tree/accordion pattern.
- Business pages show all workbenches while auto-expanding only the current workbench.
- Content/tool/system routes reuse the same visual language with dynamic local content.
- Removes the desktop business switch from Sidebar; business switching remains a Header context responsibility.
- Replaces the old lower “current workbench secondary navigation” with an optional small Quick Actions dock.
- Quick Actions are limited to 0-3 high-frequency start actions (hard cap 4). Selection currently validates `New Product Opportunity` and `Batch Import`.

## Aside

- Removes AI Secretary UI, chat, runtime status, AI command composer and width-expansion controls from Aside.
- Aside is now a pure Contextual Aside.
- Supports hidden / light / standard states.
- Page context uses `aione:page-aside-context` rather than the deprecated `aione:page-ai-context` event.
- Active pages can supply current object/status/risk/relationship/help cards; no requirement to fill the panel.

## AI boundary

AI backend and historical AI Office assets remain in the repository, but the Global Shell no longer initializes the AI Secretary client through Aside. The independent `美和AI → AI工作区 → AI办公室` interaction layer will be implemented as a separate phase.

## Superseded rules

See:

- `AIONE_SIDEBAR_ASIDE_LOCK_V1.0.md`
- `DEPRECATED_SIDEBAR_ASIDE_STANDARDS.md`
