import pool, { withTransaction } from "../../db.js";
import { makeId, recordBusinessEvent } from "./event-service.js";

const TOKYO_TZ = "Asia/Tokyo";

function tokyoDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TOKYO_TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short"
  }).formatToParts(date);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

export function weeklyCycleKey(date = new Date()) {
  const p = tokyoDateParts(date);
  const local = new Date(`${p.year}-${p.month}-${p.day}T00:00:00+09:00`);
  const day = local.getUTCDay();
  const sunday = new Date(local);
  sunday.setUTCDate(local.getUTCDate() - day);
  return sunday.toISOString().slice(0, 10);
}

function weeklyDueAt(cycleKey, deadlineDay = 6, deadlineTime = "20:00:00") {
  const start = new Date(`${cycleKey}T00:00:00+09:00`);
  start.setUTCDate(start.getUTCDate() + Number(deadlineDay || 6));
  const date = start.toISOString().slice(0, 10);
  return new Date(`${date}T${String(deadlineTime || "20:00:00").slice(0, 8)}+09:00`).toISOString();
}

async function resolveAudience(client, rule) {
  const policy = rule.audience_policy || {};
  if (Array.isArray(policy.personIds) && policy.personIds.length) {
    return [...new Set(policy.personIds.map(String).filter(Boolean))];
  }
  if (policy.assignmentStatus) {
    const result = await client.query(
      "SELECT DISTINCT person_id FROM public.assignments WHERE status=$1 AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)",
      [policy.assignmentStatus]
    );
    return result.rows.map((row) => row.person_id).filter(Boolean);
  }
  return [];
}

export async function generateRecurringWork({ ruleCode, cycleKey = null, actorPersonId = null, sourceSystem = "aione-scheduler" }) {
  return withTransaction(async (client) => {
    const ruleResult = await client.query(`
      SELECT r.*, t.title AS template_title, t.description AS template_description, t.work_type AS template_work_type,
             t.business_id AS template_business_id, t.related_object_type AS template_related_object_type,
             t.related_object_id AS template_related_object_id, t.completion_policy, t.evidence_policy
      FROM public.recurring_rules r
      JOIN public.work_templates t ON t.id=r.work_template_id
      WHERE r.code=$1 AND r.is_active=TRUE AND t.status='active'
    `, [ruleCode]);
    if (!ruleResult.rowCount) {
      const error = new Error("Active recurring rule not found.");
      error.statusCode = 404;
      throw error;
    }
    const rule = ruleResult.rows[0];
    const resolvedCycleKey = cycleKey || weeklyCycleKey();
    const assignees = await resolveAudience(client, rule);
    const dueAt = rule.cadence === "weekly" ? weeklyDueAt(resolvedCycleKey, rule.deadline_day, rule.deadline_time) : null;
    const generated = [];

    for (const personId of assignees) {
      const id = makeId("wrk");
      const metadata = {
        recurring: true,
        ruleCode: rule.code,
        ruleVersion: rule.rule_version,
        completionPolicy: rule.completion_policy || {},
        evidencePolicy: rule.evidence_policy || {},
        visibility: "restricted"
      };
      const result = await client.query(`
        INSERT INTO public.work_items (
          id,title,work_type,status,priority,business_id,owner_person_id,responsible_person_id,
          assigned_by_person_id,verifier_person_id,related_object_type,related_object_id,description,
          due_at,work_template_id,recurring_rule_id,cycle_key,generated_at,metadata,source_system
        ) VALUES ($1,$2,$3,'pending','normal',$4,$5,$5,$6,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),$14::jsonb,$15)
        ON CONFLICT (recurring_rule_id, cycle_key, responsible_person_id)
          WHERE recurring_rule_id IS NOT NULL AND cycle_key IS NOT NULL AND responsible_person_id IS NOT NULL AND archived_at IS NULL
        DO NOTHING
        RETURNING *
      `, [
        id, rule.template_title, rule.template_work_type, rule.template_business_id, personId,
        actorPersonId, rule.template_related_object_type, rule.template_related_object_id,
        rule.template_description, dueAt, rule.work_template_id, rule.id, resolvedCycleKey,
        JSON.stringify(metadata), sourceSystem
      ]);
      if (result.rowCount) {
        generated.push(result.rows[0]);
        await recordBusinessEvent(client, {
          eventType: "work-item.recurring-generated", objectType: "work-items", objectId: id,
          context: { personId: actorPersonId, sourceSystem },
          payload: { recurringRuleId: rule.id, ruleCode: rule.code, cycleKey: resolvedCycleKey, assigneePersonId: personId }
        });
      }
    }
    return { ruleCode: rule.code, cycleKey: resolvedCycleKey, assigneeCount: assignees.length, generatedCount: generated.length, items: generated };
  });
}

export async function markOverdueWork({ now = new Date() } = {}) {
  const result = await pool.query(`
    UPDATE public.work_items
    SET overdue_at=COALESCE(overdue_at,$1), updated_at=NOW(), record_version=record_version+1
    WHERE archived_at IS NULL AND completed_at IS NULL AND due_at IS NOT NULL AND due_at < $1 AND overdue_at IS NULL
    RETURNING id, responsible_person_id, due_at, overdue_at
  `, [now.toISOString()]);
  return { updatedCount: result.rowCount, items: result.rows };
}
