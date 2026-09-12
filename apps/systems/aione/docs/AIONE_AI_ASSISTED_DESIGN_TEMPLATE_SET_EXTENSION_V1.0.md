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

`Product -> confirmed curated material -> choose Template Set -> choose one Template Page -> human-select SOURCE assets -> validate page facts/claims/assets -> create DesignTask -> human approval -> execute one image -> human visual review`

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

## 6. Template Page input policy

Each Template Page owns the minimum policy needed to prevent AI from inventing product truth.

### 6.1 Field whitelist

`field_bindings.allowedFacts` defines facts that may enter this page. Unknown page-level facts are rejected before a DesignTask is created.

`field_bindings.requiredFacts` defines facts required by this page.

The first validator allows only the small product/design scope needed for the socks benefit page, including category, material, size, colors, selling points and explicitly approved claims.

### 6.2 Restricted claims

Claims with compliance or evidence risk are never inferred merely from an image or category.

The first validator treats terms such as the following as restricted examples:

- 防臭 / 消臭
- 抗菌
- 発熱 / 吸湿発熱 / 遠赤外線
- 純綿 / 100%綿
- オーガニックコットン
- 羊毛100%
- 医療用
- 着圧 / 血行促進

If a restricted claim appears in page instructions or selling points, it must also be present in the human-confirmed `approvedClaims` fact. Otherwise task creation is rejected.

This is a page guardrail, not a replacement for formal product evidence. Future evidence objects may further strengthen the approval source.

### 6.3 Human-selected SOURCE assets

The first validator page accepts human-selected SOURCE images only from:

- `02_产品图`
- `03_实拍图`

The physical Drive structure remains the locked three-folder contract. A page may narrow which of those folders it accepts without creating more folders.

AIONE rejects a selected asset before task creation when it:

- does not belong to the Product;
- is not a canonical `SOURCE` asset;
- is not an image;
- comes from a folder not allowed by the selected Template Page.

### 6.4 Single-page-first rule

The current validator remains one page. One output must pass human visual review before expansion to a larger socks template set or multi-page generation.

## 7. Verification gates

### Gate A — schema and contract

Must prove:

- migration is additive;
- TemplateSet and TemplateSetItem exist;
- the validator set contains exactly one page;
- the page references an active existing DesignTemplate;
- template-set task binding columns exist on DesignTask;
- CURRENT three-folder material contract is not changed;
- backend static checks pass;
- page fact/claim policy unit checks pass.

### Gate B — real task creation

Using one controlled or CURRENT Product and its human-confirmed ProductAssets:

- operator explicitly selects the template set/page;
- page input policy validates selected assets and facts;
- task is created from that selected page;
- frozen task snapshot records template-set ID/version/page identity;
- selected assets remain a subset of the confirmed material snapshot;
- idempotent task creation is preserved;
- no AI image is required for Gate B.

### Gate C — one real AI output

Only after Gate A and B pass:

- execute one real AI image flow using the selected real ProductAssets as visual truth;
- output one DERIVED ProductAsset;
- visually compare against the real product;
- record approve/reject/regenerate outcome.

Technical generation success and business visual acceptance are separate results.

If the output materially changes product color, stripe/pattern, length, structure or other visible identity, or introduces an unsupported product claim, the business visual validation fails even if the AI API call and asset persistence succeed.

## 8. Current validation finding

The first live visual sample proves that the AI image path can generate an ecommerce image, but the sample is **not accepted as a formal product image**.

Observed business-risk pattern:

- AI may reconstruct the product too freely instead of preserving the exact real Product identity;
- AI may introduce unsupported claims such as `防臭`, `純綿` or similar marketing statements;
- therefore technical generation success alone must never promote an output to approved/formal status.

Accordingly, the minimum architecture is now locked around four constraints:

1. selectable Template Set / Template Page;
2. human-selected assets within the locked three-folder material contract;
3. page-level fact whitelist plus restricted-claim approval;
4. one-page-first generation followed by explicit human visual review.

This finding does **not** authorize 15-page batch generation yet.

## 9. Deferred until business Gate C passes

Do not implement yet:

- 15-page batch generation;
- automatic template-set recommendation across all categories;
- multiple new category template sets;
- autonomous image selection;
- autonomous approval or publishing;
- new material folder levels;
- parallel media/template/task subsystems.

## 10. Governance

This extension is a **validation candidate**, not yet a merged CURRENT baseline.

Only after branch checks, controlled database preflight and real business acceptance should it be eligible for merge into `main`.

If validation fails, fix or discard this extension on the branch; do not weaken ProductAsset truth, human confirmation, review or the three-folder material contract to force a pass.
