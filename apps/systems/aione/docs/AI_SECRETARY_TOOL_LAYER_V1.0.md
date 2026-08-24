# AIONE AI秘书 Tool Layer V1.0

**状态：** 验证中  
**版本：** V1.8.0 CANDIDATE

## 1. 原则

AI秘书不得把直接操作网页DOM作为主要业务执行方式。正式路径为：

`AI秘书 → AIONE Tool Layer → Backend API / Service → 数据库或外部适配器 → 页面读取结果`

这样人与AI操作同一套业务对象、字段、规则和数据库事实。

## 2. V1.8首批Tool

### 读取类

- `get_context_snapshot`：当前用户、岗位AI办公室、页面、美和9要素
- `get_work_snapshot`：当前AIONE前端工作事项
- `get_calendar_snapshot`：当前AIONE日程快照
- `get_notifications_snapshot`：当前AIONE通知快照
- `get_backend_work_summary`：数据库中的工作/时间/证据/结果汇总
- `list_backend_open_work`：数据库中的未完成工作
- `search_knowledge_routes`：知识、规则、方法论、标准、制度、SOP、帮助路由

### 写入Proposal

- `propose_create_work_item`：只提出“创建工作事项”方案，不直接写数据库

## 3. 写入安全模型

V1.8模型层没有暴露直接`create_work_item` Tool。

正式路径：

`AI提出Proposal → 前端显示待确认动作 → 人类负责人点击确认 → POST /api/v1/ai-secretary/confirm → Backend校验身份 → 写work_items / business_events`

无认证人类身份时，写入拒绝。

本地预演若数据库尚未迁移，可在明确Preview模式下回落到浏览器本地工作事项，仅用于链路验证；不能冒充正式数据库写入。

## 4. Provider模式

### Preview（默认）

`AIONE_AI_MODE=preview`

- 不调用模型
- 使用确定性规则验证上下文汇总、对话UI、Proposal与人类确认链路
- 输出中明确标注“未调用模型”

### OpenAI

`AIONE_AI_MODE=openai`

并配置：

- `OPENAI_API_KEY`
- `AIONE_AI_MODEL`（默认`gpt-5.6-sol`）
- `OPENAI_API_BASE`（默认`https://api.openai.com/v1`）

实现使用OpenAI Responses API的自定义Function Tool调用；模型可连续调用AIONE Tool，但写入仍只能形成Proposal。

## 5. 当前边界

V1.8未完成：

- 线上Cloud SQL实际迁移
- 正式身份认证接入AI写操作
- 真实OpenAI API Key现场调用
- 完整ERP/人才/分析Tool集合
- AI人才多Agent编排
- 完整成本计算与AI贡献统计

这些必须在当前链路验证通过后逐步扩展。
