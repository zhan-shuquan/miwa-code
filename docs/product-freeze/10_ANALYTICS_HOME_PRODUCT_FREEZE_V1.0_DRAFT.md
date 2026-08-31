# 10｜分析之家 Product Freeze V1.0 Draft

状态：Draft / 待冻结
适用：美和AIONE一体化工作平台（AIONE）

## 1. 定位
分析之家是AIONE统一的经营分析与管理决策视图域，负责把各业务域的真实数据转化为指标、趋势、对比、异常、预测、洞察和决策支持。

分析之家不拥有商品、工作、人才、AI、渠道、客户、供应、财务等原始交易/主数据事实，不建立第二套业务数据库。分析结果必须可以追溯到来源对象、来源指标、计算规则和数据时间。

## 2. 目录与层级
- 10_00_概览
- 10_01_经营分析
- 10_02_事业分析
- 10_03_商品分析
- 10_04_渠道分析
- 10_05_客户分析
- 10_06_供应分析
- 10_07_工作分析
- 10_08_人才分析
- 10_09_AI分析
- 10_10_财务分析
- 10_11_产能分析
- 10_90_分析资料管理

原则：分析中心按稳定分析主题组织，不为每一个图表、指标或报表建立新的Page Type或独立数据模型。

## 3. 核心分析对象
- MetricDefinition：指标定义
- DimensionDefinition：分析维度定义
- MetricValue / AnalyticalFact：计算后的指标值或分析事实
- DashboardDefinition：仪表盘定义
- ReportDefinition：分析报表定义
- AnalysisView：分析视图
- InsightRecord：洞察记录
- AlertRule：异常/预警规则
- ForecastRecord：预测结果
- AnalysisSnapshot：特定时间点快照

原则：分析对象描述“如何理解数据”，不复制来源业务对象。

## 4. 唯一事实源边界
分析之家可以拥有：指标定义、维度定义、分析语义、Dashboard配置、分析快照、预警规则、洞察和预测结果。

分析之家不拥有：
- Product / SKU / Inventory → 商品之家
- Counterparty / Customer / Supplier → 往来之家
- Channel / Store / Platform → 渠道之家
- WorkItem / WorkResult → 工作之家
- Person / Talent facts → 人才之家
- AIAsset / AI usage事实 → AI之家
- Revenue / Expense / AR/AP / Cash / Cost → 财务之家

这些事实通过Reference、分析副本或数据仓库进入分析层。

## 5. 分析数据架构原则
建议长期采用：业务事实源 → ETL/ELT或事件同步 → Analytical Store / BigQuery → Semantic Layer → Dashboard / Report / AI Analysis。

分析副本用于查询、聚合和历史趋势，不反向覆盖交易系统主数据。

所有关键指标必须具备：定义、公式、单位、维度、过滤范围、时区、数据来源、刷新频率、负责人、版本。

## 6. BigQuery / Looker边界
BigQuery可作为AIONE分析数据仓库和历史分析副本。

Looker可作为治理型BI语义层和管理分析能力；Looker Studio可作为轻量报表与展示工具。

AIONE负责业务对象、权限语义、指标口径和业务上下文；外部BI工具不得成为业务交易事实源。

## 7. 分析主题边界
经营分析：公司整体经营状态、目标、收入、利润、增长、风险等跨域管理视图。
事业分析：按Business查看目标、计划、结果、贡献、趋势。
商品分析：商品/SKU销量、毛利、库存效率、生命周期、结构等。
渠道分析：平台/店铺/批发/线下/直播等经营表现。
客户分析：客户结构、复购、贡献、生命周期、风险等。
供应分析：供应商表现、交期、质量、成本、稳定性等。
工作分析：工作量、完成率、周期、阻塞、质量、协同等。
人才分析：人员能力、绩效、培养、配置、产能等。
AI分析：AI使用、成功率、修正率、成本、业务贡献、异常等。
财务分析：收入、支出、成本、现金、应收应付、预算差异等。
产能分析：人、AI、团队、流程、设备/资源等可用产能与负荷。

## 8. Page Type映射
- 10_00_概览 → PT-01 Overview Page
- 各主题分析主页 → PT-05 Analytics Dashboard
- 指标/明细列表 → PT-02 Object List Page
- 单指标/单分析对象详情 → PT-03 Object Workspace（需要时）
- 指标、维度、预警规则配置 → PT-06 Configuration Page
- 外部BI/数据源接入 → PT-08 Integration Page
- 分析资料管理 → PT-02 Object List + File & Asset

不为“商品分析页、人才分析页、财务分析页”分别造新Page Type。

## 9. Dashboard First
分析之家默认采用Dashboard First：先看关键指标和异常，再逐层Drill Down到维度、对象和来源事实。

推荐层级：
KPI概览 → 趋势/对比 → 异常/结构 → 明细 → 来源对象。

不得把所有指标一次性平铺成超长页面。

## 10. View / Scope
Scope建议：集团、法人、事业、部门、团队、渠道、商品、客户、供应商、负责人、期间、地区、币种、权限等级。

时间Scope至少支持：今日、本周、本月、本季度、本年、自定义期间、同比、环比。

所有Scope必须作用于同一分析语义，不复制第二套指标。

## 11. 指标治理
MetricDefinition至少包含：metric_id/code、name、definition、formula、unit、aggregation、dimensions、source_refs、time_grain、currency_policy、timezone_policy、owner、status、version、effective_from、effective_to。

