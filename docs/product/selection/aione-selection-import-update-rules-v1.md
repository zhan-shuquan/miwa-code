# AIONE选品导入更新规则 V1｜Product Freeze

状态：CURRENT FOR PRODUCT FREEZE
日期：2026-09-08
适用项目：美和AIONE一体化工作平台

## 1. 核心原则

1688选品池Excel重复导入时，AIONE必须区分“外部来源字段”和“AIONE内部工作字段”。

外部来源字段可以按规则刷新；AIONE内部协作、状态和正式业务数据不得被Excel覆盖。

## 2. 去重主键

统一使用：

```text
source_platform + source_item_id
```

1688示例：

```text
1688 + 855305580969
```

如果已存在对应ProductOpportunity：

- 不创建新对象
- 不生成新选品编号
- 沿用原`selection_no`
- 执行字段级更新

## 3. 允许自动更新的外部字段

重复导入时，以下字段允许由最新1688导出值覆盖：

```text
source_title
source_url
source_cover_image_url
source_price
source_supplier_name
source_group
source_tags
source_note
```

说明：这些字段代表外部来源当前事实或外部操作结果，本质上属于Source Snapshot。

## 4. 不允许被Excel覆盖的AIONE内部字段

以下字段不得因重复导入而被覆盖：

```text
selection_no
status
owner
priority
internal_category_id
internal_tags
comments
followers
favorites
attachments
ai_summary
ai_suggestion
converted_product_id
```

以及平台统一：

```text
created_by
created_at
updated_by
updated_at
```

审计字段由系统自身维护。

## 5. 时间字段规则

### source_added_at

1688选品池“加入时间”。

首次导入时写入；后续重复导入默认不覆盖，除非当前值为空且新文件中存在有效时间。

原因：它代表商品首次进入外部选品池的时间，不应因重复导出而漂移。

### imported_at / last_imported_at

AIONE单独记录：

```text
first_imported_at
last_imported_at
```

首次导入写入`first_imported_at`；每次成功处理该商品时更新`last_imported_at`。

## 6. 选品编号保护

首次创建ProductOpportunity时自动生成：

```text
xpYYMMDDNNN
```

一旦生成：

- 永不修改
- 重复导入不重新编号
- 状态变化不重新编号
- 转正式商品后仍保留

## 7. 已转正式商品后的导入规则

如果ProductOpportunity已经是：

```text
converted
```

再次导入1688选品Excel时：

- 仍可更新其外部来源快照字段
- 不得直接覆盖正式Product字段
- 正式Product是否同步来源变化，必须由后续独立的Product Source Sync规则决定

V1阶段不让选品Excel直接修改正式商品主数据。

## 8. 空值覆盖原则

默认：

> 空值不覆盖已有有效值。

例如新导出文件某条`source_note`为空，而AIONE已有来源备注，则保留原值。

只有明确支持“清空”语义的未来导入模式，才允许空值覆盖。

## 9. 批量导入结果

一次导入应至少统计：

```text
新增数量
更新数量
重复数量
跳过数量
错误数量
```

并保留导入批次结果，便于追溯和排错。

V1可先实现轻量Import Batch记录，不要求复杂审批。

## 10. V1字段更新总结

```text
外部来源事实 -> 可自动更新
AIONE内部工作字段 -> 不可覆盖
选品编号 -> 永久保护
首次来源时间 -> 原则上不覆盖
正式Product -> 不被选品Excel直接修改
空值 -> 默认不覆盖有效值
```

## 11. 当前锁定结论

重复导入的目标不是“重新建立一份选品数据”，而是：

> 基于同一个ProductOpportunity，刷新允许更新的外部来源快照，同时保护AIONE内部正式工作事实。
