import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { getDesignTemplate } from "./design-template-service.js";
import { getDesignTask } from "./design-task-service.js";
import { readGcsObject, uploadGcsObjectIfAbsent } from "../integrations/google-cloud-storage-client.js";
import { recordBusinessEvent } from "./event-service.js";

const execFileAsync = promisify(execFile);
const OPERATION_TYPE = "deterministic_copy_overlay";
const FONT_REGISTRY = Object.freeze({
  "noto-sans-cjk-jp": "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
  "noto-sans-cjk-jp-bold": "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
});

function makeId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(stableJson(value), "utf8");
  return createHash("sha256").update(buffer).digest("hex");
}

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.statusCode = 409;
  error.code = code;
  error.details = details;
  throw error;
}

function normalizedToken(value) {
  return cleanText(value, 240).toLocaleLowerCase("ja-JP").replace(/\s+/g, "");
}

function normalizeApprovedClaims(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => cleanText(item, 160)).filter(Boolean))];
}

export function normalizeCopyValues(value) {
  const source = asObject(value);
  const entries = Object.entries(source);
  if (!entries.length) fail("design_copy_values_required", "At least one deterministic copy value is required.");
  if (entries.length > 12) fail("design_copy_values_too_many", "Deterministic copy V1 supports at most 12 copy slots.");

  const normalized = {};
  for (const [rawKey, rawValue] of entries) {
    const key = cleanText(rawKey, 80);
    if (!/^[a-z][a-z0-9_-]*$/i.test(key)) {
      fail("design_copy_slot_invalid", "Copy slot keys must use stable ASCII identifiers.", { slot: rawKey });
    }
    if (typeof rawValue !== "string") {
      fail("design_copy_value_invalid", "Copy values must be plain strings.", { slot: key });
    }
    const text = cleanText(rawValue, 280);
    if (!text) fail("design_copy_value_required", "Copy values cannot be empty.", { slot: key });
    normalized[key] = text;
  }
  return normalized;
}

function overlayConfig(template) {
  const config = asObject(asObject(template?.layout_spec).copyOverlay);
  const slots = asObject(config.slots);
  if (!Object.keys(slots).length) {
    fail("design_copy_layout_missing", "Selected DesignTemplate has no deterministic copy-overlay slot contract.");
  }
  return { ...config, slots };
}

function validateRestrictedClaims(template, copyValues, approvedClaims) {
  const rules = asObject(template?.validation_rules);
  const restrictedClaims = Array.isArray(rules.copyRestrictedClaims) ? rules.copyRestrictedClaims : [];
  const approved = new Set(normalizeApprovedClaims(approvedClaims).map(normalizedToken));
  const authored = normalizedToken(Object.values(copyValues).join("\n"));
  const unapprovedClaims = restrictedClaims
    .map((claim) => cleanText(claim, 160))
    .filter(Boolean)
    .filter((claim) => {
      const token = normalizedToken(claim);
      return token && authored.includes(token) && !approved.has(token);
    });
  if (unapprovedClaims.length) {
    fail(
      "design_copy_unapproved_claim",
      "Deterministic copy contains restricted claims without explicit approval.",
      { unapprovedClaims, approvedClaims: normalizeApprovedClaims(approvedClaims) }
    );
  }
}

