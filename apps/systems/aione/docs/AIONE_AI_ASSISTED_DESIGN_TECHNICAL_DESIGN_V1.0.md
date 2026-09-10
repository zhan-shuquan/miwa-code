# AIONE AI Assisted Design Technical Design V1.0

Status: **PROPOSED CURRENT / TECHNICAL DESIGN**  
Project: **美和AIONE一体化工作平台**  
Daily name: **AIONE**  
Effective date: **2026-09-10**

## 1. Purpose

This Technical Design implements the Product Freeze in `AIONE_AI_ASSISTED_DESIGN_PRODUCT_FREEZE_V1.0.md` without creating a second asset system, a page-specific AI integration, or a second Rakuten publication path.

The first engineering slice is deliberately narrow: one real socks Product, one reusable design template, one traceable design task, one DERIVED output, explicit human review, then reuse of the existing Rakuten PublishAssetPack and canonical GCS -> Rakuten publication path.

## 2. Current Schema Reuse Audit

### 2.1 Reuse directly

#### `public.product_assets`

Already provides the canonical product asset identity and is the correct persistence surface for both SOURCE and DERIVED image assets.

Reuse:

- `id`
- `product_id`
- `asset_type`
- `asset_role`
- `canonical_name`
- `mime_type`
- `lifecycle_status`
- `metadata`
- audit/version fields

Do **not** create `output_assets` as a parallel media table.

DERIVED semantics should be represented by stable metadata and role conventions until a proven query/performance need justifies additional typed columns.

Required DERIVED metadata keys:

- `assetLayer: "DERIVED"`
- `designTaskId`
- `designTemplateId`
- `designTemplateVersion`
- `sourceAssetIds`
- `operationType`
- `executionId` optional
- `provider` optional
- `model` optional
- `promptVersion` optional
- `validation`
- `review`

#### `public.ai_executions`

Already exists as the shared AI execution ledger and must be reused for model execution instead of creating a design-specific AI call log.

Reuse for:

- provider/model
- requested human actor
- execution status
- start/end timestamps
- token/cost fields
- result summary
- execution metadata

Design-specific trace is linked from DesignTask to `ai_executions.id`.

#### `public.business_events`

Reuse for immutable business/audit events across proposal, approval, execution, output creation, review and pack proposal.

#### `public.channel_asset_mappings` + `public.channel_asset_containers`

Reuse unchanged for Rakuten publication evidence. Assisted Design must not create channel-specific copies of DERIVED assets before publication.

### 2.2 Reuse conceptually but do not overload

#### Work items / assignments

A DesignTask is a technical/business execution object with immutable input snapshots, template identity and generation provenance. It should not be forced into generic `work_items` merely to avoid a table, because doing so would mix operational work management with design execution contract/state.

DesignTask may later link to a Work Item, but V1 should not require this coupling.

#### AI office / AI talent

Existing `ai_offices` and `ai_talents` may provide responsibility/routing context. They do not replace DesignTemplate or DesignTask.

### 2.3 Missing concepts that justify minimal new persistence

Two concepts are not represented by CURRENT schema strongly enough to preserve contract, versioning and traceability:

1. `design_templates`
2. `design_tasks`

These are the only new core tables proposed for the first slice.

## 3. Proposed Persistence

### 3.1 `design_templates`

Purpose: immutable/versioned reusable design contract.

Proposed fields:

- `id TEXT PRIMARY KEY`
- `template_code TEXT NOT NULL`
- `name TEXT NOT NULL`
- `version TEXT NOT NULL`
- `output_type TEXT NOT NULL`
- `category_scope TEXT`
- `channel_scope TEXT`
- `store_scope TEXT`
- `canvas_width INTEGER NOT NULL`
- `canvas_height INTEGER NOT NULL`
- `layout_spec JSONB NOT NULL DEFAULT '{}'`
- `required_source_roles JSONB NOT NULL DEFAULT '[]'`
- `required_product_facts JSONB NOT NULL DEFAULT '[]'`
- `allowed_operations JSONB NOT NULL DEFAULT '[]'`
- `validation_rules JSONB NOT NULL DEFAULT '{}'`
- `prompt_template_ref TEXT`
- `lifecycle_status TEXT NOT NULL`
- `metadata JSONB NOT NULL DEFAULT '{}'`
- standard created/updated/person/source/archive fields

