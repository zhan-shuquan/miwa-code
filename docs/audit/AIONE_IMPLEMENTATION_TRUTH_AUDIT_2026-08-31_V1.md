# AIONE Implementation Truth Audit｜2026-08-31｜V1

状态：Implementation Truth Audit / main只读审计
审计基线：`main@f66cfae4fd79722f3025907ed75f499dbafbb70d`
对照标准：`docs/product-freeze/AIONE_12_HOME_PRODUCT_FREEZE_V1.0_CURRENT.md`

## 1. 审计结论
当前main已经具备“可运行AIONE原型 + 若干真实业务闭环 + 一部分平台化底座”，但与CURRENT Product/Architecture Truth相比，仍属于**部分平台化、部分旧架构、部分真实业务实现并存**的过渡状态。

不能把“12之家入口已出现”判断为“12之家Domain已经实现”；不能把“统一Business Template”判断为“8种Page Type已经正式实现”；不能把“Google登录可用”判断为“Role + Scope + Object + Field + Action Permission Engine已经实现”。

总判断：**main可继续作为稳定运行基线，但不适合作为新CURRENT架构的直接模板继续复制。下一步应先Technical Design与架构收口，再分支迁移。**

## 2. 状态标记
- ✅ 已有真实实现，方向基本一致
- 🟨 部分实现 / Preview / Scaffold / 仅部分Domain
- 🟥 未发现正式实现
- ⚠️ 已实现但与CURRENT存在明显冲突或技术债

## 3. main基线与治理
### 3.1 Git基线
- main HEAD：`f66cfae4fd79722f3025907ed75f499dbafbb70d`
- HEAD内容为Progressive Disclosure与i18n架构文档锁定。

### 3.2 Branch Protection｜🟥
main当前`protected=false`，required status checks关闭。

结论：与V3.0 Architecture Guardrails中的Branch Protection / CI要求不一致，是当前最高优先级Governance缺口之一。

### 3.3 GitHub Actions / CI｜🟥
`.github/workflows`在main不存在。

当前虽然有大量`verify-*.mjs`验证脚本，但没有发现自动CI把这些检查绑定到PR/main。

结论：当前规则主要依赖人工运行测试，尚未达到“系统自动阻止错误进入main”。

## 4. 12之家信息架构
### 4.1 12之家顶层注册｜✅/🟨
`home-registry.js`已经集中注册12之家，并明确普通之家采用`overview + centers + management`结构，工作之家采用专属Personal Work Home。

优点：已经出现“Registry作为导航事实源”的正确方向。

### 4.2 12之家CURRENT二级目录｜⚠️
当前Home Registry只为共享之家定义了详细centers，其他多数之家仍依赖Route Registry旧路由或通用模板。共享之家当前centers仍包含“文件中心、表格中心、数据中心、应用中心、模板中心”等，与CURRENT的“系统/工具/代码/图片/图标/视频/品牌资源/办公资源/ERP/集成”不一致。

Route Registry中的美和之家、事业之家、工作之家也仍存在大量CURRENT之前的目录语义，例如集团介绍、理念与文化、事业管理，以及工作侧的“我安排的/批量安排工作/等待中/异常处理/待验收”等旧导航结构。

结论：**顶层12之家已存在，但二级IA不是CURRENT V1.0的实现。**

## 5. Page Type与页面母版
### 5.1 共享母版机制｜✅/🟨
main存在`level2-empty-base`、Template Registry、Business Page Template、Content Page Template、Universal Workspace、Page Header等共享能力。

Template Registry强调“空母版只有一份，Recipe描述组件组合，不复制HTML”，方向符合平台化原则。

### 5.2 CURRENT 8种Page Type｜🟥/⚠️
当前Template Registry只有：
- standard-business
- corporate-publication
- content

尚未看到CURRENT定义的PT-01～PT-08作为正式、唯一、可验证的Page Type Registry。

结论：当前“有模板底座”，但**Page Type标准尚未真正代码化**。

## 6. Shared Component与Design Token
### 6.1 Design Token｜🟨
存在`css/foundation/tokens.css`，覆盖品牌色、Surface、Text、Border、Shadow、Radius、Typography、Spacing、Shell尺寸等基础Token。

