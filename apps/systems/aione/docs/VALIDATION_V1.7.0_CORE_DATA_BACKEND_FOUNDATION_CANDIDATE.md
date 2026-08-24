# AIONE V1.7.0｜核心数据与后端基础验证记录

**日期：** 2026-08-22  
**状态：** CANDIDATE  
**重要边界：** 本记录证明代码、契约与迁移资产达到候选状态；**没有证明线上Cloud SQL已完成迁移**。

## 1. 自动验证结果

已通过：

- `V1.7_DATABASE_BACKEND_FOUNDATION_OK`
- V1.6 Field Standardization回归
- V1.5 Selection Legacy Migration回归
- V1.4 Level-2 Foundation回归
- V1.3 Route Integrity：106个内部路由引用，Global Shell单一来源
- Sampling Dashboard历史回归
- Backend `npm run check`
- 活动JS语法：63个文件通过
- 全部JSON解析通过
- Migration版本唯一：`0001 / 0010 / 0020 / 0030 / 0040`
- Migration静态检查：无 `DROP / TRUNCATE`
- 常见秘密模式扫描：未发现真实API Key / Private Key等明显秘密

## 2. 核心Schema检查

已确认候选Schema包含：

- organizations
- businesses
- positions
- assignments
- object_registry
- object_relations
- work_items
- work_item_participants
- work_sessions
- work_evidence
- money_events
- result_facts
- business_events
- knowledge_routes
- ai_executions
- `v_person_daily_time_summary`

## 3. 既有数据保护

迁移明确不删除、不重命名：

- `public.people`
- `public.external_identities`
- `public.product_opportunities`
- `public.activity_logs`

选品成熟业务仍以现有 `product_opportunities` 边界为准，本轮没有用新的万能对象表替代它。

## 4. 后端API检查

候选API已覆盖：

- Organization / Business / Position / Assignment
- Object Registry / Object Relation
- Work Item / Work Session / Work Evidence
- Money Event / Result Fact
- Business Event
- Knowledge Route
- AI Execution
- Person Time Summary
- Person Work Summary
- Legacy Product Opportunities GET

核心对象写入采用字段白名单，核心对象新建/修改会统一写Business Event。

## 5. 安全默认值

- 默认无已认证人员上下文时拒绝写操作。
- Preview Header只有显式 `AIONE_ALLOW_PREVIEW_ACTOR=true` 才启用。
- 无人员System Write只有显式 `AIONE_ALLOW_SYSTEM_WRITES=true` 才启用。
- 没有把数据库密码、Token或真实 `.env` 写入代码包。

## 6. 尚未完成 / 必须在线上环境验证

当前运行环境没有正式Cloud SQL连接凭据，因此以下项目**没有冒充已完成**：

1. 未执行 `npm run db:preflight` 读取线上真实Schema。
2. 未确认线上 `public.people.id` 的物理类型。
3. 未执行 `npm run db:migrate`。
4. 未对真实PostgreSQL执行DDL语法/约束Smoke Test。
5. 未对Cloud Run部署新版Backend。
6. 未把工作之家等前端数据源从localStorage切换到正式API。
7. 未接入AI秘书 / GPT / AIONE Tool Layer。

## 7. 正式进入线上数据库的门槛

必须按顺序执行：

`Cloud SQL Preflight → 人工检查报告 → 备份/回滚点 → Migration → API Smoke Test → 页面小范围接入 → 再扩大数据迁移`

尤其是 `people.id` 类型和 `product_opportunities` 当前结构必须先确认，不能凭历史记忆直接做强制外键或重构。

## 8. 结论

V1.7.0已经完成第6阶段的**本地工程基础**：业务语义、对象关系、字段、数据库Schema、API契约与后端代码已经连成一条线。

当前最准确的状态是：

> **数据库与后端候选基线已形成；等待有Cloud SQL访问能力的环境执行真实Preflight和迁移验收。**
