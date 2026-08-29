# 美和集团代码资产主仓库

本仓库是 MIWA Group 的正式代码资产主仓库。GitHub `main` 代表当前稳定开发基线；历史版本、阶段候选、恢复点和变更过程由 Git commit / tag 保存，不在当前工作树复制历史副本。

## 当前核心项目

- 美和AIONE一体化工作平台：`apps/systems/aione/`
- AIONE 技术说明：`apps/systems/aione/README.md`
- AIONE 当前清理与工程治理：`docs/AIONE_CODEBASE_CLEANUP_V1.md`

## 仓库定位

- 本地正式根目录：`D:\miwa\code\`
- GitHub：MIWA Group Code Assets｜美和集团代码资产主仓库
- 默认稳定分支：`main`
- 功能开发、重构、清理默认在独立 branch 完成，验证后再合并 `main`

与代码直接相关、需要和代码共同演进的架构及工程说明进入 `docs/`。业务知识正文不以聊天记录或版本副本作为正式来源；正式业务知识由 AIONE 知识体系管理。文件、图片、视频、模板及外部资料保留各自唯一正式来源，Repo 只保存代码需要直接依赖的资产或索引。

## 目录职责

| 目录 | 职责 |
| --- | --- |
| `inbox/` | 未审核代码临时入口，不是正式资产区 |
| `shared/` | 跨系统复用的基础能力与设计基础 |
| `shells/` | 跨应用共享 Shell 的预留边界 |
| `apps/` | 具体系统、电商和服务应用 |
| `contracts/` | 数据、API、事件契约 |
| `adapters/` | 平台、数据库、外部服务适配边界 |
| `data-code/` | Schema、migration、query、function、mapping、validation |
| `rules/` | 可确定执行的业务规则与判断逻辑 |
| `automation/` | 自动化执行流程 |
| `ai/` | 跨系统 AI / Agent / Skill / model orchestration 边界 |
| `config/` | 可安全版本化的正式配置 |
| `tools/` | 开发、检查、迁移和维护工具 |
| `tests/` | 跨项目测试资产 |
| `infra/` | 部署、环境和基础设施代码 |
| `docs/` | 随代码共同维护的当前架构与工程说明 |

目录按主责任划分，不按扩展名机械分类。预留目录不是第二套实现；真实能力一旦落地，只保留一个正式代码源。

## Single Source of Truth

长期执行以下规则：

1. 同一能力只保留一个正式实现，其他位置调用，不复制。
2. 历史代码不放 `recovery/`、`legacy-copy/`、ZIP 或版本副本；需要恢复时使用 Git。
3. 页面不得复制 Global Shell、Header、共享组件或标准母版源码。
4. Design Token、字段、路由、对象模型、API Contract 等必须各有唯一正式来源。
5. 能通过配置表达的业务差异，不复制组件或模板。
6. 当前工作树只保留仍在运行、仍需维护或具有长期工程价值的资产。

## 数据工程规则

AIONE 数据建设默认遵循：

`业务语义 → 标准对象 → 标准字段 → 对象关系 → 事件/证据 → Schema → API`

页面结构变化不得驱动数据库随意变化；一份事实只保留一个正式来源。数据库 migration 必须可追溯、增量执行，禁止重写已执行 migration，禁止用测试数据覆盖真实生产数据。

## 安全边界

严禁提交密码、Token、API Key、私钥、真实 `.env`、数据库凭据、本地缓存、日志和未审核的 `inbox` 内容。配置结构只提交 `.env.example` 等无秘密模板。

## 开发工作流

```text
main（稳定基线）
  ↓
feature / fix / chore branch
  ↓
代码修改 + 自动检查 + 真实预览
  ↓
验收
  ↓
merge main
```

原则：先冻结产品与工程边界，再修改代码；先复用底座，再新增实现；无法确认是否仍在使用的代码先查引用，不凭文件名直接删除。
