import pool from "../db.js";

const EXPECTED_SOURCE_REFS = [
  "582318159544",
  "1055540915024",
  "855305580969"
];

function zipEvidenceName(zip) {
  return String(zip?.name || zip?.fileName || "").trim();
}

function zipMatchesSourceRef(row) {
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const zip = metadata.sourceMaterialZip;
  const name = zipEvidenceName(zip);
  if (!zip || !zip.fileId || !name) return false;
  const match = /^1688_(\d+)(?:[ _-].*)?\.zip$/i.exec(name);
  return Boolean(match && match[1] === String(row.source_ref));
}

function summarize(row) {
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const zip = metadata.sourceMaterialZip || null;
  const name = zipEvidenceName(zip);
  return {
    id: row.id,
    selectionNo: row.selection_no,
    lifecycleStatus: row.lifecycle_status,
    sourcePlatform: row.source_platform,
    sourceRef: row.source_ref,
    title: row.title,
    sourcePrice: row.source_price,
    sourceCurrency: row.source_currency,
    sourceGroup: row.source_group,
    sourceTags: row.source_tags,
    sourceWeightG: row.source_weight_g,
    sourceFulfillmentHint: row.source_fulfillment_hint,
    zip: zip ? { fileId: zip.fileId || null, name: name || null } : null
  };
}

async function main() {
  const result = await pool.query(
    `SELECT *
       FROM public.product_opportunities
      WHERE source_platform = '1688'
        AND source_ref = ANY($1::text[])
        AND archived_at IS NULL
      ORDER BY source_ref, created_at`,
    [EXPECTED_SOURCE_REFS]
  );

  const rows = result.rows;
  const byRef = new Map();
  for (const row of rows) {
    const key = String(row.source_ref);
    if (!byRef.has(key)) byRef.set(key, []);
    byRef.get(key).push(row);
  }

  const checks = [];
  for (const sourceRef of EXPECTED_SOURCE_REFS) {
    const matches = byRef.get(sourceRef) || [];
    checks.push({
      sourceRef,
      exactlyOneOpportunity: matches.length === 1,
      count: matches.length,
      validSelectionNo: matches.length === 1 && /^xp\d{9}$/.test(String(matches[0].selection_no || "")),
      validLifecycle: matches.length === 1 && ["pending", "selected", "rejected", "converted"].includes(String(matches[0].lifecycle_status)),
      sourceCurrencyCny: matches.length === 1 && String(matches[0].source_currency) === "CNY",
      sourceGroupPresent: matches.length === 1 && Boolean(String(matches[0].source_group || "").trim()),
      sourceWeightPositive: matches.length === 1 && Number(matches[0].source_weight_g) > 0,
      zipEvidenceMatches: matches.length === 1 && zipMatchesSourceRef(matches[0])
    });
  }

  const failures = [];
  for (const check of checks) {
    for (const [name, value] of Object.entries(check)) {
      if (["sourceRef", "count"].includes(name)) continue;
      if (value !== true) failures.push({ sourceRef: check.sourceRef, check: name, value });
    }
  }

  const duplicateResult = await pool.query(
    `SELECT source_platform, source_ref, COUNT(*)::int AS count
       FROM public.product_opportunities
      WHERE archived_at IS NULL
        AND source_ref IS NOT NULL
      GROUP BY source_platform, source_ref
     HAVING COUNT(*) > 1
      ORDER BY count DESC, source_platform, source_ref`
  );

  if (duplicateResult.rowCount) {
    failures.push({ check: "noDuplicateSourceIdentity", duplicates: duplicateResult.rows });
  }

  const summary = {
    ok: failures.length === 0,
    contract: "AIONE Selection Backend Closure V1 acceptance",
    expectedSourceRefs: EXPECTED_SOURCE_REFS,
    matchedRows: rows.length,
    checks,
    records: rows.map(summarize),
    failures
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!summary.ok) process.exitCode = 20;
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.code || "selection_backend_acceptance_failed", message: error.message }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
