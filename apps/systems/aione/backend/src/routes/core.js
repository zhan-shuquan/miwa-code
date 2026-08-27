import { Router } from "express";
import pool, { withTransaction } from "../../db.js";
import { CORE_RESOURCES, IMMUTABLE_FACT_RESOURCES } from "../core-model.js";
import { getRequestContext, requireWriteActor } from "../http/context.js";
import { makeId, recordBusinessEvent } from "../services/event-service.js";

const router = Router();

const FACT_TIME_COLUMNS = Object.freeze({
  "object-relations": "created_at",
  "work-sessions": "started_at",
  "work-evidence": "happened_at",
  "money-events": "occurred_at",
  results: "observed_at",
  events: "happened_at",
  "knowledge-routes": "created_at",
  "ai-executions": "created_at"
});

function badRequest(res, message, details = null) {
  return res.status(400).json({ error: "bad_request", message, details });
}

function normalizeLimit(value) {
  const n = Number(value || 100);
  return Number.isFinite(n) ? Math.max(1, Math.min(500, Math.trunc(n))) : 100;
}

function parseOffset(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function validateRequired(def, body) {
  return (def.required || []).filter((key) => body[key] === undefined || body[key] === null || body[key] === "");
}

function writableEntries(def, body) {
  return Object.entries(def.writable || {}).filter(([key]) => Object.prototype.hasOwnProperty.call(body, key));
}

function addWhereFromFilters(def, query, values) {
  const clauses = [];
  for (const [queryKey, column] of Object.entries(def.filters || {})) {
    if (query[queryKey] === undefined || query[queryKey] === "") continue;
    values.push(query[queryKey]);
    clauses.push(`${column} = $${values.length}`);
  }
  return clauses;
}

function snakeToCamel(row) {
  const out = {};
  for (const [key, value] of Object.entries(row || {})) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = value;
  }
  return out;
}

function workVisibility(row) {
  const metadata = row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
  if (metadata.sensitive === true || String(metadata.sensitive || "").toLowerCase() === "true") return "sensitive";
  return String(metadata.visibility || metadata.visibilityScope || "company").toLowerCase();
}

function isCompanyVisibleWork(row) {
  return !["private", "restricted", "sensitive"].includes(workVisibility(row));
}

function workAccess(row, context, participantRoles = []) {
  const personId = String(context?.personId || "");
  const ownerId = String(row?.owner_person_id || "");
  const creatorId = String(row?.created_by_person_id || "");
  const roles = Array.isArray(participantRoles) ? participantRoles.filter(Boolean) : [];
  const isParticipant = roles.length > 0;
  const isFollowing = roles.includes("observer");
  const related = Boolean(personId && (personId === ownerId || personId === creatorId || isParticipant));
  return {
    canRead: Boolean(personId && (related || isCompanyVisibleWork(row))),
    canExecute: Boolean(personId && personId === ownerId),
    canReview: Boolean(personId && personId === creatorId),
    ownerIsCreator: Boolean(ownerId && creatorId && ownerId === creatorId),
    isParticipant,
    isFollowing,
    participantRoles: roles,
    visibility: workVisibility(row)
  };
}

async function loadAccessibleWork(client, workItemId, context) {
  const result = await client.query("SELECT * FROM public.work_items WHERE id=$1 AND archived_at IS NULL", [workItemId]);
  if (!result.rowCount) return { row:null, access:null };
  const row = result.rows[0];
  const participantResult = context?.personId ? await client.query(
    "SELECT participant_role FROM public.work_item_participants WHERE work_item_id=$1 AND person_id=$2 AND left_at IS NULL",
    [workItemId, context.personId]
  ) : { rows:[] };
  const access = workAccess(row, context, participantResult.rows.map((item) => item.participant_role));
  return { row, access };
}

