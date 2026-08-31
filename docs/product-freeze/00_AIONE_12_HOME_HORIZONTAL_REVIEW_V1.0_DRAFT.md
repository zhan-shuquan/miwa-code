# 00｜AIONE 12之家横向Review V1.0 Draft

状态：Draft / 跨之家横向Review进行中
适用：美和AIONE一体化工作平台（AIONE）

## 1. Review目标
本Review不重新讨论12之家目录，而是横向检查12份Product Freeze Draft中的对象、事实归属、字段、状态、权限、平台能力和跨域引用，解决重复对象、重复字段、重复状态、归属冲突与第二事实源风险。

核心原则：一个正式业务概念原则上只有一个CURRENT对象模型、一个事实源、一个稳定身份；其他之家通过View / Scope / Reference使用。

## 2. 12之家横向语义总图
01 美和之家：公司本身
02 事业之家：公司做什么生意
03 工作之家：人每天做什么
04 人才之家：谁在做
05 AI之家：AI如何参与
06 商品之家：卖什么
07 往来之家：和谁发生业务关系
08 渠道之家：通过哪里经营
09 财务之家：钱发生了什么
10 分析之家：经营结果怎么样
11 知识之家：公司知道什么
12 共享之家：全公司共同使用什么

## 3. 一级事实源初步归属
- Organization / LegalEntity / Governance / Strategy → 01 美和之家
- Business / BusinessGoal / BusinessPlan / BusinessArchitecture → 02 事业之家
- WorkItem / WorkExecution / WorkResult / WorkEvidence → 03 工作之家
- Person / Employment / TalentCapability / TalentDevelopment / PerformanceContext → 04 人才之家
- AIAsset / AI capability semantics / AI training / AI performance governance → 05 AI之家
- Product / SKU / Inventory / Category / Brand / Attribute / Listing → 06 商品之家
- Counterparty / Organization counterpart / Contact / CounterpartyRole → 07 往来之家
- Channel / Platform / Store / channel configuration → 08 渠道之家
- Revenue / Expense / AR / AP / Cash / Cost / Accounting / Tax / Budget → 09 财务之家
- MetricDefinition / DimensionDefinition / Dashboard / Insight / Forecast → 10 分析之家
- KnowledgeItem / Policy / Standard / Method / SOP / Template / formal Decision knowledge → 11 知识之家
- SharedResource / system-tool-asset registry / integration resource index → 12 共享之家

## 4. 冲突A：Project模型
涉及：02 BusinessProject、03 WorkItem、11 ProjectRecord / ProjectKnowledge。

初步结论：
- Project应优先成为一套跨域Project对象，不允许02和11各自建立第二套项目主对象。
- 02事业之家负责Project的事业归属、目标、计划、经营意义与Portfolio View。
- 03工作之家负责Project下的WorkItem执行事实。
- 11知识之家负责项目复盘、成果、经验、正式资料与知识索引，不拥有第二套执行Project事实。

待冻结：Project唯一主模型最终归属02还是平台横向Domain；当前建议由02作为业务事实源，03/11引用。

## 5. 冲突B：Decision模型
涉及：02 BusinessDecision、11_11 决策中心。

初步结论：全系统只保留一套DecisionRecord。
- 决策产生时可来自事业、公司、财务、商品等不同业务上下文。
- 业务之家通过scope/source_object呈现决策。
- 11决策中心负责正式归档、知识化、检索、版本和复盘视图。

待冻结：DecisionRecord技术归属建议平台横向对象或11知识之家；不得同时存在BusinessDecision + KnowledgeDecision两套表。

## 6. 冲突C：Proposal模型
涉及：03工作之家中的AI建议/执行建议、05 AI Proposal。

初步结论：Proposal应升级为平台横向统一对象，而不是AI之家专属。

建议统一：Proposal {id, actor_type, actor_ref, source_object_ref, proposal_type, payload, risk_level, permission_context, status, created_at, confirmed_by, executed_at, execution_ref}。

AI可生成Proposal，人也可生成Proposal；Proposal ≠ 已执行。

## 7. 冲突D：User / Person / Identity
涉及：04 Person、平台User/Identity、负责人/成员选择器。

初步结论：User ≠ Person。
- User负责登录、认证、权限主体。
- Person负责人才/员工/人员业务事实。
- 建立User ↔ Person映射。
- Owner、Assignee、Mention等统一引用User/Person可解析身份，不在每个Domain重复人员字段体系。

## 8. 冲突E：Organization与人员任职
涉及：01组织结构、04 EmploymentRelation / PositionAssignment。

初步结论：
- 01拥有Organization / Department / Position结构定义。
- 04拥有Person与Organization/Position之间的任职、历史、状态关系。
- 04页面中的organization_id / department_id / position_id可作为查询投影，不应成为第二套组织结构事实。

