# TD-01A｜AIONE Existing DB Mapping Review V1.0 Draft

状态：Draft / Existing DB Mapping Review
日期：2026-08-31
对照：AIONE 12之家 Product Freeze V1.0 CURRENT + TD-01 Object Model & Domain Contract

## 1. 目标
逐表判断当前main数据库结构应如何迁移到CURRENT对象模型，明确：保留、重命名/映射、拆分、合并、升级、仅作兼容、最终废止。

原则：不删真实业务事实，不做Big Bang Rewrite；先Contract、再Adapter、再Backfill、再Read Path切换、最后删除旧兼容层。

## 2. 当前Migration基础
当前migration序列已包含：0001、0010、0020、0030、0040、0050、0060、0070。

现有migrate.js按版本号顺序执行SQL并写schema_migrations，说明已经具备可演进的数据库迁移机制；无需重建数据库。

## 3. 现有表逐一映射

### public.people｜KEEP / CANONICAL
CURRENT：Person。保留为Person canonical table候选；补UserIdentity映射与EmploymentRelation/PositionAssignment引用。禁止另建第二套persons主表。

### public.external_identities｜KEEP / EVOLVE
CURRENT：UserIdentity / ExternalIdentity。保留并演进，统一provider、subject、person_ref、status、verified_at等Contract；Google登录不长期依赖Preview Registry。

### public.organizations｜KEEP / EVOLVE
CURRENT：Organization。保留树结构；LegalEntity必须独立建模，不用organizations(company)永久替代法人。

### LegalEntity｜NEW DOMAIN ENTITY
新增独立LegalEntity Contract；Organization/Counterparty/Brand只通过Reference/Relation关联。

### public.businesses｜KEEP / EVOLVE
CURRENT：Business。保留；BusinessGoal、BusinessPlan、BusinessArchitecture后续按正式Contract拆分，不把所有语义长期塞JSONB。

### public.positions｜KEEP / EVOLVE
CURRENT：Position。保留组织岗位定义；逐步废止AI作为Position subtype的强绑定。

### public.assignments｜SPLIT / COMPATIBILITY
CURRENT拆为EmploymentRelation + PositionAssignment。assignments进入Compatibility Layer，backfill后停止新写入并最终Deprecated。

### public.object_registry｜KEEP AS INDEX / NOT FACT SOURCE
保留跨Domain对象索引，不成为业务事实源。

### public.object_relations｜KEEP / UPGRADE
保留Typed Relation foundation；增加relation schema registry、source_version、有效期、permission/audit约束。强语义关系仍使用专属Relation对象。

### public.work_items｜KEEP / PRIMARY FACT
CURRENT：WorkItem。保留为03唯一主执行事实。owner_person_id作为responsible_person_id兼容镜像逐步Deprecated。

### public.work_item_participants｜KEEP / RELATION
保留Work participant relation，不再新增第二套WorkCollaboration主表。

### public.work_sessions｜KEEP / EVENT-FACT
保留时间证据事实。

### public.work_evidence｜KEEP / RECORD
保留；evidence_uri后续升级为FileReference/AssetReference。

### public.result_facts｜REVIEW / SPLIT SEMANTICS
拆分WorkResult与MetricObservation语义；先保留兼容，后续按result_type backfill。

### public.money_events｜COMPATIBILITY / FINANCE DOMAIN MIGRATION
保留历史事实，但不继续作为长期唯一财务模型；后续迁往Revenue/Expense/Receivable/Payable/CashMovement/Cost等正式Contract。

### public.business_events｜KEEP / PLATFORM AUDIT FOUNDATION
保留并升级为Platform Event/Audit底座。

### public.knowledge_routes｜KEEP AS ROUTING INDEX / NOT KNOWLEDGE MASTER
保留对象/字段→KnowledgeItem路由索引；新增KnowledgeItem正式主对象。

### public.ai_executions｜KEEP / MIGRATE TO TRACE-EXECUTION
保留真实执行数据，迁往Platform AI Gateway/Observability Contract；status是执行状态，不是AIAsset生命周期。

### public.ai_talents｜MIGRATE TO AIAsset
保留ID和数据，迁为AIAsset；CapabilityDefinition + AICapabilityBinding拆出。

### public.ai_offices｜KEEP AS BUSINESS CONTEXT
保留业务/岗位上下文配置，但不是AIAsset主事实或AI Gateway核心对象。

### public.ai_assignments｜MIGRATE TO BINDING/RELATION
迁为AIAsset↔Office/Scope绑定关系，不复制Human PositionAssignment语义。

### public.object_reactions｜KEEP / INTERACTION FOUNDATION
保留为Interaction平台能力的一部分。

### public.work_seeds｜KEEP AS IMPORT/STAGING RECORD
保留批量导入临时记录，设置retention，不升级为长期Domain主对象。

### public.work_proposals｜MIGRATE TO PLATFORM Proposal
必须从03私有Proposal迁到Platform Proposal：新Contract→backfill→Adapter双写/兼容→读路径切换→Deprecated。

### public.product_opportunities｜KEEP / DOMAIN FACT
保留真实商品机会/选品事实，不等于Product主档；后续typed reference关联Product/SKU/Counterparty/Project/WorkItem。

### public.activity_logs｜MIGRATE / CONSOLIDATE
与business_events可能重叠；新写入统一Platform Audit/Event，完成backfill后Deprecated。

## 4. CURRENT缺失对象
P0横向：Project、DecisionRecord、Proposal、CapabilityDefinition、Location、Offer、LegalEntity、EmploymentRelation、PositionAssignment、UserIdentity统一Contract。

后续Domain：Product、SKU、InventoryMovement、InventoryBalance、Counterparty、Channel、Platform、Store、Listing、FinancialRecord family、MetricDefinition、KnowledgeItem、SharedResource、File、Asset、IntegrationResource。

新增Contract不等于每个对象立刻新建一张表；先定义语义边界，再决定物理Schema。

## 5. Migration Waves
Wave 0：Live DB preflight，确认真实列、类型、行数、FK、索引、脏数据。
Wave 1：Platform横向对象。
Wave 2：Identity & Talent。
Wave 3：Work。
Wave 4：Product / Counterparty / Channel。
Wave 5：Finance / Knowledge / Analytics。
Wave 6：删除Compatibility Layer。

## 6. 数据迁移硬规则
- 不丢历史ID；必要时legacy_id/external_ref映射。
- 不覆盖原始时间戳与actor。
- backfill必须幂等可重跑。
- 双写必须有reconciliation check。
- Read Path切换前做count/hash/sample一致性校验。
- 删除旧表前至少经历一个稳定发布周期。
- 外部ERP/WMS/会计事实先定义Source of Truth Contract。

## 7. 当前判断
当前数据库不是废掉重来的数据库，而是有大量可保留核心：people、organizations、businesses、positions、work_items、work evidence/session、business_events、object relations/reactions、product_opportunities等。

真正需要解决的是旧表承担过多语义、横向对象缺失和Domain边界不清。通过分波迁移，可以彻底消除混合架构并保住真实业务事实。

## 8. 下一步
TD-01B：CURRENT Logical Schema V1.0 Draft。先定义逻辑对象、关系、ID、状态、引用与Event边界，不直接写DDL。
