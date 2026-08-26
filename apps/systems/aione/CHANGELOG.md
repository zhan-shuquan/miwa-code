# V1.9.29｜双总架构命名收口 + 美和AI分析转Proposal执行 Candidate

- 正式工作名称锁定：`美和集团AI经营总架构` / `美和集团AI执行总架构`。
- Google Drive中原 `00_美和集团现代企业军团总架构_V0.1.pptx` 更名为 `00_美和集团AI执行总架构_V0.1.pptx`，File ID不变；旧名称继续作为搜索别名。
- AI经营总架构当前页面继续承载433与经营闭环；新版原件明确标记为“待绑定”，不拿基石版冒充当前新版。
- AI执行总架构继续承载最高统帅、四大军种、情报、粮草、AI人才、数字后勤与作战闭环，军团表达保留为执行文化与组织方法。
- 美和AI快照加入近期会话上下文；编号优化清单支持后续 `把第1、3、5项安排下去`。
- 被选中的编号项目分别转换为独立 `create_work_item` Proposal，最多5项，仍需人类逐项确认。
- Proposal自动继承当前AIONE页面/对象上下文，确认后工作事项写入来源Route/相关对象信息，便于工作之家追溯。

# V1.9.28｜美和AI上下文分析、快捷能力与精准检索 Candidate

- 精确企业资料请求升级为唯一最佳结果；“有哪些/全部”返回列表，“相关资料”返回Top相关结果，正常业务讨论不被资料检索劫持。
- 美和之家内容页正式进入美和AI业务上下文；经营架构页首批注入433、经营主线、三层闭环、四大军种、执行原则、十步经营闭环及人与AI责任边界。
- OpenAI真实模型说明强化：经营架构/理念/战略/组织等优化问题必须先读取AIONE正式页面内容，再检查闭环、复杂度、规则函数化、Skill/Connector/Agent机会、人类责任与真实验证指标。
- 新增结构化“AI快捷意图/常用能力”层；快捷标签按当前上下文动态展示，并在当前浏览器按实际使用频率排序，不把固定FAQ伪装成能力。
- 新增美和AI当前浏览器会话连续性：刷新/重开AI层可恢复近期消息与资料卡；历史恢复禁止自动重复下载。聊天历史不等于企业知识。
- 新增Cloud生产真实模型启用脚本`RUN_E_ENABLE_LIVE_MIWAAI.sh`；OpenAI Key只进入Google Secret Manager，不写入仓库或配置文件。
- 继续继承V1.9.26 Shared Drive私有安全下载、V1.9.27企业资料Registry检索和AIONE用户身份边界。

# V1.9.27｜美和AI企业资料检索闭环 V1 Candidate

- Added deterministic AIONE corporate Registry retrieval before model execution for enterprise file/content requests.
- Added 美和AI asset result cards with AIONE content route, Google Drive original view and secure AIONE download.
- Added `search_corporate_content` tool for Live model retrieval with authoritative version/status/source metadata.
- Added first six real acceptance prompts for group architecture, AI talent, command map, operating loop, core asset list and 美和灵魂.
- Included V1.9.26.1 Cloud Run deployment hotfix: custom env-var delimiter and bash child-script invocation.
- Kept internal assets behind authenticated AIONE person context.

# V1.9.26｜MIWA Shared Drive安全下载 Runtime Candidate

- Replaces direct browser Google Drive download URLs with authenticated AIONE backend downloads.
- Adds allow-listed backend Drive asset registry and ADC-based Google Drive streaming.
- Keeps internal assets non-public and returns a clear runtime-access error when the Cloud Run service account lacks Shared Drive membership.
- Adds best-effort business-event audit logging for corporate asset downloads.
- Streams binary responses through the Vercel WIF bridge and forwards content-disposition/content-length.
- Adds one-time Shared Drive runtime identity check helper.


# V1.9.25｜美和之家 Google Drive 原件绑定 Candidate

- 建立 `miwa-google-drive-registry.js`，集中登记美和之家Google Drive镜像目录Folder ID与集团核心资料File ID。
- 00-09现代企业军团核心资料已经迁移到 `美和之家｜AIONE内容源 / 08_企业资料 / 集团核心资料` 并完成真实Drive绑定。
- 企业资料页将“原件待绑定”升级为“查看原件 ↗ / 下载原件”，AIONE不复制第二份正式文件。
- `getMiwaCompanySearchRecords()` 增加sourceId/sourceType/sourceUrl/downloadUrl/sourceFolderId/sourceName，为美和AI下一步企业资料检索与来源返回做准备。
- 集团核心资料原有V0.1“构想/验证中”状态保持不变；绑定文件不等于内容正式锁定。
- 目录、Main、Aside、PDF出版母版保持V1.9.24结构，不把视觉微调升级为当前主线。

# V1.9.24｜美和之家真实内容与集团核心资料索引 Candidate

- 在V1.9.23已锁定的两级Sidebar与数字出版型Main基础上，开始把既有美和集团真实内容接入页面，不再以占位说明为主。
- 理念与文化首批接入“美和灵魂 / 美和准则 / 美和传承”的现有核心表达，并继续保持正式内容可迭代、来源可追溯。
- 经营架构页接入美和原创433母架构、现代企业军团执行体系、四大军种、四条底层作战原则、十步经营闭环及人与AI责任边界。
- 集团定位、集团简介、集团组织、发展战略、全球布局、治理架构、合规原则、集团动态等页面补入已有真实项目结论；事实型公司字段仍坚持“待确认/待补充”，不编造法定资料。
- 集团核心资料页建立00-09现代企业军团资料索引，记录正式文件名、类型、版本、状态、日期、摘要与内部内容Route；源文件尚未复制到AIONE时明确显示“原件待绑定”，不伪造下载链接。
- 新增内容来源面板，让页面能够展示支撑当前内容的集团资料名称、版本、日期与状态。
- 新增美和之家搜索记录种子，统一输出页面与资料的title/subtitle/status/visibility/version/text，为下一阶段美和AI“找得到、知道最新版、返回来源”做准备。
- 新增集团核心资料资产绑定目录与Manifest；PPT自动生成继续后置，当前仍以真实内容、PDF和美和AI检索准备为主线。

# V1.9.23｜美和之家数字出版型空间 V1 Candidate

- 美和之家从通用内容管理页升级为集团级“数字出版型 Main”，保留现有 Global Shell，不重建 Header / Footer。
- Sidebar 对美和之家启用两级树形目录：美和概览 + 集团介绍 / 理念与文化 / 经营与战略 / 事业与全球 / 组织与治理 / 品牌与价值 / 发展与动态 / 企业资料 / 外部连接。
- 新增美和概览七段式集团叙事：集团身份、真实经营与未来、理念与文化、原创AI经营架构、事业版图、发展路线、发展历程。
- 新增集团内容阅读、事实资料、事业版图、品牌体系、企业形象、企业资料等统一页面Recipe；空内容先保留稳定目录与定位，不虚构正式事实。
- 美和公司Logo默认采用白底正式版；当前工程内预览图来自用户提供的正式Logo截图，后续应以原始高分辨率文件替换。
- 新增企业资料索引与筛选/选择入口，正式文件未接入时不伪造下载地址；多资料PDF组合入口预留，PPT自动生成后置。
- 新增A4打印/出版模式：打印时隐藏 Header / Sidebar / Aside / 系统操作，内容按公司宣传册思路输出。
- 美和之家内容定义结构化，预留美和AI按状态、版本、权限检索“正式最新版”的长期接口。

# V1.9.21｜Subdomain Secure API Bridge Candidate

- Fixes production subdomain `/api/*` 404 by adding a Vercel Function bridge.
- Keeps Cloud Run private and authenticates Vercel through OIDC + Google Workload Identity Federation.
- Uses `X-Serverless-Authorization` for Cloud Run service identity while preserving the employee Google ID Token in `Authorization`.
- Adds server-side Google ID Token verification and server-side preview identity ownership mapping; production no longer trusts browser person-id headers.
- Old browser preview sessions without the Google credential are invalidated and require one fresh Google login.
- Denies direct public routing to backend/docs/tests/tools/recovery source paths on the Vercel production site.
- Adds idempotent Cloud Shell setup script `07_SETUP_VERCEL_OIDC_BRIDGE.sh`.

## 2026-08-24 | V1.9.17 美和AI Context Router Candidate
- Added one AIONE AI Context Builder covering business, workbench, page, current business object, state, user and current object data.
- Added a capability registry and Context Router so employees use one “美和AI”; AI talent, AI job, Skill, Agent, model and Provider remain internal classification/orchestration concepts.
- Product-opportunity detail pages now auto-route four Selection capabilities: analyze opportunity, check profit/risk, judge sampling need and generate selection summary.
- Current opportunity context reuses AIONE source, workflow, cost/pricing, shipping, sampling and decision evidence; deterministic system calculations are preferred over model re-estimation.
- Replaced the employee-facing “技能/工具” choice with passive “能力自动匹配”.
- Hid provider/model names from normal ready-state UI while retaining diagnostics for development.
- Preserved the existing Proposal Bridge and human-confirmation boundary; sampling advice does not silently change business state.

## 2026-08-24 | V1.9.16 MIWA AI Proposal Bridge Candidate
- Added a Backend Proposal Bridge so explicit work-item creation intent becomes a structured `create_work_item` proposal even when the first live-model turn only returns prose.
- Added Backend pending-proposal state with generated proposal ids, `waiting_confirmation` status, actor/office ownership checks and a one-hour TTL.
- Added natural-language human-confirmation fallback for phrases such as confirmation/create or confirmation/execute when a matching pending proposal exists.
- Confirm requests now prefer `proposalId` and reject expired/mismatched staged proposals instead of trusting a client-edited payload.
- Kept V1.9.15 database-first/local-AIONE fallback semantics after human confirmation.
- Added safe Markdown-lite rendering for AI headings, bold text, ordered lists and bullet lists without interpreting raw HTML.
- Preserved the independent AI Layer, current page business context, OpenAI Provider Layer and `/status -> /execute -> /confirm` safety boundary.

## 2026-08-24 | V1.9.13 美和AI Model Provider Layer Candidate
- Added a provider-neutral Backend `Model Provider Layer`; AI orchestration no longer imports OpenAI directly.
- Preserved deterministic Preview mode and added `AIONE_AI_MODE=live` + `AIONE_AI_PROVIDER` selection with backward compatibility for the earlier `openai` mode.
- Kept OpenAI as the first live provider through the Responses API while leaving the business orchestration vendor-neutral.
- Added `START_MIWA_AI_REAL_MODEL.cmd/.ps1`; local API key entry is hidden and kept in Backend process memory only.
- Added `VERIFY_MIWA_AI_REAL_MODEL.cmd/.ps1` for non-generative provider/runtime status verification.
- Added `get_current_page_business_context`; the current Selection Workbench exposes UI-source metrics, stages, types and product-opportunity summaries to the AI Tool Layer.
- Strengthened model instructions: page-specific business answers must read current-page evidence instead of guessing from page titles.
- Preserved `/status -> /execute -> /confirm` and human confirmation for writes.

## 2026-08-24 | V1.9.12 MIWA AI Windows Launcher Hotfix Candidate
- Fixed the Windows CMD parsing failure seen as `EnableExtensions is not recognized` before Backend verification could start.
- Replaced complex CMD logic with minimal ASCII + CRLF wrappers that delegate to PowerShell.
- Added `START_MIWA_AI_RUNTIME_AND_VERIFY.ps1`, `START_AI_SECRETARY_PREVIEW.ps1`, and `SETUP_NODE_LTS.ps1`.
- All PowerShell launcher files are UTF-8 BOM + CRLF for Windows PowerShell 5.1 compatibility.
- Updated `.gitattributes` and `.editorconfig` so Windows launcher line endings are preserved.
- The existing AI runtime endpoints and confirmation boundary remain unchanged: `/status -> /execute -> /confirm`.

