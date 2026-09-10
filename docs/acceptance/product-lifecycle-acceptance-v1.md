# AIONE Product Lifecycle Acceptance V1

Status: VALIDATING

## Purpose

Validate the real Product lifecycle truth for the only CURRENT AIONE baseline after Selection Backend Closure V1 passed.

## Human-confirmed source object

- Source platform: `1688`
- Source product ID: `855305580969`
- Current ProductOpportunity lifecycle truth: already `converted` before this acceptance run
- Human business confirmation: selected / keep as the formal Product candidate
- Decision confirmation channel: `02|AIONE系统`
- This acceptance is hard-locked to this source product ID. It must not mutate or operate on the other imported ProductOpportunity records.

## Lifecycle truth

This V1 acceptance does **not** replay a fake historical transition such as:

```text
pending -> selected -> converted
```

The real object is already converted. Therefore the contract is:

```text
existing ProductOpportunity.converted
-> resolve exactly one existing Product
-> verify Product / SKU / source relation / conversion metadata
-> call conversion again and prove idempotent reuse
-> record today's human confirmation as a separate business event
-> keep ProductOpportunity.converted
```

No lifecycle reset, duplicate ProductOpportunity, replacement Product, or second operational baseline is permitted.

## Formal Product requirements

The existing formal Product must:

- exist exactly once for the ProductOpportunity;
- have a valid `MHxxxxxxx` Product code;
- remain linked through `source_opportunity_id`;
- retain source platform, source product ID and source URL;
- preserve selection number and source weight in Product data;
- match `convertedProductId` and `convertedProductCode` stored on ProductOpportunity metadata;
- retain its existing draft SKU set with SKU codes under the same Product code;
- be returned unchanged on repeated conversion attempts rather than creating a duplicate.

## Human confirmation evidence

The user explicitly confirmed source product ID `855305580969` in `02|AIONE系统` on 2026-09-10.

Because the historical ProductOpportunity was already converted, this acceptance must not pretend that today's confirmation caused the historical conversion. Instead it records one idempotent `selection.human_confirmation_recorded` business event with:

- `actor_kind = system` for the technical executor;
- no fabricated `personId`;
- payload `confirmedByHuman = true`;
- confirmation channel `02|AIONE系统`;
- source product ID `855305580969`;
- historical lifecycle status recorded as evidence.

Future production UI/API writes continue to require the authenticated human actor contract.

## Cost truth

The 1688 source price is source procurement information in CNY. It is not the final Product cost. Product Lifecycle Acceptance V1 requires `Product.cost_amount` to remain unset for this product until the Product Backend cost model is implemented. The existing Product currency field is not evidence of a completed cost calculation.

## Completion evidence

The runner must finish with:

```text
[AIONE] PRODUCT LIFECYCLE ACCEPTANCE V1 PASS
```

Only then may this document status be changed from `VALIDATING` to `LOCKED`.
