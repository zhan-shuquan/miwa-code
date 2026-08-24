# 美和AIONE核心数据模型 V1.0

**状态：验证中｜第6阶段候选**  
**原则：** 页面不是数据库边界；一份事实只保存一次；各“之家”从不同视角读取同一份事实。

## 1. 美和9要素与数据库

固定顺序继续为：

`目标｜人｜物｜事｜平台｜时间｜钱｜信息｜结果`

数据库不建立一张“9要素万能表”，而是让稳定业务对象分别承担事实：

- 目标：事业目标、工作目标、AI执行目标
- 人：`people`、`assignments`、工作参与者
- 物：专业业务表 + `object_registry`
- 事：`work_items`、`business_events`
- 平台：`source_system`、`platform_code`
- 时间：业务时间戳、`work_sessions`
- 钱：`money_events`
- 信息：正式知识、`knowledge_routes`、证据
- 结果：`result_facts`、工作结果

## 2. 人与组织主链

`集团/公司/组织 → 事业 → 岗位 → 任职关系 → 人`

关键区分：

- **岗位 Position**：公司需要什么责任，可以提前设计。
- **编制 Headcount**：岗位是否允许产生人力成本，独立于岗位定义。
- **任职 Assignment**：某个人在某时间段真正承担该岗位/事业/组织责任。
- **人 Person**：继续以现有 `public.people` 为唯一人员主数据源，不复制一份人才表。

因此调岗、轮岗、兼任、代理不覆盖历史岗位，而是结束旧Assignment并建立新Assignment。

## 3. 核心对象

### Organization
集团、公司、部门、团队等组织层级。

### Business
事业；支持 `idea → planning → ready → launching → trial → active → ...`，为未来事业蓝图/启动编排保留稳定身份。

### Position
岗位定义，同时预留 `human / ai` 两种岗位类型。AI岗位可使用 `headcount_status=not_applicable`；人类岗位必须区分岗位存在与编制启用。

### Assignment
人-岗位-事业-组织的有效期关系，是人才之家、工作之家、AI秘书上下文和以后权限继承的重要底座。

### Object Registry / Object Relation
用于跨专业系统建立稳定索引和关系，不替代商品、订单、客户、采购等正式专业表。

## 4. 工作与证据

### Work Item
工作之家正式工作事项。

### Work Session
记录有效工作时间结构：

`aione / external / other / break / unclassified`

它不是浏览器“页面开着多久”的监控值，而是以后由事件、外部平台、人工补充等证据推导的经营时间事实。

### Work Evidence
记录：谁、何时、对什么对象、做了什么、产生什么结果。

人才之家只读取汇总，不复制工作事实。

## 5. 钱与结果

### Money Event
所有收入、支出、成本等金额事实统一进入一套金额事件模型，再由收入之家、支出之家、ERP、分析之家按不同视角读取。

### Result Fact
保存阶段或最终结果事实，可是数值指标，也可以是正式文本结果。

## 6. 知识与AI

### Knowledge Route
通过 `knowledge_id + anchor_id` 将页面、对象、字段精准连接到知识、规则、帮助、方法论、标准、制度、SOP。

### AI Execution
只建立未来岗位AI办公室/AI秘书执行日志底座：目标、请求人、AI办公室、模型、Tool调用、成本、结果。第6阶段不接真实GPT，也不让AI直接操作数据库。

## 7. 既有数据库兼容

现有最小数据库的四张表继续保留：

- `public.people`
- `public.external_identities`
- `public.product_opportunities`
- `public.activity_logs`

V1.7迁移不删除、不重命名、不复制这些正式事实。

因为当前运行环境没有直接读取线上Cloud SQL元数据，所以 `person_id` 暂时采用TEXT逻辑引用；上线迁移前必须执行preflight确认 `public.people.id` 的实际类型，再决定是否追加物理FK。