## 2026-08-24 | V1.9.11 美和AI Runtime Chain Verification Candidate
- 在V1.9.10已经验证“美和AI可稳定打开并完整渲染”的基础上，正式进入周六既有AI执行链的端到端验证。
- 新增根目录 `START_MIWA_AI_RUNTIME_AND_VERIFY.cmd`：Windows一键启动本地Preview Backend并调用验证脚本。
- 新增 `VERIFY_MIWA_AI_RUNTIME.ps1`：依次验证 `/status → /execute → /confirm`，其中`/execute`必须生成待确认工作建议，`/confirm`必须由本地人类负责人上下文确认。
- Preview模式且数据库未连接时允许返回`previewLocalAction`；数据库可用时允许真实写入测试工作事项。两者均验证“AI不能绕过人类确认”的执行边界。
- 美和AI前端每次重新打开时重新检测Backend状态；Backend未连接提示直接指向一键验证脚本。
- Sidebar / Aside / Main / Header结构、本轮已通过的AI Layer、AI Backend / Tool Layer / Provider架构均不重建。

## 2026-08-24 | V1.9.10 美和AI Hard Entry Hotfix Candidate
- 修复Windows/Live Server下“美和AI”按钮可见但点击无响应的残留问题。
- 新增不依赖ES Module初始化成功与否的Hard Entry Bridge：点击Header后先强制打开独立AI Layer，再做增强初始化。
- 美和AI打开动作不再被Route Context、推荐能力、AI Client或Backend初始化异常阻断。
- 对AI Layer JS、AI Client JS和AI CSS增加独立版本URL，解决嵌套ES Module/@import未随index版本参数刷新导致的旧缓存继续生效问题。
- 周六已接入的AI Backend / Tool Layer / execute / confirm链路保持不变。

## 2026-08-24 | V1.9.7 美和AI Render Hotfix Candidate
- Fixed the Windows preview defect where the independent 美和AI panel could show only its header while Context, Body and Composer appeared blank.
- Replaced the AI panel outer four-row CSS Grid with a vertical Flex shell: Header → Context → Body → Composer.
- Kept Workspace layout changes inside Body only, so expansion no longer risks collapsing outer AI sections.
- Added safe route-context fallback, required-DOM validation, and non-fatal AI Client initialization handling.
- Preserved the V1.9.6 independent AI-layer architecture and the existing AI Secretary Backend / Tool Layer / human-confirmation endpoints.

## 2026-08-24 | V1.9.6 美和AI Independent Layer Candidate
- Added a dedicated global 美和AI entry between Global Search and Notification; Help and Settings remain after it.
- Added the same ordered AI entry to the mobile top bar.
- Added an independent `#miwa-ai-layer-host`; AI is not nested in Sidebar, Main or Aside.
- Implemented Drawer → AI Workspace → AI Office progressive interaction.
- Added AIONE-specific M + red intelligent-core mark for the first 美和AI visual identity candidate.
- Added route-aware AI capability suggestions and current-page context display.
- Reused the validated AI Secretary Backend / Tool Layer / human-confirmation execution path instead of building a second AI backend.
- Renamed user-facing AI chat identity to “美和AI” while keeping internal API compatibility.
- Preserved V1.9.5 Universal Sidebar and Contextual Aside lock rules without reintroducing AI into Aside.

## 2026-08-24 | V1.9.5 Sidebar + Aside Lock Candidate
- Formally superseded all conflicting historical Sidebar / Aside rules; added one current lock standard and a deprecation index.
- Rebuilt desktop Sidebar as a Universal Sidebar: current-space identity + tree/accordion Navigation + optional small Quick Actions dock.
- Removed desktop business switching from Sidebar; Header remains the business-context switch owner.
- Business Sidebar keeps all workbenches visible and auto-expands only the current workbench; content/tool/system routes reuse the same visual language.
- Replaced the old lower secondary-navigation block with 0-3 high-frequency start actions (hard cap 4); Selection validates New Opportunity and Batch Import.
- Rebuilt Aside as a pure Contextual Aside with hidden/light/standard states.
- Removed AI Secretary chat/runtime/command/AI Office controls from Aside and stopped Global Shell from initializing the AI Secretary client through Aside.
- Replaced active `aione:page-ai-context` runtime events with `aione:page-aside-context`.
- Preserved AI Backend / Tool Layer / historical AI Office assets for the later independent 美和AI Layer phase.

## 2026-08-24 | V1.9.4 Smart Header Lock Candidate
- Promoted the Header from a menu bar to AIONE's global context/dispatch brain.
- Locked the H1 context core as Company -> Business -> User -> Work -> Time.
- Restored Store Home as a first-class H1 home and kept stable adjacency for Talent/AI, Customer/Supplier, and Category/Product/Store.
- Added an overflow-aware horizontal rail for H1 core homes; controls stay hidden when no overflow exists.
- Reframed H2 as Quick Access only: no Store Home/Application Home/shared-resource group labels are shown.
- H2 shortcut groups are generated from metadata and separated only by thin dividers; overflow uses horizontal browse controls.
- Replaced the user-facing All Resources entry with a simple apps icon + More entry that opens the Quick Access level-2 page.
- Kept Shared Resources as an internal registry/management concept only; internal/external remains backend metadata and is not forced into the shortcut UI.
- Updated active-route priority so a direct H2 shortcut such as ERP is highlighted before any parent directory route.
- Locked H4 to Today Impression | Important Schedule | Important Notice.
- Updated Header knowledge baseline to V1.2 and added V1.9.4 release-gate tests.

## 2026-08-24｜V1.9.3 Header核心之家 + 共享资源快捷层 Candidate
- H1新增人才之家、客户之家、供应商之家并按对象关系重排；人才之家与AI之家相邻，客户之家与供应商之家相邻。
- H1移除共享之家；店铺之家、应用之家不再作为Header分类入口。
- H2改为统一共享资源快捷层：资源元数据自动分组，仅用分隔符区分。
- 新增ERP内部应用高频快捷入口；HR作为内部应用登记并支持headerHidden隐藏。
- 共享资源产品形态统一为应用/工具/知识/代码/数据/模板/连接/服务/其他，内部/外部作为属性。
- 新增“全部资源”入口与供应商之家页面/字段基础。
## V1.9.2 CANDIDATE - 2026-08-24

- 保持Header核心上下文链“公司 -> 事业 -> 人 -> 工作 -> 时间 -> Sidebar业务执行”不变。
- Header共享之家组调整为：分类之家 -> 商品之家 -> AI之家 -> 分析之家 -> 知识之家 -> 共享之家。
- 正式取消“帮助之家”；Desktop、Mobile与Footer帮助入口统一进入“知识之家 -> 帮助中心”。
- 新增正式帮助文档《AIONE全局导航与页面上下文逻辑说明 V1.0》，稳定知识ID为`KNOW-AIONE-NAV-CONTEXT-V1`。
- 知识之家新增“帮助中心”知识类型，并支持`?type=帮助中心`直接筛选。
- 内容母版新增正文阅读器，正式知识可在AIONE内直接阅读。
- 内容对象Store补充缺失seed合并机制，避免已有LocalStorage阻止新正式知识进入。
- Sidebar第2阶段规则已写入正式知识，但本轮不改Sidebar代码，避免跨阶段混改。

## V1.9.1 CANDIDATE - 2026-08-24

- 执行AIONE全局架构优化第1阶段：先稳定Global Shell与Header，不扩具体工作台业务。
- Header第一行上下文顺序正式收口为“公司 -> 事业 -> 人 -> 工作 -> 时间”，具体业务执行继续归属Sidebar。
- 新增当前事业Header入口，并新增`platform-context.js`作为事业状态、路由识别和后续动态Sidebar/Aside的统一上下文契约。
- 事业切换不再由Sidebar独立维护第二套LocalStorage；Header与Sidebar共享同一状态源。
- Header核心共享入口收口为：分类之家 -> 商品之家 -> AI之家 -> 分析之家 -> 共享之家。
- 客户之家、人才之家、收入之家、支出之家、知识之家保留Route与业务能力，但退出Header第一行堆叠。
- 通知移动到全局工具区，不再打断“人 -> 工作之家 -> 美和日历”的工作上下文链。
- 活动Header继续统一“工作之家”“分析之家”；今日印象移除节气/星座展示。
- 移动端同步加入当前事业上下文，并保持工作之家 -> 美和日历顺序。
- 新增V1.9.1专项验证；当前全部活动自动回归测试通过。
- 当前容器Chromium受组织策略限制，无法访问127.0.0.1本地预览，因此浏览器视觉验收明确留给Windows + Live Server，不冒充已完成。

## V1.9.0 CANDIDATE - 2026-08-23

- 新增Google Cloud真实数据运行工程：Cloud SQL备份、Preflight Job、Migration Job、私有Cloud Run Backend和认证Smoke Test。
- 新建`aione-backend-v190`作为验证目标，不覆盖现有`aione-backend`。
- 云端默认关闭Preview Actor/System Writes，DB密码仅通过Secret Manager注入。
- 数据库Preflight增强为同时检查既有4张主表、行数、目标Schema和已应用Migration。
- 本轮不扩页面、不接真实OpenAI模型，先验证正式数据与Backend运行。

# V1.7.0 CANDIDATE｜第6阶段：核心数据与后端基础｜2026-08-22

- V1.6 Field Registry正式进入对象关系模型与PostgreSQL Schema阶段。
- public.people继续作为唯一Person主数据；不复制人才表。
- 新增Organization / Business / Position / Assignment，岗位与编制分离，任职历史可追溯。
- 新增Object Registry / Object Relation，支持跨业务对象关系但不替代专业表。
- 新增Work Item / Work Session / Work Evidence，为工作之家、人才之家和自动报告共享真实工作证据。
- 新增Money Event / Result Fact，时间、钱、事、结果开始形成统一经营事实。
- 新增Business Event、Knowledge Route、AI Execution最小底座。
- 新增增量PostgreSQL迁移、Preflight与migration runner；不对现有people/product_opportunities等表做破坏性迁移。
- 后端升级为模块化 `/api/v1`，保留选品Legacy API。
- 新增个人时间汇总与工作证据汇总API、OpenAPI、事件契约、字段到DB映射。
- 当前未对线上Cloud SQL执行迁移；必须先Preflight并人工确认。

# V1.6.0 CANDIDATE｜第5阶段：字段标准化基础｜2026-08-22

## 本轮定位

- 从V1.5.0选品成熟业务迁移候选继续推进，不扩页面视觉和业务细节。
- 建立独立Field Registry，把字段从页面定义中抽离。
- 为下一阶段对象关系模型、PostgreSQL Schema、后端API与AIONE Tool Layer准备稳定业务语义。

## 已完成

