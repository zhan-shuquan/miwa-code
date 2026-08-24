# AIONE V1.8.0 CANDIDATE｜AI办公室与AI秘书首轮真实链路验证基线

**状态：** 验证中  
**阶段：** 第7阶段  
**基线前序：** V1.7.0 核心数据与后端基础候选版

## 1. 本阶段目标

第7阶段不追求一次完成全部AI自动化，而是建立并验证第一条完整AI办公室执行链：

`当前人类岗位 → 岗位AI办公室 → 右侧AI秘书 → AIONE上下文 → Tool Layer → Proposal → 人类确认 → 工作结果/证据`

首个真实验证办公室为**会长兼董事长AI办公室**。

## 2. 正式新增

### AI组织

新增7个岗位AI办公室注册定义，只有会长兼董事长AI办公室处于“验证中”，其余保持“预设”。

新增数据库对象：

- `ai_talents`
- `ai_offices`
- `ai_assignments`

V1.7已有`ai_executions`继续承担AI执行记录。

### AI秘书常驻Aside

右侧Aside升级为岗位AI办公室常驻交互界面：

- AI办公室身份
- 运行模式状态
- 对话记录
- 快捷验证指令
- 自然语言工作输入
- 待确认Proposal
- 执行原则
- 收起/标准/展开三态

### AI办公室标准业务页面

新增`#/ai-office`，仍调用标准业务母版，而不是另建AI特殊母版。

### Tool Layer

首批工具覆盖当前上下文、工作、日程、通知、数据库工作摘要、数据库未完成工作、知识路由，以及“创建工作事项”的Proposal。

模型不拥有直接写数据库的工作Tool。

### Provider

默认Preview模式；可通过环境变量切换OpenAI Responses API模式。

## 3. 重要安全原则

- AI秘书是岗位AI办公室最高AI调度层，但最终责任归人类岗位负责人。
- 无真实事实不得编造；缺失内容明确“待确认”。
- 读取与分析可以直接执行。
- 写入动作当前必须经过人类确认。
- 生产环境不能使用Preview Header代替真实认证。
- API Key、数据库密码等不得写入仓库。

## 4. 与既有体系的关系

V1.8不改变：

- 唯一Global Shell
- 唯一Level-2 Empty Base
- Standard Business Template / Content Template
- Universal Workspace
- 美和9要素固定顺序
- V1.5选品成熟业务迁移结果
- V1.6字段标准
- V1.7核心数据模型和Legacy选品边界

## 5. 第一验证指令

预置验证指令：

`帮我判断今天最重要的三件事，并说明依据。`

Preview模式仅使用已知工作、日程、通知快照进行确定性链路测试并明确标注“未调用模型”。OpenAI模式下模型可通过Tool Layer主动读取更多事实。

## 6. 当前未宣称完成的内容

- 未在本环境使用真实`OPENAI_API_KEY`执行模型调用
- 未对正式Cloud SQL执行V1.7/V1.8 Migration
- 未完成真实生产身份认证
- 未完成全部AIONE业务Tool
- 未完成AI人才/Agent全自动多级调度
- 未把Preview结果冒充真实AI判断

因此本版保持**CANDIDATE / 验证中**。
