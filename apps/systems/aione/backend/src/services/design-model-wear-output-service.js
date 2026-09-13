import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { getDesignTask } from "./design-task-service.js";
import { getDesignTemplate } from "./design-template-service.js";
import { listDesignTaskOutputs } from "./design-output-service.js";
import { readGcsObject, uploadGcsObjectIfAbsent } from "../integrations/google-cloud-storage-client.js";
import { runOpenAIImageEdit } from "../ai/openai-image-provider.js";
import { recordBusinessEvent } from "./event-service.js";

const execFileAsync = promisify(execFile);

function makeId(prefix) { return `${prefix}_${randomUUID()}`; }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function derivedObjectName(productId, taskId, canonicalName) { return `derived/${productId}/${taskId}/v1/${canonicalName}`; }

function pageSpecFromTask(task) {
  const instruction = task?.instruction_snapshot && typeof task.instruction_snapshot === "object" ? task.instruction_snapshot : {};
  return instruction.pageSpec && typeof instruction.pageSpec === "object" ? instruction.pageSpec : {};
}

export function buildModelWearPrompt(task) {
  const spec = pageSpecFromTask(task);
  const presentation = spec.presentation && typeof spec.presentation === "object" ? spec.presentation : {};
  const facts = task?.input_fact_snapshot || {};
  const gender = String(facts.targetGender || "").trim();
  const season = String(facts.season || "").trim();
  const lengthType = String(facts.lengthType || "").trim();
  const sceneStyle = String(presentation.sceneStyle || "casual").trim();
  const framing = String(presentation.framing || "lower-body").trim();
  const backgroundMode = String(presentation.backgroundMode || "white").trim();
  return [
    "Create one commercial Japanese ecommerce model-wear image using the supplied real product SOURCE image as the non-negotiable product reference.",
    "Generate only the human model, pose, clothing coordination, lighting and background. Do not redesign the product itself.",
    "Preserve the product's exact real colors, stripe or pattern layout, length, cuff, heel/toe construction, proportions, visible knit structure, labels and logo.",
    "The worn product must remain immediately recognizable as the same physical product shown in the SOURCE image.",
    `Target customer/gender: ${gender || "use only what is supported by the product facts"}.`,
    `Season: ${season || "use only what is supported by the product facts"}.`,
    `Product length/type: ${lengthType || "preserve the real SOURCE length"}.`,
    `Styling direction: ${sceneStyle}.`,
    `Framing: ${framing}.`,
    `Background direction: ${backgroundMode}.`,
    "Keep trousers or clothing from hiding the key visible product area. For socks, expose enough sock shaft to show the actual pattern and length clearly.",
    "Do not add unsupported claims, text, badges, extra products, packaging, accessories or alternate colorways.",
    `Verified product facts snapshot: ${JSON.stringify(facts).slice(0,12000)}`
  ].join("\n");
}

async function loadSourceAssets(client, task) {
  const ids = Array.isArray(task.input_asset_ids) ? [...new Set(task.input_asset_ids.map(String))] : [];
  if (!ids.length) throw Object.assign(new Error("Model-wear execution requires at least one canonical SOURCE image."), { statusCode: 409, code: "design_input_assets_required" });
  const result = await client.query(
    `SELECT * FROM public.product_assets WHERE product_id=$1 AND id = ANY($2::text[]) AND archived_at IS NULL ORDER BY asset_no`,
    [task.product_id, ids]
  );
  if (result.rowCount !== ids.length) throw Object.assign(new Error("One or more model-wear SOURCE assets are missing."), { statusCode: 409, code: "design_input_asset_missing" });
  for (const asset of result.rows) {
    const metadata = asset.metadata || {};
    if (metadata.layer !== "SOURCE") throw Object.assign(new Error("Model-wear execution accepts canonical SOURCE assets only."), { statusCode: 409, code: "design_source_asset_required" });
    if (!String(asset.mime_type || "").startsWith("image/")) throw Object.assign(new Error("Model-wear execution requires image SOURCE assets."), { statusCode: 409, code: "design_source_asset_not_image" });
    if (!metadata.gcsBucket || !metadata.gcsObject) throw Object.assign(new Error("Model-wear SOURCE asset has no canonical GCS storage reference."), { statusCode: 409, code: "canonical_asset_storage_missing" });
  }
  return result.rows;
}

async function normalizeToTemplate(bytes, width, height) {
  const root = await mkdtemp(join(tmpdir(), "aione-model-wear-"));
  const input = join(root, "input.jpg");
  const output = join(root, "output.jpg");
  await writeFile(input, bytes);
  try {
    await execFileAsync("convert", [input, "-auto-orient", "-resize", `${width}x${height}^`, "-gravity", "center", "-extent", `${width}x${height}`, "-strip", "-quality", "93", output], { maxBuffer: 20 * 1024 * 1024 });
    const result = await readFile(output);
    if (!result.length) throw Object.assign(new Error("Model-wear normalization produced no bytes."), { code: "design_output_empty" });
    return result;
  } finally {
    await rm(root, { recursive: true, force: true }).catch(() => {});
  }
}