1. 新增统一字段类型、字段标准核心与字段注册中心。
2. 美和9要素定义独立为唯一配置，字段与组件共用。
3. 13个标准业务页面改为 `fieldSchemaId → Field Registry`，页面定义不再保存字段数组。
4. 美和之家/知识之家共用同一Content字段语义。
5. 字段统一补齐 fieldCode、definition、dataType、nineElement、source、ownerRole、captureTiming、automation、validation、知识/规则/帮助路由、permission、history、event、ui、db建议。
6. 新增统一系统审计字段：创建/更新人、时间、版本、来源系统、归档时间等。
7. 标准业务母版与内容母版开始使用统一字段值转换、表单输入类型与校验。
8. CSV/XLSX导入支持 label / key / fieldCode / importAliases。
9. 选品批量导入通过Field Registry连接原详情存储键，保护V1.5成熟业务。
10. 生成 `FIELD_CATALOG_V1.0.json` 机器可读快照。

## 不做

- 不建设正式数据库DDL。
- 不一次补完ERP、HR、工资福利、调岗轮岗等具体字段。
- 不修改测样旧页面。
- 不重做选品业务流程。

---

# V1.5.0 CANDIDATE｜第4阶段：选品成熟业务迁移｜2026-08-22

- 01选品工作台进入Legacy Migration：保留成熟选品业务与数据，只迁移页面基础设施。
- 选品根页改为薄入口，正式调用唯一Level-2 Empty Base与`standard-business` Recipe。
- 新增Selection Adapter，继续读取原`preview-opportunities`，不复制商品机会事实。
- 新增共享TypeRail；FlowComponent支持节点Key、数量、当前态与点击筛选。
- Universal Workspace升级为多条件筛选、排序、导入/导出、卡片/列表、3/4/6列、可选分页与标准状态。
- Object Presenter新增共享`rich-media`卡片表达，选品不再维护独立卡片/列表HTML。
- 保留直发选品/常规选品/产品开发、五段选品主流程、12条/页、新建/编辑详情与批量导入链路。
- 活动`selection-workbench.css`只保留批量导入特有样式；旧选品页面JS/HTML/CSS移入`recovery/legacy-pages-v1.5`。
- 标准业务母版同步改为调用共享TypeRail，避免选品形成新的特殊组件体系。
- 新增V1.5选品迁移专项测试；全部活动JS语法、V1.4基础架构回归、路由/Global Shell、测样回归均通过。
- 当前容器Chromium Headless因环境超时，浏览器运行/视觉验收仍需Windows + Live Server人工确认后才能正式锁定。

# V1.4.0 CANDIDATE｜二级页面前三阶段收口

- 唯一Level-2 Empty Base继续作为二级页面唯一底座。
- 美和之家验证Content Recipe；工作之家迁入Standard Business Template。
- 分析中心更名分析之家，并进入标准业务母版路由。
- AI私人秘书更名AI秘书；Aside升级三态常驻交互窗口。
- 新增Business Data Adapter和Component Registry。
- 清理活动运行时中的旧今日工作/分析中心独立页面实现，移入recovery。

## V1.3.0 CANDIDATE｜唯一二级空母版与组件基础架构｜2026-08-22
- 新增唯一 `Level-2 Empty Base`；空母版只提供挂载位和平台上下文，不包含具体业务。
- 建立Template Registry；当前核心Recipe收敛为 `standard-business` 与 `content`。
- business/content静态页面变为薄入口，组件结构由运行时共享组件挂载，不再复制组件HTML。
- Universal Workspace补齐搜索、筛选、**排序**、导入、导出、视图、重置以及3/4/6列卡片密度。
- 新增loading / empty / no-results / error / forbidden标准状态，减少各页面重复设计IT基础状态。
- 新增View Registry：card/list/table/kanban/calendar/gantt/gallery/form/chart；本轮完整通用渲染仍以card/list(table)为主。
- 新增共享PageHeader、Level2 Block、CoreMetrics、FlowComponent、ObjectPresenter等基础组件。
- 美和9要素固定顺序不变，并为“美和方法论”和9个要素加入知识之家内部精准路由。
- 美和之家改为首个Content Recipe + Empty Base真实验证实例。
- Header通知中心统一为单一图标入口并置于今日工作左侧；顶部信息带收敛为“今日印象｜日程｜通知”，删除“节气/星座”文字标签。
- 重要日程由用户明确选择的展示属性控制；当前Header已提供运行时接口，完整字段/日历/提醒数据库逻辑后续验证。
- 空母版增加 `aione:level2-mounted` 与 `workEvidenceScope`，为后续统一Work Evidence与时间统计预留稳定接口。
- V1.1/V1.2静态模板测试移入 `tests/legacy/`，新增V1.3空母版、路由、Global Shell单源专项测试。
- 当前仍为候选基线；正式锁定需先完成美和之家浏览器人工验收。


## V1.2.2｜对象卡片/列表统一组件热修复｜2026-08-22
- 新增唯一 `Object View Controller`，页面工程不再各自实现卡片/列表互斥逻辑。
- 业务母版与选品工作台同时调用该组件。
- 修复通用业务页面卡片与列表可能同时显示的问题。
- 为选品商品机会对象区增加组件级显示防御，避免旧CSS/缓存导致卡片/列表不显示。
- 页面仍保留各自业务数据与渲染器；组件只负责视图行为，严格区分“组件工程”和“页面工程”。
# V1.2.0｜统一二级页面与内容体系基础架构｜2026-08-22

- 以V1.1.0为唯一升级母体，继续保持Global Shell单一来源。
- Header增加人才之家、知识之家；公司识别区进入美和之家；收入/支出保持经营资金事实组；店铺之家/应用之家继续承担管理入口。
- Google Drive纳入应用之家和Header高频应用入口。
- 建立美和统一二级页面语言与共享组件：Level-2 Header、Horizontal Rail、Core Metrics、Object Toolbar、Object Card/List、Disclosure、AI Aside。
- 业务/内容类型统一采用“重点3项 + 横向滑动”；不再用数量变化拉高页面。
- 核心指标只展示常用重点指标，一屏最多6项，更多横向滑动。
- 辅助机动区改为单行自适应横滑，不锁死三列布局。
- 卡片/列表标准字段常显；“字段隐藏”纠正为次级信息区块的Disclosure/Accordion。
- 业务页面前台语义改为对象语言：客户类型、商品类型、应用类型等；流程语义区分客户管理流程/商品管理流程/选品业务流程等。
- “业务关键要素”正式统一为“美和9要素”：目标、人、物、事、平台、时间、钱、信息、结果。
- 新增美和内容母版与统一内容对象数据层；美和之家、知识之家共用同一内容母版。
- 知识之家统一管理方法论、标准、制度、SOP、业务知识、培训、案例研究及系统/AI知识；不新增标准之家/制度之家/SOP之家。
- 共享之家边界明确为能力与客观共享资源，并加入美和图标/Logo、图片、视频、文件、账号、模板、GitHub/代码资产入口。
- 新增人才之家，明确内部人才管理；客户之家/人才之家与PPC“人”的上层关系进入知识之家说明，外部People关系系统继续独立。
- 通知中心升级为共享内测P0页面：统一二级结构、通知类型横滑、通知管理流程、核心指标、卡片/列表、导入导出、AI秘书辅助、美和9要素。
- 新增通知详情路由，支持正文、发布对象/主体、时间、自动已读及“我已知悉”确认。
- 今日工作与分析中心核心指标开始复用统一Core Metrics；今日工作/日历/分析保持特殊主视图，不机械套业务母版。
- 系统参数继续集中分类、权限、导入导出、通知、AI、收入支出与审计；重点类型“3项可见”为UI标准，不再开放为普通业务参数。
- 新增V1.2.0专项结构/语法/通知/内容母版验证与基线文档。

# V1.1.0｜2026-08-22

- Global Header增加客户之家、收入之家、支出之家，并将收入/支出作为独立经营组。
- Header第二层将“跨境店铺 + 更多店铺”合并为“店铺之家”，将工具总入口统一为“应用之家”。
- 新增唯一二级业务页面母版：业务头部 → 业务类型 → 业务流程 → 业务指标 → 对象管理 → 辅助机动区 → 美和9要素。
- 对象管理工具栏固定：搜索 / 筛选 / 导入 / 导出 / 卡片 / 列表。
- 业务类型采用“前三重点 + 横向滑动”。
- 新增客户之家、店铺之家、应用之家、收入之家、支出之家、现金支出页面，全部共用同一母版。
- “业务关键9要素”统一为“美和9要素”，并抽为共享组件。
- Aside升级为页面级AI秘书上下文辅助。
- 新增“新建业务对象 → 标准事件 → 通知”预演机制与重要通知中心。
- 系统参数从价格参数升级为全局参数中心，新增权限、字典、业务规则、收入支出、导入导出、通知、AI、审计等分类；保留原成本与定价参数兼容。
- 组织权限增加“允许新建 / 允许导入 / 允许导出”动作控制，并已接入统一业务母版、选品与测样的当前内测前台动作。
- 选品/测样对象区补齐导入、导出、列表、卡片统一入口；测样导入保留固定入口但禁用，避免绕开“选品 → 测样”真实承接流程。
- 旧独立Store Home实现退出当前工程，店铺之家改为直接引用统一Business Page Template。
- 新增V1.1.0专项自动验证与基线/验证文档，明确真实已实现能力与后续数据源/API接入边界。

# V1.0.28｜Global Shell Single Source｜2026-08-22

- 以当前AIONE最新全局架构为唯一Shell：Header / Sidebar / Aside / Footer只保留公共组件源码。
- 删除商品机会详情/测样执行旧页面内嵌的整套Header、Sidebar、Aside、Footer及重复全局CSS快照。
- 商品机会详情改为纯业务内容页；旧直链自动回到AIONE根路由，不再允许第二套Shell独立运行。
- 选品工作台进入商品机会详情统一走 `#/selection/opportunity/:id`；测样执行统一走 `#/sampling/opportunity/:id`。
- Header锁定“美和精神”信息带，并将轻量企业信息名称统一为“今日印象”。
- 清理旧称：商品中心、AI中心、视觉设计工作台、上架发布工作台、运营推广工作台、订单与库存工作台、客服与售后工作台等不再出现在当前运行代码。
- 新增Global Shell唯一源码与废止术语自动校验；业务页面再次内嵌独立Shell时测试直接失败。

## V1.0.27｜2026-08-21｜测样工作台执行驾驶舱统一

- `#/sampling` 从“测样概览”改为与选品工作台同构的执行型工作台首页。
- 新增测样状态、测样流程、业务指标与当前测样商品执行队列。
- 页头右上统一为“测样概览 / 测样任务”；“待测样商品”保留为独立业务对象子页。
- 测样概览的上下游关系修正为“选品 -> 测样 -> 回写选品上架判断”。
- 继续使用现有 localStorage 预演数据、统一任务数据与原测样执行页，不重写核心业务逻辑。
- 详细说明：`docs/BASELINE_V1.0.27_SAMPLING_DASHBOARD_UNIFIED.md`。

## V1.0.24｜2026-08-21｜测样工作台共享内测骨架

- 不做深度UI优化，优先为多人共享内测整理 02 测样工作台。
- 新增并接通“测样概览 / 测样任务 / 待测样商品”三层入口。
- 测样概览固定说明定位、原理、上下游、流程、关键对象和责任，并提供快速关联链接。
- 测样任务与“今日工作”共用现有统一任务数据，不建立第二套任务。
- 任务增加 `workbench / businessObjectId / route / dedupeKey` 等关联字段，建立任务时自动防重复。
- 继续复用原商品机会详情中的完整测样执行能力；完成测样后自动同步对应任务为完成。
- 当前仍是浏览器预演数据层；跨账号共享将在 Tasks API / Cloud SQL 接入后开启。
- 详细说明：`docs/BASELINE_V1.0.24_SAMPLING_SHARED_TEST.md`。