function workPermissionDenied(res, message = "当前人员无权执行此工作事项。") {
  return res.status(403).json({ error:"work_permission_denied", message });
}

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function createCoreResourceRoutes(resourceName, def) {
  router.get(`/${resourceName}`, async (req, res, next) => {
    try {
      const values = [];
      const where = addWhereFromFilters(def, req.query, values);
      const limit = normalizeLimit(req.query.limit);
      const offset = parseOffset(req.query.offset);
      values.push(limit, offset);
      const sql = `SELECT * FROM public.${def.table}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY ${def.defaultSort || "created_at DESC"} LIMIT $${values.length - 1} OFFSET $${values.length}`;
      const result = await pool.query(sql, values);
      res.json({ items: result.rows.map(snakeToCamel), limit, offset });
    } catch (error) {
      next(error);
    }
  });

  router.get(`/${resourceName}/:id`, async (req, res, next) => {
    try {
      const result = await pool.query(`SELECT * FROM public.${def.table} WHERE id = $1`, [req.params.id]);
      if (!result.rowCount) return res.status(404).json({ error: "not_found" });
      return res.json(snakeToCamel(result.rows[0]));
    } catch (error) {
      return next(error);
    }
  });

  router.post(`/${resourceName}`, requireWriteActor, async (req, res, next) => {
    const missing = validateRequired(def, req.body || {});
    if (missing.length) return badRequest(res, "Required fields are missing.", { missing });
    const entries = writableEntries(def, req.body || {});
    if (!entries.length) return badRequest(res, "No writable fields supplied.");

    try {
      const context = req.aioneContext || getRequestContext(req);
      const id = req.body.id || makeId(def.prefix);
      const columns = ["id"];
      const values = [id];
      const placeholders = ["$1"];

      for (const [key, column] of entries) {
        columns.push(column);
        values.push(req.body[key]);
        placeholders.push(`$${values.length}`);
      }

      if (["organizations","businesses","positions","assignments","work_items"].includes(def.table)) {
        columns.push("created_by_person_id", "updated_by_person_id", "source_system");
        values.push(context.personId, context.personId, context.sourceSystem);
        placeholders.push(`$${values.length - 2}`, `$${values.length - 1}`, `$${values.length}`);
      }

      const created = await withTransaction(async (client) => {
        const result = await client.query(
          `INSERT INTO public.${def.table} (${columns.join(",")}) VALUES (${placeholders.join(",")}) RETURNING *`,
          values
        );
        await recordBusinessEvent(client, {
          eventType: `${resourceName}.created`, objectType: resourceName, objectId: id, context,
          payload: { changedFields: entries.map(([key]) => key) }
        });
        return result.rows[0];
      });
      return res.status(201).json(snakeToCamel(created));
    } catch (error) {
      return next(error);
    }
  });

  router.patch(`/${resourceName}/:id`, requireWriteActor, async (req, res, next) => {
    const entries = writableEntries(def, req.body || {});
    if (!entries.length) return badRequest(res, "No writable fields supplied.");

    try {
      const context = req.aioneContext || getRequestContext(req);
      const updates = [];
      const values = [];
      for (const [key, column] of entries) {
        values.push(req.body[key]);
        updates.push(`${column} = $${values.length}`);
      }
      if (["organizations","businesses","positions","assignments","work_items"].includes(def.table)) {
        values.push(context.personId);
        updates.push(`updated_by_person_id = $${values.length}`);
        updates.push("updated_at = NOW()", "record_version = record_version + 1");
      }
      values.push(req.params.id);

      const updated = await withTransaction(async (client) => {
        const result = await client.query(
          `UPDATE public.${def.table} SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`,
          values
        );
        if (!result.rowCount) return null;
        await recordBusinessEvent(client, {
          eventType: `${resourceName}.updated`, objectType: resourceName, objectId: req.params.id, context,
          payload: { changedFields: entries.map(([key]) => key) }
        });
        return result.rows[0];
      });
      if (!updated) return res.status(404).json({ error: "not_found" });
      return res.json(snakeToCamel(updated));
    } catch (error) {
      return next(error);
    }
  });
}

