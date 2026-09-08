# AIONE选品导入 Inbox 与 Import Batch 标准 V1｜Product Freeze

状态：CURRENT FOR PRODUCT FREEZE
日期：2026-09-08
适用项目：美和AIONE一体化工作平台

## 1. 核心目标

把1688采购助手导出的选品Excel作为AIONE选品入口文件，通过Google Drive统一接收，并由AIONE Import Layer处理。

V1只解决最小闭环：

```text
1688导出
-> Google Drive Import Inbox
-> AIONE识别文件
-> 创建Import Batch
-> 解析记录
-> 去重 / 自动编号 / 自动分类
-> 创建或更新ProductOpportunity
-> 输出批次结果
```

不在V1引入复杂审批、人工逐条导入或多层文件流转。

## 2. Google Drive定位

Google Drive是：

- 原始导入文件的统一入口
- 原始证据归档位置
- 人工可查看的文件事实源

AIONE数据库是：

- 正式结构化业务数据
- 导入状态
- 选品对象
- 去重关系
- 自动分类结果
- 审计和统计

不得让AIONE长期依赖Excel作为业务数据库。

## 3. V1目录原则

V1采用最小三段式：

```text
Import Inbox/
├─ pending/
├─ processed/
└─ error/
```

### pending

新导出、等待AIONE处理的文件。

### processed

成功完成导入处理的原始文件。

### error

文件级处理失败、无法解析或格式不符合要求的文件。

V1不再增加`reviewed / archived / approved`等目录，避免文件流程过重。

## 4. 支持的V1文件类型

当前ProductOpportunity入口只处理：

```text
1688选品池导出Excel
```

SKU Excel、商品素材ZIP属于后续正式商品补全流程，不与选品入口批次混在一起。

## 5. Import Batch对象

每个进入AIONE并开始处理的选品Excel，创建一个`ImportBatch`。

V1最小字段：

```text
id
source_type
source_file_name
source_file_path
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

## 6. Import Batch状态

V1只保留4个：

```text
pending
processing
completed
failed
```

不增加复杂中间状态。

## 7. 批次处理规则

处理顺序：

```text
读取文件
-> 校验表头/格式
-> 建立ImportBatch
-> 逐行解析
-> 按source_platform + source_item_id去重
-> 新记录生成xpYYMMDDNNN
-> 自动分类
-> 创建/更新ProductOpportunity
-> 统计结果
-> 批次completed或failed
-> 原文件移动到processed或error
```

## 8. 行级错误处理

V1允许“部分成功”。

即：

- 某几行失败，不阻塞整批有效记录导入。
- 失败行计入`error_count`。
- 成功行正常写入AIONE。
- 只有文件整体无法解析或关键结构缺失时，ImportBatch才标记`failed`。

避免因为1条脏数据让100条有效选品全部失败。

## 9. 批次统计

每次导入至少记录：

```text
总记录数
新增数量
更新数量
跳过数量
错误数量
自动分类成功数量
待确认分类数量
```

其中自动分类统计可先存批次扩展字段或后续独立统计，不要求V1建立复杂分析表。

## 10. 文件重复处理保护

V1应防止同一个文件被重复消费。

可基于：

- 文件路径
- 文件名
- 文件大小
- 文件内容hash

组合判断。

即使同一文件被重复放入pending，也不应重复创建同一批次业务结果。

商品级去重仍以：

```text
source_platform + source_item_id
```

为准。

## 11. 人工操作原则

员工不需要手工逐条导入。

理想V1体验：

```text
员工从1688导出选品Excel
-> 文件进入Google Drive pending
-> AIONE自动处理
-> 页面看到“本批导入完成”
-> 直接进入商品机会一览
```

人工只处理：

- 文件级错误
- 分类异常
- 商品机会业务判断

## 12. 与后续Technical Design边界

本文件只锁Product Truth与最小业务行为。

以下进入Technical Design，不在Product Freeze继续扩展：

- 本地Watcher具体实现
- Google Drive API / Connector方式
- 后端文件监听机制
- 数据库表结构细节
- 事务与并发
- 文件hash算法
- Import API Contract
- 重试机制
- 日志与监控实现

## 13. 当前锁定结论

> Google Drive作为选品导入文件入口，采用`pending / processed / error`最小三段式。

> 每个选品Excel对应一个轻量`ImportBatch`。

> Import Batch只负责导入追踪和结果统计，不做复杂审批。

> 行级错误允许部分成功，文件级结构错误才导致整批失败。

> 本标准完成后，选品入口Product Freeze达到可进入数据库Schema与Import API Technical Design的条件。