## V1.0.14｜2026-08-21

- 恢复并锁定跨境 9 个独立一级工作台；选品工作台与测样工作台保持独立。
- 以 V1.0.11 为资产保全基线，未修改既有选品/测样核心页面内容。
- “更多店铺”升级为“全部店铺”正式总览页，保留平台预设与真实店铺外链。
- 形成团队简单内测候选基线。

# V1.0.11 - 2026-08-21

- 保持 V1.0.10 Header 主结构与 Sidebar 不变。
- 补回美和精神、今日信息、重要通知。
- 恢复账号资产总表中已确认的常用店铺/工具外部链接。
- “更多店铺 / 更多工具”改为 Header 内轻量分类面板，不再依赖独立下级页面。
- 预设更多店铺平台：楽天市場、Amazon、TEMU、Qoo10、TikTok Shop；空平台按业务发展增加实际店铺与外链。
- 未确认链接不猜测补齐。

## V1.0.9 HEADER_SIDEBAR_MERGED CANDIDATE｜2026-08-21

- 以V1.0.8事业化Sidebar为基础，合并最新Header工作型结构。
- Header第1行收敛为：平台身份、当前用户、今日工作、美和日历、全局搜索、通知、帮助、设置。
- Header第2行独立承载平台级高频能力：分类之家、商品之家、AI之家、分析中心、共享之家。
- Header第3行保留常用外部入口：店铺与工具分组，各自保留“更多”。
- “美和精神／核心准则／三大基石／三大属性”不再常驻占用Header；平台品牌入口继续进入集团经营与方法相关页面。
- 日期、农历、节气、星座、天气等“今日信息”不再常驻Header；未来仅在明确有价值的场景作为辅助机动内容按需出现。
- Sidebar事业切换保持V1.0.8结构不变；新增事业继续采用简洁事业名＋对应业务闭环配置。
- 选品、测样及其余业务页面本轮不改动。


## 2026-08-21｜Sidebar Business Navigation V0.1

- 新增美和跨境 / 美和批发事业切换。
- 跨境业务调整为9个工作台，订单与库存拆分，客服与售后收敛。
- 批发业务加入6个锁定业务闭环及二级导航入口。
- 二级导航改为配置驱动，状态/步骤下沉到页面内部。
- 保留现有选品、测样页面实现，等待后续与最新业务基线模块合并。
# V1.0.7 HOMES CANDIDATE｜2026-08-20｜五个一级页面与导航骨架

- 分类之家、商品之家、AI之家、分析中心、共享之家由占位入口升级为可预演的一级页面。
- 五页共预留39个二级内部入口；未开发入口保持可进入、可返回，不使用虚假业务数据。
- 每页提供个人关注能力，按登录成员独立保存在浏览器，为后续个性化关注数据预留位置。
- 左侧和手机抽屉的8个跨境日本业务工作台由同一路由清单生成，避免页面切换后缺项。
- 一级页面进入二级入口后，顶部仍保持所属之家高亮，左侧显示当前之家的二级入口。
- 共享之家明确共享能力、共享资源、资产目录，以及知识之家、帮助之家、美和方法论的关系。
- 全部图标继续由语义图标清单统一调用，正式美和图标确定后可集中替换。
- 外部店铺和工具链接继续保留空值，待准确资料齐备后一次接入。

# V1.0.6 CORE CANDIDATE｜2026-08-20｜全局头部可内测收口

- Google 登录继续作为唯一内测入口；登录后将 Google 头像、全名与职级送入统一 Header。
- 用户外层只显示头像、全名、职级；点击后展开主要岗位、职责、项目、所属主体与登录账号。
- 退出登录统一放在用户卡片内，移除右下角重复的内测身份浮条。
- 左侧导航固定命名为“跨境日本业务”，无权限筛选地展示全部 8 个工作台；手机端通过“跨境业务”抽屉展示同一清单。
- 今日工作从占位页升级为可用内测页：支持全员多向布置任务、任务筛选、完成状态及建议与创新提交。
- 美和日历从占位页升级为可用内测页：支持月历、日程新增、任务到期日自动呈现；Google Calendar 同步接口保留。
- 店铺与工具外部 URL 继续保持为空，待收到准确资料后统一接入。
- 当前协同数据使用浏览器本地存储验证交互与字段；正式多人实时共享需在数据库/API 接入后启用。

状态：CANDIDATE / 核心内测功能已完成静态、语法与资源验证，待本地 Google 登录实测。

# V1.18.5 BASELINE｜2026-08-19｜完整工程收口

- 将已验证的 Google 登录、成员邮箱修正、Header 身份显示、会话保持、退出登录与再次登录能力统一收口到完整工程。
- 当前工程正式取代 V1.18.3 / V1.18.4 / V1.18.5 零散补丁，成为后续开发唯一基线。
- 旧邮箱 `mcpu2024@gmail.com` 已从当前工程清除；86000 占树全统一使用 `mcpu2014@gmail.com`。
- 新增 `docs/BASELINE_V1.18.5.md`，记录基线状态、验证范围与后续开发规则。

# V1.18.5｜2026-08-19｜Google退出登录闭环

- Header当前用户区域新增明确的“退出登录”菜单入口。
- 退出时统一清除AIONE Preview会话、身份上下文、活动上下文。
- Google Identity Services执行 `disableAutoSelect()`，避免退出后自动恢复旧身份。
- 退出后返回AIONE内测登录入口，可重新选择其他Google账号。
- 保留原浮动内测身份条的退出入口，并统一调用同一退出函数。
- 修正86000占树全正确登录邮箱为 `mcpu2014@gmail.com`。

# V1.18.0 CANDIDATE｜上架判断主流程与按需测样重构

- 01选品工作台正式主流程从6步收敛为5步：商品机会 → 数据录入 → 成本试算 → 智能定价 → 上架判断。
- 原“推进判断”正式改为“上架判断”，最终业务结果继续只保留“上架 / 不上架”。
- 测样退出固定主流程，重新定位为按需验证能力：可在上架判断前后触发，用于辅助判断、补充实物证据或后续复测。
- 成本与定价形成有效结果后即可进入上架判断；未启动测样不再默认阻断判断。
- 已有测样结果继续作为上架判断的重要辅助证据；负面实物证据会影响系统建议并形成风险提示，但不制造第三种最终业务结果。
- 测样工作台保留完整实测、图片、异常、报告与回写能力；实测重量变化仍可触发成本与定价重算。
- 选品工作台业务流程筛选、商品机会列表阶段名称、选品概览与记录详情统一使用新的5步主流程。
- 业务类型标题按已确认方向提高可识别性：16px、美和绿、粗体。
- 全局入口“管理驾驶舱”更新为“分析中心”，当前原型同步使用 analysis 路由与权限标识。

状态：CANDIDATE / 待本地真实操作验证。

# V1.17.0.1 CANDIDATE｜业务类型三列布局修复

- 修复业务类型容器缺少 `display:grid` 导致直发选品、常规选品、产品开发纵向堆叠的问题。
- 桌面/平板宽度大于720px时固定为3列；移动端720px及以下保持1列。
- 本次仅修复布局，不改变业务类型、创建、批量导入及其他业务逻辑。

# V1.17.0 CANDIDATE｜选品概览与选品任务入口 / 业务类型直接工作入口

- 选品工作台头部移除「新建商品机会」「批量导入」「选品AI人才」，改为「选品概览」「选品任务」两个业务入口。
- 新增独立「选品概览」页面，用于统一选品方向、深耕分类责任、标准选品方法、来源／工具／执行者／依据及商品机会形成边界。
- 新增独立「选品任务」页面，先锁定任务形成逻辑、最小字段、执行闭环与真实数据空状态。
- 业务类型从4列收敛为3列：直发选品、常规选品、产品开发；AI选品退出业务类型。
- 每个业务类型卡片内直接提供「新建商品机会｜批量导入」，业务类型由上下文自动带入，不再二次选择。
- 批量导入弹窗取消类型选择步骤，按入口直接匹配模板。
- 业务类型与业务指标标题补回轻量图标；视觉细节后续统一优化，不扩大本次修改范围。
- 商品机会之后的正式主流程保持不变：商品机会 → 数据录入 → 成本试算 → 智能定价 → 测样 → 推进判断。

状态：CANDIDATE / 待本地预览与真实操作验证。

# V1.16.6.1 CANDIDATE｜样式资源加载修复｜2026-08-17

- 仅修复商品机会记录详情页的全局样式与品牌资源加载，不改动 V1.16.6 已确认的业务逻辑。
- 为嵌套 record-detail 页面显式补充当前共享 CSS 引用。
- 同时内嵌当前共享 CSS 作为本地预演兜底，避免样式资源未加载时页面退回浏览器默认样式。
- 修正嵌套页面中的 MIWA Logo 相对路径。
- 保持：500 JPY + 30% 双重利润标准、精简智能定价、成本试算、分页、持久化、测样与推进判断逻辑不变。

# V1.16.6 CANDIDATE｜智能定价双重利润标准与选品阶段精简｜2026-08-17

- 全局利润参数更新为：最低单件贡献利润 500 JPY、最低运营前贡献利润率 30%。
- 智能定价采用双重门槛：利润额与利润率必须同时达标，系统自动采用更严格的一项反推最低售价。
- 高单价商品不再因仅达到500 JPY利润就被误判为达标。
- 选品工作台智能定价主界面精简为“经营目标 → 最终上架价”两部分。
- 市场参考、运营模拟、价格判断保留为兼容/辅助能力，不再占用选品主界面；完整能力后续由运营推广工作台承载。
- 最终上架价人工调整后，系统实时判断贡献利润额与运营前贡献利润率是否双重达标。
- 直发选品与常规选品统一使用相同双重经营利润标准，减少选品类型差异造成的定价复杂度。
- 成本试算继续保持：单件销售成本 = 商品销售成本 + 基础交易成本，不包含运营投入。

# V1.16.5 CANDIDATE｜成本试算与智能定价完整更新｜2026-08-17

- 成本试算改为左右结构：左侧说明/定义/口径，右侧结果/明细。
- 成本前台统一为：单件销售成本 = 商品销售成本 + 基础交易成本。
- 原“单件固定成本”前台改称“商品销售成本”。
- 运营投入成本从成本试算中移除，仅在智能定价“运营模拟”中评估。
- 成本试算默认折叠明细，保留到日本仓成本、日本配送成本、基础交易成本的完整计算表。
- 智能定价标题保留价格标签图标，并增加五步流程：经营目标→市场参考→运营模拟→价格判断→最终上架价。
- 智能定价经营目标价不再预先计入广告、优惠券、积分等主动运营投入；运营投入通过独立模拟做利润压力测试。
- 观察期模拟默认：广告0%、优惠券0%、积分1%、其他运营成本0 JPY。
- 不修改全局Shell、分页、持久化、测样与推进判断逻辑。

# V1.16.4_CANDIDATE｜运营模拟阶段默认参数修正（2026-08-17）

- 观察期默认运营模拟参数统一为：广告0%、优惠券0%、积分1%、其他运营成本0 JPY。
- 观察期正式成本不再将运营投入全部视为0：楽天基础1倍积分按1%作为运营投入成本计入；广告、优惠券和其他主动运营投入仍为0。
- 运营中默认读取全局系统参数；当前默认广告15%、优惠券0%、积分1%、其他运营成本0 JPY，并允许按实际运营策略调整。
- 切换“观察期／运营中”时，运营模拟输入自动加载对应阶段默认值；临时模拟不会修改全局参数。
- 全局系统参数“积分率”统一优化为“积分成本率”，并明确楽天基础1倍=1%，运营可调整为2%、5%等。
- 升级预演工作流状态版本至1.1，避免旧版本已保存的15%广告模拟值错误继承到观察期。
- 未改动成本公式框架、经营目标定价、市场证据层、最终上架价确认、测样与推进判断逻辑。

