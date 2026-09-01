# AIONE 商品之家 Product Freeze V1.0

Status: VALIDATING
Date: 2026-09-01
Scope: 商品之家信息架构、核心对象、页面骨架、数据库前置约束

## 1. Product Truth

商品之家是 AIONE 统一商品主数据与商品经营事实的业务之家。

商品之家不以现有旧页面为基线。现有 `product-home` 通用模板、旧目录、旧卡片结构与旧流程仅作为历史实现参考，不能反推最终产品定义。

商品之家 V1.0 从 Product Truth、Object Model、Navigation、Page Type、Database Contract 重新建设。

第一批真实住客为美和跨境的直发选品商品。

## 2. 一级目录

商品之家 V1.0 一级目录锁定为：

1. 概览
2. 商品中心
3. 分类中心
4. 品牌中心
5. 属性中心
6. 规格中心
7. 商品资料管理

原则：

- `概览` 是商品之家的经营入口页，不是独立业务对象。
- `Variant / SKU / Listing / 成本 / 定价 / 生命周期` 优先作为商品中心内部对象能力或 View，不在 V1.0 一级导航重复拆分。
- 不再使用旧目录中的 `商品档案 / 商品主数据 / 店铺商品映射 / 商品生命周期 / 商品经营核算` 作为一级导航基线。

## 3. 页面骨架

### 3.1 概览

用于回答：商品之家现在发生了什么。

V1.0 关注：

- 商品总数
- 新增商品
- 直发商品
- 常规商品
- 待完善主数据
- 待补图片/资料
- 待生成 Listing
- 已发布 Listing
- 异常商品
- 分类/品牌/属性/规格基础数据完整度

指标不得使用示例数字冒充真实结果。没有真实数据时显示 `待验证`。

### 3.2 商品中心

商品中心是商品之家的核心工作页。

默认列表粒度：Product。

进入单个 Product 后使用对象工作区，顶部横向按钮 / Tabs 作为同一对象的不同工作视图，避免把同一商品拆成多个页面。

建议 V1.0 横向工作视图：

- 基本信息
- 变体与 SKU
- 分类与品牌
- 属性与规格
- 成本与价格
- 商品资料
- 渠道 Listing
- 经营数据
- 时间线 / 操作记录

横向工作视图属于同一 Product Workspace，不生成第二套 Product 数据。

## 4. 核心对象模型

### 4.1 Product

Product = AIONE 商品主对象。

代表一个稳定的商品概念，是商品事实的根对象。

Product 不等于 Listing，不等于 SKU。

### 4.2 Variant

Variant = Product 的可区分变体组合。

典型维度：颜色、尺码、容量、款式等。

### 4.3 SKU

SKU = 可采购、库存、销售、履约的最小库存/交易单位。

关系：

`Product -> Variant -> SKU`

### 4.4 Listing

Listing = Product / Variant / SKU 在具体销售渠道中的销售实例。

例如：Rakuten、Amazon、独立站。

平台自己的父子商品关系、Variation Theme、店铺商品编号等均属于 Listing / Channel Mapping 层，不反向定义 AIONE Product Model。

### 4.5 Bundle / Kit

套装商品不能强行当作普通颜色/尺码 Variant。

V1.0 数据模型必须预留 Bundle / Kit 能力，用于表达：

- 3件套
- 5色5足套装
- 组合装
- 礼盒组合

Bundle 可由一个或多个 SKU 组成，并支持数量关系。

## 5. 父子商品治理

业务语言中可以使用“父商品 / 子商品”帮助理解，但数据库正式模型不采用模糊 `parent_product / child_product` 作为核心结构。

正式模型：

- 父商品概念 -> Product
- 子级变体 -> Variant
- 最小销售/库存单位 -> SKU
- 平台父子关系 -> Listing / Channel Mapping

这样避免 AIONE 被 Rakuten、Amazon 或其他渠道的父子商品规则绑死。

## 6. 分类中心

分类中心是 Product Master Data Foundation 的正式组成部分。

已在 2026-08-31 讨论并锁定的大量一级、二级分类以及主要三级分类，不重新从零讨论；后续应整理成 AIONE Category Master Data V1.0 并进入数据库。

Category 不保存为自由文本路径，而应使用稳定 `category_id` 与父子关系。

未来可建立：

- AIONE Category
- Rakuten Category Mapping
- Amazon Category Mapping
- 1688 Category Mapping

