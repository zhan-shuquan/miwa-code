/* ========================================
   AIONE AI Capability Registry V1.0
   Purpose:
   - AI talent / AI job / model remain internal management concepts.
   - Employees only see context-matched 美和AI capabilities.
   - Capabilities are business abilities, not vendor/model choices.
======================================== */

const capability = (code, label, description, prompt, options = {}) => Object.freeze({
  code,
  label,
  description,
  prompt,
  intent: options.intent || "analyze",
  writePolicy: options.writePolicy || "read_only",
  requiresObject: options.requiresObject === true
});

const DEFAULT_CAPABILITIES = Object.freeze([
  capability("aione.summarize_current_context", "总结当前页面", "提炼当前页面最值得关注的信息", "总结当前页面与业务上下文，先列事实，再列缺口和下一步。"),
  capability("aione.check_gaps", "检查异常和缺口", "识别数据、流程或状态中的问题", "检查当前页面的数据、流程、状态与责任缺口；没有证据的内容标记待确认。"),
  capability("aione.next_actions", "生成下一步建议", "结合当前上下文提出可执行动作", "结合当前业务上下文提出最少且可执行的下一步，不要为了完整而增加无必要步骤。"),
  capability("aione.related_objects", "查找关联业务对象", "梳理上下游对象与业务关系", "梳理当前对象的上游、下游和关键关联对象，并标记缺失关联。")
]);

const ROUTE_CAPABILITIES = Object.freeze({
  selection: Object.freeze([
    capability("selection.analyze_opportunity_pool", "分析商品机会", "结合当前选品数据判断机会、缺口与优先级", "分析当前选品工作台的商品机会；基于真实数据、规则和证据给出重点，不要编造。"),
    capability("selection.check_profit_risk", "检查利润与风险", "检查成本、利润和关键异常", "检查当前选品上下文中的成本、利润、毛利与关键风险；确定性数值优先使用系统已有计算结果。"),
    capability("selection.sample_decision", "判断是否需要测样", "按现有规则判断是否值得启动按需测样", "判断当前商品机会是否需要进入按需测样。先说明已有证据、缺失证据、触发测样的原因，再给建议。"),
    capability("selection.generate_summary", "生成选品摘要", "整理成可交接的业务摘要", "生成当前选品上下文的交接摘要，包含商品机会、关键数据、风险、结论与下一步。")
  ]),
  sampling: Object.freeze([
    capability("sampling.check_missing", "检查测样缺失项", "检查资料、样品与验证字段是否完整", "检查当前测样上下文的缺失项和阻断项。"),
    capability("sampling.analyze_cost", "分析样品成本", "结合实测与成本数据识别异常和风险", "分析当前样品实测数据对成本、利润和后续判断的影响。"),
    capability("sampling.conclusion", "判断测样结论", "汇总测样证据并给出下一步建议", "基于当前测样证据给出结论建议；证据不足时明确待确认。"),
    capability("sampling.prepare_handoff", "准备后续交接", "整理进入下一业务环节需要的信息", "整理当前测样结果的交接信息、异常、责任与下一步。")
  ]),
  "customer-home": Object.freeze([
    capability("customer.summary", "总结客户空间", "汇总客户分类、状态与当前重点", "总结当前客户上下文的重点事实和状态。"),
    capability("customer.followup", "识别待跟进客户", "寻找当前最需要行动的客户对象", "识别当前需要跟进的客户并说明依据。"),
    capability("customer.check_gaps", "检查客户资料缺口", "识别联系、交易与维护信息缺失", "检查当前客户资料和关系信息缺口。"),
    capability("customer.next_actions", "生成跟进建议", "给出客户维护与下一步行动建议", "根据当前客户上下文生成最必要的跟进动作。")
  ]),
  "supplier-home": Object.freeze([
    capability("supplier.risk", "检查供应商风险", "识别交期、价格、质量与资料风险", "检查当前供应商上下文的交期、价格、质量和资料风险。"),
    capability("supplier.summary", "总结供应关系", "汇总当前供应商的重要业务关系", "总结当前供应关系、关键条件和待确认事项。"),
    capability("supplier.quote_change", "检查报价变化", "寻找采购价格和条件变化", "检查供应商报价和采购条件变化及其经营影响。"),
    capability("supplier.communication", "生成沟通重点", "整理下一轮供应商确认事项", "整理下一轮与供应商沟通时必须确认的重点。")
  ]),
  "product-home": Object.freeze([
    capability("product.summary", "总结当前商品", "提炼商品经营与供应链关键事实", "总结当前商品的经营、供应链和状态事实。"),
    capability("product.check_data", "检查商品资料", "识别商品字段和关联信息缺口", "检查当前商品资料、字段与关联关系缺口。"),
    capability("product.performance", "分析经营表现", "结合可用数据分析销售与利润", "分析当前商品已有经营数据、销售和利润表现。"),
    capability("product.related_objects", "寻找关联对象", "关联分类、供应商、店铺与业务记录", "梳理当前商品与分类、供应商、店铺和业务记录的关联。")
  ]),
  analysis: Object.freeze([
    capability("analysis.explain_anomaly", "解释异常指标", "分析当前指标变化可能的业务原因", "解释当前分析页面异常指标，区分事实、推断与待确认。"),
    capability("analysis.key_points", "提炼经营重点", "从当前分析页识别最关键结论", "从当前分析上下文提炼最重要的经营结论。"),
    capability("analysis.root_cause", "寻找关联原因", "连接商品、店铺、库存与运营信息", "寻找当前指标变化与商品、店铺、库存、运营等对象的关联原因。"),
    capability("analysis.actions", "生成行动建议", "把分析结论转换为下一步动作", "把当前分析结论转为少量、明确、可执行的经营动作。")
  ]),
  "ai-home": Object.freeze([
    capability("ai.capability_inventory", "盘点AI能力", "整理Skill、Agent、Connector和工具资产", "盘点当前AI能力资产及其真实使用状态。"),
    capability("ai.automation_candidate", "识别可自动化流程", "寻找稳定、高频、可标准化的工作", "识别当前业务中适合规则、API、Skill、Agent或Computer Use的流程。"),
    capability("ai.capability_gap", "检查能力缺口", "判断当前业务还缺哪些AI基础能力", "检查当前AI能力缺口并说明是否真的需要新增。"),
    capability("ai.evidence", "整理真实验证", "把AI实际使用证据沉淀成能力履历", "整理AI实际使用证据、效率改善和适用边界。")
  ]),
  "ai-office": Object.freeze([
    capability("ai_office.continue", "继续当前任务", "读取当前岗位AI办公室的任务上下文", "读取当前岗位AI办公室任务上下文并继续执行。"),
    capability("ai_office.decompose", "拆解复杂任务", "将目标拆为可执行、可确认的步骤", "把当前目标拆成最少必要步骤，并标记哪些需要人工确认。"),
    capability("ai_office.evidence", "检查执行证据", "查看结果、日志和人工确认是否完整", "检查当前任务执行证据、日志和人工确认是否完整。"),
    capability("ai_office.report", "形成经营汇报", "将任务结果整理成管理判断材料", "将当前任务结果整理成简明经营判断材料。")
  ])
});

