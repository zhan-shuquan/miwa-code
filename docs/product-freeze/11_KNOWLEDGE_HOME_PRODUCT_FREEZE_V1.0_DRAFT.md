# 11｜知识之家 Product Freeze V1.0 Draft

状态：Draft / 待冻结
适用：美和AIONE一体化工作平台（AIONE）

## 1. 定位
知识之家是AIONE统一的企业知识与企业记忆事实源，负责承载制度、标准、业务知识、方法、SOP、模板、帮助、学习、培训、项目、决策等可复用知识资产。

知识之家不是所有原始文件的堆放区，也不是把各业务之家的资料再复制一份。它的核心原则是：一份知识，多处调用；成熟知识进入正式体系，业务现场继续保留真实上下文与证据。

## 2. 目录与层级
- 11_00_概览
- 11_01_制度中心
- 11_02_标准中心
- 11_03_业务知识中心
- 11_04_方法中心
- 11_05_SOP中心
- 11_06_模板中心
- 11_07_帮助中心
- 11_08_学习中心
- 11_09_培训中心
- 11_10_项目中心
- 11_11_决策中心
- 11_90_知识资料管理

原则：目录按稳定知识类型组织，不因每份文档新建新的Page Type或业务模型。

## 3. 核心业务对象
- KnowledgeItem：统一知识条目基础对象
- Policy：制度
- Standard：标准
- BusinessKnowledge：业务知识
- Methodology：方法
- SOP：标准操作流程
- Template：模板
- HelpArticle：帮助条目
- LearningResource：学习资源
- TrainingProgram / TrainingMaterial：培训项目与材料
- ProjectRecord / ProjectKnowledge：项目知识或项目索引
- DecisionRecord：决策记录
- KnowledgeVersion：知识版本
- KnowledgeRelation：知识与业务对象/其他知识的关系

原则：优先采用KnowledgeItem统一底座 + type-specific schema，不建立十二套完全割裂的知识对象。

## 4. 唯一事实源边界
知识之家拥有：正式制度、正式标准、正式方法、正式SOP、模板、帮助内容、结构化学习/培训知识、正式决策记录、成熟项目知识、知识版本与关联。

不重复维护：
- 公司/组织事实 → 美和之家
- 事业目标/计划/业务事实 → 事业之家
- 工作执行/工作证据 → 工作之家
- 人员事实 → 人才之家
- AI资产/AI调用事实 → AI之家
- 商品/往来/渠道/财务事实 → 对应业务之家
- 分析指标与结果 → 分析之家

知识之家通过Reference引用来源对象和证据。

## 5. 知识成熟度
知识至少区分：讨论中、验证中、正式锁定、废止。

建议机器状态：DRAFT、VALIDATING、CURRENT、ARCHIVED、DEPRECATED、DELETED。

只有经过验证并明确责任人的内容，才进入CURRENT。历史版本保留，不允许无痕覆盖。

## 6. 制度、标准、方法、SOP边界
制度：规定组织必须遵守什么，强调责任、边界、权利义务和治理要求。
标准：规定统一口径、命名、结构、质量门槛和技术/业务规范。
方法：解释为什么这样做、核心原则与可迁移的方法论。
SOP：把稳定方法转化为可执行步骤、角色、输入、输出和异常处理。

原则：同一内容不要因为形式不同复制四份；应通过引用、派生或Publication生成不同表达。

## 7. 模板中心
模板是可复用结构，不是正式业务事实。

模板可包括：文档模板、表格模板、业务表单模板、报告模板、提案模板、检查清单、提示词模板、AI生成模板等。

模板必须具备版本、适用范围、负责人、状态和来源标准/制度/SOP引用。

## 8. 帮助中心
帮助内容面向“如何使用AIONE或完成某项操作”。

优先从正式制度、标准、SOP和系统真实行为生成/维护帮助内容，避免帮助页与正式规则漂移。

## 9. 学习与培训边界
学习中心：面向自主学习、知识获取和长期能力成长。
培训中心：面向组织安排的培训计划、课程、考核和完成记录。

培训记录中的人员事实/完成状态可引用人才之家；知识之家负责课程、材料和知识内容，不重复人员主档。

## 10. 项目中心边界
项目中心不应复制事业之家BusinessProject或工作之家WorkItem。

建议定位：沉淀项目定义、重要里程碑、复盘、成果、决策、可复用经验和正式资料索引。

项目执行事实仍由事业之家/工作之家持有，知识之家保留成熟后的ProjectKnowledge或正式索引。

## 11. 决策中心边界
决策中心负责正式DecisionRecord的沉淀、版本、依据、影响范围、责任人和后续复盘。

事业之家中的业务决策应引用同一个DecisionRecord，以business_scope呈现，而不是复制第二套决策对象。

最终对象归属在12之家横向Review时冻结，但原则是系统只能有一个CURRENT Decision模型。

## 12. Page Type映射
- 11_00_概览 → PT-01 Overview Page
- 各知识中心列表 → PT-02 Object List Page
- 单个知识条目 → PT-07 Knowledge Page或PT-03 Object Workspace
- SOP审批/发布流程 → PT-04 Workflow Page（需要阶段推进时）
- 知识使用分析 → PT-05 Analytics Dashboard或分析之家
- 知识分类/状态/模板参数 → PT-06 Configuration Page
- 外部知识源/Drive/Docs连接 → PT-08 Integration Page
- 知识资料管理 → PT-02 Object List + File & Asset

