# AIONE V1.1.0｜验证记录

**日期：** 2026-08-22  
**验证对象：** V1.0.28 Global Shell Single Source → V1.1.0 二级业务母版与全局参数升级候选

## 已执行自动检查

### 1. Global Shell / 路由 / 母版结构

执行：

`node tests/verify-global-shell.mjs`

结果：通过。

验证范围包括：

- Global Shell没有被业务页面重复实现
- Header V1.1集团级入口存在
- 店铺之家 / 应用之家第二层入口已合并
- 选品 / 测样独立工作台资产保留
- 6个业务页面共用同一母版
- 美和9要素为9/9
- 旧 Store Home独立初始化器不再使用

### 2. 测样驾驶舱

执行：

`node tests/verify-sampling-dashboard.mjs`

结果：通过。

### 3. 二级业务母版专项验证

执行：

`node tests/verify-business-template-v1.1.mjs`

结果：通过。

验证范围包括：

- 客户 / 店铺 / 应用 / 收入 / 支出 / 现金支出共用统一母版
- 客户流程严格使用已确认流程
- 未验证流程没有错误标记为正式锁定
- 固定对象工具栏完整
- 概览 / 新建通用动作职责
- 新建对象标准事件与普通业务通知
- AI秘书 Aside 接入
- 系统参数关键控制项
- 选品 / 测样对齐统一对象动作入口

### 4. HTML / 静态结构验证

执行：

`python3 /tmp/aione_validate.py`

结果：

- HTML files checked: 30
- Core checks: 8
- STATIC VALIDATION PASSED

### 5. ES Module导入检查

关键模块逐一使用 Node ESM 导入，均通过：

- business-page-definitions
- system-config
- route-registry
- business-object-store
- notification-store
- miwa-nine-elements
- system-settings
- business-page-template
- notifications
- selection-workbench
- sampling-workbench

### 6. 内部Hash路由扫描

扫描 `components / pages / js` 中的字面量 `#/...` 入口并对照唯一 Route Registry。

结果：61个代码文件扫描通过，无未登记字面量入口。

### 7. CSS结构检查

对当前 `css/` 全目录执行大括号平衡检查。

结果：通过。

## 安全与数据真实性检查

- 未发现硬编码数据库密码；后端数据库密码继续从 `process.env.DB_PASS` 读取。
- 新增客户、收入、支出页面不使用虚假经营数字冒充正式成果。
- 店铺/应用种子只来自当前已有配置；未知负责人、账号、连接状态保持“待确认”。
- 未验证业务流程明确标注“验证中”。

## 尚未完成的验证

当前执行环境中的 headless Chromium 无法稳定完成自动页面截图，因此本轮**没有把自动视觉截图冒充为已通过**。

本地打开后建议重点人工确认：

1. Header第一层入口是否在当前屏幕宽度下保持可用；
2. `店铺之家 › / 应用之家 ›` 第二层是否符合预期；
3. 客户 / 店铺 / 应用 / 收入 / 支出 / 现金支出切换时是否明显保持同一页面语言；
4. 业务类型横向滑动是否顺手；
5. 卡片/列表切换、导入/导出、新建对象是否正常；
6. 新建应用后是否形成普通业务通知；
7. 重要通知是否只显示于重要通知槽位；
8. 系统参数新建/导入/导出权限开关是否即时影响页面；
9. 选品和测样原有真实业务流程是否无回归。

## 结论

代码级结构、路由、模块导入、核心静态约束和自动测试已通过，可以作为共享内测候选继续本地人工验收。真实数据库、AI秘书写入、跨工作台收入/支出归集、定时巡检和生产级权限仍属于后续真实接入阶段。
