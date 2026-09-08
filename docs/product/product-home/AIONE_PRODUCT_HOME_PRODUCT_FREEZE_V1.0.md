# AIONE 商品之家 Product Freeze V1.0

状态：CURRENT / PRODUCT FREEZE
日期：2026-09-08
适用项目：美和AIONE一体化工作平台
正式业务项目名称：美和AIONE一体化工作平台

## 1. Product Truth

商品之家是 AIONE 中“正式商品事实、商品规则、商品结构化资料与商品域能力”的唯一业务域入口。

商品之家不负责替代工作之家中的选品、测样、采购、设计、上架、运营等人员工作流程；这些工作可以围绕商品对象发生，但商品之家负责承载最终稳定的商品事实与可复用商品域能力。

商品之家 CURRENT 一级中心仅保留以下 7 个：

```text
01 分类中心
02 品牌中心
03 商品中心
04 属性中心
05 规格中心
06 库存中心
07 资料中心
```

除以上 7 个中心外，旧代码中存在的设计中心、发布中心、成本中心、价格中心、利润中心、编码中心、测样中心、采购中心、运营中心、客服中心等，不再作为商品之家 CURRENT 一级中心定义。

这些能力后续如确有业务需要，应优先归入：

```text
工作之家 / 对应事业工作台
平台级共享能力
其他之家
商品对象的 View / Tab / Capability
```

不得为了保留旧页面而恢复为商品之家一级中心。

## 2. 页面结构

商品之家遵循 AIONE CURRENT Shell：

```text
Header
Main
Footer
```

不恢复全局 Sidebar，不恢复全局 Aside。

商品之家内部导航属于 Main 内部业务导航，不是平台级左右栏。

商品之家页面类型：

```text
商品之家概览页
中心列表页
对象详情 / 对象工作区
规则 / 设置页（仅在中心内部按需出现）
```

中心下级采用横向 View / Tabs，禁止重新建立第二套全局树形壳层。

## 3. 7 个中心职责

### 3.1 分类中心

对象：ProductCategory / 分类节点。

职责：统一管理 AIONE 商品分类唯一事实源。

CURRENT 原则：

```text
系统主分类（中文） = 唯一内部分类事实
店铺分类（日文等） = 外部渠道映射
附加分类 = 可多选
JAN / GTIN / HS Code = 独立字段，不作为分类层级
系统分类最多 3 级
待分类只允许作为一级异常入口
```

当前一级 12 类：

```text
01 服装服饰
02 鞋靴
03 箱包
04 帽饰配件
05 家居生活
06 厨房餐饮
07 健康护理
08 美容个护
09 数码电器
10 户外旅行
11 宠物用品
12 文具礼品
```

当前重点验证分类：

```text
女袜
男袜
女帽
男帽
```

长度、场景、季节、厚薄等不继续下钻分类层级，进入属性。

建议横向 View：

```text
概览
系统分类
店铺分类
分类映射
待确认分类
```

### 3.2 品牌中心

对象：Brand / TrademarkRegistration。

职责：管理商品品牌与品牌注册事实。

CURRENT 必须保留专属“品牌注册”能力。

建议横向 View：

```text
概览
品牌一览
品牌注册
```

品牌注册至少承载：

```text
品牌 / 商标名称
国家 / 地区
类别
申请号
注册号
申请日期
注册日期
状态
资料附件
负责人
备注
```

### 3.3 商品中心

对象：Product / SKU。

职责：管理已经进入正式商品体系的 Product 与 SKU。

正式 Product 创建后获得美和系统商品 ID：

```text
mh0000002
```

该编号是“美和系统商品ID”，不是通用货号。

选品编号与商品编号严格分离：

```text
ProductOpportunity.selection_no = xp260908001
Product.product_id               = mh0000002
```

建议横向 View：

```text
全部商品
SKU
待补全
已归档
```

