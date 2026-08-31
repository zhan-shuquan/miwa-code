# TD-01B｜AIONE CURRENT Logical Schema V1.0 Draft

状态：Draft / Logical Schema
日期：2026-08-31
对照：AIONE 12之家 Product Freeze V1.0 CURRENT + TD-01/TD-01A

## 1. 目标
定义AIONE CURRENT对象的逻辑Schema、对象类型、ID、关系、状态与引用规则。本阶段只锁逻辑Contract，不直接等同DDL。

## 2. 统一对象分类
- Entity：长期稳定身份，如Organization、Person、Product、Project。
- Relation：两个以上Entity之间的业务关系，如EmploymentRelation、PositionAssignment。
- Event：已经发生且原则上不可变的事实，如BusinessEvent、InventoryMovement。
- Record：需要治理、确认、版本或审批的记录，如DecisionRecord、Proposal。
- Projection：可重建视图/汇总，如InventoryBalance、CareerTimeline、Dashboard。

## 3. Platform横向对象
### Project｜Entity
字段方向：id, code, name, description, owner_ref, business_scope, organization_scope, status, start_at, due_at, completed_at, milestone_refs, related_object_refs, created_at, updated_at, version, archived_at。

### DecisionRecord｜Record
字段方向：id, title, decision_type, source_object_ref, business_scope, owner_ref, participant_refs, context_summary, option_refs, decision_result, reasoning_summary, evidence_refs, status, effective_at, review_at, supersedes_ref, created_at, updated_at, version。

### Proposal｜Record
字段方向：id, proposal_type, actor_type, actor_ref, source_object_ref, target_object_refs, action_type, payload, rationale, risk_level, permission_context, confirmation_policy, status, expires_at, reviewed_by_ref, reviewed_at, execution_ref, result_ref, error_ref, created_at, updated_at, version。

### CapabilityDefinition｜Entity
字段方向：id, code, name, category, description, level_model_ref, evidence_policy_ref, status, version。

### Location｜Entity
字段方向：id, code, name, location_type, address_ref, geo_ref, timezone, country, region, owner_scope, status, external_refs, valid_from, valid_to, version。

### Offer｜Entity/Record hybrid，Technical Design阶段按可版本化商业条件处理
字段方向：id, sku_ref, listing_ref, channel_ref, store_ref, market_ref, price, currency, tax_mode, valid_from, valid_to, customer_scope, contract_ref, quantity_rule_ref, promotion_ref, price_type, source_system_ref, status, version。

## 4. 01～12核心Domain对象
01：Organization、LegalEntity、Department、Position、GovernanceRecord、StrategyRecord。
02：Business、BusinessGoal、BusinessPlan、BusinessArchitecture、BusinessReview。
03：WorkItem、WorkAssignment、WorkResult、WorkEvidence、WorkSession。
04：Person、UserIdentity、EmploymentRelation、PositionAssignment、HumanCapabilityProfile、HumanCapabilityEvidence、PerformanceRecord、DevelopmentRecord、CompensationContext。
05：AIAsset、AICapabilityBinding、AITrainingRecord、AIEvaluationRecord、AIUsageCostProjection；Execution Trace归Platform AI Gateway/Observability。
06：Product、SKU、Category、Brand、AttributeDefinition、AttributeValue、InventoryMovement、InventoryBalance、Listing。
07：Counterparty、CounterpartyRole、ContactPoint、CounterpartyRelation。
08：Channel、Platform、Store、ChannelConfiguration。
09：RevenueRecord、ExpenseRecord、Receivable、Payable、CashMovement、CostRecord、AccountingRecord、TaxRecord、Budget、FinancialStatement。
10：MetricDefinition、DimensionDefinition、DashboardDefinition、Insight、Forecast。
11：KnowledgeItem、KnowledgeVersion、Policy、Standard、Method、SOP、Template。
12：SharedResource、Asset、IntegrationResource。

## 5. Identity与Reference
- 所有主对象使用稳定AIONE ID，不使用页面路径或显示名称作为主键。
- UserIdentity ≠ Person；通过person_ref映射。
- 跨Domain引用统一使用typed reference：{object_type, object_id}。
- 外部系统ID保存在external_refs/source_record_id，不替代AIONE ID。
- 缓存投影必须保留source_version/source_updated_at。

## 6. 公共Object Foundation字段
建议所有可治理对象统一支持：id, code(可选), name/title, lifecycle_status, owner_ref, business_scope, tags, permission_ref, created_at, created_by_ref, updated_at, updated_by_ref, version, archived_at, deleted_at, source_system。

不是所有对象都必须物理复制这些字段；可通过共享基类/Contract实现。