但仍需后续扫描页面CSS和内联样式，验证是否真正禁止页面hardcode。目前选品详情仍存在大量局部硬编码颜色、圆角、阴影和内联CSS。

### 6.2 Component Registry｜🟨
存在Component Registry，但当前正式注册项规模较小，主要是PageHeader、Rail、Flow、Metrics、UniversalWorkspace、ObjectPresenter、NineElements、ContextualAside等。

与CURRENT Shared Component范围相比，Search、Filter、Sort、ScopeSwitcher、ViewSwitcher、Table、Form、Dialog、Drawer、Toast、BulkActionBar、OwnerSelector、UserPicker、File、History、Permission、Recycle Bin等尚未形成同等级统一Registry证据。

## 7. 页面实现覆盖
main的物理`pages/`目录主要包含：company-home、business-home、business-template、calendar、content-home、notifications、sampling-workbench、selection-workbench、work-home。

结论：
- 01美和之家：✅/🟨 有真实内容页，但目录语义是旧版。
- 02事业之家：✅/🟨 有真实内容页，但目录语义是旧版。
- 03工作之家：✅ 有大量真实实现；同时存在大型单文件技术债。
- 04人才之家：🟨 有入口/通用模板/部分AI人才组件与底层人员关系模型，但没有CURRENT人才之家完整Domain实现证据。
- 05 AI之家：🟨 AI Backend、AI人才、AI办公室、Proposal执行链真实存在，但与CURRENT AIAsset/AICapabilityBinding/AI Gateway完整治理模型还有距离。
- 06商品之家：🟨 入口与选品/测样业务真实存在，但CURRENT Product/SKU/Inventory/Listing Domain没有完整统一实现。
- 07往来之家：🟨 有入口及客户/供应商旧路由，未见CURRENT统一Counterparty Role Domain完整实现。
- 08渠道之家：🟨 有入口/通用模板，未见CURRENT Channel/Platform/Store正式Domain实现。
- 09财务之家：🟨 有收入/支出旧路由与money_events底座，未见CURRENT收入/支出/应收/应付/资金/成本/会计/税务/预算完整财务Domain。
- 10分析之家：🟨 有入口及少量metrics组件，未见MetricDefinition/Semantic Layer/BigQuery/Looker正式分析架构实现。
- 11知识之家：🟨 有content/help/knowledge route相关能力，但未见CURRENT KnowledgeItem统一知识Domain完整实现。
- 12共享之家：🟨 有共享资源概念、Drive Asset真实能力，但当前中心定义与CURRENT明显不一致。

## 8. Object Model / Database / API
### 8.1 当前Core Object Model｜🟨/⚠️
`aione-core-object-model.v1.json`状态仍为`validating`，主要对象是Organization、Business、Position、Assignment、WorkItem、WorkSession、WorkEvidence、MoneyEvent、ResultFact、BusinessEvent、KnowledgeRoute、AITalent、AIOffice、AIAssignment、AIExecution。

优点：明确“一份业务事实，多处调用；页面不是数据库边界”。

缺口：CURRENT横向对象Project、DecisionRecord、Proposal、CapabilityDefinition、Location、Offer，以及Product/SKU/Inventory/Counterparty/Channel/MetricDefinition/KnowledgeItem等尚未进入这套Core Contract。

### 8.2 Backend Core Resources｜🟨/⚠️
`core-model.js`真实支持organizations、businesses、positions、assignments、ai-talents、ai-offices、ai-assignments、object-registry、work-items，以及若干immutable fact resources。

这说明数据库/API底座是真实的，但主要围绕前期“组织/事业/工作/AI办公室”模型，不等于CURRENT 12之家对象模型。

### 8.3 Generic Core Route｜✅/⚠️
`core.js`提供通用CRUD、过滤、分页、版本递增、Business Event记录，工作事项还实现参与人/负责人/验收人等访问判断。

但Generic CRUD本身没有体现CURRENT统一Role + Scope + Object + Field + Action Permission Engine。多数资源写操作只要求authenticated actor。

