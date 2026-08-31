import fs from "node:fs/promises";
import pool from "../db.js";
import { collectDbContext, collectSchemaInventory, indexSchema } from "./preflight/schema-inventory.js";
import { collectTableProfiles, collectIdentityProfile } from "./preflight/data-profile.js";
import { collectRelationChecks } from "./preflight/relation-check.js";
import { evaluateRisks } from "./preflight/risk-evaluator.js";
import { renderMarkdown } from "./preflight/report-renderer.js";

function parseArgs(argv) {
  const options = { full: false, strict: false, markdownPath: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--full") options.full = true;
    else if (arg === "--strict") options.strict = true;
    else if (arg === "--markdown") {
      options.markdownPath = argv[i + 1];
      i += 1;
    }
  }
  return options;
}

async function appliedMigrations(db, schemaIndex) {
  if (!schemaIndex.tables.has("schema_migrations")) return [];
  const { rows } = await db.query("SELECT version, description, applied_at FROM public.schema_migrations ORDER BY version");
  return rows;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const environment = process.env.AIONE_ENV || process.env.NODE_ENV || "unknown";
  const runId = `db-preflight-${Date.now()}`;
  const client = await pool.connect();

  try {
    await client.query("BEGIN READ ONLY");

    const dbContext = await collectDbContext(client);
    const schemaInventory = await collectSchemaInventory(client);
    const schemaIndex = indexSchema(schemaInventory);
    const tableProfiles = await collectTableProfiles(client, schemaIndex);
    const identityProfile = await collectIdentityProfile(client, schemaIndex);
    const relationChecks = await collectRelationChecks(client, schemaIndex);
    const migrations = await appliedMigrations(client, schemaIndex);
    const riskResult = evaluateRisks({ identityProfile, relationChecks, schemaIndex });

    const report = {
      run_id: runId,
      environment,
      commit_sha: process.env.GIT_COMMIT_SHA || null,
      checked_at: new Date().toISOString(),
      db_context: dbContext,
      applied_migrations: migrations,
      schema_inventory: schemaInventory,
      table_profiles: tableProfiles,
      identity_profile: identityProfile,
      relation_checks: relationChecks,
      risks: riskResult.risks,
      blockers: riskResult.blockers,
      go_no_go: riskResult.go_no_go
    };

    await client.query("ROLLBACK");

    if (options.markdownPath) await fs.writeFile(options.markdownPath, renderMarkdown(report), "utf8");

    if (options.full) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(JSON.stringify({
        run_id: report.run_id,
        environment: report.environment,
        database: report.db_context?.database || null,
        checked_at: report.checked_at,
        applied_migrations: report.applied_migrations,
        table_counts: Object.fromEntries(Object.entries(report.table_profiles).map(([name, value]) => [name, value.row_count])),
        identity_profile: report.identity_profile,
        relation_checks: report.relation_checks,
        risks: report.risks,
        go_no_go: report.go_no_go
      }, null, 2));
    }

    if (options.strict && report.go_no_go === "NO-GO") process.exitCode = 2;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end().catch(() => {});
    process.exit(1);
  });