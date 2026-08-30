# AIONE Business Component清单 V1.0 Draft

状态：待冻结

## 核心原则
- 平台共性放 Shared Component。
- 业务语义放 Business Component。
- Shared Component + Config 能解决的，不升级成业务组件。
- Business Component 只表达稳定业务语义、规则、关系或重复业务模式。

## 主要业务组件
### 工作
WorkCard, WorkStatus, WorkPriority, WorkDeadline, WorkProgress, WorkResult, WorkBatchAssign, WorkBatchConfirm, WorkOverdueIndicator, WorkAIProposal

### 人才
PersonCard, TalentProfile, SkillMatrix, AbilityProfile, AbilityGap, TrainingPlan, TrainingRecord, PerformanceSummary, CapacityIndicator, CompensationSummary

### AI
AICard, AIProfile, AICapabilityCard, AICapabilityMatrix, AITrainingPlan, AITrainingRecord, AITrainingEvaluation, AIUsageSummary, AIPerformanceSummary, AICostSummary, AIContribution, AIExecutionRecord

### 商品
ProductCard, ProductSummary, SKUCard, SKUSummary, VariantMatrix, InventorySummary, InventoryStatus, InventoryQuantity, AvailableStock, ReservedStock, InTransitStock, SafetyStock, StockAge, StockMovement, StockAdjustment, Stocktake, CategoryTree, BrandCard, AttributeGroup, ListingStatus, ListingChannel, ListingFieldMapping, ListingValidation, PriceBlock, CostBlock, MarginBlock

### 往来
CounterpartyCard, CounterpartyProfile, CounterpartyRole, CustomerProfile, SupplierProfile, LogisticsProfile, ServiceProviderProfile, PartnerProfile, ContactList, RelationshipStatus, RelationshipTimeline, CommercialTerms, CreditStatus

### 渠道
ChannelCard, ChannelProfile, ChannelType, ChannelStatus, ChannelPerformance, StoreProfile, PlatformProfile, WholesaleChannelProfile, OfflineChannelProfile, LiveChannelProfile, FranchiseProfile, AgencyProfile, ChannelAuthorization, ChannelCoverage, ChannelTarget

### 财务
FinancialRecord, RevenueRecord, ExpenseRecord, ReceivableRecord, PayableRecord, FundMovement, CostRecord, AccountingEntry, Voucher, AccountBalance, ReconciliationBlock, TaxItem, TaxDeadline, BudgetBlock, BudgetVariance, FinancialStatement, CashFlowSummary

### 知识
KnowledgeCard, KnowledgeProfile, KnowledgeType, KnowledgeStatus, KnowledgeVersion, KnowledgeReference, KnowledgeRelation, PolicyBlock, StandardBlock, MethodBlock, SOPBlock, TemplateCard, TrainingContent, DecisionRecord, DecisionContext, DecisionOutcome

### 共享资源
SystemCard, ToolCard, AssetCard, CodeResourceCard, ImageAssetCard, IconAssetCard, VideoAssetCard, BrandAssetCard, OfficeAssetCard, ERPConnection, IntegrationCard, IntegrationStatus, AssetUsage, AssetLicense, AssetReference

## 第一批优先开发
WorkCard, WorkStatus, WorkPriority, WorkBatchConfirm, PersonCard, SkillMatrix, PerformanceSummary, AICard, AICapabilityCard, AIPerformanceSummary, ProductCard, SKUCard, VariantMatrix, InventoryStatus, InventoryQuantity, ListingStatus, CounterpartyCard, CounterpartyRole, ChannelCard, KnowledgeStatus

## 组件唯一性
同一业务语义只允许一个 CURRENT 基础实现；差异使用 variant/size/density/state/scope/mode，不允许 V2/V4/final/new 等并存为正式组件。

## Domain边界
Business Component 只展示和交互；毛利、库存、绩效、财务等核心业务计算必须位于 Domain / Service 层，并通过稳定 Contract 输入组件。