# V1.16.3_CANDIDATE｜成本试算与智能定价结构升级｜2026-08-17

- 成本试算与智能定价从左右并列改为上下独立排列：成本事实在上，经营定价决策在下。
- 智能定价升级为五段经营逻辑：经营目标 → 市场参考 → 运营模拟 → 价格判断 → 最终上架价。
- 市场参考区预留市场价格区间、AI参考价、可比样本、来源、更新时间、置信度；真实数据源未接入时明确显示“待市场分析”，禁止生成示例市场价。
- 运营模拟独立成可调模块，默认读取全局运营参数，临时调整不修改全局参数、不写入真实成本。
- 最终上架价增加人工确认与即时利润重算；默认采用推荐经营目标价，允许负责人调整。
- 成本试算继续作为唯一成本事实来源，智能定价只读取成本，不反向修改成本。
- 保留现有全局系统参数、成本公式、业务流程、Header / Sidebar / Aside / Footer。

# V1.16.2 CANDIDATE｜全局系统参数迁移

- 将系统参数编辑从选品工作台业务模块迁移到 Header 右上角“设置”全局入口。
- 新增全局“设置 → 系统参数”界面，统一维护成本基础、基础交易、运营投入、利润目标、物流配送、价格治理六类参数。
- 全局系统参数继续使用统一参数版本与本地持久化数据源，业务工作台只读取当前生效版本。
- 选品记录详情页删除局部“系统参数设置”按钮与内嵌编辑面板，避免工作台私有参数口径。
- 详情页 Header 齿轮统一返回平台全局设置入口。
- 本次不修改成本试算、智能定价公式与既有参数数值。

# V1.16.1 CANDIDATE｜系统参数分类与经营目标定价

- 新增可直接操作的“系统参数设置”面板，按成本基础、基础交易、运营投入、利润目标、物流配送、价格治理六类集中维护。
- 新增“目标单件贡献利润”参数，当前验证值 500 JPY；利润目标成为智能定价核心参数。
- 智能定价主逻辑调整为“成本 → 目标单件贡献利润 → 经营目标价 → 利润率参考价/价格边界 → 最终上架价由业务确认”。
- 原目标单件贡献利润率继续保留，用于利润结构参考与异常校验，不再作为普通选品最终售价的唯一决定因素。
- 参数支持保存新版本、保存并设为当前生效、版本历史追溯；业务页面继续只读当前生效参数。
- 观察期/运营中逻辑保持不变；运营投入参数继续同时服务真实运营成本与情景模拟。

## 2026-08-17｜V1.16.0 CANDIDATE｜观察期定价与运营情景模拟

- 新增商品机会级“当前运营阶段”：观察期 / 运营中。
- 观察期正式定价只计当前真实、必然发生的成本，运营投入成本按 0 JPY，不提前把广告、优惠券、积分、其他运营投入写入真实成本。
- 运营中按当前生效运营参数计入运营投入成本。
- 新增运营情景模拟：使用系统预设的广告、优惠券、积分、其他运营成本参数，提前显示模拟运营投入、模拟运营后利润与利润率，但不改变当前真实成本和建议售价。
- 运营阶段随商品机会预演状态持久化；系统参数继续负责费率，业务对象状态负责“是否已经进入运营”。

## V1.15.6_CANDIDATE｜2026-08-17｜单点微调更新
- 成本试算顶部摘要改为“总成本 + 三行成本构成”，移除视觉加号；保留内部精确值统一取整说明。
- 成本明细前台删除“系统精确小计”行；内部精确值与计算逻辑不变。
- 运营投入成本增加“其他运营成本”，当前默认 0 JPY；直发选品首轮继续按 0 计入。
- 商品机会卡片与列表统一读取商品机会草稿中的“选品代表图”；无图或加载失败时显示占位图。
- 未修改既有成本计算公式、直发最低单件利润 500 JPY 判断及其他已确认业务逻辑。

## V1.15.5_CANDIDATE｜成本分类与直发选品逻辑统一（2026-08-17）

- 成本分类统一拆分为“基础交易成本”和“运营投入成本”。
- 基础交易成本 = 平台成本 + 结算成本 + 预计退货损失。
- 运营投入成本 = 广告成本 + 优惠券成本 + 积分成本。
- 单件预计总成本 = 单件固定成本 + 基础交易成本 + 运营投入成本。
- 直发选品首轮预演中，运营投入成本暂按 0 处理；平台、结算和预计退货损失继续按基础交易成本计算。
- 直发选品默认跳过测样，保留例外测样入口；推进判断继续采用预计单件利润 >= 500 JPY 的首轮硬门槛，利润率仅记录观察。
- 未改变其他选品类型的原有费用参数；常规/AI/产品开发继续按已配置的运营投入参数参与计算。


## V1.15.4 CANDIDATE｜复盘修正：恢复成本试算原结构

- 修正 V1.15.3 对“成本试算”区块的非预期改动。
- 直发选品不再隐藏成本试算中的既有成本组成、参数与公式展示。
- 移除成本试算区新增的“平台成本／最终销售运营成本”直发专用摘要。
- 保留本轮已确认的智能定价三段式、直发利润门槛、直发默认跳过测样、测样/推进判断折叠等其他修改。
- 原则：未明确要求修改的已确认模块保持原样。
# V1.15.3 CANDIDATE｜2026-08-17｜选品类型与直发流程复盘统一更新

- 统一4种选品类型副标题，并同步新建商品机会与批量导入口径。
- 商品机会详情页“测样 / 推进判断”改为状态驱动的自动收起/展开，并允许人工控制。
- 测样与推进判断标题补齐标准业务图标。
- 直发选品成本区前台精简，仅突出平台成本与最终销售运营成本；底层成本计算继续保留。
- 直发选品默认跳过测样；如存在质量、规格或合规风险，可人工启动例外测样。
- 直发选品首轮推进判断采用预计单件利润 ≥ 500 JPY 的单一硬门槛；利润率继续计算与记录但不作为首轮阻断条件。
- 智能定价统一为“建议售价 → 盈利判断 → 价格选择”三段式；计算依据按需展开，四种选品类型共用同一结构。

# V1.14.1｜2026-08-15｜来源链接与代表图交互补丁

- 采购来源链接保持人工录入与自动读取入口不变；有效 HTTP/HTTPS 链接录入后新增“打开采购来源 ↗”，新标签页回到原始采购页面。
- 选品代表图不再长期显示技术型图片 URL；改为“上传本地图 / 填写图片链接 / 查看大图”三项轻量操作。
- 点击“填写图片链接”后按需展开 URL 编辑器，图片加载成功后自动收起，并显示“图片链接｜已保存”；需要修改时按钮切换为“编辑图片链接”。
- 代表图本身可直接点击查看大图；新增灯箱预览，支持放大、缩小、适应屏幕、打开原图与 Esc/关闭按钮退出。
- 本地上传与图片链接继续沿用原草稿保存机制；无效 URL 或无法加载的图片不会被确认成代表图。
- 本补丁只修改来源链接和代表图交互，不改变数据录入、成本试算、智能定价、测样、推进判断及已锁定业务规则。

# V1.14.0｜2026-08-15｜数量单位语义统一与页面最终锁定候选

- 基线：严格基于 V1.13.0 完整代码，仅修改商品机会记录详情页相关业务语义与当前验证说明；Header、Sidebar、Aside、Footer及公共组件继续冻结。
- 正式锁定数量单位语义：物理属性用“单个”，经营核算用“单件”；“商品”仅作为业务对象名称，不承担数量单位含义。
- 智能定价利润层级统一为：单件毛利、单件贡献利润、单件运营可控利润、单件全成本净利润。
- 相关利润率统一为预计/实际/目标“单件”口径；定价依据、参数追溯、校验提示、动态判断文案和公式说明同步统一。
- “单个”继续仅保留在商品本体物理事实中，例如单个预估毛重、实测单个毛重；销售套装预估毛重由单个毛重 × 销售套装数量形成。
- 新增 `TERMINOLOGY_SOURCE.md`，作为当前页面、AI、Codex和后续开发交接的数量单位语义标准。
- 历史CHANGELOG中的旧术语按历史证据保留，不代表当前有效标准。

# V1.13.0｜2026-08-15｜最终锁定候选

- 基线：严格基于用户提供的 V1.12.0 完整代码，仅修改商品机会记录详情页相关内容。
- 成本试算：固定成本子项金额统一向左内缩一档；页面金额单位统一使用 JPY。
- 数据录入/测样：统一“单个”毛重口径；移除用户界面中的旧 01/02 工作台编号式称呼。
- 测样节点：移除内部“流程节点”抬头；入口统一为“进入测样工作台”。
- 推进判断：移除内部流程抬头，未满足条件时状态简化为“待判断”；主要判断依据按“成本与定价｜状态 / 测样验证｜状态”结构显示。
- 利润口径显示：预计单个商品贡献利润率统一为“预计单件贡献利润率”。
- 最终判断：当前静态预览在会话内生成决策证据快照（结果、决策人、时间、定价快照、测样快照、人工调整理由）；正式系统接入后应写入API/数据库。
- 冻结区域：Header、Sidebar、Aside、Footer及其他公共组件未修改。

# V1.12.0｜2026-08-15

- 以用户提供的 V1.11.0 完整 ZIP 为唯一修改基线，原样复制工程后仅修改商品机会记录详情页 Main 内本轮确认内容；未重建工程，未修改 Header、Sidebar、Aside、全局 Footer 与全局 Shell。
- 字段“单件预估毛重”正式改为“单个预估毛重”：单个用于商品本体数量维度，单件继续用于销售单位/销售套装维度；Help、缺失提示与自动计算说明同步统一。
- 单件预计总成本升级为核心焦点：总成本居中放大；下方以紧凑左右结构显示“单件固定成本 ＋ 销售运营成本”，圆形＋为统一组成关系符号；只有真实极窄宽度才切换纵向。
- 单件固定成本改为父级汇总容器，不再重复展开自身明细；其内部固定采用上下结构显示“到日本仓成本 ＋ 日本配送成本”，加强父子关系并保证说明/展开操作可读。
- 到日本仓成本、日本配送成本保留独立展开明细；展开/收起入口位于说明下方左侧并贴近内容。日本配送成本恢复完整明细：包装成本＋日本配送费＋系统精确小计＋最终成本。
- 销售运营成本统一命名为：平台成本、广告成本、优惠券成本、积分成本、退货损失、结算成本。
- 当前原型运营默认参数调整为优惠券率0%、积分倍率1倍（对应1%成本）；优惠券和积分正式进入预计销售运营成本计算。
- 积分前台计算依据采用“积分倍率1倍（1%）”，后台仍按倍率对应成本比例计算；参数追溯名称统一为“优惠券率”“积分倍率”。
- 摘要层只显示整数结果；财务明细显示2位小数；系统内部保留完整精度。总成本摘要不再显示可能因取整产生视觉误差的整数等式。
- 成本明细表已有“金额（JPY）”表头，行内金额不再重复JPY单位。
- 本轮完成后，成本试算结构进入锁定基线，后续主线转入测样流程验证。

# V1.11.0｜2026-08-15

