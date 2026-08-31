# AIONE 12之家 Product Freeze V1.0 RC

状态：RC / 唯一RC事实源 / 待用户确认CURRENT
日期：2026-08-31
适用：美和AIONE一体化工作平台（AIONE）

## 1. Governance与适用范围
本文件是Repo中AIONE 12之家Product Freeze V1.0的唯一RC事实源，用于统一Product Truth与Architecture Truth。

本文件不代表Implementation Truth，不声明GitHub main已实现本文全部定义。Implementation Truth必须另行审计main。

治理优先级：
1. 本文件：当前唯一RC事实源。
2. `00_AIONE_12_HOME_DOCUMENT_CONSISTENCY_CHECK_V1.0_RC_CANDIDATE.md`：RC形成前的一致性证据。
3. `00_AIONE_12_HOME_FINAL_REVIEW_OVERRIDES_V1.0_RC_CANDIDATE.md`及横向Review：架构Review证据。
4. 01～12 `_DRAFT.md`：历史工作稿，仅用于追溯，不作为直接开发依据。

状态流转：RC → 用户确认 → CURRENT V1.0 → Technical Design → Branch开发 → 自动检查 → Preview验收 → Review → Merge main。

## 2. 12之家总语义
01 美和之家：公司本身。
02 事业之家：公司做什么生意。
03 工作之家：人每天做什么。
04 人才之家：谁在做。
05 AI之家：AI如何参与。
06 商品之家：卖什么。
07 往来之家：和谁发生业务关系。
08 渠道之家：通过哪里经营。
09 财务之家：钱发生了什么。
10 分析之家：经营结果怎么样。
11 知识之家：公司知道什么。
12 共享之家：全公司共同使用什么。

## 3. 01｜美和之家
目录：01_00_概览、01_01_集团理念、01_02_集团架构、01_03_集团组织、01_04_发展规划、01_05_集团治理、01_06_经营战略、01_07_经营方法、01_08_法务合规、01_09_公共关系、01_10_风险管理、01_90_集团资料管理。

事实边界：Organization、LegalEntity、Department、Position结构定义及集团治理、集团战略等公司级事实归01。Person任职事实不在01重复维护，EmploymentRelation / PositionAssignment归04。

## 4. 02｜事业之家
目录：02_00_概览、02_01_美和跨境、02_02_美和批发、02_03_美和留学、02_04_美和不动产、02_05_美和商务咨询、02_06_美和独立站、02_07_美和品牌、02_08_美和物流、02_90_事业资料管理。

事实边界：Business、BusinessGoal、BusinessPlan、BusinessArchitecture、BusinessReview归02。经营项目使用Platform Project；重要决策使用Platform DecisionRecord。工作执行归03，正式知识沉淀归11。

## 5. 03｜工作之家
目录：03_00_概览、03_01_我的工作、03_02_我的安排、03_03_我的协同、03_04_我的总结、03_05_我的互动、03_06_我的创新、03_07_我的建议、03_08_全部工作、03_09_事业工作、03_10_团队工作、03_11_工作总结、03_12_工作记录、03_90_工作资料管理。

WorkItem是唯一主执行对象。WorkAssignment为关系对象；WorkCollaboration优先复用Interaction / Participant；WorkResult为结果对象；WorkEvidence为证据/File/Reference；WorkSummary为派生/知识化投影；WorkHistory / Activity归Platform Audit / Timeline。Project、Proposal、Decision均引用Platform统一对象。

## 6. 04｜人才之家
目录：04_00_概览、04_01_我的人才、04_02_档案中心、04_03_培养中心、04_04_能力中心、04_05_绩效中心、04_06_报酬中心、04_90_人才资料管理。

Person是人才事实主对象。User ≠ Person并建立映射。EmploymentRelation表达雇佣/任职身份与有效期；PositionAssignment表达具体岗位分配；一个EmploymentRelation可有多个PositionAssignment。CareerTimeline为派生视图。CapabilityDefinition归Platform，04通过HumanCapabilityProfile / HumanCapabilityEvidence表达人的能力事实。正式工资支付和会计事实归09。

## 7. 05｜AI之家
目录：05_00_概览、05_01_我的AI、05_02_我的互动、05_03_档案中心、05_04_训练中心、05_05_能力中心、05_06_绩效中心、05_07_费用中心、05_90_AI资料管理。