Uniqueness:

`UNIQUE(template_code, version)`

A published template version is immutable. A change creates a new version rather than mutating historical execution meaning.

### 3.2 `design_tasks`

Purpose: freeze one design execution contract against one Product and one template version.

Proposed fields:

- `id TEXT PRIMARY KEY`
- `product_id TEXT NOT NULL REFERENCES products(id)`
- `template_id TEXT NOT NULL REFERENCES design_templates(id)`
- `task_type TEXT NOT NULL`
- `task_status TEXT NOT NULL`
- `input_asset_ids JSONB NOT NULL`
- `input_fact_snapshot JSONB NOT NULL`
- `instruction_snapshot JSONB NOT NULL`
- `ai_execution_id TEXT REFERENCES ai_executions(id)` optional
- `approved_by_person_id TEXT`
- `approved_at TIMESTAMPTZ`
- `started_at TIMESTAMPTZ`
- `completed_at TIMESTAMPTZ`
- `failure_code TEXT`
- `failure_detail JSONB`
- `review_status TEXT`
- `reviewed_by_person_id TEXT`
- `reviewed_at TIMESTAMPTZ`
- `review_detail JSONB`
- `metadata JSONB NOT NULL DEFAULT '{}'`
- standard created/updated/person/source/archive/version fields

Task state machine:

`draft -> proposed -> approved -> running -> completed`

Terminal/error:

`rejected`, `failed`, `cancelled`

Review state is separate from execution state:

`pending`, `approved`, `rejected`, `regenerate_requested`

This separation prevents a technically completed generation from being mistaken for business approval.

## 4. Service Architecture

Layering:

`Route -> Application/Service -> Repository -> ProductAsset/GCS/AI Gateway -> Database`

New services:

- `design-template-service.js`
- `design-task-service.js`
- `design-output-service.js`
- `design-review-service.js`

Do not put business state transitions in routes.

## 5. AI Gateway Integration

The first AI design execution must reuse the existing shared AI infrastructure and `ai_executions` ledger.

Required flow:

1. DesignTask enters `approved`.
2. Design service builds a frozen request from task snapshots.
3. Shared AI Gateway/provider adapter executes.
4. `ai_executions` records provider/model/status/cost/trace.
5. Generated bytes are stored in the existing canonical GCS bucket.
6. A new `product_assets` row is created with `assetLayer=DERIVED` and provenance metadata.
7. DesignTask moves to `completed`.
8. Output remains review-pending until explicit human review.

No frontend component may call a model provider directly.

## 6. GCS Contract

Reuse the existing product asset bucket.

Recommended object namespace:

`derived/{productId}/{designTaskId}/{outputVersion}/{canonicalName}`

This is a storage path convention only. ProductAsset remains the authoritative business identity.

Rules:

- SOURCE bytes never overwritten.
- Each regeneration creates a new GCS object and new ProductAsset identity.
- Object path must be deterministic from task/output identity, not from mutable display text.
- Hash/size/mime/dimensions should be recorded in ProductAsset metadata.

## 7. First Deterministic Task

Before introducing image generation, implement one deterministic transform task to validate the object/state/provenance pipeline.

Recommended first task:

`normalize_canvas`

Input:

- one canonical SOURCE image
- target width/height from DesignTemplate

Output:

- one DERIVED image
- deterministic resize/canvas placement only
- no semantic product modification

Purpose:

Prove DesignTemplate -> DesignTask -> execution -> DERIVED ProductAsset -> review with low model risk.

## 8. First AI Task

After deterministic closure passes, first controlled AI task:

`benefit_feature_image`

Why first:

- lower product-fidelity risk than full model-wearing generation;
- highly repetitive current manual work;
- can combine canonical product image + verified product facts + template layout;
- useful for the current Rakuten socks detail-page workflow.

Model-wearing generation remains the next slice, not the first.

## 9. API Contract V1

### Templates

- `GET /api/v1/design/templates`
- `GET /api/v1/design/templates/:id`

Template creation/version management is initially admin/system controlled and does not require a public page-level CRUD surface.

### Tasks

- `POST /api/v1/products/:productId/design/tasks`
- `GET /api/v1/products/:productId/design/tasks`
- `GET /api/v1/design/tasks/:taskId`
- `POST /api/v1/design/tasks/:taskId/propose`
- `POST /api/v1/design/tasks/:taskId/approve`
- `POST /api/v1/design/tasks/:taskId/execute`
- `POST /api/v1/design/tasks/:taskId/review`

