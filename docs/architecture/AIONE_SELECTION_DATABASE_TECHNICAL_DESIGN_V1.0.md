# AIONE选品数据库 Technical Design V1.0

状态：TECHNICAL DESIGN / DRAFT FOR IMPLEMENTATION
日期：2026-09-08
适用项目：美和AIONE一体化工作平台
目标分支：docs/aione-1688-image-standard-v1

## 1. 阶段结论

选品入口Product Freeze已完成，可以进入数据库与Import API技术设计。

本设计不新建第二套商品机会、分类或商品表，而是在main现有Canonical Schema上增量演进。

## 2. Implementation Truth

main已经存在PostgreSQL数据库底座，并通过Node.js `pg`直接访问数据库；迁移文件位于`data-code/migrations/`，由`apps/systems/aione/backend/scripts/migrate.js`按数字前缀执行。

main的`0080_p0_direct_listing_foundation.sql`已经建立：

```text
product_categories
product_opportunities
products
category_slots
channel_listings
publishing_jobs
```

因此本轮严禁再创建第二套：

```text
selection_products
selection_opportunities_v2
product_categories_v2
products_v2
```

必须演进现有`product_opportunities`。

## 3. 当前Schema与Product Freeze差异

### 3.1 已可直接复用

`product_opportunities`现有字段：

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

这与当前Product Freeze的外部去重键完全一致。因此：

> `source_ref`继续作为统一外部商品ID字段。1688场景下，`source_ref = 1688商品ID`。

不新增重复的`source_item_id`列。

### 3.2 必须新增

`product_opportunities`增量增加：

