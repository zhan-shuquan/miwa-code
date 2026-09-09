# AIONE选品导入 Inbox 与 Import Batch 标准 V1｜Product Freeze

状态：CURRENT FOR PRODUCT FREEZE
日期：2026-09-09
适用项目：美和AIONE一体化工作平台

## 1. 核心目标

把1688官方采购助手导出的选品Excel与商品素材ZIP作为AIONE选品入口文件，通过Google Drive统一接收，并由AIONE Import Layer自动处理。

V1只解决最小真实闭环：

```text
1688选品池
-> 人工补充最少来源事实（姓名分组 / 直发提示标签 / 单件重量）
-> 导出Excel + 下载商品ZIP
-> Google Drive单层Import Inbox
-> AIONE识别文件
-> 创建Import Batch
-> 解析Excel
-> 按1688商品ID匹配ZIP
-> 去重 / 自动编号 / 自动分类
-> 创建或更新ProductOpportunity
-> 输出批次结果
```

不在V1引入复杂审批、人工逐条导入、多层文件流转或1688 API前置依赖。

## 2. Google Drive定位

Google Drive是：

- 原始导入文件的统一入口
- 原始证据与人工可查看文件的事实源
- 员工最小操作的投递位置

AIONE数据库是：

- 正式结构化业务数据
- 导入状态
- 选品对象
- 去重关系
- 自动分类结果
- 审计和统计

不得让AIONE长期依赖Excel作为业务数据库。

## 3. V1目录原则｜单层投递箱

CURRENT唯一入口：

```text
美和集团（全球）/
└─ 06_商品之家/
   └─ 06_01_选品中心/
      └─ 01_1688选品提交/
         ├─ 选品池导出.xlsx
         ├─ 选品池导出 (1).xlsx
         ├─ 1688_<商品ID>_<商品名称>.zip
         └─ ...
```

正式规则：

- 不按人员建子文件夹。
- 不按日期建子文件夹。
- 员工不需要手工改Excel文件名。
- 员工不需要手工改ZIP文件名。
- 员工不需要解压ZIP。
- Excel与ZIP直接放在`01_1688选品提交`同一级。
- 人员、日期、商品关系由文件内容、Drive file id和1688商品ID表达，不依赖文件夹表达。

处理成功/失败状态写入AIONE ImportBatch。后续若需要归档，归档由系统自动完成，不增加员工操作步骤。

旧`pending / processed / error`人工目录方案废止，不再作为CURRENT。

## 4. 1688端最小人工操作

### 一次性动作

员工只需在1688选品池建立自己的姓名分组一次，例如：

```text
占树全
占金玲
...
```

### 每个商品必要补充

1. 需要直发测试的商品打`直发选品`标签。
2. 备注填写1688网店显示的单件重量，只填数字，默认单位g。

示例：

```text
240
44
350
```

不得要求员工重复填写系统可以自动取得的字段。

### 每批提交动作

```text
勾选本批商品
-> 批量移动到自己的姓名分组
-> 导出选品Excel
-> 下载对应商品ZIP素材
-> Excel + ZIP直接放入01_1688选品提交
```

## 5. Excel V1已验证字段 Contract

1688选品池Excel已验证包含：

```text
序号
商品标题
商品ID
商品链接
图片地址
商品价格
加入时间
平台
店铺名称
所属分组
标签
备注
```

AIONE映射：

```text
商品ID   -> source_ref
商品标题 -> title
商品链接 -> source_url
图片地址 -> source_cover_image_url
商品价格 -> source_price
加入时间 -> source_added_at / selection_date优先来源
平台     -> source_platform
店铺名称 -> source_supplier_name
所属分组 -> source_group（提交人/来源负责人事实）
标签     -> source_tags
备注纯数字 -> source_weight_g
```

`source_platform + source_ref`为外部唯一键。

## 6. 直发标签语义

1688来源标签`直发选品`必须保留，但它不是AIONE第二套选品类型。

AIONE统一只有一个选品对象：

```text
ProductOpportunity
```

来源标签转换为：

```text
source_fulfillment_hint = direct
```

标签为空或非直发时，不自动写`regular`，而是保持无特殊提示。

最终履约方式由后续成本、物流、利润规则计算决定，允许与来源人工提示不同。

