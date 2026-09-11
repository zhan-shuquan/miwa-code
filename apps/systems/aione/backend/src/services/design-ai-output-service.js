import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { getDesignTask } from "./design-task-service.js";
import { getDesignTemplate } from "./design-template-service.js";
import { readGcsObject, uploadGcsObjectIfAbsent } from "../integrations/google-cloud-storage-client.js";
import { runOpenAIImageEdit } from "../ai/openai-image-provider.js";
import { recordBusinessEvent } from "./event-service.js";

const execFileAsync = promisify(execFile);

function makeId(prefix) { return `${prefix}_${randomUUID()}`; }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function derivedObjectName(productId, taskId, canonicalName) { return `derived/${productId}/${taskId}/v1/${canonicalName}`; }

function promptFromTask(task, template) {
  const instructions = task.instruction_snapshot || {};
  const authored = String(
    instructions.prompt || instructions.promptText || instructions.instruction || instructions.instructions || ""
  ).trim();
  if (!authored) {
    const error = new Error("benefit_feature_image requires an approved prompt in instruction_snapshot.");
    error.code = "design_image_prompt_required";
    error.statusCode = 409;
    throw error;
  }
  const facts = JSON.stringify(task.input_fact_snapshot || {}).slice(0, 12000);
  return [
    authored,
    "Use the supplied product SOURCE images as the visual truth. Preserve the real product shape, colors, materials, patterns and visible construction.",
    "Do not invent product features, certifications, measurements, materials, logos, accessories or claims that are not supported by the supplied images or facts.",
    "Create exactly one Japanese Rakuten benefit/feature ecommerce image. Keep the product immediately recognizable and commercially clean.",
    `Target composition ratio: ${Number(template.canvas_width)}:${Number(template.canvas_height)}.`,
    `Verified product facts snapshot: ${facts}`
  ].join("\n");
}

async function loadSourceAssets(client, task, template) {
  const ids = Array.isArray(task.input_asset_ids) ? [...new Set(task.input_asset_ids.map(String))] : [];
  if (!ids.length) throw Object.assign(new Error("DesignTask has no input ProductAsset."), { code: "design_input_assets_required", statusCode: 409 });
  const result = await client.query(
    `SELECT * FROM public.product_assets
      WHERE product_id=$1 AND id = ANY($2::text[]) AND archived_at IS NULL
      ORDER BY asset_no`,
    [task.product_id, ids]
  );
  if (result.rowCount !== ids.length) {
    throw Object.assign(new Error("One or more DesignTask input assets are missing."), { code: "design_input_asset_missing", statusCode: 409 });
  }
  for (const asset of result.rows) {
    const metadata = asset.metadata || {};
    if (metadata.layer !== "SOURCE") throw Object.assign(new Error("AI image execution accepts canonical SOURCE assets only."), { code: "design_source_asset_required", statusCode: 409 });
    if (!String(asset.mime_type || "").startsWith("image/")) throw Object.assign(new Error("AI image execution accepts image SOURCE assets only."), { code: "design_source_asset_not_image", statusCode: 409 });
    if (!metadata.gcsBucket || !metadata.gcsObject) throw Object.assign(new Error("DesignTask input asset has no canonical GCS storage reference."), { code: "canonical_asset_storage_missing", statusCode: 409 });
  }
  const requiredRoles = Array.isArray(template.required_source_roles) ? template.required_source_roles : [];
  const actualRoles = new Set(result.rows.map((asset) => asset.asset_role));
  const missingRoles = requiredRoles.filter((role) => !actualRoles.has(role));
  if (missingRoles.length) {
    const error = new Error(`Required SOURCE roles are missing: ${missingRoles.join(", ")}`);
    error.code = "design_required_source_roles_missing";
    error.statusCode = 409;
    error.details = { missingRoles };
    throw error;
  }
  return result.rows;
}

async function normalizeToTemplate(bytes, width, height) {
  const root = await mkdtemp(join(tmpdir(), "aione-ai-design-"));
  const input = join(root, "input.jpg");
  const output = join(root, "output.jpg");
  await writeFile(input, bytes);
  try {
    await execFileAsync("convert", [input, "-auto-orient", "-resize", `${width}x${height}^`, "-gravity", "center", "-extent", `${width}x${height}`, "-strip", "-quality", "92", output], { maxBuffer: 20 * 1024 * 1024 });
    const result = await readFile(output);
    if (!result.length) throw Object.assign(new Error("AI design normalization produced no bytes."), { code: "design_output_empty" });
    return result;
  } finally {
    await rm(root, { recursive: true, force: true }).catch(() => {});
  }
}

