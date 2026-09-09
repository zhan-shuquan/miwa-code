import pool from "../db.js";

async function main() {
  const statusResult = await pool.query(`
    SELECT lifecycle_status, COUNT(*)::int AS count
      FROM public.product_opportunities
     GROUP BY lifecycle_status
     ORDER BY lifecycle_status
  `);

  const rows = statusResult.rows;
  const allowedLegacy = new Set([
    "discovered",
    "reviewing",
    "qualified",
    "rejected",
    "converted",
    "pending",
    "selected"
  ]);
  const unknown = rows.filter((row) => !allowedLegacy.has(String(row.lifecycle_status)));
  const archived = rows.find((row) => String(row.lifecycle_status) === "archived");

  const summary = {
    ok: unknown.length === 0 && !archived,
    database: process.env.DB_NAME || process.env.DATABASE_URL ? "configured" : "unknown",
    statuses: rows,
    blockers: []
  };

  if (archived) {
    summary.blockers.push({
      code: "archived_selection_requires_disposition",
      count: archived.count,
      message: "Archived ProductOpportunity rows require explicit human disposition before CURRENT status normalization."
    });
  }

  if (unknown.length) {
    summary.blockers.push({
      code: "unknown_selection_status",
      values: unknown,
      message: "Unknown ProductOpportunity lifecycle_status values must be resolved before migration 0092."
    });
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!summary.ok) process.exitCode = 20;
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.code || "selection_audit_failed", message: error.message }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