## 7. 重量字段语义

备注中的纯数字按克解析：

```text
source_weight_g
```

它代表1688网店显示的来源重量，不得冒充最终物流计费重量。

后续可形成：

```text
source_weight_g
-> packaging_weight_g
-> actual_gross_weight_g
-> volumetric_weight_g
-> billable_weight_g
```

V1在没有更准确物流事实时，可暂用`source_weight_g`做成本估算，但必须保留来源语义。

## 8. 商品素材ZIP Contract

1688采购助手已验证ZIP文件名：

```text
1688_<商品ID>_<商品名称>.zip
```

示例：

```text
1688_855305580969_新疆棉袜子....zip
```

AIONE只依赖其中的1688商品ID进行确定性匹配，不依赖中文商品名称。

ZIP内部已验证结构：

```text
主图/
sku图片/
详情/
视频/
```

对应：

```text
主图    -> source_main_image
sku图片 -> source_sku_image
详情    -> source_detail_image
视频    -> source_video
```

ZIP保持原包进入Inbox，不要求员工解压。AIONE负责Parse / Validate / Classify / Link / Store。

## 9. Import Batch对象

每个进入AIONE并开始处理的选品Excel，创建一个`ImportBatch`。

V1最小字段：

```text
id
source_type
source_file_id
source_file_name
source_file_path
source_file_hash
source_file_modified_at
source_file_size
status
record_count
created_count
updated_count
skipped_count
error_count
started_at
finished_at
created_at
```

其中：

```text
source_type = 1688_selection_pool
```

## 10. Import Batch状态

V1只保留4个：

```text
pending
processing
completed
failed
```

不增加复杂中间状态。

## 11. 批次处理规则

处理顺序：

```text
扫描单层Drive Inbox
-> 识别Excel与1688 ZIP
-> 读取Excel
-> 校验表头/格式
-> 建立ImportBatch
-> 逐行解析
-> 按source_platform + source_ref去重
-> 解析source_group / source_tags / source_weight_g
-> 新记录生成xpYYMMDDNNN
-> 自动分类
-> 创建/更新ProductOpportunity
-> 按商品ID关联已存在ZIP
-> 统计结果
-> 批次completed或failed
```

V1允许Excel先到、ZIP后到或ZIP先到、Excel后到。AIONE按1688商品ID最终匹配，不要求员工控制上传顺序。

## 12. 行级错误处理

V1允许“部分成功”。

- 某几行失败，不阻塞整批有效记录导入。
- 失败行计入`error_count`。
- 成功行正常写入AIONE。
- 只有文件整体无法解析或关键结构缺失时，ImportBatch才标记`failed`。

## 13. 文件重复处理保护

文件级防重复优先使用：

```text
Google Drive file_id
+ modified_time
+ file content hash
```

商品级去重统一使用：

```text
source_platform + source_ref
```

重复导出：

```text
选品池导出.xlsx
选品池导出 (1).xlsx
选品池导出 (2).xlsx
```

均允许进入Inbox；不得依赖文件名判断业务唯一性。

## 14. 人工操作原则

员工不需要：

- 手工逐条导入AIONE
- 按人员/日期整理Drive文件夹
- 改Excel文件名
- 改ZIP文件名
- 解压ZIP
- 手工匹配图片与商品

理想V1体验：

```text
员工在1688完成最少事实补充
-> 导出Excel + ZIP到Drive Inbox
-> AIONE自动处理
-> 页面看到本批导入结果
-> 直接进入选品工作
```

人工只处理：

- 文件级错误
- 分类异常
- 商品业务判断
- 后续必要真实性确认

## 15. 当前锁定结论

> `01_1688选品提交`是单层投递箱，Excel与原始ZIP同级进入，不再按人员建立子目录。

> 1688姓名分组用于表达来源人员事实；Google Drive目录不重复表达人员。

> 直发选品只作为来源履约提示，不形成第二套选品对象或页面。

> 备注纯数字按克解析为`source_weight_g`。

> Excel与ZIP通过1688商品ID确定性关联。

> 每个Excel形成轻量ImportBatch；重复文件与重复商品必须幂等处理。

> 本标准是2026-09-09起1688 -> Google Drive -> AIONE导入的CURRENT Product Freeze。
