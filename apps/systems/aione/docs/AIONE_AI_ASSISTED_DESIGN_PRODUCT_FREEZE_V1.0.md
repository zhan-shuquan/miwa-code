# AIONE AI Assisted Design Product Freeze V1.0

Status: **PROPOSED CURRENT / PRODUCT FREEZE**  
Project: **美和AIONE一体化工作平台**  
Daily name: **AIONE**  
Effective date: **2026-09-10**

## 1. Purpose

This Product Freeze defines the first real Phase V2 Assisted Design workflow after the V1 source-material and Rakuten canonical publication closures passed.

The first workflow is intentionally narrow:

- Business domain: product design for e-commerce listing assets
- First category: socks, starting from the currently proven men's autumn/winter sock workflow
- First channel: Rakuten
- First store for validation: `global-dimensions`
- Source truth: AIONE Product + canonical SOURCE ProductAssets in GCS
- Human model: AI prepares proposals and outputs; human review remains explicit before publication

The goal is not to build a general autonomous design agent. The goal is to reduce repetitive design work in one real, repeatable product workflow while preserving product truth, provenance and publication control.

## 2. Product Truth

### 2.1 What this capability is

AIONE Assisted Design is a product-level work capability that converts canonical product facts and SOURCE assets into versioned design proposals and DERIVED OutputAssets.

It belongs to the shared product/asset platform. It is not a standalone image-generator page and not a second media library.

### 2.2 What this capability is not

V2 does not:

- autonomously publish AI output without approval;
- invent missing product facts;
- replace SOURCE images as evidence;
- create a second Product, ProductAsset or Rakuten asset system;
- let individual pages call image models directly;
- automatically redesign every product category;
- treat a generated image as publish-ready merely because generation succeeded.

## 3. First Real Workflow

The V2 first-loop workflow is:

`Product`
`-> canonical Product facts + SOURCE ProductAssets`
`-> deterministic asset inventory`
`-> AI analysis proposal`
`-> human-confirmed Design Plan`
`-> DesignTasks`
`-> deterministic transforms and/or AI generation`
`-> DERIVED OutputAssets`
`-> validation`
`-> human review`
`-> approved OutputAssets`
`-> Rakuten PublishAssetPack proposal`
`-> existing canonical Rakuten publication path`

Publication continues to use the existing Rakuten publication architecture. Assisted Design does not create another publishing path.

## 4. Core Objects

### 4.1 DesignTemplate

A reusable platform object describing stable design constraints.

Minimum fields:

- `id`
- `template_code`
- `name`
- `version`
- `output_type`
- `category_scope`
- `channel_scope`
- `store_scope` optional
- `canvas_width`
- `canvas_height`
- `layout_spec`
- `required_source_roles`
- `required_product_facts`
- `allowed_operations`
- `validation_rules`
- `prompt_template_ref` optional
- `lifecycle_status`
- `created_at`
- `updated_at`

A DesignTemplate may define layout and rules but may not contain false product-specific facts.

### 4.2 DesignTask

A traceable unit of design work.

Minimum fields:

- `id`
- `product_id`
- `template_id`
- `task_type`
- `task_status`
- `input_asset_ids`
- `input_fact_snapshot`
- `instruction_snapshot`
- `model_provider` optional
- `model_name` optional
- `prompt_version` optional
- `execution_trace_id` optional
- `proposal_by`
- `approved_by_person_id` optional
- `approved_at` optional
- `started_at` optional
- `completed_at` optional
- `failure_code` optional
- `failure_detail` optional
- `created_at`
- `updated_at`

Task statuses:

`draft -> proposed -> approved -> running -> completed`

Orthogonal terminal/error states:

`rejected`, `failed`, `cancelled`

No AI execution is allowed from `draft` or `proposed` when human approval is required by the template/risk rule.

### 4.3 OutputAsset

V2 uses the existing asset platform. `OutputAsset` is a logical DERIVED asset role, not a separate media subsystem.

