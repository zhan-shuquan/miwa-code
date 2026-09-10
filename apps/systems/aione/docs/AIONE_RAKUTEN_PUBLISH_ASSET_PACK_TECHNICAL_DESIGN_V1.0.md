# AIONE Rakuten PublishAssetPack Technical Design V1.0

Status: CURRENT TECHNICAL DESIGN

Project: 美和AIONE一体化工作平台
Daily name: AIONE
Effective date: 2026-09-10

## 1. Purpose

This document defines how AIONE implements the CURRENT Rakuten PublishAssetPack Product Freeze V1 using the existing canonical ProductAsset platform and existing Rakuten channel mapping capability.

The design must preserve the single CURRENT baseline and must not introduce a second media pipeline, second publication service, second database, second bucket, or page-specific asset model.

## 2. Current Implementation Truth

CURRENT main already contains:

- `public.product_assets` as the canonical Product asset table;
- Product Asset Intake V1, which formalizes real 1688 ZIP assets into canonical GCS SOURCE objects and ProductAsset rows;
- Product Asset Readiness V1;
- `public.channel_asset_containers`;
- `public.channel_asset_mappings`;
- Rakuten Cabinet API integration;
- Rakuten container/folder allocation;
- Rakuten Cabinet publish routes;
- Product / ProductOpportunity source provenance.

The current Rakuten publish implementation can still rely on `asset.source_url` and can re-fetch remote 1688 images. This is now misaligned with CURRENT asset truth because Product Asset Intake V1 has already established canonical SOURCE files in GCS.

## 3. Architecture Truth

The target runtime chain is:

`Product -> canonical ProductAssets -> Rakuten pack plan -> pack validation -> channel mappings -> canonical GCS bytes -> R-Cabinet -> provider result -> publication evidence`

The publication path must consume canonical AIONE asset identity and storage location.

External source URLs remain provenance/evidence only. They are not the preferred publication payload source after a canonical GCS object exists.

## 4. Layering

The implementation should use:

`Route -> Application/Service -> Repository/Data Access -> GCS + Rakuten Adapter -> Cloud SQL`

Responsibilities:

### Route

- authenticate actor;
- validate request shape;
- return API response;
- no channel/business orchestration inside route handlers.

### Application Service

- resolve Product and pack context;
- build/validate slot assignments;
- call canonical asset reader;
- resolve channel mappings/destination;
- orchestrate R-Cabinet upload;
- persist publication result;
- emit audit/business events.

### Repository/Data Access

- Product / ProductAsset reads;
- channel container reads;
- channel mapping writes;
- pack metadata/result persistence;
- idempotency lookups.

### GCS Adapter

- fetch canonical ProductAsset bytes from `metadata.gcsBucket` + `metadata.gcsObject`;
- verify object presence/size where needed.

### Rakuten Adapter

- R-Cabinet folder/container operations;
- upload bytes;
- return provider IDs, paths, URLs and provider errors.

## 5. PublishAssetPack Persistence Strategy

V1 does not create a new table by default.

First implementation should represent the pack canonically using the existing channel mapping layer plus structured metadata, because:

- ProductAsset identity already exists;
- channel/store specificity already exists in `channel_asset_mappings`;
- R-Cabinet destination already exists in `channel_asset_containers`;
- adding a second parallel pack table before real need is proven would increase architectural duplication.

V1 logical pack identity:

`product_id + channel=rakuten + shop_ref + pack_version`

Recommended metadata keys on the channel mapping / publication result boundary:

- `packVersion`;
- `slotFamily`;
- `slotOrder`;
- `validationState`;
- `publicationAttemptId`;
- `publishedAssetVersion`;
- `sourceLayer`;
- `gcsBucket` / `gcsObject` snapshot where relevant;
- provider result IDs/URLs.

If later evidence proves that pack-level lifecycle, approvals or multi-asset atomicity cannot be represented cleanly, introduce one canonical `publish_asset_packs` table through a separate migration/ADR. Do not pre-create it now.

## 6. Slot Assignment V1

V1 slot families:

- `main_images`;
- `sku_or_variation_images`;
- `detail_images`;
- `video`.

Suggested deterministic default proposal from SOURCE roles:

- `source_main_image` -> candidate for `main_images`;
- `source_sku_image` -> candidate for `sku_or_variation_images`;
- `source_detail_image` -> candidate for `detail_images`;
- `source_video` -> candidate for `video`;
- `source_other` -> unassigned unless manually/AI reviewed later.

This is a proposal mechanism, not automatic publication truth.

Final pack assignment must be explicit and queryable.

## 7. Readiness V1

A pack is `ready` only when:

- Product exists and is active enough for the publication stage;
- canonical ProductAssets exist;
- `shop_ref` is present;
- at least one asset is assigned to `main_images`;
- every assigned asset exists and is not archived;
- every assigned image media type is supported by the target publication operation;
- duplicate invalid assignments are rejected;
- R-Cabinet destination can be resolved from existing channel container configuration;
- no blocking validation error remains.

Exact numeric limits remain `待验证` until proven from the actual CURRENT Rakuten store/API/template contract.

The readiness service must not invent image-count requirements.

## 8. Canonical Asset Byte Source

For SOURCE ProductAssets created by Product Asset Intake V1, canonical publication bytes must come from:

- `metadata.gcsBucket`;
- `metadata.gcsObject`.

The service must:

1. verify the metadata exists;
2. fetch the GCS object;
3. verify object accessibility;
4. use stored MIME type / object content type;
5. pass bytes to the Rakuten adapter.

Fallback to remote `source_url` is not the normal CURRENT path.