## 13. View / Scope
Scope建议：全部、我的、事业、部门、知识类型、状态、负责人、适用对象、权限级别、最近更新、待复审。

单个KnowledgeItem建议View：正文｜适用范围｜版本｜来源｜关联对象｜附件｜使用情况｜评论｜历史。

## 14. 默认字段
KnowledgeItem至少包含：id/code、title、type、status、summary、body_ref/content_ref、owner、business_scope、applicable_scope、source_refs、related_object_refs、version、effective_from、review_due_at、language、tags、created_at、updated_at。

正式知识应支持多语言内容，但machine identity与知识ID保持稳定。

## 15. 版本与CURRENT原则
同一知识主题原则上只能有一个CURRENT正式版本。

新版本流程：Draft → Validate → Approve/Confirm → Publish CURRENT → 旧版Archive/Deprecated。

不得让旧版与新版同时以“正式”状态存在。

## 16. 权限
至少支持Role、Scope、Object、Field、Action Permission。

重点保护：战略、财务、法务、人事、合同、内部方法、机密决策、未公开项目资料。

知识搜索和AI检索必须继承原始知识权限，不能因进入知识索引而扩大可见范围。

## 17. 搜索与检索
知识之家必须接入统一Search能力，并支持关键词、语义、标签、对象关系、版本、时间、负责人、知识类型等检索。

AI知识检索只返回当前用户有权限访问的内容，并尽量显示来源与版本。

## 18. Google Drive / Docs边界
Google Drive可作为协作文件与原始资料存储层；Google Docs可作为知识编辑载体。

AIONE负责KnowledgeItem身份、知识类型、状态、权限、版本语义、关联和索引。

原则：Drive文件是文件，KnowledgeItem是知识对象；两者可以1:1或1:N关联，但不能混为同一个概念。

## 19. AI与自动化
AI适合：知识摘要、分类、标签、重复检测、SOP草稿、模板生成、知识问答、跨文档检索、版本差异总结、失效知识提示。

确定性能力优先：版本状态、有效期、复审日期、权限过滤、命名规则、知识唯一性、Publication、Deprecated检查。

所有AI调用统一经过AIONE AI Gateway。

## 20. 知识闭环
真实业务 → 工作记录/证据 → 复盘/总结 → 验证 → 方法/标准/SOP/知识形成 → CURRENT发布 → 人与AI复用 → 新业务结果 → 再验证与更新。

这条闭环体现AIONE“先形成真实证据，再形成正式标准”的长期原则。

## 21. Publication
正式制度、标准、SOP、模板、帮助和决策可通过统一Publication Layer支持分享、下载、打印、发布和多语言输出。

Publication只生成表现层，不复制KnowledgeItem主事实。

## 22. 资料管理
知识资料管理负责原始资料、附件、证据、参考文件、草稿材料的索引与生命周期管理。

它不是第二套知识中心；成熟内容应进入对应正式KnowledgeItem。

## 23. 异常治理
必须处理：同一知识多份CURRENT、正式与草稿混淆、旧版未废止、Drive文件和知识对象混为一体、项目/决策与其他之家重复建模、SOP与方法重复全文、AI引用无来源、权限穿透、知识失效但仍被AI调用、帮助内容与系统实际行为不一致。

## 24. 验收标准
1. KnowledgeItem形成统一知识底座，不按中心复制公共能力。
2. 同一知识主题只能有一个CURRENT正式版本。
3. 制度、标准、方法、SOP边界清晰并通过引用复用。
4. 项目执行事实不在知识之家复制。
5. DecisionRecord只允许一套CURRENT模型。
6. Drive文件与KnowledgeItem概念分离但可关联。
7. 搜索和AI检索继承原始权限。
8. AI只辅助整理、生成和检索，正式发布仍需治理流程。
9. 成熟知识基于真实证据，未验证内容标记VALIDATING/DRAFT。
10. 当前文档定义Product/Architecture Truth，不自动声明main已实现。

## 25. 当前冻结判断
当前建议状态：Draft / 待横向Review。待12之家完成后统一Review，再决定是否升为CURRENT V1.0。

## 26. 横向Review回写｜2026-08-31
本节优先于前文中与跨之家归属冲突的Draft描述。
- ProjectRecord / ProjectKnowledge不再发展为第二套Project主模型；Project执行与事业归属由02/03负责，11只沉淀项目复盘、成果、经验、正式资料和知识索引。
- BusinessDecision不与11决策中心并存双模型；全系统只保留一套DecisionRecord。11负责正式归档、知识化、检索、版本和复盘视图，业务之家通过scope/source_object引用。
- KnowledgeItem ≠ File；文件字节与生命周期由统一File & Asset管理，KnowledgeItem负责知识身份、类型、状态、版本、权限语义和关联。
- 同一知识主题只能有一个CURRENT正式版本。
- 搜索与AI检索继承原始知识权限，不扩大可见范围。
- 公共权限、版本、历史、Audit、Search、Publication统一复用平台能力。
- 本文仍为Draft，待第二轮一致性检查通过后再升级RC。
