# 1688选品到AIONE图片生产闭环 V1

状态：CURRENT / PRODUCT FLOW
日期：2026-09-08
适用项目：美和AIONE一体化工作平台

## 1. 目标

将1688官方采购助手作为外部商品发现与素材来源，将AIONE作为美和内部正式选品协作、商品建档、图片生产与后续发布的唯一业务工作平台。

核心边界：

- 1688负责发现、初筛、导出。
- AIONE负责正式业务对象、协作、判断、分类、商品建档、图片生产、发布与经营闭环。
- 1688 API不是V1上线前置依赖。

## 2. CURRENT 总体业务流

```text
1688趋势 / 搜索 / 榜单 / 店铺
        ↓
加入1688选品池
        ↓
导出选品池 Excel
        ↓
Google Drive Import Inbox
        ↓
AIONE Import Layer
        ↓
去重 + 生成选品编号
        ↓
创建 / 更新 ProductOpportunity
        ↓
自动分类
        ↓
pending 待判断
        ↓
人工 + AI 判断
        ├─ rejected 已淘汰
        └─ selected 已通过
                 ↓
          创建正式 Product
                 ↓
          生成美和系统商品ID mh...
                 ↓
          converted 已转正式商品
                 ↓
          SKU / MediaAsset 补全
                 ↓
          Image Production Plan
                 ↓
          Fast Listing 图片生产
                 ↓
          商品资料 / 发布准备
                 ↓
          渠道发布
                 ↓
          出单 / 经营反馈
                 ↓
          Optimized Listing
```

## 3. 外部发现阶段

1688负责：趋势热点、热搜、榜单、店铺浏览、搜索、候选商品收藏、分组、标签、备注。

AIONE V1不重复开发1688已有的趋势榜、热搜榜、牛商榜和店铺搜索能力。

## 4. 选品导入

输入：1688选品池导出 Excel。

导入后直接创建或更新 `ProductOpportunity`，不建立第二套“1688商品表”。

外部唯一键：

```text
source_platform = 1688
source_ref      = 1688商品ID
```

同一 `source_platform + source_ref` 不得重复创建机会；重复导入刷新允许更新的外部字段，但不得覆盖 AIONE 内部状态、负责人、正式分类、选品编号等内部事实。

## 5. 选品编号

正式选品编号：

```text
xpYYMMDDNNN
```

例如：

```text
xp260908001
```

规则：系统自动生成、每日从001开始、永久不变、重复导入同一外部机会不生成新编号。

`selection_date` 单独作为正式统计日期；不得通过解析编号做报表。

## 6. 自动分类

AIONE分类中心是唯一正式分类事实源。

执行优先级：

```text
Mapping Rule -> deterministic rule -> AI -> Human Exception
```

AI只能选择现有分类节点，不能创建分类。

低置信度、冲突、未映射进入“待确认分类”。

当前业务重点：女袜、男袜、女帽、男帽；冬季、厚手、商务等属于属性/标签，不作为额外分类层级。

## 7. ProductOpportunity CURRENT 状态

正式状态仅四个：

```text
pending    待判断
selected   已通过
rejected   已淘汰
converted  已转正式商品
```

正式流转：

```text
pending -> selected -> converted
pending -> rejected
```

授权恢复：

```text
rejected -> pending
```

不得再新增或恢复以下旧草案状态：

```text
imported
reviewing
preparing
ready
```

也不得把 SKU 补全、图片制作、待上架、已上架、已出单、优化中塞入 ProductOpportunity 状态机。

## 8. 商品机会与正式商品边界

`ProductOpportunity` 只回答：

> 这个外部商品机会是否值得进入正式商品流程？

`selected` 仅表示“值得继续”，不是正式 Product。

当确认创建正式商品时，必须原子完成：

```text
创建 Product
生成 mh... 系统商品ID
建立 source_opportunity 关系
更新 ProductOpportunity -> converted
写审计记录
```

SKU、图片素材不是创建正式 Product 的阻塞条件，可在 Product 创建后继续补全。

## 9. SKU 与素材补全

只有通过的商品机会才进入完整 SKU / MediaAsset 补全，避免大量淘汰商品占用系统资源。

SKU至少保留：

```text
AIONE sku_id
source_platform
source_ref
source_sku_id
source_sku_name
source_price
source_stock
source_image_url
```

素材ZIP通过商品ID确定商品，SKU名称标准化匹配，顺序辅助校验；冲突进入人工确认。

不得把 AI 颜色猜测作为主关联方式。

## 10. MediaAsset 导入

原始 ZIP 作为 Source Evidence 保留。

内容分类：

```text
主图    -> source_main_image
sku图片 -> source_sku_image
详情    -> source_detail_image
视频    -> source_video
```

导入过程：

```text
Import -> Parse -> Validate -> Classify -> Link -> Store
```

需过滤/标记空白图、低信息图、损坏图片、重复图片、异常尺寸、无法解析文件。

## 11. 图片生产

正式 Product、必要 SKU / MediaAsset 与商品事实达到最低条件后，AIONE生成 `Image Production Plan`。

Fast Listing 默认产出：

```text
ma
all sku images
_01
3-6个基础详情模块
```

目标是最快完成市场验证。

Optimized Listing由首单、订单阈值、重点商品或人工指定等真实经营信号触发。

## 12. 图片命名

正式发布素材基于美和系统商品ID：

```text
mh0000002_ma.jpg
mh0000002_sku01.jpg
mh0000002_sku02.jpg
mh0000002_01.jpg
mh0000002_02.jpg
...
```

`mh0000002` 是美和系统商品ID，不是通用货号。

外部1688商品ID不得进入AIONE正式发布图片命名标准。

## 13. Google Drive 定位

Google Drive用于：

- Import Inbox
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

Import Inbox采用批次对象管理，文件建议按 pending / processed / error 分流；每个Excel导入形成 ImportBatch，允许部分成功。

## 14. 人工确认点

V1保留以下人工责任：

- 商品机会最终是否通过。
- 自动分类异常。
- SKU映射冲突。
- AI生成图片的商品真实性确认。
- 正式发布前必要的图片/内容确认。

确定性的文件解析、去重、字段映射、命名、校验优先自动化。

## 15. V1 成功标准

V1闭环成功定义为：

```text
1688候选进入AIONE
→ 重复导入不重复建机会
→ 自动分类
→ xp编号
→ pending判断
→ selected / rejected
→ selected创建Product并生成mh ID
→ converted
→ SKU与素材补全
→ Fast Listing图片包
→ 商品资料与发布准备
```

1688官方API未完成不阻塞该闭环。

## 16. Governance

本文件已完成 Product Freeze 收口，不再作为“待确认草案”。

旧六状态草案：

```text
imported / reviewing / selected / rejected / preparing / ready
```

正式废止。

后续数据库、API、前端实现必须以本文件和独立的选品状态/编号/导入/转换标准为准；如出现冲突，以最新 CURRENT Product Freeze 和 Repo CURRENT 技术设计为准。