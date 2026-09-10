# AIONE Product Asset Pipeline Technical Design V1.0

Status: VALIDATING
Project: 美和AIONE一体化工作平台
Daily name: AIONE
Effective date: 2026-09-10
Depends on: `AIONE_PRODUCT_ASSET_PIPELINE_PRODUCT_FREEZE_V1.0.md`

## 1. Technical objective

Implement the first real product-asset closure on top of the existing CURRENT selection backend without creating a second runtime, second database, second asset model, or page-level file system.

Target flow:

`1688 ZIP evidence -> CURRENT selection import -> package recognition -> asset indexing -> ProductOpportunity relations -> Product continuity -> publish-asset readiness`

This design intentionally keeps AI generation outside the V1 critical path while preserving a direct extension path to DesignTask and OutputAsset.

## 2. CURRENT baseline constraints

All implementation must stay on the single CURRENT baseline:

- GitHub: `main`
- Cloud Run: `aione-backend-current`
- Cloud SQL: `aione-pg-dev` / database `aione` / user `aione_app`
- Secret Manager: `aione-db-password-dev`
- Artifact Registry: `aione/aione-backend`
- canonical selection import job: `aione-selection-import-current`

No old service, old database, parallel asset service or rollback runtime may be introduced.

## 3. Existing evidence that must be reused

The existing 1688 selection import already recognizes ZIP evidence and stores `metadata.sourceMaterialZip` on ProductOpportunity. That evidence remains the upstream reconciliation anchor for V1.

The importer's source identity remains:

`(source_platform = 1688, source_ref = numeric 1688 product id)`

The ZIP filename parser already accepts verified filename variants where the numeric source ID is followed by space, underscore or hyphen.

V1 must extend from this evidence rather than re-scan Drive independently using a different matching algorithm.

## 4. Architecture placement

Implementation belongs in the existing backend layers:

`Route / Job entry -> Application Service -> Domain/Repository logic -> Cloud SQL + Drive/GCS adapters`

Rules:

- Drive access remains through the existing Google Drive adapter/client boundary.
- Asset persistence logic must live outside route handlers.
- ZIP parsing/indexing is application/integration logic, not frontend logic.
- Product conversion must reuse the existing ProductOpportunity -> Product lifecycle service and relation truth.
- AI calls are not permitted directly from the importer; later AI work must go through the shared AI service/gateway.

## 5. V1 physical persistence strategy

### 5.1 Cloud SQL

Introduce only the minimum normalized persistence required to avoid storing asset state inside unstructured ProductOpportunity metadata forever.

Recommended physical model:

#### `source_material_packages`

Minimum columns:

- `id`
- `source_type`
- `source_file_id`
- `source_file_name`
- `source_file_hash` nullable
- `product_opportunity_id`
- `source_platform`
- `source_ref`
- `status`
- `extracted_count`
- `error_data` jsonb
- `metadata` jsonb
- `created_at`
- `updated_at`

Constraints:

- FK to ProductOpportunity.
- unique source evidence identity, preferably `source_type + source_file_id`.
- secondary uniqueness/guard on immutable hash where available.

#### `assets`

If the existing CURRENT schema already has a canonical `assets` table, extend/reuse it instead of creating another asset table. Do not create `source_assets` if it would duplicate an existing canonical asset object.

Minimum required capabilities for the canonical asset object:

- stable `id`
- asset layer: SOURCE / DERIVED / PUBLISHED
- media type
- original filename
- storage provider/location
- content hash nullable
- width/height nullable
- source folder role
- normalized asset role
- review status
- metadata jsonb
- timestamps

#### `asset_relations`

If the existing CURRENT schema already has a generic object-to-asset relation table, reuse it. Otherwise introduce one generic relation model instead of product-specific join tables.

Minimum relation dimensions:

- asset_id
- object_type
- object_id
- relation_role
- sequence_no
- metadata

This allows the same SOURCE asset to relate first to ProductOpportunity and later to Product without binary duplication.

### 5.2 Google Drive

Drive remains the flat employee inbox and raw evidence source.

