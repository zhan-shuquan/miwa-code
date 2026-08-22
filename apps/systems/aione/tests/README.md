# AIONE tests

## 当前 V1.3 候选主动测试

- `verify-level2-empty-base-v1.3.mjs`：唯一二级空母版、两类Recipe、统一Workspace、搜索/筛选/排序/导入/导出/视图/3-4-6列、标准状态、美和9要素、通知/日程入口等结构验证。
- `verify-route-integrity-v1.3.mjs`：内部路由、Route页面存在性、Global Shell唯一来源验证。
- `verify-sampling-dashboard.mjs`：现有测样工作台基础回归。

## legacy/

旧V1.1/V1.2测试保留用于历史追溯。它们的断言基于“页面HTML静态包含组件结构”的旧架构，与V1.3“空母版 + Recipe + 运行时组件挂载”架构不兼容，因此不属于当前主动测试套件，不应直接作为V1.3验收结果。
