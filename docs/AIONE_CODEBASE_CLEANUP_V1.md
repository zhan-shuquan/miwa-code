# AIONE Codebase Cleanup V1

状态：执行中（分支 `chore/aione-codebase-cleanup-v1`）

## 目标

将当前 AIONE 工作树从“历史开发工程”收敛为“未来正式工程”。Git 负责保存历史；当前工作树只保留仍然有效、仍在运行或仍有长期维护价值的代码、规范、数据与测试。

## 核心原则

1. 保护真实业务事实、已验证闭环、数据、规则与有效能力。
2. 不以文件大小作为删除依据，以“是否仍在运行、是否重复、是否已被替代”为依据。
3. 历史 Baseline、历史 Validation、Recovery 副本和旧升级说明不继续占用当前工作树；历史由 Git commit/tag 保存。
4. 数据库 migration 不因名称含 legacy 而删除；迁移链属于可追溯工程资产。
5. 当前业务页面即使结构不理想，只要仍承载真实能力，就先保留并标记为后续迁移对象，不在清理阶段粗暴删除。
6. UI/母版重构放在清理完成后的 `feat/aione-ui-foundation-v2` 分支执行。

## 第一阶段删除范围

- 根目录 V1.9.32–V1.9.39 Windows 升级指南。
- `apps/systems/aione/recovery/` 全部恢复副本。
- `apps/systems/aione/tests/legacy/` 历史测试。
- `apps/systems/aione/docs/BASELINE_*` 历史阶段基线文档。
- `apps/systems/aione/docs/VALIDATION_V*` 历史版本验证报告；保留 `VALIDATION.md` 作为当前验证入口。
- 已被后续架构规范取代的早期 Global Shell / Header / Sidebar 合并与预览说明。
- 旧版导航规范，仅保留当前最高版本。

## 第一阶段明确保留

- `apps/systems/aione/components/`、`js/`、`css/`、`pages/` 当前运行代码。
- Header / Global Shell 单一来源实现。
- `universal-workspace.js`、`object-presenter.js`、`object-view-controller.js` 等现有共享底座。
- 商品机会详情当前大页面，即使体积较大；后续迁移到 Object Workspace Master 后再删除旧实现。
- `backend/`、`contracts/`、`data-code/migrations/`、`infra/`。
- `FIELD_CATALOG_V1.0.json` 等当前字段资产，除非后续确认可稳定由源代码生成并在 CI 中重建。
- 现行非 legacy 测试，待 UI Foundation V2 后再做测试套件收敛。

## 后续阶段

1. 检查无引用 CSS/JS/HTML 与重复资源。
2. 识别重复模板、重复配置、重复样式并合并为唯一来源。
3. 建立 `Object List Master` 与 `Object Workspace Master`。
4. 新增母版守门测试，禁止同类页面绕开共享底座。
5. 子域名/本地预览验收后再合并 `main`。
