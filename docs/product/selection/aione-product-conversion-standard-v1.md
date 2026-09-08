# AIONE选品转正式商品标准 V1｜Product Freeze

状态：CURRENT FOR PRODUCT FREEZE
日期：2026-09-08
适用项目：美和AIONE一体化工作平台

## 1. 核心结论

商品机会在`selected`状态下仍然属于选品对象，不立即生成美和正式商品ID。

只有当该商品已经确认进入正式商品流程，并创建`Product`对象时，才生成美和商品ID，例如：

```text
mh0000002
```

同时将对应`ProductOpportunity`状态更新为：

```text
converted
```

## 2. 转换时点

V1统一采用以下时点：

```text
ProductOpportunity = selected
        ↓
确认进入正式商品流程
        ↓
创建 Product
        ↓
系统生成 mh000000x
        ↓
建立 ProductOpportunity -> Product 永久关联
        ↓
ProductOpportunity = converted
```

## 3. `selected` 与 `converted` 的边界

### selected｜已通过

表示：

- 商品机会已通过选品判断。
- 可以继续补充SKU与原始素材。
- 但还没有正式Product。
- 还没有美和正式商品ID。

### converted｜已转正式商品

表示：

- 正式Product已创建。
- 美和正式商品ID已生成。
- 后续SKU、MediaAsset、图片命名、渠道发布等正式业务均围绕Product展开。

## 4. 为什么不在导入或选品通过时立即生成商品ID

原因：

- 避免大量候选或最终放弃的商品占用正式商品编号。
- 明确区分“商品机会”和“正式商品”。
- 保持`mh000000x`作为正式商品主键，不被临时候选污染。
- 后续正式图片统一围绕美和商品ID命名。

## 5. 编号关系

选品阶段：

```text
xp260908001
```

正式商品阶段：

```text
mh0000002
```

永久关联：

```text
ProductOpportunity.selection_no = xp260908001
Product.product_id = mh0000002
```

两者职责不同，不互相替代。

## 6. 转换后职责边界

ProductOpportunity继续保留：

- 选品编号
- 选品来源
- 原始1688商品ID
- 分组/标签/备注
- 负责人
- 选品评论与判断记录
- 选品状态历史

Product负责后续正式业务：

- SKU
- 图片与视频
- 商品资料
- 成本与定价
- 渠道发布
- 库存
- 订单关联
- 经营结果

不得让ProductOpportunity继续承载正式商品生命周期状态。

## 7. V1转换最低条件

V1不把门槛设计得过重。创建正式Product前至少满足：

- ProductOpportunity状态为`selected`
- 已明确AIONE正式分类
- 已确认该商品确实继续推进

SKU与素材可以在Product创建前后补充，不作为强制阻塞条件，避免直发流程变重。

## 8. 系统行为

当有权限用户执行“转为正式商品”时，系统应原子完成：

1. 创建Product。
2. 生成唯一`mh000000x`。
3. 建立ProductOpportunity与Product关联。
4. 将ProductOpportunity状态改为`converted`。
5. 写入统一审计日志。

如果任一步骤失败，不应出现“已converted但没有Product”或“Product已创建但未关联”的半完成状态。

## 9. 当前锁定结论

> `selected` = 已通过选品，但仍是商品机会。

> `converted` = 正式Product已创建，并生成`mh000000x`。

> 美和商品ID只在正式Product创建时生成。
