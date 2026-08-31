# 00｜AIONE 12之家最终横向Review Overrides V1.0 RC Candidate

状态：RC Candidate / 最终回写覆盖层
适用：美和AIONE一体化工作平台（AIONE）

## 1. 用途
本文件用于集中记录2026-08-31第三轮横向Review后的最终跨之家架构结论，并作为01～12 Product Freeze Draft中存在冲突描述时的优先覆盖依据。

优先级：本文件 + 00_AIONE_12_HOME_HORIZONTAL_REVIEW_V1.0_DRAFT.md 的第29～32节，高于01～12各Draft中更早且已被横向Review修正的冲突描述。

本文件不是Implementation Truth，不声明main已经实现。

## 2. 01 美和之家最终覆盖
- Organization / LegalEntity / Department / Position结构定义归01。
- Person任职事实不在01重复维护；EmploymentRelation / PositionAssignment归04。
- Project、DecisionRecord、Proposal、CapabilityDefinition、Location均使用Platform横向统一模型。
- Brand、Counterparty、LegalEntity保持独立对象。

## 3. 02 事业之家最终覆盖
- Business / Goal / Plan / Architecture继续归02。
- Project不归02独占；统一使用Platform Project，02只提供经营项目/Portfolio View。
- BusinessDecision不再作为独立主对象；统一引用Platform DecisionRecord。
- 工作执行归03，正式知识沉淀归11。

## 4. 03 工作之家最终覆盖
- WorkItem是唯一主执行对象。
- WorkAssignment为关系对象。
- WorkCollaboration优先复用Interaction / Participant关系。
- WorkResult为结果对象。
- WorkEvidence为证据或File/Reference关联。
- WorkSummary为派生/知识化投影；正式沉淀进入KnowledgeItem。
- WorkHistory / Activity归Platform Audit / Timeline。
- Project / Proposal / Decision均引用Platform统一对象。

## 5. 04 人才之家最终覆盖
- User ≠ Person，并建立映射。
- Organization / Department / Position定义归01。
- EmploymentRelation与PositionAssignment保留独立：前者表达雇佣/任职身份，后者表达具体岗位分配。
- 一个EmploymentRelation可对应多个PositionAssignment。
- CareerTimeline为派生视图。
- CapabilityDefinition归Platform；04通过HumanCapabilityProfile / Evidence表达人的能力事实。

## 6. 05 AI之家最终覆盖
- AIAsset生命周期：DRAFT / VALIDATING / ACTIVE / PAUSED / RETIRED / ARCHIVED / DELETED。
- AI运行健康状态独立：HEALTHY / DEGRADED / ERROR / UNAVAILABLE。
- FAILED不作为AIAsset生命周期状态。
- CapabilityDefinition归Platform；05通过AICapabilityBinding表达AI能力事实。
- AIExecutionTrace归AI Gateway / Observability。
- Proposal统一使用Platform Proposal。
- Connector/API/Automation等源码事实归GitHub，运行连接归Platform Integration Service，05只承载AI能力语义。

## 7. 06 商品之家最终覆盖
- Product / SKU / Category / Brand / Attribute / Listing归06。
- Brand ≠ Counterparty ≠ LegalEntity。
- Inventory统一引用Platform Location，不建第二套InventoryLocation主档。
- AIONE自管库存时：InventoryMovement为事实，InventoryBalance为派生投影。
- 外部ERP/WMS为权威时必须使用Source of Truth Contract。
- OUT_OF_STOCK是库存派生条件，不是SKU生命周期状态。
- 渠道化销售价格不进SKU master；统一使用Platform Commerce Offer。
- Listing ≠ Offer ≠ Publication。

## 8. 07 往来之家最终覆盖
- Counterparty为统一外部往来主体。
- 与01 LegalEntity、06 Brand保持独立，通过Reference关联。
- 稳定经营地点引用Platform Location。
- 商务条件可留在07关系语义；正式应收应付、结算、会计事实归09。
- Contract/File/Interaction/Audit/Search等公共能力不得在07重复实现。

