# PR #206 — Canonical store registry migration gate

Status: validation only. No production schema migration or real store initialization has been performed.

Verified from Cloud SQL read-only queries (2026-10-16): public.products, product_skus, channel_listings exist. public.stores, platforms and listings do not. channel_listings has zero records. No store/account-named table was found.

The additive SQL migration 0112 creates public.platforms and public.stores but does not insert actual stores, alter existing product/SKU/listing tables, assign external account IDs, or migrate shop_ref text. The isolated CI workflow tests the old schema, second execution, canonical FK/column contract and preservation of existing records.

**Release blocker:** infra/gcp/cloudbuild/deploy-current.yaml runs npm run db:migrate in BOTH preview and release modes. The migration script applies every unapplied numbered migration from the repository to the shared CURRENT database. A 0%-traffic preview is NOT an isolated database preview.

Before triggering PREVIEW_CURRENT_SETTINGS_BACKEND.sh or any shared-database deploy:
1. Read-only comparison of public.schema_migrations with all numbered Repo migrations and review ALL pending SQL against the real lifecycle schema.
2. Cloud SQL backup / rollback plan and explicit migration approval.
3. Isolated legacy-schema migration tests, including idempotency and unchanged historical data.
4. Separate verification of actual shop codes, names and RMS account mappings. Do not seed guessed records.
5. After approved migration, validate store registry, permissions, product references, shipping, pricing, SKU identity and shared settings against the actual service.

Keep PR #206 draft until these release gates and Preview acceptance are satisfied. Do not enable Store defaults in the absence of verified canonical store records.
