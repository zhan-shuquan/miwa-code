# AIONE Current Tests

本目录只保留当前仍有工程价值的验证脚本。历史追溯由 Git commit / tag 负责，不再在当前工作树维护 `tests/legacy/` 副本。

## 当前验证原则

1. 路由、Global Shell、Header、Sidebar / Aside、字段、数据层、AI、外部集成与核心业务闭环应有可重复验证脚本。
2. 已废止的 UI 规则、旧母版和旧流程不应继续作为发布标准。
3. 版本号仍保留在部分脚本文件名中，用于识别其产生阶段；是否保留以“当前是否仍验证有效能力”为准，而不是以版本号新旧判断。
4. UI Foundation V2 完成后，将继续收敛脚本命名，并增加母版守门测试，防止页面绕开共享组件与 Design Tokens。

## 当前核心验证入口

### 平台与页面基础

```bash
node tests/verify-route-integrity-v1.3.mjs
node tests/verify-level2-foundation-v1.4.mjs
node tests/verify-global-header-context-v1.9.4.mjs
node tests/verify-sidebar-aside-lock-v1.9.5.mjs
```

### 业务与对象基础

```bash
node tests/verify-selection-legacy-migration-v1.5.mjs
node tests/verify-sampling-dashboard.mjs
node tests/verify-field-standardization-v1.6.mjs
node tests/verify-database-backend-v1.7.mjs
node tests/verify-cloud-data-runtime-v1.9.mjs
```

### 美和AI与执行闭环

```bash
node tests/verify-miwa-ai-layer-v1.9.6.mjs
node tests/verify-miwa-ai-render-v1.9.7.mjs
node tests/verify-miwa-ai-entry-v1.9.8.mjs
node tests/verify-miwa-ai-runtime-chain-v1.9.11.mjs
node tests/verify-model-provider-v1.9.13.mjs
node tests/verify-miwa-ai-proposal-bridge-v1.9.16.mjs
node tests/verify-miwa-ai-context-router-v1.9.17.mjs
node tests/verify-miwa-ai-architecture-proposal-execution-v1.9.29.mjs
```

### 集成、云与工作之家

其余 `verify-*.mjs` 保留用于当前 1688、Google Drive、Cloud、内容发布与工作之家等能力的专项回归。后续在确认功能唯一入口后，再删除被新测试完全覆盖的旧脚本。

## 清理边界

当前清理阶段不因为脚本名称包含 `legacy`、旧版本号或历史术语就自动删除现行业务验证；只有已经明确失效、被迁移到历史追溯层或被当前测试完全替代的脚本才删除。