同一个经营概念原则上只能存在一个CURRENT正式指标定义。

示例：毛利率、库存周转、任务完成率、AI成功率等必须有统一口径，禁止不同页面自己计算。

## 12. 维度治理
常用维度包括：时间、事业、法人、部门、人员、商品、SKU、品牌、分类、渠道、店铺、客户、供应商、地区、币种、AIAsset、WorkType等。

维度ID必须引用正式业务对象或受控分析维表，不用自由文本长期作为主维度。

## 13. 数据新鲜度与版本
每个Dashboard/Metric必须显示或可查询：last_refreshed_at、source_period、data_latency、metric_version。

对管理决策重要的数据，如果存在延迟、缺失或部分同步，必须明确标记。

## 14. 权限
至少支持Role、Scope、Object、Field、Action Permission，并叠加分析级数据权限。

分析权限不得绕过来源事实的权限边界。比如无权查看个人报酬明细的用户，不应通过分析之家反推出个人薪酬。

分析之家现有长期分层可继续作为权限视图参考：L1共用、L2业务、L3管理、L4机密；最终技术实现应落到统一Permission Engine。

## 15. 预警与异常
AlertRule负责定义确定性阈值和异常规则，例如：库存低于安全线、应收逾期、任务超期、AI失败率超过阈值、预算偏差过大。

确定性异常优先规则化；AI用于解释原因、归纳模式和给出建议。

每个预警应包含：规则、阈值、对象范围、严重程度、责任人、触发时间、处理状态、来源指标。

## 16. AI经营分析
AI可以在分析之家提供：摘要、异常解释、原因候选、趋势解读、经营建议、问题追问、自然语言查询、管理报告草稿。

AI不能直接修改正式指标口径，也不能把推测当作事实。

AI输出应明确区分：事实、计算结果、推断、建议、预测。

所有AI调用统一经过AIONE AI Gateway，并记录Trace、数据范围和模型版本。

## 17. 预测
ForecastRecord必须保存：预测对象、预测期间、模型/方法、输入数据范围、生成时间、置信区间或不确定性说明、版本、实际结果回填。

预测不能与已发生事实混为同一指标值。

## 18. 产能分析
产能分析用于支持“按产能配置资源”。

至少可覆盖：人员可用产能、团队负荷、标准处理时间、实际处理时间、AI处理能力、自动化吞吐、瓶颈、待办量、资源缺口。

产能指标必须基于真实日志/工时/工作结果，示例数字不得冒充正式产能。

## 19. Drill Down与来源追溯
所有重要KPI应尽量支持：Dashboard → Metric → Dimension breakdown → Object list → Source object。

用户必须能够回答“这个数字从哪里来的、按什么规则算的、最后更新时间是什么”。

## 20. 报表与Publication
分析结果可通过统一Publication Layer支持分享、下载、打印、定期输出。

正式管理报表应固定指标口径和版本，并记录生成时间、数据期间、权限范围。

不得通过导出文件形成无人维护的第二套长期数字事实源。

## 21. 资料管理
分析方法、指标说明、管理报表模板、分析报告等使用统一File & Asset，并与Metric/Dashboard/Report关联。

正式长期方法论和经营知识可进一步沉淀到知识之家；分析之家保留分析上下文与引用。

## 22. 异常治理
必须处理：同一指标多套口径、页面各自计算、分析副本覆盖主数据、Dashboard硬编码SQL/规则、时区/币种不一致、数据延迟不标记、权限穿透、预测与事实混淆、AI推测被当成事实、报表数字无法追溯、同一图表组件重复开发。

## 23. 验收标准
1. 分析之家不拥有原始业务交易/主数据事实。
2. 同一正式指标只有一个CURRENT MetricDefinition。
3. 每个重要指标可追溯来源、公式、版本和刷新时间。
4. Dashboard采用统一PT-05和共享图表/过滤组件。
5. BigQuery/Looker等属于分析层，不反向成为交易事实源。
6. 分析权限不得绕过来源数据权限。
7. 预警的确定性部分优先规则化。
8. AI分析区分事实、推断、建议和预测。
9. 产能分析基于真实证据，无真实数据时标记待验证。
10. 当前文档定义Product/Architecture Truth，不自动声明main已实现。

## 24. 当前冻结判断
当前建议状态：Draft / 待横向Review。待12之家完成后统一Review，再决定是否升为CURRENT V1.0。

## 25. 横向Review回写｜2026-08-31
本节优先于前文中与跨之家归属冲突的Draft描述。
- 分析之家只拥有MetricDefinition、DimensionDefinition、Semantic Layer、Dashboard、Insight、Forecast等分析语义与结果，不拥有01～09/11/12的原始交易或主数据事实。
- BigQuery / Looker / Looker Studio均属于分析副本与语义展示层，不得反向成为交易事实源。
- 同一正式指标只能有一个CURRENT定义；其他页面不得自行硬编码第二套公式。
- 分析权限继承来源对象权限，Search/Analytics不得通过聚合或明细穿透敏感数据边界。
- 产能分析必须基于真实日志、工时和结果；无真实数据时标记待验证。
- 公共图表、过滤、日期范围、导出、Publication、权限、Audit统一复用平台能力。
- 本文仍为Draft，待第二轮一致性检查通过后再升级RC。
