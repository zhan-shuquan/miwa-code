# 1688选品到AIONE图片生产闭环 V1

状态：CURRENT / PRODUCT FLOW
日期：2026-09-09
适用项目：美和AIONE一体化工作平台

## 1. 目标

将1688官方采购助手作为外部商品发现、选品提交与原始素材来源，将AIONE作为美和内部正式选品协作、商品建档、成本定价、图片生产与后续发布的唯一业务工作平台。

核心边界：

- 1688负责发现、候选收藏、姓名分组、来源标签、重量备注、Excel/ZIP导出。
- AIONE负责正式业务对象、协作、判断、分类、商品建档、成本利润、图片生产、发布与经营闭环。
- 1688 API不是V1上线前置依赖。
- 直发/备货不是两套选品对象；1688直发标签仅作为来源履约提示。

## 2. CURRENT 总体业务流

```text
1688趋势 / 搜索 / 榜单 / 店铺
        ↓
加入1688选品池
        ↓
最小人工来源事实
姓名分组 / 直发提示标签 / 单件重量(g)
        ↓
导出选品池 Excel + 商品素材 ZIP
        ↓
Google Drive 01_1688选品提交（单层Inbox）
        ↓
AIONE Import Layer
        ↓
Excel去重 + xp编号 + ZIP按1688商品ID匹配
        ↓
创建 / 更新 ProductOpportunity
        ↓
自动分类 / AI辅助判断
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
          SKU / Source Media正式化
                 ↓
          成本测算 / 智能定价 / 利润测算
                 ↓
          Image Production Plan
                 ↓
          Fast Listing 图片生产
                 ↓
          发布条件检查
                 ↓
          持续自动发布
                 ↓
          市场反馈 / 出单驱动后续
```

## 3. 外部发现阶段

1688负责：趋势热点、热搜、榜单、店铺浏览、搜索、候选商品收藏、分组、标签、备注。

AIONE V1不重复开发1688已有的趋势榜、热搜榜、牛商榜和店铺搜索能力。

员工侧尽量只保留不可自动取得的事实动作：

```text
直发测试商品 -> 打直发选品标签
重量         -> 备注填纯数字，单位g
提交人       -> 批量移动到自己的姓名分组
```

## 4. 选品导入

输入：

```text
1688选品池导出 Excel
+
1688_<商品ID>_<商品名称>.zip
```

二者直接进入同一个Google Drive单层Inbox，不按人员/日期建立子目录，不改名，不人工解压。

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

规则：系统自动生成、每日从001开始、永久不变、重复导入同一外部机会不生成新编号。

`selection_date`优先取1688“加入时间”的业务日期；正式统计使用结构化日期字段，不解析编号做报表。

## 6. 自动分类

AIONE分类中心是唯一正式分类事实源。

执行优先级：

```text
Mapping Rule -> deterministic rule -> AI -> Human Exception
```

AI只能选择现有分类节点，不能创建分类。

低置信度、冲突、未映射进入“待确认分类”。

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

不得把SKU补全、图片制作、待上架、已上架、已出单、优化中塞入ProductOpportunity状态机。

旧`discovered / reviewing / qualified`仅作为历史Implementation迁移来源，不再作为CURRENT。

## 8. 选品与正式商品边界

`ProductOpportunity` 只回答：

> 这个外部商品机会是否值得进入正式商品流程？

当确认创建正式商品时，必须原子完成：

```text
创建 Product
生成 mh... 系统商品ID
建立 source_opportunity 关系
更新 ProductOpportunity -> converted
写审计记录
```

## 9. 来源重量与履约提示

1688备注中的纯数字按克解析为：

```text
source_weight_g
```

它是来源网店显示重量，不等于最终计费重量。

1688标签`直发选品`解析为：

```text
source_fulfillment_hint = direct
```

它只是人工来源提示。最终履约方式由后续成本、物流、利润规则判断，不创建“直发选品/常规选品”两套流程。

## 10. ZIP与Source Evidence边界

ZIP在选品Excel提交时即可同时进入AIONE Inbox，而不是等待selected后才上传。

AIONE在ProductOpportunity阶段可以完成：

```text
发现ZIP
-> 从文件名解析1688商品ID
-> 与Excel行/商品机会确定性匹配
-> 记录Google Drive file id / 文件名 / size / modifiedTime
-> Media Validation准备
```

但CURRENT `product_assets`只属于正式Product，因此在ProductOpportunity尚未转换为Product时：

- 原始ZIP继续作为Google Drive Source Evidence。
- 不创建第二套`opportunity_assets`表。
- 不把来源ZIP冒充正式Product Asset。

当`selected -> converted`生成正式Product后，再把已匹配ZIP中的有效素材提取、验证、存入正式对象资产体系。

这样既允许员工一次提交Excel+ZIP，又保持统一资产模型。

## 11. SKU 与素材正式化

只有通过并转成正式Product的商品，才进入完整SKU / `product_assets`正式化，避免淘汰商品占用正式商品资产空间。

SKU正式关系以SKU Excel/来源确定性字段为准，不通过AI颜色猜测建立主关联。

素材ZIP通过商品ID确定商品；已验证目录：

```text
主图/
sku图片/
详情/
视频/
```

对应正式角色候选：

```text
主图    -> source_main_image
sku图片 -> source_sku_image
详情    -> source_detail_image
视频    -> source_video
```

需过滤/标记空白图、低信息图、损坏图片、重复图片、异常尺寸、无法解析文件。

## 12. 正式图片资产与存储

Google Drive：

- Import Inbox
- 原始Excel / ZIP证据
- 人工可查看来源资料

GCS：

- AIONE正式提取后的商品图片/视频二进制资产
- AI派生素材
- 发布素材

Cloud SQL：

- `product_assets`结构化记录
- 来源、角色、关系、状态、审计

同一素材不得因选品、商品、AI设计、发布页面不同而复制成多套业务事实。

## 13. 图片生产

正式Product、必要SKU / Source Media与商品事实达到最低条件后，AIONE生成 `Image Production Plan`。

Fast Listing目标是最快完成真实市场验证；Optimized Listing由首单、订单阈值、重点商品或人工指定等真实经营信号触发。

## 14. 图片命名

正式发布素材基于美和系统商品ID：

```text
mh0000002_ma.jpg
mh0000002_sku01.jpg
mh0000002_01.jpg
...
```

外部1688商品ID用于来源匹配，不进入AIONE正式发布图片命名标准。

## 15. V1 成功标准

```text
1688 Excel + ZIP进入单层Inbox
→ 重复导入不重复建机会
→ source_group / source_tags / source_weight_g被正确解析
→ ZIP按1688商品ID正确匹配
→ xp编号
→ pending判断
→ selected / rejected
→ selected创建Product并生成mh ID
→ converted
→ 来源素材正式化
→ 成本 / 定价 / 利润
→ Fast Listing图片包
→ 发布准备
```

1688官方API未完成不阻塞该闭环。

## 16. Governance

本文件为2026-09-09 CURRENT Product Flow。

以下旧定义废止：

- 直发选品/常规选品作为两套AIONE选品流程。
- `discovered / reviewing / qualified`作为CURRENT选品状态。
- ZIP必须等选品通过后才允许进入Drive。
- 人员/日期子文件夹作为导入关系事实。

后续数据库、API、前端实现必须以最新CURRENT Product Freeze与Repo CURRENT技术设计为准。
