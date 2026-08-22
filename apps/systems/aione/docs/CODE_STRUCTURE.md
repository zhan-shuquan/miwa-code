# 美和AIONE代码结构说明｜V1.2.0

当前原则：**一个正式代码源，多处调用；母版负责结构，组件负责通用交互，配置负责真实差异。**

```text
apps/systems/aione/
├─ index.html                          # AIONE唯一前端入口 / Global Shell装载点
├─ assets/
│  └─ brand/                          # 美和正式品牌资产
├─ components/
│  └─ shell/
│     ├─ header/                      # 唯一Global Header
│     ├─ primary-navigation/          # 唯一Sidebar / 移动导航
│     ├─ aside/                       # 唯一上下文Aside / AI秘书存在位
│     ├─ footer/                      # 唯一Footer
│     └─ settings/                    # 全局系统参数UI
├─ css/
│  ├─ miwa-system.css                 # 公共CSS总入口
│  ├─ foundation/                     # Token与基础样式
│  ├─ shell/                          # Global Shell样式
│  ├─ components/
│  │  └─ level2-components.css        # 二级头部、横滑、核心指标、工具栏、卡片、列表、Disclosure等
│  └─ pages/
│     ├─ business-page-template.css   # 美和业务母版样式
│     ├─ content-page-template.css    # 美和内容母版样式
│     ├─ notifications.css            # 通知中心/详情的必要差异
│     └─ ...                          # 只有真实特殊页面才保留专属样式
├─ js/
│  ├─ miwa-system.js                  # 系统启动与唯一内部路由装载
│  ├─ config/
│  │  ├─ route-registry.js            # 全平台内部入口唯一清单
│  │  ├─ system-config.js             # Header / 店铺 / 应用等系统配置
│  │  ├─ business-navigation.js       # 事业 / 工作台导航配置
│  │  ├─ business-page-definitions.js # 业务母版对象配置
│  │  ├─ business-page-definitions-extra.js
│  │  └─ content-page-definitions.js  # 美和之家 / 知识之家内容配置
│  ├─ components/
│  │  ├─ miwa-nine-elements.js        # 美和9要素唯一组件
│  │  └─ horizontal-rail.js           # 类型/指标/辅助/相关内容统一横向轨道行为
│  ├─ data/
│  │  ├─ business-object-store.js     # 二级业务对象存储层（当前内测LocalStorage）
│  │  ├─ content-object-store.js      # 内容对象存储层（当前内测LocalStorage）
│  │  └─ notification-store.js        # 通知统一数据层
│  ├─ pages/
│  │  ├─ business-page-template.js    # 美和业务母版唯一行为
│  │  ├─ content-page-template.js     # 美和内容母版唯一行为
│  │  ├─ notifications.js             # 通知中心
│  │  ├─ notification-detail.js       # 通知详情 / 已读 / 确认
│  │  ├─ selection-workbench.js       # 选品真实业务逻辑
│  │  └─ sampling-workbench.js        # 测样真实业务逻辑
│  └─ shell/
│     ├─ header.js
│     ├─ primary-navigation.js
│     ├─ aside.js
│     ├─ footer.js
│     └─ system-settings.js           # 系统参数单一运行层
├─ pages/
│  ├─ business-home/
│  │  └─ template.html                # 业务/管理型二级页面唯一母版
│  ├─ content-home/
│  │  └─ template.html                # 美和/知识内容管理二级页面唯一母版
│  ├─ notifications/
│  │  ├─ home.html                    # 内测P0通知中心
│  │  └─ detail.html                  # 必要的通知详情例外
│  ├─ selection-workbench/            # 已验证选品真实业务
│  ├─ sampling-workbench/             # 已验证测样真实业务
│  ├─ today-work/                     # 特殊主视图，继承二级页面语言
│  ├─ calendar/                       # 特殊日历主视图
│  └─ analysis-center/                # 特殊分析主视图
├─ tests/                              # 路由、Shell、母版、工作台专项验证
├─ docs/                               # 随代码共同演进的基线/验证/架构说明
└─ recovery/                           # 历史恢复证据；不参与正式运行加载
```

## 一、继承关系

### Level 1｜Global Shell

`Header + Sidebar + Main + Aside + Footer`

全系统唯一。任何业务页、内容页、通知详情页不得复制第二套。

### Level 2｜统一页面语言

共享：

- `miwa-level2-head`
- Horizontal Rail
- Core Metrics
- Object Toolbar
- Object Card
- Object List
- Disclosure / Accordion
- AI Aside

### Level 2A｜美和业务母版

`页面头部 → 对象类型横滑 → 管理/业务流程 → 核心指标横滑 → 对象管理 → 辅助机动区横滑 → 美和9要素`

业务差异只放在 `business-page-definitions*.js`。

### Level 2B｜美和内容母版

`内容头部 → 内容类型横滑 → 核心指标 → 内容对象管理 → 相关内容 → AI辅助`

内容差异只放在 `content-page-definitions.js`。

### 特殊二级页面

今日工作 / 日历 / 分析中心继续继承 Level-2 页面语言，但 Main 使用最适合其对象的真实视图，不机械套卡片/列表。

## 二、通用组件规则

### 横向轨道

同一底层轨道复用到：

- 类型：一屏重点3项
- 核心指标：一屏最多6项
- 辅助机动区：单行、自适应
- 相关内容：单行、自适应

新增项目不改变页面基础高度。

### 卡片 / 列表

- 同一对象数据源。
- 标准展示字段常显。
- 不用“展开更多”隐藏标准字段。
- 详细低频字段进入详情页。

### Disclosure / Accordion

只用于参数、依据、历史、规则、说明、附件、审计等次级区块。

## 三、美和9要素

唯一组件：`js/components/miwa-nine-elements.js`

`目标｜人｜物｜事｜平台｜时间｜钱｜信息｜结果`

它是业务流程与各种管理的底层完整性检查框架，不允许单页维护第二套。

## 四、“之家”的工程含义

“之家”表示对一类核心对象、能力或资源长期统一管理：

- 美和之家：公司
- 知识之家：知识
- 共享之家：能力和客观共享资源
- 客户之家：客户
- 人才之家：内部人才
- 商品之家：商品
- 店铺之家：店铺
- 应用之家：应用
- AI之家：AI能力
- 收入之家：收入事实
- 支出之家：支出事实

方法论、标准、制度、SOP 都是知识类型，不建立独立“之家”。

## 五、系统参数

UI：`components/shell/settings/global-settings.html`  
运行层：`js/shell/system-settings.js`

集中控制：

- 系统基础
- 组织与权限
- 分类与字典
- 业务规则
- 金额与价格
- 收入与支出
- 店铺与应用
- 导入与导出
- 通知与任务
- AI与自动化
- 版本与审计

“重点类型一屏3项”属于V1.2.0统一UI标准，不作为业务人员随意改变的普通参数。

## 六、代码新增判断

新增页面或模块前依次判断：

1. Global Shell是否已有对应职责？
2. 是否可以继承业务母版或内容母版？
3. 现有横滑 / 流程 / 指标 / 工具栏 / 卡片 / 列表 / Disclosure / Aside / 美和9要素是否已经能表达？
4. 是否只需增加配置、字段、流程、规则或数据？
5. 只有真实需求证明现有体系无法合理承载时，才增加新组件或新页面结构。

目标：**页面越多，共享代码越多；业务差异越清楚，页面逻辑越少。**
