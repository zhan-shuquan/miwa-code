# AIONE Backend API V1.0

**状态：第6阶段候选**

## 1. API分层

- `/health`：数据库和迁移状态
- `/api/v1/*`：新核心数据API
- `/api/product-opportunities`：保留既有选品Legacy入口

## 2. 可写核心资源

当前提供统一GET / POST / GET by id / PATCH：

- organizations
- businesses
- positions
- assignments
- object-registry
- work-items

所有写入通过字段白名单，不允许客户端把任意SQL列名传入后端。

## 3. 追加型事实资源

当前提供GET / POST，不开放通用PATCH：

- object-relations
- work-sessions
- work-evidence
- money-events
- results
- events
- knowledge-routes
- ai-executions

原因：这些主要是已经发生的事实/关系/证据，后续如需纠正应采用正式更正逻辑，不随意覆盖历史。

## 4. 汇总接口

- `GET /api/v1/time-summary?personId=...`
- `GET /api/v1/people/:personId/work-summary`

为工作之家和人才之家共享同一份时间、工作、证据与结果数据提供第一层后端能力。

## 5. 写操作与业务事件

核心对象新建/修改后，后端会写入 `business_events`：

`谁 → 对什么对象 → 做了什么 → 何时 → payload`

这为后续通知、AI审计、自动化和工作证据提供统一事件语言。

## 6. 当前身份边界

V1.7不伪造正式认证体系。生产环境写操作必须获得正式AIONE用户上下文。

默认没有已认证人员上下文时，写操作直接拒绝。

仅在显式设置：

`AIONE_ALLOW_PREVIEW_ACTOR=true`

时，内部开发环境才允许通过 `x-aione-person-id` / `x-aione-assignment-id` 预演人员身份；只有受控自动化环境显式设置 `AIONE_ALLOW_SYSTEM_WRITES=true` 时才允许无人员的系统写入。

## 7. AI Tool Layer

本轮只准备API，不让AI直接写数据库。

下一阶段AI秘书应调用经过权限、规则和审计保护的AIONE Tool/API；AI和人最终写入同一业务对象和同一事件体系。
