# AIONE Product Asset Pipeline Product Freeze V1.0

Status: CURRENT PRODUCT FREEZE

Project: 美和AIONE一体化工作平台
Daily name: AIONE
Effective date: 2026-09-10

## 1. Purpose

This document freezes the CURRENT product definition for the first AIONE product-image material loop.

The long-term target is AI-automated product-image production, but the CURRENT implementation scope is intentionally smaller: first make the real 1688 ZIP material chain reliable, structured, reviewable, reusable, and publishable.

The CURRENT goal is not to build a complete AI design studio. The goal is to establish the asset objects and lifecycle that later AI design will consume without creating a second material system.

## 2. Product Truth

### 2.1 Long-term direction

AIONE product-image capability should ultimately support:

`Source product -> source assets -> structured asset understanding -> design task -> AI generation/transformation -> human review where required -> publish asset pack -> channel publication`

AI is a horizontal platform capability. Individual product pages must not implement their own independent image-generation logic.

### 2.2 CURRENT V1 business loop

The CURRENT V1 loop is:

`1688 product -> Excel + ZIP -> Drive inbox -> import -> ProductOpportunity -> source material package -> source assets -> minimal human selection/review -> publish asset pack readiness`

V1 proves that source materials can enter AIONE, become structured objects, remain traceable to the source product, and be prepared for later publication.

### 2.3 What V1 is not

V1 does not require:

- full automatic AI detail-page generation;
- full automatic model-image generation;
- category-specific final art direction for every category;
- channel-complete image automation for every marketplace;
- autonomous publication without a publication-readiness gate;
- a second asset database or page-level image store.

## 3. Object Model

The following logical objects are the frozen target model. Physical tables may be introduced incrementally; implementation must not create competing concepts with different names for the same responsibility.

### 3.1 ProductOpportunity

Existing upstream selection object.

Responsibilities:

- retain 1688 source identity;
- retain title, price, source group, tags, weight and source metadata;
- link imported source-material evidence;
- convert to Product only after selection lifecycle allows it.

ProductOpportunity is not Product.

### 3.2 SourceMaterialPackage

Logical object representing one imported source-material package, initially an official 1688 helper ZIP.

Minimum target fields:

- id;
- source_type (`1688_zip` in V1);
- source_file_id;
- source_file_name;
- source_file_hash when available;
- product_opportunity_id;
- imported_at;
- extracted_count;
- lifecycle_status;
- error_data;
- source_system.

Recommended lifecycle:

`received -> extracted -> indexed -> linked -> ready`

Error is an orthogonal execution state and must retain diagnostic evidence.

The ZIP is transport/evidence, not the final media store.

### 3.3 SourceAsset

Logical object representing an original source media item extracted or referenced from the material package.

Minimum target fields:

- id;
- package_id;
- product_opportunity_id and, after conversion, relation to Product;
- media_type;
- original_file_name;
- storage_location;
- content_hash when available;
- width/height when available;
- sequence_no;
- source_folder_role;
- asset_role;
- review_status;
- source_system;
- created_at / updated_at.

Initial source folder roles from verified 1688 ZIPs:

- `主图` -> main-source candidates;
- `sku图片` -> SKU/variation-source candidates;
- `详情` -> detail-source candidates;
- `视频` -> source video.

The folder name is source evidence, not automatically the final publishing role.

### 3.4 DesignTemplate

Future shared template object. V1 may defer persistence, but no category page may hard-code a private template system that conflicts with this model.

Minimum target properties:

- template_id;
- category_scope;
- channel_scope;
- output_type;
- canvas_spec;
- layout_version;
- status;
- instructions/schema reference.

### 3.5 DesignTask

Shared task object for deterministic and AI-assisted asset operations.

Target task types include:

- extract;
- classify;
- validate;
- transform;
- compose;
- generate;
- regenerate;
- build_publish_pack.

Minimum target fields:

- task_id;
- target_object_type;
- target_object_id;
- task_type;
- input_asset_refs;
- template_id when applicable;
- prompt_or_rule_version when applicable;
- execution_mode (`rule`, `automation`, `ai`, `human`, `mixed`);
- status;
- result_data;
- trace/correlation reference;
- created_at / started_at / completed_at.

V1 can use deterministic operations without invoking AI. The object model must still permit later AI execution through the shared AI service/gateway.

### 3.6 OutputAsset

Derived or generated asset produced from source assets and/or design tasks.

Target fields include:

- output_asset_id;
- source_task_id;
- target_object_id;
- output_type;
- storage_location;
- version;
- derivation/source refs;
- review_status;
- is_final;
- created_at.

SourceAsset must not be overwritten by AI-generated or transformed output. Provenance must remain visible.

### 3.7 PublishAssetPack

Logical object representing the complete image/media payload required for a specific channel/store publication attempt.

Target fields include:

