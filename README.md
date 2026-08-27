# 美和集团代码资产主仓库

> Current AIONE candidate: `apps/systems/aione` **V1.9.36 WORK HOME BROWSER EXPERIENCE LOCK CANDIDATE**. `main` remains the current development baseline; V1.9.30 Work execution, V1.9.30.2 Work Home attention sync, V1.9.31.5 digital-publication foundations and V1.9.35 Work Home unified browser/contribution entrances are inherited.

## 仓库定位

- 本地正式根目录：`D:\miwa\code\`
- GitHub 定位：MIWA Group Code Assets｜美和集团代码资产主仓库
- 默认分支：`main`
- Codex 职责：协助完成代码资产识别、分类、开发、测试、安全检查、版本控制、Git 提交、GitHub 同步和工程说明维护

与代码直接相关、需要和代码共同演进的架构及工程说明进入 `docs/`。业务知识正文不进入代码仓库，长期由 AIONE「知识之家」统一管理；文件、图片、视频、应用、工具、代码、数据、模板、连接、服务等可共享资产由 AIONE「共享资源」统一登记目录、关系和入口，正式本体仍保留在各自唯一来源。

## 目录职责

| 目录 | 职责 |
| --- | --- |
| `inbox/` | 未审核代码的临时入口；不是正式资产区 |
| `shared/` | 跨系统可复用的基础与功能模块 |
| `shells/` | 内部系统、电商和服务场景的共享母版 |
| `apps/` | 具体内部系统、电商和对外服务应用 |
| `contracts/` | 数据、API 和事件契约 |
| `adapters/` | 平台、数据库和外部服务适配器 |
| `data-code/` | 数据结构、迁移、查询、函数、管道、映射与校验 |
| `rules/` | 业务规则和判断逻辑 |
| `automation/` | 自动化执行流程 |
| `ai/` | AI、Agent、Skill 调用及模型编排能力 |
| `config/` | 代码运行所需且可安全版本化的正式配置 |
| `tools/` | 开发、检查、迁移和维护工具 |
| `tests/` | 自动化及其他测试资产 |
| `infra/` | 部署、环境、运行和基础设施代码 |
| `docs/` | 随代码共同维护的架构和工程说明 |

分类以代码承担的主责任为准，不以扩展名机械判断。一个资产只保留一个正式代码源，由其他位置调用，不复制多份。

## 数据工程规则

AIONE数据库建设默认遵循：

`业务语义 → 标准对象 → 标准字段 → 对象关系 → 事件/证据 → Schema → API`

页面结构变化不得驱动数据库随意变化；一份事实只保留一个正式来源。数据库迁移必须可追溯、默认增量、禁止把真实生产数据当作测试数据覆盖。

## 安全边界

严禁提交密码、Token、API Key、私钥、真实 `.env`、数据库凭据、本地缓存、日志和未审核的 `inbox` 内容。配置结构只提交 `.env.example` 等无秘密模板。

## V1.8.1 Windows launcher hotfix

If `START_AI_SECRETARY_PREVIEW.cmd` reports that `npm` is not recognized, run `SETUP_NODE_LTS.cmd` once. V1.8.1 now auto-detects standard Node.js install locations and distinguishes a missing Windows prerequisite from an AIONE backend error.

## V1.9.12 Windows launcher hotfix

If the previous one-click verifier printed errors such as `EnableExtensions is not recognized`, the failure happened in Windows CMD parsing before the AI Backend was verified. V1.9.12 removes that ambiguity:

- `.cmd` launchers are ASCII with Windows CRLF line endings.
- Complex startup / verification logic lives in UTF-8 BOM PowerShell scripts.
- `.gitattributes` and `.editorconfig` explicitly preserve CRLF for Windows launchers.
- The existing AI endpoints remain unchanged: `/status`, `/execute`, `/confirm`.

Use `START_MIWA_AI_RUNTIME_AND_VERIFY.cmd` as the primary one-click verification entry.

## V1.9.13 Model Provider Layer

- `AIONE_AI_MODE=preview` keeps deterministic plumbing verification.
- `AIONE_AI_MODE=live` delegates through `AIONE_AI_PROVIDER`; first live provider is `openai`.
- Use `START_MIWA_AI_REAL_MODEL.cmd` for local real-model validation. The API key is entered hidden and kept in Backend process memory only.
- Current selection-workbench metrics, stages and opportunity summaries are exposed through `get_current_page_business_context`.
- Production deployment must use Secret Manager for provider secrets.


## V1.9.14 Windows real-model launcher diagnostic hotfix

- `START_MIWA_AI_REAL_MODEL.cmd` now remains open if the Backend exits, so the real error is visible.
- The launcher starts `node server.js` directly after dependencies are present, reducing one extra npm process layer.
- The console explicitly marks the window that must remain open while using 美和AI.
- No changes to Sidebar, Aside, Main, AI UI, Tool Layer, or `/status` → `/execute` → `/confirm`.


## V1.9.15 Human-confirm write fallback

- Live OpenAI model mode no longer implies that a local database must also be configured.
- Confirmation still prefers the formal `work_items` database when database configuration is present.
- Local real-model testing enables `AIONE_ALLOW_LOCAL_WRITE_FALLBACK=true`; if no database is configured, the confirmed work item is written into AIONE's local Collaboration Store and becomes visible to Work Home.
- The UI explicitly reports `本地AIONE已写入` / `当前未同步正式数据库`; it never reports a local fallback as a formal database success.
- Production defaults remain database-only and require a real authenticated human actor.

## V1.9.16 Proposal Bridge

- Explicit work-item creation intent now materializes a structured proposal in the same AI turn.
- Pending proposals receive Backend ids and `waiting_confirmation` state.
- Proposal confirmation resolves the Backend-staged proposal before write execution.
- Explicit natural-language confirmation can execute the latest pending proposal for the same actor/office.
- Assistant output now uses safe Markdown-lite rendering rather than displaying raw `###` / `**` markers.


