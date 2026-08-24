/* Deterministic Preview Provider｜不冒充真实模型，仅验证AI秘书链路 */
function priorityScore(item = {}, personId) {
  let score = 0;
  if (item.assigneeId === personId) score += 30;
  if (item.priority === "urgent") score += 30;
  if (item.priority === "important") score += 20;
  if (item.status === "active") score += 15;
  if (item.status === "pending") score += 10;
  if (item.dueDate) {
    const ms = new Date(`${item.dueDate}T23:59:59`).getTime() - Date.now();
    if (Number.isFinite(ms) && ms < 0) score += 30;
    else if (Number.isFinite(ms) && ms < 86400000) score += 25;
    else if (Number.isFinite(ms) && ms < 3 * 86400000) score += 15;
  }
  return score;
}

function routedBusinessPreview({ capabilityCode, office, contextSnapshot }) {
  if (!capabilityCode) return null;
  const businessContext = contextSnapshot?.page?.businessContext || {};
  const data = businessContext?.data || {};
  const opportunity = data?.opportunity || {};
  const pricing = data?.pricing || {};
  const completeness = data?.dataCompleteness || {};
  const sampling = data?.sampling || {};
  const objectId = businessContext?.objectId || opportunity?.id || "待确认";
  const name = opportunity?.name || "待确认";
  const source = opportunity?.sourcePlatform || "待确认";
  const stage = opportunity?.stageName || businessContext?.state || "待确认";

  if (capabilityCode === "selection.analyze_opportunity") {
    const missing = [];
    if (!completeness.hasProductName) missing.push("商品名称");
    if (!completeness.hasSourceUrl) missing.push("采购来源链接");
    if (!completeness.hasPricingResult) missing.push("成本/定价结果");
    const answer = [
      `${office.name}预演分析（系统已自动匹配“分析商品机会”能力）：`,
      `- 商品机会：${objectId}｜${name}`,
      `- 来源：${source}`,
      `- 当前状态：${stage}`,
      `- 已有成本/定价结果：${completeness.hasPricingResult ? "是" : "否"}`,
      `- 当前缺口：${missing.length ? missing.join("、") : "未发现基础字段缺口"}`,
      "- 说明：当前为确定性预演，只验证上下文读取与能力路由；真实商品价值判断由已配置的美和AI模型结合规则与证据完成。"
    ].join("\n");
    return { mode:"preview", provider:"deterministic-preview", providerDisplayName:"Deterministic Preview", model:null, answer, proposals:[], toolCallCount:0, usage:{inputTokens:0,outputTokens:0} };
  }

  if (capabilityCode === "selection.check_profit_risk") {
    const known = [
      pricing.totalCost ? `总成本：${pricing.totalCost}` : null,
      pricing.finalPrice ? `最终售价：${pricing.finalPrice}` : null,
      pricing.finalProfit ? `最终利润：${pricing.finalProfit}` : null,
      pricing.finalMargin ? `最终利润率：${pricing.finalMargin}` : null,
      pricing.grossMargin ? `毛利率：${pricing.grossMargin}` : null
    ].filter(Boolean);
    const answer = `${office.name}预演检查（系统已自动匹配“检查利润与风险”能力）：\n${known.length ? known.map((v)=>`- ${v}`).join("\n") : "- 当前页面尚未形成可读取的确定性成本/定价结果。"}\n- 数值以AIONE页面规则函数现有计算结果为准；预演模式不重新估算。`;
    return { mode:"preview", provider:"deterministic-preview", providerDisplayName:"Deterministic Preview", model:null, answer, proposals:[], toolCallCount:0, usage:{inputTokens:0,outputTokens:0} };
  }

  if (capabilityCode === "selection.sample_decision") {
    const answer = sampling.status === "completed"
      ? `${office.name}预演判断（系统已自动匹配“判断是否需要测样”能力）：当前商品机会已有已完成测样证据，结论为“${sampling.conclusion || "待确认"}”。无需再次选择AI；应直接基于现有测样证据继续选品判断。`
      : `${office.name}预演判断（系统已自动匹配“判断是否需要测样”能力）：当前测样状态为“${sampling.status || "not_started"}”。${completeness.hasPricingResult ? "成本/定价结果已形成，可结合商品风险与无法从页面确认的实物属性判断是否启动按需测样。" : "请先完成必要的商品数据与成本/定价事实，再判断是否需要按需测样。"} 预演模式不虚构商品风险。`;
    return { mode:"preview", provider:"deterministic-preview", providerDisplayName:"Deterministic Preview", model:null, answer, proposals:[], toolCallCount:0, usage:{inputTokens:0,outputTokens:0} };
  }

  if (capabilityCode === "selection.generate_summary") {
    const answer = [
      `## 选品摘要｜${objectId}`,
      `- 商品：${name}`,
      `- 来源：${source}`,
      `- 状态：${stage}`,
      `- 成本/定价：${completeness.hasPricingResult ? "已形成" : "待形成"}`,
      `- 测样：${sampling.status || "not_started"}`,
      `- 最终判断：${completeness.hasFinalDecision ? (data?.decision?.result || "已形成") : "待形成"}`
    ].join("\n");
    return { mode:"preview", provider:"deterministic-preview", providerDisplayName:"Deterministic Preview", model:null, answer, proposals:[], toolCallCount:0, usage:{inputTokens:0,outputTokens:0} };
  }

  return null;
}

