# AIONE V1.6.0｜字段标准化基础候选基线

**日期：** 2026-08-22  
**阶段：** 第5阶段｜字段标准化  
**状态：** 验证中 / CANDIDATE

## 1. 本轮目标

在二级空母版、标准业务母版、内容母版和选品成熟业务迁移已经验证成立后，把字段从页面代码中抽离，形成数据库与后端之前的统一业务语义层。

本轮不建设正式数据库，不扩展ERP/HR具体业务字段，不讨论页面视觉细节。

## 2. 已完成的架构变化

### 2.1 唯一字段注册中心

新增：

- `js/config/field-registry.js`
- `js/fields/field-types.js`
- `js/fields/field-standard.js`
- `js/config/miwa-nine-elements.js`

业务页面不再各自保存字段数组。`business-page-definitions*.js` 只登记 `fieldSchemaId`，运行时从Field Registry取得标准字段。

### 2.2 字段与美和9要素统一

每个字段必须映射到：

`目标｜人｜物｜事｜平台｜时间｜钱｜信息｜结果`

9要素定义从业务页面配置中抽离为独立唯一配置，避免字段层、组件层各自维护。

### 2.3 标准类型与数据库建议

每个字段统一携带 `dataType` 与未来数据库 `suggestedType`，目前仅作为数据库设计输入，不直接生成正式DDL。

### 2.4 字段来源、责任、自动化和时间点

统一增加：

- source
- ownerRole
- captureTiming
- automation
- validation
- history
- event

后续AI、API与人工表单共享同一字段定义。

### 2.5 知识 / 规则 / 帮助路由接口

每个字段统一预留三类路由。没有正式知识对象时保持 `pending`，不生成假链接。

### 2.6 默认开放权限

普通字段默认内部读取开放；写入按责任控制。真正敏感字段以后单独关闭，不用传统HR/ERP“默认全部封闭”的方式制造障碍。

### 2.7 统一系统审计字段

每类对象统一定义创建/更新人、创建/更新时间、版本、来源系统和归档时间等系统字段。

当前浏览器预演存储层已开始补充：

- `createdBy`
- `updatedBy`
- `recordVersion`
- `sourceSystem`

### 2.8 选品成熟业务兼容

选品当前成熟数据没有重构。

Field Registry通过 `storageKey + importAliases` 将标准字段与既有详情页/批量导入键连接，例如：

- 商品名称 → `selection_opportunity.product_name` → `selection-record-name`
- 采购来源链接 → `selection_opportunity.source_url` → `selection-record-source`
- 采购单价 → `selection_opportunity.purchase_unit_price` → `pricing-purchase-unit`

因此字段标准化不会破坏第4阶段选品迁移成果。

## 3. 当前机器可读字段目录

已生成：

`docs/FIELD_CATALOG_V1.0.json`

该文件是Field Registry的发布快照，可直接作为下一阶段数据库建模、API契约和字段盘点的输入。正式源仍为代码中的Field Registry，不允许反向维护两份。

## 4. 本轮明确不做

- 不创建PostgreSQL正式表结构
- 不迁移当前Cloud SQL
- 不一次性补完美和HR全部字段
- 不一次性补完ERP全部字段
- 不建立工资、福利、调岗等具体业务字段明细
- 不修改测样工作台旧页面
- 不修改选品成熟业务流程
- 不把所有知识路由伪装成已完成

这些进入后续对象/关系模型和数据库阶段逐步锁定。

## 5. 下一阶段入口

字段标准化候选通过后，下一步应进入：

1. 标准业务对象与关系模型；
2. Person / Organization / Business / Position / Assignment等组织核心对象；
3. Work Evidence / Time / Money / Event等集团级事实层；
4. PostgreSQL Schema；
5. 后端API与AIONE Tool Layer。
