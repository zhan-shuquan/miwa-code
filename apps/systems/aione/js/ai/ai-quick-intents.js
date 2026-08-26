/* ========================================
   美和AI Quick Intent Registry V1.9.28
   常用能力不是固定问题句子，而是结构化业务意图。
   AI人才 / Skill / Agent / Model仍属于内部调度层。
======================================== */

const quick = (code, label, placeholder, prompt = "", options = {}) => Object.freeze({
  code, label, placeholder, prompt, icon:options.icon || "✦"
});

const GLOBAL = Object.freeze([
  quick("find_assets", "找资料", "告诉我想找哪份资料，例如：最新集团总架构", "帮我查找AIONE正式资料索引中的相关资料。", {icon:"⌕"}),
  quick("find_people", "找人才", "告诉我需要什么样的人才或能力", "根据当前业务目标查找匹配的人才与能力。", {icon:"人"}),
  quick("summarize_page", "总结当前页", "总结当前页面最值得关注的信息", "总结当前页面，先列事实，再列缺口与下一步。", {icon:"≡"}),
  quick("check_gaps", "检查异常", "检查当前页面的异常、缺口和阻断", "检查当前页面的数据、流程、状态和责任缺口。", {icon:"!"}),
  quick("next_actions", "下一步建议", "结合当前上下文给出最必要的下一步", "给出少量、明确、可执行的下一步建议。", {icon:"→"})
]);

const COMPANY = Object.freeze([
  quick("company_find_assets", "找集团资料", "告诉我想找哪份集团资料", "从美和之家正式索引查找集团资料。", {icon:"⌕"}),
  quick("company_latest", "找最新版", "告诉我主题，我来找当前最新版", "查找当前主题对应的最新有效版本。", {icon:"V"}),
  quick("company_analyze", "分析当前内容", "例如：经营架构还有什么可以优化？", "基于当前美和之家页面的正式内容进行分析。", {icon:"析"}),
  quick("company_check_structure", "检查结构缺口", "检查当前内容的逻辑、结构和责任缺口", "检查当前集团内容的逻辑、结构、责任与闭环缺口。", {icon:"!"}),
  quick("company_optimization_list", "形成优化清单", "把分析结果整理成可选择执行的编号清单", "把当前分析整理成1—7条单一、可执行、可验证的编号优化清单，便于我选择其中几项安排下去。", {icon:"清"}),
  quick("company_next", "下一步建议", "结合当前页面给出下一步建设建议", "给出当前集团内容最值得推进的下一步。", {icon:"→"})
]);

const ANALYSIS = Object.freeze([
  quick("analysis_key_points", "提炼重点", "提炼当前分析页最重要的结论", "提炼当前分析页面最关键的经营结论。", {icon:"◎"}),
  quick("analysis_anomaly", "解释异常", "告诉我想重点分析哪个异常", "解释当前异常，区分事实、推断与待确认。", {icon:"!"}),
  quick("analysis_actions", "行动建议", "把当前分析转成可执行动作", "把分析结论转换成少量明确动作。", {icon:"→"})
]);

const WORK = Object.freeze([
  quick("work_review", "复盘工作结果", "基于当前工作目标、证据和结果做复盘", "复盘当前工作事项的目标、执行证据、实际结果和遗留问题。", {icon:"复"}),
  quick("work_evidence", "检查执行证据", "检查当前工作的证据链是否完整", "检查当前工作执行记录、证据链接和结果事实是否足以支持完成结论。", {icon:"证"}),
  quick("work_completion", "判断是否完成", "判断当前工作是否真正达到目标", "判断当前工作是已完成、部分完成、证据不足还是需要返工，并说明依据。", {icon:"✓"}),
  quick("work_next", "下一轮建议", "根据结果形成下一轮最少必要动作", "根据当前工作结果形成下一轮少量动作，并标记可规则化、知识化、Skill化或自动化的内容。", {icon:"→"})
]);

function contextGroup(context = {}) {
  const routeId = String(context.routeId || "");
  if (routeId === "company" || routeId.startsWith("company-")) return "company";
  if (routeId === "analysis" || routeId.startsWith("analysis-")) return "analysis";
  if (routeId === "work" || routeId.startsWith("work-")) return "work";
  return "global";
}

function usageKey(context = {}) {
  const personId = context?.user?.personId || "anonymous";
  return `aione:miwa-ai:quick-intents:v1:${personId}`;
}

function readUsage(context) {
  try { return JSON.parse(localStorage.getItem(usageKey(context)) || "{}"); } catch (_) { return {}; }
}

export function recordQuickIntentUsage(code, context = {}) {
  if (!code) return;
  try {
    const usage = readUsage(context);
    usage[code] = Number(usage[code] || 0) + 1;
    localStorage.setItem(usageKey(context), JSON.stringify(usage));
  } catch (_) {}
}

export function getQuickIntentsForAIContext(context = {}) {
  const group = contextGroup(context);
  const source = group === "company" ? COMPANY : group === "analysis" ? ANALYSIS : group === "work" ? WORK : GLOBAL;
  const usage = readUsage(context);
  return [...source].sort((a,b) => Number(usage[b.code] || 0) - Number(usage[a.code] || 0));
}

export { GLOBAL as GLOBAL_QUICK_INTENTS, COMPANY as COMPANY_QUICK_INTENTS };
