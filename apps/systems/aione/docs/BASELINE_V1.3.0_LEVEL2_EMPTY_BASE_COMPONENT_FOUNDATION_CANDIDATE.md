# AIONE V1.3.0｜唯一二级空母版与组件基础架构｜候选基线

**正式系统名称：** 美和AIONE一体化工作平台  
**版本状态：** 验证中 / 候选基线，尚未正式锁定  
**升级基线：** V1.2.2 Object View Controller Hotfix  
**首个真实验证页面：** 美和之家  
**日期：** 2026-08-22

## 1. 本版本目的

本版本不继续扩展更多业务页面，而是先解决AIONE二级页面长期反复修改的根因：页面结构、母版和组件没有真正分离。

正式方向收敛为：

`Global Shell → Level-2 Empty Base → Template Recipe → Standard Components → Page Config / Fields / Data → API / Database`

核心目标是让以后新增页面以“调用母版和组件”为主，而不是复制已有页面代码。

## 2. 唯一 Level-2 Empty Base

新增唯一空母版：

- `layouts/level2-empty-base.html`
- `js/templates/level2-empty-base.js`

空母版本身不包含客户、商品、选品、美和之家、通知等任何业务内容，只提供稳定挂载位：

1. `page-header`
2. `main`
3. `nine-elements`
4. `portal`

并保留页面上下文与未来工作证据接口：

- routeId
- recipeId
- pageKind
- evidenceScope
- mountedAt
- `aione:level2-mounted` 平台事件

未调用的组件不生成实际业务区块，不应留下无意义空白区域。

## 3. Template Registry

当前阶段只保留两个核心Recipe：

### 3.1 standard-business｜标准业务母版

目标结构：

`PageHeader → Type/Scope Rail（按需） → Flow（按需） → CoreMetrics → Universal Workspace → AuxiliaryRail（按需） → MIWA9Elements`

适用目标包括工作台、客户/人才/店铺/应用/收入/支出，以及后续验证后的今日工作、美和日历、分析中心、通知中心等。

### 3.2 content｜内容母版

目标结构：

`PageHeader → Content Category Rail → CoreMetrics → Universal Workspace → Related Content → MIWA9Elements`

首批适用：

- 美和之家
- 知识之家

当前不新增今日工作母版、日历母版、分析母版、通知母版；优先验证标准业务母版能否承载真实差异。

## 4. 页面入口变薄

以下页面文件现在只保留Recipe入口，不再复制组件HTML：

- `pages/business-home/template.html`
- `pages/content-home/template.html`

页面逻辑通过运行时挂载空母版，并调用共享组件。

## 5. Universal Workspace

统一多视图工作区升级为标准组件：

- 搜索
- 筛选
- **排序**
- 导入
- 导出
- 视图切换
- 重置搜索/筛选/排序条件
- 结果数量
- 用户视图偏好（当前先使用localStorage）

### 5.1 卡片密度

卡片视图固定支持：

- 3列（默认）
- 4列
- 6列

改变列数只改变布局密度，不改变标准字段完整性。

### 5.2 View Registry

当前注册可扩展View类型：

- card
- list
- table
- kanban
- calendar
- gantt
- gallery
- form
- chart

本版本完整实现的通用对象展示仍以 card / list(table) 为主；其他View先完成统一注册接口，后续在真实页面验证时逐项补充渲染器，不冒充已完成。

### 5.3 标准状态

统一Workspace已预留并实现：

- loading
- empty
- no-results
- error
- forbidden

用于避免以后各页面重复设计基础IT状态。

## 6. 标准对象Presenter

新增：

- `js/components/object-presenter.js`

负责共享：

- Object Card
- Object List

同一份对象数据根据View展示，不再维护卡片/列表两份数据。

## 7. 美和9要素

唯一组件：

`js/components/miwa-nine-elements.js`

固定顺序正式保持：

**目标｜人｜物｜事｜平台｜时间｜钱｜信息｜结果**

组件顺序不得根据页面调整；解释、分析和讨论时可以根据当前重点从时间、钱、结果等任一要素切入。

新增AIONE内部精准知识路由：

- “美和方法论” → 知识之家对应正式知识
- 目标/人/物/事/平台/时间/钱/信息/结果 → `KNOW-MIWA-9 + anchor`

知识正文不复制到每个页面。

## 8. 美和之家作为第一个验证页面

美和之家已经改为：

`Content Thin Entry → Content Recipe → Level-2 Empty Base → Shared Components`

并正式调用：

- Shared PageHeader
- Content Type Rail
- Shared CoreMetrics
- Universal Workspace
- Shared Object Card/List Presenter
- Related Content Rail
- MIWA9Elements

因此本版本发布后的首要人工验证不是继续增加页面，而是先打开美和之家确认这条调用链真实稳定。

## 9. Header与顶部信息带

### 9.1 通知入口

桌面Header统一只保留一个“通知中心”图标入口，并放在“今日工作”左侧。重要通知与系统通知后续都在通知中心内部按类型管理，不在Header制造两个相邻入口。

### 9.2 顶部信息带

收敛为三个固定区域：

**今日印象｜日程｜通知**

其中：

- 删除“节气”“星座”文字标签，只保留实际内容；
- 日程区域用于显示用户明确设置的“重要日程”；
- 通知区域显示当前需要突出展示的通知；
- 保持单行、轻量、低干扰。

Header已提供：

- `setImportantSchedule(schedule)`
- `clearImportantSchedule()`

点击顶部重要日程进入：

`美和日历 → 重要日程筛选`

**注意：** “设为重要日程”字段、提醒规则及日历页面完整数据逻辑属于后续真实业务字段/后台阶段，本版本只完成稳定入口与运行时接口，不冒充数据库能力已经完成。

## 10. 工作证据与时间接口

本版本没有开发完整Time Tracker算法，但空母版已保留平台级页面挂载证据接口，后续可以在不修改每个页面的前提下统一记录：

- 当前用户
- 页面/对象
- 开始时间
- 操作事件
- 事项
- 结果

未来由统一Work Evidence层关联人才之家本人，不在人才之家重复保存第二份时间事实。

## 11. 当前明确未完成

以下内容不属于本候选基线的“已完成”范围：

1. 数据库Schema正式锁定；
2. 后端API正式接入本轮统一组件；
3. 完整工作时间算法；
4. 今日工作迁移到standard-business Recipe；
5. 美和日历迁移到standard-business Recipe；
6. 分析中心迁移到standard-business Recipe；
7. 通知中心迁移到standard-business Recipe；
8. 选品工作台反向迁移到新standard-business Recipe；
9. kanban/calendar/gantt/gallery/form/chart完整View渲染器；
10. 三级内容详情母版。

这些项目应在空母版和美和之家调用验证通过后逐项执行。

## 12. 当前开发纪律

1. 新增二级页面默认不得申请新母版；
2. 先验证standard-business或content能否承载；
3. 页面不得复制标准组件HTML/CSS/交互逻辑；
4. 只有真正新的通用能力才新增组件；
5. 只有真实验证证明现有Recipe不能承载，才新增Recipe；
6. 能由系统自动取得的人、时间、平台、操作等数据，后续不得要求员工重复录入。

## 13. 验收状态

当前状态：**代码结构候选已完成，等待美和之家浏览器人工验收后再决定是否正式锁定。**
