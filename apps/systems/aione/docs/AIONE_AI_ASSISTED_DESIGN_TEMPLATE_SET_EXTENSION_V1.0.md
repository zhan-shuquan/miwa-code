# AIONE AI Assisted Design Template Set Extension V1.0

Status: **PROPOSED CURRENT / VALIDATION CANDIDATE**  
Project: **美和AIONE一体化工作平台**  
Daily name: **AIONE**  
Effective date: **2026-09-12**

## 1. Purpose

This extension adds the minimum missing concept between Product and the existing DesignTemplate/DesignTask pipeline: a selectable, versioned **DesignTemplateSet** containing ordered design pages.

The immediate business reason is concrete: different product categories and product styles require different image sequences, while each page still needs to reuse the same AIONE Product facts, canonical ProductAssets, AI Gateway, review and publication path.

This is not a second template engine. Each template-set page references an existing `design_templates` record and creates the existing `design_tasks` object for execution.

## 2. CURRENT operator flow

For the first validator:

`Product -> confirmed curated material -> choose Template Set -> choose one Template Page -> bind confirmed ProductAssets + facts -> create DesignTask -> human approval -> execute one image -> human visual review`

Batch generation is explicitly disabled until the first real one-page acceptance succeeds.

Automatic cross-category template selection is deferred. The operator selects the template set first; AIONE may recommend compatible sets later.

## 3. Curated material contract remains unchanged

The human-curated Google Drive workspace keeps exactly three folders:

1. `01_SKU图`
2. `02_产品图`
3. `03_实拍图`

No additional folders are introduced for color, detail, white-background, model or reference images.

Detailed image roles are represented by existing ProductAsset metadata / role semantics and simple Chinese file-name hints inside the three-folder contract, for example `主图-1.jpg`, `白底图-1.jpg`, `详情图-1.jpg`.

Google Drive stores the files; AIONE interprets the files.

## 4. Object model extension

### DesignTemplateSet

Purpose: versioned business-level selection of an ordered reusable image sequence.

Minimum fields:

- `id`
- `set_code`
- `name`
- `version`
- `category_scope`
- `channel_scope`
- `store_scope` optional
- `match_rules`
- `common_fact_keys`
- `lifecycle_status`
- `metadata`
- standard audit/version fields

### DesignTemplateSetItem

Purpose: one ordered page inside a template set.

Minimum fields:

- `id`
- `template_set_id`
- `template_id`
- `page_no`
- `page_code`
- `page_name`
- `required`
- `default_enabled`
- `field_bindings`
- `asset_bindings`
- `instruction_defaults`
- `metadata`
- standard audit/version fields

A TemplateSetItem does not execute AI directly. It resolves to one existing DesignTemplate and creates a normal DesignTask.

## 5. First validator only

The first persisted set is intentionally one page only:

- set: `SOCKS-RAKUTEN-BASE` v1.0
- category: `socks`
- channel: `rakuten`
- page: `benefit-01`
- underlying template: `SOCKS-RAKUTEN-BENEFIT-1000X1500` v1.0
- output: `benefit_feature_image`
- canvas: `1000 x 1500`

The purpose is to validate architecture and product fidelity, not to claim that this one page is the final men's-sock template set.

## 6. Verification gates

### Gate A — schema and contract

Must prove:

- migration is additive;
- TemplateSet and TemplateSetItem exist;
- the validator set contains exactly one page;
- the page references an active existing DesignTemplate;
- template-set task binding columns exist on DesignTask;
- CURRENT three-folder material contract is not changed;
- backend static checks pass.

### Gate B — real task creation

Using one CURRENT real Product and its human-confirmed ProductAssets:

- operator explicitly selects the template set/page;
- task is created from that selected page;
- frozen task snapshot records template-set ID/version/page identity;
- selected assets remain a subset of the confirmed material snapshot;
- no AI image is generated yet.

### Gate C — one real AI output

Only after Gate A and B pass:

- execute one approved DesignTask;
- use the selected real ProductAssets as visual truth;
- output one DERIVED ProductAsset;
- visually compare against the real product;
- record approve/reject/regenerate outcome.

If the output materially changes product color, stripe/pattern, length, structure or other visible identity, the validation fails even if the API call technically succeeds.

## 7. Deferred until Gate C passes

Do not implement yet:

- 15-page batch generation;
- automatic template-set recommendation across all categories;
- multiple new category template sets;
- autonomous image selection;
- autonomous approval or publishing;
- new material folder levels;
- parallel media/template/task subsystems.

## 8. Governance

This extension is a **validation candidate**, not yet a merged CURRENT baseline.

Only after branch checks, controlled database preflight and real acceptance should it be eligible for merge into `main`.

If validation fails, fix or discard this extension on the branch; do not weaken ProductAsset truth, human confirmation, review or the three-folder material contract to force a pass.
