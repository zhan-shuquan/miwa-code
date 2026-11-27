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
- ERP native settings navigation has not yet displayed the new settings form successfully; no UI acceptance claim.

## Outstanding before production AIONE rollout

- Complete safe managed-file updates and post-intake SKU/path refresh; existing differing files currently stop with a conflict rather than overwrite.
- Verify manual SKUs without supplier IDs in the existing AutoDesign workbook reader.
- Configure permanent private connector spool path and package dependencies in an immutable release.
- Apply migration 0205 only after cloud backup, deploy matching backend/connector versions, and verify real zsq115 file creation/readback.
- Configure and verify Drive one-way copy; stop only the old product-folder bidirectional mapping once replacement and rollback are ready.
- WPS actual upload/download roundtrip, authorized employee access, cloud checksums, offline/restart tests, independent versioned backup.
- AIONE status display and real administrator/ordinary employee browser regression.

## Rollback boundary

Do not restore entire databases over newly created business data. Roll back only release pointers/configuration and affected code. Keep generated files, cache and task receipts. ERP single-file deployment plan: `D:\MIWA-ERP\dev-secrets\miwa-erp-dev\deployments\product-files-20261127.json`.

No formal AIONE backend update or cloud sync-direction change has been performed at this checkpoint.