V1 behavior:

- no employee manual unzip;
- no required rename;
- no employee/date/product folder convention;
- canonical import reads direct children of the locked inbox;
- ZIP evidence is reconciled through the existing source product identity.

### 5.3 Google Cloud Storage

GCS is the target formal operational media store.

V1 must not invent a second bucket if a canonical AIONE asset bucket already exists. Technical implementation must first resolve the CURRENT configured bucket from Repo/runtime configuration.

Object key design should be deterministic and non-business-fragile, for example conceptually:

`source/1688/{sourceRef}/{packageId}/{assetId-or-hash}/{originalName}`

The exact prefix is implementation detail and must be fixed once against the existing bucket/configuration.

Do not encode employee names, mutable product titles, selection status or page names into the authoritative object identity.

## 6. Package ingestion algorithm

For each reconciled ProductOpportunity with `metadata.sourceMaterialZip` evidence:

1. Resolve the exact Drive file by immutable Drive file ID from the evidence.
2. Create/reuse `SourceMaterialPackage` idempotently.
3. Download the ZIP server-side in the canonical import/job runtime.
4. Stream or temporarily extract in ephemeral runtime storage only.
5. Reject unsafe archive paths (`../`, absolute paths, invalid traversal).
6. Walk only supported media files.
7. Normalize source folder role from the verified 1688 folders:
   - 主图
   - sku图片
   - 详情
   - 视频
8. Compute metadata/hash where practical.
9. Persist/reuse canonical Asset records.
10. Upload operational copies to the canonical GCS asset location when not already present.
11. Create ProductOpportunity -> Asset relations.
12. Set package counts/status.
13. Emit auditable batch/result evidence.
14. Delete ephemeral extraction files.

One bad file should not silently erase the package. Package status/error_data must show partial failure.

## 7. Idempotency contract

Idempotency is mandatory at four levels:

### Drive/package

Same Drive file evidence must reuse the same package.

### Archive member

Repeated processing of the same immutable archive member must not create duplicate SOURCE assets.

Preferred identity order:

1. content hash + package identity;
2. package identity + normalized archive member path when hash unavailable.

### Object relation

The same ProductOpportunity/Asset/relation_role combination must be reusable rather than duplicated on every run.

### Product continuity

When ProductOpportunity converts to Product, the same SOURCE asset IDs are related to Product. No GCS copy is created merely because lifecycle changed.

## 8. Security and safety

ZIP processing must guard against:

- path traversal;
- decompression bombs / unreasonable entry count or expanded size;
- unsupported executable files;
- malformed archives;
- oversized individual files;
- MIME/extension mismatch where practical.

The V1 implementation should set explicit operational limits in configuration, not inline magic values scattered across functions.

Drive and GCS credentials remain server-side. Browser/frontend must never receive arbitrary Drive credentials or unrestricted raw bucket access.

## 9. Normalized asset roles V1

Deterministic initial mapping:

- `主图` -> `main_candidate`
- `sku图片` -> `sku_candidate`
- `详情` -> `detail_candidate`
- `视频` -> `video_source`
- unmatched supported media -> `other_source`

This is candidate classification only. It does not mean every `主图` image is publish-ready main image.

## 10. Review/readiness service

Introduce an application service that can compute asset readiness for an object without frontend-specific logic.

Conceptual output:

```json
{
  "objectType": "ProductOpportunity",
  "objectId": "...",
  "counts": {
    "mainCandidate": 0,
    "skuCandidate": 0,
    "detailCandidate": 0,
    "videoSource": 0
  },
  "blocking": [],
  "warnings": [],
  "readyForPublishPack": false
}
```

V1 readiness should be intentionally minimal and based on the later channel publication contract. Until the Rakuten minimum slot contract is formally frozen, readiness may remain `source_assets_indexed` rather than claiming `rakuten_publish_ready`.

## 11. API contract direction

Do not expose raw storage paths as the primary frontend contract.

Recommended API capabilities after persistence is proven:

- list assets for a ProductOpportunity/Product;
- read one asset metadata record;
- authenticated asset preview/download through AIONE boundary;
- update normalized role/review status with permission/audit;
- read readiness result.

Exact route names are deferred to API Contract review to avoid page-driven API growth.

## 12. Execution design

Reuse the canonical `aione-selection-import-current` runtime for the first ingestion extension unless runtime evidence proves a separate job is required for scale or timeout reasons.

Reason:

- same source evidence;
- same ProductOpportunity identity;
- avoids a second polling baseline;
- preserves one operational chain.

If ZIP extraction materially increases runtime beyond safe import limits, the next design should use a queued deterministic job on the same platform baseline, not an independent legacy-style service.

## 13. Migration strategy

Migration must be additive and safe:

1. inspect existing canonical asset tables/relations;
2. reuse/extend where possible;
3. create only missing package/relation structures;
4. backfill from existing `metadata.sourceMaterialZip` for the three verified real 1688 records;
5. run read-only audit before write migration;
6. apply migration through CURRENT controlled migration process;
7. run real-data acceptance;
8. only after acceptance treat structured asset tables as CURRENT source of truth.

Do not delete `metadata.sourceMaterialZip` during V1. Keep it as upstream evidence until structured backfill has been proven and a later deprecation migration is approved.

## 14. Real-data acceptance V1

Acceptance must use the already verified 1688 source refs, including:

- `1055540915024`
- `582318159544`
- `855305580969`

At minimum, acceptance must prove for each available ZIP:

- exactly one canonical package per Drive evidence file;
- package sourceRef matches ProductOpportunity sourceRef;
- archive indexed successfully or reports explicit partial error;
- at least one supported asset exists when archive contains supported media;
- each asset has package provenance;
- ProductOpportunity relation exists;
- rerun creates no duplicate package/assets/relations.

For a source already converted to Product, acceptance should additionally prove Product relations reuse the same SOURCE asset IDs.

No status reset, fake Product, fake asset or manual DB patch is permitted for acceptance.

## 15. Observability

Every package run should expose:

- package ID
- sourceRef
- Drive file ID
- archive entry count
- supported asset count
- created/reused asset count
- created/reused relation count
- upload count
- skipped count
- error count
- final package status
- correlation/execution ID

Acceptance runner must print authoritative summary evidence and stop on blocking mismatch.

## 16. CI and guardrails

Before merge, backend checks should cover:

- archive path sanitizer unit tests;
- filename/folder-role normalizer tests;
- idempotency tests;
- duplicate relation tests;
- package status transition tests;
- source-to-Product continuity tests where feasible;
- migration audit/check.

Future guardrail opportunity after V1 is stable:

- fail CI if a second canonical source asset table/model is introduced;
- fail CI if page/frontend code accesses Drive/GCS directly for product assets;
- fail CI if new product conversion code copies SOURCE asset binaries.

## 17. Implementation slices

Implement in this order:

1. schema/repository audit and final physical naming confirmation;
2. migration for missing package/asset relation structures;
3. archive safety + extraction/indexing service;
4. canonical import integration;
5. GCS persistence through existing configuration;
6. ProductOpportunity asset relation;
7. Product continuity relation during/after conversion;
8. readiness service;
9. real-data acceptance runner;
10. only then frontend asset view.

This preserves the project rule:

`Product Freeze -> Technical Design -> Branch -> automated checks -> Preview/acceptance -> Review -> Merge main`.

## 18. Out of scope for this V1 implementation

- AI image generation;
- prompt orchestration UI;
- category-specific detail page templates;
- autonomous publication;
- marketplace image optimization loops;
- automated A/B testing;
- full DAM search UX;
- duplicate visual similarity detection beyond deterministic evidence/hash.

These belong to later phases defined in the AI product design roadmap.

## 19. Definition of done

Technical Design V1 is implemented when the CURRENT backend can take the real verified 1688 ZIP evidence already associated with ProductOpportunity, automatically index its source media into the one canonical asset model, preserve provenance and idempotency, reuse those assets after Product conversion, and produce a machine-readable readiness result, all on the single CURRENT runtime/database baseline.
