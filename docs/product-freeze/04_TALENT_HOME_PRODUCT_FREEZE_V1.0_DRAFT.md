# 04｜人才之家 Product Freeze V1.0 Draft

状态：Draft / 待冻结
适用：美和AIONE一体化工作平台（AIONE）

## 1. 定位
人才之家是AIONE统一的人才事实源，负责承载“谁在组织中、具备什么能力、如何培养、如何绩效评价、如何形成报酬与发展记录”的Person及其长期人才数据。

人才之家不是招聘网站、工作任务系统或工资核算系统的替代品。它提供统一Person对象，并把档案、培养、能力、绩效、报酬作为同一人的不同View / Scope来管理。

## 2. 目录与层级
- 04_00_概览
- 04_01_我的人才
- 04_02_档案中心
- 04_03_培养中心
- 04_04_能力中心
- 04_05_绩效中心
- 04_06_报酬中心
- 04_90_人才资料管理

原则：一个人只对应一个Person主对象，不因档案、培养、能力、绩效、报酬页面不同而复制多份人员数据。

## 3. 核心业务对象
- Person：统一人员主对象
- EmploymentRelation：任职/雇佣/合作关系
- PositionAssignment：岗位与职位关系
- Skill / AbilityProfile：能力模型与个人能力档案
- TrainingPlan / TrainingRecord：培养计划与培养记录
- PerformanceRecord：绩效记录
- CompensationRecord：报酬记录或报酬引用
- CareerTimeline：任职与发展时间线

公共互动、附件、关注、历史、权限等由平台能力提供，不在人才能域重复开发。

## 4. 唯一事实源
人才身份、人员档案、任职关系、能力、培养、绩效与人才发展事实统一由人才之家承载。

不重复维护：
- 工作执行事实 → 工作之家
- 组织/法人事实 → 美和之家
- 财务付款与工资支付事实 → 财务之家
- 知识与培训内容正文 → 知识之家

人才之家通过Reference关联工作结果、组织、财务与知识内容。

## 5. Page Type映射
- 04_00_概览 → PT-01 Overview Page
- 04_01_我的人才 / 各中心列表 → PT-02 Object List Page
- 单个人才对象 → PT-03 Object Workspace
- 培养计划需要阶段推进时 → PT-04 Workflow Page
- 人才分析视图 → 调用PT-05 Analytics Dashboard或分析之家能力
- 人才资料管理 → PT-02 Object List + File & Asset

原则：不为人才之家创建独立专属页面类型。

## 6. View / Scope
单个Person推荐横向View：档案｜培养｜能力｜绩效｜报酬。

Scope建议：我的人才、直属团队、所属团队、事业、全部、在职、离职/历史、待培养、绩效关注对象等。

View / Scope只改变呈现与访问范围，不复制Person数据。

## 7. Person默认字段
id/code、name、display_name、status、organization_id、department_id、position_id、manager_id、employment_type、employment_status、join_date、leave_date、contact_ref、profile_summary、skills、tags、attachments、created_at、updated_at、version。

敏感字段如身份证件、住址、银行、报酬等必须使用更严格Field Permission，不在普通列表暴露。

## 8. 默认操作
创建、查看、编辑、分配组织/岗位、更新状态、添加培养记录、更新能力、记录绩效、查看报酬、上传附件、生成档案/履历、分享允许分享的资料、归档、删除、恢复、查看历史。

低频操作进入More；敏感与高风险操作必须二次确认和Audit。

## 9. 批量操作
支持：当前页全选、全部选择筛选结果、全部取消、批量组织/部门/岗位、批量标签、批量状态、批量导入、批量导出、批量归档、批量恢复。

涉及报酬、敏感身份字段的批量操作必须受更严格Action / Field Permission控制。

## 10. 状态
Person基础状态建议：ACTIVE、ON_LEAVE、INACTIVE、LEFT、ARCHIVED、DELETED。

培养、绩效等子对象拥有各自状态，但不得通过修改Person主状态来替代专业状态。

## 11. 权限
至少支持Role、Scope、Object、Field、Action Permission。

人才之家必须重点实现：
- 本人可见字段
- 直属管理者可见字段
- HR/管理员可见字段
- 报酬字段权限
- 敏感身份字段权限
- 跨事业/跨团队查看权限

登录User不等于Person本身，系统必须建立User ↔ Person身份映射。

## 12. 能力与培养
能力模型应尽量结构化：能力项、等级、证据、最近评估时间、目标等级、差距。

培养中心基于能力差距、岗位要求和经营需要形成TrainingPlan，并关联知识之家中的课程/SOP/资料，而不是复制培训内容。

## 13. 绩效
绩效必须引用真实工作结果、经营结果或明确指标，不允许用无来源的主观数字替代。

工作之家可提供WorkItem结果与执行数据；分析之家可提供统计指标；人才之家负责形成个人绩效记录和评价上下文。

## 14. 报酬
人才之家负责“人员与报酬关系的业务视图”，但工资支付、付款、会计事实应由财务之家维护。

报酬中心可展示基础薪酬、奖金、津贴、绩效关联等业务信息，正式支付记录通过Reference读取财务事实。

## 15. AI与自动化
AI适合：人才档案摘要、履历生成、能力差距分析、培养建议、绩效总结草稿、岗位匹配建议、人才风险提示。

确定性能力优先：任职状态判断、到期提醒、培养进度、字段校验、权限过滤、绩效指标计算。

所有AI调用统一经过AIONE AI Gateway；AI评价不得自动成为正式绩效结论。

## 16. 人才闭环
标准闭环：Person → 岗位/职责 → 工作执行 → 结果/绩效 → 能力评价 → 能力差距 → 培养 → 再评价 → 人才发展。

这条闭环必须通过统一对象关联实现，而不是人工复制多份表格。

## 17. 档案与Publication
Person结构化数据应支持自动生成标准人才档案、履历、内部介绍等Publication输出。

Publication由统一平台能力生成；输出内容受Field Permission控制，敏感信息不得因导出而越权泄露。

## 18. 异常治理
必须处理：重复Person、同一人多账号未映射、岗位缺失、组织关系冲突、离职后仍被安排工作、培养记录无来源、能力评价无证据、绩效数据无事实来源、敏感字段越权、报酬记录与财务事实不一致。

## 19. 验收标准
1. 同一人员只存在一个Person主对象。
2. 档案/培养/能力/绩效/报酬作为同一Person的不同View。
3. User与Person身份映射明确。
4. Person字段按敏感程度实施Field Permission。
5. 培养内容引用知识之家，不复制课程/SOP正文。
6. 绩效引用真实工作或经营结果。
7. 报酬视图与财务支付事实边界清楚。
8. 评论、附件、历史、权限、Audit调用平台统一能力。
9. AI只提供辅助分析/草稿，不自动成为正式人事决定。
10. 当前文档定义Product/Architecture Truth，不自动声明main已实现。

## 20. 当前冻结判断
当前建议状态：Draft / 待横向Review。待12之家完成后统一Review，再决定是否升为CURRENT V1.0。