For pre-existing ProductAssets that do not yet have canonical GCS metadata, publication should stop with an explicit alignment error rather than silently reintroduce the old remote-fetch path.

Suggested blocking code:

`canonical_asset_storage_missing`

## 9. R-Cabinet Destination

Reuse existing `channel_asset_containers` as the canonical AIONE representation of Rakuten destination containers.

Reuse existing `channel_asset_mappings` for ProductAsset -> Rakuten store/path/provider identity mapping.

No new `rakuten_assets` table.

Destination resolution:

`shop_ref -> active channel_asset_container -> R-Cabinet folder ID/path -> channel_asset_mapping`

The existing naming rule may continue to use ProductAsset `canonical_name`, subject to channel validation.

## 10. Publication Attempt and Idempotency

Each publish action needs a correlation/publication attempt identity.

Recommended V1 attempt identity:

`rakuten-publish:{productId}:{shopRef}:{packVersion}`

Idempotency behavior:

- if a mapping for the same ProductAsset/store/pack version is already active and provider identity is present, do not create a duplicate mapping;
- retry failed uploads in place with preserved previous error evidence;
- do not duplicate ProductAsset;
- do not duplicate GCS SOURCE objects;
- provider overwrite behavior must be explicit and deterministic;
- publication history must retain attempt timestamps/results.

## 11. SOURCE / DERIVED / PUBLISHED Semantics

`product_assets.lifecycle_status` must not be used to destroy lineage semantics.

A SOURCE asset remains a SOURCE asset even after it has been published.

Therefore the implementation must not treat publication as changing the SOURCE layer into PUBLISHED by overwriting provenance.

The publication state belongs to channel mapping/publication evidence.

Future DERIVED assets will be separate ProductAsset records or canonical derived asset records with lineage metadata, depending on the final canonical model.

## 12. Current Code Alignment Required

The next implementation PR should make the smallest architecture-correct change:

1. add a canonical ProductAsset byte reader for GCS-backed assets;
2. move Rakuten Cabinet publish orchestration out of route-level remote-fetch logic into a service;
3. use ProductAsset GCS metadata as the publication source;
4. keep existing Rakuten container and mapping tables;
5. add deterministic pack-readiness validation;
6. preserve provider result/error evidence;
7. add acceptance coverage using the real Product `MH0000002` / sourceRef `855305580969` after environment readiness permits.

Do not rewrite unrelated Rakuten integration code in the same change.

## 13. API Contract V1

Recommended endpoints under the existing Rakuten integration namespace or Product asset namespace:

### GET pack readiness

`GET /api/v1/product-assets/products/:productId/rakuten-pack?shopRef=...`

Returns:

- product identity;
- target store;
- slot proposal / assignments;
- blocking errors;
- warnings;
- `readyForPublish`;
- destination status.

### POST publish canonical pack

`POST /api/v1/integrations/rakuten/products/:productId/cabinet/publish-canonical`

Request:

- `shopRef`;
- `containerCode` when explicitly selected;
- `packVersion`;
- slot assignments or a canonical assignment reference.

Response:

- attempt identity;
- success/failed counts;
- provider IDs/paths/URLs;
- per-asset result;
- overall publication result.

Existing old routes should not be deleted until the canonical replacement passes real acceptance; once accepted, old remote-source publication paths must be deprecated and removed so only one CURRENT behavior remains.

## 14. Error Model

Blocking errors include:

- `product_not_found`;
- `source_assets_missing`;
- `rakuten_main_image_missing`;
- `shop_ref_missing`;
- `assigned_asset_missing`;
- `assigned_asset_archived`;
- `unsupported_media_type`;
- `duplicate_slot_assignment`;
- `canonical_asset_storage_missing`;
- `canonical_asset_object_missing`;
- `rakuten_container_not_configured`;
- `publish_destination_unresolved`;
- `rakuten_upload_failed`.

Errors must remain observable and should retain provider diagnostic payload where safe.

## 15. Security and Permissions

- Cloud Run remains private;
- Google identity middleware remains required for API access;
- write/publish actions require a resolved write actor;
- runtime service account gets only the existing required GCS/Rakuten-related permissions;
- no public bucket;
- no public unauthenticated publication API;
- no secret values in Repo or logs.

## 16. Acceptance V1

A real acceptance test should eventually prove:

`MH0000002 -> canonical ProductAssets in GCS -> explicit Rakuten pack -> readiness=true -> R-Cabinet destination -> canonical-byte upload -> channel mapping/provider evidence`

Acceptance must additionally prove:

- no Drive scan during publication;
- no remote 1688 re-fetch during canonical publication;
- no duplicate ProductAsset;
- no duplicate channel mapping for the same canonical assignment;
- retry behavior is deterministic;
- errors are observable;
- SOURCE provenance remains unchanged.

Do not run destructive publication against a real store until store target and business authorization are explicitly confirmed.

## 17. Migration and Deprecation Plan

After canonical GCS-backed Rakuten publication passes acceptance:

- mark the old remote `asset.source_url` publication path as deprecated;
- route all new publication through canonical ProductAsset bytes;
- remove or disable the old runtime path after a controlled migration;
- keep only one CURRENT publication implementation.

No long-lived dual-path architecture is allowed.

## 18. Governance Decision

CURRENT implementation direction is:

`ProductAsset(GCS canonical) -> Rakuten PublishAssetPack -> channel mappings -> R-Cabinet`

Not:

`ProductAsset -> re-fetch 1688 -> R-Cabinet`

and not:

`Drive folder -> R-Cabinet`.

This is the implementation baseline for the next branch.
