# PR #206 — Canonical store registry migration gate

Status: validation only. No production schema migration or real store initialization has been performed.

Verified from Cloud SQL read-only queries (2026-10-16): public.products, product_skus, channel_listings exist. public.stores, platforms and listings do not. channel_listings has zero records. No store/account-named table was found.

The additive SQL migration 0112 creates public.platforms and public.stores but does not insert actual stores, alter existing product/SKU/listing tables, assign external account IDs, or migrate shop_ref text. The isolated CI workflow tests the old schema, second execution, canonical FK/column contract and preservation of existing records.

**Current deployment contract (updated 2026-10-16):** The PR branch now makes `_AIONE_DEPLOY_MODE=preview` skip `automatic-current-migration`, `migration-gate`, and `read-only-db-preflight`. Candidate revision deployment retains `--no-traffic` and private IAM. The `release` mode still invokes `npm run db:migrate`, which runs ALL unapplied numbered repository migrations. CI tests validate the branch logic, not an actual Cloud Run deploy. Preview remains connected to the shared CURRENT database and must not be used for write acceptance; a 0%-traffic candidate does not isolate its runtime database connection.

Before any deployment:
- Preview: confirm reviewed SHA, green CI, approved private candidate deployment, and read-only behavior; do not assume database isolation merely because traffic is 0%. Do not seed stores or perform write acceptance on shared CURRENT data.
- Release: in addition to the requirements below, explicitly approve schema mutation after complete migration inventory, backup and rollback preparation.
1. Read-only comparison of public.schema_migrations with all numbered Repo migrations and review ALL pending SQL against the real lifecycle schema.
2. Cloud SQL backup / rollback plan and explicit migration approval.
3. Isolated legacy-schema migration tests, including idempotency and unchanged historical data.
4. Separate verification of actual shop codes, names and RMS account mappings. Do not seed guessed records.
5. After approved migration, validate store registry, permissions, product references, shipping, pricing, SKU identity and shared settings against the actual service.

Keep PR #206 draft until these release gates and Preview acceptance are satisfied. Do not enable Store defaults in the absence of verified canonical store records.
