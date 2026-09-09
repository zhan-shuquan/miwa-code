import { createHash, randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import pool, { withTransaction } from "../../db.js";
import { fetchDriveFileStream, listDriveFolderFiles } from "../integrations/google-drive-client.js";
import { allocateSelectionNo } from "./selection-number-service.js";

const REQUIRED_HEADERS = ["商品标题", "商品ID", "商品链接", "图片地址", "商品价格", "加入时间", "平台", "店铺名称", "所属分组", "标签", "备注"];
const EXCEL_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ZIP_MIME = new Set(["application/zip", "application/x-zip-compressed", "application/octet-stream"]);

function text(value) {
  if (value == null) return "";
  if (typeof value === "object" && value.text != null) return String(value.text).trim();
  if (typeof value === "object" && Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("").trim();
  return String(value).trim();
}

function nullableText(value) {
  const result = text(value);
  return result || null;
}

function numberOrNull(value) {
  if (value == null || value === "") return null;
  const normalized = String(value).replaceAll(",", "").trim();
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

function parseSourceWeightG(note) {
  const value = text(note);
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;
  const weight = Number(value);
  return Number.isFinite(weight) && weight > 0 ? weight : null;
}

function parseTags(value) {
  return text(value)
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = text(value).replace(" ", "T");
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function hashBuffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function isExcel(file) {
  return String(file.name || "").toLowerCase().endsWith(".xlsx") || file.mimeType === EXCEL_MIME;
}

function zipItemId(file) {
  // Verified 1688 downloads use both:
  //   1688_<itemId>_<title>.zip
  //   1688_<itemId> <title>.zip
  // The item id is the deterministic contract; the human title separator is not.
  const match = /^1688_(\d+)(?:[ _-].*)?\.zip$/i.exec(String(file.name || "").trim());
  return match ? match[1] : null;
}

function buildZipIndex(files) {
  const index = new Map();
  for (const file of files) {
    const itemId = zipItemId(file);
    const looksZip = itemId && (String(file.name || "").toLowerCase().endsWith(".zip") || ZIP_MIME.has(file.mimeType));
    if (!looksZip) continue;
    const existing = index.get(itemId);
    if (!existing || String(file.modifiedTime || "") > String(existing.modifiedTime || "")) index.set(itemId, file);
  }
  return index;
}

function sourceMaterialZipMetadata(zip) {
  return {
    provider: "google-drive",
    fileId: zip.id,
    name: zip.name,
    mimeType: zip.mimeType || "application/zip",
    size: zip.size ? Number(zip.size) : null,
    modifiedTime: zip.modifiedTime || null
  };
}

function sameZipEvidence(current, next) {
  return Boolean(
    current &&
    current.fileId === next.fileId &&
    current.modifiedTime === next.modifiedTime &&
    Number(current.size || 0) === Number(next.size || 0)
  );
}

function findHeaderRow(worksheet) {
  const maxRows = Math.min(worksheet.rowCount, 20);
  for (let rowNo = 1; rowNo <= maxRows; rowNo += 1) {
    const values = [];
    worksheet.getRow(rowNo).eachCell({ includeEmpty: true }, (cell) => values.push(text(cell.value)));
    if (values.includes("商品ID") && values.includes("商品标题")) return rowNo;
  }
  return null;
}

function buildHeaderMap(worksheet, rowNo) {
  const map = new Map();
  worksheet.getRow(rowNo).eachCell({ includeEmpty: true }, (cell, colNo) => {
    const name = text(cell.value);
    if (name) map.set(name, colNo);
  });
  return map;
}

function parseWorkbookRows(workbook) {
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw Object.assign(new Error("Excel workbook has no worksheet."), { code: "selection_excel_empty" });
  const headerRowNo = findHeaderRow(worksheet);
  if (!headerRowNo) throw Object.assign(new Error("Could not locate 1688 selection Excel header row."), { code: "selection_excel_header_missing" });

  const headers = buildHeaderMap(worksheet, headerRowNo);
  const missing = REQUIRED_HEADERS.filter((header) => !headers.has(header));
  if (missing.length) {
    const error = new Error(`1688 selection Excel is missing required columns: ${missing.join(", ")}`);
    error.code = "selection_excel_columns_missing";
    error.missing = missing;
    throw error;
  }

  const rows = [];
  for (let rowNo = headerRowNo + 1; rowNo <= worksheet.rowCount; rowNo += 1) {
    const row = worksheet.getRow(rowNo);
    const get = (header) => row.getCell(headers.get(header)).value;
    const sourceRef = text(get("商品ID"));
    const title = text(get("商品标题"));
    if (!sourceRef && !title) continue;

    const sourcePlatform = text(get("平台")) || "1688";
    const tags = parseTags(get("标签"));
    rows.push({
      rowNo,
      sourcePlatform,
      sourceRef,
      title,
      sourceUrl: nullableText(get("商品链接")),
      sourceCoverImageUrl: nullableText(get("图片地址")),
      sourcePrice: numberOrNull(get("商品价格")),
      sourceCurrency: sourcePlatform === "1688" ? "CNY" : null,
      sourceAddedAt: parseDate(get("加入时间")),
      sourceSupplierName: nullableText(get("店铺名称")),
      sourceGroup: nullableText(get("所属分组")),
      sourceTags: tags,
      sourceNote: nullableText(get("备注")),
      sourceWeightG: parseSourceWeightG(get("备注")),
      sourceFulfillmentHint: tags.includes("直发选品") ? "direct" : null
    });
  }
  return rows;
}

async function createBatch(file, fileHash) {
  const duplicate = await pool.query(
    `SELECT * FROM public.selection_import_batches
      WHERE source_file_hash=$1 AND status='completed'
      ORDER BY finished_at DESC NULLS LAST, created_at DESC LIMIT 1`,
    [fileHash]
  );
  if (duplicate.rowCount) return { duplicate: duplicate.rows[0], batch: null };

  const result = await pool.query(
    `INSERT INTO public.selection_import_batches
      (id, source_type, source_file_id, source_file_name, source_file_path, source_file_hash,
       source_file_modified_at, source_file_size, status, started_at, source_system)
     VALUES ($1,'1688_selection_pool',$2,$3,$4,$5,$6,$7,'processing',NOW(),'aione-1688-drive-inbox')
     RETURNING *`,
    [`sib_${randomUUID()}`, file.id, file.name, file.webViewLink || null, fileHash, file.modifiedTime || null, file.size ? Number(file.size) : null]
  );
  return { duplicate: null, batch: result.rows[0] };
}

async function importRow(item, zipIndex) {
  if (!/^\d+$/.test(item.sourceRef)) throw Object.assign(new Error("商品ID must be numeric."), { code: "invalid_1688_item_id" });
  if (!item.title) throw Object.assign(new Error("商品标题 is required."), { code: "missing_1688_title" });

  return withTransaction(async (client) => {
    const existingResult = await client.query(
      `SELECT * FROM public.product_opportunities
        WHERE source_platform=$1 AND source_ref=$2 AND archived_at IS NULL
        LIMIT 1 FOR UPDATE`,
      [item.sourcePlatform, item.sourceRef]
    );
    const zip = zipIndex.get(item.sourceRef) || null;
    const zipMetadata = zip ? { sourceMaterialZip: sourceMaterialZipMetadata(zip) } : {};

    if (existingResult.rowCount) {
      const current = existingResult.rows[0];
      const updated = await client.query(
        `UPDATE public.product_opportunities
            SET title=COALESCE(NULLIF($2,''),title),
                source_url=COALESCE($3,source_url),
                source_cover_image_url=COALESCE($4,source_cover_image_url),
                source_price=COALESCE($5,source_price),
                source_currency=COALESCE($6,source_currency),
                source_supplier_name=COALESCE($7,source_supplier_name),
                source_group=COALESCE($8,source_group),
                source_tags=$9::text[],
                source_note=COALESCE($10,source_note),
                source_weight_g=COALESCE($11,source_weight_g),
                source_fulfillment_hint=$12,
                source_added_at=COALESCE(source_added_at,$13),
                first_imported_at=COALESCE(first_imported_at,NOW()),
                last_imported_at=NOW(),
                metadata=COALESCE(metadata,'{}'::jsonb) || $14::jsonb,
                updated_at=NOW(), record_version=record_version+1
          WHERE id=$1 RETURNING *`,
        [current.id, item.title, item.sourceUrl, item.sourceCoverImageUrl, item.sourcePrice,
          item.sourceCurrency, item.sourceSupplierName, item.sourceGroup, item.sourceTags, item.sourceNote,
          item.sourceWeightG, item.sourceFulfillmentHint, item.sourceAddedAt, JSON.stringify(zipMetadata)]
      );
      return { action: "updated", selection: updated.rows[0], zipMatched: Boolean(zip) };
    }

    const { selectionNo, selectionDate } = await allocateSelectionNo(client, item.sourceAddedAt || new Date());
    const inserted = await client.query(
      `INSERT INTO public.product_opportunities
        (id, source_platform, source_ref, source_url, title, selection_mode, lifecycle_status,
         selection_no, selection_date, source_cover_image_url, source_price, source_currency,
         source_supplier_name, source_group, source_tags, source_note, source_weight_g,
         source_fulfillment_hint, source_added_at, first_imported_at, last_imported_at,
         classification_status, metadata, source_system)
       VALUES ($1,$2,$3,$4,$5,'selection','pending',$6,$7::date,$8,$9,$10,$11,$12,$13::text[],$14,$15,$16,
               $17,NOW(),NOW(),'pending',$18::jsonb,'aione-1688-drive-inbox')
       RETURNING *`,
      [`sel_${randomUUID()}`, item.sourcePlatform, item.sourceRef, item.sourceUrl, item.title,
        selectionNo, selectionDate, item.sourceCoverImageUrl, item.sourcePrice, item.sourceCurrency,
        item.sourceSupplierName, item.sourceGroup, item.sourceTags, item.sourceNote, item.sourceWeightG,
        item.sourceFulfillmentHint, item.sourceAddedAt, JSON.stringify(zipMetadata)]
    );
    return { action: "created", selection: inserted.rows[0], zipMatched: Boolean(zip) };
  });
}

async function reconcileDuplicateZipEvidence(buffer, zipIndex) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const rows = parseWorkbookRows(workbook);
  let matchedRecordCount = 0;
  let reconciledCount = 0;
  let missingOpportunityCount = 0;

  for (const item of rows) {
    const zip = zipIndex.get(item.sourceRef) || null;
    if (!zip) continue;
    matchedRecordCount += 1;
    const nextEvidence = sourceMaterialZipMetadata(zip);

    await withTransaction(async (client) => {
      const existingResult = await client.query(
        `SELECT id, metadata FROM public.product_opportunities
          WHERE source_platform=$1 AND source_ref=$2 AND archived_at IS NULL
          LIMIT 1 FOR UPDATE`,
        [item.sourcePlatform, item.sourceRef]
      );
      if (!existingResult.rowCount) {
        missingOpportunityCount += 1;
        return;
      }

      const current = existingResult.rows[0];
      const currentEvidence = (current.metadata || {}).sourceMaterialZip || null;
      if (sameZipEvidence(currentEvidence, nextEvidence)) return;

      await client.query(
        `UPDATE public.product_opportunities
            SET metadata=COALESCE(metadata,'{}'::jsonb) || $2::jsonb,
                last_imported_at=NOW(), updated_at=NOW(), record_version=record_version+1
          WHERE id=$1`,
        [current.id, JSON.stringify({ sourceMaterialZip: nextEvidence })]
      );
      reconciledCount += 1;
    });
  }

  return {
    availableZipCount: zipIndex.size,
    matchedRecordCount,
    unmatchedRecordCount: Math.max(0, rows.length - matchedRecordCount),
    reconciledCount,
    missingOpportunityCount
  };
}

async function finishBatch(batchId, status, counters, errors, zipStats) {
  return pool.query(
    `UPDATE public.selection_import_batches
        SET status=$2, record_count=$3, created_count=$4, updated_count=$5, skipped_count=$6,
            error_count=$7, result_data=$8::jsonb, finished_at=NOW()
      WHERE id=$1 RETURNING *`,
    [batchId, status, counters.recordCount, counters.created, counters.updated, counters.skipped,
      counters.errors, JSON.stringify({ errors, zip: zipStats })]
  );
}

export async function import1688DriveInbox({ folderId, driveId }) {
  if (!folderId) throw Object.assign(new Error("AIONE 1688 selection inbox folder id is required."), { code: "selection_inbox_folder_required" });
  const files = await listDriveFolderFiles({ folderId, driveId, pageSize: 1000 });
  const zipIndex = buildZipIndex(files);
  const excelFiles = files.filter(isExcel).sort((a, b) => String(a.modifiedTime || "").localeCompare(String(b.modifiedTime || "")));
  const summaries = [];

  for (const file of excelFiles) {
    const fetched = await fetchDriveFileStream({ fileId: file.id, mimeType: file.mimeType });
    const buffer = await streamToBuffer(fetched.stream);
    const fileHash = hashBuffer(buffer);
    const { duplicate, batch } = await createBatch(file, fileHash);
    if (duplicate) {
      try {
        const zip = await reconcileDuplicateZipEvidence(buffer, zipIndex);
        summaries.push({ fileId: file.id, fileName: file.name, status: "duplicate", batchId: duplicate.id, zip });
      } catch (error) {
        summaries.push({
          fileId: file.id,
          fileName: file.name,
          status: "failed",
          batchId: duplicate.id,
          error: { code: error.code || "duplicate_zip_reconcile_failed", message: error.message }
        });
      }
      continue;
    }

    const counters = { recordCount: 0, created: 0, updated: 0, skipped: 0, errors: 0 };
    const errors = [];
    let matchedZips = 0;

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const rows = parseWorkbookRows(workbook);
      counters.recordCount = rows.length;

      for (const item of rows) {
        try {
          const result = await importRow(item, zipIndex);
          if (result.action === "created") counters.created += 1;
          else if (result.action === "updated") counters.updated += 1;
          else counters.skipped += 1;
          if (result.zipMatched) matchedZips += 1;
        } catch (error) {
          counters.errors += 1;
          errors.push({ row: item.rowNo, sourceRef: item.sourceRef || null, code: error.code || "row_import_failed", message: error.message });
        }
      }

      const finished = await finishBatch(batch.id, "completed", counters, errors, {
        availableZipCount: zipIndex.size,
        matchedRecordCount: matchedZips,
        unmatchedRecordCount: Math.max(0, rows.length - matchedZips)
      });
      summaries.push({ fileId: file.id, fileName: file.name, status: "completed", batch: finished.rows[0] });
    } catch (error) {
      counters.errors += 1;
      errors.push({ code: error.code || "file_import_failed", message: error.message, missing: error.missing || undefined });
      const finished = await finishBatch(batch.id, "failed", counters, errors, {
        availableZipCount: zipIndex.size,
        matchedRecordCount: matchedZips
      });
      summaries.push({ fileId: file.id, fileName: file.name, status: "failed", batch: finished.rows[0] });
    }
  }

  return {
    folderId,
    driveId: driveId || null,
    scannedFiles: files.length,
    excelFiles: excelFiles.length,
    zipFiles: zipIndex.size,
    imports: summaries
  };
}
