# 02｜事业之家 Product Freeze V1.0 Draft

状态：Draft / 待冻结
适用：美和AIONE一体化工作平台（AIONE）

## 1. 定位
事业之家是AIONE的经营单元管理域，用于回答“美和正在经营哪些事业、每个事业为什么存在、目标是什么、如何运行、结果如何”。

事业之家不替代工作之家、商品之家、渠道之家、财务之家或分析之家；它负责事业级经营定义与经营管理视角，并通过Reference / View / Scope调用其他事实源。

## 2. 目录与层级
- 02_00_概览
- 02_01_美和跨境
- 02_02_美和批发
- 02_03_美和留学
- 02_04_美和不动产
- 02_05_美和商务咨询
- 02_06_美和独立站
- 02_07_美和品牌
- 02_08_美和物流
- 02_90_事业资料管理

美和跨境三级：
- 02_01_00_事业概览
- 02_01_01_事业定位
- 02_01_02_经营目标
- 02_01_03_经营计划
- 02_01_04_业务架构
- 02_01_05_业务流程
- 02_01_06_经营项目
- 02_01_07_经营复盘
- 02_01_08_重要决策
- 02_01_90_事业资料管理

其他事业默认复用同一事业母版，不因事业不同重新定义一套页面结构；只有真实业务差异稳定后才增加特化配置。

## 3. 主要业务对象
- Business：事业主体
- BusinessGoal：事业经营目标
- BusinessPlan：事业经营计划
- BusinessArchitecture：事业业务架构
- BusinessProcess：事业流程定义/引用
- BusinessProject：经营项目
- BusinessReview：经营复盘
- BusinessDecision：重要决策

原则：事业是稳定业务对象；不同页面只提供不同View / Scope，不复制事业数据。

## 4. 唯一事实源
事业之家负责：事业身份、事业定位、事业经营目标、经营计划、业务架构、事业级项目、复盘与重要决策。

不重复维护：
- 工作执行事实 → 工作之家
- 人员与能力事实 → 人才之家
- AI能力与AI绩效事实 → AI之家
- 商品/SKU/库存事实 → 商品之家
- 客户/供应商/物流等往来事实 → 往来之家
- 渠道事实 → 渠道之家
- 财务事实 → 财务之家
- 指标计算与分析数据 → 分析之家
- 正式知识 → 知识之家

## 5. Page Type映射
- 02_00_概览 → PT-01 Overview Page
- 每个事业的00_事业概览 → PT-01 Overview Page
- 事业定位 / 业务架构 / 经营复盘 / 重要决策 → PT-07 Knowledge Page为主
- 经营目标 / 经营计划 → PT-02 Object List + PT-03 Object Workspace，必要时嵌入Dashboard指标
- 业务流程 → PT-04 Workflow Page或PT-07 Knowledge Page，取决于“流程定义”还是“实际执行”
- 经营项目 → PT-02 Object List + PT-03 Object Workspace；实际任务进入工作之家
- 事业资料管理 → PT-02 Object List +统一File & Asset能力

原则：不为单个事业单独创建新Page Type。

## 6. View / Scope
推荐Scope：全部事业、单个事业、当前用户负责事业、当前组织、当前期间。

推荐View：概览、目标、计划、项目、复盘、决策、资料；同一Business对象通过Scope切换，不复制记录。

## 7. 默认字段
Business：id/code、name、status、owner、legal_entity_reference、description、business_model、target_market、start_date、end_date、tags、related_objects、attachments、created_at/updated_at。

BusinessGoal：goal_id、business_id、period、metric_reference、target_value、current_value/reference、owner、status、deadline、risk_level。

BusinessPlan：plan_id、business_id、period、objectives、key_actions、owner、status、version。

经营项目/复盘/决策沿用统一对象基础字段，并通过稳定Contract扩展业务字段。

## 8. 默认操作
高频：查看、搜索、筛选、Scope切换、编辑当前允许字段、分享、下载、打印。

低频：复制、移动、归档、删除、版本历史、权限、导出，统一进入More / Context Menu。