- 以 V1.10.0 完整代码为唯一修改基线，仅调整商品机会记录详情页 Main 内本轮确认的 8 项单点优化、成本核算标准组件与价格治理参数/函数；未重建工程。
- “单件预估毛重”增加轻量 Help，明确“单件=单个商品1件”，不在字段下新增常驻说明，避免破坏三项核心字段排版。
- “销售套装发货尺寸”增加 Help 与一行填写标准说明：按销售套装实际发货包装后的外尺寸填写；AI仅可辅助估算，最终以实测或可靠结构化数据为准。
- 删除“成本试算与智能定价”总头部的“参数已加载/验证中”常驻状态，以及中间“参数方案/计算来源/历史快照”公共技术信息栏；状态、版本、来源与追溯继续由两个子组件 Footer 承担。
- “系统已计算/待成本试算完成”等子组件状态移到各自标题附近作为轻量状态标签，不再占用右侧整块空间；副标题使用完整可用宽度。
- 删除总模块副标题中的“结果优先，参数只读，公式可追溯；历史计算快照当前待正式接入。”，只保留员工当前需要的业务说明。
- 成本试算正式升级为“财务核算式标准组件”：核心总成本常显；单件固定成本、到日本仓成本、日本配送成本、销售运营成本按计算依赖顺序排列；明细默认收起，缺失/异常时自动展开相关项。
- 复杂成本明细统一采用“项目｜计算依据｜金额（JPY）”结构；金额右对齐、粗体、tabular numbers；明细金额统一显示2位小数，系统内部继续保留完整精度，最终JPY金额在规定节点统一取整。
- 单件预计总成本汇总明确显示“精确值 → 最终取整值”，避免页面明细整数相加与内部精确计算出现1 JPY差异时无法解释。
- 定价参数区整理为电脑端 3×3：平台费率、广告费率、结算手续费率；退货损失率、最低毛利率、目标单个商品贡献利润率；活动最低贡献利润率、官方建议零售价上浮率、允许处理亏损率。窄屏自动降为2列/1列。
- 消费税率与对外售价尾数规则迁出主参数九宫格，作为全局继承参数显示；价格尾数正式按“向上取最近 ××80”执行于对外售价。
- 官方建议零售价函数改为“建议售价 ×（1 + 上浮率）→ 对外价格尾数80”；当前上浮率50%为验证值，100%保留为品牌/品类高上浮档。
- 亏本处理价改为按“允许亏损率”确定：正常处理允许亏损率30%，最大处理亏损率上限50%；保本售价和亏本处理边界保持数学边界，不强制套用80尾数。
- 价格治理主参数继续由系统参数对象统一管理，业务页面只读；正式修改仍归系统设置。
- 未修改 Header、Sidebar、Aside、全局 Footer、全局 Shell、测样、推进判断及其他已锁定公共组件。

# V1.10.0｜2026-08-15

- 数据录入元信息与效率摘要改为同一横向流：优先单行，到真实边界后自然换行。
- 标题 Help 图标统一缩小、变轻，保持标题语义绑定但降低按钮感。
- “自动生成标准名称”等主要业务操作统一为美和绿底 + 粗体白字。
- 采购价、数量、重量、尺寸、金额、比例等业务数字统一加粗并适度放大。
- 销售套装发货尺寸与确认配送档位拆成两个独立业务框。
- 标题副说明遵循可用空间优先，右侧状态只占自身宽度，不提前挤占整行。
- 智能定价金额、比例、判断差值等业务数字提高可读性。
- 公式中相同单位不重复，只在最终结果或必要位置标注。
- 成本计算标签全部统一为“公式：”。
- 成本组成数字增加就地来源公式，每个组成项直接解释“数字怎么来的”。
- 预计销售与价格治理统一使用税込售价作为销售金额基数。
- 新增价格治理函数：官方建议零售价、建议售价、活动价格范围、保本售价、亏本处理价。
- 新增系统参数：官方建议零售价价格空间率、单件最大允许处理亏损额；参数业务页只读，正式修改统一进入系统设置。

## V1.9.0 - 2026-08-15

- 以 V1.8.0 完整代码为唯一修改基线，仅调整商品机会记录详情页 Main 内“成本试算与智能定价”组件的局部布局及本轮变更记录。
- 正式应用通用布局原则：空间足够时可使用多列卡片；空间不足且内容包含说明或公式时，优先使用单列纵向信息行。
- 成本试算中的“到日本仓成本、日本配送成本、销售运营成本、单件固定成本”由 2×2 卡片改为单列 4 行；每行继续保留名称、关键结果、说明与对应公式，不改变计算逻辑。
- 智能定价“价格决策区”中的“美和官方建议零售价、活动价格、保本售价、亏本处理价”由 2×2 改为单列 4 行，保持价格决策常显，不隐藏。
- 保持 V1.8.0 的成本试算 40%｜智能定价 60% 外层比例、利润判断默认收起、字体可读性、参数只读与两个子组件 Footer 不变。
- 未修改 Header、Sidebar、Aside、全局 Footer、全局 Shell、测样、推进判断及其他已锁定区域。

## V1.8.0 - 2026-08-15

- 以 V1.7.0 完整代码为唯一修改基线，仅调整商品机会记录详情页 Main 内“成本试算与智能定价”组件及本轮变更记录。
- 单个商品利润层级名称统一为：单个商品毛利、单个商品贡献利润、单个商品运营可控利润、单个商品全成本净利润；公司级净利润继续留给分析中心/管理驾驶舱，不与单个商品详情混用。
- 可读性完成专项修正：成本公式、定价依据、价格决策区、利润判断摘要、展开说明、参数和 Help 文案整体提升到长期办公可读字号，取消 6–9px 级微型正文。
- 保持 V1.7.0 的 40% 成本试算｜60% 智能定价布局、三列定价结构与利润判断默认收起逻辑不变。
- 成本试算和智能定价分别新增标准组件 Footer，统一显示“状态｜参数版本｜来源｜最后计算｜追溯”；最后计算时间为当前浏览器本次实时试算时间，历史快照仍明确标记待接入。
- Footer 参数版本随当前生效参数方案自动更新；数据不足、参数异常和计算完成时分别显示真实状态，不制造已完成结果。
- 计算公式、成本口径、目标利润参数等业务规则仍按“结构已锁定、公式逐项验证”管理，不因本轮视觉与命名更新自动升级为正式经营规则。
- 未修改 Header、Sidebar、Aside、全局 Footer、全局布局骨架、公共 Shell、测样与推进判断等已锁定区域。

## V1.7.0 - 2026-08-15

- 以 V1.6.0 完整代码为唯一修改基线，仅调整商品机会记录详情页 Main 内“成本试算与智能定价”组件及本轮变更记录。
- 外层布局由 50/50 调整为“成本试算 40%｜智能定价 60%”，按业务复杂度分配空间；窄屏自动改为单列。
- 成本试算与智能定价统一标题结构：图标、标题、副标题、系统计算状态使用同一视觉规则；成本试算标题新增轻量 Help，用于查看成本试算口径。
- 成本试算改为“单件预计总成本”核心结果 + 2×2 成本卡：到日本仓成本、日本配送成本、销售运营成本、单件固定成本。
- 删除独立“查看成本明细”和“试算说明”；各成本的组成与实际计算结果直接回到对应成本卡片，减少重复入口与跨区查找。
- 成本试算仅保留“查看当前成本参数”和“历史成本快照”两个底部折叠项；参数继续只读，正式修改归系统设置。
- 成本公式按当前真实试算结果动态显示：到日本仓/直发采购、配送、固定成本、销售运营成本和单件预计总成本均可在对应卡片直接追溯。
- 智能定价继续沿用 V1.6.0 已锁定结构：建议售价｜定价依据｜价格决策区三列常显；商品盈利空间、单个商品贡献利润、运营可控利润、公司净利润默认收起，异常时自动展开。
- 正常收起状态下尽量收敛左右视觉高度；展开后的参数、历史和利润判断不参与等高要求。
- 未修改 Header、Sidebar、Aside、Footer、全局布局骨架、公共 Shell、测样与推进判断等已锁定区域。

## V1.6.0 - 2026-08-15

- 以 V1.5.0 最新完整代码为唯一修改基线，仅修改商品机会记录详情页 Main 内智能定价模块与本轮变更记录。
- 智能定价顶部锁定为等宽三列：建议售价｜定价依据｜价格决策区。
- 价格决策区常显：美和官方建议零售价、活动价格、保本售价、亏本处理价；未形成的数据保持真实状态，不使用示例数字冒充正式结果。
- 商品盈利空间、单个商品贡献利润、运营可控利润、公司净利润改为默认收起的标准判断组件；摘要常显“当前结果｜控制标准｜如何判断”。
- 商品盈利空间新增“最低毛利率”正式名称，当前系统控制参数为 50%；低于标准时自动展开并预警。
- 兼容 V1.5.0 浏览器本地参数缓存：旧参数缺少最低毛利率时自动补入当前默认值 50%，避免升级后出现空值判断。
- “经营贡献”正式改为“单个商品贡献利润”，统一使用“单个商品贡献利润／单个商品贡献利润率”完整口径。
- 单个商品贡献利润率低于目标时，对应判断组件自动展开并提示异常。
- 计算公式取消独立总入口，分别放回毛利率、单个商品贡献利润率等对应业务区块。
- 运营可控利润与公司净利润当前没有真实数据和正式目标，保持“待形成／待确定”，不制造结论。
- 价格决策、利润判断与参数继续保持只读业务页职责；参数正式修改仍归系统设置。
- 未修改 Header、Sidebar、Aside、Footer、全局布局骨架、公共 Shell 组件及其他已锁定业务模块。

## V1.5.0 - 2026-08-15

- 基于 V1.4.9 唯一真实代码基线合并本轮已确认优化，未重建工程。
- 数据录入头部将“录入时间”统一为“开始录入时间”，新增一行效率摘要；当前原型不制造模拟效率数据。
- 效率详情预留完成录入时间、录入方式、自动化覆盖率、传统人工基准时间（平台级系统参数）。
- 成本试算统一关键成本概念：到日本仓成本、日本配送成本、销售运营成本、单件固定成本、单件预计总成本；直发路线保留对应直发语义。
- 成本明细改为紧凑分组卡片，展示真实计算依据与公式，不补写无来源数字。
- 业务页面取消参数编辑入口，参数在成本/定价结果附近只读查看；正式修改归系统设置管理权限。
- 智能定价重构为“定价依据 → 建议售价 → 商品盈利空间 → 经营贡献 → 价格边界”，增加预计毛利率，并明确毛利率底线尚待正式确认。
- “利润率”相关展示明确使用毛利率、贡献利润率等完整名称；目标贡献利润率 20% 仍为验证参数。
- 历史计算快照明确标记为待正式接入，不冒充已完成接口。
- 未修改 Header、Sidebar、Aside、Footer、全局布局骨架与已锁定公共 Shell 组件。

## V1.4.9 - 2026-08-15

- 商品机会记录详情页统一“系统自动生成”表述，并将核心说明改为“一个链接自动录入，核心事实支持经营计算，其余信息尽量自动生成”。
- 增加数据录入区文本与大小标题的适度呼吸感，不改变既有页面结构。
- 采购来源链接标签与输入区增加垂直间距。
- 商品名称增加可复用自动化状态提示：AI可生成 / AI生成中 / AI已生成 / 人工已调整 / 待确认 / 生成失败。
- 商品分类默认提示由“AI推荐 · 待确认”调整为“AI可生成”，自动录入摘要不默认制造人工确认。
- “读取并自动填充”增加空闲、读取中、来源已识别、失败状态；当前仍只执行确定性来源识别，不伪造 API / AI 结果。
- 未修改 Header、Sidebar、Aside、Footer、业务流程结构、成本计算、配送函数及草稿保存逻辑。