- pack_id;
- product_id or ProductOpportunity during pre-product preparation;
- target_channel;
- target_store;
- required_slots;
- assigned_asset_refs;
- completeness_status;
- validation_result;
- ready_for_publish;
- version.

Publishing consumes a PublishAssetPack; it should not discover arbitrary files directly from Drive at publish time.

## 4. Asset Layers

AIONE uses one asset lineage with three semantic layers:

### SOURCE

Original supplier/source material. Keep traceability and do not silently modify the original.

### DERIVED

Crops, cleaning, background normalization, AI-generated scenes, composed cards, resized variants and other generated outputs.

### PUBLISHED

Exact artifacts sent to a marketplace/store publication version.

These are layers of one asset platform, not three separate asset systems.

## 5. Storage Responsibilities

### Google Drive

Role: employee submission inbox, raw transport/evidence and enterprise-file collaboration boundary.

V1 rule: employees place the Excel and ZIP directly in the locked flat inbox. No manual rename, unzip, date folder, employee folder or product folder is required.

### Google Cloud Storage

Role: formal object storage for operational source and derived media where AIONE needs stable machine access, lifecycle control and scalable serving.

The exact bucket/path contract is Implementation Truth and must be defined in technical design before new persistence is introduced. This Product Freeze does not invent a bucket name.

### Cloud SQL

Role: object identities, metadata, relations, lifecycle, provenance, task state, review state and publication readiness.

Cloud SQL must not store large image binaries as the normal asset mechanism.

### Repo

Role: schemas, contracts, processing rules, templates-as-code where appropriate, migration definitions, tests, guardrails and CURRENT architecture documentation.

Repo must not become a media library.

## 6. V1 Required Behaviors

The first implementation slice must be able to prove:

1. a verified 1688 ZIP is linked to exactly the intended source product identity;
2. package processing is idempotent;
3. contained files can be indexed without employee manual unzip;
4. source folder roles are captured;
5. source assets remain traceable to package and ProductOpportunity;
6. conversion to Product does not duplicate originals;
7. asset selection/review can identify the minimal publish candidates;
8. the system can compute whether a minimal publish asset pack is complete;
9. errors are observable and do not silently discard source evidence;
10. repeated runs do not create duplicate source assets for the same immutable source evidence.

## 7. V1 Minimal Asset Roles

The minimal normalized roles are:

- `main_candidate`;
- `sku_candidate`;
- `detail_candidate`;
- `video_source`;
- `other_source`.

Later roles may include white-background, size, material detail, scene, model, benefit, gift, packaging, compliance and channel-specific outputs.

Do not expand roles until real business evidence requires them.

## 8. Human and AI Responsibility

CURRENT V1:

- deterministic ZIP parsing/indexing -> automation;
- source identity matching -> deterministic rules;
- duplicate detection -> deterministic rules;
- obvious folder-role classification -> deterministic rules;
- ambiguous visual suitability -> human review initially;
- final publication responsibility -> human/business owner until publication automation is separately frozen.

Future:

- AI may classify images, score suitability, identify missing image types, compose/generate derived images, and propose final packs;
- deterministic validations remain deterministic;
- high-risk or evidence-sensitive claims must not be invented from images.

## 9. ProductOpportunity to Product Asset Continuity

When a selected ProductOpportunity converts to Product:

- originals remain the same asset identities;
- Product gains relations to the existing source assets;
- no duplicate copy is created merely because lifecycle changed;
- derived Product assets may then be created separately;
- ProductOpportunity remains the upstream provenance object.

This is a locked architectural rule.

## 10. Publication Readiness

V1 readiness is a data/result state, not a visual feeling.

A publish asset pack is `ready` only when the channel-required minimum slots are satisfied and validation contains no blocking error.

The exact Rakuten slot contract belongs to the publishing Product Freeze/API contract and is not defined by this document.

## 11. Acceptance Criteria

V1 Product Freeze is implemented only when a real source product can demonstrate:

`ZIP evidence -> package -> indexed assets -> normalized roles -> ProductOpportunity relation -> Product relation after conversion -> publish-pack readiness result`

with idempotency, provenance and observable errors.

Mock-only success does not satisfy acceptance.

## 12. Governance

CURRENT:

- one asset model;
- one ProductOpportunity/Product provenance chain;
- Drive as submission/evidence boundary;
- operational media prepared for formal object storage;
- Cloud SQL for asset metadata and relations;
- AI automation as the long-term direction but not a V1 completion condition.

Forbidden:

- manual employee ZIP extraction as a required business step;
- per-page private asset stores;
- duplicating originals during Product conversion;
- treating supplier ZIP folder names as guaranteed final marketplace roles;
- storing AI outputs without source/task provenance;
- bypassing publish readiness by scanning random Drive folders.

Any future change that creates a second competing asset object model requires explicit architecture review and migration/deprecation plan.
