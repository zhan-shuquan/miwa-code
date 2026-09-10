# AIONE Product Lifecycle Acceptance V1

Status: LOCKED

## Purpose

Record the verified Product lifecycle truth for the only CURRENT AIONE baseline after Selection Backend Closure V1 passed.

## Verified object

- Source platform: `1688`
- Source product ID: `855305580969`
- ProductOpportunity lifecycle truth: already `converted` before this acceptance run
- Formal Product code: `MH0000002`
- Draft SKU observed in acceptance: `MH0000002-01`
- Human business confirmation channel: `02|AIONE系统`

## Verified lifecycle truth

This V1 acceptance did not replay a fake historical transition.

The verified contract is:

```text
existing ProductOpportunity.converted
-> resolve exactly one existing Product
-> verify Product / SKU / source relation / conversion metadata
-> reconcile missing source provenance without overwriting maintained values
-> call conversion again and prove idempotent reuse
-> record the 2026-09-10 human confirmation as a separate business event
-> keep ProductOpportunity.converted
```

No lifecycle reset, duplicate ProductOpportunity, replacement Product, or second operational baseline is permitted.

## Verified Product requirements

The existing formal Product was verified to:

- exist exactly once for the ProductOpportunity;
- have a valid `MHxxxxxxx` Product code;
- remain linked through `source_opportunity_id`;
- retain source platform and source product identity;
- retain canonical 1688 offer identity even when URL query parameters differ;
- preserve selection number and source weight in Product data;
- match `convertedProductId` and `convertedProductCode` stored on ProductOpportunity metadata;
- retain its draft SKU set under the same Product code;
- be returned unchanged on repeated conversion attempts rather than creating a duplicate.

## Human confirmation evidence

The user explicitly confirmed source product ID `855305580969` in `02|AIONE系统` on 2026-09-10.

Because the historical ProductOpportunity was already converted, the acceptance records this as one idempotent `selection.human_confirmation_recorded` business event. The technical executor uses `actor_kind = system`, no fabricated `personId`, and preserves the human confirmation in the event payload.

## Cost truth

The 1688 source price is source procurement information in CNY. It is not the final Product cost. Product Lifecycle Acceptance V1 requires `Product.cost_amount` to remain unset until the Product Backend cost model is implemented.

## Completion evidence

The CURRENT runner completed with:

```text
[AIONE] PRODUCT LIFECYCLE ACCEPTANCE V1 PASS
```

This acceptance is now LOCKED. Future changes must preserve the verified invariants above or introduce an explicit superseding contract.