## 9. 批量操作
适用于目标、计划、项目、资料等对象列表：当前页全选、全部选择筛选结果、全部取消、批量负责人、批量状态、批量标签、批量导出、批量归档、批量删除、批量恢复。

导入属于Collection-level能力，不要求先选择对象。

## 10. 状态
Business建议：PLANNING、ACTIVE、PAUSED、ARCHIVED、CLOSED、DELETED。

Goal / Plan / Review / Decision等按对象生命周期使用统一状态机；正式知识类记录可使用DRAFT、VALIDATING、CURRENT、ARCHIVED、DEPRECATED。

显示标签由i18n资源层提供，业务逻辑使用稳定code。

## 11. 权限
至少支持Role / Scope / Object / Field / Action Permission。

事业负责人可管理其事业范围内对象；跨事业查看与编辑必须由Scope权限控制。战略、决策、敏感经营数据应支持更严格Field/Action权限。

## 12. 流程
事业之家只定义事业级经营流程与管理视角，不复制平台Workflow Engine。

实际需要人员执行的事项统一生成/关联WorkItem并进入工作之家。

推荐闭环：经营目标 → 经营计划 → 经营项目/工作 → 经营结果 → 分析 → 经营复盘 → 重要决策 → 下一周期目标/计划。

## 13. AI与自动化
AI适合：经营目标拆解、经营计划建议、复盘摘要、跨事业比较、风险提示、决策资料整理、经营项目拆解Proposal。

确定性能力优先：周期提醒、目标进度计算、状态校验、到期提醒、数据同步、报表生成。

AI生成的计划/决策建议默认是Proposal，需人工确认后进入正式对象或WorkItem。

## 14. 数据与指标
事业之家不创建第二套分析事实。

经营目标可引用Metric Definition；实际值由商品、渠道、工作、财务等事实源经Analytics能力计算后回填/引用。

不得人工重复录入系统已能计算的数据。

## 15. Publication与资料
事业概览、经营计划、经营复盘、重要决策等支持Publication Layer：Web / Print / A4 / PDF / Download / Share。

事业资料管理调用统一File & Asset能力，标准文档应支持版本、引用关系与正式状态。

## 16. 异常与治理
必须处理：同一事业重复建模、事业页面复制商品/财务等事实、目标值和实际值混为一列、流程定义与实际WorkItem混在一起、不同事业各写一套组件、旧工作台名称回流为CURRENT、正式决策无版本/无Audit。

## 17. 验收标准
1. 事业目录与层级唯一。
2. 各事业复用同一事业母版与Page Type体系。
3. Business对象唯一，不因页面重复建模。
4. 目标、计划、项目、复盘、决策边界清楚。
5. 工作执行进入工作之家，分析结果来自分析能力，财务事实来自财务之家。
6. Scope切换代替复制页面/复制对象。
7. 低频操作遵守Progressive Disclosure。
8. 机器identity与显示标签分离，中文默认但国际化就绪。
9. 关键决策、权限、删除、正式发布可审计。
10. 当前文档定义Product/Architecture Truth，不自动声明main已实现。

## 18. 当前冻结判断
当前建议状态：Draft / 待Review。
待12之家横向Review无冲突后升级为CURRENT V1.0。

## 19. 横向Review回写｜2026-08-31
本节优先于前文中与跨之家归属冲突的Draft描述。
- BusinessProject不再视为可与知识之家Project并存的独立重复主模型；当前建议Project作为唯一业务项目对象，由02承载事业归属、目标、计划和经营意义，03引用执行WorkItem，11仅沉淀项目知识/复盘/正式索引。
- BusinessDecision不再单独发展为第二套Decision模型；全系统只保留一套DecisionRecord，02以business_scope/source_object呈现事业决策。
- 02不拥有工作执行事实、正式财务事实或正式知识条目，均通过稳定Reference调用。
- 公共字段、权限、附件、评论、历史、Audit、Search等统一复用Platform Object Foundation与Platform Capability。
- 本文仍为Draft，待第二轮一致性检查通过后再升级RC。
