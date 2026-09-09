import { Router } from "express";
import pool, { withTransaction } from "../../db.js";
import { getRequestContext, requireWriteActor } from "../http/context.js";
import { makeId, recordBusinessEvent } from "../services/event-service.js";

const router = Router();

function snakeToCamel(row) {
  const out = {};
  for (const [key, value] of Object.entries(row || {})) {
    out[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
  }
  return out;
}

function requirePerson(req, res) {
  const context = req.aioneContext || getRequestContext(req);
  if (!context?.personId) {
    res.status(401).json({ error: "authenticated_actor_required" });
    return null;
  }
  return context;
}

async function loadMyWorkItem(client, id, personId, { forUpdate = false } = {}) {
  const lock = forUpdate ? " FOR UPDATE" : "";
  const result = await client.query(
    `SELECT w.*, t.business_scope, t.evidence_policy, t.completion_policy,
            r.code AS recurring_rule_code, r.name AS recurring_rule_name, r.rule_version
     FROM public.work_items w
     LEFT JOIN public.work_templates t ON t.id=w.work_template_id
     LEFT JOIN public.recurring_rules r ON r.id=w.recurring_rule_id
     WHERE w.id=$1 AND w.responsible_person_id=$2 AND w.archived_at IS NULL${lock}`,
    [id, personId]
  );
  return result.rows[0] || null;
}

router.get("/work-items/my", async (req, res, next) => {
  const context = requirePerson(req, res);
  if (!context) return;
  try {
    const values = [context.personId];
    const where = ["w.responsible_person_id=$1", "w.archived_at IS NULL"];
    if (req.query.status) {
      values.push(String(req.query.status));
      where.push(`w.status=$${values.length}`);
    }
    if (req.query.cycleKey) {
      values.push(String(req.query.cycleKey));
      where.push(`w.cycle_key=$${values.length}`);
    }
    if (req.query.active === "true") {
      where.push("w.status NOT IN ('completed','cancelled','archived')");
    }
    const result = await pool.query(
      `SELECT w.*, t.business_scope, t.evidence_policy, t.completion_policy,
              r.code AS recurring_rule_code, r.name AS recurring_rule_name, r.rule_version,
              CASE WHEN w.completed_at IS NULL AND w.due_at IS NOT NULL AND w.due_at < NOW() THEN TRUE ELSE FALSE END AS is_overdue
       FROM public.work_items w
       LEFT JOIN public.work_templates t ON t.id=w.work_template_id
       LEFT JOIN public.recurring_rules r ON r.id=w.recurring_rule_id
       WHERE ${where.join(" AND ")}
       ORDER BY CASE WHEN w.completed_at IS NULL THEN 0 ELSE 1 END, w.due_at NULLS LAST, w.created_at DESC
       LIMIT 200`,
      values
    );
    return res.json({ items: result.rows.map(snakeToCamel) });
  } catch (error) {
    return next(error);
  }
});

router.get("/work-items/:id/runtime", async (req, res, next) => {
  const context = requirePerson(req, res);
  if (!context) return;
  try {
    const item = await loadMyWorkItem(pool, req.params.id, context.personId);
    if (!item) return res.status(404).json({ error: "not_found" });
    const evidence = await pool.query(
      `SELECT * FROM public.work_evidence WHERE work_item_id=$1 ORDER BY happened_at DESC, created_at DESC`,
      [req.params.id]
    );
    return res.json({ item: snakeToCamel(item), evidence: evidence.rows.map(snakeToCamel) });
  } catch (error) {
    return next(error);
  }
});

router.post("/work-items/:id/start", requireWriteActor, async (req, res, next) => {
  const context = req.aioneContext || getRequestContext(req);
  try {
    const updated = await withTransaction(async (client) => {
      const item = await loadMyWorkItem(client, req.params.id, context.personId, { forUpdate: true });
      if (!item) return null;
      if (["completed", "cancelled", "archived"].includes(item.status)) return item;
      if (item.status === "in_progress") return item;
      const result = await client.query(
        `UPDATE public.work_items
         SET status='in_progress', started_at=COALESCE(started_at,NOW()), updated_at=NOW(),
             updated_by_person_id=$2, record_version=record_version+1
         WHERE id=$1 RETURNING *`,
        [item.id, context.personId]
      );
      await recordBusinessEvent(client, {
        eventType: "work-item.started", objectType: "work-items", objectId: item.id, context,
        payload: { previousStatus: item.status }
      });
      return result.rows[0];
    });
    if (!updated) return res.status(404).json({ error: "not_found" });
    return res.json(snakeToCamel(updated));
  } catch (error) {
    return next(error);
  }
});

router.post("/work-items/:id/evidence", requireWriteActor, async (req, res, next) => {
  const context = req.aioneContext || getRequestContext(req);
  const provider = String(req.body?.provider || "").trim();
  const providerFileId = String(req.body?.providerFileId || "").trim();
  const fileName = String(req.body?.fileName || "").trim();
  const evidenceUri = String(req.body?.evidenceUri || "").trim();
  if (!provider || !providerFileId || !fileName) {
    return res.status(400).json({ error: "bad_request", message: "provider, providerFileId and fileName are required." });
  }
  try {
    const evidence = await withTransaction(async (client) => {
      const item = await loadMyWorkItem(client, req.params.id, context.personId, { forUpdate: true });
      if (!item) return null;
      if (["completed", "cancelled", "archived"].includes(item.status)) {
        const error = new Error("Work item no longer accepts evidence.");
        error.statusCode = 409;
        throw error;
      }
      const existing = await client.query(
        "SELECT * FROM public.work_evidence WHERE work_item_id=$1 AND provider=$2 AND provider_file_id=$3 ORDER BY created_at DESC LIMIT 1",
        [item.id, provider, providerFileId]
      );
      if (existing.rowCount) return existing.rows[0];
      const id = makeId("wev");
      const inserted = await client.query(
        `INSERT INTO public.work_evidence (
           id,work_item_id,person_id,business_id,evidence_type,action_code,happened_at,summary,evidence_uri,
           source_system,payload,provider,provider_file_id,file_name,validation_status
         ) VALUES ($1,$2,$3,$4,'file_submission','submitted',NOW(),$5,$6,$7,$8::jsonb,$9,$10,$11,'pending') RETURNING *`,
        [id,item.id,context.personId,item.business_id,`提交证据：${fileName}`,evidenceUri||null,context.sourceSystem,JSON.stringify(req.body?.metadata||{}),provider,providerFileId,fileName]
      );
      await client.query(
        `UPDATE public.work_items SET status='waiting', updated_at=NOW(), updated_by_person_id=$2,
         record_version=record_version+1 WHERE id=$1`,
        [item.id, context.personId]
      );
      await recordBusinessEvent(client, {
        eventType: "work-evidence.submitted", objectType: "work-items", objectId: item.id, context,
        payload: { evidenceId: id, provider, providerFileId, fileName }
      });
      return inserted.rows[0];
    });
    if (!evidence) return res.status(404).json({ error: "not_found" });
    return res.status(201).json(snakeToCamel(evidence));
  } catch (error) {
    return next(error);
  }
});

export default router;
