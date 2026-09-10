# AIONE AI Product Design Roadmap V1.0

Status: CURRENT ROADMAP

Project: 美和AIONE一体化工作平台
Daily name: AIONE
Effective date: 2026-09-10

## 1. Strategic Intent

AIONE product-image capability is expected to evolve toward AI-native, largely automated product-design production while preserving factual source evidence, deterministic rules, human accountability and publish-time validation.

The roadmap starts from the real 1688 -> AIONE business loop. It does not begin from a standalone image-generation feature.

Core principle:

`Run the real business loop first -> establish source truth -> standardize asset objects -> automate deterministic work -> add AI judgment/generation -> collect operational evidence -> expand.`

## 2. Phase Model

### Phase V1 - Source Material Closure

Goal: prove that real source materials can enter AIONE and become structured, reusable and publish-ready inputs.

Capabilities:

- 1688 Excel + ZIP ingestion;
- automatic ZIP indexing without employee unzip;
- source material package identity;
- source asset identity and provenance;
- deterministic folder-role mapping;
- source asset relation to ProductOpportunity and Product;
- minimal review/selection;
- publish asset pack completeness result.

Not required:

- automatic full detail-page design;
- autonomous model-image generation;
- AI art-direction decisions;
- full category template library.

Success evidence:

A real selected product completes the source-material chain with idempotency and traceability.

### Phase V2 - Assisted Design

Goal: reduce manual design work while keeping explicit human approval.

Capabilities:

- AI visual classification and quality scoring;
- missing-image detection;
- suggested image roles;
- deterministic resize/crop/background normalization;
- AI-generated copy-safe scene/model/benefit images where source evidence permits;
- shared DesignTemplate objects;
- DesignTask trace and versioning;
- review queue;
- versioned OutputAssets;
- automatic PublishAssetPack proposal.

Success evidence:

Measure actual employee time before/after, regeneration rate, rejection rate, publish pass rate and design defects.

### Phase V3 - Automatic Standard Design

Goal: standard-category products can produce a complete first-pass image set automatically from structured source material and product rules.

Capabilities:

- category/channel template selection by rule;
- automatic task plan generation;
- AI generation/transformation pipeline;
- product fact grounding from source/product data;
- standardized quality checks;
- automatic pack assembly;
- human exception review rather than image-by-image assembly.

Success evidence:

A meaningful share of standard products can reach publish-ready state with only exception handling.

### Phase V4 - Adaptive AI Design System

Goal: AIONE learns from real marketplace performance and operational evidence to improve product presentation while keeping controlled human responsibility.

Potential capabilities:

- template/result performance analysis;
- controlled A/B variants;
- category/store-specific design recommendations;
- lifecycle refresh recommendations;
- automated regeneration when product facts or channel requirements change;
- AI proposals linked to sales/conversion/search evidence.

This phase requires mature measurement, versioning and rollback at the asset/output level. It must not be introduced before V2/V3 evidence is stable.

## 3. Architecture Principles

### 3.1 One Asset Platform

SOURCE, DERIVED and PUBLISHED assets are semantic layers of one platform. Do not create separate asset systems for selection, product, AI design and publishing.

### 3.2 Deterministic Before AI

Use deterministic technology for:

- source ID matching;
- ZIP parsing;
- hashing/deduplication;
- image dimensions;
- format validation;
- required-slot checks;
- channel-size validation;
- file naming/path generation;
- version uniqueness;
- publish-pack completeness.

Use AI where judgment or generation adds value:

- visual classification;
- quality/suitability assessment;
- scene/style proposals;
- image generation/transformation;
- content hierarchy suggestions;
- exception analysis.

### 3.3 AI Through Shared Gateway

AI image/design calls must eventually use the AIONE shared AI Service / AI Gateway for:

- model routing;
- permissions;
- context;
- prompts/template versions;
- trace;
- cost;
- safety/risk controls;
- proposal/execution separation.

No product page may own its own direct model integration.

### 3.4 Human Accountability