## 9. 冲突F：人才能力 vs AI能力
涉及：04 Skill / AbilityProfile、05 AICapability。

初步结论：二者不能简单合并为一张表，但可共享CapabilityDefinition基础抽象。
- 人才能力描述人的技能/能力及证据。
- AI能力描述AI资产可调用/可执行的能力及技术类型。
- 可共享taxonomy/id/name/category/level/evidence等通用概念，但保留不同Domain语义。

待Technical Design决定是否采用共享Capability Definition + HumanCapabilityProfile / AICapabilityBinding。

## 10. 冲突G：Connector / API / Automation / Skill
涉及：05 AI之家能力中心、12共享之家集成中心、Platform Integration Capability、GitHub实现。

初步结论：
- 技术实现只有一个事实源，代码仍以GitHub Repo为准。
- 12共享之家/Integration Service负责企业级外部系统连接、认证引用、映射、同步和运行状态。
- 05 AI之家负责这些能力如何被AI理解、组合、授权、训练、评估与计费的语义。
- Agent可组合Skill / Connector / API / RuleFunction / ModelCapability，不复制它们的实现。
- Secret只在Secret Manager或受控Credential能力中保存。

## 11. 冲突H：AI Trace / Cost / Proposal归属
涉及：05 AIExecutionTrace、AICostRecord、AIProposal、Platform Observability。

初步结论：
- AIExecutionTrace应由AIONE AI Gateway / Observability产生并作为平台执行事实；AI之家展示治理视图。
- AICostRecord应由Gateway/Usage计量产生；05负责运营成本分析，09负责正式付款/会计事实。
- AIProposal采用平台统一Proposal模型。

因此05不应再拥有第二套Trace/Proposal事实表。

## 12. 冲突I：商品成本 / 价格 / 财务
涉及：06 SKU cost_ref、Listing价格、09成本中心。

初步结论：
- 财务确认后的正式成本口径归09。
- 06可以展示运营成本引用、采购参考价、标准成本引用，但不能形成另一套正式会计成本。
- Channel/Store/时间相关销售价格不应硬塞进SKU master。

待横向Review后单独冻结Offer / Pricing模型；目前不新增“价格中心”。

## 13. 冲突J：Inventory事实源与外部ERP/WMS
初步结论：06是AIONE统一库存业务Contract和View，但实际Source of Truth可由集成Contract指定为AIONE或外部ERP/WMS。

规则：一个SKU + Location + Stock State只能有一个被指定的权威库存来源，禁止AIONE与ERP各自独立维护两套库存主数据。

如AIONE自主管理库存，建议InventoryMovement作为事实，InventoryBalance作为派生/优化投影。

## 14. 冲突K：Brand vs Counterparty / LegalEntity
涉及：06 Brand、07 Counterparty、01 LegalEntity。

初步结论：Brand ≠ Supplier ≠ LegalEntity。
- Brand是商品品牌身份。
- Counterparty是业务往来主体。
- LegalEntity是法人主体。

Brand可引用owner_party_ref / legal_entity_ref / supplier_ref，但不得合并为同一对象。

## 15. 冲突L：Channel Listing vs Channel主体
涉及：06 Listing、08 Channel/Store/Platform。

初步结论：
- 08拥有Channel / Platform / Store主对象与配置。
- 06 Listing拥有Product/SKU到Channel/Store的商品上架映射及发布状态。
- 06不得复制Channel主档；08不得复制Product/SKU主档。
- 商品“上架 Listing”与平台文档“Publication Layer”是两个不同概念。

## 16. 冲突M：知识 / 文件 / 共享资产
涉及：11 KnowledgeItem、Platform File & Asset、12 Image/Icon/Video/BrandAsset。

初步结论：
- 文件字节与文件生命周期由统一File & Asset能力管理。
- KnowledgeItem是知识对象，不等于文件。
- SharedResource/Asset是可复用资源对象，不等于知识。
- 一个文件可被KnowledgeItem、Product、Channel、SharedResource等多个对象引用，不复制文件。

## 17. 冲突N：Analysis事实
涉及：10分析之家与01～09/11/12各域分析视图。

初步结论：
- 业务Domain拥有原始事实。
- 10拥有MetricDefinition、Dimension、Semantic Layer、Dashboard、Forecast、Insight。
- BigQuery/Looker属于分析副本/语义层，不得反向成为交易事实源。
- 同一正式指标只能有一个CURRENT定义。

## 18. 统一Object Foundation
12之家重复出现的公共字段与能力统一上收，不由各Domain重复定义。

建议公共字段：id、code、name/title、status、owner、business_scope、tags、permission_ref、created_at、updated_at、version、archived_at、deleted_at。

