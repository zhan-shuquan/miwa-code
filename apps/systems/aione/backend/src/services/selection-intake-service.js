import { randomUUID } from "node:crypto";
import pool, { withTransaction } from "../../db.js";
import { allocateSelectionNo } from "./selection-number-service.js";

const allowedTypes = new Set(["直发选品", "常规选品"]);
const clean = (v, n = 1000) => String(v ?? "").trim().slice(0, n);
const nullable = (v, n = 1000) => clean(v, n) || null;
const numberOrNull = (v) => {
  const raw = String(v ?? "").replaceAll(",", "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

function sourceRefOf(record) {
  const direct = clean(record.sourceRef, 120);
  if (/^\d+$/.test(direct)) return direct;
  const match = clean(record.sourceUrl, 2000).match(/(?:offer\/|offerId=|offer_id=|id=)(\d{6,})/i);
  return match?.[1] || "";
}

function normalizeManifest(input = {}) {
  const files = Array.isArray(input.files) ? input.files.slice(0, 2000) : [];
  return {
    source: "browser-local-folder",
    folderName: nullable(input.folderName, 240),
    scannedAt: new Date().toISOString(),
    fileCount: files.length,
    roleCounts: input.roleCounts && typeof input.roleCounts === "object" ? input.roleCounts : {},
    hasOriginalHero: Boolean(input.hasOriginalHero),
    files: files.map((f) => ({
      name: clean(f?.name, 300),
      relativePath: clean(f?.relativePath, 1000),
      size: numberOrNull(f?.size),
      lastModified: numberOrNull(f?.lastModified),
      role: clean(f?.role, 80) || "其他"
    }))
  };
}

async function upsertOne(record, context) {
  const sourceRef = sourceRefOf(record);
  const title = clean(record.title, 500);
  if (!sourceRef || !title) {
    const error = new Error(!sourceRef ? "1688 商品ID无法识别。" : "商品标题不能为空。");
    error.statusCode = 400;
    error.code = !sourceRef ? "selection_source_ref_required" : "selection_title_required";
    throw error;
  }

  return withTransaction(async (client) => {
    const sourcePlatform = clean(record.sourcePlatform || "1688", 80) || "1688";
    const existing = await client.query(
      "SELECT id FROM public.product_opportunities WHERE source_platform=$1 AND source_ref=$2 AND archived_at IS NULL LIMIT 1 FOR UPDATE",
      [sourcePlatform, sourceRef]
    );
    const tags = Array.isArray(record.sourceTags) ? record.sourceTags.map((x) => clean(x, 120)).filter(Boolean) : [];
    const metadata = JSON.stringify({
      selectionType: context.selectionType,
      intake: { channel: "browser-1688-excel-local-material", fileName: nullable(context.intakeFile?.name, 300), importedAt: new Date().toISOString() },
      localMaterialIntake: context.materialManifest
    });

    if (existing.rowCount) {
      const result = await client.query(
        "UPDATE public.product_opportunities SET title=$2, source_url=COALESCE($3,source_url), source_cover_image_url=COALESCE($4,source_cover_image_url), source_price=COALESCE($5,source_price), source_supplier_name=COALESCE($6,source_supplier_name), source_group=COALESCE($7,source_group), source_tags=$8::text[], source_note=COALESCE($9,source_note), source_weight_g=COALESCE($10,source_weight_g), source_fulfillment_hint=$11, owner_person_id=COALESCE(owner_person_id,$12), last_imported_at=NOW(), metadata=COALESCE(metadata,'{}'::jsonb)||$13::jsonb, updated_at=NOW(), record_version=record_version+1 WHERE id=$1 RETURNING id,selection_no,title,source_ref,lifecycle_status,metadata",
        [existing.rows[0].id, title, nullable(record.sourceUrl, 2000), nullable(record.sourceCoverImageUrl, 3000), numberOrNull(record.sourcePrice), nullable(record.sourceSupplierName, 500), nullable(record.sourceGroup, 500), tags, nullable(record.sourceNote, 2000), numberOrNull(record.sourceWeightG), context.selectionType === "直发选品" ? "direct" : null, context.ownerPersonId || null, metadata]
      );
      return { action: "updated", selection: result.rows[0] };
    }

    const { selectionNo, selectionDate } = await allocateSelectionNo(client, new Date());
    const result = await client.query(
      "INSERT INTO public.product_opportunities (id,source_platform,source_ref,source_url,title,selection_mode,lifecycle_status,selection_no,selection_date,source_cover_image_url,source_price,source_currency,source_supplier_name,source_group,source_tags,source_note,source_weight_g,source_fulfillment_hint,first_imported_at,last_imported_at,classification_status,owner_person_id,metadata,source_system) VALUES ($1,$2,$3,$4,$5,'selection','pending',$6,$7::date,$8,$9,$10,$11,$12,$13::text[],$14,$15,$16,NOW(),NOW(),'pending',$17,$18::jsonb,'aione-web-intake') RETURNING id,selection_no,title,source_ref,lifecycle_status,metadata",
      [`sel_${randomUUID()}`, sourcePlatform, sourceRef, nullable(record.sourceUrl, 2000), title, selectionNo, selectionDate, nullable(record.sourceCoverImageUrl, 3000), numberOrNull(record.sourcePrice), clean(record.sourceCurrency || "CNY", 20) || null, nullable(record.sourceSupplierName, 500), nullable(record.sourceGroup, 500), tags, nullable(record.sourceNote, 2000), numberOrNull(record.sourceWeightG), context.selectionType === "直发选品" ? "direct" : null, context.ownerPersonId || null, metadata]
    );
    return { action: "created", selection: result.rows[0] };
  });
}

export async function intakeSelectionRecords({ records, selectionType, ownerPersonId, materialManifest, intakeFile }) {
  if (!allowedTypes.has(selectionType)) {
    const error = new Error("选品方式必须为直发选品或常规选品。");
    error.statusCode = 400;
    error.code = "selection_type_invalid";
    throw error;
  }
  if (!Array.isArray(records) || !records.length || records.length > 500) {
    const error = new Error("单次导入必须包含1到500条记录。");
    error.statusCode = 400;
    error.code = "selection_records_invalid";
    throw error;
  }
  const context = { selectionType, ownerPersonId, materialManifest: normalizeManifest(materialManifest), intakeFile: intakeFile || {} };
  const results = [];
  for (const record of records) results.push(await upsertOne(record, context));
  const ids = results.map((x) => x.selection.id);
  const verified = await pool.query("SELECT id,selection_no,title,source_ref,lifecycle_status FROM public.product_opportunities WHERE id=ANY($1::text[]) AND archived_at IS NULL", [ids]);
  return {
    createdCount: results.filter((x) => x.action === "created").length,
    updatedCount: results.filter((x) => x.action === "updated").length,
    totalCount: results.length,
    results,
    verification: { persistedCount: verified.rowCount, persisted: verified.rows },
    material: { fileCount: context.materialManifest.fileCount, roleCounts: context.materialManifest.roleCounts, hasOriginalHero: context.materialManifest.hasOriginalHero }
  };
}
