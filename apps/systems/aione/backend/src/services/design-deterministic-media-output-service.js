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
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function clean(value) { return String(value ?? "").trim(); }
function esc(value) {
  return clean(value).replace(/[&<>"']/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&apos;" }[ch]));
}
function derivedObjectName(productId, taskId, canonicalName) { return `derived/${productId}/${taskId}/v1/${canonicalName}`; }

function pageSpecFromTask(task) {
  const instruction = task?.instruction_snapshot && typeof task.instruction_snapshot === "object" ? task.instruction_snapshot : {};
  return instruction.pageSpec && typeof instruction.pageSpec === "object" ? instruction.pageSpec : {};
}

function arrayOfStrings(value) {
  return Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
}

async function loadRequiredSourceAsset(client, task) {
  const ids = Array.isArray(task.input_asset_ids) ? [...new Set(task.input_asset_ids.map(String).filter(Boolean))] : [];
  if (ids.length !== 1) {
    throw Object.assign(new Error("Deterministic SKU/material renderer requires exactly one canonical SOURCE image."), { statusCode:409, code:"design_single_source_required" });
  }
  const result = await client.query(
    `SELECT * FROM public.product_assets WHERE id=$1 AND product_id=$2 AND archived_at IS NULL LIMIT 1`,
    [ids[0], task.product_id]
  );
  if (!result.rowCount) throw Object.assign(new Error("Design SOURCE ProductAsset was not found."), { statusCode:409, code:"design_input_asset_missing" });
  const asset = result.rows[0];
  const metadata = asset.metadata || {};
  if (metadata.layer !== "SOURCE") throw Object.assign(new Error("Deterministic SKU/material renderer accepts canonical SOURCE assets only."), { statusCode:409, code:"design_source_asset_required" });
  if (!String(asset.mime_type || "").startsWith("image/")) throw Object.assign(new Error("Deterministic SKU/material renderer requires an image SOURCE asset."), { statusCode:409, code:"design_source_asset_not_image" });
  if (!metadata.gcsBucket || !metadata.gcsObject) throw Object.assign(new Error("SOURCE asset has no canonical GCS storage reference."), { statusCode:409, code:"canonical_asset_storage_missing" });
  return asset;
}

async function sourceImageDataUri(asset) {
  const canonical = await readGcsObject({ bucketName:asset.metadata.gcsBucket, objectName:asset.metadata.gcsObject });
  const contentType = canonical.contentType || asset.mime_type || "image/jpeg";
  return `data:${contentType};base64,${canonical.bytes.toString("base64")}`;
}

async function renderSvgToJpeg(svg, width, height) {
  const root = await mkdtemp(join(tmpdir(), "aione-deterministic-media-"));
  const svgPath = join(root, "input.svg");
  const outputPath = join(root, "output.jpg");
  await writeFile(svgPath, svg, "utf8");
  try {
    await execFileAsync("convert", [svgPath, "-background", "white", "-alpha", "remove", "-alpha", "off", "-resize", `${width}x${height}!`, "-strip", "-quality", "94", outputPath], { maxBuffer:20 * 1024 * 1024 });
    const bytes = await readFile(outputPath);
    if (!bytes.length) throw Object.assign(new Error("Deterministic media renderer produced no bytes."), { code:"design_output_empty" });
    return bytes;
  } finally {
    await rm(root, { recursive:true, force:true }).catch(() => {});
  }
}

function commonFrame(width, height, background="#ffffff") {
  return `<rect width="100%" height="100%" fill="${background}"/><rect x="28" y="28" width="${width-56}" height="${height-56}" rx="24" fill="#ffffff" stroke="#dfe4e1" stroke-width="2"/>`;
}

function imageElement(dataUri, { x, y, w, h, mode="contain" }) {
  const preserve = mode === "cover" ? "xMidYMid slice" : "xMidYMid meet";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#ffffff" stroke="#e2e6e4" stroke-width="2"/><image href="${dataUri}" x="${x+16}" y="${y+16}" width="${w-32}" height="${h-32}" preserveAspectRatio="${preserve}"/>`;
}

