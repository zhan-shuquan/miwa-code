/* OpenAI Responses API Provider｜AIONE AI秘书 */
import { AI_SECRETARY_TOOLS, executeAISecretaryTool } from "./tool-registry.js";

const API_BASE = () => String(process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");
const MODEL = () => process.env.AIONE_AI_MODEL || "gpt-5.6-sol";

function outputText(response) {
  return (response?.output || []).flatMap((item) => item.type === "message" ? (item.content || []) : []).filter((part) => part.type === "output_text").map((part) => part.text).join("\n").trim();
}
function functionCalls(response) { return (response?.output || []).filter((item) => item.type === "function_call"); }
const EXPLICIT_WORK_CREATE_RE = /(?:\u521b\u5efa|\u5efa\u7acb|\u65b0\u5efa|\u5b89\u6392|\u751f\u6210).{0,36}(?:\u4efb\u52a1|\u5de5\u4f5c\u4e8b\u9879|\u8ddf\u8fdb\u4efb\u52a1|\u5f85\u529e|\u5de5\u4f5c)/;
const PROPOSAL_TOOL = AI_SECRETARY_TOOLS.find((item) => item.name === "propose_create_work_item");

function explicitlyRequestsWorkCreation(objective = "") {
  return EXPLICIT_WORK_CREATE_RE.test(String(objective || ""));
}

async function createResponse(body) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  const response = await fetch(`${API_BASE()}/responses`, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${key}` }, body:JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `OpenAI Responses API ${response.status}`);
  return payload;
}


async function bridgeWorkProposal({ objective, answer, contextSnapshot, requestContext }) {
  if (!PROPOSAL_TOOL) return null;
  const businessContext = contextSnapshot?.page?.businessContext || null;
  const bridgeInput = [
    "Convert the user's explicit work-item creation request into exactly one structured AIONE proposal.",
    "Do not claim that anything has been executed. The proposal must wait for human confirmation.",
    `User objective: ${objective}`,
    `Existing assistant plan: ${answer || "none"}`,
    `Current time: ${contextSnapshot?.currentTime || new Date().toISOString()}`,
    `Current page: ${contextSnapshot?.page?.title || "unknown"}`,
    `Current business context: ${JSON.stringify(businessContext).slice(0, 12000)}`
  ].join("\n");
  const response = await createResponse({
    model: MODEL(),
    instructions: "You are the AIONE Proposal Bridge. You must call propose_create_work_item exactly once and return no write action other than that proposal.",
    input: bridgeInput,
    tools: [PROPOSAL_TOOL],
    tool_choice: { type: "function", name: "propose_create_work_item" },
    parallel_tool_calls: false,
    max_output_tokens: 700
  });
  const call = functionCalls(response).find((item) => item.name === "propose_create_work_item");
  if (!call) return null;
  let args = {};
  try { args = JSON.parse(call.arguments || "{}"); } catch (_) {}
  const result = await executeAISecretaryTool(call.name, args, { contextSnapshot, requestContext });
  if (!result?.proposal) return null;
  return {
    proposal: result.proposal,
    responseId: response.id,
    usage: { inputTokens: response.usage?.input_tokens || 0, outputTokens: response.usage?.output_tokens || 0 }
  };
}

export async function runOpenAISecretary({ objective, office, contextSnapshot, requestContext }) {
  const instructions = [
    `你是${office.name}中的AI秘书，是该岗位AI办公室最高AI调度层；最终责任归对应人类岗位负责人。`,
    "你的统一业务语言是美和9要素，固定顺序：目标｜人｜物｜事｜平台｜时间｜钱｜信息｜结果。",
    "先基于AIONE真实上下文、工作、日程、通知、数据库和正式知识形成证据；没有数据时明确写待确认，不得编造。",
    "AI人才、AI岗位、Skill、Agent、模型和Provider属于AIONE内部能力组织与调度信息；普通员工只面对统一的美和AI，不要求用户选择这些内部实现。",
    "AI之家管理AI能力资产；岗位AI办公室组织AI工作；你负责调度，而不是把所有事情都当成聊天。",
    "读取和分析可以直接进行。任何写入动作都只能调用propose_create_work_item提出方案，必须等待人类确认，不得直接写数据库。",
    "当用户询问当前页面、当前工作台、当前商品或页面业务状态时，优先调用get_current_page_business_context，再根据返回证据回答；不得只凭页面标题猜测。",
    "如果contextSnapshot.aiRequest包含capabilityCode，表示AIONE已根据当前业务上下文自动路由到该业务能力；直接执行该能力，不要再次询问用户要选择哪个AI、岗位、Skill或模型。",
    "对成本、利润、毛利率、配送费等确定性数值，优先采用AIONE页面或规则函数已经计算出的结果；不要让模型重新估算已有确定性结果。",
    "需要工作、日历、通知、数据库或知识事实时，调用对应AIONE工具取得证据。工具返回不可用或缺失时明确写待确认。",
    "当用户查找美和集团资料、文件、PPT、PDF、Word、Excel、经营架构、美和灵魂/准则/传承时，优先调用search_corporate_content。资料版本、状态、AIONE路由和Google Drive原件必须以工具返回的正式索引为准，不得凭模型记忆猜文件。",
    "回答要简洁、可执行。若用户问今天最重要的事情，最多给三项，说明依据、风险和下一步。"
  ].join("\n");
  let response = await createResponse({ model:MODEL(), instructions, input:`用户目标：${objective}\n当前办公室：${office.name}\n当前页面：${contextSnapshot?.page?.title || "待确认"}`, tools:AI_SECRETARY_TOOLS, parallel_tool_calls:false, max_output_tokens:1600 });
  let totalUsage = { inputTokens:response.usage?.input_tokens || 0, outputTokens:response.usage?.output_tokens || 0 };
  const proposals = [];
  const assetResults = [];
  let toolCallCount = 0;
  for (let turn = 0; turn < 6; turn += 1) {
    const calls = functionCalls(response);
    if (!calls.length) break;
    const outputs = [];
    for (const call of calls) {
      toolCallCount += 1;
      let args = {};
      try { args = JSON.parse(call.arguments || "{}"); } catch (_) {}
      const result = await executeAISecretaryTool(call.name, args, { contextSnapshot, requestContext });
      if (result?.proposal) proposals.push(result.proposal);
      if (call.name === "search_corporate_content" && Array.isArray(result?.items)) {
        for (const item of result.items) {
          if (!assetResults.some((existing) => existing.id === item.id)) assetResults.push(item);
        }
      }
      outputs.push({ type:"function_call_output", call_id:call.call_id, output:JSON.stringify(result) });
    }
    response = await createResponse({ model:MODEL(), previous_response_id:response.id, input:outputs, tools:AI_SECRETARY_TOOLS, parallel_tool_calls:false, max_output_tokens:1600 });
    totalUsage.inputTokens += response.usage?.input_tokens || 0;
    totalUsage.outputTokens += response.usage?.output_tokens || 0;
  }
  let answer = outputText(response) || "本轮AI秘书执行已完成。";
  if (!proposals.length && explicitlyRequestsWorkCreation(objective)) {
    try {
      const bridged = await bridgeWorkProposal({ objective, answer, contextSnapshot, requestContext });
      if (bridged?.proposal) {
        proposals.push(bridged.proposal);
        toolCallCount += 1;
        totalUsage.inputTokens += bridged.usage?.inputTokens || 0;
        totalUsage.outputTokens += bridged.usage?.outputTokens || 0;
        answer = `${answer}\n\n已生成结构化待确认方案，请在下方确认执行。`;
      }
    } catch (error) {
      console.warn("[AIONE Proposal Bridge] failed to materialize a proposal:", error?.message || error);
    }
  }
  return { mode:"openai", provider:"openai", providerDisplayName:"OpenAI", model:MODEL(), answer, proposals, assetResults, requestedAssetAction:"search", responseId:response.id, toolCallCount, usage:totalUsage };
}
