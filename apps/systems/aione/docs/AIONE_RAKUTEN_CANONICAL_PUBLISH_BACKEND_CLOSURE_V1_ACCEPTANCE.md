# AIONE Rakuten Canonical Publish Backend Closure V1 — Acceptance

Status: **PASS / CURRENT**  
Accepted on: **2026-09-10**  
Baseline main SHA at acceptance: `52c2b36730683b078bc91d47a30f8c6591fb6d7c`

## 1. Scope

This document records the real runtime acceptance for the AIONE Rakuten canonical publication path.

The acceptance target was intentionally narrow:

- Product: `MH0000002`
- Source platform: `1688`
- Source ref: `855305580969`
- Rakuten shop ref: `global-dimensions`
- R-Cabinet container code: `rkc001`
- Publication scope: exactly one canonical main image
- Asset source: canonical AIONE ProductAsset bytes stored in GCS

## 2. Proven runtime chain

The following chain was proven against the real Rakuten R-Cabinet provider boundary:

`ProductOpportunity -> Product MH0000002 -> ProductAsset -> canonical GCS object -> explicit Rakuten main_images assignment -> global-dimensions/rkc001 -> R-Cabinet provider identity -> channel_asset_mapping`

The acceptance runner then repeated the same publication operation and proved idempotent reuse of the existing mapping instead of creating a duplicate publication mapping.

## 3. Acceptance result

Authoritative runner result:

```text
[AIONE] RAKUTEN CANONICAL PUBLISH BACKEND CLOSURE V1 PASS
Verified: MH0000002 canonical GCS main image -> explicit Rakuten main_images assignment -> global-dimensions/rkc001 -> R-Cabinet provider identity -> one channel mapping -> idempotent second run.
```

Therefore:

**AIONE Rakuten Canonical Publish Backend Closure V1 = PASS**

## 4. Architecture truth confirmed by evidence

The accepted CURRENT publication architecture is:

`AIONE canonical ProductAsset -> GCS canonical bytes -> Rakuten Adapter -> R-Cabinet -> provider identity + AIONE channel mapping`

The following are explicitly not part of the CURRENT publication source path:

- re-downloading the publication asset from 1688 at publish time;
- using an arbitrary remote source URL as the authoritative publication byte source;
- scanning Drive again during Rakuten publication;
- creating a second Rakuten media library;
- duplicating ProductAsset records merely to publish to Rakuten.

Provider-specific filename constraints are normalized only at the Rakuten adapter boundary. They do not mutate AIONE canonical asset identity or GCS object identity.

## 5. Idempotency truth

For the accepted Product / shop / pack version / slot assignment:

- first execution created the provider publication result and one channel mapping;
- second execution reused the existing active mapping;
- duplicate channel mappings were not created;
- the canonical SOURCE ProductAsset remained the same object.

## 6. Governance status

This acceptance upgrades the Rakuten canonical publication path from design/implementation status to **real runtime verified CURRENT**.

The CURRENT source-of-truth rule is now:

> Once an asset has entered the canonical AIONE ProductAsset + GCS layer, Rakuten publication must use that canonical AIONE asset. External source URLs are evidence/provenance only and are not a normal publication-byte source.

Any legacy remote-download publication helper or route that bypasses canonical GCS is deprecated and must not remain as an alternative runnable publication path.

## 7. Next gate

With Source Material Closure and one real Rakuten canonical publication path proven, the next product-design phase may proceed toward **V2 Assisted Design**, while continuing to keep deterministic asset identity, provenance, readiness, publication mapping, and adapter rules outside AI judgment.
