# TD-01C｜AIONE Logical Schema Relationship Matrix & Migration Contract V1.0 Draft

状态：Draft / Relationship Matrix & Migration Contract
日期：2026-08-31
对照：AIONE 12之家 Product Freeze V1.0 CURRENT + TD-01/01A/01B

## 1. 目标
形成进入DDL前的唯一对象迁移矩阵，明确每个核心对象的Owner Domain、Object Kind、Source of Truth、现有来源、目标Contract、迁移方式、依赖关系与Deprecated策略。

## 2. Migration Mode
KEEP / EVOLVE / SPLIT / MERGE / BACKFILL / ADAPTER / DUAL_READ / DUAL_WRITE / DEPRECATE / PROJECTION。

默认规则：不做Big Bang Rewrite；先Contract，再Adapter/Backfill，再Read Path切换，最后移除Compatibility Layer。

## 3. Platform横向对象
- Project｜Platform｜Entity｜无统一主表 → Project｜NEW + BACKFILL｜废止BusinessProject/ProjectRecord主对象语义。
- DecisionRecord｜Platform｜Record｜无统一主表 → DecisionRecord｜NEW + scoped migration｜废止BusinessDecision/KnowledgeDecision双模型。
- Proposal｜Platform｜Record｜work_proposals + AI proposal语义 → Proposal｜NEW + BACKFILL + ADAPTER + DUAL_READ｜废止03私有Proposal主模型。
- CapabilityDefinition｜Platform｜Entity｜分散JSON能力语义 → CapabilityDefinition｜NEW + normalize/backfill｜废止Domain私有能力字典。
- Location｜Platform｜Entity｜分散地址/地点字段 → Location｜NEW + staged backfill｜废止InventoryLocation/StoreAddress等第二地点主档。
- Offer｜Platform Commerce｜Versioned Record｜SKU/Listing/渠道局部价格 → Offer｜NEW + staged backfill｜禁止动态价格进入SKU master。
- LegalEntity｜01｜Entity｜organizations(company)部分承担 → LegalEntity｜NEW + BACKFILL + relation to Organization。

## 4. Organization / Talent / Identity
- Organization｜01｜Entity｜organizations｜KEEP + EVOLVE。
- Department｜01｜Entity/subtype｜organizations｜KEEP + EVOLVE，不建第二组织树。
- Position｜01｜Entity｜positions｜KEEP + EVOLVE；逐步解除AI subtype强绑定。
- Person｜04｜Entity｜people｜KEEP，禁止另建persons。
- UserIdentity｜Platform Identity / 04 view｜Identity｜external_identities + preview registry｜KEEP + EVOLVE；preview registry退出正式事实路径。
- EmploymentRelation｜04｜Relation｜assignments混合语义｜NEW + SPLIT + BACKFILL。
- PositionAssignment｜04｜Relation｜assignments混合语义｜NEW + SPLIT + BACKFILL。
- HumanCapabilityProfile｜04｜Relation/Profile｜分散JSON｜NEW。
- HumanCapabilityEvidence｜04｜Record｜work/result/evidence refs｜NEW + reference reuse。
- CareerTimeline｜04｜Projection｜无统一模型｜PROJECTION only。

## 5. Work Domain
- WorkItem｜03｜Execution Entity｜work_items｜KEEP + EVOLVE；responsible_person_id取代owner_person_id兼容镜像。
- WorkAssignment｜03｜Relation｜work_item_participants + owner/assignee字段｜EVOLVE + normalize。
- WorkSession｜03｜Event/Fact｜work_sessions｜KEEP。
- WorkEvidence｜03｜Record｜work_evidence｜KEEP + FileReference升级。
- WorkResult｜03｜Record｜result_facts部分语义｜SPLIT + BACKFILL。
- MetricObservation｜10/Analytics input｜Event/Fact｜result_facts部分语义｜SPLIT。
- WorkSummary｜03 view / 11 formal knowledge｜Projection｜页面/AI生成｜PROJECTION；成熟后转KnowledgeItem。

## 6. AI Domain
- AIAsset｜05｜Entity｜ai_talents｜EVOLVE并迁移语义，保留稳定ID。
- AICapabilityBinding｜05｜Relation｜ai_talents.capability_profile / ai_assignments部分语义｜NEW + BACKFILL。
- AITrainingRecord｜05｜Record｜分散metadata/log｜NEW when needed。
- AIEvaluationRecord｜05｜Record｜分散测试结果｜NEW when needed。
- AIExecutionTrace｜Platform AI Gateway/Observability｜Trace/Event｜ai_executions｜KEEP facts + migrate contract。
- AIOffice｜05 business context｜Entity/Config｜ai_offices｜KEEP + EVOLVE；不作为AIAsset事实源。
- AIAssetScopeBinding｜05｜Relation｜ai_assignments｜SPLIT/EVOLVE。