A generated/transformed output must be stored as a DERIVED ProductAsset or equivalent existing canonical asset record with metadata linking back to its DesignTask.

Required provenance metadata:

- source Product ID
- source ProductAsset IDs
- DesignTask ID
- DesignTemplate ID + version
- operation type
- model/tool identity when AI is used
- prompt/instruction version when AI is used
- generation timestamp
- reviewer/approval evidence
- validation result
- publication mapping when later published

## 5. First Output Types

The first V2 workflow supports only these output families:

1. `benefit_feature_image`
2. `lifestyle_scene_image`
3. `model_wearing_image`
4. `gift_recommendation_image`
5. `secondary_hero_image`

The following remain SOURCE-grounded/deterministic-first and are not AI-redesigned in the first V2 slice:

- SKU/color truth images
- measurement diagrams
- material/detail evidence
- white-background product truth images
- compliance/label evidence

## 6. Input Contract

A DesignTask may use only registered AIONE facts and canonical assets.

### Required product facts

At minimum, depending on output type:

- Product identity / product code
- category
- product title/name
- material facts when known
- size facts when known
- color/variation facts when known
- verified selling points
- prohibited/unverified claims list
- target channel/store

Unknown facts remain unknown. They must not be inferred into authoritative product claims.

### Required asset inputs

Inputs must reference canonical ProductAsset IDs and GCS-backed asset bytes. Remote 1688 URLs and Drive files may remain provenance/evidence but are not normal V2 design byte inputs after canonical intake.

## 7. Operation Model

### 7.1 Deterministic operations

Use deterministic tools first for:

- resize
- crop
- canvas extension
- format conversion
- compression
- background normalization where technically safe
- filename/version generation
- dimension validation
- duplicate detection
- slot completeness

These do not require AI judgment unless the crop/composition itself requires semantic selection.

### 7.2 AI operations

AI may be used for:

- visual classification
- quality/suitability scoring
- image-role suggestions
- scene composition proposals
- model-wearing generation/transformation
- benefit/feature presentation generation
- gift/lifestyle composition
- copy hierarchy suggestions

All AI operations must eventually route through the shared AIONE AI Service / AI Gateway. Direct page-level model integrations are forbidden.

## 8. Human Review Contract

V2 keeps explicit human responsibility.

Human approval is required before a newly generated or transformed DERIVED asset can enter an approved Rakuten PublishAssetPack.

Review outcomes:

- `approve`
- `reject`
- `regenerate`

Review reasons should be structured where possible:

- product mismatch
- color/pattern mismatch
- size/proportion distortion
- unsupported claim
- text error
- layout issue
- channel non-compliance
- brand/style mismatch
- low visual quality
- other

Human review does not require re-entering facts already present in AIONE.

## 9. Product Fidelity Rules

For socks and other wearable products, generated imagery must preserve the product's observable identity, including where applicable:

- color
- pattern
- knit/weave appearance
- approximate length/type
- visible construction details
- set composition

A model-wearing scene is not approved if the generated product materially differs from the canonical SOURCE evidence.

The AI may change scene, model, clothing, background, lighting and composition only within the DesignTemplate's allowed operations.

## 10. Claim Safety Rules

Generated copy or images must not add unverified functional/health/compliance claims.

Examples that require verified evidence before use include antibacterial, deodorizing, medical, therapeutic, certified material or performance claims.

The system must distinguish:

- verified fact
- seller-provided claim
- AI suggestion
- unknown / pending validation

Only verified facts may automatically populate authoritative product specifications.

## 11. Versioning

Every DesignTask execution creates a new immutable output version.

Regeneration never overwrites the prior DERIVED output bytes or provenance record.

Logical states may point to the currently approved version, but historical versions remain auditable.

SOURCE assets are never overwritten by DERIVED assets.

## 12. Validation Gates

