# 1688选品到AIONE图片生产闭环 V1｜Product Flow 草案

状态：DRAFT FOR PRODUCT FREEZE
日期：2026-09-08
适用项目：美和AIONE一体化工作平台

## 1. 目标

将1688官方采购助手作为外部商品发现与素材来源，将AIONE作为美和内部正式选品协作、商品建档、图片生产与后续发布的唯一业务工作平台。

核心边界：

- 1688负责发现、初筛、导出。
- AIONE负责正式业务对象、协作、判断、图片生产、发布与经营闭环。
- 1688 API暂不作为上线前置依赖。

## 2. 总体业务流

```text
1688趋势/搜索/榜单/店铺
        ↓
加入1688选品池
        ↓
分组 / 标签 / 备注
        ↓
导出选品池Excel
        ↓
Google Drive / Import Inbox
        ↓
AIONE Import Layer
        ↓
创建或更新 ProductOpportunity
        ↓
商品机会一览 / 我的选品
        ↓
人工 + AI判断
        ↓
通过：进入正式选品
        ↓
SKU Excel + 商品素材ZIP
        ↓
SKU / MediaAsset导入
        ↓
生成美和商品ID
        ↓
Image Production Plan
        ↓
Fast Listing图片生产
        ↓
人工确认
        ↓
商品资料中心
        ↓
发布中心 / Rakuten等渠道
        ↓
出单
        ↓
触发Optimized Listing
```

## 3. 外部发现阶段

### 3.1 1688负责

- 趋势热点
- 热搜榜
- 热销趋势榜
- 牛商榜
- 店铺浏览
- 搜索
- 候选商品收藏
- 分组
- 多标签
- 备注

### 3.2 AIONE暂不复制

AIONE第一阶段不重复开发1688的趋势榜、热搜榜、牛商榜和店铺商品搜索能力。

## 4. 选品池导入阶段

### 4.1 输入

1688选品池导出Excel。

### 4.2 导入后生成对象

导入后直接创建或更新`ProductOpportunity`，不建立第二套“1688商品表”。

### 4.3 外部唯一键

```text
source_platform = 1688
source_item_id = 1688商品ID
```

同一`source_platform + source_item_id`不得重复创建商品机会。

重复导入时：

- 更新允许更新的外部字段。
- 保留已有AIONE协作数据。
- 记录导入批次与时间。

## 5. 1688字段进入AIONE的初步映射

```text
商品ID       -> source_item_id
商品链接     -> source_url
商品标题     -> source_title
图片地址     -> source_cover_image_url
商品价格     -> source_price
店铺名称     -> source_supplier_name
所属分组     -> source_group
标签         -> source_tags
备注         -> source_note
平台         -> source_platform
加入时间     -> source_added_at
```

注意：

- `source_group`不得直接成为AIONE正式分类。
- 外部分组与AIONE分类中心之间需要Mapping。
- 外部标签先作为来源标签保存，后续可映射为属性/场景/季节等正式字段。

## 6. AIONE内部正式协作

商品机会进入AIONE后，所有员工在AIONE完成正式工作。

统一复用对象能力：

- 负责人
- 状态
- 优先级
- 评论
- @成员
- 关注
- 收藏
- 附件
- AI摘要
- AI建议
- 时间线
- 操作记录

`商品机会一览`与`我的选品`使用同一个ProductOpportunity对象：

- 商品机会一览 = 全体视图。
- 我的选品 = 当前用户作用域View。

不得复制两套商品机会数据。

## 7. 商品机会状态草案

第一版建议：

```text
imported      已导入
reviewing     待判断/判断中
selected      已选中
rejected      已淘汰
preparing     数据补全中
ready         可进入商品生产
```

最终状态名称需在Product Freeze中确认。

## 8. 正式选品后的数据补全

只有商品机会通过后，才补充完整SKU与素材，避免大量无效数据进入系统。

### 8.1 SKU输入

1688 SKU Excel。

主要字段：

- 商品ID
- SKU ID
- SKU名称
- SKU图片URL
- 原价
- 计算价格
- 库存

### 8.2 素材输入

采购助手“下载为压缩包 -> 多文件夹”。

ZIP文件名：

```text
1688_{source_item_id}_{商品名称}.zip
```

内部：

```text
主图/
sku图片/
详情/
视频/
```

## 9. 美和商品ID生成时点

当前Product Freeze候选：

> ProductOpportunity仅代表商品机会；只有商品通过选品并准备进入正式商品生产时，才创建正式Product并生成美和商品ID，如`mh0000002`。