还发现旧名称残留：批量工作推断逻辑仍出现“运营推广工作台”等已废止命名，说明Deprecated Name Guardrail尚未覆盖全Repo。

## 9. Authentication / Authorization
### 9.1 Google Authentication｜✅/🟨
Backend可以校验Google ID Token，并将允许的Google账号映射成AIONE person identity。

但该实现明确是`GooglePreviewIdentityRegistry`，并且是否强制Google认证由环境变量控制。

### 9.2 Authorization / Permission Engine｜🟥/🟨
存在：
- authenticated actor write guard
- WorkItem特定访问判断
- 部分visibility逻辑

未发现统一的Role + Scope + Object + Field + Action Permission Engine。

结论：**AuthN已有真实基础；AuthZ仍是局部实现。**

## 10. Work / Task
### 10.1 WorkItem事实源｜✅
WorkItem已是真实数据库/API对象，并配有工作证据、Session、Result、Business Event等结构，方向与CURRENT工作之家统一事实源高度一致。

### 10.2 Work子对象分型｜🟨
已有WorkEvidence、WorkSession、participants等，但还需要按CURRENT重新检查Assignment/Collaboration/Result/Summary/Audit边界。

### 10.3 前端技术债｜⚠️
`miwa-work-home.js`约138KB，说明大量页面逻辑仍集中在一个文件中。即使业务能力真实，也不符合长期Domain/Service/Shared Component分层目标。

## 11. AI Layer
### 11.1 Model Provider Layer｜✅/🟨
存在独立Model Provider Registry，业务编排与模型供应商有一定解耦；当前支持OpenAI与deterministic preview，密钥只在Backend。

### 11.2 Proposal + Human Confirmation｜✅/🟨
AI Secretary真实提供`execute`与`confirm`接口，状态接口明确`human_confirmation_required`，已经验证“AI建议 → 人工确认 → 执行”的重要闭环。

### 11.3 CURRENT AI Gateway｜🟨
目前结构仍以AI Secretary / Office为中心，尚未看到完整的统一AI Gateway Contract覆盖权限、上下文、Trace、成本、Proposal、模型路由、所有Domain调用。

结论：AI Layer有真实实现，但还需要“从AI秘书功能升级为平台级AI Gateway”。

## 12. File / Asset / Google Drive
### 12.1 Drive Asset｜✅/🟨
存在Google Drive客户端、管理文件Registry Sync、下载代理、Asset ID、可下载策略，并对下载写Business Event Audit。

### 12.2 CURRENT File ≠ Asset模型｜🟨
当前更接近“Google Drive Asset适配层”，尚未证明存在统一File对象、Asset业务语义对象、版本/checksum/多后端存储等完整Platform File & Asset模型。

## 13. Audit / Event / History
Business Event已经作为真实不可变事实写入数据库，并支持actor、correlation、causation、payload、source_system。

状态：✅/🟨。

这是后续Audit/Observability的重要底座，但当前还不能等同完整的History/Audit/Trace平台能力。

## 14. Notification
main存在notifications页面和notification-store，说明UI/数据层已有能力。

但正式Notification Service架构当前在独立PR中，并未进入main。

状态：🟨，不能声明Platform Notification Service已完成。

## 15. Integration
### 已有真实专项集成｜✅/🟨
- Alibaba 1688
- Google Drive
- Corporate Search / Live Search

但这些仍是专项Integration模块，尚未形成CURRENT IntegrationResource Registry + Platform Integration Runtime通用Contract。

状态：🟨。

## 16. Search
存在Miwa Corporate Search、Drive Search相关集成，但未证明已有统一跨Domain Search Index / Permission-aware Search平台。

状态：🟨。

## 17. Import / Export / Publication
- Publication：有较成熟`miwa-publication-master`及对应测试，状态✅/🟨。
- Import：选品/工作等局部批量导入存在，但未证明统一Platform Import Engine，状态🟨。
- Export：存在页面/内容导出，但未证明统一Export Engine，状态🟨。

## 18. Analytics / Observability / Automation
- Analytics Infrastructure：未见BigQuery/Looker/Semantic Layer正式实现，🟥/🟨。
- Observability：有Business Events与运行日志，但未见统一Trace/Metric/Alert平台，🟨。
- Automation：存在AI/业务自动化概念与个别流程，但未见统一Automation Runtime，🟥/🟨。

