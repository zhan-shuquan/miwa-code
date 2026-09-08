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

当前Cloud Run `aione-backend-v190`仍连接该实例，Revision为：

```text
aione-backend-v190-00012-r2r
```

运行镜像：

```text
asia-northeast1-docker.pkg.dev/miwa-aione/aione/aione-backend:v1.9.40
```

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

旧库关键数据盘点：

```text
people                 = 7
external_identities    = 7
product_opportunities  = 1
activity_logs          = 2
```

旧库Migration到`0070`。

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
selection_code
...
```

当前关键数据：

```text
people                 = 7
external_identities    = 3
product_opportunities  = 1
```

确认迁移记录已到：

```text
0091 | product assets and channel image mapping
applied_at = 2026-09-07T09:16:21.377Z
```

该Schema与Repo当前Canonical Technical Design方向一致，因此锁定为后续正式开发数据库基线。

## 3. 旧数据迁移判断

根据当前盘点，禁止整库复制。

阶段结论：

- `people`：新库已有7条Canonical People，不批量迁移旧7条。
- `external_identities`：新库已有重新整理后的3条，不直接复制旧7条。
- `product_opportunities`：新旧库各1条，禁止盲目复制，旧记录保留在Legacy库供后续个别核对。
- `activity_logs`：旧库2条；新Canonical库当前无旧`activity_logs`表，不迁入正式业务Schema，保留在Legacy库作为历史记录。

`aione-postgres`在当前阶段继续保留，不删除、不清空，作为历史回查与必要的个别数据迁移来源。

## 4. Runtime兼容性验证

2026-09-08已使用当前生产同一镜像：

```text
aione-backend:v1.9.40
```

部署独立验证服务：

```text
aione-backend-pgdev-check
```

该服务只连接`aione-pg-dev`，Health Check返回：

```json
{
  "ok": true,
  "service": "aione-backend",
  "apiVersion": "v1",
  "database": "connected",
  "latestMigration": {
    "version": "0091"
  }
}
```

因此：

```text
Runtime Image Compatibility = PASS
Database Connectivity       = PASS
Migration Baseline          = PASS (0091)
```

这证明当前生产镜像`v1.9.40`可以连接并启动于`aione-pg-dev`。

## 5. Governance Truth

从本结论生效后：

- 所有新的正式Schema、Migration、选品数据库、Import API均只面向`aione-pg-dev`。
- 不再在`aione-postgres`继续新增正式Schema。
- `aione-postgres`暂不删除，作为Legacy历史与必要迁移来源。
- 不执行整库复制。
- Runtime Cutover完成并通过Smoke Test后，`aione-backend-v190`正式连接`aione-pg-dev`。
- Cutover稳定后，`aione-postgres`进入Deprecated/待下线治理，但删除必须另行审批。

## 6. 当前工程门禁

```text
Formal DB Baseline        = PASS -> aione-pg-dev
Legacy Data Inventory     = PASS
Bulk Legacy Migration     = NOT REQUIRED / PROHIBITED
Runtime Image Check       = PASS -> v1.9.40
Runtime Cutover           = READY
Post-cutover Smoke Test   = NEXT
Legacy DB Decommission    = BLOCKED / LATER
```

## 7. Runtime Cutover基线

切换前：

```text
Service      = aione-backend-v190
Cloud SQL    = aione-postgres
DB secret    = aione-db-password
DB user      = aione_app
DB name      = aione
Image        = aione-backend:v1.9.40
```

切换目标：

```text
Service      = aione-backend-v190
Cloud SQL    = aione-pg-dev
DB secret    = aione-db-password-dev
DB user      = aione_app
DB name      = aione
Image        = aione-backend:v1.9.40
```

Cutover不改变镜像，只改变数据库连接配置；如Health Check或关键Smoke Test失败，应立即回滚到上述切换前配置。
