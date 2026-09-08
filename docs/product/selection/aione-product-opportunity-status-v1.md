# AIONE商品机会状态标准 V1｜Product Freeze

状态：CURRENT FOR PRODUCT FREEZE
日期：2026-09-08
适用项目：美和AIONE一体化工作平台

## 1. 设计原则

V1状态必须少、清楚、可执行，不为了流程完整而增加无必要状态。

ProductOpportunity只负责“商品机会是否值得进入正式商品流程”的判断，不承载后续SKU补全、图片生产、上架等正式商品阶段状态。

## 2. V1状态

统一采用4个状态：

```text
pending    待判断
selected   已通过
rejected   已淘汰
converted  已转正式商品
```

### pending｜待判断

商品机会刚导入AIONE后的默认状态。

包含：
- 尚未判断
- 正在研究
- 正在评论/协作

V1不再拆分“已导入 / 判断中”等状态，避免状态过多。

### selected｜已通过

已经确认值得继续推进，但尚未创建正式Product。

允许进入：
- SKU数据补充
- 原始素材补充
- 正式商品创建准备

### rejected｜已淘汰

当前不继续推进。

淘汰记录不删除，保留原因、评论和历史，作为后续选品分析证据。

### converted｜已转正式商品

商品机会已经创建正式Product，并获得美和商品ID，如：

```text
mh0000002
```

ProductOpportunity保留，用于追溯选品来源和经营结果，不与正式Product重复承载后续业务状态。

## 3. 状态流转

```text
pending
├─> selected
│     └─> converted
└─> rejected
```

如业务需要，rejected可以由有权限人员恢复到pending；V1不增加独立“恢复中”等状态。

## 4. 与选品编号关系

每个ProductOpportunity创建时自动获得选品编号：

```text
xpYYMMDDNNN
```

状态变化不改变选品编号。

例如：

```text
xp260908001  pending
xp260908001  selected
xp260908001  converted -> mh0000002
```

## 5. 前台显示原则

列表和对象工作区只需要清楚显示：

- 选品编号
- 状态
- 负责人
- 商品

平台通用审计字段、状态历史、创建人、创建时间等由系统自动记录，不增加前台录入负担。

## 6. 不进入ProductOpportunity状态机的内容

以下属于正式Product或后续工作台，不放进ProductOpportunity状态：

- SKU补全中
- 图片制作中
- 图片待确认
- 待上架
- 已上架
- 已出单
- 优化中

避免一个状态字段跨越选品、商品、设计、发布、运营多个业务阶段。

## 7. 当前锁定结论

V1 ProductOpportunity状态机：

```text
pending -> selected -> converted
   └----> rejected
```

四个状态足以支撑当前直发选品最小闭环。
