/* AI Secretary Service｜AIONE Model Provider Layer + Tool Layer + Evidence */
import pool from "../../db.js";
import { getAIOffice } from "./office-registry.js";
import { getModelProviderRuntimeStatus, runModelProvider } from "./model-provider-registry.js";
import { stagePendingProposals, getPendingProposal, getLatestPendingProposal, clearPendingProposal, getPendingProposalRuntimeStatus } from "./pending-proposal-store.js";
import { executeMiwaCorporateRetrieval } from "../integrations/miwa-corporate-search.js";

function makeId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }

const HUMAN_CONFIRM_RE = /^(?:\u786e\u8ba4|\u786e\u8ba4\u521b\u5efa|\u786e\u8ba4\u6267\u884c|\u540c\u610f\u521b\u5efa|\u540c\u610f\u6267\u884c|\u53ef\u4ee5\u521b\u5efa|\u53ef\u4ee5\u6267\u884c|\u5c31\u8fd9\u6837\u521b\u5efa|\u5c31\u8fd9\u6837\u6267\u884c|\u521b\u5efa\u5427|\u6267\u884c\u5427)[\s!！.。]*$/;

function isExplicitHumanConfirmation(value = "") {
  return HUMAN_CONFIRM_RE.test(String(value || "").trim());
}

function confirmationExecutionResult({ runtime, office, executionId, confirmationResult }) {
  return {
    executionId,
    office,
    mode: runtime.mode,
    provider: runtime.provider,
    providerDisplayName: runtime.providerDisplayName,
    model: runtime.model,
    answer: confirmationResult.message || "Confirmed.",
    proposals: [],
    confirmationHandled: true,
    confirmationResult,
    toolCallCount: 0,
    usage: { inputTokens: 0, outputTokens: 0 }
  };
}

export function getAISecretaryRuntimeStatus() {
  return getModelProviderRuntimeStatus();
}

function hasExplicitDatabaseConfig() {
  return Boolean(
    process.env.DATABASE_URL ||
    process.env.INSTANCE_UNIX_SOCKET ||
    (process.env.DB_USER && process.env.DB_NAME)
  );
}

export function getAISecretaryWriteRuntimeStatus() {
  const localFallbackEnabled = String(process.env.AIONE_ALLOW_LOCAL_WRITE_FALLBACK || "false").toLowerCase() === "true";
  const databaseConfigured = hasExplicitDatabaseConfig();
  return {
    writePolicy: "human_confirmation_required",
    writeTarget: "database",
    databaseConfigured,
    localFallbackEnabled,
    writeMode: localFallbackEnabled ? "database_or_local_preview" : "database_only",
    ...getPendingProposalRuntimeStatus()
  };
}

function localConfirmedWorkFallback(payload, title, writeRuntime) {
  return {
    persisted:false,
    localFallback:true,
    writeMode:writeRuntime.writeMode,
    previewLocalAction:{ type:"create_work_item", payload },
    message:`已由你确认并创建本地内测工作事项：${title}。当前未同步正式数据库。`,
    warning:"database_write_unavailable"
  };
}

async function insertExecution({ id, office, personId, objective, status, runtime }) {
  try {
    await pool.query(
      "INSERT INTO public.ai_executions (id,office_code,ai_secretary_code,requested_by_person_id,objective,status,provider,model,started_at,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9::jsonb)",
      [id, office.code, "ai-secretary", personId, objective, status, runtime.provider, runtime.model, JSON.stringify({ runtimeMode:runtime.mode, requestedMode:runtime.requestedMode, requestedProvider:runtime.requestedProvider, fallbackReason:runtime.fallbackReason })]
    );
    return true;
  } catch (_) { return false; }
}

async function finishExecution(id, result, status = "completed") {
  try {
    await pool.query(
      "UPDATE public.ai_executions SET status=$2,completed_at=NOW(),tool_call_count=$3,input_tokens=$4,output_tokens=$5,result_summary=$6,metadata=metadata || $7::jsonb,updated_at=NOW() WHERE id=$1",
      [id, status, result.toolCallCount||0, result.usage?.inputTokens||0, result.usage?.outputTokens||0, String(result.answer||"").slice(0,2000), JSON.stringify({ responseId:result.responseId||null, proposalCount:(result.proposals||[]).length, provider:result.provider||null })]
    );
  } catch (_) {}
}