```text
selection_no              TEXT UNIQUE NOT NULL after backfill
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

说明：

- `selection_no`：`xpYYMMDDNNN`，系统自动生成，永久不变。
- `selection_date`：正式统计和编号日期依据，不通过解析编号统计。
- `category_id`继续是AIONE正式分类唯一FK。
- `classification_*`只描述自动分类结果，不建立第二套分类。
- `converted_product_id`用于快速追溯；真实Canonical关系仍由`products.source_opportunity_id`唯一FK保证，两边必须事务内一致。

## 4. ProductOpportunity状态收口

Product Freeze CURRENT：

```text
pending
selected
rejected
converted
```

main当前旧状态为：

```text
discovered
reviewing
qualified
rejected
converted
archived
```

因此不能直接修改CHECK Constraint并上线。

### 4.1 候选映射

技术候选：

```text
discovered -> pending
reviewing  -> pending
qualified  -> selected
rejected   -> rejected
converted  -> converted
```

`archived`不能在没有真实数据审计前自动解释为`rejected`。

### 4.2 迁移前强制Preflight

必须先读取线上/目标Cloud SQL中：

```sql
SELECT lifecycle_status, COUNT(*)
FROM public.product_opportunities
GROUP BY lifecycle_status;
```

并检查`archived`记录实际含义。

在该事实没有确认前：

> 不创建0090正式状态迁移，不修改线上CHECK Constraint。

这是当前唯一数据库迁移阻塞项。

## 5. 选品编号实现

编号格式：

```text
xpYYMMDDNNN
```

不使用“查询当天最大编号 + 1”的无锁方案，因为多人/批量并发时会产生重复。

新增轻量计数表：

```text
selection_number_counters
- selection_date DATE PRIMARY KEY
- last_number INTEGER NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
```

分配编号必须在数据库事务中原子执行：

```text
INSERT ... ON CONFLICT ... DO UPDATE
RETURNING last_number
```

然后格式化为：

```text
xp + YYMMDD + LPAD(last_number, 3, '0')
```

如果当日超过999，不允许静默产生重复或截断，应明确报错并升级编号标准后再继续。

## 6. Import Batch Schema

新增Canonical技术表：

```text
selection_import_batches
```

V1字段：

```text
id                       TEXT PRIMARY KEY
source_type              TEXT NOT NULL
source_file_name         TEXT NOT NULL
source_file_path         TEXT NOT NULL
source_file_hash         TEXT
status                   TEXT NOT NULL
record_count             INTEGER NOT NULL DEFAULT 0
created_count            INTEGER NOT NULL DEFAULT 0
updated_count            INTEGER NOT NULL DEFAULT 0
skipped_count            INTEGER NOT NULL DEFAULT 0
error_count              INTEGER NOT NULL DEFAULT 0
auto_classified_count    INTEGER NOT NULL DEFAULT 0
classification_review_count INTEGER NOT NULL DEFAULT 0
result_data              JSONB NOT NULL DEFAULT '{}'
started_at               TIMESTAMPTZ
finished_at              TIMESTAMPTZ
created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
created_by_person_id     TEXT
source_system            TEXT NOT NULL DEFAULT 'aione'
```

状态仅：

```text
pending
processing
completed
failed
```

文件hash如存在，应建立唯一或条件唯一保护；具体hash算法属于Import Service实现，不写进业务Schema。

### 6.1 不创建Import Batch Item表（V1）

当前真实需求只要求批次追踪、计数和少量失败行信息。

V1把行级错误摘要放入`result_data.errors`，不立即创建`selection_import_batch_items`。

只有真实运行证明需要逐行重试、逐行审计或超大批次查询时，再拆独立Item表。

## 7. 自动分类数据库边界

正式分类仍只有：

```text
product_categories
product_opportunities.category_id
```

自动分类过程只写：

```text
category_id
classification_status
classification_confidence
classification_method
```

建议状态：

```text
classified
needs_review
failed
```

建议方法：

```text
mapping
rule
ai
human
```

AI不能新增`product_categories`节点。

Mapping规则第一阶段不单独建复杂规则平台；可先由Service配置/Repo事实实现。待映射规模扩大后再评估Canonical Mapping表。

## 8. 外部字段更新实现

Import Service对已有`source_platform + source_ref`执行UPSERT式业务逻辑，但不是无差别SQL覆盖。

允许刷新：

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

保护：

```text
selection_no
selection_date
lifecycle_status
owner_person_id
category_id（除自动分类明确允许的场景）
created_by_person_id
created_at
converted_product_id
```

空值默认不覆盖已有有效值。

## 9. Product转换事务

转换`selected -> converted`必须使用现有`withTransaction()`。

事务内完成：

```text
1. 锁定ProductOpportunity
2. 验证status=selected
3. 验证category_id存在
4. 生成正式mh000000x Product ID
5. INSERT products(source_opportunity_id=...)
6. UPDATE product_opportunities.lifecycle_status='converted'
7. 写converted_product_id
8. 写business_event / audit
9. COMMIT
```

任何一步失败全部ROLLBACK。

正式商品ID生成机制当前main尚无`mh000000x`生成器，需在后续Product ID Technical Design中单独实现，不在选品导入Schema中临时硬编码。

## 10. 旧前端Mock治理

main仍存在：

```text
apps/systems/aione/js/data/selection-opportunities.js
```

其中旧Mock编号为：

```text
XP20260811000001
```

并且旧`stage`包含：

```text
opportunity / data / pricing / cost / decision
```

这与当前Product Freeze不再一致。

治理结论：

- 该文件属于旧Implementation/Mock，不得反推CURRENT Product Truth。
- 后续选品页面接真实API时应移除其业务事实地位。
- 旧编号不迁入新的`xpYYMMDDNNN`正式编号体系，除非真实数据库中确有历史正式记录需要单独迁移。
- 应进入Deprecated治理，而不是继续维护第二套状态。

## 11. API边界

不把选品导入塞进通用`core.js` CRUD。

原因：导入包含：

- 文件解析
- 去重
- 编号事务
- 分类
- 字段保护
- 批次统计
- 部分失败

应建立专用Application Service与Route，例如：

```text
src/services/selection-import-service.js
src/services/selection-number-service.js
src/services/selection-classification-service.js
src/routes/selection-imports.js
```

候选API：

```text
POST /api/selection/imports
GET  /api/selection/imports/:id
GET  /api/product-opportunities
GET  /api/product-opportunities/:id
PATCH /api/product-opportunities/:id
POST /api/product-opportunities/:id/convert
```

Google Drive监听/取文件是Integration Adapter，不进入Domain对象。

## 12. 迁移顺序

当前建议下一迁移编号：

```text
0090_selection_opportunity_import_foundation.sql
```

但创建正式DDL前必须完成Cloud SQL只读Preflight，确认：

- 0080是否已实际应用
- product_opportunities真实字段与约束
- lifecycle_status真实值分布
- 是否存在历史archived记录
- source_platform + source_ref是否有重复/空值
- 是否已有selection_no类字段

确认后才生成0090，不直接猜线上事实。

## 13. 不做的事情

V1不做：

- 第二套选品表
- 第二套分类表
- Prisma / Drizzle等新ORM
- 为每一行导入建立复杂审批对象
- 让Excel直接更新正式Product
- 让AI自由创建分类
- 在未Preflight前修改Cloud SQL

## 14. Technical Design Gate

当前结论：

```text
Product Freeze          = PASS
Repo Implementation Audit = PASS
Schema Extension Design = PASS
Cloud SQL Preflight     = REQUIRED / NEXT
Migration 0090          = BLOCKED UNTIL PREFLIGHT
Import API coding       = AFTER 0090 SCHEMA CONFIRMED
```

下一步不再继续讨论字段，应执行数据库只读Preflight并根据真实结果生成0090迁移。