async function nextAssetNo(client, productId) {
  const result = await client.query("SELECT COALESCE(MAX(asset_no),0)+1 AS next_no FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL", [productId]);
  const value = Number(result.rows[0]?.next_no || 0);
  if (!Number.isInteger(value) || value < 1 || value > 999) throw Object.assign(new Error("Product asset capacity exhausted."), { code: "product_asset_capacity_exhausted", statusCode: 409 });
  return value;
}

async function startAIExecution(client, task, context, promptHash) {
  const id = makeId("aix");
  await client.query(
    `INSERT INTO public.ai_executions
      (id, requested_by_person_id, objective, status, provider, model, started_at, metadata)
     VALUES ($1,$2,$3,'running','openai',$4,NOW(),$5::jsonb)`,
    [id, context.personId || null, `Generate benefit_feature_image for product ${task.product_id}`, process.env.AIONE_AI_IMAGE_MODEL || "gpt-image-2.5-sunburst", JSON.stringify({ modality: "image", designTaskId: task.id, templateId: task.template_id, promptHash })]
  );
  await client.query("UPDATE public.design_tasks SET ai_execution_id=$2 WHERE id=$1", [task.id, id]);
  return id;
}

async function finishAIExecution(client, id, result, outputAssetId) {
  await client.query(
    `UPDATE public.ai_executions
        SET status='completed', completed_at=NOW(), provider=$2, model=$3,
            result_summary=$4, metadata=metadata || $5::jsonb, updated_at=NOW()
      WHERE id=$1`,
    [id, result.provider, result.model, "benefit_feature_image DERIVED asset created", JSON.stringify({ quality: result.quality, outputAssetId, usage: result.usage || null })]
  );
}

async function failAIExecution(client, id, error) {
  if (!id) return;
  await client.query(
    `UPDATE public.ai_executions SET status='failed', completed_at=NOW(), result_summary=$2,
       metadata=metadata || $3::jsonb, updated_at=NOW() WHERE id=$1`,
    [id, String(error.message || "Image execution failed.").slice(0, 4000), JSON.stringify({ failureCode: error.code || "openai_image_execution_failed" })]
  ).catch(() => {});
}

