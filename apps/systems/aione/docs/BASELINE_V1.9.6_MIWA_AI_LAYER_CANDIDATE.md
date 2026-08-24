# AIONE V1.9.6 CANDIDATE｜美和AI独立能力层接入基线

- 日期：2026-08-24
- 基线来源：V1.9.5 Sidebar + Aside Lock Candidate
- 状态：验证候选

## 1. 本轮目标

在不改变V1.9.5已锁定Sidebar / Aside职责的前提下，将AI从五区Shell中正式独立成平台级智能能力层，并把第一版全局入口落到真实代码基线。

前端关系：

`美和AI → AI工作区 → AI办公室`

内部工程命名可继续使用：

`AI Layer → AI Drawer → AI Workspace → AI Office`

## 2. Header全局工具顺序

第一阶段锁定为：

`全局搜索 → 美和AI → 通知 → 帮助 → 设置`

“美和AI”是全局智能能力入口，不替代“AI之家”。

- AI之家：AI能力资产、Skill、Agent、Connector、工具和方法的长期归属入口。
- 美和AI：用户在任何业务上下文中随时调用AI的全局入口。
- AI工作区：当前任务需要更大空间时扩展的临时深度协作区。
- AI办公室：复杂、多步骤、长期任务的完整独立工作空间。

## 3. 独立能力层结构

新增独立Shell组件：

- `components/shell/ai/miwa-ai-layer.html`
- `css/shell/miwa-ai-layer.css`
- `js/shell/miwa-ai-layer.js`

独立Host：

- `#miwa-ai-layer-host`

该Host位于全局App Shell层，不属于Sidebar、Main或Aside DOM内部。

## 4. 第一版交互

### Drawer｜美和AI快捷层

从Header点击“美和AI”后覆盖式打开，不压缩Main/Aside现有布局。

固定结构：

1. 美和AI身份与专属M智核标记
2. 当前页面/业务上下文
3. 根据当前Route动态生成的能力推荐
4. AI工作结果/对话区
5. 固定Composer输入区

### Workspace｜AI工作区

点击扩展按钮后，AI Layer扩展为更宽的工作区，不改变底层Shell结构。

### Office｜AI办公室

点击“进入AI办公室”后进入现有 `#/ai-office` Route，复杂任务继续在完整工作空间处理。

## 5. 数据与执行链

本轮不重新建设第二套AI Backend。独立美和AI Layer复用现有经过验证的：

- `/api/v1/ai-secretary/status`
- `/api/v1/ai-secretary/execute`
- `/api/v1/ai-secretary/confirm`
- AIONE上下文快照
- 岗位AI办公室注册表
- Tool Layer
- 人类确认写入机制

前端名称升级为“美和AI”，内部Endpoint和历史执行语义保持兼容，避免无必要破坏后端。

## 6. 与Aside边界

V1.9.5锁定规则继续有效：

- Aside不承载AI聊天。
- Aside不承载AI办公室。
- Aside不固定显示“问AI”。
- Aside仍只负责当前对象、关键状态、异常风险、关联信息与必要说明。

美和AI通过独立能力层读取并服务上下文，而不回到右边栏。

## 7. 当前边界

本轮重点是完成“位置、入口、交互层、上下文与现有AI执行链”的正确接入，不把AI功能数量做大。

以下仍属于后续增强：

- 统一Skill / Agent / Connector能力注册表的前端选择器
- 文件、商品、订单、客户、供应商等对象附件选择器
- 更完整的跨页面上下文连续性
- Agent多步骤运行状态
- AI任务持久化与恢复
- AI工作区与AI办公室的任务无缝升级
- 更强的真实业务自动执行能力

核心原则：先把心脏的位置和循环接口做对，再逐步增强心脏能力。
