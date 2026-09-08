# AIONE商品图片标准 V1｜Product Freeze 草案

状态：DRAFT FOR FREEZE
日期：2026-09-08
适用项目：美和AIONE一体化工作平台

## 1. 目标

AIONE商品图片系统用于基于真实商品数据与原始素材，自动生成可发布、可复用、可追溯、可批量维护的标准商品视觉资产。

核心原则：

- 商品事实优先。
- 真实素材优先。
- 确定性处理优先。
- AI负责理解、创意、模特、场景与构图。
- 正式文字、规格、颜色、尺寸、价格等必须来自结构化数据。
- 同类商品通过Category Image Recipe复用。
- 原始素材、加工素材、最终发布素材分层保存。

## 2. 统一图片角色与命名

美和内部正式图片统一使用美和系统商品ID命名。1688商品ID属于外部来源ID，不得替代美和商品ID。

示例：`mh0000002`

### 2.1 MA标准白底主图

```text
{美和商品ID}_ma.jpg
```

示例：`mh0000002_ma.jpg`

定位：商品级标准白底事实图，可供Amazon等渠道与AIONE商品档案复用。

基本规则：

- 纯白背景。
- 无营销文字。
- 无额外Logo叠加。
- 原则上无模特、无场景。
- 商品主体真实，不改变颜色、结构、数量、配件。
- 多件套按真实销售单位展示。
- 多SKU独立销售商品默认采用Primary SKU。

### 2.2 SKU展示图

```text
{美和商品ID}_sku01.jpg
{美和商品ID}_sku02.jpg
...
```

示例：`mh0000002_sku01.jpg`

定位：让消费者一眼确认当前选择的SKU。

规则：

- `skuNN`表示展示顺序，不是SKU唯一ID。
- 正式关联以AIONE内部SKU ID与source_sku_id为准。
- 日本市场日文为主；颜色类SKU建议同时显示英文。
- SKU图必须对应真实SKU。
- 分类差异通过Category Image Recipe控制。

### 2.3 Rakuten销售主图

```text
{美和商品ID}_01.jpg
```

示例：`mh0000002_01.jpg`

定位：乐天等销售渠道第一销售视觉。

信息层级：

1. 商品主体。
2. 核心卖点。
3. 品牌。
4. 必要规格/购买信息。

原则：主图只突出少量核心信息，不堆积详情页内容。

### 2.4 商品详情图

```text
{美和商品ID}_02.jpg
{美和商品ID}_03.jpg
...
```

文件名仅负责排序和渠道兼容，真正语义保存于系统字段，如`module_type=SIZE`。

## 3. Detail Image Module Library V1

第一版详情模块：

- `SP` 核心卖点
- `COLOR` 颜色展示
- `SIZE` 尺码/尺寸
- `MATERIAL` 材质
- `DETAIL` 细节
- `FUNCTION` 功能
- `MODEL` 模特展示
- `LIFESTYLE` 使用场景
- `SPEC` 商品规格
- `HOWTO` 使用方法
- `PACKAGE` 包装
- `GIFT` 礼品
- `COMPARE` 对比
- `FAQ` 常见问题
- `CAUTION` 注意事项

详情图数量不固定，由商品分类、商品事实、卖点、渠道和经营阶段生成Image Production Plan。

## 4. 两种生产模式

### 4.1 Fast Listing

目标：快速上架验证市场。

默认包含：

- `ma`
- `skuNN`
- `_01`
- 3-6个基础详情模块，如SP/COLOR/SIZE/MATERIAL/SPEC。

### 4.2 Optimized Listing

触发条件可包括：

- 商品已出单。
- 销量达到阈值。
- 品牌重点商品。
- 人工指定。

增加MODEL/LIFESTYLE/DETAIL/FUNCTION/FAQ/GIFT/COMPARE等完整模块。

## 5. Category Image Recipe

图片角色固定，但不同分类采用不同Recipe。

示例：

