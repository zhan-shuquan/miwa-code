# AIONE Men's Socks Rakuten Template Set V1

Status: VALIDATING Product Freeze
Date: 2026-09-12
Applies to: 美和AIONE一体化工作平台 / men's socks / Rakuten product-detail image generation

## Purpose

Define the reusable category-level Template Set for men's socks before any production 15-page batch implementation is expanded.

This Product Freeze is intentionally not tied to product `MH0000002`. That Product Code belongs to a previously created women's-socks product and must not be used as the Product Truth for a men's-socks template definition.

## Evidence baseline used for this Product Freeze

The historical SOCKONE men's-socks work repeatedly converged on the same 15-page sequence:

`01 main visual -> 02 value intro -> 03 pain/need -> 04 reason 1 -> 05 detail 1 -> 06 reason 2 -> 07 quality/report -> 08 set value -> 09 length/styling -> 10 color/gift -> 11 product spec -> 12 size guide -> 13 material -> 14 fixed care/after-sales page -> 15 fixed store assurance page`.

Historical prompts are evidence of useful page families and layout patterns only. They are not CURRENT Product Truth, they do not authorize old claims, and their product-specific wording/measurements/colors must not be copied into another Product.

User Product Truth confirmed on 2026-09-12:

- page 07 may retain the existing detection/report-style layout as a reusable Page Template;
- page 14 is an existing fixed image template and does not need product-by-product redesign;
- page 15 is an existing fixed image template and does not need product-by-product redesign.

The system therefore separates **layout reuse** from **claim/evidence governance**: keeping a report-looking layout does not authorize unsupported test values, certifications, antibacterial/deodorizing claims or third-party laboratory language.

## Locked platform boundary

The following platform capabilities are already CURRENT and are not redesigned here:

- curated material Human Gate: `01_SKU图`, `02_产品图`, `03_实拍图`
- SOURCE / DERIVED asset separation
- visual-only AI image generation
- deterministic copy overlay
- restricted-claim guard
- human approval before final use
- Template Set -> Page Template -> Field/Asset mapping model

The men's-socks Template Set configures those shared platform capabilities; it must not create a second image-generation architecture.

## Operator flow

`select Product -> confirm category -> AIONE recommends men's-socks Rakuten Template Set -> human confirms set -> map facts/assets -> trial-render 3 dynamic pages -> human confirms visual direction -> render dynamic pages -> append fixed pages 14/15 -> human final review -> FINAL/listing`

The system must never jump directly from Product selection to unattended 15-page publishing.

## Template Set identity

Working code: `MEN-SOCKS-RAKUTEN-DETAIL-V1`

V1 scope:
- category: men's socks
- channel: Rakuten
- commercial form: multi-pair men's-socks set
- output: 15 ordered ecommerce detail pages
- language: Japanese
- dynamic generation: pages that require current Product facts/assets
- static reuse: pages 14 and 15 from shared fixed-page assets
- batch generation: only after trial pages pass human review
- final human review: required

Single-pair men's socks are not part of V1. They may reuse page families later, but must not silently distort this first stable Template Set.

## Design architecture

A Template Set is not one giant Prompt.

It consists of:

1. Template Set - ordered page collection and category/channel scope.
2. Page Template - one page's stable visual structure.
3. Visual slots - approved product visuals allowed in each region.
4. Copy slots - deterministic text regions, hierarchy and typography.
5. Fact contract - approved Product facts allowed on the page.
6. Asset contract - curated asset roles/folders allowed on the page.
7. Claim guard - unsupported/restricted claims blocked centrally.
8. Review contract - trial-page and final human-review gates.
9. Static Page Asset reference - for fixed pages that should be reused without AI regeneration or per-Product redesign.

## Canvas profiles

V1 uses three dynamic canvas profiles plus a fixed-asset profile:

| Canvas code | Size | Intended use |
| --- | ---: | --- |
| `HERO_1000x1200` | 1000 x 1200 | page 01 main visual |
| `DETAIL_VERTICAL_1000x1500` | 1000 x 1500 | dynamic narrative/spec/detail pages |
| `DETAIL_SQUARE_1000x1000` | 1000 x 1000 | compact physical-detail / quality pages |
| `STATIC_EXISTING` | preserve source asset dimensions | pages 14 and 15 fixed image assets |

Pages 14 and 15 must not be resized merely to force them into a dynamic canvas profile. Their approved existing source dimensions are preserved unless the fixed template itself is formally versioned and replaced.

## Category visual system

V1 category-level visual language for dynamically generated pages:

- Japanese Rakuten ecommerce style; clear, mature, practical, not overly decorative.
- warm white / soft gray base; white content cards.
- deep navy for primary headings and rules.
- restrained gold accent for hierarchy/dividers.
- red only for real warning/risk/attention states; never for fake certifications.
- product is always the visual focal point; decorative elements must not cover sock patterns, cuff, heel, toe or size markers.
- lifestyle imagery shows lower legs/feet only when that is enough to explain styling; upper body is not required.
- product colors/patterns must remain faithful to approved SOURCE evidence.

Typography rendering remains deterministic through the platform's registered Japanese font system. Exact pixel typography values belong to Technical Design; Product Freeze locks hierarchy and region responsibility.

Pages 14 and 15 are exempt from redesign under this visual system because they are retained fixed assets. Their visual update lifecycle is governed separately by fixed-page versioning.

## 15-page production matrix

The following sequence is the proposed V1 production order. Page number and page code are canonical logical identity; physical filenames are not the identity.

