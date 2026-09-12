# AIONE AI Design - Men's Socks Rakuten Template Set V1 Technical Design

Status: TECHNICAL DESIGN STARTED
Date: 2026-09-12
Product Freeze: `docs/product-freeze/AIONE_MENS_SOCKS_RAKUTEN_TEMPLATE_SET_V1.md`

## Objective

Implement the locked `MEN-SOCKS-RAKUTEN-DETAIL-V1` Product Freeze as one reusable AIONE Template Set without creating a second design architecture.

The implementation must preserve the CURRENT platform pipeline:

`Human-curated SOURCE -> visual-only AI -> deterministic copy overlay -> DERIVED -> human review -> FINAL/listing`

Pages 14 and 15 are exceptions only in rendering mode: they are versioned shared static page assets and bypass per-Product AI/render work.

## Existing schema constraint found

Migration `0096_design_template_sets_v1.sql` currently defines:

- `design_template_set_items.template_id TEXT NOT NULL`
- every Template Set item therefore must reference a dynamic `design_templates` row.

That contract cannot represent the locked Product Truth for pages 14 and 15, which must reference fixed shared image assets rather than a dynamic Page Template.

Technical Design therefore requires a small platform-level extension instead of faking static pages as dynamic templates.

## Proposed migration: 0098 men's-socks Template Set V1

### 1. Static page asset registry

Create `public.design_static_page_assets`:

- `id TEXT PRIMARY KEY`
- `asset_code TEXT NOT NULL`
- `name TEXT NOT NULL`
- `version TEXT NOT NULL`
- `channel_scope TEXT`
- `category_scope TEXT`
- `store_scope TEXT`
- `product_asset_id TEXT NULL` referencing `product_assets(id)` when the fixed page is stored as a managed ProductAsset-like asset
- `storage_ref JSONB NOT NULL` for canonical bucket/object or equivalent managed file reference
- `width INTEGER NULL`
- `height INTEGER NULL`
- `mime_type TEXT NOT NULL`
- `lifecycle_status` in `draft/active/deprecated/archived`
- `content_sha256 TEXT`
- `metadata JSONB`
- standard created/updated/person/version/source/audit columns
- unique `(asset_code, version)`

The fixed page source of truth is one registry row/version, not duplicated per Product.

### 2. Extend Template Set item target type

Alter `design_template_set_items`:

- make `template_id` nullable
- add `item_kind TEXT NOT NULL DEFAULT 'dynamic_template'`
  - `dynamic_template`
  - `static_page_asset`
- add `static_page_asset_id TEXT NULL REFERENCES design_static_page_assets(id)`
- add a CHECK constraint:
  - `dynamic_template` => `template_id IS NOT NULL AND static_page_asset_id IS NULL`
  - `static_page_asset` => `template_id IS NULL AND static_page_asset_id IS NOT NULL`

This keeps one ordered Template Set item model while allowing both dynamic and static pages.

### 3. Preserve task semantics

`design_tasks` remain dynamic-execution tasks. Static items do not create AI generation tasks or copy-overlay tasks.

A package/manifest resolver returns static page references directly for page 14/15.

## Template Set seed

Seed one active set:

- id: `dtset_mens_socks_rakuten_detail_v1`
- set_code: `MEN-SOCKS-RAKUTEN-DETAIL-V1`
- version: `1.0`
- category_scope: `mens-socks`
- channel_scope: `rakuten`
- operatorSelectionRequired: true
- trialPageCodes: `MS-HERO-01`, `MS-REASON1-04`, `MS-SIZE-12`
- fullBatchAfterTrialApproval: true
- humanReviewRequired: true
- dynamicPageCount: 13
- staticPageCount: 2

## Page Template strategy

Do not create 13 unrelated renderers.

Create reusable Page Template families with per-page configuration:

1. `hero`
2. `vertical_story`
3. `vertical_reason`
4. `square_detail_two_card`
5. `square_reason_center`
6. `square_quality_report`
7. `vertical_set`
8. `vertical_length_style`
9. `vertical_variation_gift`
10. `vertical_spec`
11. `vertical_size`
12. `vertical_material`

Page 03 and page 10 variant changes remain configuration of the same page identity, not new page numbers.

## Dynamic page item contract

Every dynamic Template Set item stores:

- page number and stable page code
- Page Template ID
- required facts
- optional facts
- semantic visual roles
- allowed curated source folders
- safe variant rules
- restricted-claim policy reference
- deterministic copy-slot schema
- trial-gate role when applicable

Pages 01-13 use `textPolicy=visual_only` and `copyLayerMode=deterministic_overlay`.

## Page 07 technical contract

Page code: `MS-QUALITY-REPORT-07`

Renderer family: `square_quality_report`

Evidence mode is deterministic from input evidence:

