# PR #206 — Store registry and settings integration checkpoint (2026-10-17)

Status: **CI PASS; live UI/API and account ownership acceptance PENDING**.

## Grounded operational evidence
- Cloud SQL migration 0112 applied and recorded, confirmed by Cloud Shell SQL output on 2026-10-17.
- `public.platforms` and `public.stores` exist.
- `RAKUTEN` platform and three provisional internal store rows (`NAGAI_GD`, `SHIAWASEYA`, `PRIMELIFE`) were inserted by an audited, guarded seed transaction.
- All three store rows and the platform are **inactive**, with `external_store_id IS NULL`. These do **not** establish verified external Rakuten RMS account ownership. No publish/write-to-RMS verification.
- Previous private 0%-traffic Cloud Run Preview passed health check on commit `b62ea7b5b97d7845ceccb75cb5502772d526717e`; it does not prove the latest PR branch UI is live.

## Tested on disposable/contract fixtures
- `readSettingsStoreState` recognizes the 0112 column contract and reads the three inactive rows.
- `addStoreCatalogPreset` preserves three inactive profiles; they are not enabled selections.
- Backend rejects enabling a store profile when store/platform is inactive.
- Backend rejects new product assignment to an inactive canonical store.
- Existing product, SKU, and historical reference preservation are covered by earlier PR tests.
- Latest branch check result: 12/12 GitHub CI jobs successful (commit `b49e5d8983251c845cb0510dddfc1c6371d74d7a`).

## Blocking acceptance still required
1. Confirm independently that each internal display name belongs to the intended business platform and actual RMS store/account, without guessing identifiers or credentials.
2. Run authenticated **read-only live** `GET /api/v1/shared-parameters` against an explicitly pinned, current private Preview; verify returned `stores` and `storeCatalog.ready`. Preview remains connected to the shared database.
3. Inspect live Settings Center: all three are displayed inactive; no add/default operation can silently enable them.
4. After explicit business verification, activate only correct stores and recheck new product assignment, saved values, permissions, import/export and shipment/default pricing.
5. Review, approve, and merge PR #206 only after documented UI/API evidence and no blocker.

Do not interpret a 12/12 CI result as permission to turn on unverified stores, issue RMS writes, or merge into main.