Before human approval, every output must pass deterministic checks where applicable:

- product identity present
- source provenance present
- template/version present
- output dimensions valid
- output format valid
- no duplicate output version identity
- required factual fields present
- prohibited/unverified claim check
- task execution completed

Additional AI/vision quality checks may provide advisory scores but do not replace deterministic blockers.

Before Rakuten pack approval:

- human review = approved
- canonical DERIVED bytes exist in GCS
- channel validation passes
- required pack slots are complete

## 13. First UI Scope

V2 does not require a new top-level navigation item.

The product workspace should expose an assisted-design section or action using the shared Object Workspace pattern.

Minimum operator actions:

- view source asset inventory
- see missing requirements
- generate design proposal
- approve/start DesignTasks
- inspect outputs and provenance
- approve/reject/regenerate
- assemble/propose Rakuten PublishAssetPack

The UI must operate on backend objects/contracts; it must not keep a parallel frontend-only design state.

## 14. Permissions

At minimum:

- read Product and asset inventory: existing Product read permission
- create/propose DesignTask: product-design write permission
- approve AI execution: explicit authorized human actor
- approve output for publication: explicit authorized human actor
- publish: existing channel publication permission

Exact role names remain subject to the existing AIONE permission model and must not be invented inside page code.

## 15. Audit and Observability

Record business/audit events for:

- design plan proposed
- DesignTask approved/rejected
- execution started/completed/failed
- OutputAsset created
- output approved/rejected/regenerated
- PublishAssetPack proposed/approved

AI execution records must include model/provider, trace ID, prompt/template version and cost metadata when available.

## 16. Evidence Metrics

V2 must measure real operating evidence rather than claim improvement by assumption.

Metrics:

- manual design time before V2
- total processing time after V2
- human review time
- manual steps removed
- regeneration count
- rejection count/rate
- publish validation failure rate
- post-publication correction count
- approved output reuse rate
- AI/tool cost per product/task

Initial values are **待验证** until real data is collected.

## 17. V2 First Acceptance

The first V2 acceptance must use one real Product and prove:

1. Product + canonical SOURCE assets loaded from CURRENT data.
2. A versioned DesignTemplate is selected.
3. A DesignTask is created with frozen fact and asset inputs.
4. Human approval evidence exists before execution where required.
5. At least one DERIVED OutputAsset is produced.
6. Output provenance links back to Product, SOURCE assets, task and template.
7. Human review result is recorded.
8. Approved output can enter a Rakuten PublishAssetPack proposal.
9. Publication still uses the existing canonical Rakuten path.
10. Re-running the same accepted operation does not duplicate task/output identity incorrectly.

## 18. First Implementation Slice

Implementation order after this freeze:

1. audit existing schema/objects for reusable task/template/asset structures;
2. define minimal persistence only for missing concepts;
3. implement DesignTemplate repository/service;
4. implement DesignTask repository/service and state machine;
5. reuse ProductAsset for DERIVED outputs with provenance metadata;
6. implement deterministic first transform task;
7. add shared AI Gateway integration for one controlled AI output type;
8. add review APIs;
9. generate Rakuten PublishAssetPack proposal from approved outputs;
10. run one real end-to-end acceptance and record metrics.

## 19. Deferred

Not part of this V2 first slice:

- autonomous multi-product batch design without human approval;
- automatic learning from sales/conversion data;
- A/B testing engine;
- automatic category template selection across all categories;
- fully autonomous publishing;
- generalized agent orchestration;
- replacing current Rakuten canonical publication architecture.

## 20. Freeze Decision

The first AIONE Assisted Design V2 workflow is frozen around one principle:

> AI may propose and produce design work, but product truth, canonical asset identity, deterministic validation, human approval and publication evidence remain controlled AIONE platform capabilities.

This Product Freeze becomes the basis for Technical Design. Implementation must not introduce page-specific model calls, a second asset library, or a second Rakuten publication path.