export async function executeBenefitFeatureImage(client, taskId, context = {}) {
  let task = await getDesignTask(client, taskId);
  if (task.task_type !== "benefit_feature_image") throw Object.assign(new Error("This executor only supports benefit_feature_image tasks."), { code: "unsupported_design_task_type", statusCode: 409 });
  if (task.task_status === "completed") {
    const existing = await client.query(`SELECT * FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL AND metadata->>'layer'='DERIVED' AND metadata->>'designTaskId'=$2 ORDER BY asset_no`, [task.product_id, taskId]);
    if (existing.rowCount) return { task, outputs: existing.rows, reused: true };
  }
  if (task.task_status !== "approved") throw Object.assign(new Error("DesignTask must be approved before execution."), { code: "design_task_not_approved", statusCode: 409 });

  const template = await getDesignTemplate(client, task.template_id);
  const allowed = Array.isArray(template.allowed_operations) ? template.allowed_operations : [];
  if (!allowed.includes("benefit_feature_image")) throw Object.assign(new Error("Selected DesignTemplate does not allow benefit_feature_image."), { code: "design_operation_not_allowed", statusCode: 409 });

  const sourceAssets = await loadSourceAssets(client, task, template);
  const prompt = promptFromTask(task, template);
  const promptHash = sha256(Buffer.from(prompt, "utf8"));
  const claimed = await client.query(
    `UPDATE public.design_tasks SET task_status='running', started_at=COALESCE(started_at,NOW()), updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1
      WHERE id=$1 AND task_status='approved' RETURNING *`,
    [taskId, context.personId || null]
  );
  if (!claimed.rowCount) throw Object.assign(new Error("DesignTask execution is already claimed or is no longer executable."), { code: "design_task_execution_conflict", statusCode: 409 });
  task = claimed.rows[0];

  await recordBusinessEvent(client, { eventType: "product.design_execution_started", objectType: "product", objectId: task.product_id, context, payload: { taskId, operationType: "benefit_feature_image", inputAssetIds: sourceAssets.map((asset) => asset.id) } });

  let aiExecutionId = null;
  try {
    aiExecutionId = await startAIExecution(client, task, context, promptHash);
    const images = [];
    for (const asset of sourceAssets) {
      const canonical = await readGcsObject({ bucketName: asset.metadata.gcsBucket, objectName: asset.metadata.gcsObject });
      images.push({ bytes: canonical.bytes, contentType: canonical.contentType || asset.mime_type, filename: asset.canonical_name || asset.original_name || `${asset.id}.jpg` });
    }

    const generated = await runOpenAIImageEdit({ prompt, images, size: "1024x1536" });
    const outputBytes = await normalizeToTemplate(generated.bytes, Number(template.canvas_width), Number(template.canvas_height));
    const fileHash = sha256(outputBytes);
    const product = await client.query("SELECT id, product_code FROM public.products WHERE id=$1 AND archived_at IS NULL LIMIT 1", [task.product_id]);
    if (!product.rowCount) throw Object.assign(new Error("Product not found during design execution."), { code: "product_not_found", statusCode: 404 });

    const assetNo = await nextAssetNo(client, task.product_id);
    const canonicalName = `${product.rows[0].product_code}_D${String(assetNo).padStart(2, "0")}.jpg`;
    const bucketName = sourceAssets[0].metadata.gcsBucket;
    const gcsObject = derivedObjectName(task.product_id, taskId, canonicalName);
    const uploaded = await uploadGcsObjectIfAbsent({
      bucketName, objectName: gcsObject, buffer: outputBytes, contentType: "image/jpeg",
      metadata: { layer: "DERIVED", productId: task.product_id, designTaskId: taskId, designTemplateId: template.id, designTemplateVersion: template.version, operationType: "benefit_feature_image", aiExecutionId, aiProvider: generated.provider, aiModel: generated.model, promptHash, fileSha256: fileHash }
    });

    const metadata = {
      layer: "DERIVED", designTaskId: taskId, designTemplateId: template.id, designTemplateVersion: template.version,
      sourceAssetIds: sourceAssets.map((asset) => asset.id), operationType: "benefit_feature_image", executionType: "ai",
      aiExecutionId, aiProvider: generated.provider, aiModel: generated.model, aiQuality: generated.quality, promptHash,
      fileSha256: fileHash, byteSize: outputBytes.length, width: Number(template.canvas_width), height: Number(template.canvas_height),
      gcsBucket: bucketName, gcsObject,
      validation: { storage: "passed", dimensions: "normalized_to_template", sourceTruthRequired: true, humanReviewRequired: true },
      review: { status: "pending" }
    };
    const inserted = await client.query(
      `INSERT INTO public.product_assets
        (id, product_id, asset_no, asset_type, asset_role, source_provider, source_ref, original_name, canonical_name, mime_type, lifecycle_status, metadata, created_by_person_id, updated_by_person_id, source_system)
       VALUES ($1,$2,$3,'image','derived_detail_image','aione-design',$4,$5,$5,'image/jpeg','formalized',$6::jsonb,$7,$7,$8) RETURNING *`,
      [makeId("ast"), task.product_id, assetNo, `${taskId}:benefit_feature_image:v1`, canonicalName, JSON.stringify(metadata), context.personId || null, context.sourceSystem || "aione-ai-assisted-design-v2"]
    );
    const completed = await client.query(
      `UPDATE public.design_tasks SET task_status='completed', completed_at=NOW(), failure_code=NULL, failure_detail=NULL, updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1 WHERE id=$1 RETURNING *`,
      [taskId, context.personId || null]
    );
    await finishAIExecution(client, aiExecutionId, generated, inserted.rows[0].id);
    await recordBusinessEvent(client, { eventType: "product.derived_asset_created", objectType: "product", objectId: task.product_id, context, payload: { taskId, outputAssetId: inserted.rows[0].id, inputAssetIds: sourceAssets.map((asset) => asset.id), operationType: "benefit_feature_image", aiExecutionId, provider: generated.provider, model: generated.model, canvasWidth: Number(template.canvas_width), canvasHeight: Number(template.canvas_height), gcsObject, reusedGcsObject: uploaded.reused } });
    await recordBusinessEvent(client, { eventType: "product.design_execution_completed", objectType: "product", objectId: task.product_id, context, payload: { taskId, outputAssetId: inserted.rows[0].id, operationType: "benefit_feature_image", aiExecutionId } });
    return { task: completed.rows[0], outputs: [inserted.rows[0]], reused: false };
  } catch (error) {
    await failAIExecution(client, aiExecutionId, error);
    await client.query(`UPDATE public.design_tasks SET task_status='failed', failure_code=$2, failure_detail=$3::jsonb, completed_at=NOW(), updated_by_person_id=$4, updated_at=NOW(), record_version=record_version+1 WHERE id=$1 AND task_status='running'`, [taskId, error.code || "design_execution_failed", JSON.stringify({ message: error.message || "Design execution failed.", details: error.details || null }), context.personId || null]);
    await recordBusinessEvent(client, { eventType: "product.design_execution_failed", objectType: "product", objectId: task.product_id, context, payload: { taskId, code: error.code || "design_execution_failed", operationType: "benefit_feature_image", aiExecutionId } });
    throw error;
  }
}
