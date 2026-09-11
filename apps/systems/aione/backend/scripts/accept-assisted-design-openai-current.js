import pool, { withTransaction } from "../db.js";
import { createDesignTask, proposeDesignTask, approveDesignTask } from "../src/services/design-task-service.js";
import { executeDesignTask } from "../src/services/design-execution-service.js";
import { getGcsObjectMetadata } from "../src/integrations/google-cloud-storage-client.js";

const PRODUCT_CODE = process.env.AIONE_ACCEPT_IMAGE_PRODUCT_CODE || "MH0000002";
const TEMPLATE_ID = "dtpl_socks_rakuten_benefit_1000x1500_v1";
const ACCEPTANCE_REVISION = "openai-benefit-v1";
const TRANSITIONAL_ADMIN_EMAIL = "info@miwa-happyhouse.com";
const DEFAULT_PROMPT = [
  "Create a premium Japanese Rakuten ecommerce benefit/feature image using the supplied real product photos.",
  "Make the real product the dominant visual subject. Emphasize only visible construction, texture, pattern and styling evidence from the SOURCE images.",
  "Use a clean Japanese ecommerce composition with generous spacing and a restrained neutral background.",
  "Do not add unsupported measurements, materials, certifications, warmth claims, performance claims, logos, accessories or invented product details.",
  "Avoid fabricated Japanese marketing copy. If text is needed for composition, use only neutral labels such as DETAIL or POINT."
].join("\n");

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}
function normalizeEmail(value) { return String(value || "").trim().toLowerCase(); }

async function resolveHumanActor() {
  const requestedEmail = normalizeEmail(process.env.AIONE_ACCEPT_HUMAN_EMAIL);
  if (!requestedEmail || !requestedEmail.includes("@")) fail("AIONE_ACCEPT_HUMAN_EMAIL is required for explicit human acceptance identity.");
  if (requestedEmail === TRANSITIONAL_ADMIN_EMAIL) fail("The transitional admin identity cannot be used as human acceptance evidence.");
  const result = await pool.query(`
    SELECT DISTINCT p.id FROM public.people p
    JOIN public.external_identities e ON e.person_id=p.id
    WHERE p.status='active' AND p.archived_at IS NULL AND e.status='active'
      AND LOWER(e.provider)='google' AND LOWER(COALESCE(p.primary_email,e.email_snapshot,''))=$1
  `, [requestedEmail]);
  if (result.rowCount !== 1) fail("Explicit acceptance email must resolve to exactly one active canonical Google human identity.", { candidateCount: result.rowCount });
  return result.rows[0].id;
}

async function main() {
  if (!String(process.env.OPENAI_API_KEY || "").trim()) fail("OPENAI_API_KEY is required for live OpenAI image acceptance.");
  const personId = await resolveHumanActor();
  const context = { personId, actorKind: "human", sourceSystem: "aione-assisted-design-openai-acceptance-v1" };

  const productResult = await pool.query("SELECT id, product_code, name FROM public.products WHERE product_code=$1 AND archived_at IS NULL LIMIT 2", [PRODUCT_CODE]);
  if (productResult.rowCount !== 1) fail("Expected exactly one acceptance Product.", { count: productResult.rowCount, productCode: PRODUCT_CODE });
  const product = productResult.rows[0];

  const assetResult = await pool.query(`
    SELECT * FROM public.product_assets
    WHERE product_id=$1 AND archived_at IS NULL AND metadata->>'layer'='SOURCE'
      AND asset_role IN ('source_main_image','source_detail_image')
      AND COALESCE(metadata->>'gcsBucket','')<>'' AND COALESCE(metadata->>'gcsObject','')<>''
    ORDER BY CASE asset_role WHEN 'source_main_image' THEN 0 ELSE 1 END, asset_no
  `, [product.id]);
  const mainAsset = assetResult.rows.find((row) => row.asset_role === "source_main_image");
  const detailAsset = assetResult.rows.find((row) => row.asset_role === "source_detail_image");
  if (!mainAsset || !detailAsset) fail("Live image acceptance requires canonical SOURCE main and detail images.", { roles: [...new Set(assetResult.rows.map((row) => row.asset_role))] });

  const prompt = String(process.env.AIONE_ACCEPT_IMAGE_PROMPT || DEFAULT_PROMPT).trim();
  const created = await withTransaction((client) => createDesignTask(client, {
    productId: product.id,
    templateId: TEMPLATE_ID,
    taskType: "benefit_feature_image",
    inputAssetIds: [mainAsset.id, detailAsset.id],
    inputFactSnapshot: { productCode: product.product_code, productName: product.name || null },
    instructionSnapshot: { operation: "benefit_feature_image", acceptanceRevision: ACCEPTANCE_REVISION, prompt },
    context
  }));

  let task = created.task;
  if (task.task_status === "draft") task = await withTransaction((client) => proposeDesignTask(client, task.id, context));
  if (task.task_status === "proposed") task = await withTransaction((client) => approveDesignTask(client, task.id, context));
  if (!["approved","completed"].includes(task.task_status)) fail("Acceptance DesignTask is not executable.", { status: task.task_status });

  const executed = await executeDesignTask(pool, task.id, context);
  if (!executed.outputs?.length) fail("OpenAI acceptance produced no DERIVED output.");
  const output = executed.outputs[0];
  if (output.metadata?.layer !== "DERIVED") fail("Output is not marked DERIVED.");
  if (output.metadata?.operationType !== "benefit_feature_image") fail("Output operation provenance is incorrect.");
  if (output.metadata?.executionType !== "ai" || output.metadata?.aiProvider !== "openai") fail("Output AI provider provenance is missing.");
  if (Number(output.metadata?.width) !== 1000 || Number(output.metadata?.height) !== 1500) fail("Output canvas does not match 1000x1500 template.");
  if (!output.metadata?.aiExecutionId) fail("Output is missing AI execution trace identity.");
  if (executed.task?.review_status === "approved") fail("Live generation must remain pending explicit human visual review.");

  const gcs = await getGcsObjectMetadata({ bucketName: output.metadata.gcsBucket, objectName: output.metadata.gcsObject });
  if (!gcs || Number(gcs.size || 0) <= 0) fail("DERIVED GCS object is missing or empty.");

  process.stdout.write(`${JSON.stringify({
    contract: "AIONE Assisted Design OpenAI Live Acceptance V1",
    ok: true,
    productCode: product.product_code,
    taskId: task.id,
    outputAssetId: output.id,
    aiExecutionId: output.metadata.aiExecutionId,
    provider: output.metadata.aiProvider,
    model: output.metadata.aiModel,
    canvas: `${output.metadata.width}x${output.metadata.height}`,
    gcsBucket: output.metadata.gcsBucket,
    gcsObject: output.metadata.gcsObject,
    reviewStatus: executed.task.review_status,
    reused: executed.reused
  }, null, 2)}\n`);
  process.stdout.write("[AIONE] ASSISTED DESIGN OPENAI LIVE ACCEPTANCE V1 PASS\n");
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.code || "assisted_design_openai_acceptance_failed", message: error.message, details: error.details || undefined }, null, 2));
  process.exitCode = 1;
}).finally(async () => { await pool.end().catch(() => {}); });