## V1.4.8 - 2026-08-15

- 基于 V1.4.6 完成数据录入最终视觉收敛。
- 三个核心数值字段同一行独立框。
- 发货尺寸 + 确认配送档位桌面端单行。
- 配送函数结果统一归入系统自动形成。
- 未修改既有业务计算与保存逻辑。

## V1.4.6 - 2026-08-15

- 新增日本配送尺寸确定性函数与人工确认配送档位。
- 3cm薄型判断升级为：厚度<=3cm、最长边<=34cm、三边合计<=60cm。
- 非薄型按三边合计匹配60/80/100/120サイズ。
- 日本配送费继续读取当前生效参数版本。
- 发货尺寸改为独立完整业务块；配送结果不再与“系统自动形成”区重复展示。
- 修复选品代表图空状态与实际图片同时显示的问题，保持contain完整显示。

## V1.4.5 - 2026-08-15

- 删除数据录入核心区“经营计算关键数据”小标题，减少一层视觉分组。
- 保持四项核心经营事实同一行：采购单价、销售套装数量、单件预估毛重、销售套装发货尺寸。
- 保持中文单位、选品类型自动继承、成本路由、配送档位与日本配送费自动形成逻辑。
- 明确商品机会详情页不承担 CSV / Excel 批量导入导出。

## V1.4.4 - 2026-08-15

- 新增销售套装发货尺寸（长×宽×高）。
- 前台单位统一中文显示。
- 直发选品 / 常规选品自动路由对应成本模型。
- 根据发货尺寸自动匹配日本配送档位，并读取当前生效配送费参数。
- 发货尺寸纳入草稿保存 / 自动恢复。

## V1.4.1 - 2026-08-15

- 修复选品代表图“粘贴图片链接”无法实际录入的问题。
- 按钮改为 URL 输入框，支持粘贴 / Enter / change 触发预览。
- 仅在图片加载成功后确认代表图；失败时提供明确提示。
- 未改动其他已锁定模块。

# 变更记录

## v0.1｜2026-08-12｜验证中

- 以恢复版全局框架为唯一基线建立美和代码专用目录。
- 将 Header、Primary Navigation、Aside、Footer 的 HTML 与 CSS 分开管理。
- 接入按功能分区后的新版 Header HTML、CSS 和初始化逻辑。
- 建立公共 CSS 总入口 `css/miwa-system.css`。
- 建立公共 JS 总入口 `js/miwa-system.js`。
- 建立集中配置 `js/config/system-config.js`。
- 修正原 Sidebar CSS 中的非法全角分号。
- 将旧混合选品样式移入 `recovery/`，不参与正式加载。
- 为选品工作台和选品记录预留正式接入口，但未伪造缺失代码。

## v0.1｜2026-08-14｜Header 最终微调

- 恢复 Header 第一行两条职责分割线：品牌区／用户区边界、主导航／全局工具区边界。
- 分割线采用 1px 中性浅灰绿，不改变既有模块、数据与交互逻辑。
- 1199px 以下自动取消分割线，避免窄屏布局拥挤。

## 2026-08-14｜01 选品工作台 Main 嫁接候选

- 在现有 MIWA System Shell 候选版内接入 `pages/selection-workbench/home.html`。
- Main 采用已确认的一级页面结构：业务类型 → 业务流程 → 业务指标 → 筛选 → 商品机会。
- 商品机会卡片采用最终候选 v5 的紧凑高度基线，同时保留 V1.0 锁定规则中的“业务关键要素”正式命名。
- 默认使用卡片视图，保留列表切换与类型／流程／状态／负责人／搜索筛选。
- Header、Primary Navigation、Aside、Footer 的结构与样式不在本轮重构范围。
- 当前为“嫁接候选”，需浏览器确认后再决定是否锁定。

## 2026-08-14｜01 选品工作台 V1.0 锁定前预览

- 将“业务类型／业务流程／业务指标”统一收口为独立的页面概览模块。
- 将“商品机会一览／视图切换／筛选／卡片或列表”收口为独立的商品机会模块，两模块使用独立容器与明确间距。
- 修复卡片／列表视图互斥显示；隐藏状态强制不渲染对应视图。
- 商品机会卡片“判断依据”改为默认折叠；异常或风险商品自动展开提示。
- 卡片底部前台名称由“业务关键要素 9/9”简化为“要素 9/9”，正式业务名称仍保留在页面辅助区与帮助体系。
- “新建商品机会”弹窗放大为 2×2 业务入口卡片，四种选品类型增加简短说明和轻量 Hover／点击反馈。
- 选择选品类型后进入“选品录入”路由验证页，并自动带入所选类型；编辑既有商品机会也进入同一路由验证页。
- 标题帮助入口改为轻量线性 SVG 图标，保持紧邻标题，不再显示成突出的圆形按钮。
- 本轮只锁定 01 选品工作台首页；选品录入页仅作为路由验证接入口，不纳入本轮锁定范围。

## 2026-08-14｜九要素列表与AI流程覆盖预览
- 列表视图按“目标｜人｜物｜事｜平台｜时间｜钱｜信息｜结果”九要素顺序重排。
- “物”列加入商品代表图占位、商品名称与机会编号；正式版接真实选品代表图。
- “事”统一显示选品类型；补齐平台列。
- 独立操作列取消，编辑入口收进“目标”列，保持九列严格对应九要素。
- 列表与卡片统一每页12项，切换视图保持同页同数据。
- 当前筛选结果底部通过确定性函数汇总“当前投入成本”。
- “AI辅助运行”改为“AI流程覆盖｜待验证”，点击查看六个选品流程节点；不使用虚假覆盖数字。

## 2026-08-14｜01 选品工作台 V1.0 完整候选

- 将12个商品机会抽离为统一数据源 `js/data/selection-opportunities.js`，列表与卡片完全共用同一批数据。
- 九要素列表最终调整为：目标｜人｜物｜事｜平台｜时间｜投入成本｜信息｜结果。
- 目标列简化为“选品”；“物”列整合代表图、商品名、XP编号和选品类型；“事”列调整为当前业务节点＋编辑入口。
- 列表取消桌面端横向滚动依赖，使用固定比例9列布局，结果列始终保留可见空间。
- 列表行高增加，代表图提高到约52px；长内容最多两行；平台超出时以 `+N` 收敛。
- 列表与卡片统一12项／页，筛选后底部由确定性函数计算“当前投入成本”。
- 商品卡片目标改为简洁“选品”，继续保留折叠判断依据及“要素｜结果｜编辑”底栏。
- 修正六步业务流程箭头布局，确保第06项“推进判断”完整显示。
- “AI流程覆盖”入口升级为“选品AI人才”，并建立数据驱动的 AI人才卡片三段式母版。
- 新增本地 AI人才库数据层 `js/data/ai-talents.js`；页面只通过 `ai_talent_id=selection_ai` 调用身份、能力与实战数据。
- AI人才卡片头部收紧为头像／身份／有价值标签／职责说明；中部显示节点执行与能力状态；尾部显示整体实战表现。
- AI人才没有真实验证数据时统一显示“待验证”，不填充演示经验值。
- 选品录入链路调整为：商品机会已创建 → 数据录入；新建时自动生成预览商品机会ID并带入选品类型，编辑时带入已有基础信息。
## 2026-08-14｜候选版10｜列表实务化单点修正

- 仅修改01选品工作台的列表视图，不改卡片、Header、Sidebar、Aside、Footer、AI人才卡片与选品录入页。
- 九要素继续作为底层业务模型保留；前台列表不再机械展示9列。
- 列表收敛为：商品、负责人、当前事项、平台、时间、投入成本、信息、结果。
- “目标＝选品”由当前页面语境表达，不再重复占用列表列位。
- 商品列继续承载代表图、商品名、XP编号与选品类型。
- 当前事项承载流程节点与编辑动作。
- 修正表格单元格被 flex/grid 直接替换后造成的行列错位：td保持原生 table-cell，内部容器负责布局。
- 结果列固定保留在可视范围，不依赖桌面横向滚动。


## 2026-08-14｜01 选品工作台首页 V1.0｜正式锁定

- 本轮以候选版10为唯一代码基线完成最终收口，不重构 Header、Primary Navigation、Aside、Footer。
- 将此前尚未统一的三处内容一并收口：
  1. 列表视图继续采用实务化简化版，商品／负责人／当前事项／平台／时间／投入成本／信息／结果在 Main 内完整显示，不依赖桌面横向滚动；列表与卡片保持同一批12项数据。
  2. 选品AI人才卡片保持“头部身份与成熟度／中部业务流程能力／尾部实战表现”三区结构，并继续通过 `ai_talent_id=selection_ai` 从本地AI人才库读取身份与能力数据；头像接口同时支持未来由AI人才库动态提供图片。
  3. 商品机会卡片按最终锁定母版统一：顶部商品名称＋图片区与识别信息约62:38；中部目标／负责人／事项／平台／时间／投入成本／信息；底部仅显示居中的结果胶囊与同一行优先的判断依据。
- 商品机会卡片目标文案统一为：“完成该商品机会的选品判断，确认是否值得继续推进。”
- 判断依据统一为“判断依据：具体说明”的连续表达；空间不足时自然换到第二行，不人为拆成标题行与正文行。
- 结果区删除“结果”二字，只保留 `待形成 / ✓ 上架 / × 不上架` 居中胶囊。
- 本版本作为 01 选品工作台首页 V1.0 锁定代码基线；后续若修改，必须进入正式变更流程。

## 2026-08-14｜V1.0 最终锁定修正
- 列表继续采用用户确认的实务化简化结构，不恢复旧版九要素九列表头。
- 列表正式保持 8 列：商品信息摘要｜负责人｜当前事项｜平台｜时间｜投入成本｜信息｜结果。
- “商品”字段名称正式改为“商品信息摘要”。
- 商品信息摘要集中显示：选品代表图、商品名称、商品机会编号、选品类型、采购来源。
- 采购来源真实 URL 使用可选字段 `sourceUrl`；只有存在真实 URL 时显示可点击 `来源 ↗`，未核实 URL 不猜测、不伪造。
- 选品AI人才卡片采用已确认锁定头部：选品AI人才＋专业AI人才＋流程覆盖级同一识别层；删除重复“AI人才身份”小标题。
- AI人才卡片继续保持三段式母版：头部身份与成熟度｜中部业务流程能力｜尾部实战表现。

## 2026-08-14｜V1.0 最终锁定补充｜列表与卡片同源表达

- 保持用户确认的8列实务列表，不恢复已取消的九要素九列表头。
- “商品信息摘要”最终统一为：选品代表图＋商品名称＋XP编号＋选品类型＋采购来源＋`要素 x/9`。
- `要素 x/9` 在列表与卡片中调用同一业务关键要素入口，避免两种视图内容口径不一致。
- 卡片采购来源改为与列表共用同一 `sourceUrl` 规则：有真实URL才显示可点击来源链接，无真实URL只显示来源名称，不伪造链接。
- 列表其余字段继续与卡片共用同一商品机会数据源：负责人、当前事项、销售平台、时间、投入成本、信息状态、结果。
- 正式锁定原则：卡片和列表同源数据、同一业务含义、不同视觉表达。