## 9. 08 渠道之家最终覆盖
- Channel / Platform / Store归08。
- 稳定物理地点引用Platform Location。
- Product/SKU上架映射归06 Listing。
- 价格统一使用Platform Commerce Offer；08仅提供渠道价格策略View/配置入口。
- IntegrationResource为业务注册表；运行配置归Platform Integration Service；Secret归Secret Manager。
- 批发/加盟/代理主体引用07 Counterparty。

## 10. 09 财务之家最终覆盖
- 正式财务事实归09。
- 外部会计/ERP/银行/支付系统共享事实时必须使用Source of Truth Contract。
- authority_mode至少支持AIONE_MASTER / EXTERNAL_MASTER / FEDERATED_READONLY_VIEW，禁止双主。
- Offer表达交易前销售条件；09拥有交易发生后确认的收入、折扣、税、成本、结算与会计事实。
- AICost运行计量来自AI Gateway/Usage；09承接正式费用、付款、预算与会计事实。

## 11. 10 分析之家最终覆盖
- 10只拥有MetricDefinition / Dimension / Semantic Layer / Dashboard / Insight / Forecast等分析语义与结果。
- 不拥有原始业务事实。
- BigQuery / Looker / Looker Studio不得反向成为交易事实源。
- 同一正式指标只能有一个CURRENT定义。

## 12. 11 知识之家最终覆盖
- KnowledgeItem继续是统一知识底座。
- Project使用Platform Project；11_10只负责项目知识、复盘、成果、资料与索引。
- Decision使用Platform DecisionRecord；11_11是知识化、检索、归档、Publication与复盘视图。
- WorkSummary成熟并验证后才进入KnowledgeItem。
- KnowledgeItem通过FileReference/AssetReference使用文件，不把文件等同于知识。

## 13. 12 共享之家最终覆盖
- SharedResource继续是共享资源统一底座。
- File属于Platform底层文件对象；Asset是赋予File可复用业务语义的资源对象。
- 12负责Asset跨公司复用索引与治理视图。
- IntegrationResource是业务可见注册表；运行配置归Platform Integration Service。
- 05可引用IntegrationResource作为AI能力实现，但技术实现只有一份。
- ERP中心不复制订单、库存、客户、财务等主事实。

## 14. Platform横向统一对象
已收口：Project、DecisionRecord、Proposal、CapabilityDefinition、Location、Offer。

这些对象不新增顶层之家，通过现有之家View / Scope / Reference使用。

## 15. Platform Capability统一归属
Authentication、Authorization、User/Identity、Search、File、Asset foundation、Recycle Bin、Interaction、Notification、Task、Workflow、Import、Export、Publication、History/Audit、Version、Integration runtime、Automation、AI Gateway、Analytics infrastructure、Observability统一归Platform Capability。

任何之家不得复制基础实现。

## 16. Source of Truth Contract
凡AIONE与外部系统共享同一事实，必须明确：domain_object_type、source_system、source_record_id、authority_mode、sync_direction、conflict_policy、idempotency_key、version/etag、last_synced_at、freshness_sla、error_policy、reconciliation_policy、owner。

禁止同一事实在AIONE与外部系统双向自由编辑形成双主。

## 17. 最终分层不等式
- File ≠ Asset ≠ KnowledgeItem
- Listing ≠ Offer ≠ Publication
- Proposal ≠ WorkItem ≠ DecisionRecord ≠ Execution Result
- User ≠ Person
- Brand ≠ Counterparty ≠ LegalEntity
- AIAsset lifecycle ≠ runtime health
- Domain business status ≠ Integration health ≠ Knowledge governance status

## 18. Governance
- 12之家目录保持稳定，无需重新调整。
- 12个Open Issues均已在Architecture Truth层收口。
- Google Drive中的01～12 Product Freeze Draft已逐份追加最终横向Review回写。
- GitHub本文件作为最终覆盖矩阵，避免在RC前因旧Draft段落造成事实冲突。
- 下一步：执行01～12文档级一致性校验；通过后统一升级RC候选。
- CURRENT V1.0仍需用户最终确认。
- main未修改。
