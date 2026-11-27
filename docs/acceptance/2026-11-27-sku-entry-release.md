# SKU entry repair — production release and acceptance

Status: deployed; real product creation acceptance pending employee completion.

## Release evidence

- AIONE code: `0993ed55d99362741078a7050fb3481555fd8c53`.
- ERP code: `5fead85`; only reviewed `selection_product_intake.py` deployed, runtime hash verified.
- Cloud Run: `aione-backend-current-00295-qem`, 100% traffic; database health connected.
- Vercel: `dpl_HJnQRCShFUDaDWDwD3vW3iXaDrSg`, READY, existing `aione.miwa-happyhouse.com` alias.
- ERP attribute snapshot received at `2026-11-27T06:24:39.802Z`, including existing ERP attribute aliases. An orphan previous connector was stopped after checking both command/job queues had no queued or processing work; current scheduled connector retained.
- Production browser: member 86001 opened xp261127001 with new specification controls and ERP connected. Draft version 6, zero saved SKUs at observation. No changes submitted to this draft by this acceptance run.

## Repair scope

Unified XLSX/XLS/CSV parsing and save/reload contract; existing ERP attributes and aliases drive matching. Preserve source IDs, source material, image URLs, valid zero values and manual corrections. Add manual SKU entry and combination selection, batch confirmation/cancel sales, validation of malformed or duplicate combinations. Serialize draft saves and safely rebase non-conflicting edits while retaining conflict protection. ERP supports manual rows without inventing supplier IDs; existing formal numbering and SKU generation retained.

## Completed checks

- Parser regression: all three formats, image URLs, zero values, invalid/formula inputs, manual rows, dynamic attributes, save/reparse and confirmation retention.
- Isolated ordinary employee APIs: three formats imported, saved and reloaded; other employee access returned 404; stale versions returned 409.
- Actual isolated Chrome: spreadsheet uploads, manual additions, batch confirmation/cancel sales, save and refresh, reference images, two-window non-conflicting edits retained.
- Existing upload transport: large uploads and record saves through constrained request sizes; owner and integrity checks preserved.
- ERP existing intake regression suite and six manual-intake tests passed. Runtime read-only validation passed; zsq109 still has 12 variants, attributes returned, no writes.

## Pending real business acceptance

User selected xp261127001 after 占金玲 completes and confirms real specifications. Do not create fictitious specifications or formally submit this incomplete draft. Formal new product creation, result return and idempotent repeat submission remain pending for that record. Production member 86001 page access is not a substitute for ordinary-role isolation testing; the latter was separately performed using isolated non-admin fixtures.

Image URL import is verified; embedded workbook image extraction is not claimed. Existing ERP formal submission limit of 50 selected SKUs remains unchanged.

## Rollback

No database migration was required. Preserve newly created business data during rollback.

- Cloud SQL backup: `1795760142341`, successful, before release.
- Backend rollback target: `aione-backend-current-00293-les` at 100% traffic.
- Frontend previous deployment: `dpl_3ZFpPgqyxDUXduft9WTydqGF16mV`; restore existing production alias to this deployment if required.
- ERP reviewed deployment plan: `D:\MIWA-ERP\dev-secrets\miwa-erp-dev\deployments\sku-manual-20261127\deploy-reviewed.json`, adjacent automatic backup. Use existing `scripts/deploy-existing.py --rollback` with this plan and the current backend container.
- Connector exporter backup: `D:\MIWA-ERP\dev-secrets\miwa-erp-8081-production\20261127-sku-entry\export-erp-selection-snapshot.before.py`.

No changes to zsq109 or its SKUs, costs, 8080, paid image generation, listing or external mail. Unrelated employee-auth working changes excluded from release.