| No. | Page code | Business purpose | Canvas | Fixed layout | Copy slots | Visual slots | Required facts | Source pools | Rule |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | `MS-HERO-01` | Main visual: immediately identify brand, product set and strongest verified value | `HERO_1000x1200` | top brand/header + left fact/value block + right/center hero wear/product + lower variation/set strip | brand, eyebrow, headline, key fact/value, set count | hero wear/product, set/variation samples | brand, set count, approved primary value, actual variants | 01/02/03 | REQUIRED |
| 02 | `MS-VALUE-02` | Core value introduction and seasonal/use positioning | `DETAIL_VERTICAL_1000x1500` | top title + dominant lifestyle/product visual + overlay headline region + small supporting badge/summary | section label, headline, 1-3 support lines | lifestyle/wear hero, optional product detail | season/use positioning, approved primary value | 02/03 | REQUIRED |
| 03 | `MS-NEED-03` | Explain customer need/problem without inventing performance claims | `DETAIL_VERTICAL_1000x1500` | top question/title + upper scenario visual + lower 3 need cards + transition CTA | headline, 3 need statements, transition line | lifestyle/problem scene or neutral sock-use scene | target use/season; no factual performance claim required | 02/03 | REQUIRED |
| 04 | `MS-REASON1-04` | First product-specific purchase reason | `DETAIL_VERTICAL_1000x1500` | top `Reason 1` + main benefit + two point modules + main wear/detail visual + small set strip | reason title, benefit headline, point A, point B, evidence note | wear/detail, cuff/detail, optional set strip | one verified primary feature + supporting facts | 01/02/03 | REQUIRED |
| 05 | `MS-PHYSICAL-DETAIL-05` | Show physical construction such as heel/toe/cuff/knit | `DETAIL_SQUARE_1000x1000` | two stacked point cards; alternating text/image left-right | point A title/body, point B title/body, optional tolerance note | two close-up product details | only visually/evidentially supported construction facts | 02/03 | REQUIRED; unsupported feature text must fall back to neutral detail description |
| 06 | `MS-REASON2-06` | Second stable reason: thickness/knit/daily usability or another verified category-relevant benefit | `DETAIL_SQUARE_1000x1000` | top `Reason 2` + center wear/product visual + left/right supporting modules | reason title, headline, left point, right point | center product/wear, two icon/detail supports | verified thickness/knit/use facts; no inferred thermal/antibacterial claims | 02/03 | REQUIRED |
| 07 | `MS-QUALITY-REPORT-07` | Retain the established detection/report-style presentation for quality/evidence communication | `DETAIL_SQUARE_1000x1000` | existing report-style structure: top quality/report title + left chart/check region + right report/evidence region | title, result/inspection items, evidence note, disclosure; score/grade/test fields only when evidenced | product sample, inspection evidence, approved report image/scan when available | exact evidence for every displayed test/result/grade/certification; internal QC facts allowed when explicitly recorded | 02/03 + evidence object | REQUIRED layout retained; report appearance is allowed, unsupported claims are not |
| 08 | `MS-SET-08` | Explain multi-pair set value, quantity and daily rotation | `DETAIL_VERTICAL_1000x1500` | top `Reason 3` + full-set display + lower set/value card + stack/detail visual | set headline, pair count, usage copy, value points | complete SKU set, stacked/folded set | exact pair count, actual variants | 01/02 | REQUIRED |
| 09 | `MS-LENGTH-STYLE-09` | Explain sock length and how it coordinates with trousers/shoes | `DETAIL_VERTICAL_1000x1500` | top `Reason 4` + left length diagram + right/lower styling visual | length headline, style explanation, measurement/name if approved | lower-leg styling, length diagram/product silhouette | sock length type; measurement only if human-confirmed | 02/03 | REQUIRED |
| 10 | `MS-VARIATION-GIFT-10` | Show actual variations and optional gift/use-scene positioning | `DETAIL_VERTICAL_1000x1500` | top gift/use-scene block + middle variations grid + lower set summary/detail | use/gift headline, variation label(s), set summary, disclaimer | actual variants, set visual, lifestyle/gift-neutral scene | actual color/pattern variants, pair count | 01/02/03 | REQUIRED; no fake gift box/accessory; page 08 owns quantity value, page 10 owns variation/gift positioning |
| 11 | `MS-SPEC-11` | Structured Product Specification | `DETAIL_VERTICAL_1000x1500` | top title + product/set visual + fact cards/grid + bottom summary | product code/SKU if approved, spec labels/values, summary | set/hero product visual; icons are system assets | explicit Product facts only | 01/02 | REQUIRED; any missing critical spec blocks the field rather than inventing |
| 12 | `MS-SIZE-12` | Size and human-confirmed flat measurements | `DETAIL_VERTICAL_1000x1500` | top supported size + large annotated flat-lay + measurement table + optional thickness/stretch + notes | size range, measurement labels/values, notes | flat-lay measurement image, thickness/detail image | supported size, each displayed measurement, unit, measurement method | 02/03 | REQUIRED; high-risk fact page; no AI-inferred dimensions |
| 13 | `MS-MATERIAL-13` | Material identity and visible fabric/knit explanation | `DETAIL_VERTICAL_1000x1500` | top title + material identity + detail photos + material characteristics + notes | material name/composition if verified, characteristics, caveats | fabric close-up, knit/cuff/product details | supplier/human-verified material facts | 02/03 | REQUIRED; composition percentages only when explicit evidence exists |
| 14 | `FIXED-CARE-AFTERSALES-14` | Existing fixed care/after-sales image template | `STATIC_EXISTING` | reuse approved existing page 14 image exactly; no per-Product redesign | none at Product render time | fixed shared image asset | no Product-specific generation facts | shared fixed-page asset registry | REQUIRED; no AI generation, no deterministic copy overlay, append by versioned asset reference |
| 15 | `FIXED-STORE-ASSURANCE-15` | Existing fixed store assurance image template | `STATIC_EXISTING` | reuse approved existing page 15 image exactly; no per-Product redesign | none at Product render time | fixed shared image asset | no Product-specific generation facts | shared fixed-page asset registry | REQUIRED; no AI generation, no deterministic copy overlay, append by versioned asset reference |