## V1.9.18 1688 Source API Bridge

- Selection records can send a real 1688 product URL to `POST /api/v1/integrations/1688/product-by-url`.
- Backend extracts the offer ID, signs the configured 1688 Open Platform product-detail request, normalizes returned product facts, and never fabricates missing fields.
- AppKey/AppSecret and tokens stay backend-only; the local Windows launcher can hold AppKey/AppSecret in process memory for testing.
- Auto-fill only writes deterministic facts and avoids overwriting existing human-entered values.
- The same source facts are automatically included in the current MIWA AI Context; stale facts are rejected when the source URL changes.
- Candidate status remains until a real authorized 1688 account completes the first live API response.


## V1.9.19 1688 OAuth Bridge

- The real V1.9.18 test confirmed AppKey/AppSecret are loaded and the remaining blocker is 1688 account OAuth.
- Selection auto-fill now switches to `授权1688` only when account authorization is actually required.
- Backend adds `/oauth/start` and `/oauth/callback`, exchanges Authorization Code server-side, caches Access/Refresh Tokens only in the current process, and reuses the refresh token after access-token expiry.
- Default local callback is `http://127.0.0.1:8080/api/v1/integrations/1688/oauth/callback`; it must match the callback/redirect URI allowed by the 1688 application.
- OAuth state is random and validated. AppSecret and tokens never enter the frontend.
- After authorization, normal employee workflow returns to `粘贴链接 → 读取并自动填充`; OAuth is infrastructure setup, not a daily business step.


## V1.9.20 1688 Permanent Token Direct Bridge

- Real 1688 developer-guide evidence confirmed the application is enterprise self-use / multi-user authorization and already has a permanent authorized Access Token.
- `START_MIWA_AI_REAL_MODEL.ps1` now asks for AppKey, AppSecret, and Access Token separately; both secrets are hidden and kept in Backend process memory only.
- Normal runtime forces `ALIBABA_1688_TOKEN_MODE=static`; the selection page no longer converts missing-token errors into an employee-facing OAuth workflow.
- Daily employee path remains: paste 1688 URL -> read and auto-fill -> MIWA AI analysis.
- Candidate remains pending the first live product-detail API response with the real three credentials.
