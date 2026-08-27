# MIWA AIONE Integrated Work Platform

> **Current candidate: V1.9.33 WORK HOME V2 STRUCTURE UPGRADE CANDIDATE.**
V1.9.33把工作之家从“个人任务页”提升为集团级统一工作入口：Sidebar收敛为工作概览、今日工作、全部工作、我的关注、事业工作、等待与阻塞、待验收、工作记录；全部工作统一使用卡片/列表、搜索、筛选、排序；新增公司内部可见读取与关注机制，并严格保持“看得到 ≠ 要处理 ≠ 能操作”“透明 ≠ 推送”。工作概览不再只是出版物风格，而是真正继承美和数字出版物母版，形成《美和工作手册》8章。既有执行/证据/验收/AI复盘/Header提醒闭环完整继承，不新建第二套工作事实。



V1.9.30.2收敛工作之家Header红色数字的真实业务语义：**只提示当前需要本人处理的工作（待处理、待确认、超期、阻断/异常），普通进行中与已完成不进入提醒。** Proposal人工确认、工作状态变化后立即同步；浏览器重新获得焦点/重新可见时自动同步，并以60秒轻量轮询作为多人协作兜底。继续读取同一份work_items事实，不新增重复统计表。


V1.9.30.1补齐Google Drive到AIONE资料索引的最后一公里：**美和AI在明确查找资料、图片、链接或原件时，先由Cloud Run Runtime Service Account扫描已确认的“经营架构”共享云盘目录，把匹配文件登记到既有knowledge_routes，再与AIONE固定Registry合并检索。** 第一阶段只覆盖正式确认的经营架构目录，不对整个共享云盘无规则扫描；文件本体仍只保存在Google Drive，未确认的正式版本号不会自动猜测。


V1.9.30在V1.9.29.1工作之家正式恢复基础上继续向执行结果推进：**工作事项可从待处理进入进行中，持续记录执行说明和证据地址，提交结果后写入正式work_evidence / result_facts / business_events；工作详情会作为美和AI当前上下文，支持“复盘工作结果 / 检查执行证据 / 判断是否完成 / 下一轮建议”。** 新一轮正式工作仍需Proposal + Human Confirm。

V1.9.29在V1.9.28真实上下文分析基础上完成两项收口：**正式区分“美和集团AI经营总架构”与“美和集团AI执行总架构”，旧“现代企业军团总架构”作为执行总架构历史别名保留；美和AI把编号优化清单继续转换为多个待确认工作事项Proposal，逐项由人类确认后写入工作之家。** Google Drive原件仍通过共享云盘安全交付；当前经营总架构新版原件尚待绑定，不以旧基石版冒充新版。

V1.9.17 remains the locked AI Context Router baseline inherited by this candidate.

V1.9.17 makes the employee-facing AI interaction simpler: employees use one **美和AI** and AIONE automatically matches capabilities from the current business context. AI人才、AI岗位、Skill、Agent、模型与Provider继续作为后台分类/编排概念，不成为员工选择步骤。The first real validation target is the Selection product-opportunity detail page, where the router reads the current opportunity plus AIONE cost/pricing, shipping, sampling and decision evidence and automatically exposes four business capabilities. Deterministic system calculations remain authoritative; writes still follow the existing Proposal + Human Confirm boundary.

V1.9.16 remains the Proposal Bridge baseline: explicit work-item creation intent is converted into a structured Proposal, staged in Backend memory and resolved only after human confirmation.

V1.9.13在已验证的美和AI入口、Backend和执行链之上新增统一Model Provider Layer。业务编排不再直接依赖OpenAI；Preview继续用于确定性链路验证，Live模式通过`AIONE_AI_PROVIDER`选择真实模型。第一阶段Provider为OpenAI Responses API。新增Windows真实模型启动器，Key仅注入Backend当前进程；当前选品工作台的数据摘要也进入AI上下文，模型回答页面问题时优先通过AIONE Tool Layer读取证据。