## V1.0.1 - 2026-08-14

- 保留01选品工作台V1.0 FINAL LOCKED一级页面完整内容。
- 将商品机会记录详情V0.4.1作为独立二级HTML页面接入同一工程。
- 当前恢复记录 `XP20260811000002` 的“编辑”进入二级详情；其他记录与新建商品机会继续沿用原V1.0链路，避免数据错配。
- 二级详情返回入口与Sidebar“选品工作台”统一返回 `index.html#/selection`。
- 阻止详情页“提交选品资料”的浏览器默认跳转。
- 移除详情页Main顶部开发恢复说明。

## V1.1 - 2026-08-14

- 废止旧「选品录入」作为正式独立页面的导航职责。
- 新建与编辑统一进入「商品机会记录详情」。
- 商品机会记录详情接入 `selection-opportunities.js` 作为当前静态阶段的统一身份数据源。
- 详情页 Sidebar「选品工作台」与页面返回入口统一回到01选品工作台一级页面。
- 旧 record-preview.html / selection-record-preview.js / selection-record-preview.css 暂不删除，仅作为恢复参考保留。

## V1.4.3 - 2026-08-15

- 商品名称区域改为完整独立框。
- 增加采购来源链接与商品名称之间的纵向间距。
- 其他数据录入及草稿存储逻辑保持不变。

## 2026-08-15｜Selection Batch Import Candidate
- 01 选品工作台页头新增独立「批量导入」入口；与「新建商品机会」「选品AI人才」保持职责分离。
- 新增四步批量导入流程：选择类型 → 下载模板 → 上传校验 → 批量创建。
- 直发／常规／AI选品共用采购来源型Excel模板；产品开发使用独立开发需求模板。
- 下载按钮在未选择选品类型前保持禁用；选择后自动匹配模板与下载文件名。
- 上传后先校验，再由员工确认批量创建；当前原型不写入真实数据库。
- Header / Sidebar / Aside / Footer 及全局Shell未修改。

## V1.15.1 CANDIDATE｜预演数据持久化
- 新增浏览器本地预演数据层，12个商品机会按 opportunity_id 隔离读取草稿与业务状态。
- 选品录入草稿继续使用 LocalStorage；代表图本地文件继续使用 IndexedDB。
- 成本/智能定价有效结果、测样草稿、测样完成状态、最终推进判断写入当前浏览器 LocalStorage。
- 返回01选品工作台后，商品机会卡片/列表会根据预演数据恢复商品名、采购来源、当前节点与最终结果。
- 刷新详情页后恢复测样表单摘要与最终判断结果。
- 本功能仅用于12商品机会全流程预演验证，不写入正式业务数据库，不产生正式经营数据。

## V1.15.7 CANDIDATE｜手工新建商品机会状态初始化修复
- 修复批量导入后手工新建商品机会可能因编号碰撞而打开既有记录的问题。
- 新建编号改为读取当日现有最大序号后递增，不再按列表长度推算。
- 新建模式进入详情页前清理同编号预演草稿/流程状态。
- 新建详情页不读取既有商品机会数据，也不恢复历史草稿；仅保留系统生成ID、选品类型、负责人、创建时间等创建上下文。
- 编辑既有商品机会的恢复逻辑保持不变。

## V1.15.8 CANDIDATE | 新建记录提交后即时成本试算
- 修复新建常规选品提交后，成本试算未立即重新触发的问题。
- 数据录入校验通过并提交后，统一触发成本试算刷新与业务流程状态刷新。
- 不要求员工再次修改任一成本字段才能看到结果。
- 不改变现有成本公式、配送规则、定价规则和业务字段定义。


## V1.15.9 CANDIDATE｜商品机会持久化、分页与删除/作废
- 修复手工新建商品机会保存后未进入商品机会主列表的问题。
- 每页固定12项仅作为分页规则，总记录数不再限制为12项；新增上一页/下一页操作。
- 保存草稿与提交选品资料时，同步写入商品机会统一预演数据源，刷新页面后仍可读取。
- 商品机会详情页补充受控删除/作废操作：未进入后续流程可删除；已形成后续业务记录则作废并保留历史。
- 本轮不调整已确认的成本公式、智能定价、测样及视觉结构。

## V1.18.1 CANDIDATE｜2026-08-19｜Preview登录与权限前置验证

- 新增 `js/config/preview-identities.js`：登记7名现有成员与1个公司管理身份的Preview身份映射。
- 新增 `js/auth/preview-auth.js` 与 `components/auth/preview-login.html`：提供本地身份模拟、SessionStorage预演会话与身份切换。
- 新增 `css/components/preview-auth.css`：Preview登录界面样式。
- 新增 `docs/PREVIEW_AUTH_V0.1.md`：记录本地验证范围、正式Google OIDC接入边界与安全要求。
- 梁统剑绑定1号店「幸せ屋」；陈永航绑定2号店「PrimeLife」。
- Header前台统一使用“AI中心”；九宫格入口统一语义为“平台中心”。
- Header用户信息与入口可见性从Preview身份权限配置动态注入。
- 新增 `window.AIONEPreviewPermissionContext`，作为后续Sidebar、页面、API权限接入的统一前台上下文。
- 当前实现仅为本地Preview身份模拟，不提供正式认证与服务端数据安全边界；公网Preview必须接入Google OIDC和服务端会话/授权验证。

## V1.18.2 PREVIEW_ALL_OPEN CANDIDATE｜2026-08-19
- 内测原则改为“全开放、强归属、重记录、后收权”。
- 7名成员与公司管理身份均可查看/体验全部AIONE内测平台能力。
- 店铺/岗位信息改为工作归属与考核维度，不再作为内测可见范围限制。
- 新增本地Preview Activity记录层，把登录、身份切换、页面访问归属到subject/person。
- 新增window.AIONEPreviewActivity，预留任务、工作量、结果、AI使用与考核数据接入。
- 修复preview-auth.css加载顺序。
- 修复选品工作台可选筛选控件缺失时的appendChild空节点错误。

## V1.18.3 CANDIDATE｜2026-08-19｜Google真实登录接入

- 接入 Google Identity Services，启用 AIONE Web Login。
- Google登录邮箱自动匹配AIONE 7名成员与公司管理账户。
- 公网内测域名不再显示手动身份卡；localhost保留开发备用身份。
- 登录来源、认证邮箱继续写入Preview权限上下文与活动记录。
- 当前仍为Preview前端验证，正式生产阶段补服务端ID token验证与持久化会话。

- 2026-08-19：AIONE V1.18.2 已迁入 miwa-code，并重新连接 Vercel 内测部署。

## 2026-08-21 | Header V1.0.10 两层收口
- 桌面Header由三层收敛为两层。
- 第一层统一：Logo + AIONE / 当前用户 / 今日工作 / 美和日历 / 分析中心 / 分类之家 / 商品之家 / AI之家 / 共享之家 / 全局搜索 / 通知 / 帮助 / 设置。
- 第二层按用途分组：跨境店铺 / 订单与面单 / 办公 / 购物 / 邮箱。
- 跨境店铺保留幸せ屋、PrimeLife、永井GD及更多店铺；福山面单标记为日暮里使用。
- Sidebar保持V1.0.9事业化导航，不在本轮调整。
- 下午新增AI办公室、任务之家等方向仅进入待开发，不插入本轮代码主线。

## V1.0.22 - Selection Shell Dedup Rescue
- 回到 V1.0.17 已成功嫁接的业务版本作为救援源。
- 新增 record-detail `embed=1` 适配：隐藏内层 Header/Sidebar/Aside/Footer，保留其 DOM 供旧JS兼容。
- 不修改外层全局架构、9个工作台、选品业务内容与测样业务内容。

## V1.2.1 - MIWA 9 Elements component style hotfix
- Fixed missing shared CSS for the single-source `miwa-nine-elements` component.
- Restored the standard Level-2 card, header, 9/9 status pill and nine-column element layout.
- Added regression validation so component logic cannot ship without its shared styles again.

## V1.9.8｜美和AI Entry Bridge Hotfix｜2026-08-24
- 修复真实Windows/Live Server中Header“美和AI”点击无反应。
- 入口改为document capture级事件委托，Desktop/Mobile统一，不依赖Header节点首次绑定时机。
- 修复AI Layer一次DOM校验失败后被initialized永久锁死的问题。
- AI Layer未挂载时自动等待并在挂载后打开。
- Shell各区域初始化相互隔离，前序区域异常不再阻断美和AI。
- 强制资源版本升级至V1.9.8，避免浏览器继续命中V1.9.7缓存。
- AI Backend / Tool Layer / Aside锁定规则均未改变。


## V1.9.10｜美和AI Self-Healing Layer Hotfix｜2026-08-24
- 根据Windows/Live Server实测确认：V1.9.9已经解决“Header美和AI点击无反应”，入口层正式打通。
- 新问题明确收敛为AI Layer正文DOM不完整：外壳/Header存在，但上下文、能力推荐、AI工作区与Composer可能未进入最终DOM。
- 新增`REQUIRED_LAYER_IDS`与`LAYER_BODY_TEMPLATE`，打开美和AI后先检查必要结构。
- 若检测到正文缺失，`repairLayerStructure()`会立即重建Context / Suggestions / Work Area / Composer，并写入`data-miwa-ai-repaired=true`诊断标记。
- 自愈完成后才初始化AI Client，避免前端结构异常被误判为Backend异常。
- 保留V1.9.9 Hard Entry Bridge；美和AI仍独立于Sidebar / Main / Aside / Footer。
- 原AI Backend、Tool Layer、人类确认机制及`/status → /execute → /confirm`接口不重接、不删除。
- 新增V1.9.10专项回归测试，并重新通过全部现有正式验证。
## V1.9.30｜工作执行・证据・结果・AI复盘闭环｜2026-08-26
- 工作之家新增正式工作详情执行层：打开工作、开始执行、添加执行记录、提交结果、确认完成。
- 复用既有 `work_items / work_evidence / result_facts / business_events`，不新增重复事实表。
- 工作状态强制经过 `pending → in_progress` 后才能提交完成；负责人和创建者不同则进入 `waiting` 复核。
- 执行证据支持说明与证据链接/文件地址，文件本体继续由正式文件体系/Google Shared Drive管理。
- 当前工作详情自动进入美和AI上下文，新增复盘结果、检查证据、判断完成、下一轮建议四类能力；用户明确发起的AI复盘以 `ai_review` 执行记录留痕，不自动改变工作状态。
- 新工作写入边界不变：AI只能建议，正式创建仍需 Proposal + Human Confirm。


## V1.9.30.1｜Google Drive → AIONE Registry 自动同步｜2026-08-26
- 新增指定共享云盘目录自动扫描：第一阶段只覆盖“美和之家 → 03_经营与战略 → 经营架构”。
- 新增Google Drive文件列表读取能力，继续使用既有 `aione-runtime` Viewer身份，不开放共享云盘。
- 识别后的文件注册信息Upsert到既有 `knowledge_routes`，Google Drive继续保存唯一正式文件本体。
- 美和AI企业资料检索在明确找文件/图片/链接时先自动同步Drive Registry，再合并AIONE固定索引进行确定性检索。
- 增加 `IMAGE` 类型和图片/PNG/链接语义；经营总架构战略版图片可被直接检索并返回原件入口。
- 新增受控强制同步与同步状态接口，以及已同步资料的AIONE安全下载路由。
- 文件名未明确正式版本号时保持“正式版本号待确认”，不自动把战略版图片冒充V1.0。
