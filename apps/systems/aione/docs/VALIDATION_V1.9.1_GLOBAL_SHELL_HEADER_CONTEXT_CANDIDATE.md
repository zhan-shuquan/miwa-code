# AIONE V1.9.1｜Global Shell + Header上下文验证记录

**日期：2026-08-24**

**状态：静态结构、JS语法与自动回归验证通过；Windows浏览器人工视觉验收待执行。**

## 自动验证已通过

新增专项测试：

`tests/verify-global-header-context-v1.9.1.mjs`

验证内容包括：

- Global Shell主要区域仍为唯一活动挂载点；
- 桌面Header第一行顺序为公司 -> 事业 -> 人 -> 工作 -> 时间；
- 当前事业已成为Header一级上下文；
- 工作之家 / 美和日历分别登记为工作 / 时间上下文；
- 具体业务执行明确归属Sidebar；
- 平台共享入口顺序为分类之家 -> 商品之家 -> AI之家 -> 分析之家 -> 共享之家；
- 非核心之家不再堆叠于Header；
- 通知进入全局工具区，不打断上下文链；
- 活动Header不再出现“今日工作”“分析中心”；
- 节气 / 星座不再占用桌面Header；
- Sidebar事业状态不再自己维护第二套LocalStorage；
- 系统启动时初始化统一Platform Context。

## 回归测试结果

以下当前测试全部通过：

- verify-ai-office-secretary-v1.8.mjs
- verify-cloud-data-runtime-v1.9.mjs
- verify-database-backend-v1.7.mjs
- verify-field-standardization-v1.6.mjs
- verify-global-header-context-v1.9.1.mjs
- verify-level2-foundation-v1.4.mjs
- verify-route-integrity-v1.3.mjs
- verify-sampling-dashboard.mjs
- verify-selection-legacy-migration-v1.5.mjs

## 浏览器验证说明

当前容器内Chromium受组织运行策略限制，访问本地预览地址时直接显示“127.0.0.1 is blocked”，因此无法完成真实页面视觉截图；没有把错误页或静态推断冒充为人工视觉验收结果。

Windows端建议使用Live Server重点确认：

1. 1920px桌面第一行顺序与空间是否清楚；
2. 1366px桌面是否仍能完整使用且不产生不合理挤压；
3. 当前事业下拉切换美和跨境 / 美和批发是否同步Header与Sidebar；
4. 从具体工作台返回工作之家、再切换事业时上下文是否保持；
5. 手机端公司 -> 事业 -> 人以及工作之家 -> 美和日历是否清楚；
6. 通知、搜索、帮助、设置是否保持正常；
7. 选品、测样、AI办公室、Cloud Data Runtime回归功能是否无异常。

## 验收边界

本轮为第1阶段候选基线。人工视觉验收通过前，不进入第2阶段动态Sidebar / Aside工程，避免再次出现“页面先改、全局架构后改”的返工。
