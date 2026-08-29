# 美和AIONE一体化工作平台

`apps/systems/aione/` 是 AIONE 当前正式应用代码目录。当前工作树只描述现行架构和运行边界；历史候选版本、阶段验证和恢复记录由 Git commit / tag 保存。

## 项目定位

AIONE 是美和真实业务的一体化工作平台，也是美和 AI 原生经营体系的首个真实验证项目。工程目标不是堆功能，而是形成真实、清晰、稳定、可验证、可维护、可扩展、可交接的长期系统。

## 当前工程主线

```text
Global Shell
  ├─ Header
  ├─ Sidebar
  ├─ Main
  ├─ Contextual Aside
  └─ Footer

Main
  ├─ Shared Page Templates
  ├─ Shared Components
  ├─ Business/Object Config
  └─ Business Pages

Data / Backend
  ├─ Field Registry
  ├─ Object Model
  ├─ API Client / Contracts
  ├─ Database Migrations
  ├─ Business Events / Evidence
  └─ Integrations

AI Layer
  ├─ Context Router
  ├─ Capability Registry
  ├─ Model Provider
  ├─ Tool Layer
  └─ Proposal → Human Confirm → Execution
```

## 现行唯一来源

### Platform Shell

- Header HTML：`components/shell/header/`
- Header runtime：`js/shell/header.js`
- Header style：`css/shell/header.css`
- Sidebar / navigation：`components/shell/primary-navigation/` + `js/shell/primary-navigation.js`
- Aside：`components/shell/aside/` + `js/shell/aside.js`
- Footer：`components/shell/footer/` + `js/shell/footer.js`
- Platform context：`js/shell/platform-context.js`

页面不得复制以上 Shell 实现。

### Routing / Configuration

- 全平台内部路由：`js/config/route-registry.js`
- Sidebar 配置：`js/config/sidebar-registry.js`
- 系统配置：`js/config/system-config.js`
- 字段注册：`js/config/field-registry.js`
- 字段标准：`js/fields/`

同一个路由、字段、状态或系统级配置不得在页面内另建第二份事实源。

### UI Foundation

- Design Tokens：`css/foundation/tokens.css`
- 基础 CSS：`css/foundation/base.css`
- 共享组件：`js/components/`
- 页面模板：`js/pages/`、`js/templates/`
- Template Registry：`js/templates/template-registry.js`
- Universal Workspace：`js/components/universal-workspace.js`
- Object Presenter：`js/components/object-presenter.js`
- Object View Controller：`js/components/object-view-controller.js`

当前这些基础已经存在，但仍有部分成熟业务页面绕开共享底座。下一阶段 UI Foundation V2 的核心任务是把“可以复用”升级为“必须复用”。

### Data / Backend

- Backend：`backend/`
- API Contract：仓库根 `contracts/api/`
- Object Contract：仓库根 `contracts/data/`
- Database migrations：仓库根 `data-code/migrations/`
- Field-to-DB mapping：仓库根 `data-code/mappings/`

已执行 migration 属于不可重写历史链，即使名称带有 legacy 语义也不得因代码清理直接删除。

### AI

- Frontend AI capability/context：`js/ai/`
- AI shell layer：`js/shell/miwa-ai-layer.js`
- Backend AI services：`backend/src/ai/`
- AI routes / tools：`backend/src/routes/`、`backend/src/ai/tool-registry.js`

业务写入继续遵循：

`AI分析/建议 → Proposal → Human Confirm → Tool/Backend执行 → Evidence/Result`

确定性规则、计算和系统事实不交给模型重复猜测。

## 页面与对象开发规则

1. 新页面先判断属于哪一种现有模板，不先复制旧页面。
2. 新对象优先通过对象配置接入共享 List / Workspace，不新建一套对象 UI。
3. 页面业务差异优先进入 config / data adapter / field registry。
4. 颜色、间距、圆角、状态等视觉值优先来自 Design Tokens。
5. Header / Sidebar / Aside / Footer 由平台层负责，业务页面不得重新实现。
6. 已经承载真实业务能力的大型旧页面先迁移能力，再删除旧实现；不得为了代码漂亮而丢失业务闭环。

## 当前重点迁移对象

`pages/selection-workbench/record-detail/index.html` 仍是大型独立商品机会详情实现，承载真实选品业务能力。它暂时保留，后续作为 Object Workspace Master 的首个真实迁移和验证对象。

目标不是重做商品机会业务，而是：

`保留业务能力 → 抽取共享对象能力 → 配置化商品机会差异 → 切换唯一母版 → 删除旧独立实现`

## 测试

当前测试说明：`tests/README.md`

清理后的测试原则：历史测试不作为文件副本长期保存；当前测试只验证仍然有效的架构、业务能力、数据和执行闭环。UI Foundation V2 将增加母版守门测试，阻止新页面绕开共享 Shell、Template、Component 和 Token。

## 云与本地运行

- Backend 本地说明：`backend/README.md`
- Google Cloud 运行：仓库根 `infra/gcp/cloud-shell/README.md`
- Vercel bridge：`api/aione-bridge.js`、`vercel.json`
- 本地 `.env` / secrets 不进入 Git；正式云端 secret 使用安全运行环境注入。

## 代码清理原则

当前清理规则见仓库根：`docs/AIONE_CODEBASE_CLEANUP_V1.md`

核心原则：Git 保存历史，当前工作树保存现在；保护真实业务和数据，删除重复实现、恢复副本、阶段报告和已废止标准；不以“文件大”作为删除理由，以“是否仍有唯一职责和运行价值”作为判断依据。