export function buildDeterministicCopyPlan(template, copyValues, approvedClaims = []) {
  const values = normalizeCopyValues(copyValues);
  const config = overlayConfig(template);
  validateRestrictedClaims(template, values, approvedClaims);

  const unknownSlots = Object.keys(values).filter((slot) => !config.slots[slot]);
  if (unknownSlots.length) {
    fail("design_copy_slot_not_allowed", "Copy payload references slots not defined by the DesignTemplate.", {
      unknownSlots,
      allowedSlots: Object.keys(config.slots)
    });
  }

  const blocks = Object.entries(values).map(([slot, text]) => {
    const definition = asObject(config.slots[slot]);
    const x = Number(definition.x);
    const y = Number(definition.y);
    const width = Number(definition.width);
    const height = Number(definition.height);
    const pointSize = Number(definition.pointSize);
    const fontKey = cleanText(definition.fontKey || config.fontKey || "noto-sans-cjk-jp", 80);
    const fontPath = FONT_REGISTRY[fontKey];
    const fill = cleanText(definition.fill || "#222222", 32);
    const gravity = cleanText(definition.gravity || "Center", 32);

    if (![x, y, width, height, pointSize].every(Number.isFinite) || x < 0 || y < 0 || width < 1 || height < 1 || pointSize < 8 || pointSize > 160) {
      fail("design_copy_slot_geometry_invalid", "Copy slot geometry is invalid.", { slot, definition });
    }
    if (!fontPath) fail("design_copy_font_not_allowed", "Copy slot uses a font outside the renderer registry.", { slot, fontKey });
    if (!/^#[0-9a-f]{6}$/i.test(fill)) fail("design_copy_fill_invalid", "Copy slot fill must be a six-digit hex color.", { slot, fill });
    if (!new Set(["NorthWest", "North", "NorthEast", "West", "Center", "East", "SouthWest", "South", "SouthEast"]).has(gravity)) {
      fail("design_copy_gravity_invalid", "Copy slot gravity is not supported.", { slot, gravity });
    }
    return { slot, text, x, y, width, height, pointSize, fontKey, fontPath, fill, gravity };
  });

  return {
    rendererVersion: cleanText(config.rendererVersion || "v1", 40),
    locale: cleanText(config.locale || "ja-JP", 40),
    blocks,
    approvedClaims: normalizeApprovedClaims(approvedClaims)
  };
}

async function loadApprovedDerivedAsset(client, productId, assetId) {
  const result = await client.query(
    `SELECT * FROM public.product_assets
      WHERE id=$1 AND product_id=$2 AND archived_at IS NULL
      LIMIT 1`,
    [cleanText(assetId, 240), cleanText(productId, 240)]
  );
  if (result.rowCount !== 1) fail("design_copy_source_missing", "Approved DERIVED source ProductAsset was not found.", { productId, assetId });
  const asset = result.rows[0];
  const metadata = asObject(asset.metadata);
  const review = asObject(metadata.review);
  if (metadata.layer !== "DERIVED") fail("design_copy_source_not_derived", "Copy overlay requires a DERIVED ProductAsset source.", { assetId });
  if (review.status !== "approved") fail("design_copy_source_not_approved", "Copy overlay requires an explicitly human-approved DERIVED source.", { assetId, reviewStatus: review.status || null });
  if (!String(asset.mime_type || "").startsWith("image/")) fail("design_copy_source_not_image", "Copy overlay source must be an image ProductAsset.", { assetId });
  if (!metadata.gcsBucket || !metadata.gcsObject) fail("design_copy_source_storage_missing", "Copy overlay source has no canonical GCS storage reference.", { assetId });
  return asset;
}

async function loadProduct(client, productId) {
  const result = await client.query(
    `SELECT id, product_code, name FROM public.products
      WHERE id=$1 AND archived_at IS NULL
      LIMIT 1`,
    [cleanText(productId, 240)]
  );
  if (!result.rowCount) fail("product_not_found", "Product not found.", { productId });
  return result.rows[0];
}

export async function createDeterministicCopyOverlayTask(client, {
  productId,
  templateId,
  sourceAssetId,
  copyValues,
  approvedClaims = [],
  context = {}
}) {
  if (!context.personId) {
    const error = new Error("A human person identity is required to create deterministic ecommerce copy.");
    error.statusCode = 403;
    error.code = "human_copy_author_required";
    throw error;
  }

  const product = await loadProduct(client, productId);
  const template = await getDesignTemplate(client, cleanText(templateId, 240));
  if (template.lifecycle_status !== "active") fail("design_template_not_active", "DesignTemplate must be active before copy overlay task creation.");
  const allowedOperations = Array.isArray(template.allowed_operations) ? template.allowed_operations : [];
  if (!allowedOperations.includes(OPERATION_TYPE)) {
    fail("design_copy_operation_not_allowed", "Selected DesignTemplate does not allow deterministic copy overlay.", { templateId: template.id });
  }

  const sourceAsset = await loadApprovedDerivedAsset(client, product.id, sourceAssetId);
  const plan = buildDeterministicCopyPlan(template, copyValues, approvedClaims);
  const sourceReview = asObject(asObject(sourceAsset.metadata).review);
  const inputFactSnapshot = {
    productCode: product.product_code,
    productName: product.name,
    approvedClaims: plan.approvedClaims,
    sourceDerivedAssetId: sourceAsset.id,
    sourceDerivedReviewStatus: sourceReview.status,
    sourceDerivedReviewedByPersonId: sourceReview.reviewedByPersonId || null,
    copyRendererVersion: plan.rendererVersion
  };
  const instructionSnapshot = {
    copyValues: normalizeCopyValues(copyValues),
    locale: plan.locale,
    textPolicy: "deterministic_overlay",
    aiGeneration: false
  };
  const inputSnapshotHash = sha256({ productId: product.id, templateId: template.id, sourceAssetId: sourceAsset.id, inputFactSnapshot });
  const instructionHash = sha256(instructionSnapshot);
  const idempotencyKey = `design-copy-overlay:${product.id}:${template.id}:${inputSnapshotHash}:${instructionHash}`;

  const existing = await client.query(
    `SELECT * FROM public.design_tasks WHERE idempotency_key=$1 AND archived_at IS NULL LIMIT 1`,
    [idempotencyKey]
  );
  if (existing.rowCount) return { task: existing.rows[0], reused: true, product, template, sourceAsset, renderPlan: plan };

  const taskId = makeId("dtk");
  const inserted = await client.query(
    `INSERT INTO public.design_tasks
      (id, product_id, template_id, task_type, task_status,
       input_asset_ids, input_fact_snapshot, instruction_snapshot,
       input_snapshot_hash, instruction_hash, idempotency_key,
       metadata, created_by_person_id, updated_by_person_id, source_system)
     VALUES ($1,$2,$3,$4,'draft',$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10,$11::jsonb,$12,$12,$13)
     RETURNING *`,
    [
      taskId,
      product.id,
      template.id,
      OPERATION_TYPE,
      JSON.stringify([sourceAsset.id]),
      JSON.stringify(inputFactSnapshot),
      JSON.stringify(instructionSnapshot),
      inputSnapshotHash,
      instructionHash,
      idempotencyKey,
      JSON.stringify({ executionType: "deterministic", aiGeneration: false, sourceApprovedDerivedAssetId: sourceAsset.id }),
      context.personId,
      context.sourceSystem || "aione-deterministic-copy-overlay-v1"
    ]
  );

  await recordBusinessEvent(client, {
    eventType: "product.design_copy_overlay_task_created",
    objectType: "product",
    objectId: product.id,
    context,
    payload: { taskId, templateId: template.id, sourceAssetId: sourceAsset.id, copySlots: plan.blocks.map((block) => block.slot) }
  });

  return { task: inserted.rows[0], reused: false, product, template, sourceAsset, renderPlan: plan };
}

async function nextAssetNo(client, productId) {
  const result = await client.query(
    "SELECT COALESCE(MAX(asset_no),0)+1 AS next_no FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL",
    [productId]
  );
  const value = Number(result.rows[0]?.next_no || 0);
  if (!Number.isInteger(value) || value < 1 || value > 999) fail("product_asset_capacity_exhausted", "Product asset capacity exhausted.");
  return value;
}

function derivedObjectName(productId, taskId, canonicalName) {
  return `derived/${productId}/${taskId}/v1/${canonicalName}`;
}

async function renderOverlay(baseBytes, template, plan) {
  const workRoot = await mkdtemp(join(tmpdir(), "aione-copy-overlay-"));
  const basePath = join(workRoot, "base.jpg");
  let currentPath = join(workRoot, "step-0.jpg");
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
      const overlayPath = join(workRoot, `overlay-${index}.png`);
      const nextPath = join(workRoot, `step-${index + 1}.jpg`);
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
    if (!output.length) fail("design_copy_output_empty", "Deterministic copy overlay produced no bytes.");
    return output;
  } finally {
    await rm(workRoot, { recursive: true, force: true }).catch(() => {});
  }
}

