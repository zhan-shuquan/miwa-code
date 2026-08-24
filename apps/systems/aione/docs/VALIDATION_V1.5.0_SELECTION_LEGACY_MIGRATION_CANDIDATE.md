# AIONE V1.5.0｜选品成熟业务迁移验证记录

状态：**候选验证已完成；等待Windows浏览器人工验收**

日期：2026-08-22

## 已通过的自动/静态验证

### 1. 全部活动JS语法

`JS_SYNTAX_OK 50 files`

全部活动 `js/**/*.js` 已通过 `node --check`。

### 2. V1.4二级页面基础架构回归

`V1.4 first-three-stage foundation validation passed.`

说明：选品迁移没有破坏前3阶段已经形成的唯一空母版、Recipe与基础组件体系。

### 3. V1.5选品成熟业务迁移专项

`V1.5 selection legacy migration validation passed.`

专项检查包括：
- 选品根页为薄入口；
- 调用唯一Level-2 Empty Base；
- 使用 `standard-business` Recipe；
- 共享TypeRail / Flow / CoreMetrics / UniversalWorkspace / ObjectPresenter / Miwa9Elements；
- 不再调用旧ObjectViewController；
- Selection Adapter读取原 `preview-opportunities`；
- 三类选品与五段主流程保留；
- 批量导入与详情路由保留；
- Universal Workspace支持多筛选、排序、分页；
- rich-media对象卡片由共享Object Presenter提供；
- 活动selection CSS不再携带旧页面/卡片/列表结构样式；
- 旧实现仅保存在recovery。

### 4. 路由与Global Shell

`V1.3 route integrity passed: 105 internal route references checked; Global Shell single-source verified.`

说明：内部入口完整；Header / Sidebar / Aside / Footer继续保持单一来源。

### 5. 测样历史回归

`Sampling dashboard validation passed.`

说明：共享组件增强未破坏当前测样工作台已有验证项。

## 浏览器自动烟雾测试状态

尝试在当前容器使用 Chromium Headless 加载：

`http://127.0.0.1:8008/index.html#/selection`

Chromium在当前运行环境因DBus/zygote相关问题超时（exit 124），未返回可用DOM。此项属于运行环境限制，**不计为通过，也不判定为代码失败**。

因此本候选版不冒充“视觉/运行时浏览器已自动通过”。

## 必须由用户完成的Windows浏览器验收

请使用Windows + Live Server打开 `#/selection`，重点只验迁移，不讨论页面内容优化：

1. 页面正常进入选品工作台，无系统错误；
2. 选品类型正常显示三类；
3. 五段选品业务流程正常显示且可筛选；
4. 核心指标有真实数据；
5. 商品机会卡片正常显示；
6. 卡片/列表互斥；
7. 3/4/6列切换正常；
8. 搜索、选品类型、状态、负责人、时间、流程节点筛选正常；
9. 排序正常；
10. 每页12条分页正常；
11. 新建商品机会进入原详情链路；
12. 编辑既有机会进入原详情链路；
13. 批量导入入口与原预演数据层正常；
14. 美和9要素完整显示；
15. 页面不存在旧母版造成的重复Header/重复卡片/无意义大块空白；
16. 原详情中的数据录入、成本试算、智能定价、按需测样、上架判断没有被迁移工程破坏。

## 结论

当前代码级与架构级验证结果支持：**第4阶段迁移已形成可供人工浏览器验收的V1.5.0候选版。**

在用户完成上述浏览器验证之前，状态保持 `CANDIDATE / 验证中`，不升级为“正式锁定”。
