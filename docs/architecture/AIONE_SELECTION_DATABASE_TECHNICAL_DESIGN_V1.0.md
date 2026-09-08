# AIONE选品数据库 Technical Design V1.0

状态：CURRENT / TECHNICAL DESIGN
日期：2026-09-08
适用项目：美和AIONE一体化工作平台

## 1. 阶段结论

选品入口 Product Freeze 已完成。AIONE 选品数据库不得新建第二套商品机会、分类或商品模型，必须在 CURRENT main 与 CURRENT Cloud SQL `aione-pg-dev` 的 Canonical Schema 上增量演进。

## 2. CURRENT Implementation Truth

CURRENT code baseline：`main`。

CURRENT database baseline：`aione-pg-dev`。

Repo 使用 PostgreSQL + Node.js `pg`，迁移文件位于 `data-code/migrations/`。当前 main 与 `aione-pg-dev` 已包含：

```text
0080 p0 direct listing foundation
0090 product identity and sku
0091 product assets and channel image mapping
```

因此后续选品迁移不得再使用 0090/0091；正式编号必须从当前最高迁移号之后继续，并在创建前检查 Repo 与目标数据库无编号冲突。

现有 Canonical 对象包括：

```text
product_categories
product_opportunities
products
category_slots
channel_listings
publishing_jobs
```

严禁创建第二套：

```text
selection_products
selection_opportunities_v2
product_categories_v2
products_v2
```

## 3. ProductOpportunity 增量设计

现有 `product_opportunities` 继续作为唯一商品机会对象。

复用字段：

```text
id
business_id
source_platform
source_ref
source_url
supplier_ref
title
selection_mode
lifecycle_status
owner_person_id
category_id
estimated_cost
estimated_sale_price
currency
qualification_data
metadata
created_at / updated_at
created_by_person_id / updated_by_person_id
record_version
source_system
archived_at
```

现有唯一约束：

```text
UNIQUE(source_platform, source_ref)
```

1688 场景：

```text
source_platform = 1688
source_ref      = 1688商品ID
```

不新增重复的 `source_item_id`。

建议增量字段：

```text
selection_no              TEXT UNIQUE
selection_date            DATE
source_category            TEXT
source_cover_image_url     TEXT
source_price               NUMERIC(18,4)
source_supplier_name       TEXT
source_group               TEXT
source_tags                TEXT[]
source_note                TEXT
source_added_at            TIMESTAMPTZ
first_imported_at          TIMESTAMPTZ
last_imported_at           TIMESTAMPTZ
classification_status      TEXT
classification_confidence  NUMERIC(4,3)
classification_method      TEXT
converted_product_id       TEXT
```

`selection_no` 在历史记录 backfill 完成前不应直接强制 NOT NULL。

## 4. ProductOpportunity CURRENT 状态

正式状态仅：

```text
pending
selected
rejected
converted
```

旧实现状态若仍存在，候选迁移：

```text
discovered -> pending
reviewing  -> pending
qualified  -> selected
rejected   -> rejected
converted  -> converted
```

`archived` 不得自动解释为 `rejected`。修改 CHECK Constraint 前，必须对 `aione-pg-dev` 中实际历史记录逐条/按状态审计。

## 5. 选品编号

正式格式：

```text
xpYYMMDDNNN
```

系统自动生成、每日从 001 起、永久不变。不得使用无锁 `MAX()+1`。

新增轻量计数表：

```text
selection_number_counters
- selection_date DATE PRIMARY KEY
- last_number INTEGER NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
```

编号分配必须在数据库事务内原子完成。当日超过 999 时明确报错并升级标准，不允许截断或重复。

`selection_date` 是统计事实字段；报表不得通过解析 `selection_no` 获取日期。

## 6. Import Batch

新增 Canonical 技术表：

```text
selection_import_batches
```

V1 字段：

```text
id
source_type
source_file_name
source_file_path
source_file_hash
status
record_count
created_count
updated_count
skipped_count
error_count
auto_classified_count
classification_review_count
result_data
started_at
finished_at
created_at
created_by_person_id
source_system
```

