import pool from "../db.js";
import { executeBenefitFeatureImageTechnicalAcceptance } from "../src/services/design-ai-output-service.js";
import { getGcsObjectMetadata } from "../src/integrations/google-cloud-storage-client.js";

const PRODUCT_CODE = process.env.AIONE_ACCEPT_IMAGE_PRODUCT_CODE || "MH0000002";
const TEMPLATE_ID = "dtpl_socks_rakuten_benefit_1000x1500_v1";
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

async function main() {
  if (!String(process.env.OPENAI_API_KEY || "").trim()) fail("OPENAI_API_KEY is required for live OpenAI image acceptance.");

  const context = {
    personId: null,
    actorKind: "system",
    sourceSystem: "aione-assisted-design-openai-technical-acceptance-v1"
  };
  const prompt = String(process.env.AIONE_ACCEPT_IMAGE_PROMPT || DEFAULT_PROMPT).trim();
  const result = await executeBenefitFeatureImageTechnicalAcceptance(pool, {
    productCode: PRODUCT_CODE,
    templateId: TEMPLATE_ID,
    prompt
  }, context);

  const output = result.output;
  if (!output) fail("OpenAI acceptance produced no DERIVED output.");
  if (output.metadata?.layer !== "DERIVED") fail("Output is not marked DERIVED.");
  if (output.metadata?.operationType !== "benefit_feature_image") fail("Output operation provenance is incorrect.");
  if (output.metadata?.executionType !== "ai" || output.metadata?.aiProvider !== "openai") fail("Output AI provider provenance is missing.");
  if (output.metadata?.executionMode !== "technical_acceptance") fail("Output is missing technical acceptance execution provenance.");
  if (Number(output.metadata?.width) !== 1000 || Number(output.metadata?.height) !== 1500) fail("Output canvas does not match 1000x1500 template.");
  if (!output.metadata?.aiExecutionId) fail("Output is missing AI execution trace identity.");
  if (output.metadata?.review?.status !== "pending") fail("Live technical acceptance output must remain pending explicit human visual review.");

  const gcs = await getGcsObjectMetadata({ bucketName: output.metadata.gcsBucket, objectName: output.metadata.gcsObject });
  if (!gcs || Number(gcs.size || 0) <= 0) fail("DERIVED GCS object is missing or empty.");

  process.stdout.write(`${JSON.stringify({
    contract: "AIONE Assisted Design OpenAI Live Acceptance V1",
    ok: true,
    productCode: result.product.product_code,
    actorKind: "system",
    executionMode: "technical_acceptance",
    technicalAcceptanceRef: result.executionRef,
    outputAssetId: output.id,
    aiExecutionId: result.aiExecutionId,
    provider: result.provider,
    model: result.model,
    canvas: `${output.metadata.width}x${output.metadata.height}`,
    gcsBucket: output.metadata.gcsBucket,
    gcsObject: output.metadata.gcsObject,
    reviewStatus: output.metadata.review.status
  }, null, 2)}\n`);
  process.stdout.write("[AIONE] ASSISTED DESIGN OPENAI LIVE ACCEPTANCE V1 PASS\n");
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.code || "assisted_design_openai_acceptance_failed", message: error.message, details: error.details || undefined }, null, 2));
  process.exitCode = 1;
}).finally(async () => { await pool.end().catch(() => {}); });
