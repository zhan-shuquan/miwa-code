# AIONE Business Component清单 V1.0 RC

状态：Release Candidate / 待冻结

## 核心原则
- 平台共性放 Shared Component。
- 业务语义放 Business Component。
- Shared Component + Config 能解决的，不升级成业务组件。
- Business Component 只表达稳定业务语义、规则、关系或重复业务模式。

## 01 美和之家
原则：以 Knowledge Page + Shared Components + Config 为主，不制造大量专属UI。
可保留的稳定业务组件候选：OrganizationStructure, GovernanceBlock, GroupRelationshipMap。

## 02 事业之家
原则：以 Overview / Object / Dashboard + Config 为主。
可保留的稳定业务组件候选：BusinessGoal, BusinessHealth, BusinessProcessMap。

## 03 工作之家
WorkCard, WorkStatus, WorkPriority, WorkDeadline, WorkProgress, WorkResult, WorkBatchAssign, WorkBatchConfirm, WorkOverdueIndicator, WorkAIProposal

## 04 人才之家
PersonCard, TalentProfile, SkillMatrix, AbilityProfile, AbilityGap, TrainingPlan, TrainingRecord, PerformanceSummary, CapacityIndicator, CompensationSummary

## 05 AI之家
AICard, AIProfile, AICapabilityCard, AICapabilityMatrix, AITrainingPlan, AITrainingRecord, AITrainingEvaluation, AIUsageSummary, AIPerformanceSummary, AICostSummary, AIContribution, AIExecutionRecord

## 06 商品之家
ProductCard, ProductSummary, SKUCard, SKUSummary, VariantMatrix, InventorySummary, InventoryStatus, InventoryQuantity, AvailableStock, ReservedStock, InTransitStock, SafetyStock, StockAge, StockMovement, StockAdjustment, Stocktake, CategoryTree, BrandCard, AttributeGroup, ListingStatus, ListingChannel, ListingFieldMapping, ListingValidation, PriceBlock, CostBlock, MarginBlock

## 07 往来之家
CounterpartyCard, CounterpartyProfile, CounterpartyRole, CustomerProfile, SupplierProfile, LogisticsProfile, ServiceProviderProfile, PartnerProfile, ContactList, RelationshipStatus, RelationshipTimeline, CommercialTerms, CreditStatus

架构约束：Customer/Supplier/Partner 等是 Counterparty 的角色/专业视图，不得演化成互不相干的三套主体底座。

## 08 渠道之家
ChannelCard, ChannelProfile, ChannelType, ChannelStatus, ChannelPerformance, StoreProfile, PlatformProfile, WholesaleChannelProfile, OfflineChannelProfile, LiveChannelProfile, FranchiseProfile, AgencyProfile, ChannelAuthorization, ChannelCoverage, ChannelTarget

## 09 财务之家
FinancialRecord, RevenueRecord, ExpenseRecord, ReceivableRecord, PayableRecord, FundMovement, CostRecord, AccountingEntry, Voucher, AccountBalance, ReconciliationBlock, TaxItem, TaxDeadline, BudgetBlock, BudgetVariance, FinancialStatement, CashFlowSummary

## 10 分析之家
原则：不制造 ProductChart / TalentChart / FinanceChart 等重复UI。
使用 Shared Analytics Components + Metric Definition + Dataset + Config。真正业务特化放在指标定义、计算口径、Drilldown规则和业务语义层。
业务定义候选：BusinessKPISet, ProductKPISet, ChannelKPISet, CustomerKPISet, SupplierKPISet, WorkKPISet, TalentKPISet, AIKPISet, FinanceKPISet, CapacityKPISet。

## 11 知识之家
KnowledgeCard, KnowledgeProfile, KnowledgeType, KnowledgeStatus, KnowledgeVersion, KnowledgeReference, KnowledgeRelation, PolicyBlock, StandardBlock, MethodBlock, SOPBlock, TemplateCard, TrainingContent, DecisionRecord, DecisionContext, DecisionOutcome

## 12 共享之家
SystemCard, ToolCard, AssetCard, CodeResourceCard, ImageAssetCard, IconAssetCard, VideoAssetCard, BrandAssetCard, OfficeAssetCard, ERPConnection, IntegrationCard, IntegrationStatus, AssetUsage, AssetLicense, AssetReference

## 第一批优先开发
WorkCard, WorkStatus, WorkPriority, WorkBatchConfirm, PersonCard, SkillMatrix, PerformanceSummary, AICard, AICapabilityCard, AIPerformanceSummary, ProductCard, SKUCard, VariantMatrix, InventoryStatus, InventoryQuantity, ListingStatus, CounterpartyCard, CounterpartyRole, ChannelCard, KnowledgeStatus

## 组件唯一性
同一业务语义只允许一个 CURRENT 基础实现；差异使用 variant/size/density/state/scope/mode，不允许 V2/V4/final/new 等并存为正式组件。

## Domain边界
Business Component 只展示和交互；毛利、库存、绩效、财务、指标等核心业务计算必须位于 Domain / Service 层，并通过稳定 Contract 输入组件。
