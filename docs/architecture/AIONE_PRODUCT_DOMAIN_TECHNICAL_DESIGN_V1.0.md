# AIONE Product Domain Technical Design V1.0

Status: VALIDATING
Date: 2026-09-01
Scope: Product / Variant / SKU / Listing domain model and database boundaries
Depends on: `AIONE_PRODUCT_HOME_V1_PRODUCT_FREEZE.md`

## 1. Architecture Truth

商品之家不是页面集合，而是 AIONE 商品领域的统一事实层。

核心关系锁定为：

`Product -> Variant -> SKU -> Listing`

同时支持：

- Category
- Brand
- Attribute / Attribute Value
- Specification
- Product Asset
- Bundle / Kit
- Cost Profile
- Pricing Profile
- Channel Mapping

原则：一份商品事实只保存一次；渠道页面、选品页面、上架页面只读取/操作同一 Product Domain。

## 2. Product

Product 是 AIONE 商品主对象，表示稳定的商品概念。

Product 不等于供应商商品，不等于 Rakuten 商品页，不等于 SKU。

建议稳定字段：

- id
- code
- canonical_name
- product_type: physical | digital | service | other
- lifecycle_status: draft | active | paused | discontinued | archived
- origin_selection_mode: DIRECT | REGULAR | DEVELOPMENT | OTHER
- current_selection_mode: DIRECT | REGULAR | DEVELOPMENT | OTHER
- category_id
- brand_id
- owner_person_id
- business_id
- source_platform
- source_url
- source_product_id
- metadata
- created_at / updated_at
- created_by_person_id / updated_by_person_id
- record_version
- archived_at

`origin_selection_mode` 不随升级改变，用于长期追溯直发来源。

## 3. Variant

Variant 表示 Product 下由一个或多个可变维度形成的商品变体。

例：

- Black / 24-27cm
- Blue / 24-27cm
- 500ml / White

Variant 自身不承担平台 Listing 语义。

建议字段：

- id
- product_id
- code
- display_name
- status
- option_signature JSONB
- sort_order
- metadata
- audit fields

`option_signature` 只保存已标准化的 Attribute Value / Size / Color 关系摘要；正式主数据仍通过关系表引用。

## 4. SKU

SKU 是可采购、库存、销售、履约的最小业务单位。

建议字段：

- id
- product_id
- variant_id nullable
- sku_code
- barcode / jan_code nullable
- status
- inventory_tracking_mode
- purchase_unit
- sales_unit
- weight_g nullable
- metadata
- audit fields

规则：

- `sku_code` 全平台唯一。
- 一个 Product 可以直接只有一个 SKU，不要求强制创建 Variant。
- Variant 是业务变体，不应被当作库存事实替代 SKU。

## 5. Listing

Listing 是 AIONE Product / SKU 在具体渠道、店铺中的销售实例。

Listing 属于渠道经营事实，不反向定义 Product。

建议字段：

- id
- product_id
- channel_code
- store_id / store_code
- external_listing_id
- external_parent_id nullable
- listing_status: draft | ready | publishing | published | paused | rejected | ended
- listing_type: standard | variation_parent | variation_child | bundle
- currency
- sales_price
- compare_at_price nullable
- published_at
- last_synced_at
- metadata
- audit fields

唯一性建议：

`UNIQUE(channel_code, store_code, external_listing_id)` when external_listing_id is present.

## 6. Listing SKU Mapping

一个 Listing 可能映射一个或多个 SKU；一个 SKU 也可能出现在多个渠道 Listing 中。

正式采用关系表：

`listing_skus`

字段：

- listing_id
- sku_id
- external_sku_id nullable
- role: primary | variation | component
- quantity
- metadata

这使 Rakuten / Amazon 不同父子与 variation 规则留在 Listing 层。

## 7. Bundle / Kit

Bundle 不等于普通 Variant。

采用：

- bundles
- bundle_components

Bundle 可作为一个 Product 的销售结构，也可映射多个 SKU。

`bundle_components` 至少保存：

- bundle_id
- component_sku_id
- quantity
- sort_order

库存与成本以后由组件数量推导。

## 8. Category

Category 是 AIONE 自有分类事实源。

树结构：

- id
- parent_id
- level
- code
- name_zh
- name_ja nullable
- status
- sort_order
- metadata