商品中心只管理正式 Product，不把 ProductOpportunity 当正式商品。

### 3.4 属性中心

对象：ProductAttribute / AttributeGroup / AttributeValue。

职责：统一管理商品可复用属性定义。

典型属性：

```text
颜色
尺寸
材质
季节
长度
厚薄
图案
适用人群
场景
功能
```

属性设计服务于：

```text
人工录入
AI理解
自动分类
SKU生成
渠道发布
筛选搜索
数据分析
API
```

不允许不同页面重复定义同名属性。

建议横向 View：

```text
属性
属性组
属性值
渠道字段映射
```

### 3.5 规格中心

对象：SpecificationTemplate / SpecificationValue / SKUCombinationRule。

职责：管理决定 SKU 组合结构的规格体系。

规格与普通属性分开治理。

典型规格：

```text
颜色
尺寸
套装数量
型号
容量
```

只有会参与 SKU 组合、库存或渠道变体结构的字段才进入规格。

建议横向 View：

```text
规格模板
规格值
SKU组合
渠道规格映射
```

### 3.6 库存中心

对象：Inventory / InventoryLedger / StockLocation。

职责：管理正式 Product / SKU 的库存事实。

CURRENT 重点：

```text
SKU库存
可用库存
锁定库存
在途库存
库存流水
库存地点
更新时间
来源系统
```

库存中心不重复定义 Product / SKU，只引用统一商品对象。

建议横向 View：

```text
概览
库存
库存流水
库存地点
```

### 3.7 资料中心

对象：ProductAsset / ProductDocument / ProductMediaReference。

职责：统一管理商品域非结构化与媒体资料。

名称正式简化为“资料中心”，不再使用“商品资料中心 / 商品资料管理”。

资料中心不等于商品字段数据库；结构化字段仍归对应对象。

资料类型：

```text
图片
文档
表格
视频
压缩包
证书
说明书
包装资料
渠道发布资料
其他附件
```

商品图片 CURRENT 命名规则示例：

```text
mh0000002_ma
mh0000002_sku01
mh0000002_01
mh0000002_02
...
```

建议横向 View：

```text
全部资料
图片
文档
表格
视频
其他
```

## 4. 商品之家关键对象关系

```text
ProductCategory
      ↑
      │ category_id
ProductOpportunity
      │ selected -> convert
      ↓
Product
      ├─ SKU
      ├─ Brand
      ├─ Attributes
      ├─ Specifications
      ├─ Inventory
      └─ Assets
```

原则：同一个对象只建一套 Canonical Model，不按页面复制。

## 5. ProductOpportunity → Product 边界

ProductOpportunity 不属于商品之家正式商品事实，但它是商品进入正式体系的入口来源。

CURRENT 状态：

```text
pending
selected
rejected
converted
```

转换条件至少：

```text
status = selected
category_id 已明确
人工确认继续进入正式商品体系
```

转换必须原子执行：

```text
创建 Product
→ 生成 mh 商品ID
→ 建立 source_opportunity_id
→ ProductOpportunity = converted
→ 写审计记录
```

SKU、图片、渠道发布资料可以后补，不阻塞 Product 创建。

## 6. 1688 → 商品之家业务闭环

CURRENT 最小闭环：

```text
1688 商品机会
→ AIONE 导入
→ xp 选品编号
→ 去重
→ 自动分类
→ pending
→ 人工判断
→ selected
→ 转正式 Product
→ mh 商品ID
→ SKU / 属性 / 规格
→ 资料 / 图片
→ 后续发布与业务工作流
```

1688 官方 API 不是 V1 上线阻塞条件。

V1 优先使用采购助手导出 / Excel / 轻量导入跑通真实业务。

## 7. 页面 View / Scope 原则

同一对象出现在不同页面时采用同一对象 + 不同 View / Scope，不复制数据。

例如 Product：

```text
全部商品
某分类商品
某品牌商品
待补资料商品
某渠道待发布商品
```

