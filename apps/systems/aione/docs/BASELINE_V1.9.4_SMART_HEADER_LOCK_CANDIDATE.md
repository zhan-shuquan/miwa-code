# AIONE V1.9.4 Smart Header Lock Candidate

Status: Lock candidate
Date: 2026-08-24
Scope: Global Header only; no Sidebar phase-2 implementation in this release.

## 1. Header role

The Header is AIONE's global context and dispatch brain. It establishes identity, business context, work/time context, global object spaces and high-frequency dispatch before Sidebar/Main/Aside execute local responsibilities.

## 2. H1 locked structure

Fixed context core:

`AIONE -> Current Business -> Current User -> Work Home -> MIWA Calendar`

Core homes:

`Talent Home -> AI Home | Customer Home -> Supplier Home | Category Home -> Product Home -> Store Home | Analysis Home -> Knowledge Home`

Global tools:

`Search -> Notification -> Help -> Settings`

The first five context items do not scroll away. The core-home rail scrolls only when width requires it. Future extra homes use the existing More mechanism only when real entries exist.

## 3. H2 locked structure

H2 is Quick Access, not a resource directory. The front end shows only real shortcut buttons plus thin auto-generated separators. It never shows group labels such as Store Home, Application Home, Office or Procurement.

The internal Shared Resource Registry remains the single metadata source for shortcut generation. Important fields include productForm, origin, quickAccess, headerHidden, quickGroup and sortOrder. The `origin` value is backend management metadata and does not have to be exposed in the shortcut UI.

When H2 overflows, the shortcut rail can be browsed horizontally. A fixed apps-icon + More entry opens the level-2 Quick Access page.

## 4. H3 and H4

H3 remains the MIWA philosophy/method layer.

H4 is locked as:

`Today Impression | Important Schedule | Important Notice`

## 5. Internal naming boundary

`Shared Resources` is an internal registration/management concept. It is not a Header first-row or second-row user-facing navigation name. The stable internal `shared-home` route is retained for compatibility, while its visible page title is Quick Access.

## 6. Lock condition

This candidate becomes the Header lock baseline after the Windows/Live Server visual check confirms acceptable density, spacing and responsive behavior. After lock, the next structural phase is dynamic Sidebar + Aside generation and should not reopen Header architecture without a formal change record.
