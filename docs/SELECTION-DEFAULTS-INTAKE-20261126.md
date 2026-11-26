# Selection defaults and formal intake — candidate, not deployed

2026-11-26, Asia/Tokyo. ERP8081 remains formal; 8080 untouched.

## Real record

- xp261126001 / selection:1f0280b3-2c71-47af-89f9-c1b6fb5861a2, selector/owner86000.
- Browser version5: purchase14.5CNY, weight400g, actual2280JPY, domestic0, qty1, Nos, polyester, image present, air bulk/general, original China packaging, **60cm carton / 60cm** manually saved. Preserve these values.
- User confirmed Chinese short name **披肩毯** and **multiple specifications, details to be supplied later**.
- Short name typed in the browser but NOT verified saved: session expired (`A valid Google sign-in session is required`). Browser handed back for authentication. Do not reload/discard unsaved input without checking.
- No formal number allocated for this record in this run; no formal Item created.

## Default restoration candidate

Shared ERP metadata defaults applied to new drafts, pool creation/claim and missing draft values; nonempty manual values and numeric0 preserved. UOM Nos displays个; Rakuten displays乐天. Configured operation defaults take precedence over hardcoded0. No cost/identification formula changes.

ERP migration candidate `miwa_ai.selection_entry_defaults` updates native Item default metadata once, records Patch Log, and adds the absent default-sales-platform field to the existing MIWA Business Parameters singleton. No separate parameter table. Existing Item rows unchanged. Migration tested only in isolated restore; not applied to8081.

## Formal intake candidate limitations

`miwa_ai.selection_product_intake` uses existing reservations, per-selection database lock, native Item insert and existing cost script, checksum-verified private images, and existing automation-internal flag. Missing image failure preserves reservation; replay returns the same actual Item. Original selector/current owner retained in AIONE and native Item audit comment.

Current prototype supports ordinary Item creation only and explicitly rejects SKU arrays. **Do not enable AIONE_FORMAL_ITEM_INTAKE or deploy this prototype as complete multi-SKU support.** Existing submit contract still requires SKU details. Reuse ERP native multi-specification intake after real specification information is supplied; never fabricate variant attributes or silently convert this product to single-specification.

AIONE candidate distinguishes queued submission from actual success and validates result selection/code. Connector candidate separates formal/test jobs. These candidate files are not running in production.

## Evidence

- Full8081 backup created16:24:34, copied to private `D:\MIWA-ERP\dev-secrets\miwa-erp-8081-production\20261126-defaults-intake`: DB25.1MiB, public10.7MiB, private56MiB, site config.
- Backup restored to existing `miwa-restore-stage1-20261126`, network=none, no published ports, DBrestore_verify. App/Redis share this isolated namespace; no workers started. These test containers remain running for continuation.
- Actual isolated Item creation and replay passed: one Item, one image; failure before image did not lose reservation. **zsq109 in this evidence is isolated-only and must not be reported as the real record's number.**
- Shared offline ERP suites passed except initial bs4 dependency issue; missing4 shipping tests subsequently passed in isolated image with existing dependencies.
- AIONE49 pool checks and74 workspace checks passed against updated8765 preview (session72427). Two old assertions updated because missing logistics now resolves to ERP defaults.
- New default preservation regression passed: manual values, zero, repeated initialization, configurable operation rates/platform and stock mapping.
- Actual Chrome isolated page: air bulk/general, original/A4/3cm, Nos label个, Rakuten label乐天; known title水槽沥水架 recognized, category厨房餐饮. Changed packaging60cm saved. Browser automation lost attachment before refresh verification; do not claim browser refresh passed this run.
- Runtime ERP naming code differs from newer source checkout. Runtime rule has no blanket/pashmina match; this is a review/manual fallback, not proven execution failure. No naming rule promoted.
- Cost hash unchanged fba8e4ffffea36faea0b0476f7df246ee850fd125fcd1136bf62fe9b2183d391; identification unchanged d18b60ee728853e1a746599d5ab6db3f48a1de34aea23c3282e08a33b83a0464.

## Continue / rollback

Restore real Google login, save confirmed short name, finish preview refresh/claim checks. Ship validated defaults independently if multi-SKU details remain pending. Build/deploy from an explicitly reviewed commit that excludes unfinished intake changes. Formal currently remains backend00281-meb / frontend dpl_D7JVt9eYiutuovtemJtEdvrioUuL; connector pinned58cc1f9. No production rollback needed because candidate not deployed. On later deployment roll back code/config only and retain new business data. Do not restore an old database over new user data.