```text
SKU
├─ SKU_HAT_V1
├─ SKU_SOCKS_V1
├─ SKU_APPAREL_V1
├─ SKU_SHOES_V1
└─ SKU_HOME_V1
```

Recipe至少定义：

- page_role
- category
- template_version
- required_assets
- optional_assets
- required_fields
- output_size
- product_truth_lock
- AI可变区域
- 文字规则
- Logo规则
- validation_rule

### 5.1 帽类SKU V1

建议结构：

- 模特佩戴图作为第一视觉。
- 同SKU立体商品展示图。
- 日文颜色名称。
- 英文颜色名称。
- 一句简短日文卖点。
- 品牌Logo。

### 5.2 袜类SKU V1

建议结构：

- 穿戴效果。
- 单只/一双完整平铺图。
- 日文颜色。
- 英文颜色。
- 必要时显示尺码/套装信息。
- 品牌Logo。

## 6. 商品真实性规则

### AI不得改变

- 商品形状与结构
- SKU颜色
- 图案
- 材质事实
- 商品数量
- 配件
- 尺寸与规格数字
- 品牌事实
- 功能事实

### AI允许变化

- 模特
- 姿势
- 背景
- 光线
- 场景
- 构图
- 氛围
- 装饰性视觉

统一原则：商品事实锁定，销售表达可设计。

## 7. 正式文字来源

正式销售图片中的文字通过以下链路产生：

```text
AIONE商品字段
→ 日文化/标准化
→ Approved Copy
→ Template Render
```

AI可以提出文案建议，但不直接成为不可审计的最终事实来源。

## 8. 卖点与证据

商品卖点应逐步结构化：

- primary_selling_point
- secondary_selling_points
- evidence
- claim_status

事实性声明（如防水、UV、材质比例、尺寸、认证等级等）必须有可靠来源或人工批准，AI不得自行强化。

## 9. Campaign Overlay

促销信息不写死在基础主图Recipe中。采用独立Campaign Overlay层，例如：

- 价格
- Coupon
- 限时
- 先着N名
- SALE

基础主图保持稳定，活动层可单独替换或撤销。

## 10. Media Validation

原始素材进入正式MediaAsset前必须经过验证：

- 文件可解析
- 宽高有效
- 文件大小异常检测
- 空白/纯色/低信息量图片检测
- Hash重复检测
- 视频格式检测
- 排序解析

原始ZIP应保留为Source Evidence；无效文件可被拒绝进入正式素材，但不得篡改原始来源证据。

## 11. Image Production Plan

正式生成前先生成图片生产计划。

示例：

```text
product_id: mh0000002
category: 男袜
mode: Fast

ma      标准白底主图
sku01   ブラック
sku02   ネイビー
sku03   ブラウン
01      乐天销售主图
02      SP
03      COLOR
04      SIZE
05      MATERIAL
06      SPEC
```

原则：先确定应该生产什么，再调用图像处理/AI能力。

## 12. 技术责任边界

### Deterministic Image Engine

负责：

- 解压
- 文件解析
- 命名
- 抠图
- 白底
- 裁切
- 尺寸
- 压缩
- 排序
- Logo
- 文字渲染
- 参数渲染
- 校验

### AI Image Engine

负责：

- 商品语义理解
- 模特
- 场景
- 氛围
- 创意构图
- 图片内容语义分类
- 视觉质量判断

### Recipe / Template Layer

负责：

- 页面应包含什么
- 分类差异
- 固定版式
- 哪些字段必须存在
- 哪些内容禁止修改
- 输出规则

## 13. 当前待冻结项

以下仍需在进入正式Product Freeze前确认：

- 各角色Master尺寸与渠道输出尺寸最终标准。
- Rakuten主图是否统一1:1或支持纵版主图模板。
- 各大分类第一版Recipe优先级。
- Approved Copy工作流。
- Campaign Overlay与运营活动数据的正式关系。
- MediaAsset对象最终Schema。

## 14. 当前工程结论

本标准当前只作为Product Freeze草案。未完成上方待冻结项与整体业务流确认前，不进入图片生产代码开发。