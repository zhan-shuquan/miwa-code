# 03｜工作之家 Product Freeze V1.0 Draft

状态：Draft / 待冻结
适用：美和AIONE一体化工作平台（AIONE）

## 1. 定位
工作之家是AIONE统一的工作执行事实源，负责承载所有需要人或AI推进、确认、协同、完成和复盘的WorkItem及其生命周期。

它不复制各业务之家的业务事实；业务之家产生“需要被执行的事情”时，应引用原业务对象并生成/关联WorkItem。

## 2. 目录与层级
- 03_00_概览
- 03_01_我的工作
- 03_02_我的安排
- 03_03_我的协同
- 03_04_我的总结
- 03_05_我的互动
- 03_06_我的创新
- 03_07_我的建议
- 03_08_全部工作
- 03_09_事业工作
- 03_10_团队工作
- 03_11_工作总结
- 03_12_工作记录
- 03_90_工作资料管理

原则：我的/团队/全部/事业等优先作为Scope/View，而不是复制不同WorkItem对象。

## 3. 核心业务对象
- WorkItem：统一工作事项对象
- WorkAssignment：安排/指派关系
- WorkCollaboration：协同关系
- WorkResult：工作结果
- WorkEvidence：结果证据
- WorkSummary：工作总结
- WorkInteraction：评论、@、关注等通过平台Interaction能力实现
- WorkHistory：状态与操作历史，通过History/Audit能力实现

WorkItem必须能够引用来源对象，例如Product、SKU、Counterparty、Channel、Business、AIAsset等。

## 4. 唯一事实源
工作状态、负责人、截止时间、优先级、执行结果、确认结果、工作历史的唯一事实源在工作之家。

商品、客户、财务等业务事实仍由对应之家维护；WorkItem只保存引用和执行上下文，不复制业务主数据。

## 5. Page Type映射
- 03_00_概览 → PT-01 Overview Page
- 我的工作 / 我的安排 / 我的协同 / 全部工作 / 事业工作 / 团队工作 → PT-02 Object List Page
- 单个工作事项 → PT-03 Object Workspace
- 需要阶段推进的工作 → PT-04 Workflow Page
- 工作总结 → PT-07 Knowledge Page或Publication能力输出正式总结
- 工作记录 → PT-02 Object List + History/Activity视图
- 工作资料管理 → PT-02 Object List + File & Asset

## 6. Scope / View
核心Scope：我的、我安排的、我参与的、团队、事业、全部、已关注、已收藏、@我。

核心View：List、Table、Kanban、Timeline、Calendar（仅在同一数据集语义成立时启用）。

Scope/View不得复制数据。

## 7. WorkItem默认字段
id/code、title、description、status、priority、owner、creator/assigner、collaborators、business_scope、team_scope、source_object_type、source_object_id、start_at、due_at、completed_at、progress、result_summary、evidence_refs、tags、attachments、created_at、updated_at、version。

可计算字段如逾期、剩余时间、完成率、等待时长由系统计算，不要求员工重复填写。

## 8. 默认操作
创建、查看、编辑、开始、暂停、恢复、完成、退回、转交、协同、评论、@成员、关注、收藏、上传附件、提交结果、确认结果、归档、删除、恢复、查看历史。

低频操作进入More/Context Menu；高风险操作需要确认与Audit。

## 9. 批量操作
标准支持：当前页全选、全部选择当前筛选结果、全部取消、批量安排、批量负责人、批量优先级、批量状态推进、批量确认、批量标签、批量导出、批量归档、批量删除、批量恢复。

批量安排必须复用统一Import Engine，可从标准表格模板导入；导入后允许AI补全、校验和生成标准WorkItem，但AI不得绕过最终规则与权限。

## 10. 状态模型
建议基础状态：DRAFT、ASSIGNED、IN_PROGRESS、WAITING、BLOCKED、SUBMITTED、COMPLETED、CANCELLED、ARCHIVED、DELETED。

具体业务流程可定义子状态，但必须由统一State Machine管理，禁止页面随意改状态。

## 11. 安排与确认
安排工作必须区分assigner与owner/assignee。

管理者应支持批量安排和批量确认，避免逐条人工操作。

确认可以由AI辅助给出建议；自动确认只适用于规则稳定、风险可控且获得明确授权的场景。关键结果仍保留人类责任人。

## 12. 权限
至少支持Role、Scope、Object、Field、Action Permission。

需要明确：谁能创建、安排、转交、修改负责人、修改截止时间、确认结果、删除、永久删除、查看跨团队/跨事业工作。

## 13. AI与自动化
AI适合：任务拆解、批量WorkItem生成、优先级建议、截止风险提醒、结果摘要、工作总结、异常识别、下一步建议、Proposal生成。

确定性能力优先用于：逾期判断、提醒触发、状态校验、批量规则、自动字段计算、定时通知。

所有AI调用统一通过AIONE AI Gateway。

## 14. 工作闭环
标准闭环：来源对象/经营目标 → 创建或生成WorkItem → 安排负责人 → 执行 → 提交结果与证据 → 确认 → 完成 → 总结/沉淀 → 分析/绩效引用。

WorkItem完成不等于业务对象完成；业务对象是否进入下一状态由其Domain规则决定。

## 15. 工作总结
工作总结可以由AI基于真实WorkItem、结果、证据和时间线生成标准格式草稿。

正式总结可发布、分享、被关注和学习，并可进一步沉淀到知识之家。AI生成内容必须标识来源与人工确认状态。

## 16. 异常治理
必须处理：无负责人、无截止时间但业务要求截止、状态跳跃、重复WorkItem、来源对象失效、负责人离职/无权限、逾期、阻塞、证据缺失、提交后长期未确认、批量操作部分失败。

所有关键异常应可搜索、筛选、通知、审计。

## 17. 验收标准
1. 所有工作事项统一使用WorkItem，不按页面重复建模。
2. 我的/团队/事业/全部主要通过Scope/View实现。
3. 工作状态由统一State Machine管理。
4. 批量安排、批量确认和批量导入可复用平台能力。
5. WorkItem可引用原业务对象且不复制主数据。
6. 结果、证据、确认和历史形成闭环。
7. 评论、附件、关注、收藏、@、权限、历史、Audit调用平台能力。
8. AI只通过AIONE AI Gateway参与，并区分建议与执行。
9. 工作总结可由真实工作数据生成并支持Publication/知识沉淀。
10. 当前文档定义Product/Architecture Truth，不自动声明main已实现。

## 18. 当前冻结判断
当前建议状态：Draft / 待横向Review。待12之家完成后统一Review，再决定是否升为CURRENT V1.0。

## 19. 横向Review回写｜2026-08-31
本节优先于前文中与跨之家归属冲突的Draft描述。
- Proposal不再作为工作之家或AI之家各自私有对象，统一升级为Platform Proposal模型；Proposal可由人或AI生成，Proposal ≠ 已执行。
- WorkItem继续作为统一工作执行事实源；Project只作为上层业务项目对象被引用，不在03复制第二套Project。
- WorkAssignment / WorkCollaboration / WorkResult / WorkEvidence / WorkSummary等需在Technical Design区分实体、关系、事件或投影，避免全部表结构化。
- 负责人、参与人、@成员统一引用User/Person身份体系，不在工作域复制人员主数据。
- 工作附件、评论、关注、历史、Audit、Search、Workflow等统一复用平台能力。
- 本文仍为Draft，待第二轮一致性检查通过后再升级RC。
