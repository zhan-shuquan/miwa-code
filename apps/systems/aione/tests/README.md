# AIONE Current Tests

当前正式候选验证脚本：

- `verify-level2-foundation-v1.4.mjs`：二级空母版、两大Recipe、工作之家/分析之家、Contextual Aside基础。
- `verify-selection-legacy-migration-v1.5.mjs`：选品成熟业务迁移到标准业务母版与共享组件。
- `verify-route-integrity-v1.3.mjs`：内部路由与Global Shell单一来源。
- `verify-sampling-dashboard.mjs`：测样工作台历史回归。

`legacy/` 中的旧版本测试只用于追溯，不作为当前发布阻断测试。

## V1.6字段标准化

运行：

`node tests/verify-field-standardization-v1.6.mjs`

检查Field Registry单一字段源、字段元数据、美和9要素映射、内容字段共用、选品历史storageKey兼容、系统审计字段与页面运行时标准字段调用。

## V1.7 第6阶段核心数据/后端

```bash
node tests/verify-database-backend-v1.7.mjs
```

验证核心对象模型、增量数据库迁移、9要素顺序、Backend API资源、Legacy选品边界、字段到DB映射与OpenAPI契约。


## V1.8 第7阶段AI办公室 / AI秘书（历史验证）

原V1.8验证已移动至 `tests/legacy/verify-ai-office-secretary-v1.8.mjs`。其中AI秘书常驻Aside属于已废止UI规则，仅用于历史追溯；AI Backend / Tool Layer资产继续保留。

## V1.9 Cloud Data Runtime

```bash
node tests/verify-cloud-data-runtime-v1.9.mjs
```

## V1.9.3 Header核心之家 + 共享资源快捷层

```bash
node tests/legacy/verify-global-header-context-v1.9.3.mjs
```

验证H1上下文与核心之家顺序、供应商之家、H2统一共享资源注册表、自动分组分隔、`headerHidden`隐藏能力、ERP/HR资源形态、共享资源页面及V1.1导航知识。
## V1.9.4 Smart Header Lock Candidate

```bash
node tests/verify-global-header-context-v1.9.4.mjs
```

Validates the fixed H1 context chain, core-home order including Store Home, overflow-aware H1/H2 rails, Quick Access-only H2 semantics, internal Shared Resource Registry boundary, More entry, direct shortcut active state, H4 important-signal labels, and the V1.2 Header knowledge baseline.


## V1.9.5 Sidebar + Aside Lock Candidate

```bash
node tests/verify-sidebar-aside-lock-v1.9.5.mjs
```

验证Universal Sidebar树形/手风琴母版、Quick Actions小型启动区、动态Sidebar Registry、Contextual Aside hidden/light/standard状态、AI从Aside脱离及旧Sidebar/Aside标准正式废止。

## V1.9.6 美和AI Independent Layer Candidate

```bash
node tests/verify-miwa-ai-layer-v1.9.6.mjs
```

验证Header全局工具顺序“全局搜索 → 美和AI → 通知 → 帮助 → 设置”、Desktop/Mobile美和AI入口、独立AI Layer Host、Drawer → AI工作区 → AI办公室升级路径、Route上下文能力推荐、Composer、现有AI Backend复用，以及AI不重新进入Aside。

## V1.9.7 美和AI Render Hotfix

运行：`node verify-miwa-ai-render-v1.9.7.mjs`

重点验证美和AI外壳使用稳定Flex结构、AI Client异常不导致白屏，并继续保留V1.9.6既有AI Backend执行入口。

## V1.9.8 美和AI Entry Bridge Hotfix

```bash
node tests/verify-miwa-ai-entry-v1.9.8.mjs
```

验证Header美和AI入口的全局事件委托、初始化失败可重试、Layer延迟挂载自动打开、Shell初始化隔离和V1.9.8缓存破除；原AI Backend接口保持不变。
