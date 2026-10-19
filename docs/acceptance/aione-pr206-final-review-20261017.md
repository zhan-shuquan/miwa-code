# PR #206 — Final review gate (2026-10-17 JST)

**Status: REVIEW IN PROGRESS — NOT APPROVED FOR MAIN MERGE.**

## Verified evidence

- Current PR HEAD before this record: `455629e28f00c71ae350b1461e52ca23a70ab2b3`, 12/12 GitHub Actions success, mergeable=true, Draft.
- Cloud SQL instance `aione-pg-dev`: on-demand backup `1792213301942` SUCCESSFUL; migration `0112` registered, `public.platforms` and `public.stores` exist.
- Internal `RAKUTEN` platform and `NAGAI_GD` (永井GD), `SHIAWASEYA` (幸せ屋), `PRIMELIFE` (PrimeLife) records were initialized, all **inactive**, external RMS store IDs blank.
- Existing 0%-traffic private backend candidate `b62ea7b5b97d7845ceccb75cb5502772d526717e` passed authenticated `/health`; there was no active traffic cutover.
- Vercel Preview branch-scoped `AIONE_SETTINGS_PREVIEW_BACKEND_URL` updated to candidate-b62ea7b; Google OAuth authorized origin added by operator and Google login visibly succeeded.
- User observed three canonical UUIDs in Settings Center, all three profile rows displayed **停用**, usage 0.
- `zsq023` existing target shop appeared as `永井GD（历史值／当前不可用）` on the latest Preview.
- `apps/systems/aione/js/pages/product-manual-entry.js` no longer offers the hardcoded 3-name selectable list. Test validates only active canonical store/platform pairs are selectable; historical current shop displayed disabled; missing catalog fails closed.

## Open acceptance / release blockers

1. **RMS account ownership is unverified.** All three master stores and their platform intentionally remain inactive. No store may be activated or assigned external identifiers based on display name alone. New-product end-to-end store selection and save **cannot be marked PASS** until actual ownership is confirmed.
2. Live UI screenshot of historical value is not a verified save/readback; new-product end-to-end write, import/export with stores, and audit trail have not been exercised against an approved environment.
3. Preview health is for candidate `b62ea7b`, not the current HEAD. Production release must build the reviewed final HEAD using normal stable-release pipeline, and validate runtime health and traffic afterward.
4. The user observed a settings **“草稿待保存”** navigation prompt after viewing store settings. Whether this reflects a real change or erroneous Dirty State remains unverified. Investigate and classify before acceptance.
5. Original completeness inventory has additional unclosed scenarios (A01–A15) and legacy stable-ID migrations. Explicitly freeze whether these are in current PR scope or tracked as deferred work; don't silently claim comprehensive acceptance.

## Governance decisions / stop conditions

- Do not merge the Draft PR, activate provisional stores, write to Rakuten RMS, or alter Cloud SQL schema further under this review.
- For main release, require an explicit business-scope acceptance: either complete active-store workflow after verified account mapping, or formally approve a **foundation-only** release with new store selection intentionally disabled. The latter is a product decision, not implied by passing CI.
- Update stale acceptance text that states migration 0112 hasn't run. Store actual operational evidence here; no speculative accomplishments.
- Obtain final approval only after review findings are addressed, production cutover/rollback plan is explicit, and latest HEAD CI is fully green.

This document is a record of observed and code-verified evidence, not a certification of unperformed API writes.
