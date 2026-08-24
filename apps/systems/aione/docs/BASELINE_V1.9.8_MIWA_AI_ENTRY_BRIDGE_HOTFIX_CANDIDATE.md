# AIONE V1.9.8｜美和AI入口事件桥接 Hotfix Candidate

状态：Candidate  
日期：2026-08-24

## 问题
V1.9.7 在真实 Windows / Live Server 验证中出现“Header 美和AI按钮点击后无反应”。这说明静态结构测试不足以覆盖实际入口事件绑定时序。

## 修复原则
不重新接AI，不修改周六已经完成的 AI Backend / Tool Layer，不把AI放回Aside，只修复独立美和AI Layer的前端入口可靠性。

## 修复内容
1. Header美和AI入口改为document级事件委托桥接，Desktop/Mobile共用，并在capture阶段监听。
2. 事件桥在美和AI模块加载时立即安装，不再依赖 `startMiwaSystem()` 必须完整运行到某一初始化顺序。
3. `initialized=true` 只允许在AI Layer DOM完整验证成功后成立；一次瞬时失败不再造成永久失效。
4. 若用户点击时AI Layer组件仍未挂载，短时等待并在组件出现后自动打开。
5. Shell各区域初始化改为隔离保护；Sidebar/Aside等单一区域初始化异常不得阻断“美和AI”初始化。
6. 资产版本升级为 `20260824-v1.9.8-miwa-ai-entry-bridge-hotfix`，用于破除V1.9.7浏览器缓存。

## 不变内容
- Header顺序：全局搜索 → 美和AI → 通知 → 帮助 → 设置。
- AI独立于Header/Sidebar/Main/Aside/Footer五区职责。
- AI升级路径：美和AI → AI工作区 → AI办公室。
- 原 `/api/v1/ai-secretary/status`、`execute`、`confirm` 执行链保持不变。
