# AIONE V1.9.9｜美和AI Hard Entry Hotfix Candidate

状态：验证中。

## 本次只解决
Header「美和AI」在Windows + Live Server环境中可见但点击无响应的问题。

## 关键修复
1. 在 `index.html` 增加独立 Hard Entry Bridge。它不依赖 `miwa-ai-layer.js`、Route上下文、AI Client或Backend初始化成功，点击后先直接解除 `#miwa-ai-layer[hidden]`。
2. `openLayer()` 改为“先打开，后增强”，任何增强失败都不得让入口表现为无反应。
3. 对嵌套 ES Module 与 AI CSS 使用新的版本URL，避免浏览器继续复用 V1.9.6/1.9.7/1.9.8 缓存。
4. 不修改Sidebar、Aside、Main及周六已接通的AI Backend / Tool Layer。

## 人工验收顺序
- 强制刷新或新开Live Server页面。
- 点击Header「美和AI」：必须立即出现Layer。
- 再验证推荐能力、输入框、AI工作区与AI办公室。
- 最后验证 `/status`、`/execute`、`/confirm` 原执行链。
