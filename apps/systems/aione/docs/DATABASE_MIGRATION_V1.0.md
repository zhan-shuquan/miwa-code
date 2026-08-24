# AIONE PostgreSQL迁移方案 V1.0

**状态：候选，尚未对线上Cloud SQL执行。**

## 1. 安全原则

本轮迁移为纯增量：

- 不 `DROP`
- 不 `TRUNCATE`
- 不改名现有四张核心表
- 不覆盖现有选品数据
- 不在未确认 `people.id` 类型前添加强制人物外键

## 2. 迁移文件

按顺序：

1. `0001_schema_migrations.sql`
2. `0010_core_business_model.sql`
3. `0020_work_time_money_result.sql`
4. `0030_events_knowledge_ai.sql`
5. `0040_legacy_bridge_notes.sql`
6. `0050_ai_office_orchestration.sql`

## 3. 上线前Preflight

在有Cloud SQL连接环境中先执行。V1.9正式推荐通过 `infra/gcp/cloud-shell/03_DB_PREFLIGHT.sh` 以Cloud Run Job执行；本地/专用运维环境仍可直接运行：

```bash
cd apps/systems/aione/backend
npm run db:preflight
```

必须确认：

- `people / external_identities / product_opportunities / activity_logs` 是否仍存在
- `people.id` 的实际数据类型
- `product_opportunities` 当前列结构
- 当前数据库是否已有同名新表

Preflight只读，不修改数据库。

## 4. 执行迁移

确认Preflight结果后。V1.9正式推荐通过 `infra/gcp/cloud-shell/04_DB_MIGRATE.sh` 以Cloud Run Job执行并保留Cloud Logging记录；本地/专用运维环境仍可直接运行：

```bash
npm run db:migrate
```

迁移器按文件名前缀排序，并写入 `schema_migrations`，已应用版本不会重复执行。

## 5. 当前不做的迁移

- 不把localStorage工作事项自动搬到数据库
- 不重构 `product_opportunities`
- 不迁移测样旧页面
- 不一次建立ERP全部专业表
- 不一次建立HR工资/福利全部字段

第6阶段目标是先建立稳定主骨架，后续按真实业务对象逐个增加专业Schema。
