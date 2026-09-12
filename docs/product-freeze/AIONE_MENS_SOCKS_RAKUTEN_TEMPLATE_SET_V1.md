# AIONE Men's Socks Rakuten Template Set V1

Status: VALIDATING Product Freeze
Date: 2026-09-12
Applies to: 美和AIONE一体化工作平台 / men's socks / Rakuten product-detail image generation

## Purpose

Define the reusable category-level Template Set for men's socks before any 15-page batch implementation is expanded.

This Product Freeze is intentionally not tied to product `MH0000002`. That Product Code belongs to a previously created women's-socks product and must not be used as the Product Truth for a men's-socks template definition.

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

`select Product -> confirm category -> AIONE recommends men's-socks Rakuten Template Set -> human confirms set -> map facts/assets -> trial-render 1-3 pages -> human confirms visual direction -> render full set -> human final review -> FINAL/listing`

The system must never jump directly from Product selection to unattended 15-page publishing.

## Template Set identity

Working code: `MEN-SOCKS-RAKUTEN-DETAIL-V1`

Scope:
- category: men's socks
- channel: Rakuten
- output: product-detail ecommerce images
- language: Japanese
- batch generation: only after trial pages pass human review
- final human review: required

The code above is a working Product Freeze identifier and may be renamed before this document becomes CURRENT. Once locked, one CURRENT code must remain.

## Design architecture

A Template Set is not one giant Prompt.

It consists of:

1. Template Set - defines the ordered page collection and category/channel scope.
2. Page Template - defines one page's stable visual structure.
3. Visual slots - define where approved product visuals may appear.
4. Copy slots - define deterministic text regions, hierarchy and typography.
5. Fact contract - defines which approved Product facts can be used on that page.
6. Asset contract - defines which curated asset roles/folders can support the page.
7. Claim guard - blocks unsupported or restricted claims.
8. Review contract - defines trial-page and final human-review gates.

## Visual-generation rule

AI image generation remains `visual_only`.

The image model may compose product/lifestyle/background visuals using approved source material, but must not author commercial copy, specifications, measurements, claims, logos or numeric facts inside the generated image.

Commercial text is applied afterwards through the deterministic copy layer from approved structured facts/copy.

## Copy rule

Copy must be sourced only from explicit approved Product facts or human-approved localized copy.

The renderer must not infer or invent:
- material percentages
- warmth/performance claims
- antibacterial/deodorizing claims
- medical/compression claims
- measurements
- size ranges
- country of origin
- certifications
- promotional prices

If a required fact is missing, the page must block, degrade to a fact-safe alternate layout, or return to human completion. It must not fabricate a value.

## Source-material rule

Preferred curated inputs:

- `01_SKU图`: final sales SKU / set identity evidence
- `02_产品图`: white background, color, detail, construction, material and supplier product evidence
- `03_实拍图`: MIWA-owned real photography when available

Page Templates should request semantic asset roles from these curated pools. They must not depend on fixed supplier filenames or product-specific folder names.

## Current page families for validation

The existing men's-socks ecommerce work has repeatedly used the following stable content families. They are accepted as the starting structure for V1 validation, but the exact 15-page order and page count are NOT CURRENT until explicitly confirmed.

| Family | Purpose | Current state |
| --- | --- | --- |
| Hero / Cover | Brand + strongest verified value proposition + product presentation | validate |
| Pain / Need | Show the customer problem/seasonal need without unsupported claims | validate |
| Reason / Benefit | Explain one verified purchase reason | validate |
| Construction / Detail | Show knit, cuff, heel, toe or other physical detail | validate |
| Quality Check | Evidence-led detail inspection, not certification language | validate |
| Color / Variation | Show actual set colors/patterns from approved SKU evidence | validate |
| Styling / Length | Explain visible sock length and matching scenarios | validate |
| Product Specification | Structured facts only | validate |
| Size Guide | Human-confirmed measured values only | validate |
| Material | Verified material description only | validate |
| Gift / Use Scene | Non-factual positioning copy plus product-safe lifestyle visual | validate |
| Additional Detail / Variation pages | Only if a stable reusable need is proven | OPEN |

No page is allowed to exist only because an old 15-image Prompt contained it. The page must have a repeatable business purpose.

## What is NOT frozen yet

The following items remain OPEN and must be confirmed before implementation of a production 15-page Template Set:

- final number of pages
- final page order
- which pages are 1000x1500 vs 1000x1000 or other Rakuten-safe canvas sizes
- exact reusable layout for each page family
- typography scale and spacing system
- title/subtitle/body copy slot hierarchy
- fixed/optional visual slots per page
- whether gift and variations are one page or separate pages
- which page families are mandatory vs conditional
- category-specific style tokens for men's socks
- trial-page selection rules
- final batch naming/order contract

## Product Freeze rule before code

Do not implement a full production 15-page batch renderer until the OPEN items above are resolved.

The next Product Freeze session should approve, for each page:

`page no -> page purpose -> canvas -> fixed layout -> copy slots -> visual slots -> required facts -> allowed source assets -> conditional/required -> acceptance criteria`

Only after that table is locked should Technical Design convert it into DesignTemplate / DesignTemplateSet configuration and migrations.

## Acceptance criteria for V1 Product Freeze

This document can change from `VALIDATING` to `CURRENT Product Freeze` only when:

- every production page has a unique page code and clear business purpose
- page count and order are fixed
- canvas size is fixed per page
- layout is expressed as reusable slots, not product-specific coordinates hidden in prompts
- required Product facts are explicit
- missing-fact behavior is explicit
- allowed curated asset roles are explicit
- restricted claims remain governed centrally
- trial render pages are defined
- human review remains mandatory before full batch and before final listing use
- no Product Code or product-specific sales copy is embedded in the category template

## Governance note

D61 proved deterministic copy overlay capability. It did NOT freeze the commercial layout of a men's-socks template. D61 must therefore remain technical acceptance evidence rather than the visual master for this Template Set.