外部平台分类不能反向成为 AIONE 唯一分类事实源。

## 7. 品牌中心

Brand 作为独立主数据对象。

至少支持：

- 自有品牌
- 外部品牌
- 无品牌
- 品牌标准名称
- 多语言名称
- 品牌状态
- 授权/风险状态
- Logo / Brand Assets 引用

## 8. 属性中心

Attribute 用于表达商品特征与可枚举业务语义。

示例：

- 材质
- 性别
- 季节
- 功能
- 风格
- 使用场景
- 厚薄程度

Attribute 必须逐步形成统一字典，避免页面自由写字段形成第二套语义。

## 9. 规格中心

Specification 与 Attribute 分离。

Specification 更偏向可测量、可比较、带单位的数据事实。

示例：

- 长度
- 宽度
- 高度
- 重量
- 厚度
- 容量
- 实测尺寸
- 包装数量

单位应标准化，外部原始单位保留原值后再映射。

## 10. 颜色 / 尺码

颜色和尺码在 V1.0 不必单独成为一级中心，但必须作为平台级标准字典建设，并被 Variant / SKU / Attribute / Specification 调用。

需要保留：

- supplier_raw_value
- canonical_value
- display_name_zh
- display_name_ja
- code
- mapping source

同一供应商原始值不能直接成为平台标准值。

## 11. 商品资料管理

商品资料管理负责围绕 Product 统一管理可复用的内容和资产，不重复维护第二套商品。

至少包括：

- 标题
- 卖点
- 商品说明
- PC / Smartphone 文案
- 搜索词
- 图片
- 视频
- PDF / 附件
- 尺寸/规格图
- 渠道资料版本

后续 Product Asset Engine 与 Listing Template Engine 均应基于这里的统一商品资料生成，不在各上架页面单独复制字段。

## 12. 直发选品作为第一批真实住客

直发选品商品进入商品之家后创建正式 Product，不复制第二套商品。

至少需要保留：

- `origin_selection_mode = DIRECT`
- `current_selection_mode = DIRECT | REGULAR | DEVELOPMENT`
- `direct_owner_id`
- `source_platform`
- `source_url`
- `source_product_id`（若外部平台可提供）

直发商品后续转为常规商品时继续使用同一个 Product。

## 13. 成本与智能定价

成本分析与智能定价属于 Product 的共享能力，不作为独立一级目录重复建设。

商品中心对象工作区中的 `成本与价格` View 读取统一 Cost / Pricing Profile。

直发与常规选品可复用同一 Cost Engine / Pricing Engine，仅使用不同 Policy / Gate。

## 14. 页面类型原则

商品之家 V1.0 优先复用 AIONE 已有平台能力：

- App Shell
- Sidebar Shell V2.0
- Object Workspace
- Table / List
- Tabs / 横向按钮
- Filter / Search
- Aside Context
- Empty / Loading / Error State

不重新开发第二套 Shell、第二套表格、第二套对象详情布局。

## 15. 数据库前置原则

页面和数据库同步设计。

建议首批核心表 / 聚合（最终名称可在 Technical Design 中调整）：

- products
- product_variants
- skus
- listings
- categories
- brands
- attributes
- attribute_values
- product_attribute_values
- specifications
- product_specifications
- bundle_components
- product_assets

成本、定价、渠道 Mapping、审计和状态历史在 Technical Design 阶段继续拆分。

## 16. 明确废止 / 不继承

以下现有实现不作为 V1.0 Product Truth：

- 旧商品之家概览页面布局
- `有形商品 / 无形商品/服务 / 其他商品` 三卡片作为首页核心分类逻辑
- 旧 `商品档案 / 商品主数据 / 店铺商品映射 / 商品生命周期 / 商品资料 / 商品经营核算` 一级目录
- 旧页面中的页面级流程箭头与 KPI 示例数据

如代码仍存在，应进入 Deprecated 管理，待新商品之家稳定后清理。

## 17. 下一阶段

1. 整理 2026-08-31 已锁定分类为 Category Master Data
2. Product / Variant / SKU / Listing Technical Design
3. Database Schema V1
4. 商品中心 Product Workspace 页面规格
5. 分类中心页面规格
6. 品牌 / 属性 / 规格中心页面规格
7. 直发选品首批真实 Product 导入验证
8. 接回成本分析与智能定价
9. Product Asset Engine
10. Listing Template Engine
11. Product-to-Commerce Pipeline
