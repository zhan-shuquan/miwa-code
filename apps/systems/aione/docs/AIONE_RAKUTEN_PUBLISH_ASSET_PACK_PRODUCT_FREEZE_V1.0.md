# AIONE Rakuten PublishAssetPack Product Freeze V1.0

Status: CURRENT PRODUCT FREEZE

Project: 美和AIONE一体化工作平台
Daily name: AIONE
Effective date: 2026-09-10

## 1. Purpose

This document freezes the CURRENT product definition for the first Rakuten image/media publication pack in AIONE.

It sits after the accepted Product Asset Intake Backend Closure V1 and Product Asset Readiness V1.

The goal is not to declare every existing SOURCE image immediately publishable. The goal is to define one stable channel-specific publication object and readiness contract so that later design automation, AI generation, review, R-Cabinet upload, CSV/API publication and store updates all consume the same truth.

## 2. Product Truth

The CURRENT business chain is:

`1688 source -> ProductOpportunity -> Product -> SOURCE ProductAssets -> asset readiness -> Rakuten PublishAssetPack -> R-Cabinet/channel publication`

A Rakuten PublishAssetPack is a channel/store-specific publication payload assembled from the AIONE asset platform.

It is not:

- a new media library;
- a copy of all SOURCE assets;
- an arbitrary Drive folder;
- a page-level image list;
- a replacement for ProductAsset;
- proof that a product is commercially ready to sell merely because images exist.

## 3. Relationship to Existing CURRENT Implementation

CURRENT main already contains:

- canonical `product_assets`;
- SOURCE/DERVIED/PUBLISHED asset lineage direction;
- `channel_asset_containers`;
- `channel_asset_mappings`;
- Rakuten Cabinet API integration;
- Rakuten folder/container allocation;
- source-asset publication routes;
- deterministic Product Asset Readiness V1.

This Product Freeze must evolve those existing capabilities. It must not create a second Rakuten asset subsystem.

## 4. PublishAssetPack Object

`PublishAssetPack` is a logical channel-specific object representing the exact asset assignment intended for one Product, one target channel and one target store.

Minimum logical fields:

- `pack_id`;
- `product_id`;
- `target_channel` = `rakuten`;
- `target_store` / `shop_ref`;
- `version`;
- `lifecycle_status`;
- `slot_assignments`;
- `validation_result`;
- `blocking_errors`;
- `warnings`;
- `ready_for_publish`;
- `created_at`;
- `updated_at`;
- `approved_at` when applicable;
- `published_at` when applicable;
- `source_system`.

Physical persistence may initially reuse existing tables/metadata if that can remain canonical and queryable. A new table is allowed only after schema audit proves the existing model cannot represent the object cleanly.

## 5. Lifecycle

CURRENT target lifecycle:

`draft -> validating -> ready -> publishing -> published`

Failure is an execution/result state and must preserve diagnostic evidence.

A pack that changes after publication creates a new version or a new publication attempt. Published historical evidence must not be silently overwritten.

## 6. Slot Model

Rakuten publication readiness must be slot-based rather than folder-based.

Minimum logical slot families for V1:

- `main_images`;
- `sku_or_variation_images`;
- `detail_images`;
- `video` when the channel/store flow actually uses it.

Each slot assignment must reference canonical AIONE assets by ID.

SOURCE folder roles such as `source_main_image`, `source_sku_image`, `source_detail_image` and `source_video` are candidates/evidence. They do not automatically become final Rakuten slots without validation.

## 7. CURRENT Minimum Readiness Rule

The CURRENT readiness gate is intentionally conservative.

A Rakuten PublishAssetPack may become `ready` only when all of the following are true:

1. the Product exists and is not archived;
2. SOURCE assets are indexed and traceable;
3. at least one image is explicitly assigned to the Rakuten main-image family;
4. every assigned asset exists and is not archived;
5. every assigned image has a supported media type for the target Rakuten operation;
6. duplicate slot assignments are rejected unless the slot contract explicitly allows reuse;
7. required channel/store mapping information exists;
8. validation contains no blocking error;
9. the pack references a concrete `shop_ref`;
10. the exact publication operation can determine the intended R-Cabinet destination without scanning arbitrary Drive files.

This Product Freeze does **not** invent a fixed number of Rakuten main images, SKU images or detail images because that exact count has not yet been proven from the CURRENT real Rakuten listing template/API contract in Repo.

Until that evidence is frozen, exact numeric slot limits are `待验证` and must not be hard-coded as business truth.

## 8. Blocking Errors

V1 blocking conditions include at least:

- `product_not_found`;
- `source_assets_missing`;
- `rakuten_main_image_missing`;
- `assigned_asset_missing`;
- `assigned_asset_archived`;
- `unsupported_media_type`;
- `duplicate_slot_assignment`;
- `shop_ref_missing`;
- `rakuten_container_not_configured`;
- `publish_destination_unresolved`.