能力中心三级：Skill、Connector、Agent、Computer Use、自动化、API、规则函数、模型能力。

AIAsset、AI训练、评估/绩效、AICapabilityBinding及AI使用治理归05。AIAsset生命周期：DRAFT / VALIDATING / ACTIVE / PAUSED / RETIRED / ARCHIVED / DELETED；运行健康独立为HEALTHY / DEGRADED / ERROR / UNAVAILABLE。FAILED不作为AIAsset主生命周期状态。AIExecutionTrace归AI Gateway / Observability；Proposal统一使用Platform Proposal；技术实现源码归GitHub，运行连接归Platform Integration Service。

## 8. 06｜商品之家
目录：06_00_概览、06_01_商品中心、06_02_SKU中心、06_03_库存中心、06_04_分类中心、06_05_品牌中心、06_06_属性中心、06_07_上架中心、06_90_商品资料管理。

Product、SKU、Category、Brand、Attribute、Listing归06。Product 1:N SKU。Brand ≠ Counterparty ≠ LegalEntity。库存统一引用Platform Location；AIONE自管库存时InventoryMovement为事实、InventoryBalance为派生投影；外部ERP/WMS为权威时遵守Source of Truth Contract。OUT_OF_STOCK是库存派生条件，不是SKU生命周期。渠道化销售价格不进SKU master，统一使用Platform Commerce Offer。Listing ≠ Offer ≠ Publication。

## 9. 07｜往来之家
目录：07_00_概览、07_01_客户中心、07_02_供应商中心、07_03_物流中心、07_04_服务商中心、07_05_合作单位中心、07_90_往来资料管理。

Counterparty是统一外部往来主体，客户/供应商/物流/服务商/合作单位通过Role表达，不建立多套Company主档。与01 LegalEntity、06 Brand独立，通过Reference关联。稳定经营地点引用Platform Location。关系级商务条件可在07表达；正式应收应付、结算、会计事实归09。

## 10. 08｜渠道之家
目录：08_00_概览、08_01_店铺中心、08_02_平台中心、08_03_批发中心、08_04_线下中心、08_05_直播中心、08_06_加盟中心、08_07_代理中心、08_90_渠道资料管理。

Channel、Platform、Store及渠道配置归08。稳定物理地点引用Platform Location。Product/SKU到Channel/Store的上架映射归06 Listing。销售价格统一使用Platform Commerce Offer。批发/加盟/代理合作主体引用07 Counterparty。IntegrationResource为业务可见注册表，真实运行配置归Platform Integration Service，Secret只进Secret Manager。

## 11. 09｜财务之家
目录：09_00_概览、09_01_基础数据中心、09_02_收入中心、09_03_支出中心、09_04_应收中心、09_05_应付中心、09_06_资金中心、09_07_成本中心、09_08_会计中心、09_09_税务中心、09_10_预算中心、09_11_报表中心、09_90_财务资料管理。

正式财务事实归09。业务系统产生候选事实，财务域负责确认、归类、结算、核算、税务、预算和报表。Offer表达交易发生前销售条件；09拥有交易后确认的收入、折扣、税、成本、结算和会计事实。外部会计/ERP/银行/支付系统共享同一事实时必须使用Source of Truth Contract。

## 12. 10｜分析之家
目录：10_00_概览、10_01_经营分析、10_02_事业分析、10_03_商品分析、10_04_渠道分析、10_05_客户分析、10_06_供应分析、10_07_工作分析、10_08_人才分析、10_09_AI分析、10_10_财务分析、10_11_产能分析、10_90_分析资料管理。

10只拥有MetricDefinition、DimensionDefinition、Semantic Layer、Dashboard、Insight、Forecast等分析语义与结果，不拥有原始业务事实。BigQuery / Looker / Looker Studio仅作为分析副本、语义或展示层，不得反向成为交易事实源。同一正式指标只能有一个CURRENT定义。

## 13. 11｜知识之家
目录：11_00_概览、11_01_制度中心、11_02_标准中心、11_03_业务知识中心、11_04_方法中心、11_05_SOP中心、11_06_模板中心、11_07_帮助中心、11_08_学习中心、11_09_培训中心、11_10_项目中心、11_11_决策中心、11_90_知识资料管理。

