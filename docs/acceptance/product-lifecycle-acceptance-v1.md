# AIONE Product Lifecycle Acceptance V1

Status: VALIDATING

## Purpose

Validate one real business lifecycle against the only CURRENT AIONE baseline after Selection Backend Closure V1 passed.

## Human-confirmed source object

- Source platform: `1688`
- Source product ID: `855305580969`
- ProductOpportunity business decision: selected
- Decision confirmation channel: `02|AIONE系统`
- This acceptance is hard-locked to this source product ID. It must not select or convert the other imported ProductOpportunity records.

## Lifecycle contract

```text
ProductOpportunity.pending
-> ProductOpportunity.selected
-> Product.draft
-> ProductOpportunity.converted
```

The formal Product must:

- be created exactly once for the ProductOpportunity;
- receive a `MHxxxxxxx` Product code;
- retain the source ProductOpportunity relation and source identity;
- preserve selection number and source weight in Product data;
- write `convertedProductId` and `convertedProductCode` back to ProductOpportunity metadata;
- create exactly one draft SKU (`MHxxxxxxx-01`) for this V1 lifecycle acceptance;
- return the same Product on repeated conversion attempts rather than creating a duplicate.

## Actor truth

The business decision was explicitly made by a human in `02|AIONE系统`. The Cloud Run acceptance job is the technical executor, not a fabricated human identity. Therefore the acceptance execution records a system actor plus decision evidence in `qualification_data`; it does not invent a `personId`.

Future production UI/API writes continue to require the authenticated human actor contract.

## Cost truth

The 1688 source price is source procurement information in CNY. It is not the final Product cost. Product Lifecycle Acceptance V1 requires `Product.cost_amount` to remain unset for this product until the Product Backend cost model is implemented. The existing Product currency field is not evidence of a completed cost calculation.

## Completion evidence

The runner must finish with:

```text
[AIONE] PRODUCT LIFECYCLE ACCEPTANCE V1 PASS
```

Only then may this document status be changed from `VALIDATING` to `LOCKED`.
