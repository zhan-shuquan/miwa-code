# Coupon-only cost correction

Scope: merchant percentage/fixed coupons, transaction-based platform trial fees,
operating margin and inverse break-even/target prices. International freight
arithmetic, prices, permissions, synchronization and layout remain unchanged.

The ERP Server Script `AIONE-统一成本定价-TEST` remains the rule source. The
reviewed source SHA256 is `de9b3f839877bf0528f99fbbc44236400d2de32e47b91a8351446c521239ccf1`.
Cloud Run must pin the same `ERP_REVIEWED_RULE_SHA256`; configuration snapshots
continue through the existing connector. No new cost RPC or SQL migration.

`custom_aione_coupon_mode` defaults to 百分比 for existing records.
`custom_aione_coupon_amount` is the merchant-funded JPY amount when mode is 固定金额.
The inactive value is retained but never deducted. Discount is capped at revenue.
Points, advertising and other fees retain their prior list-price basis.
Zero transaction revenue has no defined operating margin.

At sale price 5980, a 50% coupon or fixed 2990 coupon gives transaction 2990
and a 10% trial platform fee of 299. The existing unoperated profit baseline
continues without coupons; operating profit and margin use discounted revenue.

Validation: 10 latest ERP logistics methods, 228 independent arithmetic cases;
70 valid forward/inverse coupon combinations; three cases in actual Frappe
safe_exec without writes; isolated API save/reload and existing business regression.
Run `scripts/test-coupon-cost-rule.py SNAPSHOT RULE RUNNER REPORT` with a locally
exported ERP snapshot (never commit private catalog data). API integration:
`node scripts/test-selection-coupon.mjs` against the isolated localhost:8765 fixture.

Deployment must install the two Item fields and reviewed rule, deploy the existing
intake field mapping and backend rule runner, and pin the reviewed hash together.
Do not bulk restore a database for code rollback: preserve all new business data,
restore the prior rule and matching Cloud Run revision, and keep added coupon fields.
The stable predecessor is AIONE main bc83f9a / Cloud Run 00325-wix / ERP 50b3085.

## Post-intake daily operations correction

ERP intake success locks formal identities and product material, not daily selection
simulations. The existing record PATCH accepts only the shared OPERATING_FIELDS
allowlist for submitted records: coupon mode/value, points, ads, other operating
rate, operating strategy and selection trial sale price. Existing owner/manager
authorization, optimistic version checks and archived locks remain enforced.
Preserve submitted/confirmed status, ERP receipt, formal number and SKU data.
Saving recalculates with the same ERP cost rule and records an audit event; it does
not submit ERP, update marketplace prices, or enqueue product-file work.

The approved UI label is 优惠券（%） (JPY unit when a fixed coupon is selected).
积分费率（%）、广告费率（%）、其他运营费率（%）、运营策略 retain their
existing names. Backend identifiers and ERP mappings are unchanged. Future business
field renaming requires administrator confirmation.

Run `node scripts/test-post-intake-operations.mjs` only against the isolated
localhost:8765 / database:15432 fixture. It verifies save/reopen, both coupon modes,
trial price, clearing strategy, owner/manager access, other-employee denial,
identity/SKU immutability, no new ERP/file jobs, version conflicts and archive lock.
