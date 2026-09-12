import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import pool from "../db.js";
import { buildDeterministicCopyPlan } from "../src/services/design-copy-overlay-service.js";
import { readGcsObject, uploadGcsObjectIfAbsent, getGcsObjectMetadata } from "../src/integrations/google-cloud-storage-client.js";
import { recordBusinessEvent } from "../src/services/event-service.js";

const execFileAsync = promisify(execFile);
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const MIGRATION_PATH = resolve(__dirname, "../../../../../data-code/migrations/0097_deterministic_copy_overlay_v1.sql");
const PRODUCT_CODE = String(process.env.AIONE_ACCEPT_COPY_PRODUCT_CODE || "").trim();
const SOURCE_ASSET_ID = String(process.env.AIONE_ACCEPT_COPY_SOURCE_ASSET_ID || "").trim();
const TEMPLATE_ID = "dtpl_socks_rakuten_benefit_1000x1500_v1";

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function migrationBody(sql) {
  return String(sql || "")
    .replace(/^\s*BEGIN;\s*/i, "")
    .replace(/\s*COMMIT;\s*$/i, "");
}

function parseCopyValues() {
  const encoded = String(process.env.AIONE_ACCEPT_COPY_JSON_B64 || "").trim();
  if (!encoded) fail("AIONE_ACCEPT_COPY_JSON_B64 is required.");
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) fail("Copy payload must be an object.");
    return parsed;
  } catch (error) {
    fail("Gate C copy payload must decode to valid JSON.", { cause: error.message });
  }
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function migrationState(client) {
  const result = await client.query(
    `SELECT EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='0097') AS applied`
  );
  return Boolean(result.rows[0]?.applied);
}

