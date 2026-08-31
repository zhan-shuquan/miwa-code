# 00｜AIONE 12之家文档级一致性校验 V1.0 RC Candidate

状态：校验完成 / Drive内容一致性通过 / Repo同步待完成
日期：2026-08-31
适用：美和AIONE一体化工作平台（AIONE）

## 1. 校验范围
逐份读取并检查01～12 Product Freeze Google Docs，重点检查：跨之家对象归属、第二事实源、旧状态模型、Platform Capability私有化、Project / Decision / Proposal / Capability / Location / Offer等横向对象边界，以及File / Asset / KnowledgeItem、Listing / Offer / Publication等概念分层。

## 2. 校验与修正结果
- 01 美和之家：通过。Organization / LegalEntity归01，Person任职事实归04。
- 02 事业之家：已修正BusinessProject / BusinessDecision主对象旧语义，统一引用Platform Project / DecisionRecord。
- 03 工作之家：已修正WorkCollaboration / WorkSummary / WorkHistory同级主对象旧语义，改为关系、投影与Platform Audit/Timeline分型。
- 04 人才之家：已修正Skill/AbilityProfile、CareerTimeline及Person直接持有组织岗位事实的旧语义；CapabilityDefinition统一归Platform，任职事实由EmploymentRelation / PositionAssignment表达。
- 05 AI之家：已修正AICapability、AIExecutionTrace、AIProposal与AIAsset FAILED生命周期旧语义；Trace归Gateway/Observability，Proposal归Platform，生命周期与运行健康分离。
- 06 商品之家：已修正InventoryRecord / InventoryLocation与SKU OUT_OF_STOCK生命周期旧语义；采用InventoryMovement/Balance、Platform Location与Source of Truth Contract。
- 07 往来之家：已修正07专属Organization主档与稳定地点重复建模风险；统一Counterparty + entity_type并引用Platform Location。
- 08 渠道之家：通过。Channel/Platform/Store、Listing、Offer、Location、Integration边界一致。
- 09 财务之家：通过。正式财务事实、Offer交易前条件与Source of Truth Contract边界一致。
- 10 分析之家：通过。仅拥有分析语义、指标、洞察、预测，不拥有原始业务事实。
- 11 知识之家：已修正ProjectRecord/DecisionRecord主对象归属旧语义；Project/Decision统一引用Platform横向对象，KnowledgeItem继续是知识底座。
- 12 共享之家：已修正ERPConnection与IntegrationResource混入运行配置的旧语义；业务注册表与Platform Integration Service运行层分离。

## 3. Architecture Truth统一结论
Platform横向对象：Project、DecisionRecord、Proposal、CapabilityDefinition、Location、Offer。

Platform Capability：Authentication、Authorization、User/Identity、Search、File、Asset foundation、Recycle Bin、Interaction、Notification、Task、Workflow、Import、Export、Publication、History/Audit、Version、Integration runtime、Automation、AI Gateway、Analytics infrastructure、Observability。

外部系统统一采用Source of Truth Contract；同一事实禁止AIONE与外部系统双主。

关键不等式：
- File ≠ Asset ≠ KnowledgeItem
- Listing ≠ Offer ≠ Publication
- Proposal ≠ WorkItem ≠ DecisionRecord ≠ Execution Result
- User ≠ Person
- Brand ≠ Counterparty ≠ LegalEntity
- AIAsset lifecycle ≠ runtime health

## 4. Governance判断
Google Drive中的01～12 Product Freeze已完成第三轮横向结论回写与本次冲突清理，达到RC Candidate内容条件。

当前状态：
- Drive内容一致性：PASS
- Architecture Truth：PASS
- 12之家目录稳定性：PASS
- Repo逐份文档一致性：PENDING
- 整体CURRENT：NOT YET

GitHub中的01～12独立Draft文件仍是较早工作快照；Horizontal Review与Final Overrides已经提供上位覆盖，但Repo尚未形成逐份一致的唯一RC事实源。

## 5. 下一步
1. 将最终修订同步到Repo正式RC层；
2. 明确旧Draft为历史工作稿/Deprecated输入，不再承担当前正式定义；
3. Repo完成唯一RC事实源后，由用户最终确认CURRENT V1.0；
4. CURRENT后进入Technical Design，不根据旧Draft直接开发数据库/API。

结论：文档级架构一致性校验通过；Repo RC事实源同步是进入CURRENT前最后一个治理动作。