## Page 07 retained report-template rule

Page 07's existing detection/report visual template is retained. This is a layout decision, not a permission to invent evidence.

Allowed evidence modes within the same retained layout:

- `third_party_report`: real approved third-party report/evidence object exists; exact laboratory/test/result fields may be rendered from that evidence only.
- `internal_qc`: approved internal inspection evidence exists; the report-style layout may show the recorded inspection items and internal result wording, clearly disclosed as internal QC.
- `evidence_safe`: no formal report exists; the same visual template may be used, but fields that imply laboratory testing, certification, grade, score or proven performance must be omitted/replaced with neutral product-detail/inspection wording.

The following are never inferred from the report-style design itself: antibacterial, deodorizing, warmth, colorfastness grade, test score, certification, laboratory name, wash-cycle durability or any numeric result.

## Fixed-page asset rule for pages 14 and 15

Pages 14 and 15 are **shared fixed image assets**, not dynamic Product-generated pages.

Implementation contract:

- store each approved fixed page once in the shared template/static asset registry;
- Template Set items 14 and 15 reference `static_page_asset_id + version`, not a Prompt;
- do not send these pages to the image model;
- do not run deterministic copy overlay on them during Product generation;
- do not copy their business text into Product facts;
- the final 15-page manifest simply resolves and appends the approved fixed asset versions in positions 14 and 15;
- if a marketplace/export process requires a physical per-Product file, duplication may occur only at the export boundary; the source of truth remains the single shared fixed asset.

`Fixed` means **not redesigned per Product**, not "can never change". If care policy, after-sales wording, support hours, return terms, brand identity or legal wording changes, the fixed page is replaced once as a new shared asset version. Future generated sets use the new version without redesigning every men's-socks Product.

## Standard copy-slot hierarchy

Every dynamic page may use only named deterministic slots from this hierarchy; page templates select a subset:

`eyebrow -> section_label -> headline -> subheadline -> body -> point_a_title -> point_a_body -> point_b_title -> point_b_body -> fact_label/value -> note/disclaimer -> brand_footer`

Rules:
- product facts/numbers are rendered only through deterministic slots;
- AI visual stage receives no commercial text;
- decorative text baked into generated visual is forbidden;
- missing optional copy collapses its slot; the page must not leave fake placeholder copy;
- pages 14 and 15 have no dynamic copy slots in Product generation.

## Standard visual-slot hierarchy

Semantic visual roles for dynamic pages:

`sku_set`, `single_product`, `hero_wear`, `lifestyle`, `flat_lay`, `color_variants`, `fabric_closeup`, `cuff_detail`, `heel_detail`, `toe_detail`, `thickness_detail`, `inspection_evidence`.

The asset resolver maps these semantic roles into the three curated pools. Templates must not require supplier filenames.

Pages 14 and 15 bypass Product visual-slot resolution and use versioned shared static assets.

## Product fact contract

Minimum Product data required before the dynamic portion of the 15-page batch can start:

- Product identity / Product Code
- men's-socks category confirmation
- final sales set and exact pair count
- actual color/pattern variants
- supported size range
- sock length type
- approved material description
- enough approved SOURCE assets to satisfy required dynamic visual roles

Additional facts are page-specific and only rendered when approved, including:

- flat measurements
- thickness
- weight
- country of origin
- exact material percentages
- construction details
- internal QC evidence
- third-party report evidence
- any performance claim

Pages 14 and 15 do not add Product-level required facts because their approved content comes from shared fixed-page assets.

## Missing-fact behavior

AIONE must choose one of four deterministic outcomes; it must never invent:

1. `render` - required fact exists and is approved.
2. `collapse_optional_slot` - optional fact/visual missing and layout supports removal.
3. `use_evidence_safe_mode` - page 07 retains its report-style layout while removing unsupported report/test claims.
4. `block_for_human` - required fact missing, such as page 12 measurements.

