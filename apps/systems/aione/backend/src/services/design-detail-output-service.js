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
import { recordBusinessEvent } from "./event-service.js";

const execFileAsync = promisify(execFile);

function makeId(prefix) { return `${prefix}_${randomUUID()}`; }
function clean(value) { return String(value ?? "").trim(); }
function esc(value) { return clean(value).replace(/[&<>"']/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&apos;" }[ch])); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function derivedObjectName(productId, taskId, canonicalName) { return `derived/${productId}/${taskId}/v1/${canonicalName}`; }

function pageSpecFromTask(task) {
  const instruction = task?.instruction_snapshot && typeof task.instruction_snapshot === "object" ? task.instruction_snapshot : {};
  return instruction.pageSpec && typeof instruction.pageSpec === "object" ? instruction.pageSpec : {};
}

async function loadSourceAsset(client, task) {
  const ids = Array.isArray(task.input_asset_ids) ? [...new Set(task.input_asset_ids.map(String).filter(Boolean))] : [];
  if (ids.length !== 1) throw Object.assign(new Error("Detail renderer requires exactly one canonical SOURCE image."), { statusCode:409, code:"design_single_source_required" });
  const result = await client.query(`SELECT * FROM public.product_assets WHERE id=$1 AND product_id=$2 AND archived_at IS NULL LIMIT 1`, [ids[0], task.product_id]);
  if (!result.rowCount) throw Object.assign(new Error("Detail SOURCE ProductAsset was not found."), { statusCode:409, code:"design_input_asset_missing" });
  const asset = result.rows[0];
  const metadata = asset.metadata || {};
  if (metadata.layer !== "SOURCE") throw Object.assign(new Error("Detail renderer accepts canonical SOURCE assets only."), { statusCode:409, code:"design_source_asset_required" });
  if (!String(asset.mime_type || "").startsWith("image/")) throw Object.assign(new Error("Detail renderer requires an image SOURCE asset."), { statusCode:409, code:"design_source_asset_not_image" });
  if (!metadata.gcsBucket || !metadata.gcsObject) throw Object.assign(new Error("Detail SOURCE asset has no canonical GCS reference."), { statusCode:409, code:"canonical_asset_storage_missing" });
  return asset;
}