A blocking error makes `ready_for_publish = false`.

## 9. Warnings

Warnings do not necessarily block publication but must be visible for review.

Initial warning candidates:

- no SKU/variation image assigned;
- no detail image assigned;
- no video assigned;
- SOURCE asset still classified as `source_other`;
- unusually small asset set;
- asset has no explicit human/AI suitability review yet.

Warnings must not be promoted to blocking rules without real business evidence.

## 10. SOURCE / DERIVED / PUBLISHED Rules

### SOURCE

Original supplier/source evidence. It may be assigned directly only when valid for the target publication role.

### DERIVED

Resized, cropped, background-normalized, composed or AI-generated assets. They must retain provenance to source/task/template/version.

### PUBLISHED

The exact asset/version sent to Rakuten for a specific publication attempt.

Publication must not mutate SOURCE assets into PUBLISHED assets by overwriting their lineage.

## 11. R-Cabinet Responsibility

R-Cabinet is a target channel storage/runtime, not AIONE's source of product truth.

AIONE remains responsible for:

- Product identity;
- canonical asset identity;
- slot assignment;
- readiness;
- destination planning;
- publication result;
- error evidence;
- publication history.

Rakuten/R-Cabinet remains responsible for external file IDs, paths, URLs, folder capacity and provider-side state.

Existing `channel_asset_containers` and `channel_asset_mappings` should be reused as the channel mapping layer.

## 12. Publication Operation

The intended deterministic publication sequence is:

`PublishAssetPack ready -> resolve R-Cabinet destination -> upload assigned assets -> verify provider response -> persist mapping/result -> mark publication attempt -> expose final URLs/IDs to listing publication`

The publication process must not:

- fetch a random current image from 1688 at publish time when a canonical GCS/AIONE asset already exists;
- depend on employee manual file renaming;
- depend on employee manual unzip;
- discover arbitrary Drive folders;
- publish every SOURCE asset merely because it exists;
- silently treat upload success as full product listing success.

## 13. Existing Implementation Alignment Risks

Current Rakuten integration code contains a source-sync path that can re-fetch 1688 image URLs and a Cabinet publish path that can download from `asset.source_url` before uploading.

After Product Asset Intake V1, canonical operational SOURCE files now exist in GCS and are represented by ProductAsset metadata. Therefore the next Technical Design must determine how Rakuten publication consumes canonical AIONE/GCS assets instead of rebuilding source truth from remote 1688 URLs.

This is an architecture-alignment task, not permission to create a parallel pipeline.

## 14. Human and AI Responsibility

CURRENT V1:

- slot completeness -> deterministic rules;
- asset existence/type checks -> deterministic rules;
- R-Cabinet destination/capacity -> deterministic integration logic;
- ambiguous visual suitability -> human review initially;
- final commercial publication responsibility -> human/business owner until later automation Product Freeze.

Future:

- AI can score candidates, propose slot assignments, detect missing image types, generate DERIVED assets and propose pack revisions;
- deterministic publication requirements remain deterministic;
- AI output never bypasses provenance or readiness validation.

## 15. Acceptance Criteria

This Product Freeze is considered implemented only when one real Product can demonstrate:

`canonical ProductAssets -> explicit Rakuten slot assignments -> readiness result -> R-Cabinet destination -> publish attempt/result`

with:

- no arbitrary Drive scan;
- no duplicate media system;
- no source identity loss;
- idempotent/recoverable publication behavior;
- observable errors;
- store-specific mapping;
- historical publication evidence.

A mock-only success does not satisfy acceptance.

## 16. Deferred / 待验证

The following are deliberately not frozen yet:

- exact Rakuten maximum/minimum main-image count;
- exact SKU-image slot count and ordering contract;
- exact detail-image count/size limits;
- whether video is required or optional for the first real store flow;
- exact per-file dimensions/file-size constraints;
- exact listing CSV/API field-to-asset-slot mapping;
- per-store differences among 永井GD, 幸せ屋 and PrimeLife.

These must be derived from a real CURRENT Rakuten template/API response/store configuration and then locked in Technical Design or a later Product Freeze revision.

## 17. Governance

CURRENT:

- one ProductAsset platform;
- one Rakuten PublishAssetPack concept;
- one readiness result;
- existing channel mapping tables reused first;
- R-Cabinet treated as external channel storage;
- exact unproven numeric rules marked `待验证`.

Forbidden:

- page-specific Rakuten image lists that bypass ProductAsset;
- a second `rakuten_assets` media database competing with ProductAsset;
- copying all SOURCE assets merely to create a pack;
- hard-coding unverified Rakuten limits as CURRENT truth;
- re-fetching supplier media as the preferred publication source when canonical AIONE assets already exist;
- considering an R-Cabinet upload equal to a completed product publication.
