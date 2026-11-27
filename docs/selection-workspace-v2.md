# Selection workspace V2 — 2026-11-27

Scope: existing product selection workspace only. ERP 8081 remains authoritative;
no 8080, identity/permission, costing-formula, publishing or image-generation changes.

The reusable business workspace header hosts identity/status, shared actions and
view tabs. Selection number and ERP item code are separate. Selection confirmation
and ERP intake are separate existing states. History spans the workspace below
both columns. Layout version 40 seeds 72/28 and the 商品信息 label; subsequent
administrator layout edits remain configurable.

Field contracts:
- Formal code: `Item.item_code`, editable in unallocated drafts. Confirmation queues
  ERP validation/reservation, even when manually entered; an input alone cannot
  bypass reservation or allow intake. Existing allocation and intake lock the code.
- Notes: `Item.custom_miwa_selection_notes` (Long Text). No suitable existing
  general-purpose note field existed: reference facts are JSON and description is
  customer-facing selling points. Notes stay separate from structured SKU data.
- Name: `Item.item_name`, ERP recognition; `shortNameManual` protects confirmed edits.
- Sales platform: existing `MIWA Platform Store.platform`, with
  `custom_selection_disabled` controlling new selection availability. Historical
  values remain retained. No duplicate platform table or hardcoded option list.
- Costing remains the reviewed ERP script and ERP business parameters. The current
  global trial rate is explicitly not a verified per-platform commercial rate.

The 1688 CSV parser decodes only numeric/empty literal wrappers such as `="123"`.
Expressions are never evaluated; mismatched product IDs still reject import.

Acceptance: isolated ordinary-employee tests cover defaults, manual code and blank
code persistence, unvalidated-code intake rejection, live recognition, manual-name
protection, note persistence, cost calculation, unauthorized reads and typed status.
XLSX/XLS/CSV and concurrent draft regressions remain required. Actual xp261127013
SKU sale/price confirmation is reserved for the administrator before formal intake.

Release must use the tested source files, retain the prior Cloud Run revision and
Vercel deployment, and back up ERP DB/files plus changed runtime files. ERP runtime
and repository product-name helpers differ; deployment uses the minimal runtime
patch rather than replacing unrelated newer repository logic.
