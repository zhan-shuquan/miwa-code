# AIONE Cloud SQL 实例基线 V1.0

状态：CURRENT / FORMAL DATABASE BASELINE LOCKED
日期：2026-09-08
适用项目：美和AIONE一体化工作平台

## 1. 正式数据库基线结论

2026-09-08完成双实例只读Preflight后，正式锁定：

```text
FORMAL CURRENT Cloud SQL = aione-pg-dev
LEGACY RUNTIME / MIGRATION SOURCE = aione-postgres
```

理由不是实例名称，而是实际Schema与迁移事实。

## 2. 双实例事实

### aione-postgres

创建时间：

```text
2026-08-19T05:39:12.153Z
```

当前Cloud Run `aione-backend-v190`仍连接该实例。

其`product_opportunities`仍为早期旧结构，包含：

```text
opportunity_id
selection_type
product_name
source_platform
source_url
representative_image_url
current_stage
result_status
owner_person_id
...
```

该结构与Repo当前Canonical Schema不一致，因此不再作为后续正式Schema演进目标。

### aione-pg-dev

创建时间：

```text
2026-08-31T10:06:52.199Z
```

双实例Preflight已成功连接并完成。

其`product_opportunities`已采用当前Canonical方向字段，包括：

```text
id
business_id
source_platform
source_ref
record_version
source_system
archived_at
...
```

并确认迁移记录至少已经到：

```text
0091 | product assets and channel image mapping
applied_at = 2026-09-07T09:16:21.377Z
```

该Schema与Repo当前Technical Design方向一致，因此锁定为后续正式开发数据库基线。

## 3. Governance Truth

从本结论生效后：

- 所有新的正式Schema、Migration、选品数据库、Import API均只面向`aione-pg-dev`。
- 不再在`aione-postgres`继续新增正式Schema。
- `aione-postgres`暂不删除，只作为旧运行环境和数据迁移来源。
- 在切换Cloud Run前，必须审计`aione-postgres`中需要保留的真实业务数据，并迁移到`aione-pg-dev`。
- 数据迁移和运行时切换完成、验证通过后，`aione-postgres`进入Deprecated/待下线治理。

## 4. 下一阶段顺序

```text
1. 锁定 aione-pg-dev 为正式数据库基线
2. 只读盘点 aione-postgres 需要保留的真实数据
3. 生成明确的数据迁移计划与映射
4. 迁移需要保留的数据到 aione-pg-dev
5. 验证数据完整性
6. 将 aione-backend-v190 切换连接到 aione-pg-dev
7. 运行Preflight与业务Smoke Test
8. 验证通过后停止在 aione-postgres 写入
9. 再进入新的正式Migration与选品Import API开发
```

## 5. 禁止事项

在完成旧数据盘点前：

- 不删除`aione-postgres`
- 不清空旧表
- 不直接覆盖旧数据
- 不把两个实例长期并行作为CURRENT
- 不在旧实例继续执行新的正式业务Migration

## 6. 当前工程门禁

```text
Formal DB Baseline        = PASS -> aione-pg-dev
Legacy Data Inventory     = NEXT
Runtime Cutover           = BLOCKED UNTIL DATA INVENTORY/MIGRATION
New Selection Migration   = AFTER BASELINE CLEANUP CONFIRMED
```