## 19. Testing与Architecture Guardrails
### 已有优势｜✅/🟨
`apps/systems/aione/tests`保留大量真实能力验证脚本，覆盖1688、Cloud Data Runtime、Backend、Field Registry、Route、Header/Sidebar、AI、业务之家、Publication、对象模型、工作闭环等。

### 核心缺口｜🟥
- 没有GitHub Actions workflow
- main没有Branch Protection
- package.json没有统一lint/typecheck/unit/integration/test命令
- Backend只有`node --check`语法级check与DB preflight/migrate
- 未见Duplicate Component / Deprecated Name / Design Token / Contract / Migration / Dead Code等CI Guardrail统一执行入口

## 20. 关键冲突与技术债
### P0｜必须先收口
1. CURRENT 12之家二级目录尚未同步到main registry/routes。
2. CURRENT Object Model尚未进入DB/API Contract；现Core Model是旧阶段模型。
3. Permission Engine未形成统一平台能力。
4. main无Branch Protection、无CI workflow。
5. 8种Page Type尚未代码化为正式Registry/Contract。

### P1｜进入新Domain开发前解决
6. Shared Component Registry覆盖不足，许多平台能力仍为页面/局部实现。
7. AI Secretary需要演进成统一AI Gateway，而不是继续页面级增加AI逻辑。
8. Integration需要统一Resource/Runtime/Source of Truth Contract。
9. File/Asset需要从Drive专项适配升级为Platform File & Asset抽象。
10. Notification正式Service尚未进入main。
11. Search仍未形成统一Permission-aware Search。

### P2｜持续技术债治理
12. `miwa-work-home.js`超大型单文件。
13. 选品record detail保留大体量恢复型页面和大量内联/hardcoded CSS。
14. Registry/route中仍存在旧IA与Deprecated命名。
15. tests中保留大量版本号命名，虽然验证仍有效，但长期应转成能力名称。

## 21. 不应该做的事
- 不要现在按CURRENT一次性重写整个main。
- 不要把12之家每家做成一套独立页面与独立后端。
- 不要因为旧Route Registry已有入口，就继续向旧目录补内容。
- 不要直接修改数据库去追CURRENT对象，而跳过Technical Design与Migration Plan。
- 不要先大规模做04～12页面，再补Permission/Object Model/Platform Capability。

## 22. 最小收口路线
### Phase A｜Platform Contract First
1. 定义CURRENT Object Model Technical Design：Platform横向对象 + 12 Domain对象 + Reference规则。
2. 定义Page Type Registry Technical Contract（PT-01～PT-08）。
3. 定义Permission Engine Contract。
4. 定义Source of Truth / Integration Contract。
5. 定义File/Asset、AI Gateway、Search、Notification平台接口。

### Phase B｜Guardrails First
6. 建CI workflow，至少运行现有verify脚本、Backend check、Contract/Migration checks。
7. 开启main Branch Protection并要求CI通过。
8. 增加Deprecated Name / Route / Token / Duplicate Component Guardrails。

### Phase C｜Migration not Rewrite
9. 将现有12之家Registry迁移到CURRENT二级目录；优先配置化，不逐页新建。
10. 将旧Core Object Model通过Migration逐步映射到CURRENT，不破坏已验证真实Work/AI/Drive闭环。
11. 先迁移03工作之家与Platform横向对象，因为它们已经有最多真实事实与验证证据。
12. 然后按实际业务优先级逐Domain推进，而不是按01～12机械开发。

## 23. Governance结论
- Product Truth：CURRENT V1.0已锁定。
- Architecture Truth：CURRENT基础定义已锁定，Technical Design待开始。
- Implementation Truth：main为旧/新混合过渡实现，已有真实价值，但与CURRENT存在明确Gap。
- Governance Truth：main继续保持稳定，不在审计阶段修改；所有架构迁移应通过新Branch执行。

审计结论：**可以基于当前main演进，不建议推倒重做；但必须停止沿旧Registry/Object Model继续横向复制。下一阶段进入Technical Design + Guardrail设计。**