V1.9.10针对真实Windows/Live Server中“美和AI已能打开，但只显示Header并提示界面组件加载不完整”的第二层问题继续修复：保留V1.9.9 Hard Entry Bridge，同时新增AI Layer正文结构自愈机制。若组件注入后缺少上下文、推荐能力、运行状态、对话区或Composer，系统会在本地立即重建缺失结构，再接入既有AI Client / Backend，不再要求用户刷新或重新进入。原AI Backend / Tool Layer / `/status → /execute → /confirm`执行链保持不变。



V1.9.9继续针对真实Windows/Live Server中“Header 美和AI按钮可见但点击无响应”的问题做强制入口修复：新增独立Hard Entry Bridge，点击后先直接打开AI Layer，再进行Route、推荐能力、AI Client等增强初始化；同时对嵌套ES Module与AI CSS单独版本化，避免旧缓存继续执行V1.9.6/1.9.7/1.9.8代码。原AI Backend / Tool Layer / 人类确认执行链没有重接，也没有把AI放回Aside。


V1.9.6在V1.9.5左右边栏锁定基线上正式接入独立“美和AI”智能能力层：Header全局工具第一阶段顺序为“全局搜索 → 美和AI → 通知 → 帮助 → 设置”；AI不重新进入Aside，而通过独立Overlay Layer按“美和AI快捷层 → AI工作区 → AI办公室”逐级展开，并复用现有AI Backend / Tool Layer / 人类确认机制。

V1.9.5在V1.9.4智能Header锁定基线上正式收口左右边栏：Sidebar统一为“树形/手风琴Navigation + 小型Quick Actions”，具体内容按业务型/内容展示型/应用工具型/系统型动态生成；Aside回归纯上下文辅助并支持hidden/light/standard。AI秘书常驻Aside旧设计已废止，Sidebar/Aside锁定规则继续作为V1.9.6继承基线。

V1.9.4 keeps the V1.9.0 Cloud Data Runtime and all validated V1.4-V1.9 foundations, while finalizing the Header as AIONE's global context and dispatch brain.

Locked H1 context core:

`AIONE -> Current Business -> Current User -> Work Home -> MIWA Calendar`

Core-home order:

`Talent Home -> AI Home | Customer Home -> Supplier Home | Category Home -> Product Home -> Store Home | Analysis Home -> Knowledge Home`

H1 keeps the first five context items fixed. Only the core-home rail becomes horizontally browsable when it actually overflows. Global Search / 美和AI / Notification / Help / Settings remain fixed tools.

H2 is **Quick Access only**. It renders real high-frequency shortcuts from one internal resource registry, auto-groups them with thin separators, supports hide/sort metadata and horizontal browsing, and ends with a fixed `apps icon + More` entry. `Shared Resources` remains an internal management/registry concept and is not exposed as a Header navigation name.

H4 is locked as `Today Impression | Important Schedule | Important Notice`.

V1.9.0的Google Cloud安全运行工程完整保留：

`Cloud SQL备份 → Cloud Build镜像 → DB Preflight Job → Migration Job → 私有Cloud Run Backend → 认证Smoke Test`

核心原则：

- `public.people`继续作为唯一Person主数据；
- 现有`people / external_identities / product_opportunities / activity_logs`不重建、不覆盖；
- 数据库迁移为增量，现场执行前必须先做只读Preflight和备份；
- 新建`aione-backend-v190`作为云端验证服务，不覆盖现有`aione-backend`；
- Cloud Run在最终用户认证接入前保持私有；
- DB密码只由Secret Manager注入；
- 云端关闭Preview Actor和无人员System Writes；
- 本轮先保持AI秘书`preview`模式，真实OpenAI模型在真实数据运行稳定后再切换。

现场执行入口：

- `infra/gcp/cloud-shell/README.md`

主要文档：