1. `third_party_report`
   - requires approved report evidence object/asset
   - may expose only exact evidenced institution/test/result/grade fields
2. `internal_qc`
   - requires approved internal inspection evidence
   - must disclose internal QC semantics
3. `evidence_safe`
   - default when neither evidence class exists
   - preserves report-style visual composition
   - removes score/grade/certification/lab claims

Claim guard runs before copy plan creation.

## Pages 14 and 15 technical contract

Page 14:
- page code `FIXED-CARE-AFTERSALES-14`
- item_kind `static_page_asset`
- static code `SOCKONE-RAKUTEN-CARE-AFTERSALES`

Page 15:
- page code `FIXED-STORE-ASSURANCE-15`
- item_kind `static_page_asset`
- static code `SOCKONE-RAKUTEN-STORE-ASSURANCE`

The actual approved image binaries/managed storage references must be registered before the full 15-page package can become executable. Technical Design must not invent these files.

Static items:
- never call the image model
- never call deterministic overlay per Product
- never create a DesignTask
- resolve the active approved version at package-build time
- record asset ID, version and hash in package provenance

## Trial gate state model

A Product using this set starts in:

`template_set_selected`

Then:

`facts_assets_validated -> trial_ready -> trial_rendered -> trial_human_approved -> full_batch_enabled`

Trial requires exactly:

- page 01 `MS-HERO-01`
- page 04 `MS-REASON1-04`
- page 12 `MS-SIZE-12`

All three must be human-approved for the same Product + Template Set version before full batch is enabled.

## Package manifest

Add a service-level package manifest contract rather than making file names the identity.

Manifest fields:

- productId
- productCode
- templateSetId
- templateSetCode
- templateSetVersion
- packageVersion
- generatedAt
- items[15]

Each item:

- pageNo
- pageCode
- itemKind
- pageTemplateId or staticPageAssetId
- dynamic output ProductAsset ID when applicable
- static asset version/hash when applicable
- source asset IDs
- fact/copy hash when applicable
- review state
- provenance

The package can become listing-ready only when:

- all required dynamic pages exist and are human-approved
- pages 14/15 resolve to active approved static asset versions
- no required page is missing

## API direction

V1 should add/extend platform APIs instead of page-specific endpoints:

- recommend/list Template Sets by Product category/channel
- select Template Set for Product
- validate Product facts/assets against selected set
- create trial tasks
- read trial gate status
- create remaining dynamic batch after trial approval
- build/read 15-page package manifest

No endpoint should contain `mens-socks` business logic in the route handler. Matching and page rules belong in Template Set/domain services.

## Asset-role mapping

Use existing curated folder contract:

- `01_SKU图`
- `02_产品图`
- `03_实拍图`

The Template Set requests semantic roles, not filenames:

- sku_set
- single_product
- hero_wear
- lifestyle
- flat_lay
- color_variants
- fabric_closeup
- cuff_detail
- heel_detail
- toe_detail
- thickness_detail
- inspection_evidence

A shared resolver maps roles to eligible SOURCE assets and records the exact chosen asset IDs.

## Missing-fact handling

The service returns deterministic dispositions:

- `render`
- `collapse_optional_slot`
- `use_safe_variant`
- `block_for_human`

No renderer or model may fill a missing Product fact by inference.

## Validation and CI

Migration/implementation PR must add checks for:

- 0098 migration applies cleanly after 0097
- static/dynamic Template Set item CHECK constraint
- exactly 15 ordered items for `MEN-SOCKS-RAKUTEN-DETAIL-V1`
- exactly 13 dynamic + 2 static
- trial pages exactly 01/04/12
- page 07 mode contract
- page 03 and 10 safe variants
- pages 14/15 cannot create AI/design tasks
- static asset version/hash appears in package manifest
- restricted claims remain enforced
- missing numeric size facts block page 12

## Gate C plan

Do not validate all 15 pages first.

Gate C sequence:

1. register temporary/test-safe static asset references for 14/15 only if they are real approved assets; otherwise static package completion remains blocked
2. choose a real men's-socks Product with corrected Product Truth
3. Human Gate confirms SOURCE pool
4. render trial pages 01/04/12
5. human visual review all three
6. only after trial PASS, render remaining dynamic pages 02/03/05-11/13
7. resolve fixed pages 14/15
8. build full package manifest
9. final human review

`MH0000002` must not be reused for this Gate C because it is a women's-socks Product.

## Implementation order

1. migration 0098 schema extension + set/item seed skeleton
2. domain contracts/tests for dynamic vs static items
3. static page registry service
4. Template Set recommendation/selection + validation
5. trial-gate service
6. page-family template definitions for 01/04/12 first
7. Gate C trial evidence
8. only then expand remaining dynamic Page Templates
9. package manifest
10. full 15-page final acceptance

This ordering preserves the project's rule: prove the minimum real business loop before expanding the full feature surface.
