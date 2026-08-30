# 05｜AI之家 Product Freeze V1.0 Draft

状态：Draft / 待冻结
适用：美和AIONE一体化工作平台（AIONE）

## 1. 定位
AI之家是AIONE统一的AI资产、AI能力、AI训练、AI绩效与AI费用管理域，负责回答：有哪些AI、具备什么能力、如何训练、如何被调用、产生什么结果、成本是多少、表现如何。

AI之家不是每个业务页面各自调用模型的集合，也不是单纯聊天入口。所有业务AI必须通过统一AIONE AI Gateway / AI Service接入。

## 2. 目录与层级
- 05_00_概览
- 05_01_我的AI
- 05_02_我的互动
- 05_03_档案中心
- 05_04_训练中心
- 05_05_能力中心
- 05_06_绩效中心
- 05_07_费用中心
- 05_90_AI资料管理

能力中心三级：
- 05_05_01_Skill
- 05_05_02_Connector
- 05_05_03_Agent
- 05_05_04_Computer Use
- 05_05_05_自动化
- 05_05_06_API
- 05_05_07_规则函数
- 05_05_08_模型能力

## 3. 核心业务对象
- AIAsset：统一AI资产对象
- AICapability：AI能力对象
- AITrainingPlan / AITrainingRecord：训练计划与训练记录
- AIEvaluation / AIPerformanceRecord：评估与绩效记录
- AIUsageRecord：调用与使用记录
- AICostRecord：费用记录或费用引用
- AIExecutionTrace：执行追踪
- AIProposal：AI建议/提案对象

原则：不同页面不得复制创建“同一个AI”的第二套对象。

## 4. 能力边界
Skill：可复用的任务能力与操作规范。
Connector：连接外部系统/数据源的受控接口能力。
Agent：在目标和边界内进行多步判断与执行的代理能力。
Computer Use：通过界面操作外部系统的执行能力，仅在API/Connector不足时使用。
自动化：确定性触发、条件与动作编排。
API：系统对系统的稳定接口。
规则函数：确定性业务判断、计算与校验。
模型能力：基础模型提供的理解、生成、视觉、分类等原生能力。

原则：确定性问题优先规则函数/API/自动化；业务规则未稳定时不过早Agent化。

## 5. 唯一事实源
AI资产定义、AI能力定义、训练状态、AI绩效、AI调用记录、Trace与AI费用视图由AI之家统一管理。

不重复维护：
- 工作执行事实 → 工作之家
- 业务对象事实 → 对应业务之家
- 财务付款事实 → 财务之家
- 正式知识内容 → 知识之家

AI之家通过Reference引用这些事实。

## 6. Page Type映射
- 05_00_概览 → PT-01 Overview Page
- 我的AI / 档案 / 训练 / 能力 / 绩效 / 费用列表 → PT-02 Object List Page
- 单个AIAsset → PT-03 Object Workspace
- 训练流程 → PT-04 Workflow Page（需要阶段推进时）
- AI绩效/费用分析 → PT-05 Analytics Dashboard
- AI配置 → PT-06 Configuration Page
- 外部模型/Connector配置 → PT-08 Integration Page
- AI资料管理 → PT-02 Object List + File & Asset

## 7. View / Scope
单个AIAsset建议横向View：档案｜训练｜能力｜绩效｜费用｜Trace。

Scope建议：我的AI、团队AI、事业AI、全部AI、启用、停用、验证中、异常、成本关注对象。

我的互动优先是当前用户与AI资产/AI能力的互动Scope，不复制AI对象。

## 8. AIAsset默认字段
id/code、name、type、status、owner、business_scope、purpose、provider、model_ref、capability_refs、tool_refs、connector_refs、permission_scope、risk_level、human_confirmation_policy、cost_policy、version、created_at、updated_at。

不得在业务页面硬编码模型名、密钥、Prompt或权限逻辑。

## 9. 默认操作
创建、查看、编辑、启用、停用、训练、评估、分配能力、绑定Tool/Connector、查看Trace、查看成本、复制配置、版本管理、归档、删除、恢复。

高风险执行能力必须有风险等级、权限、确认策略和Audit。

## 10. 状态
建议AIAsset基础状态：DRAFT、VALIDATING、ACTIVE、PAUSED、FAILED、ARCHIVED、DEPRECATED、DELETED。

能力、训练、评估可拥有独立子状态，不以AIAsset主状态代替全部生命周期。

## 11. 权限与风险
至少支持Role、Scope、Object、Field、Action Permission。

AI执行需额外控制：
- 可访问哪些对象/字段
- 可调用哪些Tool / Connector
- 可执行哪些Action
- 是否需要Human Confirmation
- 是否可批量执行
- 费用/调用额度
- 高风险动作是否禁止自动执行

AI权限不得超过当前用户或被授权业务角色权限。

## 12. AI Gateway统一要求
所有AI业务调用必须经过AIONE AI Gateway / AI Service，统一记录：Model、Prompt/Instruction、Context、Permission、Tool、Trace、Cost、Result、Error、Human Confirmation、Source Object。

业务页面不得直接调用外部模型SDK形成第二套AI逻辑。

## 13. Proposal与执行
AI输出必须区分：Insight / Summary / Suggestion / Proposal / Execution Result。

Proposal只是可执行建议，不等于已经执行。需要确认的动作必须明确展示拟执行对象、动作、参数、影响范围和风险。

## 14. 训练
训练中心负责：能力缺口、训练目标、训练资料引用、测试案例、评估结果、上线条件、版本记录。

训练资料优先引用知识之家和真实业务证据，不复制第二套知识库。

## 15. 绩效
AI绩效必须基于真实使用记录和结果，例如成功率、人工修正率、完成时间、节省步骤、业务结果、异常率、调用成本。

没有真实数据时必须标记“待验证”，不得用示例数字冒充正式成果。

## 16. 费用
AI之家展示模型调用、Tool/Connector、自动化等AI相关成本视图；正式付款和会计事实由财务之家维护。

费用应能够按AIAsset、能力、事业、用户、模型、时间范围分析。

## 17. AI闭环
标准闭环：业务需要 → 选择确定性技术或AI能力 → AIAsset/Capability配置 → 真实业务调用 → Trace/结果 → 人工确认/业务结果 → 绩效评价 → 训练优化 → 版本升级。

## 18. 异常治理
必须处理：重复AIAsset、页面直连模型、密钥硬编码、越权上下文、Tool权限过宽、无Trace、无成本记录、无确认直接高风险执行、Prompt版本不可追踪、AI结果无来源、失败无重试/错误日志、模型更换后Contract漂移。

## 19. 验收标准
1. 同一AI能力/AI资产不按页面重复实现。
2. 所有业务AI统一经过AIONE AI Gateway。
3. Skill/Connector/Agent/Computer Use/自动化/API/规则函数/模型能力边界清楚。
4. 确定性问题优先确定性技术。
5. AI执行遵守权限、风险等级和Human Confirmation。
6. Trace、Cost、Result、Error可追踪。
7. AI绩效基于真实业务证据，无数据时标记待验证。
8. AI训练引用知识与业务证据，不复制第二套知识库。
9. 费用视图与财务事实边界清楚。
10. 当前文档定义Product/Architecture Truth，不自动声明main已实现。

## 20. 当前冻结判断
当前建议状态：Draft / 待横向Review。待12之家完成后统一Review，再决定是否升为CURRENT V1.0。