## 7. Product / Inventory / Counterparty / Channel
- ProductOpportunity｜06 selection context｜Entity/Opportunity Record｜product_opportunities｜KEEP；不等于Product。
- Product｜06｜Entity｜无统一主表｜NEW。
- SKU｜06｜Entity｜无统一主表｜NEW。
- InventoryMovement｜06｜Event｜无统一模型｜NEW if AIONE_MASTER；EXTERNAL_MASTER时由Integration投影进入。
- InventoryBalance｜06｜Projection｜无统一模型｜PROJECTION。
- Brand｜06｜Entity｜分散文本｜NEW + normalize。
- Listing｜06｜Record/Entity｜上架局部数据｜NEW。
- Counterparty｜07｜Entity｜客户/供应商局部模型｜NEW + MERGE identities by role。
- CounterpartyRole｜07｜Relation｜customer/supplier分类语义｜NEW。
- Channel｜08｜Entity｜route/config语义｜NEW/normalize。
- Platform｜08｜Entity｜platform_code等散落字段｜NEW/normalize。
- Store｜08｜Entity｜店铺配置/route语义｜NEW/normalize。

## 8. Finance / Knowledge / Shared / Analytics
- FinancialRecord Family｜09｜Record/Event family｜money_events｜SPLIT staged；money_events作为Compatibility Source。
- MetricDefinition｜10｜Definition Entity｜metric_code散落｜NEW + register existing metrics。
- DashboardDefinition｜10｜Projection Definition｜页面配置｜NEW/config-driven。
- KnowledgeItem｜11｜Versioned Entity/Record｜knowledge_routes只是路由｜NEW；knowledge_routes保留routing index。
- KnowledgeVersion｜11｜Record｜无统一模型｜NEW。
- SharedResource｜12｜Entity｜Drive/共享资源局部模型｜NEW/normalize。
- File｜Platform File Capability｜Entity｜Drive refs｜物理实现由TD-06锁定。
- Asset｜Platform foundation + 12 view｜Entity｜Drive Asset语义｜EVOLVE under TD-06。
- IntegrationResource｜12 governance｜Entity｜专项integration configs｜NEW + normalize。
- IntegrationRuntimeConfig｜Platform Integration Service｜Config｜各专项模块｜MERGE into runtime contract。
- BusinessEvent/AuditEvent｜Platform Audit｜Event｜business_events + activity_logs｜KEEP business_events + MERGE activity_logs + DEPRECATE重复路径。
- ObjectReaction｜Platform Interaction｜Relation/Event｜object_reactions｜KEEP + EVOLVE。
- ObjectRegistry｜Platform Index｜Index｜object_registry｜KEEP，不作为事实源。
- ObjectRelation｜Platform Relation Foundation｜Relation｜object_relations｜KEEP + typed relation registry。

## 9. Source of Truth
AIONE_MASTER：AIONE可写；EXTERNAL_MASTER：AIONE只通过Adapter/Proposal调用源系统或维护本地Projection；FEDERATED_READONLY_VIEW：多源聚合但不产生第二事实源。

所有外部主导对象必须记录source_system_ref、source_record_id、authority_mode、source_version/etag、last_synced_at。

## 10. Migration Waves
M0 Live DB Preflight。
M1 Identity/Reference foundation：UserIdentity、typed reference、LegalEntity、Location。
M2 Platform governance objects：Project、DecisionRecord、Proposal、CapabilityDefinition。
M3 Talent relations：EmploymentRelation、PositionAssignment、Human/AI capability bindings。
M4 Work migration：Proposal、WorkAssignment、WorkResult/Event边界。
M5 Commerce core：Product/SKU/Counterparty/Channel/Store/Listing/Offer/Inventory。
M6 Finance/Knowledge/Analytics/Shared normalization。
M7 Compatibility removal。

## 11. Compatibility Layer
兼容层必须有owner、start_version、target_remove_version、read/write mode。新功能不得直接依赖Deprecated表。DUAL_WRITE默认禁用；仅无法Adapter兼容时短期使用，并强制reconciliation。

Read Path切换前必须检查row count、key mapping、sample payload、status mapping、timestamp/actor一致性。删除旧表前至少一个稳定发布周期只读运行，并通过CI禁止新增引用。

## 12. Deprecated候选
assignments作为最终人才关系主表；owner_person_id作为WorkItem正式负责人字段；work_proposals作为03私有Proposal主表；ai_talents旧混合类型语义；ai_assignments混合岗位/AI绑定语义；activity_logs重复事件写入；money_events作为最终财务Domain模型；knowledge_routes作为Knowledge主对象；任何BusinessProject、BusinessDecision、InventoryLocation第二主模型。

## 13. DDL Gate
新DDL进入开发分支前必须满足：唯一owner/kind；SoT明确；旧表映射已定义；backfill/rollback/idempotency已定义；API读写路径已确定；Permission/Audit已定义；不制造第二事实源。

## 14. TD-01阶段结论
现有数据库可以安全演进到CURRENT，不需要重建。混合架构已经被转换成逐对象Migration Contract：保留可复用事实、拆分过载语义、补齐缺失横向对象，再通过Adapter/Backfill/Read Path切换退出旧模型。

## 15. 下一步
TD-01D｜Physical Schema & Migration Plan V1.0 Draft：针对M1/M2第一批对象设计目标表、索引、FK策略、migration编号、backfill、rollback和验证，但不直接修改main。
