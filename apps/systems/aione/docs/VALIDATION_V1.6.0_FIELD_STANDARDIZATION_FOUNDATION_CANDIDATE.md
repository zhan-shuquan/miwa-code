# AIONE V1.6.0｜字段标准化基础验证记录

**日期：** 2026-08-22  
**状态：** CANDIDATE

## 自动验证范围

### 1. 字段注册中心

验证所有当前标准业务二级页面均通过 `fieldSchemaId` 调用Field Registry，页面配置文件不再保留独立字段数组。

### 2. 字段元数据完整性

每个业务字段检查：

- fieldCode
- label / definition
- dataType
- nineElement
- source
- ownerRole
- captureTiming
- automation
- validation
- knowledge / rule / help route slot
- permission
- history
- event
- ui
- db suggestion

### 3. 美和9要素

固定顺序验证：

`目标｜人｜物｜事｜平台｜时间｜钱｜信息｜结果`

### 4. 关键字段语义验证

已检查：

- 工作之家有效工作时间 → `time`
- 工作之家钱 → `money`
- 工作之家结果 → `result`
- 支出金额 → `money`类型
- 人才姓名 → `people`
- 选品采购单价 → 标准money字段 + 旧存储键兼容

### 5. 标准系统字段

当前对象统一预留：

`id / createdAt / updatedAt / createdBy / updatedBy / recordVersion / sourceSystem / archivedAt`

选品历史商品机会ID继续沿用既有业务ID，因此不重复创建第二个ID语义。

### 6. 运行时调用验证

- 标准业务母版使用统一字段类型进行表单输入类型映射
- 标准业务母版使用统一字段规则进行值转换与必填/格式校验
- 内容母版同样使用Field Registry
- CSV/XLSX导入支持字段label / key / fieldCode / importAliases映射
- 选品批量导入通过统一字段注册表获取历史storageKey

### 7. 回归测试

应同时通过：

- V1.4前3阶段基础架构测试
- V1.5选品成熟业务迁移测试
- 路由完整性检查
- 测样历史专项回归
- V1.6字段标准化专项测试
- 全部活动JS语法检查

## 人工验收建议

本阶段不要求重新逐页验视觉。只需在Windows + Live Server快速确认：

1. 美和之家仍能新建内容；
2. 标准业务之家新建表单能正常打开和保存；
3. 选品卡片/列表、批量导入、详情入口仍正常；
4. 不出现因字段层升级造成的页面结构变化或字段空白。

## 当前结论

V1.6.0的目标是形成**字段业务语义层**，不是宣称所有美和业务字段已经最终锁定。当前结果达到进入“对象关系模型 → 数据库Schema”前的候选基础条件。

## 本次实际自动测试结果

- 活动JS语法检查：54个文件通过
- V1.4前3阶段基础架构回归：通过
- V1.5选品成熟业务迁移回归：通过
- 内部路由/Global Shell单一来源：106个内部路由引用通过
- 测样历史专项回归：通过
- V1.6字段标准化专项：通过
- 当前机器可读目录覆盖：16个当前路由/对象上下文
- 当前去重后的稳定fieldCode：270个（含标准系统审计字段；内容对象跨页面共用同一语义）

> 数量用于验证目录完整性，不代表270个字段都已成为“正式锁定业务字段”；大部分当前状态仍为验证中。