export function buildSkuColorSvg({ width=1000, height=1000, facts={}, sourceDataUri, pageSpec={} } = {}) {
  const variants = arrayOfStrings(facts.actualVariants);
  if (!variants.length) throw Object.assign(new Error("SKU renderer requires confirmed actualVariants."), { statusCode:409, code:"actual_variants_required" });
  if (!sourceDataUri) throw Object.assign(new Error("SKU renderer requires one canonical SOURCE SKU image."), { statusCode:409, code:"design_source_asset_required" });
  const presentation = pageSpec.presentation || {};
  const layout = pageSpec.layoutAdjustments || pageSpec.layout_adjustments || {};
  const title = clean(presentation.titleText) || "COLOR VARIATIONS";
  const columns = Math.min(6, Math.max(2, Number(layout.columns || 3)));
  const startX = 80;
  const gap = 16;
  const totalW = 840;
  const cellW = (totalW - gap * (columns - 1)) / columns;
  const rows = Math.ceil(Math.min(variants.length, 12) / columns);
  const chips = variants.slice(0,12).map((variant,index) => {
    const col=index%columns, row=Math.floor(index/columns);
    const x=startX+col*(cellW+gap), y=790+row*64;
    return `<rect x="${x}" y="${y}" width="${cellW}" height="48" rx="24" fill="#ffffff" stroke="#d9dfdc"/><text x="${x+cellW/2}" y="${y+31}" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="18" fill="#33413a">${esc(variant)}</text>`;
  }).join("\n");
  const footerY = Math.min(955, 790 + rows*64 + 28);
  const setCount = Number(facts.setCount || 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${commonFrame(width,height,"#fbfbfa")}
    <text x="500" y="105" text-anchor="middle" font-family="Noto Serif CJK JP, serif" font-size="44" font-weight="700" fill="#203b59">${esc(title)}</text>
    <text x="500" y="142" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="17" fill="#777f7b">確認済みバリエーション</text>
    ${imageElement(sourceDataUri,{x:100,y:185,w:800,h:545,mode:"contain"})}
    ${chips}
    <text x="500" y="${footerY}" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="16" fill="#7a837f">${setCount ? `${setCount}点セット · ` : ""}Product Truth の実在カラー / 柄のみ表示</text>
  </svg>`;
}

export function buildMaterialTextureSvg({ width=1000, height=1500, facts={}, sourceDataUri, pageSpec={} } = {}) {
  if (!sourceDataUri) throw Object.assign(new Error("Material renderer requires one canonical SOURCE detail image."), { statusCode:409, code:"design_source_asset_required" });
  const presentation = pageSpec.presentation || {};
  const material = clean(facts.material);
  const features = arrayOfStrings(facts.materialFeatures).slice(0,5);
  const title = clean(presentation.titleText) || "MATERIAL / TEXTURE";
  const displayMode = clean(presentation.displayMode) || "macro";
  const copyMode = clean(presentation.copyMode) || "confirmed-only";
  const confirmedCopy = material
    ? [material, ...features].filter(Boolean).join(" · ")
    : "素材事実は未確認 · 実物の質感のみ表示";
  const secondary = material
    ? "確認済み Product Truth のみ使用"
    : "素材名・機能・効能は推測しません";
  const imageMode = displayMode === "macro" ? "cover" : "contain";
  const copyText = copyMode === "visual-only" && !material ? "" : confirmedCopy;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${commonFrame(width,height,"#fbfaf7")}
    <line x1="70" y1="48" x2="930" y2="48" stroke="#b69445" stroke-width="3"/>
    <line x1="70" y1="58" x2="930" y2="58" stroke="#203b59" stroke-width="3"/>
    <text x="500" y="150" text-anchor="middle" font-family="Noto Serif CJK JP, serif" font-size="48" font-weight="700" fill="#253a34">${esc(title)}</text>
    <text x="500" y="190" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="18" fill="#7d8581">REAL SOURCE TEXTURE</text>
    ${imageElement(sourceDataUri,{x:90,y:245,w:820,h:880,mode:imageMode})}
    <rect x="100" y="1170" width="800" height="190" rx="20" fill="#f8f8f6" stroke="#dde2de"/>
    <text x="500" y="1240" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="28" font-weight="700" fill="#33413a">${esc(copyText || "実物の質感をそのまま表示")}</text>
    <text x="500" y="1292" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="18" fill="#6f7873">${esc(secondary)}</text>
    <text x="500" y="1435" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="16" fill="#838b87">AI による素材情報の補完なし</text>
  </svg>`;
}

async function nextAssetNo(client, productId) {
  const result = await client.query("SELECT COALESCE(MAX(asset_no),0)+1 AS next_no FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL", [productId]);
  const value = Number(result.rows[0]?.next_no || 0);
  if (!Number.isInteger(value) || value < 1 || value > 999) throw Object.assign(new Error("Product asset capacity exhausted."), { statusCode:409, code:"product_asset_capacity_exhausted" });
  return value;
}

async function executeDeterministicMedia(client, taskId, context, definition) {
  let task = await getDesignTask(client, taskId);
  if (task.task_type !== definition.taskType) throw Object.assign(new Error(`This executor only supports ${definition.taskType} tasks.`), { statusCode:409, code:"unsupported_design_task_type" });
  if (task.task_status === "completed") {
    const outputs = await listDesignTaskOutputs(client, taskId);
    if (outputs.length) return { task, outputs, reused:true };
  }
  if (task.task_status !== "approved") throw Object.assign(new Error("DesignTask must be approved before execution."), { statusCode:409, code:"design_task_not_approved" });
  const template = await getDesignTemplate(client, task.template_id);
  const allowed = Array.isArray(template.allowed_operations) ? template.allowed_operations : [];
  if (!allowed.includes(definition.allowedOperation)) throw Object.assign(new Error(`Selected DesignTemplate does not allow ${definition.allowedOperation}.`), { statusCode:409, code:"design_operation_not_allowed" });
  const sourceAsset = await loadRequiredSourceAsset(client, task);
  const sourceDataUri = await sourceImageDataUri(sourceAsset);
  const product = await client.query("SELECT id, product_code FROM public.products WHERE id=$1 AND archived_at IS NULL LIMIT 1", [task.product_id]);
  if (!product.rowCount) throw Object.assign(new Error("Product not found during deterministic media execution."), { statusCode:404, code:"product_not_found" });
  const pageSpec = pageSpecFromTask(task);
  const facts = task.input_fact_snapshot && typeof task.input_fact_snapshot === "object" ? task.input_fact_snapshot : {};
  const svg = definition.buildSvg({ width:Number(template.canvas_width), height:Number(template.canvas_height), facts, sourceDataUri, pageSpec });

  const claimed = await client.query(`UPDATE public.design_tasks SET task_status='running', started_at=COALESCE(started_at,NOW()), updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1 WHERE id=$1 AND task_status='approved' RETURNING *`, [taskId, context.personId || null]);
  if (!claimed.rowCount) throw Object.assign(new Error("DesignTask is already claimed or no longer executable."), { statusCode:409, code:"design_task_execution_conflict" });
  task = claimed.rows[0];
  await recordBusinessEvent(client, { eventType:"product.design_execution_started", objectType:"product", objectId:task.product_id, context, payload:{ taskId, operationType:definition.taskType, inputAssetId:sourceAsset.id } });

  try {
    const bytes = await renderSvgToJpeg(svg, Number(template.canvas_width), Number(template.canvas_height));
    const fileHash = sha256(bytes);
    const assetNo = await nextAssetNo(client, task.product_id);
    const canonicalName = `${product.rows[0].product_code}_D${String(assetNo).padStart(2,"0")}.jpg`;
    const bucketName = sourceAsset.metadata.gcsBucket;
    const gcsObject = derivedObjectName(task.product_id, taskId, canonicalName);
    const metadata = {
      layer:"DERIVED", designTaskId:taskId, designTemplateId:template.id, designTemplateVersion:template.version,
      sourceAssetIds:[sourceAsset.id], operationType:definition.taskType, executionType:"deterministic", fileSha256:fileHash,
      byteSize:bytes.length, width:Number(template.canvas_width), height:Number(template.canvas_height), gcsBucket:bucketName, gcsObject,
      validation:{ storage:"passed", dimensions:"normalized_to_template", confirmedFactsOnly:true, noAiFacts:true, humanReviewRequired:true },
      review:{ status:"pending" }
    };
    const uploaded = await uploadGcsObjectIfAbsent({ bucketName, objectName:gcsObject, buffer:bytes, contentType:"image/jpeg", metadata:{ layer:"DERIVED", productId:task.product_id, designTaskId:taskId, operationType:definition.taskType, sourceAssetId:sourceAsset.id, fileSha256:fileHash } });
    const inserted = await client.query(
      `INSERT INTO public.product_assets (id, product_id, asset_no, asset_type, asset_role, source_provider, source_ref, original_name, canonical_name, mime_type, lifecycle_status, metadata, created_by_person_id, updated_by_person_id, source_system)
       VALUES ($1,$2,$3,'image',$4,'aione-design',$5,$6,$6,'image/jpeg','formalized',$7::jsonb,$8,$8,$9) RETURNING *`,
      [makeId("ast"), task.product_id, assetNo, definition.assetRole, `${taskId}:${definition.taskType}:v1`, canonicalName, JSON.stringify(metadata), context.personId || null, context.sourceSystem || "aione-design-engine-v1"]
    );
    const completed = await client.query(`UPDATE public.design_tasks SET task_status='completed', completed_at=NOW(), failure_code=NULL, failure_detail=NULL, updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1 WHERE id=$1 RETURNING *`, [taskId, context.personId || null]);
    await recordBusinessEvent(client, { eventType:"product.derived_asset_created", objectType:"product", objectId:task.product_id, context, payload:{ taskId, outputAssetId:inserted.rows[0].id, inputAssetId:sourceAsset.id, operationType:definition.taskType, gcsObject, reusedGcsObject:uploaded.reused } });
    await recordBusinessEvent(client, { eventType:"product.design_execution_completed", objectType:"product", objectId:task.product_id, context, payload:{ taskId, outputAssetId:inserted.rows[0].id, operationType:definition.taskType } });
    return { task:completed.rows[0], outputs:[inserted.rows[0]], reused:false };
  } catch (error) {
    await client.query(`UPDATE public.design_tasks SET task_status='failed', failure_code=$2, failure_detail=$3::jsonb, completed_at=NOW(), updated_by_person_id=$4, updated_at=NOW(), record_version=record_version+1 WHERE id=$1 AND task_status='running'`, [taskId, error.code || "deterministic_media_execution_failed", JSON.stringify({ message:error.message || "Deterministic media execution failed." }), context.personId || null]);
    await recordBusinessEvent(client, { eventType:"product.design_execution_failed", objectType:"product", objectId:task.product_id, context, payload:{ taskId, code:error.code || "deterministic_media_execution_failed", operationType:definition.taskType } });
    throw error;
  }
}

export function executeSkuColorImage(client, taskId, context={}) {
  return executeDeterministicMedia(client, taskId, context, { taskType:"compose_sku_color_image", allowedOperation:"compose_sku_color_image", assetRole:"derived_sku_color_image", buildSvg:buildSkuColorSvg });
}

export function executeMaterialTextureImage(client, taskId, context={}) {
  return executeDeterministicMedia(client, taskId, context, { taskType:"compose_material_texture_image", allowedOperation:"compose_material_texture_image", assetRole:"derived_material_texture_image", buildSvg:buildMaterialTextureSvg });
}