async function nextAssetNo(client, productId) {
  const result = await client.query("SELECT COALESCE(MAX(asset_no),0)+1 AS next_no FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL", [productId]);
  const value = Number(result.rows[0]?.next_no || 0);
  if (!Number.isInteger(value) || value < 1 || value > 999) throw Object.assign(new Error("Product asset capacity exhausted."), { statusCode: 409, code: "product_asset_capacity_exhausted" });
  return value;
}

async function startAIExecution(client, task, context, promptHash) {
  const id = makeId("aix");
  await client.query(
    `INSERT INTO public.ai_executions (id, requested_by_person_id, objective, status, provider, model, started_at, metadata)
     VALUES ($1,$2,$3,'running','openai',$4,NOW(),$5::jsonb)`,
    [id, context.personId || null, `Generate model-wear image for product ${task.product_id}`, process.env.AIONE_AI_IMAGE_MODEL || "gpt-image-2.5-sunburst", JSON.stringify({ modality:"image", designTaskId:task.id, templateId:task.template_id, operationType:"generate_source_anchored_model_wear", promptHash })]
  );
  await client.query("UPDATE public.design_tasks SET ai_execution_id=$2 WHERE id=$1", [task.id, id]);
  return id;
}

async function finishAIExecution(client, id, generated, outputAssetId) {
  await client.query(
    `UPDATE public.ai_executions SET status='completed', completed_at=NOW(), provider=$2, model=$3, result_summary=$4, metadata=metadata || $5::jsonb, updated_at=NOW() WHERE id=$1`,
    [id, generated.provider, generated.model, "source-anchored model-wear DERIVED asset created", JSON.stringify({ quality:generated.quality, outputAssetId, usage:generated.usage || null })]
  );
}

async function failAIExecution(client, id, error) {
  if (!id) return;
  await client.query(
    `UPDATE public.ai_executions SET status='failed', completed_at=NOW(), result_summary=$2, metadata=metadata || $3::jsonb, updated_at=NOW() WHERE id=$1`,
    [id, String(error.message || "Model-wear image execution failed.").slice(0,4000), JSON.stringify({ failureCode:error.code || "model_wear_execution_failed" })]
  ).catch(() => {});
}