外部平台分类必须通过 mapping 表：

`category_channel_mappings`

不把 Rakuten / Amazon / 1688 分类直接写进 Product 作为唯一分类事实。

## 9. Brand

Brand 独立主数据：

- id
- code
- canonical_name
- name_ja / name_en nullable
- brand_type: own | external | unbranded
- status
- authorization_status
- risk_status
- metadata

`无品牌` 应作为明确的 canonical Brand 记录，而不是 NULL 代表无品牌。

## 10. Attribute / Specification Boundary

Attribute 表达可枚举特征和业务语义。

Specification 表达可测量、可比较、通常带单位的事实。

例：

- Color / Season / Material Group -> Attribute
- Weight / Length / Capacity / Thickness -> Specification

颜色、尺码作为标准字典被 Variant/SKU 调用，不允许直接使用供应商自由文本成为 canonical 值。

## 11. Product Asset

Product Asset 统一管理图片、视频、PDF、尺寸图、规格图等。

核心字段：

- id
- product_id
- variant_id nullable
- sku_id nullable
- asset_type
- role
- uri / storage_ref
- source_type: supplier | upload | ai_generated | system_generated
- status
- version
- metadata

Listing 只引用 Product Asset，不复制资产本体。

## 12. Cost / Pricing

成本与定价不嵌入 products 表。

采用独立 profile / snapshot 模型：

- product_cost_profiles
- product_price_profiles

允许：

- DIRECT policy
- REGULAR policy
- DEVELOPMENT policy

同一 Product 可保留历史成本/价格版本，供审计和订单利润回放。

## 13. 直发商品关系

商品机会仍使用现有 `public.product_opportunities` 作为选品候选事实。

当商品机会进入正式商品之家时：

`product_opportunity -> Product`

关系不通过复制字段隐式表达，建议写入 `object_relations`：

- from: product_opportunity
- to: product
- relation_type: materialized_as_product

直发商品：

- origin_selection_mode = DIRECT
- current_selection_mode = DIRECT

后续升级常规只修改 current_selection_mode，并写 business_event / history，不创建第二 Product。

## 14. Object Registry Integration

Product / Variant / SKU / Listing 至少 Product 必须进入 `object_registry`。

建议：

- Product: required
- Variant: optional V1
- SKU: required when inventory/commerce starts
- Listing: required when publishing starts

这样评论、关注、附件、AI摘要、工作事项、审计等平台能力可通过统一对象底座复用。

## 15. ID Strategy

V1 沿用 Repo 当前 TEXT id 体系，不在本次强行引入 UUID 迁移。

建议前缀：

- product: `prd_...`
- variant: `var_...`
- sku: `sku_...`
- listing: `lst_...`
- category: `cat_...`
- brand: `brd_...`

ID 生成必须由 Application/Service 层统一完成，不由页面拼接。

## 16. Audit / Soft Delete

所有正式主数据表默认：

- created_at
- updated_at
- created_by_person_id
- updated_by_person_id
- record_version
- source_system
- archived_at

删除默认采用 archive / status，不允许普通 UI 对已产生 Listing/订单关系的 Product 物理删除。

## 17. API Boundary

未来 API 应以领域对象而非页面命名：

- `/api/v1/products`
- `/api/v1/products/{id}`
- `/api/v1/products/{id}/variants`
- `/api/v1/products/{id}/skus`
- `/api/v1/products/{id}/listings`
- `/api/v1/categories`
- `/api/v1/brands`

禁止出现 `/product-home-page-data` 这种页面耦合 API。

## 18. V1 Implementation Order

1. Product / Category / Brand schema
2. Variant / SKU schema
3. Listing + listing_skus
4. Attribute / Specification schema
5. Product Asset
6. Bundle
7. Cost / Pricing bridge
8. Product Workspace API
9. 商品中心页面
10. 直发商品首批 materialization

## 19. Explicit Non-goals

本设计不在本轮直接决定：

- Rakuten API 最终字段全集
- Amazon variation theme 细节
- 库存账本实现
- 订单表实现
- Product Asset AI 生成流程
- Cost Engine 公式细节
- Pricing Engine 公式细节

这些能力必须建立在本领域模型上，而不是反过来改变 Product 核心结构。