- `docs/BASELINE_V1.9.30.1_DRIVE_REGISTRY_SYNC_CANDIDATE.md`
- `docs/VALIDATION_V1.9.30.1_DRIVE_REGISTRY_SYNC_CANDIDATE.md`
- `docs/BASELINE_V1.9.30_WORK_EXECUTION_EVIDENCE_AI_REVIEW_CANDIDATE.md`
- `docs/VALIDATION_V1.9.30_WORK_EXECUTION_EVIDENCE_AI_REVIEW_CANDIDATE.md`
- `docs/BASELINE_V1.9.29_MIWA_AI_ARCHITECTURE_PROPOSAL_EXECUTION_CANDIDATE.md`
- `docs/BASELINE_V1.9.28_MIWA_AI_CONTEXT_CAPABILITIES_CANDIDATE.md`
- `docs/VALIDATION_V1.9.29_MIWA_AI_ARCHITECTURE_PROPOSAL_EXECUTION_CANDIDATE.md`
- `docs/VALIDATION_V1.9.28_MIWA_AI_CONTEXT_CAPABILITIES_CANDIDATE.md`
- `docs/CLOUD_DATA_RUNTIME_V1.0.md`
- `docs/DATA_MODEL_V1.0.md`
- `docs/DATABASE_MIGRATION_V1.0.md`
- `docs/BACKEND_API_V1.0.md`
- `docs/AI_OFFICE_V1.0.md`
- `docs/AI_SECRETARY_TOOL_LAYER_V1.0.md`
- `docs/BASELINE_V1.9.6_MIWA_AI_LAYER_CANDIDATE.md`
- `docs/VALIDATION_V1.9.6_MIWA_AI_LAYER_CANDIDATE.md`
- `docs/BASELINE_V1.9.5_SIDEBAR_ASIDE_LOCK_CANDIDATE.md`
- `docs/VALIDATION_V1.9.5_SIDEBAR_ASIDE_LOCK_CANDIDATE.md`
- `docs/AIONE_SIDEBAR_ASIDE_LOCK_V1.0.md`
- `docs/DEPRECATED_SIDEBAR_ASIDE_STANDARDS.md`
- `docs/BASELINE_V1.9.4_SMART_HEADER_LOCK_CANDIDATE.md`
- `docs/VALIDATION_V1.9.4_SMART_HEADER_LOCK_CANDIDATE.md`
- `docs/AIONE_GLOBAL_NAVIGATION_CONTEXT_AND_SIDEBAR_LOGIC_V1.2.md`
- `docs/BASELINE_V1.9.3_HEADER_CORE_HOMES_SHARED_RESOURCES_CANDIDATE.md`
- `docs/VALIDATION_V1.9.3_HEADER_CORE_HOMES_SHARED_RESOURCES_CANDIDATE.md`
- `docs/AIONE_GLOBAL_NAVIGATION_CONTEXT_AND_SIDEBAR_LOGIC_V1.1.md`
- `docs/BASELINE_V1.9.2_KNOWLEDGE_HELP_CENTER_NAV_LOGIC_CANDIDATE.md`
- `docs/VALIDATION_V1.9.2_KNOWLEDGE_HELP_CENTER_NAV_LOGIC_CANDIDATE.md`
- `docs/AIONE_GLOBAL_NAVIGATION_CONTEXT_AND_SIDEBAR_LOGIC_V1.0.md`
- `docs/BASELINE_V1.9.1_GLOBAL_SHELL_HEADER_CONTEXT_CANDIDATE.md`
- `docs/VALIDATION_V1.9.1_GLOBAL_SHELL_HEADER_CONTEXT_CANDIDATE.md`
- `docs/BASELINE_V1.9.0_CLOUD_DATA_RUNTIME_CANDIDATE.md`
- `docs/VALIDATION_V1.9.0_CLOUD_DATA_RUNTIME_CANDIDATE.md`

**重要边界：** V1.9.6已完成“美和AI → AI工作区 → AI办公室”第一版独立交互层接入，并继续继承V1.9.5 Sidebar/Aside锁定。AI能力强度、Skill/Agent/Connector完整接入及真实模型效果仍需后续真实业务验证；视觉和操作手感建议在Windows + Live Server人工验收。正式Cloud SQL/Cloud Run操作仍必须在用户已登录的Google Cloud Shell中运行并现场验收。
