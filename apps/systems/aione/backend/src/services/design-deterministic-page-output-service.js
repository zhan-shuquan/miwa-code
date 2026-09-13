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
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&apos;" }[ch]));
}
function clean(value) { return String(value ?? "").trim(); }
function derivedObjectName(productId, taskId, canonicalName) { return `derived/${productId}/${taskId}/v1/${canonicalName}`; }

function pageSpecFromTask(task) {
  const instruction = task?.instruction_snapshot && typeof task.instruction_snapshot === "object" ? task.instruction_snapshot : {};
  return instruction.pageSpec && typeof instruction.pageSpec === "object" ? instruction.pageSpec : {};
}

function normalizeMeasurements(value) {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      if (item && typeof item === "object") {
        return { label: clean(item.label || item.name || item.key || `尺寸${index + 1}`), value: clean(item.value ?? item.measurement), unit: clean(item.unit) };
      }
      return { label: `尺寸${index + 1}`, value: clean(item), unit: "" };
    }).filter((item) => item.value);
  }
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, raw]) => {
      if (raw && typeof raw === "object") return { label: clean(raw.label || key), value: clean(raw.value ?? raw.measurement), unit: clean(raw.unit) };
      return { label: clean(key), value: clean(raw), unit: "" };
    }).filter((item) => item.value);
  }
  return [];
}

async function loadOptionalSourceAsset(client, task) {
  const ids = Array.isArray(task.input_asset_ids) ? [...new Set(task.input_asset_ids.map(String).filter(Boolean))] : [];
  if (!ids.length) return null;
  const result = await client.query(
    `SELECT * FROM public.product_assets
      WHERE id=$1 AND product_id=$2 AND archived_at IS NULL
      LIMIT 1`,
    [ids[0], task.product_id]
  );
  if (!result.rowCount) throw Object.assign(new Error("Design SOURCE ProductAsset was not found."), { statusCode:409, code:"design_input_asset_missing" });
  const asset = result.rows[0];
  const metadata = asset.metadata || {};
  if (metadata.layer !== "SOURCE") throw Object.assign(new Error("Deterministic page renderer accepts canonical SOURCE assets only."), { statusCode:409, code:"design_source_asset_required" });
  if (!String(asset.mime_type || "").startsWith("image/")) throw Object.assign(new Error("Deterministic page renderer requires an image SOURCE asset."), { statusCode:409, code:"design_source_asset_not_image" });
  if (!metadata.gcsBucket || !metadata.gcsObject) throw Object.assign(new Error("SOURCE asset has no canonical GCS storage reference."), { statusCode:409, code:"canonical_asset_storage_missing" });
  return asset;
}

async function sourceImageDataUri(asset) {
  if (!asset) return null;
  const canonical = await readGcsObject({ bucketName:asset.metadata.gcsBucket, objectName:asset.metadata.gcsObject });
  const contentType = canonical.contentType || asset.mime_type || "image/jpeg";
  return `data:${contentType};base64,${canonical.bytes.toString("base64")}`;
}

async function renderSvgToJpeg(svg, width, height) {
  const root = await mkdtemp(join(tmpdir(), "aione-deterministic-page-"));
  const svgPath = join(root, "input.svg");
  const outputPath = join(root, "output.jpg");
  await writeFile(svgPath, svg, "utf8");
  try {
    await execFileAsync("convert", [svgPath, "-background", "white", "-alpha", "remove", "-alpha", "off", "-resize", `${width}x${height}!`, "-strip", "-quality", "94", outputPath], { maxBuffer:20 * 1024 * 1024 });
    const bytes = await readFile(outputPath);
    if (!bytes.length) throw Object.assign(new Error("Deterministic page renderer produced no bytes."), { code:"design_output_empty" });
    return bytes;
  } finally {
    await rm(root, { recursive:true, force:true }).catch(() => {});
  }
}

