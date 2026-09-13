# AIONE Design Center｜Product Tag Card + Unified Hero V1

Status: validating on real products; not yet a full 15-image design standard.

## Product Truth boundary

Product facts stay in `products.product_data`. Design Center does not create a second canonical size, set-count, material, color, or selling-point value. Tag-card slots and hero badges can bind to Product Truth paths and may carry presentation-only fallback text.

## Product Tag Card

The Product Tag Card is an independent reusable design object for all MIWA categories and is intended for both hero images and packaging.

Fixed structure:
1. English brand name.
2. Short English descriptor.
3. Four configurable middle slots.
4. Short Japanese brand slogan.

Each middle slot can bind to a Product Truth path or use presentation-only text when no canonical fact exists. Empty slots may be hidden. The outer card dimensions remain stable; category and gender differences should primarily be expressed by slot content and controlled color themes.

## Unified Hero V1

The first CURRENT hero contract is square `1000x1000` with five standard slots:
1. Product Tag Card.
2. Model hero image.
3. Product display image.
4. Primary selling-point badge.
5. Secondary selling-point badge.

SKU and white-background product materials are truth-critical inputs. Model and standardized display images may be AI-generated only under category-specific instruction presets that preserve CURRENT product colors, patterns, set contents, size/shape, and visible structure.

The previous mens-socks 1000x1200 hero template is deprecated, not deleted, so historical design tasks remain auditable.

## AI Design Instruction Library

`design_instruction_presets` is the shared instruction source for both manual Design Center operation and future batch spreadsheet imports. V1 seeds:
- MIWA unified Product Tag Card
- unified square hero layout
- socks white-background model generation
- socks white-background flat-lay set display

Manual page editing and future batch imports must write/reference the same underlying design fields and preset IDs.

## Validation sequence

1. Validate one real socks Product end-to-end through tag card + hero design task.
2. Validate a structurally different category such as women’s hats without duplicating tables or hero components.
3. Only after both pass, lock the cross-category Product Freeze and expand to the remaining detail-image pages.
