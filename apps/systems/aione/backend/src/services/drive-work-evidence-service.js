import pool from "../../db.js";
import { fetchDriveFileStream } from "../integrations/google-drive-client.js";
import { parseXlsxFirstSheet } from "../integrations/xlsx-lite.js";
import { validate1688WeeklyEvidence } from "./work-evidence-validation-service.js";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_XLSX_BYTES = 20 * 1024 * 1024;

async function streamToBuffer(stream, maxBytes = MAX_XLSX_BYTES) {
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) {
      const error = new Error("1688 selection spreadsheet exceeds the 20MB validation limit.");
      error.code = "work_evidence_file_too_large";
      error.statusCode = 413;
      if (typeof stream.destroy === "function") stream.destroy();
      throw error;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, total);
}

export async function validateDrive1688Evidence({ workItemId, evidenceId, actorPersonId = null, sourceSystem = "aione-drive-work-validator" }) {
  const result = await pool.query(`
    SELECT e.id, e.work_item_id, e.provider, e.provider_file_id, e.file_name,
           COALESCE(e.payload->>'mimeType','') AS mime_type,
           w.responsible_person_id, r.code AS recurring_rule_code
    FROM public.work_evidence e
    JOIN public.work_items w ON w.id=e.work_item_id
    LEFT JOIN public.recurring_rules r ON r.id=w.recurring_rule_id
    WHERE e.id=$1 AND e.work_item_id=$2 AND w.archived_at IS NULL
  `, [evidenceId, workItemId]);
  if (!result.rowCount) {
    const error = new Error("Drive work evidence not found.");
    error.statusCode = 404;
    throw error;
  }
  const evidence = result.rows[0];
  if (evidence.provider !== "google_drive") {
    const error = new Error("Only google_drive evidence is supported by this adapter.");
    error.code = "unsupported_evidence_provider";
    error.statusCode = 400;
    throw error;
  }
  if (evidence.recurring_rule_code !== "miwa-crossborder-1688-weekly-selection") {
    const error = new Error("This validator only accepts the 1688 weekly selection recurring rule.");
    error.code = "unsupported_work_rule";
    error.statusCode = 400;
    throw error;
  }
  const mimeType = evidence.mime_type || XLSX_MIME;
  if (mimeType !== XLSX_MIME && !String(evidence.file_name || "").toLowerCase().endsWith(".xlsx")) {
    const error = new Error("1688 weekly selection evidence must be an .xlsx spreadsheet.");
    error.code = "unsupported_evidence_file_type";
    error.statusCode = 400;
    throw error;
  }

  const { stream, exported } = await fetchDriveFileStream({ fileId: evidence.provider_file_id, mimeType });
  if (exported) {
    const error = new Error("Native Google Sheets are not accepted for the 1688 official export task. Submit the original .xlsx file.");
    error.code = "original_xlsx_required";
    error.statusCode = 400;
    throw error;
  }
  const buffer = await streamToBuffer(stream);
  let parsed;
  try {
    parsed = parseXlsxFirstSheet(buffer, { maxRows: 10001 });
  } catch (cause) {
    const error = new Error(`Unable to parse 1688 XLSX evidence: ${cause.message}`);
    error.code = "xlsx_parse_failed";
    error.statusCode = 422;
    throw error;
  }
  if (!parsed.rows.length) {
    const error = new Error("1688 XLSX contains no data rows.");
    error.code = "xlsx_no_data_rows";
    error.statusCode = 422;
    throw error;
  }

  const validation = await validate1688WeeklyEvidence({
    workItemId,
    evidenceId,
    extractedRows: parsed.rows,
    actorPersonId,
    sourceSystem
  });
  return {
    ...validation,
    spreadsheet: {
      sheetPath: parsed.sheetPath,
      parsedDataRows: parsed.rows.length,
      bytes: buffer.length
    }
  };
}
