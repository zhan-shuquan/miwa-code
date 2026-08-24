# V1.9.17 | 美和AI Context Router Candidate

Status: candidate baseline.

Purpose: make 美和AI a single business-facing intelligent capability layer. The employee works on the business object; AIONE reads the current context and automatically routes the relevant capability. AI talent, AI job, Skill, Agent, model and Provider remain internal classification/orchestration concepts and are not employee selection steps.

## Locked user-facing principle

Business page -> AIONE AI Context -> Capability Router -> 美和AI -> Result / Proposal

- 普通员工始终面对一个“美和AI”。
- 员工不选择AI人才、AI岗位、Skill、Agent、模型或Provider。
- AI人才用于能力分类，AI岗位用于责任/场景匹配；它们可以保留在管理体系中，但不增加一线操作步骤。
- 当前事业、工作台、页面、业务对象、对象状态、当前用户与已知业务数据由AIONE自动形成上下文。
- 美和AI根据上下文自动返回当前最有价值的业务能力，而不是显示模型选择器。
- 确定性成本、利润、毛利、运费等系统计算结果优先作为事实输入；模型不得重新猜测固定计算结果。
- 读分析可直接执行；会改变业务数据或状态的动作继续遵守既有 `Intent -> Proposal -> Human Confirm -> Tool -> Result` 边界。

## Selection V1 validation scope

The first real context-routed business object is `selection:product_opportunity`.

When AIONE is on `#/selection/opportunity/<id>`, 美和AI automatically exposes four selection capabilities:

1. `selection.analyze_opportunity` — 分析商品机会
2. `selection.check_profit_risk` — 检查利润与风险
3. `selection.sample_decision` — 判断是否需要测样
4. `selection.generate_summary` — 生成选品摘要

The Context Builder reads the current opportunity id, selection state, source information, current deterministic pricing results, shipping information, sampling evidence and final-decision evidence when available. It uses the same AIONE preview/local workflow state already used by the Selection Workbench and also reads the same-origin detail iframe so current form values can be reflected before persistence when possible.

## UI contract

- Header entry remains `美和AI`.
- Existing Drawer -> AI Workspace -> AI Office progressive layer remains unchanged.
- The composer no longer exposes an employee-facing “技能/工具” choice; it shows passive `能力自动匹配` instead.
- Runtime/provider diagnostics are retained in internal DOM data for development, but ordinary UI no longer displays `OpenAI | model-name`.
- The visible ready state is `美和AI已就绪` (or the explicit preview/configuration state).

## Current write boundary

V1.9.17 does not silently move a product opportunity into sampling. “判断是否需要测样” is an analysis capability. Existing sampling entry/action remains under human control, and future typed sampling proposals must reuse the existing Proposal -> Human Confirm safety boundary rather than bypass it.

## Extension rule

After Selection is validated in real use, other workbenches should reuse the same Context + Capability Registry + Router mechanism. Do not build separate employee-facing AI selectors for Procurement, Design, Listing, Operations, Orders, Inventory or Customer Service.
