# AIONE Selection Read API V1

Status: validating

Purpose: provide the single backend read contract for AIONE 选品 before frontend implementation. Frontend must not query Cloud SQL directly and must not introduce a second ProductOpportunity model.

## Canonical object

- Domain object: `ProductOpportunity`
- Frontend/business term: `选品`
- Canonical table: `public.product_opportunities`
- CURRENT lifecycle: `pending | selected | rejected | converted`
- `我的选品` is a View/Scope of the same object, not a second table or object.

## Endpoints

### `GET /api/v1/selections`

Returns authenticated users a paginated list of canonical selection objects.

Supported query parameters:

- `limit`: 1-100, default 50
- `offset`: >= 0
- `q`: search across title, selection number, source product id, supplier name
- `scope=mine`: filter by current authenticated `owner_person_id`
- `lifecycleStatus`
- `sourcePlatform`
- `sourceGroup`
- `sourceFulfillmentHint`
- `categoryId`
- `businessId`
- `ownerPersonId`
- `sortBy`: `selectionDate | createdAt | updatedAt | sourcePrice | selectionNo`
- `sortDirection`: `asc | desc`

Response shape:

```json
{
  "items": [],
  "page": {
    "limit": 50,
    "offset": 0,
    "total": 0,
    "hasMore": false
  },
  "applied": {}
}
```

Each item includes canonical source facts such as:

- `id`
- `selectionNo`
- `selectionDate`
- `title`
- `lifecycleStatus`
- `sourcePlatform`
- `sourceRef`
- `sourceUrl`
- `sourceCoverImageUrl`
- `sourcePrice`
- `sourceCurrency`
- `sourceSupplierName`
- `sourceGroup`
- `sourceTags`
- `sourceNote`
- `sourceWeightG`
- `sourceFulfillmentHint`
- owner/category/business fields
- classification fields
- timestamps/version
- `sourceMaterialZip`
- `hasSourceMaterialZip`

### `GET /api/v1/selections/:id`

Returns one canonical selection object and, when conversion already occurred, the linked Product identity:

- `convertedProductId`
- `convertedProductCode`
- `convertedProductStatus`

## Architecture rules

1. Frontend reads through API only.
2. `选品` and `我的选品` reuse the same `ProductOpportunity` object.
3. 1688 group/tag/remark remain source facts; they do not create another selection type.
4. `直发选品` remains only `sourceFulfillmentHint=direct`.
5. ZIP evidence is exposed as source evidence only; formal media processing remains a later Asset pipeline.
6. Sort columns are whitelisted; raw client SQL identifiers are never accepted.
7. `scope=mine` resolves from authenticated AIONE identity rather than a client-supplied person id.

## Acceptance for V1

- Syntax/CI checks pass.
- CURRENT deployment remains healthy.
- List endpoint can return the real imported 1688 ProductOpportunity records.
- Detail endpoint returns one real record and ZIP evidence when available.
- Repeated reads do not mutate business data.
- Frontend implementation may begin only after this contract is validated against real CURRENT data.