function commonSvgStart(width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#fbfbfa"/>
  <rect x="28" y="28" width="${width-56}" height="${height-56}" rx="24" fill="#ffffff" stroke="#d8dedb" stroke-width="2"/>
  <line x1="70" y1="46" x2="930" y2="46" stroke="#b69445" stroke-width="3"/>
  <line x1="70" y1="56" x2="930" y2="56" stroke="#203b59" stroke-width="3"/>`;
}

function imageBlock(dataUri, { x, y, w, h }) {
  if (!dataUri) return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#fafafa" stroke="#dfe4e1" stroke-width="2" stroke-dasharray="8 8"/>`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#ffffff" stroke="#e2e6e4" stroke-width="2"/>
  <image href="${dataUri}" x="${x+18}" y="${y+18}" width="${w-36}" height="${h-36}" preserveAspectRatio="xMidYMid meet"/>`;
}

export function buildTruthfulSizeGuideSvg({ width=1000, height=1500, facts={}, sourceDataUri=null } = {}) {
  const supportedSize = clean(facts.supportedSize);
  if (!supportedSize) throw Object.assign(new Error("Truthful size guide requires confirmed supportedSize."), { statusCode:409, code:"supported_size_required" });
  const measurements = normalizeMeasurements(facts.measurements);
  const rows = measurements.slice(0, 8);
  const rowMarkup = rows.length
    ? rows.map((item, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = 90 + col * 420;
        const y = 1040 + row * 92;
        return `<rect x="${x}" y="${y}" width="380" height="72" rx="12" fill="#ffffff" stroke="#dce2df"/>
        <text x="${x+20}" y="${y+26}" font-family="Noto Sans CJK JP, sans-serif" font-size="20" fill="#65706a">${esc(item.label)}</text>
        <text x="${x+20}" y="${y+56}" font-family="Noto Sans CJK JP, sans-serif" font-size="27" font-weight="700" fill="#26372f">${esc(item.value)}${item.unit ? ` ${esc(item.unit)}` : ""}</text>`;
      }).join("\n")
    : `<rect x="120" y="1050" width="760" height="120" rx="18" fill="#f7f8f7" stroke="#dde3df"/>
       <text x="500" y="1100" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="24" fill="#65706a">実測サイズは未確認</text>
       <text x="500" y="1140" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="19" fill="#858d89">対応サイズのみ表示 · 数値は推測しません</text>`;
  return `${commonSvgStart(width,height)}
  <text x="500" y="140" text-anchor="middle" font-family="Noto Serif CJK JP, serif" font-size="52" font-weight="700" fill="#203b59">SIZE GUIDE</text>
  <text x="500" y="184" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="24" fill="#606963">サイズ・実寸ガイド</text>
  <rect x="260" y="235" width="480" height="128" rx="64" fill="#ffffff" stroke="#d6ddda" stroke-width="2"/>
  <text x="500" y="278" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="20" fill="#747d78">対応サイズ</text>
  <text x="500" y="330" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="44" font-weight="700" fill="#1f392f">${esc(supportedSize)}</text>
  ${imageBlock(sourceDataUri,{x:110,y:410,w:780,h:560})}
  ${rowMarkup}
  <text x="500" y="1430" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="17" fill="#7d8581">確認済み Product Truth のみ使用</text>
  </svg>`;
}

function productSpecRows(productCode, facts) {
  const variants = Array.isArray(facts.actualVariants) ? facts.actualVariants.filter(Boolean).map(clean) : [];
  const origin = clean(facts.countryOfOrigin || facts.productionCountry || facts.originCountry);
  return [
    ["品番", clean(productCode || facts.productCode)],
    ["素材", clean(facts.material)],
    ["対応サイズ", clean(facts.supportedSize)],
    ["カラー", variants.join(" / ")],
    ["季節", clean(facts.season)],
    ["丈 / タイプ", clean(facts.lengthType)],
    ["セット数", facts.setCount == null ? "" : clean(facts.setCount)],
    ["生産国", origin]
  ].filter(([, value]) => value);
}

export function buildProductSpecSvg({ width=1000, height=1500, productCode="", facts={}, sourceDataUri=null } = {}) {
  const rows = productSpecRows(productCode, facts).slice(0, 8);
  if (!rows.length) throw Object.assign(new Error("Product spec renderer has no confirmed fields to render."), { statusCode:409, code:"confirmed_product_spec_required" });
  const startY = 790;
  const rowHeight = Math.min(74, Math.floor(520 / Math.max(rows.length, 1)));
  const markup = rows.map(([label, value], index) => {
    const y = startY + index * rowHeight;
    return `<rect x="100" y="${y}" width="800" height="${rowHeight}" fill="${index % 2 ? "#fbfbfa" : "#ffffff"}" stroke="#e0e5e2"/>
      <text x="130" y="${y + Math.floor(rowHeight*0.62)}" font-family="Noto Sans CJK JP, sans-serif" font-size="21" font-weight="700" fill="#5f6964">${esc(label)}</text>
      <text x="390" y="${y + Math.floor(rowHeight*0.62)}" font-family="Noto Sans CJK JP, sans-serif" font-size="21" fill="#27332d">${esc(value)}</text>`;
  }).join("\n");
  return `${commonSvgStart(width,height)}
  <text x="500" y="140" text-anchor="middle" font-family="Noto Serif CJK JP, serif" font-size="54" font-weight="700" fill="#203b59">商品仕様</text>
  <text x="500" y="184" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="20" letter-spacing="4" fill="#a18443">PRODUCT SPEC</text>
  ${imageBlock(sourceDataUri,{x:160,y:235,w:680,h:470})}
  ${markup}
  <text x="500" y="1430" text-anchor="middle" font-family="Noto Sans CJK JP, sans-serif" font-size="17" fill="#7d8581">未確認項目は表示しません · AI による仕様補完なし</text>
  </svg>`;
}

async function nextAssetNo(client, productId) {
  const result = await client.query("SELECT COALESCE(MAX(asset_no),0)+1 AS next_no FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL", [productId]);
  const value = Number(result.rows[0]?.next_no || 0);
  if (!Number.isInteger(value) || value < 1 || value > 999) throw Object.assign(new Error("Product asset capacity exhausted."), { statusCode:409, code:"product_asset_capacity_exhausted" });
  return value;
}

async function executeDeterministicPage(client, taskId, context, definition) {
  let task = await getDesignTask(client, taskId);
  if (task.task_type !== definition.taskType) throw Object.assign(new Error(`This executor only supports ${definition.taskType} tasks.`), { statusCode:409, code:"unsupported_design_task_type" });
  if (task.task_status === "completed") {
    const outputs = await listDesignTaskOutputs(client, taskId);
    if (outputs.length) return { task, outputs, reused:true };
  }
  if (task.task_status !== "approved") throw Object.assign(new Error("DesignTask must be approved before execution."), { statusCode:409, code:"design_task_not_approved" });

  const template = await getDesignTemplate(client, task.template_id);
  const allowed = Array.isArray(template.allowed_operations) ? template.allowed_operations : [];
  if (!definition.allowedOperations.some((operation) => allowed.includes(operation))) throw Object.assign(new Error(`Selected DesignTemplate does not allow ${definition.taskType}.`), { statusCode:409, code:"design_operation_not_allowed" });
  const sourceAsset = await loadOptionalSourceAsset(client, task);
  const sourceDataUri = await sourceImageDataUri(sourceAsset);
  const product = await client.query("SELECT id, product_code FROM public.products WHERE id=$1 AND archived_at IS NULL LIMIT 1", [task.product_id]);
  if (!product.rowCount) throw Object.assign(new Error("Product not found during deterministic design execution."), { statusCode:404, code:"product_not_found" });

  const claimed = await client.query(
    `UPDATE public.design_tasks SET task_status='running', started_at=COALESCE(started_at,NOW()), updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1 WHERE id=$1 AND task_status='approved' RETURNING *`,
    [taskId, context.personId || null]
  );
  if (!claimed.rowCount) throw Object.assign(new Error("DesignTask is already claimed or no longer executable."), { statusCode:409, code:"design_task_execution_conflict" });
  task = claimed.rows[0];

  await recordBusinessEvent(client, { eventType:"product.design_execution_started", objectType:"product", objectId:task.product_id, context, payload:{ taskId, operationType:definition.taskType, inputAssetId:sourceAsset?.id || null } });
  try {
    const facts = task.input_fact_snapshot && typeof task.input_fact_snapshot === "object" ? task.input_fact_snapshot : {};
    const svg = definition.buildSvg({ width:Number(template.canvas_width), height:Number(template.canvas_height), productCode:product.rows[0].product_code, facts, sourceDataUri });
    const outputBytes = await renderSvgToJpeg(svg, Number(template.canvas_width), Number(template.canvas_height));
    const fileHash = sha256(outputBytes);
    const assetNo = await nextAssetNo(client, task.product_id);
    const canonicalName = `${product.rows[0].product_code}_D${String(assetNo).padStart(2,"0")}.jpg`;
    const bucketName = sourceAsset?.metadata?.gcsBucket || process.env.AIONE_PRODUCT_ASSET_BUCKET || "miwa-aione-product-assets";
    const gcsObject = derivedObjectName(task.product_id, taskId, canonicalName);
    const uploaded = await uploadGcsObjectIfAbsent({ bucketName, objectName:gcsObject, buffer:outputBytes, contentType:"image/jpeg", metadata:{ layer:"DERIVED", productId:task.product_id, designTaskId:taskId, designTemplateId:template.id, operationType:definition.taskType, executionType:"deterministic", fileSha256:fileHash, sourceAssetId:sourceAsset?.id || "" } });
    const metadata = {
      layer:"DERIVED", designTaskId:taskId, designTemplateId:template.id, designTemplateVersion:template.version,
      sourceAssetIds:sourceAsset ? [sourceAsset.id] : [], operationType:definition.taskType, executionType:"deterministic",
      fileSha256:fileHash, byteSize:outputBytes.length, width:Number(template.canvas_width), height:Number(template.canvas_height), gcsBucket:bucketName, gcsObject,
      validation:{ storage:"passed", dimensions:"normalized_to_template", confirmedFactsOnly:true, humanReviewRequired:true }, review:{ status:"pending" }
    };
    const inserted = await client.query(
      `INSERT INTO public.product_assets
        (id, product_id, asset_no, asset_type, asset_role, source_provider, source_ref, original_name, canonical_name, mime_type, lifecycle_status, metadata, created_by_person_id, updated_by_person_id, source_system)
       VALUES ($1,$2,$3,'image',$4,'aione-design',$5,$6,$6,'image/jpeg','formalized',$7::jsonb,$8,$8,$9) RETURNING *`,
      [makeId("ast"), task.product_id, assetNo, definition.assetRole, `${taskId}:${definition.taskType}:v1`, canonicalName, JSON.stringify(metadata), context.personId || null, context.sourceSystem || "aione-design-engine-v1"]
    );
    const completed = await client.query(`UPDATE public.design_tasks SET task_status='completed', completed_at=NOW(), failure_code=NULL, failure_detail=NULL, updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1 WHERE id=$1 RETURNING *`, [taskId, context.personId || null]);
    await recordBusinessEvent(client, { eventType:"product.derived_asset_created", objectType:"product", objectId:task.product_id, context, payload:{ taskId, outputAssetId:inserted.rows[0].id, operationType:definition.taskType, inputAssetId:sourceAsset?.id || null, gcsObject, reusedGcsObject:uploaded.reused } });
    await recordBusinessEvent(client, { eventType:"product.design_execution_completed", objectType:"product", objectId:task.product_id, context, payload:{ taskId, outputAssetId:inserted.rows[0].id, operationType:definition.taskType } });
    return { task:completed.rows[0], outputs:[inserted.rows[0]], reused:false };
  } catch (error) {
    await client.query(`UPDATE public.design_tasks SET task_status='failed', failure_code=$2, failure_detail=$3::jsonb, completed_at=NOW(), updated_by_person_id=$4, updated_at=NOW(), record_version=record_version+1 WHERE id=$1 AND task_status='running'`, [taskId, error.code || "deterministic_page_execution_failed", JSON.stringify({ message:error.message || "Deterministic page execution failed." }), context.personId || null]);
    await recordBusinessEvent(client, { eventType:"product.design_execution_failed", objectType:"product", objectId:task.product_id, context, payload:{ taskId, code:error.code || "deterministic_page_execution_failed", operationType:definition.taskType } });
    throw error;
  }
}

export function executeTruthfulSizeGuide(client, taskId, context = {}) {
  return executeDeterministicPage(client, taskId, context, {
    taskType:"compose_truthful_size_guide",
    allowedOperations:["compose_size_guide","deterministic_copy_overlay"],
    assetRole:"derived_size_guide",
    buildSvg:buildTruthfulSizeGuideSvg
  });
}

export function executeDeterministicProductSpec(client, taskId, context = {}) {
  return executeDeterministicPage(client, taskId, context, {
    taskType:"compose_deterministic_product_spec",
    allowedOperations:["compose_product_spec","deterministic_copy_overlay"],
    assetRole:"derived_product_spec",
    buildSvg:buildProductSpecSvg
  });
}