理由：

- 避免大量淘汰商品占用正式商品编号。
- 区分“候选机会”与“正式商品”。
- 正式图片与后续渠道资产统一围绕美和商品ID命名。

此规则需要最终确认后才能进入数据库设计。

## 10. SKU关联原则

正式SKU必须同时保留：

```text
AIONE sku_id
source_platform
source_item_id
source_sku_id
source_sku_name
source_price
source_stock
source_image_url
```

素材ZIP中的SKU图片通过：

1. 商品ID确定商品。
2. SKU名称标准化匹配。
3. `sku-N-*`顺序辅助校验。
4. 冲突时进入人工确认。

不得使用AI颜色猜测作为主关联方式。

## 11. MediaAsset导入

原始ZIP作为Source Evidence保留。

解压后：

```text
主图   -> source_main_image
sku图片 -> source_sku_image
详情   -> source_detail_image
视频   -> source_video
```

导入流程：

```text
Import
→ Parse
→ Validate
→ Classify
→ Link
→ Store
```

需过滤/标记：

- 空白图
- 1KB低信息图
- 损坏图片
- 重复图片
- 异常尺寸
- 无法解析文件

## 12. 图片生产入口

当正式Product、SKU、原始MediaAsset与必要商品事实达到最低条件时，AIONE生成`Image Production Plan`。

### 12.1 Fast Listing

默认：

- `ma`
- `skuNN`
- `_01`
- 3-6个基础详情模块

目标：最快进入市场验证。

### 12.2 Optimized Listing

由真实经营信号触发，例如：

- 首单
- 达到订单阈值
- 重点商品
- 人工指定

增加完整详情模块与更高质量视觉素材。

## 13. 图片命名

正式发布素材基于美和系统商品ID：

```text
mh0000002_ma.jpg
mh0000002_sku01.jpg
mh0000002_sku02.jpg
mh0000002_01.jpg
mh0000002_02.jpg
...
```

外部1688商品ID不得进入AIONE正式发布图片命名标准。

## 14. Google Drive定位

Google Drive用于：

- 外部导入Inbox
- 原始文件证据
- 素材归档

AIONE数据库用于：

- 正式结构化业务对象
- 状态
- 关系
- 权限
- 审计
- 搜索
- 自动化

不得让AIONE页面长期实时依赖Excel作为业务数据库。

## 15. 文件自动化草案

采购助手当前不能选择导出路径，因此候选链路：

```text
1688采购助手
→ Windows Downloads
→ 本地Import Watcher
→ Google Drive Inbox
→ AIONE Import Layer
```

本地Watcher应按文件名模式分流，例如：

- `选品池导出*.xlsx`
- `1688批量导出SKU*.xlsx`
- `1688_{商品ID}_*.zip`

此部分属于Technical Design，Product Freeze完成前不写正式代码。

## 16. 人工确认点

第一版建议保留以下人工责任：

- 商品机会最终是否通过。
- 外部分组到AIONE正式分类的异常Mapping。
- SKU映射冲突。
- AI生成商品图的商品真实性确认。
- 正式发布前图片包确认。

可确定性的文件解析、去重、字段映射、命名、校验不依赖人工。

## 17. 第一版成功标准

V1闭环成功不是“1688全部自动化”，而是：

1. 员工可在1688选品池完成初筛。
2. 一次导出后商品机会可进入AIONE。
3. 重复导入不产生重复商品机会。
4. 所有员工在AIONE完成正式选品协作。
5. 通过商品可补入SKU与原始素材。
6. 系统生成美和商品ID。
7. 自动生成Image Production Plan。
8. 可产出Fast Listing所需标准图片包。
9. 图片进入商品资料中心并可交给发布中心。
10. API未通过也不阻塞闭环。

## 18. Product Freeze前仍需确认

- ProductOpportunity最终状态机。
- 美和商品ID生成时点是否正式锁定为“商品通过并创建Product时”。
- 选品池Excel哪些字段允许后续导入覆盖。
- Google Drive Inbox正式目录。
- Import Batch对象是否需要独立建模。
- 供应商对象在选品导入阶段何时创建/关联。
- SKU价格与库存是快照还是同步数据。
- 图片Production Plan最低启动条件。
- 图片人工确认的角色与权限。

## 19. 当前阶段判断

本文件完成后，下一阶段应停止继续泛化分析，优先完成第18节Product Freeze问题。冻结后再进入Technical Design，届时才确定数据库Schema、API Contract、Google Drive监听方式、本地Watcher与具体代码实现。