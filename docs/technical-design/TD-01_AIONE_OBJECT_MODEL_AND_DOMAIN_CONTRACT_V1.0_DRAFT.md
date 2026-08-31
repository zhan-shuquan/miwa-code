# TD-01｜AIONE Object Model & Domain Contract V1.0 Draft

状态：Draft / Technical Design
日期：2026-08-31
适用：美和AIONE一体化工作平台（AIONE）

## 1. 目标
建立AIONE唯一、稳定、可迁移的对象模型Contract，把CURRENT Product Freeze中的对象边界转换为数据库、API、权限、搜索、AI、审计和自动化可共同使用的技术定义。

本Contract解决当前main的核心问题：旧Core Model是真实实现，但只覆盖前期Organization / Business / Work / AI Office等对象；CURRENT已经扩展为12之家+Platform横向对象。如果继续沿旧模型扩展，会再次产生第二套对象和字段。

原则：不删除真实数据，不Big Bang重写；先定义新Contract，再通过Migration/Adapter迁移。

## 2. 对象分类
AIONE对象统一分为五类：
1. Entity：有稳定身份、生命周期的主对象。
2. Relation：两个或多个Entity之间的关系事实。
3. Event：已经发生、原则上不可变的事件事实。
4. Record：业务/治理记录，可有版本与状态，但不是主实体身份。
5. Projection：查询/分析/缓存派生结果，不是事实源。

任何新对象进入系统前必须先判定属于哪一类。

## 3. Platform横向对象
- Project｜Entity
- DecisionRecord｜Record
- Proposal｜Record / Pre-execution Governance Object
- CapabilityDefinition｜Entity/Definition
- Location｜Entity
- Offer｜Entity/Commercial Record

这些对象只能存在一套技术定义，不归任一单一家独占。

## 4. Domain对象归属
### 01 美和之家
Organization、LegalEntity、Department、Position及治理/战略Record。

### 02 事业之家
Business、BusinessGoal、BusinessPlan、BusinessArchitecture、BusinessReview。
Project/Decision使用Platform对象。

### 03 工作之家
WorkItem｜Entity
WorkAssignment｜Relation
WorkParticipant / Collaboration｜Relation
WorkResult｜Record/Event-linked Result
WorkEvidence｜Record/Reference
WorkSession｜Event/Fact
WorkSummary｜Projection
WorkActivity｜Event/Audit

### 04 人才之家
Person｜Entity
UserIdentity｜Platform Identity Entity
EmploymentRelation｜Relation
PositionAssignment｜Relation
HumanCapabilityProfile｜Relation/Profile
HumanCapabilityEvidence｜Record
TalentDevelopment｜Record/Plan
PerformanceRecord｜Record
CompensationContext｜敏感Record
CareerTimeline｜Projection

### 05 AI之家
AIAsset｜Entity
AICapabilityBinding｜Relation
AITrainingRecord｜Record
AIEvaluationRecord｜Record
AIExecutionTrace｜Platform AI Gateway Event/Trace
AICostUsage｜Platform Usage Fact

### 06 商品之家
Product、SKU、Category、Brand、AttributeDefinition、AttributeValue/ProductAttributeBinding、Listing、InventoryMovement、InventoryBalance。

### 07 往来之家
Counterparty、CounterpartyRole、ContactPoint、CounterpartyLocationRelation、BusinessRelation。
客户、供应商、物流商、服务商、合作单位通过Role/Scope表达，不建立多套Company主表。

### 08 渠道之家
Channel、Platform、Store、ChannelConfiguration、StoreLocationRelation。

### 09 财务之家
至少区分RevenueRecord、ExpenseRecord、Receivable、Payable、CashMovement、CostRecord、BudgetRecord、AccountingEntry/ExternalAccountingRef、TaxRecord。
MoneyEvent可以保留为不可变金额事件底座，但不得替代全部正式财务对象。

### 10 分析之家
MetricDefinition、DimensionDefinition、DashboardDefinition、Insight、Forecast、AnalyticalDataset。

### 11 知识之家
KnowledgeItem、KnowledgeVersion、KnowledgeRelation、KnowledgePublication。
Policy/Standard/Method/SOP/Template作为KnowledgeItem类型。

### 12 共享之家
SharedResource、Asset、IntegrationResource。
代码事实归GitHub；File底层能力归Platform。

## 5. Platform Foundation对象
统一Platform Foundation至少包括：ObjectIdentity/ObjectRegistry、TypedObjectReference、File、AssetReference、Comment/Interaction、Follow/Favorite、Tag/ObjectTag、Owner/Responsibility Relation、PermissionPolicy/PermissionBinding、Notification、AuditEvent/BusinessEvent、StatusHistory、VersionRecord、SearchDocument/SearchIndex projection、IntegrationRuntimeConnection、SourceOfTruthContract、AutomationDefinition/AutomationRun、WorkflowDefinition/WorkflowInstance、AIExecutionTrace/AIUsage。

## 6. 通用Object Foundation字段
稳定Entity原则上支持：id、code、name/title、lifecycle_status、owner_ref、business_scope_ref、organization_scope_ref、tags、version/record_version、source_system、created_at/created_by、updated_at/updated_by、archived_at、deleted_at、metadata。

