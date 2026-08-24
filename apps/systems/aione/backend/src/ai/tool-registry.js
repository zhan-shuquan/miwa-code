/* AIONE Tool Layer｜AI秘书首批安全工具。写入工具只提出方案，不直接落库。 */
import pool from "../../db.js";

const tool = (name, description, parameters) => ({ type:"function", name, description, parameters, strict:true });
export const AI_SECRETARY_TOOLS = Object.freeze([
  tool("get_context_snapshot", "读取当前登录用户、岗位AI办公室、页面和美和9要素上下文。", { type:"object", properties:{}, required:[], additionalProperties:false }),
  tool("get_current_page_business_context", "读取当前AIONE页面正在展示的业务数据上下文；对象详情页会包含当前业务对象、状态、系统计算结果与已知证据。回答当前页面业务问题时优先调用。", { type:"object", properties:{}, required:[], additionalProperties:false }),
  tool("get_work_snapshot", "读取当前AIONE前端已知的工作事项；可按当前用户和状态筛选。", { type:"object", properties:{ scope:{type:"string",enum:["mine","all"]}, status:{type:["string","null"]} }, required:["scope","status"], additionalProperties:false }),
  tool("get_calendar_snapshot", "读取当前AIONE已知的日程事件。", { type:"object", properties:{}, required:[], additionalProperties:false }),
  tool("get_notifications_snapshot", "读取当前AIONE通知，重点关注未读、待确认和重要通知。", { type:"object", properties:{ unreadOnly:{type:"boolean"} }, required:["unreadOnly"], additionalProperties:false }),
  tool("get_backend_work_summary", "从AIONE正式数据库读取当前人员工作、时间、证据和结果汇总；数据库未迁移时会返回不可用。", { type:"object", properties:{}, required:[], additionalProperties:false }),
  tool("list_backend_open_work", "从AIONE正式数据库读取当前人员未完成工作事项；数据库未迁移时会返回不可用。", { type:"object", properties:{ limit:{type:"integer",minimum:1,maximum:50} }, required:["limit"], additionalProperties:false }),
  tool("search_knowledge_routes", "按关键词查找AIONE内部知识、规则、方法论、标准、制度、SOP和帮助路由。", { type:"object", properties:{ keyword:{type:"string",minLength:1,maxLength:80}, limit:{type:"integer",minimum:1,maximum:20} }, required:["keyword","limit"], additionalProperties:false }),
  tool("propose_create_work_item", "仅提出创建工作事项的建议，不直接写入；必须由人类负责人确认后才能执行。", { type:"object", properties:{ title:{type:"string",minLength:1,maxLength:160}, description:{type:"string",maxLength:1200}, priority:{type:"string",enum:["normal","important","urgent"]}, dueAt:{type:["string","null"]}, reason:{type:"string",maxLength:500} }, required:["title","description","priority","dueAt","reason"], additionalProperties:false })
]);

function snapshot(ctx) { return ctx.contextSnapshot || {}; }
function currentPersonId(ctx) { return ctx.requestContext?.personId || snapshot(ctx)?.user?.personId || null; }
function compactError(error) { return { available:false, reason:"backend_data_unavailable", detail:process.env.NODE_ENV === "production" ? undefined : String(error?.message || error) }; }

export async function executeAISecretaryTool(name, args = {}, ctx = {}) {
  const data = snapshot(ctx);
  if (name === "get_context_snapshot") return { available:true, currentTime:data.currentTime, user:data.user, office:data.office, page:data.page, nineElements:data.nineElements };
  if (name === "get_current_page_business_context") return { available:Boolean(data.page?.businessContext), routeId:data.page?.routeId || null, title:data.page?.title || null, businessContext:data.page?.businessContext || null };
  if (name === "get_work_snapshot") {
    const personId = currentPersonId(ctx);
    let items = data.work?.tasks || [];
    if (args.scope === "mine" && personId) items = items.filter((item) => item.assigneeId === personId || item.creatorId === personId);
    if (args.status) items = items.filter((item) => item.status === args.status);
    return { available:true, count:items.length, items:items.slice(0,50) };
  }
  if (name === "get_calendar_snapshot") return { available:true, count:(data.calendar?.events || []).length, events:(data.calendar?.events || []).slice(0,40) };
  if (name === "get_notifications_snapshot") {
    let items = data.notifications || [];
    if (args.unreadOnly) items = items.filter((item) => !item.readAt || (item.requiresAck && !item.acknowledgedAt));
    return { available:true, count:items.length, items:items.slice(0,30) };
  }
  if (name === "get_backend_work_summary") {
    const personId = currentPersonId(ctx);
    if (!personId) return { available:false, reason:"person_context_missing" };
    try {
      const [timeResult, workResult, evidenceResult, resultFacts] = await Promise.all([
        pool.query("SELECT COALESCE(SUM(effective_work_seconds),0)::bigint AS effective_work_seconds, COALESCE(SUM(unclassified_seconds),0)::bigint AS unclassified_seconds FROM public.v_person_daily_time_summary WHERE person_id=$1", [personId]),
        pool.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='completed')::int AS completed, COUNT(*) FILTER (WHERE status IN ('pending','in_progress','blocked','waiting'))::int AS open FROM public.work_items WHERE owner_person_id=$1 AND archived_at IS NULL", [personId]),
        pool.query("SELECT COUNT(*)::int AS evidence_count FROM public.work_evidence WHERE person_id=$1", [personId]),
        pool.query("SELECT COUNT(*)::int AS result_count FROM public.result_facts WHERE person_id=$1 AND status IN ('observed','validated')", [personId])
      ]);
      return { available:true, personId, time:timeResult.rows[0], work:workResult.rows[0], evidence:evidenceResult.rows[0], results:resultFacts.rows[0] };
    } catch (error) { return compactError(error); }
  }
  if (name === "list_backend_open_work") {
    const personId = currentPersonId(ctx);
    if (!personId) return { available:false, reason:"person_context_missing" };
    try {
      const result = await pool.query("SELECT id,title,work_type,status,priority,due_at,related_object_type,related_object_id,result_summary,created_at FROM public.work_items WHERE owner_person_id=$1 AND archived_at IS NULL AND status <> 'completed' ORDER BY priority DESC, due_at NULLS LAST, created_at DESC LIMIT $2", [personId, args.limit]);
      return { available:true, count:result.rows.length, items:result.rows };
    } catch (error) { return compactError(error); }
  }
  if (name === "search_knowledge_routes") {
    try {
      const keyword = `%${String(args.keyword || "").trim()}%`;
      const result = await pool.query("SELECT id,object_type,object_id,field_code,route_kind,knowledge_id,anchor_id,status FROM public.knowledge_routes WHERE status='active' AND (knowledge_id ILIKE $1 OR anchor_id ILIKE $1 OR field_code ILIKE $1 OR route_kind ILIKE $1) ORDER BY updated_at DESC LIMIT $2", [keyword, args.limit]);
      return { available:true, count:result.rows.length, routes:result.rows };
    } catch (error) { return compactError(error); }
  }
  if (name === "propose_create_work_item") {
    return { available:true, proposal:{ type:"create_work_item", label:"创建工作事项", summary:`${args.title}｜${args.reason}`, payload:{ title:args.title, description:args.description, priority:args.priority, dueAt:args.dueAt, reason:args.reason } } };
  }
  return { available:false, reason:"unknown_tool" };
}
