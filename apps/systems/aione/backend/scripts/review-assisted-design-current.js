import pool, { withTransaction } from "../db.js";
import { reviewDesignTask } from "../src/services/design-task-service.js";

const TRANSITIONAL_ADMIN_EMAIL = "info@miwa-happyhouse.com";

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function resolveHumanActor(email) {
  if (!email || !email.includes("@")) fail("AIONE_REVIEW_HUMAN_EMAIL is required.");
  if (email === TRANSITIONAL_ADMIN_EMAIL) fail("The transitional admin identity cannot be used as human review evidence.");

  const result = await pool.query(`
    SELECT DISTINCT p.id
      FROM public.people p
      JOIN public.external_identities e ON e.person_id=p.id
     WHERE p.status='active' AND p.archived_at IS NULL
       AND e.status='active' AND LOWER(e.provider)='google'
       AND LOWER(COALESCE(p.primary_email,e.email_snapshot,''))=$1
  `, [email]);

  if (result.rowCount !== 1) {
    fail("Explicit review email must resolve to exactly one active canonical Google human identity.", { candidateCount: result.rowCount });
  }
  return result.rows[0].id;
}

async function main() {
  const taskId = String(process.env.AIONE_REVIEW_TASK_ID || "").trim();
  const outcome = String(process.env.AIONE_REVIEW_OUTCOME || "").trim().toLowerCase();
  const email = normalizeEmail(process.env.AIONE_REVIEW_HUMAN_EMAIL);
  if (!taskId) fail("AIONE_REVIEW_TASK_ID is required.");
  if (!new Set(["approve", "reject", "regenerate"]).has(outcome)) fail("AIONE_REVIEW_OUTCOME must be approve, reject or regenerate.");

  let detail = {};
  if (process.env.AIONE_REVIEW_DETAIL_JSON) {
    try {
      detail = JSON.parse(process.env.AIONE_REVIEW_DETAIL_JSON);
    } catch {
      fail("AIONE_REVIEW_DETAIL_JSON must be valid JSON.");
    }
  }

  const personId = await resolveHumanActor(email);
  const context = { personId, actorKind: "human", sourceSystem: "aione-assisted-design-explicit-review-v1" };
  const task = await withTransaction((client) => reviewDesignTask(client, taskId, { outcome, detail }, context));

  process.stdout.write(`${JSON.stringify({
    contract: "AIONE Assisted Design Explicit Human Review V1",
    ok: true,
    taskId: task.id,
    reviewStatus: task.review_status,
    humanEmail: email,
    reviewedByPersonId: task.reviewed_by_person_id,
    reviewDetail: task.review_detail
  }, null, 2)}\n`);
  process.stdout.write("[AIONE] ASSISTED DESIGN EXPLICIT HUMAN REVIEW V1 PASS\n");
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.code || "assisted_design_review_failed", message: error.message, details: error.details || undefined }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