metadata只能承载低稳定性扩展，不能把核心字段长期塞JSON逃避Schema治理。

## 7. ID与Reference Contract
- 建议保留`prefix_uuid`格式，但prefix进入统一Object Type Registry。
- 跨Domain统一Typed Reference：`{object_type, object_id}`。
- 高频核心关系可有物理FK；API/事件/搜索/AI上下文统一使用Typed Reference。
- 跨Domain缓存字段只是Projection，必须可追溯来源。

## 8. Relation Contract
Relation统一字段：id、relation_type、from_ref、to_ref、valid_from、valid_to、status、created_at、metadata。

高价值稳定关系如EmploymentRelation、PositionAssignment、WorkAssignment专表化；长尾关系可继续使用通用object_relations。

## 9. Event Contract
Event默认Append-only。
统一字段：id、event_type、object_ref、actor_ref、happened_at、correlation_id、causation_id、source_system、payload、schema_version。

现`business_events`可以作为迁移基础。

## 10. 状态Contract
状态分层：
1. lifecycle_status
2. domain_status
3. health_status
4. governance_status

禁止把OUT_OF_STOCK、FAILED、DEGRADED等不同语义混入通用生命周期。

## 11. Version与Soft Delete
- 核心可变Entity必须有record_version或等价乐观锁。
- PATCH需支持版本冲突检测。
- 默认Soft Delete；永久删除为高风险Action。
- 正式知识、决策、关键财务/审计事实不得普通DELETE物理删除。

## 12. Source of Truth Contract
最小字段：domain_object_type、scope、source_system_ref、authority_mode、sync_direction、conflict_policy、idempotency_strategy、version_strategy、freshness_sla、reconciliation_policy、owner_ref。
同一scope只能有一个authority master。

## 13. 当前main对象迁移映射
### 可保留并演进
organizations → Organization
businesses → Business
positions → Position
work_items → WorkItem
work_sessions → WorkSession
work_evidence → WorkEvidence
business_events → AuditEvent / BusinessEvent基础
object_registry → Object Identity Registry基础
object_relations → Long-tail Relation基础
result_facts → WorkResult/Metric Fact迁移基础

### 需要拆分/重命名/明确边界
assignments → EmploymentRelation / PositionAssignment
ai_talents → AIAsset
ai_assignments → 重新判断为AICapability/AIOffice/Responsibility Relation
ai_executions → AI Gateway Trace/Usage
money_events → 不可变金额事件底座，正式财务Domain另建Record模型
knowledge_routes → 知识Relation/Route，不等于KnowledgeItem

### CURRENT尚缺，需要新增Contract后迁移
Project、DecisionRecord、Proposal、CapabilityDefinition、Location、Offer、Person/UserIdentity正式映射、Product、SKU、InventoryMovement、Listing、Counterparty、Channel、Store、MetricDefinition、KnowledgeItem、SharedResource、Asset、IntegrationResource、SourceOfTruthContract。

## 14. API映射规则
对象Contract不直接等于CRUD Route。
API必须通过：API Route → Application Service → Domain Policy → Repository → DB/External Adapter。

通用CRUD只适合低风险基础对象；Work、Finance、Permission、Proposal、Decision、Integration等必须有Domain Action API。

## 15. Object Registry V2方向
object_registry只做统一对象目录，不复制业务数据。
建议字段：object_type、object_id、canonical_domain、canonical_table/service、display_name_projection、lifecycle_status_projection、business_scope_ref、owner_ref、source_system_ref、record_version_projection、updated_at。

## 16. Migration原则
1. 先新增Schema/Contract，不原地破坏旧表。
2. 建Adapter同时读旧/新，先Shadow Read。
3. 新写入逐步切CURRENT模型；必要时短期Dual Write，但必须有结束日期和一致性检查。
4. Backfill历史数据。
5. 切Read Path。
6. Deprecated旧API/字段。
7. Guardrail禁止新代码依赖旧Contract。
8. 最终删除Compatibility Layer。

## 17. TD-01验收标准
- CURRENT核心对象都有唯一分类和Domain归属。
- Platform横向对象只有一套技术定义。
- Entity / Relation / Event / Record / Projection边界清楚。
- 当前main旧对象有迁移去向。
- ID / Reference / Status / Version / Soft Delete / Audit / Source of Truth统一。
- 旧assignment、ai_talent、money_event等不再无边界扩张。
- 可据此进入Schema Design与API Contract。

## 18. Open Technical Questions
1. Department是否完全采用Organization subtype。
2. Platform横向对象物理Schema采用统一platform schema还是按Domain service schema组织。
3. Typed Reference在PostgreSQL采用object_registry FK、复合字段还是应用层Contract为主。
4. Proposal/Decision/Project的字段级权限矩阵。
5. FinancialRecord拆分粒度及money_events迁移关系。
6. Person正式Source与现public.people兼容细节。
7. Product/SKU/Inventory现存业务表的实际main schema审计。

状态：Draft / Object Model核心边界已定义，待Schema与现库映射Review。