export async function executeDeterministicCopyOverlay(client, taskId, context = {}) {
  let task = await getDesignTask(client, taskId);
  if (task.task_type !== OPERATION_TYPE) fail("unsupported_design_task_type", "This executor only supports deterministic copy overlay tasks.");

  const prior = await client.query(
    `SELECT * FROM public.product_assets
      WHERE product_id=$1 AND archived_at IS NULL
        AND metadata->>'layer'='DERIVED'
        AND metadata->>'designTaskId'=$2
        AND metadata->>'operationType'=$3
      ORDER BY asset_no LIMIT 1`,
    [task.product_id, taskId, OPERATION_TYPE]
  );
  if (task.task_status === "completed" && prior.rowCount) return { task, outputs: prior.rows, reused: true };
  if (task.task_status !== "approved") fail("design_task_not_approved", "DesignTask must be human-approved before deterministic copy rendering.", { taskId, taskStatus: task.task_status });

  const template = await getDesignTemplate(client, task.template_id);
  const allowedOperations = Array.isArray(template.allowed_operations) ? template.allowed_operations : [];
  if (!allowedOperations.includes(OPERATION_TYPE)) fail("design_copy_operation_not_allowed", "Selected DesignTemplate does not allow deterministic copy overlay.");
  const inputIds = Array.isArray(task.input_asset_ids) ? task.input_asset_ids : [];
  if (inputIds.length !== 1) fail("design_copy_source_count_invalid", "Deterministic copy overlay requires exactly one approved DERIVED source.", { inputAssetIds: inputIds });
  const sourceAsset = await loadApprovedDerivedAsset(client, task.product_id, inputIds[0]);
  const facts = asObject(task.input_fact_snapshot);
  const instructions = asObject(task.instruction_snapshot);
  const plan = buildDeterministicCopyPlan(template, asObject(instructions.copyValues), facts.approvedClaims);

  const claimed = await client.query(
    `UPDATE public.design_tasks
        SET task_status='running', started_at=COALESCE(started_at,NOW()),
            updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1
      WHERE id=$1 AND task_status='approved'
      RETURNING *`,
    [taskId, context.personId || null]
  );
  if (!claimed.rowCount) fail("design_task_execution_conflict", "DesignTask execution is already claimed or no longer executable.", { taskId });
  task = claimed.rows[0];

  await recordBusinessEvent(client, {
    eventType: "product.design_copy_overlay_started",
    objectType: "product",
    objectId: task.product_id,
    context,
    payload: { taskId, sourceAssetId: sourceAsset.id, copySlots: plan.blocks.map((block) => block.slot) }
  });

  try {
    const sourceMetadata = asObject(sourceAsset.metadata);
    const canonical = await readGcsObject({ bucketName: sourceMetadata.gcsBucket, objectName: sourceMetadata.gcsObject });
    const outputBytes = await renderOverlay(canonical.bytes, template, plan);
    const fileHash = sha256(outputBytes);
    const product = await loadProduct(client, task.product_id);
    const assetNo = await nextAssetNo(client, task.product_id);
    const canonicalName = `${product.product_code}_D${String(assetNo).padStart(2, "0")}.jpg`;
    const gcsObject = derivedObjectName(task.product_id, taskId, canonicalName);
    const uploaded = await uploadGcsObjectIfAbsent({
      bucketName: sourceMetadata.gcsBucket,
      objectName: gcsObject,
      buffer: outputBytes,
      contentType: "image/jpeg",
      metadata: {
        layer: "DERIVED",
        productId: task.product_id,
        designTaskId: taskId,
        designTemplateId: template.id,
        operationType: OPERATION_TYPE,
        sourceAssetId: sourceAsset.id,
        fileSha256: fileHash
      }
    });

    const metadata = {
      layer: "DERIVED",
      designTaskId: taskId,
      designTemplateId: template.id,
      designTemplateVersion: template.version,
      sourceAssetIds: [sourceAsset.id],
      parentDerivedAssetId: sourceAsset.id,
      operationType: OPERATION_TYPE,
      executionType: "deterministic",
      aiGeneration: false,
      textPolicy: "deterministic_overlay",
      rendererVersion: plan.rendererVersion,
      copySlots: plan.blocks.map((block) => block.slot),
      copyPayloadHash: sha256({ copyValues: instructions.copyValues, approvedClaims: plan.approvedClaims }),
      fileSha256: fileHash,
      byteSize: outputBytes.length,
      width: Number(template.canvas_width),
      height: Number(template.canvas_height),
      gcsBucket: sourceMetadata.gcsBucket,
      gcsObject,
      validation: { storage: "passed", humanReviewRequired: true, sourceDerivedReviewRequired: true },
      review: { status: "pending" }
    };

    const inserted = await client.query(
      `INSERT INTO public.product_assets
        (id, product_id, asset_no, asset_type, asset_role, source_provider, source_ref,
         original_name, canonical_name, mime_type, lifecycle_status, metadata,
         created_by_person_id, updated_by_person_id, source_system)
       VALUES ($1,$2,$3,'image','derived_detail_image','aione-design',$4,$5,$5,'image/jpeg','formalized',$6::jsonb,$7,$7,$8)
       RETURNING *`,
      [
        makeId("ast"),
        task.product_id,
        assetNo,
        `${taskId}:${OPERATION_TYPE}:v1`,
        canonicalName,
        JSON.stringify(metadata),
        context.personId || null,
        context.sourceSystem || "aione-deterministic-copy-overlay-v1"
      ]
    );

    const completed = await client.query(
      `UPDATE public.design_tasks
          SET task_status='completed', completed_at=NOW(), failure_code=NULL, failure_detail=NULL,
              updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1
        WHERE id=$1 RETURNING *`,
      [taskId, context.personId || null]
    );

    await recordBusinessEvent(client, {
      eventType: "product.derived_asset_created",
      objectType: "product",
      objectId: task.product_id,
      context,
      payload: {
        taskId,
        outputAssetId: inserted.rows[0].id,
        sourceAssetId: sourceAsset.id,
        operationType: OPERATION_TYPE,
        aiGeneration: false,
        gcsObject,
        reusedGcsObject: uploaded.reused
      }
    });
    await recordBusinessEvent(client, {
      eventType: "product.design_copy_overlay_completed",
      objectType: "product",
      objectId: task.product_id,
      context,
      payload: { taskId, outputAssetId: inserted.rows[0].id, sourceAssetId: sourceAsset.id }
    });

    return { task: completed.rows[0], outputs: [inserted.rows[0]], reused: false };
  } catch (error) {
    await client.query(
      `UPDATE public.design_tasks
          SET task_status='failed', failure_code=$2, failure_detail=$3::jsonb,
              completed_at=NOW(), updated_by_person_id=$4, updated_at=NOW(), record_version=record_version+1
        WHERE id=$1 AND task_status='running'`,
      [taskId, error.code || "design_copy_overlay_failed", JSON.stringify({ message: error.message || "Copy overlay failed." }), context.personId || null]
    );
    await recordBusinessEvent(client, {
      eventType: "product.design_copy_overlay_failed",
      objectType: "product",
      objectId: task.product_id,
      context,
      payload: { taskId, code: error.code || "design_copy_overlay_failed" }
    });
    throw error;
  }
}