KnowledgeItem是统一知识底座。Project统一使用Platform Project，11_10只负责项目知识、复盘、成果、资料与索引。Decision统一使用Platform DecisionRecord，11_11是知识化、检索、归档、Publication与复盘视图。WorkSummary成熟并验证后才进入KnowledgeItem。File ≠ KnowledgeItem。

## 14. 12｜共享之家
目录：12_00_概览、12_01_系统中心、12_02_工具中心、12_03_代码中心、12_04_图片中心、12_05_图标中心、12_06_视频中心、12_07_品牌资源中心、12_08_办公资源中心、12_09_ERP中心、12_10_集成中心、12_90_共享资料管理。

SharedResource是统一共享资源底座。File属于Platform底层文件对象，Asset赋予File可复用业务语义；12负责Asset跨公司复用索引与治理视图。IntegrationResource是业务可见集成注册表；运行配置归Platform Integration Service。代码唯一技术事实源仍为GitHub。ERP中心不复制订单、库存、客户、财务等主事实。

## 15. Platform横向统一对象
V1.0 RC确定以下横向对象：Project、DecisionRecord、Proposal、CapabilityDefinition、Location、Offer。

这些对象不增加新的顶层之家，通过现有之家View / Scope / Reference使用。

## 16. Platform Capability
统一平台能力包括：Authentication、Authorization、User/Identity、Search、File、Asset Foundation、Recycle Bin、Interaction、Notification、Task、Workflow、Import、Export、Publication、History/Audit、Version、Integration Runtime、Automation、AI Gateway、Analytics Infrastructure、Observability。

任何之家不得复制这些基础实现。

## 17. Page Type
统一Page Type：PT-01 Overview、PT-02 Object List、PT-03 Object Workspace、PT-04 Workflow、PT-05 Analytics Dashboard、PT-06 Configuration、PT-07 Knowledge、PT-08 Integration。Publication是横向Layer，不新增专属Page Type。

## 18. Source of Truth Contract
AIONE与外部系统共享同一业务事实时，必须明确唯一权威来源。Contract至少包含：domain_object_type、source_system、source_record_id、authority_mode、sync_direction、conflict_policy、idempotency_key、version/etag、last_synced_at、freshness_sla、error_policy、reconciliation_policy、owner。

authority_mode至少支持AIONE_MASTER、EXTERNAL_MASTER、FEDERATED_READONLY_VIEW。FEDERATED不代表双主。禁止同一事实在AIONE与外部系统双向自由编辑。

## 19. 状态分层
平台生命周期、Domain业务状态、Integration运行健康、Knowledge治理状态必须分层，不用一套状态枚举解决所有对象。

AIAsset lifecycle ≠ runtime health。OUT_OF_STOCK属于库存派生条件。Integration ERROR/FAILED属于运行/执行状态，不应随意成为业务主对象生命周期。

## 20. 核心不等式
- File ≠ Asset ≠ KnowledgeItem
- Listing ≠ Offer ≠ Publication
- Proposal ≠ WorkItem ≠ DecisionRecord ≠ Execution Result
- User ≠ Person
- Brand ≠ Counterparty ≠ LegalEntity
- AIAsset lifecycle ≠ runtime health
- Domain business status ≠ Integration health ≠ Knowledge governance status

## 21. 统一引用、View与Scope
跨之家引用使用稳定object_id + typed reference；必要缓存投影必须可追溯source_version/source_updated_at，不得演化为第二事实源。

我的、团队、事业、全部、关注、收藏、状态筛选等优先作为View / Scope，不新建第二套业务对象。

## 22. 验收标准
- 12之家目录与语义稳定。
- 同一业务概念只有一套主对象和事实源。
- 横向对象不被某一家复制私有模型。
- Platform Capability不在各之家重复实现。
- 外部系统事实源明确，禁止双主。
- Product/SKU、Counterparty、Channel、Finance、Knowledge、Analysis等事实边界清楚。
- File/Asset/Knowledge、Listing/Offer/Publication、Proposal/Work/Decision/Execution等概念不混淆。
- View / Scope不复制数据。
- 当前RC仅定义Product/Architecture Truth，不自动声明main已实现。

## 23. 当前Governance状态
12之家Product Freeze已经完成三轮横向Review、Open Issues收口与文档级一致性校验。

本RC等待用户最终确认后才能升级为CURRENT V1.0。CURRENT确认前，不应直接以本RC推断main Implementation Truth，也不应跳过Technical Design直接大规模修改数据库/API。