Pages 14 and 15 are resolved by static asset version; missing static assets block the final 15-page package rather than trigger redesign.

## Trial-render gate

Before full dynamic rendering, V1 always trial-renders exactly three pages:

- `MS-HERO-01` - proves product identity, category visual direction and main composition.
- `MS-REASON1-04` - proves mixed visual + variable benefit + deterministic copy hierarchy.
- `MS-SIZE-12` - proves high-risk numeric facts, annotation clarity and no AI-inferred measurements.

Human must approve all three before dynamic batch generation is enabled for that Product.

Pages 14 and 15 are not trial-rendered because they are fixed assets; their asset versions are validated separately.

If any trial page fails, fix the shared Page Template / token / mapping where possible. Do not patch only that Product unless the problem is genuinely Product-specific data or assets.

## Final batch and review contract

After trial approval:

- AIONE may generate dynamic pages in logical `page_no` order and resolve pages 14/15 from shared static assets.
- each dynamic output stores `template_set_id`, `page_template_id`, `page_no`, `page_code`, source asset IDs, copy/fact hash, renderer/model provenance and review state.
- each fixed page stores `template_set_id`, `page_no`, `page_code`, `static_page_asset_id`, static asset version and provenance.
- platform-generated physical filename is not the identity; `page_no + page_code` is the stable business ordering contract.
- dynamic outputs enter DERIVED with final human review pending.
- pages 14/15 use already-approved fixed asset versions and are reviewed when their shared asset version changes, not regenerated per Product.
- only a complete package with approved dynamic outputs and valid fixed-page asset versions may become FINAL/listing assets.

## What remains OPEN before CURRENT Product Freeze

The 15-page structure, order, page 07 report-layout retention, pages 14/15 fixed-page handling, trial pages and high-level slot responsibilities are now defined in this VALIDATING draft.

The remaining Product Freeze decisions are deliberately narrower:

- approve or revise the proposed 15-page sequence itself;
- approve page 01 as 1000x1200 rather than the historical 1000x1000 layout;
- approve the category visual language for dynamic pages (warm white/soft gray + navy + restrained gold);
- decide whether page 03 `need/pain` is mandatory for every men's-socks set or may be replaced by a second benefit page for products where a pain narrative is weak;
- decide whether page 10 gift/use-scene positioning is mandatory or supports a `variation_only` safe variant.

The following are no longer OPEN:

- page 07 detection/report-style template is retained, with evidence governance;
- page 14 existing image template is reused as a fixed shared asset;
- page 15 existing image template is reused as a fixed shared asset;
- pages 14/15 are not redesigned or regenerated per Product.

Exact pixel coordinates, font point sizes and rendering implementation remain Technical Design, not Product Truth.

## Product Freeze rule before code

Do not implement the production 15-page Template Set migration until the remaining OPEN Product decisions immediately above are explicitly approved.

After approval, change this document from `VALIDATING Product Freeze` to `CURRENT Product Freeze`, then implement through:

`Product Freeze -> Technical Design -> branch -> automated checks -> preview/trial evidence -> review -> merge main -> canonical CURRENT deploy`.

## Acceptance criteria for V1 Product Freeze

This document can change to `CURRENT Product Freeze` only when:

- all 15 production page codes and order are accepted;
- canvas profile for dynamic pages and static-asset handling for pages 14/15 are accepted;
- page 07 evidence modes are accepted;
- mandatory vs safe-variant behavior is accepted;
- minimum Product fact contract is accepted;
- trial render pages are accepted;
- missing-fact behavior is accepted;
- no Product Code or product-specific sales copy is embedded in the category template;
- restricted claims remain governed centrally;
- human review remains mandatory before full batch and before listing use.

## Governance note

D61 proved deterministic copy overlay capability. It did NOT freeze the commercial layout of a men's-socks template. D61 remains technical acceptance evidence, not the visual master for this Template Set.
