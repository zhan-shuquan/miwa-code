# AIONE 12之家共性与特性矩阵 V1.0 Draft

状态：待冻结

## 核心原则
- 12之家不是12套系统，而是同一AIONE平台上的12个稳定业务域。
- 共性优先进入 Platform Capability / Shared Component / Page Type。
- 差异优先通过 Object / Field / Workflow / Rule 表达。
- 多个之家共同需要的能力不得重复开发。
- 有唯一事实源的数据，其他之家只通过 Reference / View / Scope 使用。

## 12之家定位
| 家 | 核心定位 | 主要对象/事实 | 主要特化 |
|---|---|---|---|
| 01 美和之家 | 企业根 | Organization / Governance | 集团治理、战略、架构 |
| 02 事业之家 | 经营单元 | Business | 事业经营模型 |
| 03 工作之家 | 执行中心 | WorkItem | 工作状态机、协同、闭环 |
| 04 人才之家 | 人力资产 | Person | 能力、培养、绩效、报酬 |
| 05 AI之家 | AI生产力 | AIAsset / Capability | 训练、能力、绩效、费用 |
| 06 商品之家 | 商品事实源 | Product / SKU / Inventory | 商品、库存、属性、上架 |
| 07 往来之家 | 外部关系事实源 | Counterparty | 多角色关系 |
| 08 渠道之家 | 商业触达层 | Channel | 渠道经营关系 |
| 09 财务之家 | 财务事实源 | FinancialRecord | 会计、税务、资金、成本 |
| 10 分析之家 | 决策分析层 | Metric / Dataset | 指标、语义、下钻 |
| 11 知识之家 | 企业记忆 | KnowledgeItem | 制度、标准、方法、SOP |
| 12 共享之家 | 平台资源层 | SharedAsset / Integration | 系统、工具、资源、集成 |

## 100%平台统一
AppShell、Header、Sidebar、Main、Aside、Footer、Breadcrumb、Tabs、Search、Filter、Sort、ScopeSwitcher、ViewSwitcher、Pagination、Loading、Empty、Error、Dialog、Drawer、Toast、File、Comment、Mention、Favorite、Follow、Owner、Status、Tag、Timeline、Activity、Audit、AI入口、权限检查、通知。

## 配置化而非重写
Sidebar内容、列表列、状态字典、筛选字段、Tabs、表单字段、Dashboard指标等使用 Shared Component + Schema/Config。

## 真正业务特化
仅保留：业务对象字段、业务规则、业务流程、专业算法/计算。

## 唯一事实源原则
- 商品/库存事实：06 商品之家
- 往来主体事实：07 往来之家
- 财务事实：09 财务之家
- 工作事实：03 工作之家
- 知识事实：11 知识之家
- 分析之家只消费事实数据，不复制业务主数据。

## 开发前检查
1. 属于哪个之家？
2. 对应哪个业务对象？
3. 是否已有 Page Type？
4. 是否已有 Shared Component / Business Component？
5. 是否已有 Platform Capability？
6. 是否只是 Scope / View / Config？
7. 最后剩下什么真正需要新开发？