## 7. 状态分层
### Platform Lifecycle
DRAFT/ACTIVE/ARCHIVED/DELETED仅用于适合该语义的通用生命周期，不强迫所有Domain套同一枚举。

### Domain Status
WorkItem、Listing、Receivable等各自状态机独立。

### Integration Health
CONNECTED/DEGRADED/ERROR/UNAVAILABLE/DISCONNECTED。

### Knowledge Governance
DRAFT/VALIDATING/CURRENT/DEPRECATED/ARCHIVED。

### AIAsset Lifecycle
DRAFT/VALIDATING/ACTIVE/PAUSED/RETIRED/ARCHIVED/DELETED。

规则：业务状态、运行健康、知识治理状态不得混在一个status字段中。

## 8. 关键关系
- Organization 1:N Department；Position属于Organization/Department。
- Person N:M Organization通过EmploymentRelation。
- Person N:M Position通过PositionAssignment。
- Business 1:N Project（通过business_scope/Project relation）。
- Project 1:N WorkItem。
- WorkItem 1:N WorkAssignment / WorkResult / WorkEvidence / WorkSession。
- Product 1:N SKU。
- SKU N:M Store/Channel通过Listing。
- SKU/Listing N:M商业条件通过Offer。
- SKU + Location产生InventoryMovement；InventoryBalance为Projection。
- Counterparty通过Role表达Customer/Supplier/Logistics/Service Provider等身份。
- AIAsset N:M CapabilityDefinition通过AICapabilityBinding。
- Person N:M CapabilityDefinition通过HumanCapabilityProfile。
- 任意业务对象可引用Proposal、DecisionRecord、KnowledgeItem、File/Asset、Project。

## 9. Event / Record边界
- BusinessEvent/Audit Event：已发生事实，不允许业务页面直接修改历史。
- Proposal：建议，不等于执行。
- DecisionRecord：正式决策，不等于Proposal。
- WorkResult：工作结果，不等于Decision或Knowledge。
- KnowledgeItem：经过治理后可复用知识，不等于原始文件或即时总结。

## 10. Projection原则
InventoryBalance、CareerTimeline、Dashboard、AI Cost Analysis、My/Team/Business/All视图均属于Projection/View，可从事实重建，不得成为第二事实源。

## 11. Source of Truth字段
所有可能由外部系统主导的对象/记录应支持：source_system_ref, source_record_id, authority_mode, source_version/etag, last_synced_at。

authority_mode：AIONE_MASTER / EXTERNAL_MASTER / FEDERATED_READONLY_VIEW。

## 12. 逻辑Schema与当前DB映射
- people → Person
- external_identities → UserIdentity/ExternalIdentity
- organizations → Organization
- businesses → Business
- positions → Position
- assignments → EmploymentRelation + PositionAssignment Compatibility Source
- work_items → WorkItem
- work_item_participants → WorkAssignment/Participant Relation
- work_sessions → WorkSession
- work_evidence → WorkEvidence
- result_facts → WorkResult / MetricObservation，待分型
- business_events → Platform Event/Audit
- work_proposals → Platform Proposal，待迁移
- ai_talents → AIAsset，待迁移
- ai_assignments → AICapability/Scope Binding，待迁移
- ai_executions → AI Execution Trace，待迁移
- money_events → Finance Compatibility Source，待分Domain
- knowledge_routes → Knowledge routing index
- object_registry / object_relations / object_reactions → Platform indexing/relation/interaction foundation

## 13. 第一批物理Schema候选
进入DDL前优先建立：LegalEntity、Project、DecisionRecord、Proposal、CapabilityDefinition、Location、Offer、EmploymentRelation、PositionAssignment，以及必要的typed reference/index基础。

其中Proposal、Employment/PositionAssignment必须先设计兼容旧表的backfill与dual-read策略。

## 14. 不允许的建模方式
- 不按页面建表。
- 不为“我的/团队/全部”复制表。
- 不让同一Partner分别建Customer/Supplier公司主表。
- 不把动态价格塞进SKU。
- 不把库存余额作为唯一不可追溯事实。
- 不把AI失败状态写进AIAsset生命周期。
- 不把文件当KnowledgeItem。
- 不把Project/Decision/Proposal在多个之家复制。

## 15. RC前待确认项
1. Offer最终采用独立版本表还是主表+version history。
2. LegalEntity与内部Organization的关系模式。
3. ResultFact拆分WorkResult/MetricObservation的迁移规则。
4. File/Asset物理Schema由TD-06锁定。
5. Financial family物理拆表程度由财务Technical Design锁定。

## 16. 下一步
TD-01C：Logical Schema Relationship Matrix & Migration Contract。把每个对象的owner domain、object kind、source of truth、现有表、目标表、迁移方式、依赖关系形成唯一矩阵，为后续DDL和Migration Plan提供直接输入。