状态仅：

```text
pending
processing
completed
failed
```

V1 不创建逐行 Import Batch Item 表；失败行摘要先放 `result_data.errors`。只有真实运行证明需要逐行重试/审计时再拆表。

## 7. 自动分类边界

正式分类唯一事实源：

```text
product_categories
product_opportunities.category_id
```

自动分类只写：

```text
category_id
classification_status
classification_confidence
classification_method
```

AI 只能选择现有分类节点，不得创建新分类。

执行优先级：

```text
Mapping Rule -> deterministic rule -> AI -> Human Exception
```

低置信度、冲突、未映射进入待确认分类。

## 8. 重复导入与字段保护

去重键：

```text
source_platform + source_ref
```

重复导入同一外部机会不得生成新的 `selection_no`。

允许刷新外部来源字段，例如：

```text
title
source_url
source_cover_image_url
source_price
source_supplier_name
source_group
source_tags
source_note
last_imported_at
```

不得由 Excel 覆盖 AIONE 内部事实：

```text
selection_no
selection_date
lifecycle_status
owner_person_id
category_id（除明确的自动分类流程）
created_by_person_id
created_at
converted_product_id
```

空值默认不覆盖已有有效值。

## 9. Product 转换事务

`selected -> converted` 必须事务化：

```text
1. 锁定 ProductOpportunity
2. 验证 lifecycle_status = selected
3. 验证 category_id 已明确
4. 创建正式 Product
5. 原子生成美和系统商品ID，例如 mh0000002
6. 建立 Product.source_opportunity_id 关系
7. 更新 ProductOpportunity 为 converted
8. 写 converted_product_id
9. 写 audit / business event
10. COMMIT
```

任何一步失败全部 ROLLBACK。

SKU、图片素材不是创建正式 Product 的阻塞条件，可以在 Product 创建后继续补全。

## 10. API / Service 边界

选品导入不得塞入通用 CRUD。应使用专用 Application Service，例如：

```text
src/services/selection-import-service.js
src/services/selection-number-service.js
src/services/selection-classification-service.js
src/routes/selection-imports.js
```

候选 API：

```text
POST /api/selection/imports
GET  /api/selection/imports/:id
GET  /api/product-opportunities
GET  /api/product-opportunities/:id
PATCH /api/product-opportunities/:id
POST /api/product-opportunities/:id/convert
```

Google Drive 取文件属于 Integration Adapter，不进入 Domain 对象。

## 11. Legacy / Mock 治理

旧 Mock 编号、旧 stage、旧 Sidebar/Aside 以及旧数据库结构均不得反推 CURRENT Product Truth。

旧数据只作为迁移来源；有价值的数据迁入 CURRENT，无价值实现进入 Deprecated，禁止维护第二套业务事实。

## 12. 下一迁移门禁

数据库实例与 Schema 基线 Preflight 已完成：`aione-pg-dev` 为 CURRENT，迁移已到 0091。

下一步不再重复做实例选择，而是：

```text
1. 审计 aione-pg-dev 当前 ProductOpportunity 的实际 lifecycle_status 数据
2. 确认下一可用 migration number（必须 > 0091 且无冲突）
3. 生成 selection opportunity/import foundation migration
4. 在 aione-pg-dev 执行 migration preflight
5. 再进入 Import Service / API 实现
```

## 13. Technical Design Gate

```text
Product Freeze              = PASS
CURRENT Code Baseline       = PASS -> main
CURRENT Database Baseline   = PASS -> aione-pg-dev
Schema Baseline             = PASS -> through 0091
Selection Schema Design     = PASS
Legacy Bulk Copy            = PROHIBITED
Next Selection Migration    = READY AFTER DATA-LEVEL STATUS AUDIT
Import API Coding           = AFTER MIGRATION CONFIRMED
```

本文件是选品数据库 CURRENT 技术设计；旧的“0090 为下一迁移”结论废止。