function createFactResourceRoutes(resourceName, def) {
  router.get(`/${resourceName}`, async (req, res, next) => {
    try {
      const values = [];
      const where = addWhereFromFilters(def, req.query, values);
      const timeColumn = FACT_TIME_COLUMNS[resourceName];
      if (timeColumn && req.query.from) {
        values.push(req.query.from);
        where.push(`${timeColumn} >= $${values.length}`);
      }
      if (timeColumn && req.query.to) {
        values.push(req.query.to);
        where.push(`${timeColumn} < $${values.length}`);
      }
      const limit = normalizeLimit(req.query.limit);
      const offset = parseOffset(req.query.offset);
      values.push(limit, offset);
      const sql = `SELECT * FROM public.${def.table}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY ${timeColumn || "created_at"} DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;
      const result = await pool.query(sql, values);
      res.json({ items: result.rows.map(snakeToCamel), limit, offset });
    } catch (error) {
      next(error);
    }
  });

  router.post(`/${resourceName}`, requireWriteActor, async (req, res, next) => {
    const missing = validateRequired(def, req.body || {});
    if (missing.length) return badRequest(res, "Required fields are missing.", { missing });
    const entries = writableEntries(def, req.body || {});
    if (!entries.length) return badRequest(res, "No writable fields supplied.");

    try {
      const context = req.aioneContext || getRequestContext(req);
      const id = req.body.id || makeId(def.prefix);
      const columns = ["id"];
      const values = [id];
      const placeholders = ["$1"];

      for (const [key, column] of entries) {
        columns.push(column);
        let value = req.body[key];
        if (column === "source_system" && !value) value = context.sourceSystem;
        if (column === "actor_person_id" && !value) value = context.personId;
        if (column === "actor_kind" && !value) value = context.actorKind;
        values.push(value);
        placeholders.push(`$${values.length}`);
      }

      if (!columns.includes("source_system") && ["work_sessions","work_evidence","money_events","result_facts","business_events","knowledge_routes"].includes(def.table)) {
        columns.push("source_system");
        values.push(context.sourceSystem);
        placeholders.push(`$${values.length}`);
      }
      if (def.table === "money_events" && !columns.includes("created_by_person_id")) {
        columns.push("created_by_person_id");
        values.push(context.personId);
        placeholders.push(`$${values.length}`);
      }
      if (def.table === "knowledge_routes" && !columns.includes("created_by_person_id")) {
        columns.push("created_by_person_id");
        values.push(context.personId);
        placeholders.push(`$${values.length}`);
      }
      if (def.table === "business_events") {
        if (!columns.includes("actor_kind")) {
          columns.push("actor_kind"); values.push(context.actorKind); placeholders.push(`$${values.length}`);
        }
        if (!columns.includes("actor_person_id")) {
          columns.push("actor_person_id"); values.push(context.personId); placeholders.push(`$${values.length}`);
        }
      }

      const result = await pool.query(
        `INSERT INTO public.${def.table} (${columns.join(",")}) VALUES (${placeholders.join(",")}) RETURNING *`,
        values
      );
      return res.status(201).json(snakeToCamel(result.rows[0]));
    } catch (error) {
      return next(error);
    }
  });
}

router.get("/work-home/capabilities", (req, res) => {
  return res.json({ workHomeVersion:"V1.9.34", features:{ companyVisibility:true, following:true, participantFacts:true, employeeWorkSummary:true } });
});

router.get("/work-home/people-summary", async (req, res, next) => {
  try {
    const context = getRequestContext(req);
    if (!context.personId) {
      return res.status(401).json({ error:"authenticated_actor_required", message:"人员工作汇总需要已认证的AIONE人员身份。" });
    }
    const range = ["week", "month", "year"].includes(String(req.query.range || "month")) ? String(req.query.range || "month") : "month";
    const relatedSql = `(w.owner_person_id=$1 OR w.created_by_person_id=$1 OR EXISTS (SELECT 1 FROM public.work_item_participants wr WHERE wr.work_item_id=w.id AND wr.person_id=$1 AND wr.left_at IS NULL AND wr.participant_role <> 'observer'))`;
    const companyVisibleSql = `(COALESCE(w.metadata->>'visibility', w.metadata->>'visibilityScope', 'company') NOT IN ('private','restricted','sensitive') AND COALESCE(w.metadata->>'sensitive','false') <> 'true')`;
    const startSql = range === "week"
      ? `(date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo')`
      : range === "year"
        ? `(date_trunc('year', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo')`
        : `(date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo')`;
    const result = await pool.query(
      `WITH visible_work AS (
         SELECT w.*,
                COALESCE(w.completed_at, w.updated_at, w.started_at, w.created_at) AS record_at
         FROM public.work_items w
         WHERE w.archived_at IS NULL
           AND (${relatedSql} OR ${companyVisibleSql})
           AND COALESCE(w.completed_at, w.updated_at, w.started_at, w.created_at) >= ${startSql}
       ), contributor_fact AS (
         SELECT vw.id AS work_item_id, vw.owner_person_id AS person_id, 'owner'::text AS contribution_role
         FROM visible_work vw
         WHERE vw.owner_person_id IS NOT NULL
         UNION ALL
         SELECT vw.id AS work_item_id, wp.person_id,
                CASE WHEN wp.participant_role='owner' THEN 'owner' ELSE 'participant' END AS contribution_role
         FROM visible_work vw
         JOIN public.work_item_participants wp ON wp.work_item_id=vw.id
         WHERE wp.left_at IS NULL AND wp.participant_role <> 'observer'
           AND wp.person_id IS DISTINCT FROM vw.owner_person_id
       )
       SELECT cf.person_id,
              COUNT(DISTINCT cf.work_item_id)::int AS total_count,
              COUNT(DISTINCT cf.work_item_id) FILTER (WHERE cf.contribution_role='owner')::int AS responsible_count,
              COUNT(DISTINCT cf.work_item_id) FILTER (WHERE cf.contribution_role='participant')::int AS participated_count,
              COUNT(DISTINCT cf.work_item_id) FILTER (WHERE vw.status IN ('completed','done','cancelled','archived'))::int AS closed_count,
              COALESCE(jsonb_agg(DISTINCT COALESCE(vw.metadata->>'businessName', vw.metadata->>'businessCode', vw.metadata->>'businessId')) FILTER (WHERE COALESCE(vw.metadata->>'businessName', vw.metadata->>'businessCode', vw.metadata->>'businessId') IS NOT NULL), '[]'::jsonb) AS businesses,
              COALESCE(jsonb_agg(DISTINCT COALESCE(vw.metadata->>'projectName', vw.metadata->>'projectCode')) FILTER (WHERE COALESCE(vw.metadata->>'projectName', vw.metadata->>'projectCode') IS NOT NULL), '[]'::jsonb) AS projects,
              COALESCE(jsonb_agg(DISTINCT vw.workbench_code) FILTER (WHERE vw.workbench_code IS NOT NULL AND vw.workbench_code <> ''), '[]'::jsonb) AS workbenches,
              MAX(vw.record_at) AS last_work_at
       FROM contributor_fact cf
       JOIN visible_work vw ON vw.id=cf.work_item_id
       WHERE cf.person_id IS NOT NULL
       GROUP BY cf.person_id
       ORDER BY total_count DESC, closed_count DESC, last_work_at DESC`,
      [context.personId]
    );
    return res.json({
      range,
      timeZone:"Asia/Tokyo",
      factLayer:true,
      performanceScore:false,
      people:result.rows.map(snakeToCamel)
    });
  } catch (error) {
    return next(error);
  }
});

// legacy validation: owner_person_id=$1 OR created_by_person_id=$1
router.get("/work-home", async (req, res, next) => {
  try {
    const context = getRequestContext(req);
    if (!context.personId) {
      return res.status(401).json({ error:"authenticated_actor_required", message:"工作之家需要已认证的AIONE人员身份。" });
    }
    const limit = normalizeLimit(req.query.limit || 200);
    const scope = ["related", "all", "following"].includes(String(req.query.scope || "related")) ? String(req.query.scope || "related") : "related";
    const values = [context.personId];
    const relatedSql = `(w.owner_person_id=$1 OR w.created_by_person_id=$1 OR EXISTS (SELECT 1 FROM public.work_item_participants wp WHERE wp.work_item_id=w.id AND wp.person_id=$1 AND wp.left_at IS NULL AND wp.participant_role <> 'observer'))`;
    const companyVisibleSql = `(COALESCE(w.metadata->>'visibility', w.metadata->>'visibilityScope', 'company') NOT IN ('private','restricted','sensitive') AND COALESCE(w.metadata->>'sensitive','false') <> 'true')`;
    const followingSql = `EXISTS (SELECT 1 FROM public.work_item_participants wf WHERE wf.work_item_id=w.id AND wf.person_id=$1 AND wf.participant_role='observer' AND wf.left_at IS NULL)`;
    const scopeSql = scope === "all" ? `(${relatedSql} OR ${companyVisibleSql})` : scope === "following" ? followingSql : relatedSql;
    values.push(limit);
    const result = await pool.query(
      `SELECT w.*,
              ${followingSql} AS is_following,
              EXISTS (SELECT 1 FROM public.work_item_participants wx WHERE wx.work_item_id=w.id AND wx.person_id=$1 AND wx.left_at IS NULL) AS is_participant,
              COALESCE((SELECT wx.participant_role FROM public.work_item_participants wx WHERE wx.work_item_id=w.id AND wx.person_id=$1 AND wx.left_at IS NULL ORDER BY CASE wx.participant_role WHEN 'owner' THEN 1 WHEN 'assignee' THEN 2 WHEN 'reviewer' THEN 3 WHEN 'collaborator' THEN 4 WHEN 'observer' THEN 5 ELSE 6 END LIMIT 1),'') AS participant_role,
              COALESCE((SELECT jsonb_agg(jsonb_build_object('personId',wp.person_id,'role',wp.participant_role) ORDER BY wp.joined_at) FROM public.work_item_participants wp WHERE wp.work_item_id=w.id AND wp.left_at IS NULL AND wp.participant_role <> 'observer'),'[]'::jsonb) AS participants
       FROM public.work_items w
       WHERE w.archived_at IS NULL AND ${scopeSql}
       ORDER BY CASE w.status WHEN 'pending' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'waiting' THEN 3 WHEN 'blocked' THEN 4 WHEN 'completed' THEN 5 ELSE 6 END,
                CASE w.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
                w.due_at NULLS LAST, w.updated_at DESC
       LIMIT $2`,
      values
    );
    return res.json({ personId:context.personId, scope, items:result.rows.map(snakeToCamel), limit });
  } catch (error) {
    return next(error);
  }
});

router.post("/work-home/:id/follow", requireWriteActor, async (req, res, next) => {
  try {
    const context = req.aioneContext || getRequestContext(req);
    const output = await withTransaction(async (client) => {
      const { row, access } = await loadAccessibleWork(client, req.params.id, context);
      if (!row) return { notFound:true };
      if (!access.canRead) return { forbidden:true };
      const existing = await client.query(
        "SELECT id FROM public.work_item_participants WHERE work_item_id=$1 AND person_id=$2 AND participant_role='observer' LIMIT 1",
        [row.id, context.personId]
      );
      let participantId = existing.rows[0]?.id || null;
      if (participantId) {
        await client.query("UPDATE public.work_item_participants SET left_at=NULL WHERE id=$1", [participantId]);
      } else {
        participantId = makeId("wip");
        await client.query(
          "INSERT INTO public.work_item_participants (id,work_item_id,person_id,assignment_id,participant_role,metadata) VALUES ($1,$2,$3,$4,'observer',$5::jsonb)",
          [participantId,row.id,context.personId,context.assignmentId || null,JSON.stringify({ source:"work-home-follow" })]
        );
      }
      await recordBusinessEvent(client, { eventType:"work.followed", objectType:"work_item", objectId:row.id, context, payload:{ participantId } });
      return { row, participantId };
    });
    if (output.notFound) return res.status(404).json({ error:"not_found" });
    if (output.forbidden) return workPermissionDenied(res, "当前人员无权关注此工作事项。");
    return res.json({ workItem:snakeToCamel(output.row), following:true, participantId:output.participantId });
  } catch (error) { next(error); }
});

router.delete("/work-home/:id/follow", requireWriteActor, async (req, res, next) => {
  try {
    const context = req.aioneContext || getRequestContext(req);
    const output = await withTransaction(async (client) => {
      const { row, access } = await loadAccessibleWork(client, req.params.id, context);
      if (!row) return { notFound:true };
      if (!access.canRead) return { forbidden:true };
      await client.query(
        "UPDATE public.work_item_participants SET left_at=NOW() WHERE work_item_id=$1 AND person_id=$2 AND participant_role='observer' AND left_at IS NULL",
        [row.id, context.personId]
      );
      await recordBusinessEvent(client, { eventType:"work.unfollowed", objectType:"work_item", objectId:row.id, context, payload:{} });
      return { row };
    });
    if (output.notFound) return res.status(404).json({ error:"not_found" });
    if (output.forbidden) return workPermissionDenied(res, "当前人员无权操作此工作事项。");
    return res.json({ workItem:snakeToCamel(output.row), following:false });
  } catch (error) { next(error); }
});

router.get("/work-home/:id/execution", async (req, res, next) => {
  try {
    const context = getRequestContext(req);
    if (!context.personId) return res.status(401).json({ error:"authenticated_actor_required", message:"工作详情需要已认证的AIONE人员身份。" });
    const { row, access } = await loadAccessibleWork(pool, req.params.id, context);
    if (!row) return res.status(404).json({ error:"not_found" });
    if (!access.canRead) return workPermissionDenied(res, "当前人员无权查看此工作事项。");
    const [evidence, results] = await Promise.all([
      pool.query("SELECT * FROM public.work_evidence WHERE work_item_id=$1 ORDER BY happened_at DESC, created_at DESC LIMIT 100", [row.id]),
      pool.query("SELECT * FROM public.result_facts WHERE work_item_id=$1 ORDER BY observed_at DESC, created_at DESC LIMIT 50", [row.id])
    ]);
    return res.json({
      workItem: snakeToCamel(row),
      evidence: evidence.rows.map(snakeToCamel),
      results: results.rows.map(snakeToCamel),
      following: access.isFollowing,
      visibility: access.visibility,
      participantRoles: access.participantRoles,
      permissions: {
        canRead: access.canRead,
        canStart: access.canExecute && row.status === "pending",
        canAddEvidence: access.canExecute && ["pending","in_progress","blocked","waiting"].includes(row.status),
        canSubmitCompletion: access.canExecute && ["in_progress","blocked"].includes(row.status),
        canApproveCompletion: access.canReview && row.status === "waiting",
        canAIReview: ["waiting","completed"].includes(row.status) || Boolean(row.result_summary)
      }
    });
  } catch (error) { next(error); }
});

router.post("/work-home/:id/start", requireWriteActor, async (req, res, next) => {
  try {
    const context = req.aioneContext || getRequestContext(req);
    const updated = await withTransaction(async (client) => {
      const { row, access } = await loadAccessibleWork(client, req.params.id, context);
      if (!row) return { notFound:true };
      if (!access.canExecute) return { forbidden:true };
      if (row.status !== "pending") return { conflict:true, status:row.status };
      const result = await client.query(
        `UPDATE public.work_items SET status='in_progress', started_at=COALESCE(started_at,NOW()), updated_at=NOW(), updated_by_person_id=$2, record_version=record_version+1 WHERE id=$1 RETURNING *`,
        [row.id, context.personId]
      );
      await recordBusinessEvent(client, { eventType:"work.started", objectType:"work_item", objectId:row.id, context, payload:{ previousStatus:row.status, nextStatus:"in_progress" } });
      return { row:result.rows[0] };
    });
    if (updated.notFound) return res.status(404).json({ error:"not_found" });
    if (updated.forbidden) return workPermissionDenied(res);
    if (updated.conflict) return res.status(409).json({ error:"work_status_conflict", message:`当前状态为 ${updated.status}，不能重复开始执行。` });
    return res.json({ workItem:snakeToCamel(updated.row) });
  } catch (error) { next(error); }
});

router.post("/work-home/:id/evidence", requireWriteActor, async (req, res, next) => {
  const summary = cleanText(req.body?.summary, 2000);
  const evidenceUri = cleanText(req.body?.evidenceUri, 2000);
  const evidenceType = cleanText(req.body?.evidenceType || "execution_note", 80) || "execution_note";
  if (!summary && !evidenceUri) return badRequest(res, "请填写执行记录或证据链接。");
  try {
    const context = req.aioneContext || getRequestContext(req);
    const output = await withTransaction(async (client) => {
      const { row, access } = await loadAccessibleWork(client, req.params.id, context);
      if (!row) return { notFound:true };
      if (!access.canExecute) return { forbidden:true };
      if (["completed","cancelled","archived"].includes(row.status)) return { conflict:true, status:row.status };
      const evidenceId = makeId("evi");
      const evidence = await client.query(
        `INSERT INTO public.work_evidence (id,work_item_id,person_id,assignment_id,business_id,related_object_type,related_object_id,evidence_type,action_code,summary,evidence_uri,source_system,payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'work_execution',$9,$10,$11,$12::jsonb) RETURNING *`,
        [evidenceId,row.id,context.personId,context.assignmentId || null,row.business_id,row.related_object_type,row.related_object_id,evidenceType,summary || null,evidenceUri || null,context.sourceSystem || "aione",JSON.stringify({ statusAtEvidence:row.status })]
      );
      await client.query("UPDATE public.work_items SET updated_at=NOW(), updated_by_person_id=$2, record_version=record_version+1 WHERE id=$1", [row.id,context.personId]);
      await recordBusinessEvent(client, { eventType:"work.evidence_added", objectType:"work_item", objectId:row.id, context, payload:{ evidenceId,evidenceType,hasUri:Boolean(evidenceUri) } });
      return { evidence:evidence.rows[0] };
    });
    if (output.notFound) return res.status(404).json({ error:"not_found" });
    if (output.forbidden) return workPermissionDenied(res);
    if (output.conflict) return res.status(409).json({ error:"work_status_conflict", message:`当前状态为 ${output.status}，不能继续添加执行记录。` });
    return res.status(201).json({ evidence:snakeToCamel(output.evidence) });
  } catch (error) { next(error); }
});

router.post("/work-home/:id/complete", requireWriteActor, async (req, res, next) => {
  const resultSummary = cleanText(req.body?.resultSummary, 4000);
  const evidenceSummary = cleanText(req.body?.evidenceSummary, 2000);
  const evidenceUri = cleanText(req.body?.evidenceUri, 2000);
  if (!resultSummary) return badRequest(res, "提交完成前请填写执行结果。");
  try {
    const context = req.aioneContext || getRequestContext(req);
    const output = await withTransaction(async (client) => {
      const { row, access } = await loadAccessibleWork(client, req.params.id, context);
      if (!row) return { notFound:true };
      if (!access.canExecute) return { forbidden:true };
      if (!["in_progress","blocked"].includes(row.status)) return { conflict:true, status:row.status };
      const nextStatus = access.ownerIsCreator || !row.created_by_person_id ? "completed" : "waiting";
      const evidenceId = makeId("evi");
      await client.query(
        `INSERT INTO public.work_evidence (id,work_item_id,person_id,assignment_id,business_id,related_object_type,related_object_id,evidence_type,action_code,summary,evidence_uri,source_system,payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'completion','submit_completion',$8,$9,$10,$11::jsonb)`,
        [evidenceId,row.id,context.personId,context.assignmentId || null,row.business_id,row.related_object_type,row.related_object_id,evidenceSummary || resultSummary,evidenceUri || null,context.sourceSystem || "aione",JSON.stringify({ previousStatus:row.status,nextStatus })]
      );
      const resultId = makeId("res");
      await client.query(
        `INSERT INTO public.result_facts (id,result_type,status,business_id,work_item_id,person_id,related_object_type,related_object_id,text_value,observed_at,evidence_id,metadata,source_system)
         VALUES ($1,'work_completion',$2,$3,$4,$5,$6,$7,$8,NOW(),$9,$10::jsonb,$11)`,
        [resultId,nextStatus === "completed" ? "validated" : "observed",row.business_id,row.id,context.personId,row.related_object_type,row.related_object_id,resultSummary,evidenceId,JSON.stringify({ submittedBy:context.personId }),context.sourceSystem || "aione"]
      );
      const updated = await client.query(
        `UPDATE public.work_items
         SET status=$2, result_summary=$3, started_at=COALESCE(started_at,NOW()), completed_at=CASE WHEN $2='completed' THEN NOW() ELSE NULL END, updated_at=NOW(), updated_by_person_id=$4, record_version=record_version+1
         WHERE id=$1 RETURNING *`,
        [row.id,nextStatus,resultSummary,context.personId]
      );
      await recordBusinessEvent(client, { eventType:nextStatus === "completed" ? "work.completed" : "work.completion_submitted", objectType:"work_item", objectId:row.id, context, payload:{ previousStatus:row.status,nextStatus,evidenceId,resultId } });
      return { row:updated.rows[0], nextStatus };
    });
    if (output.notFound) return res.status(404).json({ error:"not_found" });
    if (output.forbidden) return workPermissionDenied(res);
    if (output.conflict) return res.status(409).json({ error:"work_status_conflict", message:`当前状态为 ${output.status}，不能提交完成。` });
    return res.json({ workItem:snakeToCamel(output.row), completionState:output.nextStatus });
  } catch (error) { next(error); }
});

router.post("/work-home/:id/approve", requireWriteActor, async (req, res, next) => {
  const reviewSummary = cleanText(req.body?.reviewSummary || "确认执行结果，工作完成。", 2000);
  try {
    const context = req.aioneContext || getRequestContext(req);
    const output = await withTransaction(async (client) => {
      const { row, access } = await loadAccessibleWork(client, req.params.id, context);
      if (!row) return { notFound:true };
      if (!access.canReview) return { forbidden:true };
      if (row.status !== "waiting") return { conflict:true, status:row.status };
      const evidenceId = makeId("evi");
      await client.query(
        `INSERT INTO public.work_evidence (id,work_item_id,person_id,assignment_id,business_id,related_object_type,related_object_id,evidence_type,action_code,summary,source_system,payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'review','approve_completion',$8,$9,$10::jsonb)`,
        [evidenceId,row.id,context.personId,context.assignmentId || null,row.business_id,row.related_object_type,row.related_object_id,reviewSummary,context.sourceSystem || "aione",JSON.stringify({ approved:true })]
      );
      const resultId = makeId("res");
      await client.query(
        `INSERT INTO public.result_facts (id,result_type,status,business_id,work_item_id,person_id,related_object_type,related_object_id,text_value,observed_at,evidence_id,metadata,source_system)
         VALUES ($1,'work_completion_review','validated',$2,$3,$4,$5,$6,$7,NOW(),$8,$9::jsonb,$10)`,
        [resultId,row.business_id,row.id,context.personId,row.related_object_type,row.related_object_id,row.result_summary || reviewSummary,evidenceId,JSON.stringify({ approvedBy:context.personId }),context.sourceSystem || "aione"]
      );
      const updated = await client.query(
        `UPDATE public.work_items SET status='completed', completed_at=NOW(), updated_at=NOW(), updated_by_person_id=$2, record_version=record_version+1 WHERE id=$1 RETURNING *`,
        [row.id,context.personId]
      );
      await recordBusinessEvent(client, { eventType:"work.completion_approved", objectType:"work_item", objectId:row.id, context, payload:{ evidenceId,resultId } });
      return { row:updated.rows[0] };
    });
    if (output.notFound) return res.status(404).json({ error:"not_found" });
    if (output.forbidden) return workPermissionDenied(res, "只有工作创建者可以确认该完成结果。");
    if (output.conflict) return res.status(409).json({ error:"work_status_conflict", message:`当前状态为 ${output.status}，无需再次确认完成。` });
    return res.json({ workItem:snakeToCamel(output.row) });
  } catch (error) { next(error); }
});

for (const [resourceName, def] of Object.entries(CORE_RESOURCES)) createCoreResourceRoutes(resourceName, def);
for (const [resourceName, def] of Object.entries(IMMUTABLE_FACT_RESOURCES)) createFactResourceRoutes(resourceName, def);

router.get("/meta/object-model", (req, res) => {
  res.json({
    version: "1.0",
    nineElements: ["goal","people","object","matter","platform","time","money","information","result"],
    coreResources: Object.keys(CORE_RESOURCES),
    factResources: Object.keys(IMMUTABLE_FACT_RESOURCES),
    principle: "one_fact_many_views"
  });
});

router.get("/time-summary", async (req, res, next) => {
  if (!req.query.personId) return badRequest(res, "personId is required.");
  try {
    const values = [req.query.personId];
    const where = ["person_id = $1"];
    if (req.query.from) { values.push(req.query.from); where.push(`work_date >= $${values.length}::date`); }
    if (req.query.to) { values.push(req.query.to); where.push(`work_date < $${values.length}::date`); }
    const result = await pool.query(
      `SELECT * FROM public.v_person_daily_time_summary WHERE ${where.join(" AND ")} ORDER BY work_date DESC`,
      values
    );
    res.json({ personId: req.query.personId, days: result.rows.map(snakeToCamel) });
  } catch (error) {
    next(error);
  }
});

router.get("/people/:personId/work-summary", async (req, res, next) => {
  try {
    const values = [req.params.personId];
    const timeWhere = ["person_id = $1"];
    const workWhere = ["owner_person_id = $1", "archived_at IS NULL"];
    if (req.query.from) {
      values.push(req.query.from);
      timeWhere.push(`work_date >= $${values.length}::date`);
      workWhere.push(`created_at >= $${values.length}`);
    }
    if (req.query.to) {
      values.push(req.query.to);
      timeWhere.push(`work_date < $${values.length}::date`);
      workWhere.push(`created_at < $${values.length}`);
    }
    const [timeResult, workResult, evidenceResult, resultFacts] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(effective_work_seconds),0)::bigint AS effective_work_seconds, COALESCE(SUM(unclassified_seconds),0)::bigint AS unclassified_seconds FROM public.v_person_daily_time_summary WHERE ${timeWhere.join(" AND ")}`, values),
      pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='completed')::int AS completed, COUNT(*) FILTER (WHERE status IN ('pending','in_progress','blocked','waiting'))::int AS open FROM public.work_items WHERE ${workWhere.join(" AND ")}`, values),
      pool.query(`SELECT COUNT(*)::int AS evidence_count FROM public.work_evidence WHERE person_id=$1`, [req.params.personId]),
      pool.query(`SELECT COUNT(*)::int AS result_count FROM public.result_facts WHERE person_id=$1 AND status IN ('observed','validated')`, [req.params.personId])
    ]);
    res.json({
      personId: req.params.personId,
      time: snakeToCamel(timeResult.rows[0]),
      work: snakeToCamel(workResult.rows[0]),
      evidence: snakeToCamel(evidenceResult.rows[0]),
      results: snakeToCamel(resultFacts.rows[0])
    });
  } catch (error) {
    next(error);
  }
});

export default router;