### Output / pack proposal

- `GET /api/v1/design/tasks/:taskId/outputs`
- `POST /api/v1/products/:productId/design/rakuten-pack-proposal`

The pack proposal must reuse existing Rakuten pack logic and return a proposal; it must not publish directly.

## 10. Idempotency

Create-task idempotency key:

`design-task:{productId}:{templateId}:{inputSnapshotHash}:{instructionHash}`

Execution idempotency:

- executing an already completed task returns the existing output identities;
- failed execution may be retried against the same task only when retry semantics are safe;
- regeneration after human request creates a new child/revision task or execution version, never overwriting prior output evidence.

## 11. Product Fact Snapshot

The task must store an immutable input fact snapshot at proposal/approval time.

Reason:

Product facts may change later. The system must be able to explain exactly what facts the generated output was based on.

The snapshot should contain only fields required by the selected template/output type, not a raw dump of the entire Product object.

## 12. Validation

Deterministic blocker checks before execution:

- Product exists and is active.
- Template version is active.
- Required Product facts are present.
- Required SOURCE asset IDs exist and belong to the Product.
- Required GCS bytes exist.
- Human approval exists where required.

Before output review:

- output GCS bytes exist;
- ProductAsset DERIVED provenance complete;
- format and dimensions match template;
- execution trace present for AI tasks;
- prohibited/unverified claim validation passed.

Before pack proposal:

- review status approved;
- channel validation passed;
- existing canonical publication prerequisites satisfied.

## 13. Permissions

Do not invent page-local roles.

Service-level permissions should resolve through the existing AIONE actor/authorization model.

Distinct actions to protect:

- propose design
- approve execution
- execute design
- review output
- propose publication pack
- publish via existing Rakuten permission

The same person may hold multiple permissions, but the events remain distinct.

## 14. Audit Events

Use `business_events` with event types:

- `product.design_task_created`
- `product.design_task_proposed`
- `product.design_task_approved`
- `product.design_execution_started`
- `product.design_execution_completed`
- `product.design_execution_failed`
- `product.derived_asset_created`
- `product.design_output_approved`
- `product.design_output_rejected`
- `product.design_regeneration_requested`
- `product.rakuten_pack_proposed`

## 15. Migration Strategy

Proposed next migration: `0093_ai_assisted_design_v1.sql`.

Migration must be additive only:

- add `design_templates`;
- add `design_tasks`;
- add indexes/check constraints;
- no rewrite of Product/ProductAsset tables;
- no second output asset table;
- no Rakuten schema fork.

The controlled DB preflight must pass before merge.

## 16. Initial Seed Template

Create exactly one initial socks/Rakuten template only after Technical Design approval.

Suggested identity:

- template code: `SOCKS-RAKUTEN-BENEFIT-1000X1500`
- version: `1.0`
- output type: `benefit_feature_image`
- canvas: `1000 x 1500`
- category scope: socks
- channel scope: Rakuten

The exact visual layout/prompt content must come from an approved repeated design pattern, not be invented in the migration.

## 17. First Acceptance Sequence

Engineering acceptance order:

1. schema migration + controlled DB preflight;
2. one DesignTemplate persisted;
3. one real Product task created from canonical SOURCE assets;
4. human approval evidence recorded;
5. deterministic `normalize_canvas` output created as DERIVED ProductAsset;
6. provenance validated;
7. human review recorded;
8. approved output appears in Rakuten pack proposal;
9. existing canonical Rakuten publication path remains unchanged;
10. idempotent rerun proves no duplicate task/output corruption.

Only after this passes should the first real AI image-generation task be enabled.

## 18. Governance Decision

CURRENT technical direction:

- reuse ProductAsset for all SOURCE/DERIVED/PUBLISHED asset identity;
- reuse ai_executions for model execution trace;
- reuse business_events for audit;
- add only DesignTemplate and DesignTask persistence;
- validate deterministic pipeline before AI generation;
- keep human approval explicit;
- keep Rakuten publication on the already-proven canonical path.

This design intentionally minimizes new schema while preserving the two pieces of business truth that cannot safely live only in JSON metadata: reusable template versions and traceable design-task state.
