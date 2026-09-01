# AIONE 美和跨境 Route Audit

Date: 2026-09-01
Status: VERIFIED CURRENT IMPLEMENTATION SNAPSHOT
Scope: Current `main` route/navigation implementation

## 1. Audit Purpose

Verify whether the reported `直发选品` navigation problem is a Sidebar interaction defect, an existing route defect, or a missing Product/Route definition.

## 2. Evidence Reviewed

- `apps/systems/aione/js/config/business-navigation.js`
- `apps/systems/aione/js/config/route-registry.js`
- repository code search for:
  - `直发选品`
  - `direct listing`
  - `selection/direct`
  - `direct-listing`
  - `直发`

## 3. Verified Finding

Current repository search returns no implementation matching `直发选品` or an obvious direct-selection route.

Current Selection Sidebar children are:

- `selection/all` - 全部选品
- `selection/mine` - 我的选品
- `selection/ai` - AI的选品
- `selection/following` - 我的互动

Therefore:

**`直发选品` is not currently an implemented canonical Sidebar route in `main`.**

The earlier user-visible symptom should not be classified as “an implemented page that Sidebar V2 broke” without further evidence.

## 4. Product Truth Still Required

Before implementation, `直发选品` must be Product-Frozen as one of the following:

### Option A - View / Scope of the existing selection/product-opportunity object

Preferred if `直发选品` is fundamentally the same selection object filtered by a direct-ship business rule.

Example conceptual model:

`商品机会对象 + selection_type = direct_ship`

Then `直发选品` is a named view, not a duplicate object or separate database model.

### Option B - Stable child page under Selection

Use only if the direct-ship workflow has materially different stable operations that cannot be expressed as a view/scope.

### Option C - Process state inside Selection

Use if `直发` is merely a workflow decision/state rather than a persistent navigation destination.

## 5. Architecture Recommendation

Do not create a duplicate DirectSelection domain object.

Current AIONE object principles strongly favor:

same business object + different View / Scope

unless future Product Freeze proves that direct selection has a distinct stable domain boundary.

## 6. Route Governance

Until Product Freeze completes:

- do not invent `selection/direct`
- do not add placeholder pages only to make a menu clickable
- do not duplicate selection fields or data
- do not let Sidebar Shell own this problem

## 7. Follow-up Sequence

1. Validate Sidebar Shell V2 behavior
2. Implement locked first-level naming (`选品 / 测样 / ...`)
3. Product-Freeze `直发选品`
4. Define route/view contract only after Product Truth is clear
5. Implement and Preview
6. Connect 1688 API against the canonical Selection/Product model

## 8. Current Governance Classification

- Sidebar Shell V2: VALIDATING
- Crossborder first-level naming: PRODUCT-FROZEN / implementation pending
- Existing second-level navigation: CURRENT implementation, selective validation pending
- `直发选品`: PRODUCT DEFINITION PENDING
- 1688 integration: BLOCKED only by Product/Route contract for the direct-selection workflow, not by Sidebar Shell itself