都是 Product 的不同 View，不允许创建多份商品表。

## 8. 通用对象能力

商品、品牌、分类、资料等业务对象按需要复用 AIONE 平台级通用对象能力：

```text
编号
负责人
状态
关注
收藏
评论
@成员
附件
时间线
操作记录
状态历史
AI摘要
AI建议
对象关联
审计
```

不得每个中心重复开发一套评论、附件、负责人或日志系统。

## 9. 权限原则

V1 不引入复杂审批链。

权限至少区分：

```text
查看
新建
编辑
归档
删除（高风险，默认限制）
转换 ProductOpportunity -> Product
修改分类结构
修改属性 / 规格规则
库存调整
资料删除
```

商品正式事实的高风险修改必须可审计。

## 10. 状态与异常原则

各中心只维护与自身对象生命周期真正相关的状态。

禁止用页面状态代替业务状态。

异常优先通过：

```text
待确认分类
待补全字段
映射失败
资料缺失
库存异常
外部同步异常
```

作为 View / Exception Queue 处理，不轻易增加对象生命周期状态。

## 11. AI 与自动化边界

确定性任务优先规则 / 函数 / API：

```text
编号生成
去重
字段校验
分类映射
SKU组合
文件命名
图片尺寸检查
库存计算
```

AI 优先用于：

```text
分类建议
属性识别
标题 / 文案生成
图片语义QC
资料摘要
缺失字段建议
异常解释
```

AI 不直接创造新的分类节点、属性标准或规格标准；正式规则需人类确认后进入系统事实源。

## 12. CURRENT 与旧代码冲突处理

Repo 当前 `home-registry.js` 中仍存在旧商品之家 17 个一级中心定义，包括：

```text
设计中心
发布中心
成本中心
价格中心
利润中心
编码中心
测样中心
采购中心
运营中心
客服中心
```

这些属于 Implementation Truth 中的旧实现残留，不代表 CURRENT Product Truth。

本 Product Freeze 生效后，Technical Design 与后续代码必须收口为 7 个中心，不得以旧 registry 反推产品。

旧 `product-home-current.js` 仍存在“从左侧进入各专业中心”等文案，也与 CURRENT 无全局 Sidebar 架构冲突，后续实现阶段必须删除。

## 13. V1 不做的内容

V1 不在商品之家新增以下一级中心：

```text
设计
发布
成本
价格
利润
编码
测样
采购
运营
客服
```

V1 不构建复杂审批体系。

V1 不一次性开发所有渠道映射。

V1 不要求所有 12 大类目全部深度配置完毕；先跑通女袜 / 男袜 / 女帽 / 男帽。

V1 不要求 1688 官方 API 成为前置条件。

## 14. V1 验收标准

Product Freeze 验收必须满足：

```text
1. 商品之家一级中心只有 7 个
2. 不恢复全局 Sidebar / Aside
3. 分类中心唯一管理分类事实
4. 品牌中心保留品牌注册
5. 商品中心只管理正式 Product / SKU
6. 属性与规格分开
7. 库存引用统一 SKU，不复制商品模型
8. 资料中心管理商品域资料，不重复结构化字段
9. ProductOpportunity 与 Product 边界明确
10. xp 与 mh 编号职责分离
11. 同一对象采用不同 View / Scope，不复制数据
12. 旧 17 中心代码不得作为 CURRENT 产品依据
```

## 15. Governance Gate

```text
商品之家 Product Truth        = FROZEN V1.0
一级中心数量                  = 7
全局 Sidebar / Aside          = PROHIBITED
统一对象模型                  = REQUIRED
旧 17 中心 Registry           = DEPRECATED IMPLEMENTATION
下一步                        = Technical Design
```

本文件生效后，商品之家后续工程必须以此文件作为 Product Truth；若真实业务验证需要改变 7 中心结构，必须先修改 Product Freeze，再修改代码。