import pool, { withTransaction } from "../db.js";
import { createDesignTask, proposeDesignTask, approveDesignTask } from "../src/services/design-task-service.js";
import { executeNormalizeCanvas, listDesignTaskOutputs } from "../src/services/design-output-service.js";
import { getGcsObjectMetadata } from "../src/integrations/google-cloud-storage-client.js";

const PRODUCT_CODE = "MH0000002";
const TEMPLATE_ID = "dtpl_socks_rakuten_benefit_1000x1500_v1";
const TRANSITIONAL_ADMIN_EMAIL = "info@miwa-happyhouse.com";

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function resolveHumanActor() {
  const requestedEmail = normalizeEmail(process.env.AIONE_ACCEPT_HUMAN_EMAIL);
  if (!requestedEmail || !requestedEmail.includes("@")) {
    fail("AIONE_ACCEPT_HUMAN_EMAIL is required for explicit human acceptance identity.");
  }
  if (requestedEmail === TRANSITIONAL_ADMIN_EMAIL) {
    fail("The transitional admin identity cannot be used as human acceptance evidence.");
  }

  const result = await pool.query(`
    SELECT DISTINCT p.id
      FROM public.people p
      JOIN public.external_identities e ON e.person_id=p.id
     WHERE p.status='active' AND p.archived_at IS NULL
       AND e.status='active' AND LOWER(e.provider)='google'
       AND LOWER(COALESCE(p.primary_email,e.email_snapshot,''))=$1
  `, [requestedEmail]);

  if (result.rowCount !== 1) {
    fail("Explicit acceptance email must resolve to exactly one active canonical Google human identity.", {
      candidateCount: result.rowCount
    });
  }
  return result.rows[0].id;
}

async function main() {
  const personId = await resolveHumanActor();
  const context = { personId, actorKind: "human", sourceSystem: "aione-assisted-design-deterministic-acceptance-v1" };

  const productResult = await pool.query("SELECT id, product_code, name FROM public.products WHERE product_code=$1 AND archived_at IS NULL LIMIT 2", [PRODUCT_CODE]);
  if (productResult.rowCount !== 1) fail("Expected exactly one acceptance Product.", { count: productResult.rowCount });
  const product = productResult.rows[0];

  const assetResult = await pool.query(`
    SELECT * FROM public.product_assets
     WHERE product_id=$1 AND archived_at IS NULL
       AND asset_role='source_main_image' AND metadata->>'layer'='SOURCE'
       AND COALESCE(metadata->>'gcsBucket','')<>'' AND COALESCE(metadata->>'gcsObject','')<>''
     ORDER BY asset_no LIMIT 1
  `, [product.id]);
  if (!assetResult.rowCount) fail("No canonical SOURCE main image is available for acceptance.");
  const sourceAsset = assetResult.rows[0];

  const created = await withTransaction((client) => createDesignTask(client, {
    productId: product.id,
    templateId: TEMPLATE_ID,
    taskType: "normalize_canvas",
    inputAssetIds: [sourceAsset.id],
    inputFactSnapshot: { productCode: product.product_code, productName: product.name || null },
    instructionSnapshot: { operation: "normalize_canvas", acceptance: "v1" },
    context
  }));

  let task = created.task;
  if (task.task_status === "draft") task = await withTransaction((client) => proposeDesignTask(client, task.id, context));
  if (task.task_status === "proposed") task = await withTransaction((client) => approveDesignTask(client, task.id, context));
  if (!["approved","completed"].includes(task.task_status)) fail("Acceptance DesignTask is not executable.", { status: task.task_status });

  const first = await executeNormalizeCanvas(pool, task.id, context);
  const second = await executeNormalizeCanvas(pool, task.id, context);
  const outputs = await listDesignTaskOutputs(pool, task.id);
  if (outputs.length !== 1) fail("Expected exactly one DERIVED output for idempotent acceptance.", { outputCount: outputs.length });
  const output = outputs[0];

  if (output.metadata?.layer !== "DERIVED") fail("Output is not marked DERIVED.");
  if (output.metadata?.designTaskId !== task.id) fail("Output provenance is missing DesignTask identity.");
  if (output.metadata?.sourceAssetIds?.[0] !== sourceAsset.id) fail("Output provenance is missing SOURCE asset identity.");
  if (Number(output.metadata?.width) !== 1000 || Number(output.metadata?.height) !== 1500) fail("Output canvas does not match 1000x1500 template.");

  const gcs = await getGcsObjectMetadata({ bucketName: output.metadata.gcsBucket, objectName: output.metadata.gcsObject });
  if (!gcs || Number(gcs.size || 0) <= 0) fail("DERIVED GCS object is missing or empty.");

  const finalTask = first.task;
  if (!finalTask.review_status) fail("DesignTask review status is missing after output generation.");
  if (finalTask.review_status === "approved") {
    fail("Technical acceptance cannot certify a previously auto-approved visual output. Human visual review must be explicit and separate.");
  }

  const summary = {
    contract: "AIONE Assisted Design Deterministic Technical Closure V1",
    ok: true,
    productCode: product.product_code,
    taskId: task.id,
    taskReused: created.reused,
    firstExecutionReused: first.reused,
    secondExecutionReused: second.reused,
    sourceAssetId: sourceAsset.id,
    outputAssetId: output.id,
    outputLayer: output.metadata.layer,
    canvas: `${output.metadata.width}x${output.metadata.height}`,
    gcsObject: output.metadata.gcsObject,
    reviewStatus: finalTask.review_status,
    humanActorResolved: true,
    humanIdentityResolution: "explicit_active_google_identity"
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write("[AIONE] ASSISTED DESIGN DETERMINISTIC TECHNICAL CLOSURE V1 PASS\n");
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.code || "assisted_design_acceptance_failed", message: error.message, details: error.details || undefined }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