export async function executeSourceAnchoredModelWear(client, taskId, context = {}) {
  let task = await getDesignTask(client, taskId);
  if (task.task_type !== "generate_source_anchored_model_wear") throw Object.assign(new Error("This executor only supports generate_source_anchored_model_wear tasks."), { statusCode:409, code:"unsupported_design_task_type" });
  if (task.task_status === "completed") {
    const outputs = await listDesignTaskOutputs(client, taskId);
    if (outputs.length) return { task, outputs, reused:true };
  }
  if (task.task_status !== "approved") throw Object.assign(new Error("DesignTask must be approved before execution."), { statusCode:409, code:"design_task_not_approved" });

  const template = await getDesignTemplate(client, task.template_id);
  const allowed = Array.isArray(template.allowed_operations) ? template.allowed_operations : [];
  if (!allowed.includes("source_anchored_edit") && !allowed.includes("generate_model_pose")) throw Object.assign(new Error("Selected DesignTemplate does not allow source-anchored model generation."), { statusCode:409, code:"design_operation_not_allowed" });
  const sourceAssets = await loadSourceAssets(client, task);
  const prompt = buildModelWearPrompt(task);
  const promptHash = sha256(Buffer.from(prompt, "utf8"));

  const claimed = await client.query(
    `UPDATE public.design_tasks SET task_status='running', started_at=COALESCE(started_at,NOW()), updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1 WHERE id=$1 AND task_status='approved' RETURNING *`,
    [taskId, context.personId || null]
  );
  if (!claimed.rowCount) throw Object.assign(new Error("Model-wear DesignTask is already claimed or no longer executable."), { statusCode:409, code:"design_task_execution_conflict" });
  task = claimed.rows[0];

  await recordBusinessEvent(client, { eventType:"product.design_execution_started", objectType:"product", objectId:task.product_id, context, payload:{ taskId, operationType:"generate_source_anchored_model_wear", inputAssetIds:sourceAssets.map(a=>a.id) } });

  let aiExecutionId = null;
  try {
    aiExecutionId = await startAIExecution(client, task, context, promptHash);
    const images = [];
    for (const asset of sourceAssets) {
      const canonical = await readGcsObject({ bucketName:asset.metadata.gcsBucket, objectName:asset.metadata.gcsObject });
      images.push({ bytes:canonical.bytes, contentType:canonical.contentType || asset.mime_type || "image/jpeg", filename:asset.canonical_name || asset.original_name || `${asset.id}.jpg` });
    }
    const generated = await runOpenAIImageEdit({ prompt, images, size:"1024x1536" });
    const outputBytes = await normalizeToTemplate(generated.bytes, Number(template.canvas_width), Number(template.canvas_height));
    const fileHash = sha256(outputBytes);
    const product = await client.query("SELECT id, product_code FROM public.products WHERE id=$1 AND archived_at IS NULL LIMIT 1", [task.product_id]);
    if (!product.rowCount) throw Object.assign(new Error("Product not found during model-wear execution."), { statusCode:404, code:"product_not_found" });
    const assetNo = await nextAssetNo(client, task.product_id);
    const canonicalName = `${product.rows[0].product_code}_D${String(assetNo).padStart(2,"0")}.jpg`;
    const bucketName = sourceAssets[0].metadata.gcsBucket;
    const gcsObject = derivedObjectName(task.product_id, taskId, canonicalName);
    const metadata = {
      layer:"DERIVED", designTaskId:taskId, designTemplateId:template.id, designTemplateVersion:template.version,
      sourceAssetIds:sourceAssets.map(a=>a.id), operationType:"generate_source_anchored_model_wear", executionType:"ai",
      aiExecutionId, aiProvider:generated.provider, aiModel:generated.model, promptHash, fileSha256:fileHash,
      byteSize:outputBytes.length, width:Number(template.canvas_width), height:Number(template.canvas_height), gcsBucket:bucketName, gcsObject,
      validation:{ storage:"passed", dimensions:"normalized_to_template", sourceTruthRequired:true, productPreservationRequired:true, humanReviewRequired:true },
      review:{ status:"pending" }
    };
    const uploaded = await uploadGcsObjectIfAbsent({ bucketName, objectName:gcsObject, buffer:outputBytes, contentType:"image/jpeg", metadata:{ layer:"DERIVED", productId:task.product_id, designTaskId:taskId, designTemplateId:template.id, operationType:"generate_source_anchored_model_wear", aiExecutionId, promptHash, fileSha256:fileHash } });
    const inserted = await client.query(
      `INSERT INTO public.product_assets
        (id, product_id, asset_no, asset_type, asset_role, source_provider, source_ref, original_name, canonical_name, mime_type, lifecycle_status, metadata, created_by_person_id, updated_by_person_id, source_system)
       VALUES ($1,$2,$3,'image','derived_model_wear','aione-design',$4,$5,$5,'image/jpeg','formalized',$6::jsonb,$7,$7,$8) RETURNING *`,
      [makeId("ast"), task.product_id, assetNo, `${taskId}:generate_source_anchored_model_wear:v1`, canonicalName, JSON.stringify(metadata), context.personId || null, context.sourceSystem || "aione-design-engine-v1"]
    );
    await finishAIExecution(client, aiExecutionId, generated, inserted.rows[0].id);
    const completed = await client.query(
      `UPDATE public.design_tasks SET task_status='completed', completed_at=NOW(), failure_code=NULL, failure_detail=NULL, updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1 WHERE id=$1 RETURNING *`,
      [taskId, context.personId || null]
    );
    await recordBusinessEvent(client, { eventType:"product.derived_asset_created", objectType:"product", objectId:task.product_id, context, payload:{ taskId, outputAssetId:inserted.rows[0].id, inputAssetIds:sourceAssets.map(a=>a.id), operationType:"generate_source_anchored_model_wear", aiExecutionId, gcsObject, reusedGcsObject:uploaded.reused } });
    await recordBusinessEvent(client, { eventType:"product.design_execution_completed", objectType:"product", objectId:task.product_id, context, payload:{ taskId, outputAssetId:inserted.rows[0].id, operationType:"generate_source_anchored_model_wear", aiExecutionId } });
    return { task:completed.rows[0], outputs:[inserted.rows[0]], reused:false };
  } catch (error) {
    await failAIExecution(client, aiExecutionId, error);
    await client.query(`UPDATE public.design_tasks SET task_status='failed', failure_code=$2, failure_detail=$3::jsonb, completed_at=NOW(), updated_by_person_id=$4, updated_at=NOW(), record_version=record_version+1 WHERE id=$1 AND task_status='running'`, [taskId, error.code || "model_wear_execution_failed", JSON.stringify({ message:error.message || "Model-wear execution failed." }), context.personId || null]);
    await recordBusinessEvent(client, { eventType:"product.design_execution_failed", objectType:"product", objectId:task.product_id, context, payload:{ taskId, code:error.code || "model_wear_execution_failed", operationType:"generate_source_anchored_model_wear" } });
    throw error;
  }
}