export async function executeAISecretary({ objective, officeCode, contextSnapshot, requestContext }) {
  const office = getAIOffice(officeCode);
  const runtime = getAISecretaryRuntimeStatus();
  const executionId = makeId("aix");
  await insertExecution({ id:executionId, office, personId:requestContext?.personId || contextSnapshot?.user?.personId || null, objective, status:"running", runtime });

  try {
    if (isExplicitHumanConfirmation(objective)) {
      const pending = getLatestPendingProposal({ officeCode:office.code, requestContext, contextSnapshot });
      if (pending) {
        const confirmationResult = await confirmAISecretaryProposal({ proposalId:pending.id, officeCode:office.code, contextSnapshot, requestContext });
        const confirmed = confirmationExecutionResult({ runtime, office, executionId, confirmationResult });
        await finishExecution(executionId, confirmed, "completed");
        return confirmed;
      }
    }

    // V1.9.27: deterministic enterprise-content retrieval goes before the model.
    // The registry, not the LLM, decides which file is current and which Drive File ID is authoritative.
    const corporateRetrieval = executeMiwaCorporateRetrieval(objective, requestContext || {});
    if (corporateRetrieval) {
      const deterministic = {
        mode:"aione",
        provider:"aione-corporate-registry",
        providerDisplayName:"AIONE Corporate Registry",
        model:null,
        answer:corporateRetrieval.answer,
        proposals:[],
        assetResults:corporateRetrieval.items,
        requestedAssetAction:corporateRetrieval.intent.requestedAction,
        toolCallCount:1,
        usage:{ inputTokens:0, outputTokens:0 }
      };
      await finishExecution(executionId, deterministic, "completed");
      return { executionId, office, ...deterministic };
    }

    const result = await runModelProvider({ objective, office, contextSnapshot, requestContext, runtime });
    const normalized = {
      provider: result.provider || runtime.provider,
      providerDisplayName: result.providerDisplayName || runtime.providerDisplayName,
      ...result
    };
    normalized.proposals = stagePendingProposals({
      proposals: normalized.proposals || [],
      executionId,
      officeCode: office.code,
      objective,
      requestContext,
      contextSnapshot
    });
    await finishExecution(executionId, normalized, "completed");
    return { executionId, office, ...normalized };
  } catch (error) {
    await finishExecution(executionId, { answer:String(error?.message || error), proposals:[], toolCallCount:0, usage:{}, provider:runtime.provider }, "failed");
    throw error;
  }
}

export async function confirmAISecretaryProposal({ proposal, proposalId = null, officeCode, contextSnapshot, requestContext }) {
  if (!requestContext?.personId) { const error = new Error("AI秘书写入动作需要已认证的人类负责人确认。请在本地内测启用AIONE_ALLOW_PREVIEW_ACTOR=true，正式环境使用真实身份。 "); error.statusCode = 401; throw error; }

  const requestedProposalId = proposalId || proposal?.id || null;
  const stored = getPendingProposal({ proposalId:requestedProposalId, officeCode, requestContext, contextSnapshot });
  if (requestedProposalId && !stored) {
    const error = new Error("待确认方案不存在、已过期或不属于当前负责人。请让美和AI重新生成方案后再确认。 ");
    error.statusCode = 409;
    throw error;
  }
  const resolvedProposal = stored?.proposal || proposal;
  const resolvedProposalId = stored?.id || null;

  if (!resolvedProposal || resolvedProposal.type !== "create_work_item") { const error = new Error("当前仅允许确认创建工作事项；其他写入动作尚未开放。 "); error.statusCode = 400; throw error; }
  const payload = resolvedProposal.payload || {};
  const title = String(payload.title || "").trim();
  if (!title) { const error = new Error("工作事项标题不能为空。 "); error.statusCode = 400; throw error; }
  const id = makeId("wrk");
  const dbPriority = payload.priority === "important" ? "high" : (["normal","urgent","low","high"].includes(payload.priority) ? payload.priority : "normal");
  const writeRuntime = getAISecretaryWriteRuntimeStatus();

  const finalize = (result) => {
    if (resolvedProposalId) clearPendingProposal(resolvedProposalId);
    return { ...result, confirmedProposalId:resolvedProposalId, proposalStatus:"confirmed" };
  };

  if (!writeRuntime.databaseConfigured && writeRuntime.localFallbackEnabled) {
    return finalize(localConfirmedWorkFallback(payload, title, writeRuntime));
  }
  try {
    const context = payload.context || {};
    const relatedObjectType = context.objectType || (context.routeId ? "aione_route" : null);
    const relatedObjectId = context.objectId || context.routeId || null;
    const metadata = { aiProposalId:resolvedProposalId, aiOfficeCode:officeCode, sourceRoute:context.routeId || null, sourcePage:context.pageTitle || null, sourceHash:context.pageHash || null };
    const result = await pool.query("INSERT INTO public.work_items (id,title,work_type,status,priority,owner_person_id,workbench_code,related_object_type,related_object_id,goal_summary,description,platform_code,money_status,expected_result,due_at,metadata,source_system,created_by_person_id,updated_by_person_id) VALUES ($1,$2,'ai_assigned','pending',$3,$4,$5,$6,$7,$8,$9,'aione','pending',$10,$11,$12::jsonb,'aione-ai-secretary',$4,$4) RETURNING *", [id,title,dbPriority,requestContext.personId,context.routeId || null,relatedObjectType,relatedObjectId,payload.reason || "AI秘书确认创建",payload.description || "",payload.reason || "待形成",payload.dueAt || null,JSON.stringify(metadata)]);
    try { await pool.query("INSERT INTO public.business_events (id,event_type,object_type,object_id,actor_kind,actor_person_id,actor_ai_ref,happened_at,payload,source_system) VALUES ($1,'work.created','work_item',$2,'human',$3,'ai-secretary',NOW(),$4::jsonb,'aione-ai-secretary')", [makeId("evt"),id,requestContext.personId,JSON.stringify({ officeCode, confirmedByHuman:true, proposalId:resolvedProposalId, sourceRoute:context.routeId || null, relatedObjectType, relatedObjectId })]); } catch (_) {}
    return finalize({ persisted:true, workItem:result.rows[0], message:`已由你确认并创建工作事项：${title}` });
  } catch (error) {
    if (writeRuntime.localFallbackEnabled) return finalize(localConfirmedWorkFallback(payload, title, writeRuntime));
    throw error;
  }
}