export function runPreviewSecretary({ objective, office, contextSnapshot }) {
  const routed = routedBusinessPreview({ capabilityCode:contextSnapshot?.aiRequest?.capabilityCode, office, contextSnapshot });
  if (routed) return routed;
  const personId = contextSnapshot?.user?.personId;
  const tasks = (contextSnapshot?.work?.tasks || []).filter((item) => item.status !== "done").map((item) => ({ ...item, _score:priorityScore(item, personId) })).sort((a,b) => b._score-a._score);
  const notices = (contextSnapshot?.notifications || []).filter((item) => !item.readAt || (item.requiresAck && !item.acknowledgedAt));
  const events = contextSnapshot?.calendar?.events || [];
  if (/最重要|三件事|优先/.test(objective)) {
    const candidates = [];
    const mine = personId ? tasks.filter((item) => item.assigneeId === personId || item.creatorId === personId) : tasks;
    const shared = personId ? tasks.filter((item) => item.assigneeId !== personId && item.creatorId !== personId) : [];
    mine.slice(0,5).forEach((item) => candidates.push({ score:100 + item._score, title:item.title, why:`工作之家：与本人直接相关 / ${item.priority || "普通"} / ${item.status || "待处理"}${item.dueDate ? ` / 截止${item.dueDate}` : ""}` }));
    notices.slice(0,3).forEach((item) => candidates.push({ score:80 + (item.requiresAck ? 20 : 0) + (item.level === "important" ? 10 : 0), title:item.title, why:`通知：${item.level || "normal"}${item.requiresAck ? " / 需要确认" : ""}` }));
    events.slice(0,3).forEach((item) => candidates.push({ score:70, title:item.title, why:`日程：${item.date || "待确认"} ${item.time || ""}` }));
    shared.slice(0,5).forEach((item) => candidates.push({ score:item._score, title:item.title, why:`共享工作：${item.priority || "普通"} / ${item.status || "待处理"}${item.dueDate ? ` / 截止${item.dueDate}` : ""}` }));
    const top = candidates.sort((a,b) => b.score-a.score).slice(0,3);
    const answer = top.length ? `${office.name}预演分析（未调用模型）：\n${top.map((item,i)=>`${i+1}. ${item.title}\n   依据：${item.why}`).join("\n")}\n\n真实模型接入后，将继续结合数据库、知识路由、美和9要素和AIONE Tool Layer判断。` : `${office.name}预演分析（未调用模型）：当前快照里没有足够的工作、日程或通知事实来判断三项优先事项。请先形成真实工作数据，或配置OPENAI_API_KEY后继续验证。`;
    return { mode:"preview", provider:"deterministic-preview", providerDisplayName:"Deterministic Preview", model:null, answer, proposals:[], toolCallCount:0, usage:{inputTokens:0,outputTokens:0} };
  }
  const match = objective.match(/(?:创建|安排|建立).{0,8}(?:工作|任务)[：:\s]*(.+)/);
  if (match?.[1]) {
    const title = match[1].trim().slice(0,160);
    return { mode:"preview", provider:"deterministic-preview", providerDisplayName:"Deterministic Preview", model:null, answer:`已理解你的目标。当前是预演模式，我不会冒充模型执行；已形成一个待确认工作建议：${title}`, proposals:[{ type:"create_work_item",label:"创建工作事项",summary:title,payload:{title,description:`由AI秘书根据指令提出：${objective}`,priority:"normal",dueAt:null,reason:"用户明确要求建立工作事项"} }],toolCallCount:0,usage:{inputTokens:0,outputTokens:0} };
  }
  return { mode:"preview", provider:"deterministic-preview", providerDisplayName:"Deterministic Preview", model:null, answer:`${office.name}的AI秘书执行链路已经就绪，但当前未连接真实模型。你可以先用“今天最重要的三件事”验证上下文汇总；配置Backend密钥并将AIONE_AI_MODE设为live、AIONE_AI_PROVIDER设为openai后，会由真实模型结合AIONE工具执行。`, proposals:[], toolCallCount:0, usage:{inputTokens:0,outputTokens:0} };
}