建议公共能力：附件、评论、@成员、关注、收藏、负责人、状态历史、时间线、活动日志、关联对象、AI摘要、AI建议、搜索索引、版本、Audit。

原则：Domain只定义业务特有字段。

## 19. 统一状态分层
不能让所有对象共用同一套业务状态，也不能让每个页面随意定义状态。

统一分为：
1. 平台生命周期：ACTIVE / ARCHIVED / DELETED等公共状态语义。
2. Domain业务状态：WorkItem、Listing、Receivable等各自业务状态机。
3. Integration技术状态：CONNECTED / DEGRADED / FAILED / DISCONNECTED。
4. Knowledge治理状态：DRAFT / VALIDATING / CURRENT / DEPRECATED等。

OUT_OF_STOCK属于库存派生条件，不建议作为SKU生命周期状态。
FAILED通常属于执行/连接结果，不应默认作为AIAsset主生命周期状态。

## 20. 统一权限模型
12之家统一采用：Role + Scope + Object + Field + Action Permission。

任何Domain不得另建独立权限体系。

需要重点支持：行级/Object Scope、字段级敏感数据、批量操作权限、高风险Action二次确认、AI上下文权限继承、Search/Analytics不得绕过来源权限、External Integration最小授权。

## 21. 统一平台能力归属
以下能力全部定义为Platform Capability，不属于任何一家私有实现：Authentication、Authorization、User/Identity、Search、File&Asset、Recycle Bin、Interaction、Notification、Task、Workflow、Import、Export、Publication、History/Audit、Version、Integration、Automation、AI Gateway、Analytics基础设施、Observability。

之家可以使用这些能力，但不能复制实现。

## 22. 统一View / Scope原则
我的、团队、事业、全部、关注、收藏、状态筛选等优先作为View / Scope，不新建第二套业务对象。

例如：我的选品、我的人才、我的AI、我的工作本质上应是统一对象在当前用户Scope下的视图。

## 23. 统一引用规则
跨之家引用统一使用稳定object_id + object_type / typed reference，不复制来源对象的完整字段。

必要的name/status等可做缓存投影，但必须能追溯source_version/source_updated_at，不能成为第二事实源。

## 24. 横向Review后的目标对象图
第一阶段建议形成以下核心主对象族：Organization、LegalEntity、Business、Project、WorkItem、Person、UserIdentity、AIAsset、Capability、Product、SKU、Inventory、Counterparty、Channel、Store、Listing、FinancialRecord、MetricDefinition、KnowledgeItem、DecisionRecord、Proposal、SharedResource、Asset、IntegrationResource。

后续Technical Design再拆实体/关系/事件/投影，不在Product Freeze阶段过早表结构化。

## 25. 当前需要修改回各Product Freeze Draft的事项
- 02：BusinessProject与Decision避免独立重复模型。
- 03：Proposal改为平台横向模型；工作子对象进一步区分实体/关系/平台记录。
- 04：组织/职位字段明确为01引用或任职投影；Capability抽象待技术设计。
- 05：Trace/Proposal不再作为05独占事实；Cost与09边界强化；AIAsset状态重新审查。
- 06：SKU移除OUT_OF_STOCK生命周期语义；Inventory ledger/source contract强化；Pricing标记待Review。
- 07：Counterparty与01 LegalEntity/06 Brand引用关系明确。
- 08：Listing归06；Integration/Secret走平台能力。
- 09：与外部会计系统Source of Truth Contract明确。
- 10：只拥有分析语义/指标，不拥有原始事实。
- 11：Project/Decision边界按统一模型修订。
- 12：Connector实现事实源与05/Platform Integration统一。

## 26. Governance判断
当前12份Product Freeze仍保持Draft，不应直接升为CURRENT。

横向Review完成并修改回各Draft后，才进入：Draft → 横向Review通过 → RC → 用户确认 → CURRENT V1.0。

任何未解决冲突必须列入Open Issues，不允许带着双重事实源进入main稳定基线。

## 27. 当前Review结论
第一轮横向Review已经确认：12之家目录总体结构稳定，主要风险已从“目录重复”转移到“对象重复、事实归属、平台能力重复实现和状态/字段漂移”。

当前最优先收口项：
1. Project唯一模型
2. DecisionRecord唯一模型
3. Proposal平台统一模型
4. User ↔ Person身份关系
5. Organization结构 vs Employment关系
6. Connector / Integration单一技术事实源
7. AI Trace / Cost / Proposal归属
8. Pricing / Cost边界
9. Inventory Source of Truth Contract
10. Object Foundation / Permission / Status统一

状态：Draft / 第一轮横向Review完成，待将结论逐份回写01～12 Product Freeze并进行第二轮一致性检查。