async function proveTemplateSnapshot() {
  const client = await pool.connect();
  let migrationAppliedBefore = false;
  let template;
  try {
    migrationAppliedBefore = await migrationState(client);
    await client.query("BEGIN");
    if (!migrationAppliedBefore) {
      const sql = await readFile(MIGRATION_PATH, "utf8");
      await client.query(migrationBody(sql));
    }
    const result = await client.query(
      `SELECT * FROM public.design_templates WHERE id=$1 AND archived_at IS NULL LIMIT 1`,
      [TEMPLATE_ID]
    );
    if (result.rowCount !== 1) fail("Gate C copy overlay template was not found.");
    template = result.rows[0];
    if (!Array.isArray(template.allowed_operations) || !template.allowed_operations.includes("deterministic_copy_overlay")) {
      fail("Gate C temporary template snapshot does not allow deterministic copy overlay.");
    }
    if (!template.layout_spec?.copyOverlay?.slots) fail("Gate C temporary template snapshot has no copy overlay slots.");
    await client.query("ROLLBACK");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  const after = await pool.query(`SELECT EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='0097') AS applied`);
  const migrationAppliedAfter = Boolean(after.rows[0]?.applied);
  if (migrationAppliedAfter !== migrationAppliedBefore) {
    fail("Gate C changed CURRENT migration state; forbidden before merge.", { migrationAppliedBefore, migrationAppliedAfter });
  }
  return { template, migrationAppliedBefore, migrationAppliedAfter };
}

async function loadSource() {
  const result = await pool.query(
    `SELECT p.id AS product_id, p.product_code, p.name AS product_name,
            a.id AS asset_id, a.mime_type, a.metadata
       FROM public.products p
       JOIN public.product_assets a ON a.product_id=p.id
      WHERE p.product_code=$1 AND p.archived_at IS NULL
        AND a.id=$2 AND a.archived_at IS NULL
      LIMIT 1`,
    [PRODUCT_CODE, SOURCE_ASSET_ID]
  );
  if (result.rowCount !== 1) fail("Gate C requires the explicit Product and DERIVED source asset to match.");
  const row = result.rows[0];
  const metadata = row.metadata || {};
  if (metadata.layer !== "DERIVED") fail("Gate C copy source must be DERIVED.");
  if (metadata.review?.status !== "approved") fail("Gate C copy source must already have explicit human approval.", { reviewStatus: metadata.review?.status || null });
  if (!String(row.mime_type || "").startsWith("image/")) fail("Gate C copy source must be an image.");
  if (!metadata.gcsBucket || !metadata.gcsObject) fail("Gate C copy source is missing canonical GCS storage.");
  return row;
}

async function renderOverlay(baseBytes, template, plan) {
  const root = await mkdtemp(join(tmpdir(), "aione-copy-gate-c-"));
  const basePath = join(root, "base.jpg");
  let currentPath = join(root, "step-0.jpg");
  await writeFile(basePath, baseBytes);
  try {
    await execFileAsync("convert", [
      basePath,
      "-auto-orient",
      "-resize", `${Number(template.canvas_width)}x${Number(template.canvas_height)}`,
      "-background", "white",
      "-gravity", "center",
      "-extent", `${Number(template.canvas_width)}x${Number(template.canvas_height)}`,
      "-strip",
      "-quality", "94",
      currentPath
    ], { maxBuffer: 20 * 1024 * 1024 });

    for (let index = 0; index < plan.blocks.length; index += 1) {
      const block = plan.blocks[index];
      const overlayPath = join(root, `overlay-${index}.png`);
      const nextPath = join(root, `step-${index + 1}.jpg`);
      await execFileAsync("convert", [
        "-background", "none",
        "-fill", block.fill,
        "-font", block.fontPath,
        "-pointsize", String(block.pointSize),
        "-gravity", block.gravity,
        "-size", `${block.width}x${block.height}`,
        `caption:${block.text}`,
        overlayPath
      ], { maxBuffer: 20 * 1024 * 1024 });
      await execFileAsync("convert", [
        currentPath,
        overlayPath,
        "-gravity", "NorthWest",
        "-geometry", `+${block.x}+${block.y}`,
        "-composite",
        "-strip",
        "-quality", "94",
        nextPath
      ], { maxBuffer: 20 * 1024 * 1024 });
      currentPath = nextPath;
    }
    const output = await readFile(currentPath);
    if (!output.length) fail("Gate C deterministic overlay produced no bytes.");
    return output;
  } finally {
    await rm(root, { recursive: true, force: true }).catch(() => {});
  }
}

async function main() {
  if (!PRODUCT_CODE) fail("AIONE_ACCEPT_COPY_PRODUCT_CODE is required.");
  if (!SOURCE_ASSET_ID) fail("AIONE_ACCEPT_COPY_SOURCE_ASSET_ID is required.");
  const copyValues = parseCopyValues();
  const proof = await proveTemplateSnapshot();
  const source = await loadSource();
  const plan = buildDeterministicCopyPlan(proof.template, copyValues, []);

  const canonical = await readGcsObject({
    bucketName: source.metadata.gcsBucket,
    objectName: source.metadata.gcsObject
  });
  const bytes = await renderOverlay(canonical.bytes, proof.template, plan);
  const fileHash = sha256(bytes);
  const next = await pool.query(
    `SELECT COALESCE(MAX(asset_no),0)+1 AS next_no FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL`,
    [source.product_id]
  );
  const assetNo = Number(next.rows[0]?.next_no || 0);
  if (!Number.isInteger(assetNo) || assetNo < 1 || assetNo > 999) fail("Gate C product asset capacity exhausted.");
  const outputAssetId = `ast_${randomUUID()}`;
  const acceptanceId = `copyaccept_${randomUUID()}`;
  const canonicalName = `${source.product_code}_D${String(assetNo).padStart(2, "0")}.jpg`;
  const gcsObject = `derived/${source.product_id}/${acceptanceId}/v1/${canonicalName}`;

  await uploadGcsObjectIfAbsent({
    bucketName: source.metadata.gcsBucket,
    objectName: gcsObject,
    buffer: bytes,
    contentType: "image/jpeg",
    metadata: {
      layer: "DERIVED",
      productId: source.product_id,
      operationType: "deterministic_copy_overlay",
      executionType: "technical_acceptance",
      parentDerivedAssetId: source.asset_id,
      fileSha256: fileHash
    }
  });

  const metadata = {
    layer: "DERIVED",
    designTemplateId: proof.template.id,
    designTemplateVersion: proof.template.version,
    sourceAssetIds: [source.asset_id],
    parentDerivedAssetId: source.asset_id,
    operationType: "deterministic_copy_overlay",
    executionType: "technical_acceptance",
    technicalAcceptance: true,
    aiGeneration: false,
    textPolicy: "deterministic_overlay",
    rendererVersion: plan.rendererVersion,
    copySlots: plan.blocks.map((block) => block.slot),
    copyValues,
    copyPayloadHash: sha256(Buffer.from(JSON.stringify(copyValues), "utf8")),
    fileSha256: fileHash,
    byteSize: bytes.length,
    width: Number(proof.template.canvas_width),
    height: Number(proof.template.canvas_height),
    gcsBucket: source.metadata.gcsBucket,
    gcsObject,
    validation: { storage: "passed", sourceDerivedReviewRequired: true, humanReviewRequired: true },
    review: { status: "pending" }
  };

  const inserted = await pool.query(
    `INSERT INTO public.product_assets
      (id, product_id, asset_no, asset_type, asset_role, source_provider, source_ref,
       original_name, canonical_name, mime_type, lifecycle_status, metadata, source_system)
     VALUES ($1,$2,$3,'image','derived_detail_image','aione-design',$4,$5,$5,'image/jpeg','formalized',$6::jsonb,$7)
     RETURNING *`,
    [outputAssetId, source.product_id, assetNo, `${acceptanceId}:deterministic_copy_overlay:v1`, canonicalName, JSON.stringify(metadata), "aione-deterministic-copy-overlay-gate-c-v1"]
  );

  await recordBusinessEvent(pool, {
    eventType: "product.design_copy_overlay_technical_acceptance_created",
    objectType: "product",
    objectId: source.product_id,
    context: { actorKind: "system", sourceSystem: "aione-deterministic-copy-overlay-gate-c-v1" },
    payload: { outputAssetId, sourceAssetId: source.asset_id, copySlots: plan.blocks.map((block) => block.slot), aiGeneration: false }
  });

  const gcs = await getGcsObjectMetadata({ bucketName: metadata.gcsBucket, objectName: metadata.gcsObject });
  if (!gcs || Number(gcs.size || 0) <= 0) fail("Gate C copy overlay GCS object is missing or empty.");

  process.stdout.write(`${JSON.stringify({
    contract: "AIONE Deterministic Copy Overlay Gate C V1",
    ok: true,
    productCode: source.product_code,
    productName: source.product_name || null,
    sourceAssetId: source.asset_id,
    sourceReviewStatus: source.metadata.review.status,
    templateId: proof.template.id,
    migrationAppliedBefore: proof.migrationAppliedBefore,
    migrationAppliedAfter: proof.migrationAppliedAfter,
    temporarySchemaRolledBack: !proof.migrationAppliedBefore,
    copyValues,
    rendererVersion: plan.rendererVersion,
    aiGeneration: false,
    outputAssetId: inserted.rows[0].id,
    canvas: `${metadata.width}x${metadata.height}`,
    gcsBucket: metadata.gcsBucket,
    gcsObject: metadata.gcsObject,
    reviewStatus: metadata.review.status,
    nextRequiredAction: "explicit-human-visual-review"
  }, null, 2)}\n`);
  process.stdout.write("[AIONE] DETERMINISTIC COPY OVERLAY GATE C PASS - HUMAN VISUAL REVIEW REQUIRED\n");
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.code || "deterministic_copy_overlay_gate_c_failed", message: error.message, details: error.details || undefined }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