Automation can prepare, classify, generate and propose. Business responsibility remains explicit.

The system should progressively move humans from repetitive production to:

- exception review;
- factual verification;
- commercial judgment;
- brand/category standards;
- final responsibility where required.

### 3.5 Provenance Is Mandatory

Every derived or AI-generated image must be able to answer:

- which product/object is it for;
- what source assets/data were used;
- which task generated it;
- which template/rule/prompt version was used;
- which model/tool executed it when AI was involved;
- who/what approved it;
- whether and where it was published.

## 4. Target Workflow

Long-term standard workflow:

`ProductOpportunity/Product`
`-> Asset Inventory`
`-> Deterministic Validation`
`-> Missing Requirement Detection`
`-> Design Plan`
`-> DesignTasks`
`-> OutputAssets`
`-> Automated Quality/Fact Checks`
`-> Human Exception Review`
`-> PublishAssetPack`
`-> Channel Publication`
`-> Performance Evidence`
`-> Improvement Proposal`

## 5. Template Strategy

Templates should be platform assets, not copied page prompts.

A template should describe stable constraints such as:

- output type;
- canvas size/aspect ratio;
- layout zones;
- typography rules;
- brand/design tokens;
- source asset requirements;
- allowed AI operations;
- required factual fields;
- category/channel/store scope;
- validation rules.

A template must not hard-code false product facts.

Category-specific templates should only be created when a stable repeated pattern is proven.

## 6. Priority Order for AI Automation

Recommended first AI-automated output types:

1. benefit/feature presentation images;
2. lifestyle/scene images;
3. model-wearing images where product fidelity can be maintained;
4. gift/recommendation images;
5. secondary hero/first-screen compositions;
6. detail-page module compositions.

Keep source-grounded or deterministic-first for:

- SKU/color reference images;
- measurement diagrams;
- material/detail evidence;
- white-background product truth images;
- compliance/label evidence.

AI may enhance these later, but source truth must remain authoritative.

## 7. Quality Gates

A future automatic design pipeline should have independent gates for:

- source identity;
- product-fact grounding;
- visual product fidelity;
- required dimensions/format;
- text completeness;
- prohibited/unverified claims;
- template compliance;
- channel compliance;
- duplicate/output version control;
- publish readiness.

Failure at a blocking gate must stop publication rather than silently continue.

## 8. Data and Evidence Metrics

Before claiming AI design improvement, record real evidence where feasible:

- manual time per product before automation;
- automated processing time;
- human review time;
- number of manual steps removed;
- regeneration count;
- rejection/error count;
- publish validation failure rate;
- post-publication correction count;
- asset reuse rate;
- cost per design task;
- conversion/search/sales effect where attribution is credible.

Unknown values must be marked pending validation. Example numbers are not formal results.

## 9. V1 -> V2 Entry Gate

Do not start full AI design automation merely because image generation is available.

V2 starts only after V1 proves:

- real source ZIP asset ingestion;
- stable source identity and dedupe;
- ProductOpportunity/Product asset continuity;
- usable normalized roles;
- stable operational storage contract;
- publish asset pack requirements understood for at least one real channel;
- observable failure handling.

## 10. V2 -> V3 Entry Gate

V3 requires evidence that:

- templates are stable enough to reuse;
- AI outputs preserve product truth at acceptable rates;
- review criteria are explicit;
- output/version provenance is reliable;
- actual labor savings are measured;
- exception patterns are understood;
- channel validation is automated.

## 11. Current Decision

CURRENT:

- build and validate the simplified ZIP-driven asset closure first;
- do not manually require employees to organize/extract ZIP contents;
- structure source assets for future reuse;
- keep AI automation as the explicit long-term direction;
- avoid implementing a full AI design system before the first real publication loop is proven.

NEXT after real publication success:

- freeze the first category/channel assisted-design workflow;
- introduce DesignTemplate + DesignTask + OutputAsset implementation deliberately;
- measure real operational improvement;
- expand only from proven patterns.