export function buildDetailSvg({ width=1000, height=1500, facts={}, sourceDataUri, pageSpec={} } = {}) {
  if (!sourceDataUri) throw Object.assign(new Error("Detail renderer requires a SOURCE image."), { statusCode:409, code:"design_source_asset_required" });
  const presentation = pageSpec.presentation || {};
  const title = clean(presentation.titleText) || "DETAIL";
  const detailType = clean(presentation.detailType) || "construction";
  const layoutMode = clean(presentation.layoutMode) || "single";
  const sellingPoints = Array.isArray(facts.sellingPoints) ? facts.sellingPoints.map(clean).filter(Boolean).slice(0,4) : [];
  const copy = sellingPoints.length ? sellingPoints.join(" · ") : "実物のディテールのみ表示 · 未確認の構造説明は追加しません";
  const imagePreserve = layoutMode === "single" ? "xMidYMid slice" : "xMidYMid meet";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#faf9f6"/>
    <rect x="28" y="28" width="944" height="1444" rx="24" fill="#ffffff" stroke="#dfe4e1" stroke-width="2"/>
    <line x1="70" y1="48" x2="930" y2="48" stroke="#b69445" stroke-width="3"/>
    <line x1="70" y1="58" x2="930" y2="58" stroke="#203b59" stroke-width="3"/>
    <text x="500" y="145" text-anchor="middle" font-family="Noto Serif CJK JP, serif" font-size="50" font-weight="700" fill="#243a34">${esc(title)}</text>
    <text x="500" y="190" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="18" fill="#7b837f">${esc(detailType.toUpperCase())} · SOURCE ANCHORED</text>
    <rect x="90" y="245" width="820" height="930" rx="20" fill="#f8f7f4" stroke="#dde2de" stroke-width="2"/>
    <image href="${sourceDataUri}" x="112" y="267" width="776" height="886" preserveAspectRatio="${imagePreserve}"/>
    <rect x="100" y="1215" width="800" height="165" rx="18" fill="#f8f8f6" stroke="#dde2de"/>
    <text x="500" y="1280" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="24" font-weight="700" fill="#35423c">${esc(copy)}</text>
    <text x="500" y="1330" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="17" fill="#707974">真实素材裁切 / 排版 · 不发明商品结构</text>
    <text x="500" y="1430" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="16" fill="#838b87">Human Review Required</text>
  </svg>`;
}

async function renderSvgToJpeg(svg, width, height) {
  const root = await mkdtemp(join(tmpdir(), "aione-detail-render-"));
  const svgPath = join(root, "input.svg");
  const outputPath = join(root, "output.jpg");
  await writeFile(svgPath, svg, "utf8");
  try {
    await execFileAsync("convert", [svgPath, "-background", "white", "-alpha", "remove", "-alpha", "off", "-resize", `${width}x${height}!`, "-strip", "-quality", "94", outputPath], { maxBuffer:20 * 1024 * 1024 });
    const bytes = await readFile(outputPath);
    if (!bytes.length) throw Object.assign(new Error("Detail renderer produced no bytes."), { code:"design_output_empty" });
    return bytes;
  } finally {
    await rm(root, { recursive:true, force:true }).catch(() => {});
  }
}

async function nextAssetNo(client, productId) {
  const result = await client.query("SELECT COALESCE(MAX(asset_no),0)+1 AS next_no FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL", [productId]);
  const value = Number(result.rows[0]?.next_no || 0);
  if (!Number.isInteger(value) || value < 1 || value > 999) throw Object.assign(new Error("Product asset capacity exhausted."), { statusCode:409, code:"product_asset_capacity_exhausted" });
  return value;
}

export async function executeSourceAnchoredDetailImage(client, taskId, context={}) {
  let task = await getDesignTask(client, taskId);
  if (task.task_type !== "compose_source_anchored_detail_image") throw Object.assign(new Error("This executor supports source-anchored detail tasks only."), { statusCode:409, code:"unsupported_design_task_type" });
  if (task.task_status === "completed") {
    const outputs = await listDesignTaskOutputs(client, taskId);
    if (outputs.length) return { task, outputs, reused:true };
  }
  if (task.task_status !== "approved") throw Object.assign(new Error("DesignTask must be approved before execution."), { statusCode:409, code:"design_task_not_approved" });
  const template = await getDesignTemplate(client, task.template_id);
  const allowed = Array.isArray(template.allowed_operations) ? template.allowed_operations : [];
  if (!allowed.includes("compose_detail_image") && !allowed.includes("source_anchored_crop")) throw Object.assign(new Error("Selected DesignTemplate does not allow detail rendering."), { statusCode:409, code:"design_operation_not_allowed" });
  const sourceAsset = await loadSourceAsset(client, task);
  const canonical = await readGcsObject({ bucketName:sourceAsset.metadata.gcsBucket, objectName:sourceAsset.metadata.gcsObject });
  const sourceDataUri = `data:${canonical.contentType || sourceAsset.mime_type || "image/jpeg"};base64,${canonical.bytes.toString("base64")}`;
  const facts = task.input_fact_snapshot && typeof task.input_fact_snapshot === "object" ? task.input_fact_snapshot : {};
  const svg = buildDetailSvg({ width:Number(template.canvas_width), height:Number(template.canvas_height), facts, sourceDataUri, pageSpec:pageSpecFromTask(task) });
  const product = await client.query("SELECT id, product_code FROM public.products WHERE id=$1 AND archived_at IS NULL LIMIT 1", [task.product_id]);
  if (!product.rowCount) throw Object.assign(new Error("Product not found during detail rendering."), { statusCode:404, code:"product_not_found" });
  const claimed = await client.query(`UPDATE public.design_tasks SET task_status='running', started_at=COALESCE(started_at,NOW()), updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1 WHERE id=$1 AND task_status='approved' RETURNING *`, [taskId, context.personId || null]);
  if (!claimed.rowCount) throw Object.assign(new Error("DesignTask is already claimed or no longer executable."), { statusCode:409, code:"design_task_execution_conflict" });
  task = claimed.rows[0];
  await recordBusinessEvent(client, { eventType:"product.design_execution_started", objectType:"product", objectId:task.product_id, context, payload:{ taskId, operationType:"compose_source_anchored_detail_image", inputAssetId:sourceAsset.id } });
  try {
    const bytes = await renderSvgToJpeg(svg, Number(template.canvas_width), Number(template.canvas_height));
    const fileHash = sha256(bytes);
    const assetNo = await nextAssetNo(client, task.product_id);
    const canonicalName = `${product.rows[0].product_code}_D${String(assetNo).padStart(2,"0")}.jpg`;
    const bucketName = sourceAsset.metadata.gcsBucket;
    const gcsObject = derivedObjectName(task.product_id, taskId, canonicalName);
    const metadata = { layer:"DERIVED", designTaskId:taskId, designTemplateId:template.id, designTemplateVersion:template.version, sourceAssetIds:[sourceAsset.id], operationType:"compose_source_anchored_detail_image", executionType:"deterministic", fileSha256:fileHash, byteSize:bytes.length, width:Number(template.canvas_width), height:Number(template.canvas_height), gcsBucket:bucketName, gcsObject, validation:{ storage:"passed", dimensions:"normalized_to_template", sourceAnchored:true, confirmedFactsOnly:true, doNotInventStructure:true, humanReviewRequired:true }, review:{ status:"pending" } };
    const uploaded = await uploadGcsObjectIfAbsent({ bucketName, objectName:gcsObject, buffer:bytes, contentType:"image/jpeg", metadata:{ layer:"DERIVED", productId:task.product_id, designTaskId:taskId, operationType:"compose_source_anchored_detail_image", sourceAssetId:sourceAsset.id, fileSha256:fileHash } });
    const inserted = await client.query(`INSERT INTO public.product_assets (id, product_id, asset_no, asset_type, asset_role, source_provider, source_ref, original_name, canonical_name, mime_type, lifecycle_status, metadata, created_by_person_id, updated_by_person_id, source_system) VALUES ($1,$2,$3,'image','derived_detail_image','aione-design',$4,$5,$5,'image/jpeg','formalized',$6::jsonb,$7,$7,$8) RETURNING *`, [makeId("ast"), task.product_id, assetNo, `${taskId}:compose_source_anchored_detail_image:v1`, canonicalName, JSON.stringify(metadata), context.personId || null, context.sourceSystem || "aione-design-engine-v1"]);
    const completed = await client.query(`UPDATE public.design_tasks SET task_status='completed', completed_at=NOW(), failure_code=NULL, failure_detail=NULL, updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1 WHERE id=$1 RETURNING *`, [taskId, context.personId || null]);
    await recordBusinessEvent(client, { eventType:"product.derived_asset_created", objectType:"product", objectId:task.product_id, context, payload:{ taskId, outputAssetId:inserted.rows[0].id, inputAssetId:sourceAsset.id, operationType:"compose_source_anchored_detail_image", gcsObject, reusedGcsObject:uploaded.reused } });
    await recordBusinessEvent(client, { eventType:"product.design_execution_completed", objectType:"product", objectId:task.product_id, context, payload:{ taskId, outputAssetId:inserted.rows[0].id, operationType:"compose_source_anchored_detail_image" } });
    return { task:completed.rows[0], outputs:[inserted.rows[0]], reused:false };
  } catch (error) {
    await client.query(`UPDATE public.design_tasks SET task_status='failed', failure_code=$2, failure_detail=$3::jsonb, completed_at=NOW(), updated_by_person_id=$4, updated_at=NOW(), record_version=record_version+1 WHERE id=$1 AND task_status='running'`, [taskId, error.code || "detail_execution_failed", JSON.stringify({ message:error.message || "Detail execution failed." }), context.personId || null]);
    await recordBusinessEvent(client, { eventType:"product.design_execution_failed", objectType:"product", objectId:task.product_id, context, payload:{ taskId, code:error.code || "detail_execution_failed", operationType:"compose_source_anchored_detail_image" } });
    throw error;
  }
}