const OBJECT_CAPABILITIES = Object.freeze({
  "selection:product_opportunity": Object.freeze([
    capability("selection.analyze_opportunity", "分析商品机会", "结合当前商品机会与系统数据判断价值、缺口和风险", "分析当前商品机会。优先读取当前商品机会真实字段、成本/定价系统计算结果、来源资料和状态；没有数据的地方标记待确认。", { requiresObject:true }),
    capability("selection.check_profit_risk", "检查利润与风险", "检查当前商品的成本、利润、毛利与关键异常", "检查当前商品机会的利润与风险。确定性数值以AIONE当前成本/定价计算结果为准，不要让模型重新猜数值。", { requiresObject:true }),
    capability("selection.sample_decision", "判断是否需要测样", "判断是否有必要启动按需测样及其原因", "判断当前商品机会是否需要启动按需测样。区分必须测样、建议测样、暂不需要，并说明证据、风险与缺失项。", { requiresObject:true }),
    capability("selection.generate_summary", "生成选品摘要", "生成当前商品机会可直接交接的结构化摘要", "生成当前商品机会摘要：商品与来源、成本/定价、主要风险、测样建议、当前状态和下一步。", { requiresObject:true })
  ]),
  "sampling:product_opportunity": Object.freeze([
    capability("sampling.check_missing", "检查测样缺失项", "检查当前商品测样资料与证据是否完整", "检查当前商品机会的测样资料、证据和校验缺失项。", { requiresObject:true }),
    capability("sampling.analyze_cost", "分析样品成本", "分析实测数据对成本与利润的影响", "分析当前商品机会样品实测数据对成本、利润和上架判断的影响。", { requiresObject:true }),
    capability("sampling.conclusion", "判断测样结论", "基于已有证据形成测样结论建议", "基于当前商品机会的测样证据形成结论建议；没有足够证据时明确不能下结论。", { requiresObject:true }),
    capability("sampling.prepare_handoff", "准备选品回写", "整理测样结果回写选品所需的信息", "整理当前测样结果需要回写选品记录的事实、异常、成本变化与建议。", { requiresObject:true })
  ])
});

export function getCapabilitiesForAIContext(context = {}) {
  const workbenchId = context?.workbench?.id || context?.routeId || "";
  const objectType = context?.object?.type || "";
  const objectKey = workbenchId && objectType ? `${workbenchId}:${objectType}` : "";
  if (objectKey && OBJECT_CAPABILITIES[objectKey]) return OBJECT_CAPABILITIES[objectKey];
  if (ROUTE_CAPABILITIES[context?.routeId]) return ROUTE_CAPABILITIES[context.routeId];
  if (ROUTE_CAPABILITIES[workbenchId]) return ROUTE_CAPABILITIES[workbenchId];
  return DEFAULT_CAPABILITIES;
}

export { DEFAULT_CAPABILITIES, ROUTE_CAPABILITIES, OBJECT_CAPABILITIES };
