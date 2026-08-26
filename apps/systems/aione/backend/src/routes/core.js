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

router.get("/work-home", async (req, res, next) => {
  try {
    const context = getRequestContext(req);
    if (!context.personId) {
      return res.status(401).json({ error:"authenticated_actor_required", message:"工作之家需要已认证的AIONE人员身份。" });
    }
    const limit = normalizeLimit(req.query.limit || 200);
    const result = await pool.query(
      `SELECT * FROM public.work_items
       WHERE archived_at IS NULL AND (owner_person_id=$1 OR created_by_person_id=$1)
       ORDER BY CASE status WHEN 'pending' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'waiting' THEN 3 WHEN 'blocked' THEN 4 WHEN 'completed' THEN 5 ELSE 6 END,
                CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
                due_at NULLS LAST, created_at DESC
       LIMIT $2`,
      [context.personId, limit]
    );
    return res.json({ personId:context.personId, items:result.rows.map(snakeToCamel), limit });
  } catch (error) {
    return next(error);
  }
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
