# AIONE Cloud SQL 实例基线 V1.0

状态：CURRENT / FORMAL DATABASE BASELINE LOCKED
日期：2026-09-08
适用项目：美和AIONE一体化工作平台

## 1. 正式数据库基线

2026-09-08完成双实例只读 Preflight 后，正式锁定：

```text
FORMAL CURRENT Cloud SQL = aione-pg-dev
LEGACY DATABASE / HISTORICAL SOURCE = aione-postgres
```

实例名称中的 `dev` 不代表治理状态；CURRENT 由实际 Schema、迁移和后续正式开发方向决定。

## 2. 双实例事实

### aione-postgres

- 早期实例，创建于 2026-08-19。
- 旧 `product_opportunities` 仍为早期结构。
- Migration 仅到 0070。
- 关键盘点：`people=7`、`external_identities=7`、`product_opportunities=1`、`activity_logs=2`。
- 继续保留作为历史回查与必要的个别迁移来源；不得继续新增正式 Schema。

### aione-pg-dev

- 新实例，创建于 2026-08-31。
- 已采用当前 Canonical Schema 方向。
- 关键盘点：`people=7`、`external_identities=3`、`product_opportunities=1`。
- Migration 已到 0091（product assets and channel image mapping）。
- 与 CURRENT main 的正式开发方向一致，因此锁定为正式数据库基线。

## 3. 旧数据治理

禁止整库复制。

阶段结论：

- `people`：CURRENT 库已有 7 条 Canonical People，不批量复制旧库。
- `external_identities`：CURRENT 库已有 3 条，旧库 7 条不得盲目复制；如真实身份缺失，逐条核对迁移。
- `product_opportunities`：新旧各 1 条，不盲目复制；旧记录保留供逐条核对。
- `activity_logs`：旧库 2 条作为历史证据保留，不把旧表结构复制到 CURRENT Schema。

`aione-postgres` 当前不得删除、清空或重建；删除需要独立审批。

## 4. Runtime 验证事实

曾使用旧运行镜像：

```text
aione-backend:v1.9.40
```

创建独立验证服务 `aione-backend-pgdev-check` 连接 `aione-pg-dev`。

`/health` 返回数据库连接成功并识别 migration 0091，因此仅证明：

```text
Old v1.9.40 process startup with aione-pg-dev = PASS
Database connectivity                              = PASS
Migration visibility                               = PASS (0091)
```

随后对同一验证服务请求：

```text
GET /api/v1/me
```

返回 `not_found`。

而 CURRENT main 已正式注册 `/api/v1/me`，因此：

> `aione-backend:v1.9.40` 不是 CURRENT main backend。

不得再把旧镜像的 `/health` 成功解释为“CURRENT Runtime Compatibility PASS”。

## 5. 正式工程关系

CURRENT 治理基线：

```text
Code     = GitHub main
Database = aione-pg-dev
```

旧前端、旧 Backend、旧 Cloud Run Revision、`aione-postgres` 只作为 Legacy Source；不得反向定义 CURRENT。

旧 Sidebar / Aside / 旧 Shell 已废止，禁止回流新工程。

下一阶段目标是让 CURRENT main 的 Backend、API、Frontend 与 `aione-pg-dev` 组成唯一正式技术链路，而不是把旧 `aione-backend-v190` 直接切库后继续使用。

## 6. Governance Truth

- 所有新 Schema、Migration、选品数据库、Import API 只面向 `aione-pg-dev`。
- 不在 `aione-postgres` 增加正式 Schema。
- Legacy 数据只按真实需要逐条/逐对象迁移。
- 旧镜像 `v1.9.40` 仅证明数据库连接能力，不代表 CURRENT 代码兼容性。
- 在 CURRENT main Backend 构建、部署、Smoke Test 完成前，禁止执行旧生产 Backend 的数据库 Cutover。
- 正式运行链路必须最终统一到 CURRENT main + `aione-pg-dev`。

## 7. 当前工程门禁

```text
Formal DB Baseline             = PASS -> aione-pg-dev
Legacy Data Inventory          = PASS at aggregate level
Bulk Legacy Migration          = PROHIBITED
Old v1.9.40 DB Connectivity    = PASS
Current-main Runtime Alignment = NOT YET PROVEN
Old Runtime Cutover            = BLOCKED
Current-main Build/Deploy      = NEXT
Legacy DB Decommission         = BLOCKED / LATER
```

## 8. 禁止的旧结论

以下旧结论正式废止：

```text
Runtime Image Compatibility = PASS -> v1.9.40
Runtime Cutover             = READY
```

原因：它们把“旧镜像能够连接新数据库”错误等同于“CURRENT main 已完成运行兼容验证”。

后续不得根据该旧结论执行切换。