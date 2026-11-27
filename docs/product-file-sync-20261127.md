# Product file synchronization — implementation checkpoint

Status: in progress, not formal acceptance. ERP 8081 remains the sole business backend.

## Locked business contract

- Confirmation reserves the existing formal code and queues local materialization; draft does not create a folder. Formal ERP intake remains a separate action.
- One formal-code folder directly contains the existing product workbook, SKU workbook and reference files. No image subdirectories. No paid AI, listing or email authorization.
- Root and employee-prefix directory mapping are ERP-owned settings. User explicitly approved `zsq` → `86000占树全选品-zsq`; do not infer other mappings.
- WPS is the existing official bidirectional collaboration channel. Drive must become local-to-cloud copy only; no deletion propagation or reverse overwrites.

## Implementation

- `selection-product-files.js` reuses the leased ERP command queue, keyed by selection and content. Migration 0205 adds a command kind, without enqueuing historical selections.
- Connector requests ERP reservation/path validation before any folder write. It excludes market attachments, uses existing image fetch security checks, preserves supplier SKU IDs and persists SKU reference images.
- `product-file-store.mjs` publishes completed files exclusively, refuses source images with publish-ready filenames and retains differing existing files as conflicts.
- Immutable command cache outside cloud directories makes repeated XLSX generation safe across network retries.
- `miwa_ai.selection_product_files` owns configuration and verifies filesystem hashes through the read-only Docker product mount. Existing Item source-folder links may be filled only when empty and matching the same selection.
- The existing workbook renderer can populate the existing `快速数据录入.xlsx` layout, clears mapped sample values, preserves numeric zero, and explicitly forbids design/listing.

## Actual checks so far

- WPS 12.1.0.29690 has `D:\产品(Products)` configured for official bidirectional sync. Overview shows an error badge; details showed zero error files and recent successful files. New-product roundtrip is NOT yet verified.
- Drive 134.0.1.0 is logged in as info@miwa-happyhouse.com. Existing product root ID: `1XfPNNilejBCGOKG7pKDnuv3EK1dG_EJA`, under Computers. It currently propagates edits/removals. Existing client displayed 11 errors; not yet resolved.
- Added a shortcut to this same Drive folder in My Drive; no duplicate product tree was created. Windows exposes the shortcut as `.lnk`, not a writable directory, so it cannot yet implement the required one-way copy.
- Existing AIONE Google Drive API adapter exists, but this private product folder currently grants access only to its owner. A durable, root-scoped rclone/API configuration awaits the user's authorization choice.
- Three isolated test scripts pass: local write/concurrency/conflicts, complete flat bundle/retry cache, and PostgreSQL command queue/auth/lease/result/market-image isolation. These are NOT cloud or ordinary-employee formal acceptance.
- ERP shared intake regression: 17 suites, 196 tests pass with network disabled.
- ERP full backup: `20261127_192124-miwa-dev_localhost-*` (database, site config, public/private files).
- ERP configuration module installed. `zsq115` reservation validates against its approved folder. `zsq116` has no ERP reservation: no number or folder was invented.
- ERP native settings form verified in Chrome via global search `MIWA Folder Intake Settings`. Mapping and template fields display correctly; audit entry `0ktga8nb07` records the approved configuration. Screenshot: `.local/product-file-erp-settings.png`.
- Managed workbook updates now keep immutable prior bytes outside cloud directories and reject externally edited files; tests pass. ERP intake success schedules the formal-SKU refresh without another user step.
- Existing AutoDesign reader accepts the explicit ERP SKU column for manual rows without inventing supplier IDs. Targeted offline test and all 196 shared tests pass; deployed via the materials deployment plan.

## Production checkpoint — 2026-11-27 19:45 JST

- Cloud SQL backup `1795775449253`, description `product-files-before-f57a454`: SUCCESSFUL. Migration 0205 committed in a transaction with a 5-second lock timeout.
- Backend build `5c10c92b-2def-4377-9f35-baae88419192`: SUCCESS. Image digest `sha256:4f66d46306248d1a574f57784efded7c5e80b7438c687b8f706407cbe9b66026`. Candidate health verified database connected and migration 0205 before traffic promotion. Revision `aione-backend-current-00309-cam` now serves 100%; previous `00307-sas` retained.
- Immutable Windows connector release `connector-release-f57a454` is running through the existing production scheduled task. Private spool is `D:\MIWA-ERP\dev-secrets\miwa-erp-8081-production\product-file-state`. Previous task XML `product-files-task-before-f57a454.xml` and release `connector-release-b571be3` retained. Task remains logon-triggered; cold boot without interactive login is NOT verified.
- Only the explicitly authorized real record `xp261127014` / `zsq115` was enqueued for this acceptance. Command `7df7c4c1-ca51-495c-822f-3c7fd25b9b37` succeeded on attempt 1, state saved, ERP verified true.
- Actual folder `D:\产品(Products)\86000占树全选品-zsq\zsq115` contains six flat files: `zsq115.xlsx`, `SKU.xlsx`, three reference images, `aione-manifest.json`. ERP re-read SHA256 checks passed for every manifest asset. Item source folder is associated. No SKU or code changed.
- Existing AutoDesign material reader returned two actual formal SKUs with supplier IDs and no issues. Workbook explicitly says 禁止美工 / 禁止上架. No design or publication executed.
- Replayed the identical real file task using its immutable cache. All six files reported reused; no image fetch, regenerated code, duplicate directory or overwrite occurred.
- Google Drive browser shows all six files under existing employee tree, folder `1SO3svktHJLr70EmlBMCVUNtIxbnBcks2`. Sizes of the two workbooks and three images match local metadata. The connected metadata tool did not expose requested checksums, so cloud byte-for-byte verification is NOT claimed. Screenshot `.local/product-files-drive-zsq115.png`.
- Minimal existing-history status rendering commit `f31d8f5`: show verified local receipt, keep unverified cloud/automation statuses pending. Preview `dpl_GZLMaxmxAH5g4pQeBfbMTG4k3A39` READY; production `dpl_6PnSW7ygVErvs1NJcSDcrrHF3dSm` READY on existing domain. Reused all production source SHAs except this single file; previous frontend `dpl_F6NsZ7GGsj2p4tctnJccrZyuaBv9` retained.
- Formal AIONE browser login opened existing Google account chooser, but remains loading after account selection and one reload. Real signed-in status rendering remains pending; no auth changes were made. WPS web requires user login; desktop still shows its pre-existing sync error badge.

## Outstanding acceptance

- Configure and verify Drive one-way copy; stop only the old product-folder bidirectional mapping once replacement and rollback are ready.
- WPS actual upload/download roundtrip, authorized employee access, cloud checksums, offline/restart tests, independent versioned backup.
- AIONE status display and real administrator/ordinary employee browser regression.

## Rollback boundary

Do not restore entire databases over newly created business data. Roll back only release pointers/configuration and affected code. Keep generated files, cache and task receipts. ERP single-file deployment plan: `D:\MIWA-ERP\dev-secrets\miwa-erp-dev\deployments\product-files-20261127.json`.

Backend/connector and minimal status presentation are deployed. Cloud sync-direction configuration has NOT changed. Keep migration 0205 when rolling back code: removing its new command kind while receipts exist would be unsafe. Do not delete generated files or restore old databases over new business records.
