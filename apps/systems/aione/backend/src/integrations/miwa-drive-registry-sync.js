/*
 * MIWA Drive -> AIONE Corporate Registry Sync | V1.9.30.1
 *
 * First production scope:
 * - Watches the official 美和之家 -> 03_经营与战略 -> 经营架构 Drive folder.
 * - Discovers newly uploaded/generated files through the Cloud Run runtime service account.
 * - Persists file identity and retrieval metadata in knowledge_routes.
 * - Keeps Google Drive as the file source of truth while AIONE owns the searchable registry.
 */
import pool from "../../db.js";
import { listDriveFolderFiles } from "./google-drive-client.js";
import { MIWA_DRIVE_RUNTIME } from "./miwa-drive-assets.js";
import { classifyManagedDriveFile } from "./miwa-drive-file-classifier.js";

const SYNC_SOURCE = "google-drive-sync";
const REGISTRY_SCHEMA = "miwa-drive-sync-v1";
const DEFAULT_TTL_MS = 5 * 60 * 1000;
let lastSyncAt = 0;
let lastSyncSummary = null;
let inFlightSync = null;

export const MANAGED_DRIVE_FOLDERS = Object.freeze([
  Object.freeze({
    key:"managementArchitecture",
    folderId:"1IqqUAdkQL8-xfZz_chY4eT2wBqw37J8h",
    folderName:"经营架构",
    route:"company-management-architecture",
    sourceLabel:"美和之家 → 经营与战略 → 经营架构"
  })
]);

function assetType(mimeType = "", fileName = "") {
  const mime = String(mimeType || "").toLowerCase();
  const name = String(fileName || "").toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(name)) return "IMAGE";
  if (mime.includes("presentation") || /\.(pptx?|odp)$/i.test(name)) return "PPTX";
  if (mime.includes("wordprocessing") || /\.(docx?|odt|rtf)$/i.test(name)) return "DOCX";
  if (mime.includes("spreadsheet") || /\.(xlsx?|csv|ods)$/i.test(name)) return "XLSX";
  if (mime.includes("pdf") || /\.pdf$/i.test(name)) return "PDF";
  return "FILE";
}

function driveViewUrl(fileId) {
  return `https://drive.google.com/open?id=${encodeURIComponent(fileId)}`;
}

async function upsertRecord(record) {
  const routeId = `knr_${record.assetId}`;
  const metadata = {
    registrySchema:REGISTRY_SCHEMA,
    assetId:record.assetId,
    canonicalKey:record.canonicalKey,
    title:record.title,
    summary:record.summary,
    type:record.type,
    mimeType:record.mimeType,
    version:record.version,
    recordStatus:record.recordStatus,
    visibility:record.visibility,
    current:record.current,
    route:record.route,
    sourceLabel:record.sourceLabel,
    sourceName:record.sourceName,
    sourceUrl:record.sourceUrl,
    downloadPath:record.downloadPath,
    downloadable:record.downloadable,
    aliases:record.aliases,
    driveFileId:record.driveFileId,
    driveFolderId:record.driveFolderId,
    driveModifiedTime:record.driveModifiedTime,
    driveCreatedTime:record.driveCreatedTime,
    syncedAt:record.syncedAt
  };
  await pool.query(
    `INSERT INTO public.knowledge_routes
      (id,object_type,object_id,field_code,route_kind,knowledge_id,anchor_id,status,metadata,source_system,updated_at)
     VALUES ($1,'corporate_asset',$2,'drive_file_id','knowledge',$3,$4,'active',$5::jsonb,$6,NOW())
     ON CONFLICT (id) DO UPDATE SET
       object_type=EXCLUDED.object_type,
       object_id=EXCLUDED.object_id,
       field_code=EXCLUDED.field_code,
       route_kind=EXCLUDED.route_kind,
       knowledge_id=EXCLUDED.knowledge_id,
       anchor_id=EXCLUDED.anchor_id,
       status='active',
       metadata=EXCLUDED.metadata,
       source_system=EXCLUDED.source_system,
       updated_at=NOW()`,
    [routeId, record.canonicalKey, `drive-file:${record.driveFileId}`, record.route, JSON.stringify(metadata), SYNC_SOURCE]
  );
}

export async function syncMiwaManagedDriveFolders({ force = false } = {}) {
  const ttlMs = Math.max(30_000, Number(process.env.AIONE_DRIVE_REGISTRY_SYNC_TTL_MS || DEFAULT_TTL_MS));
  const now = Date.now();
  if (!force && lastSyncSummary && now - lastSyncAt < ttlMs) return lastSyncSummary;
  if (inFlightSync) return inFlightSync;

  inFlightSync = (async () => {
    const summary = { ok:true, scannedFolders:0, scannedFiles:0, matchedFiles:0, syncedRecords:0, errors:[], syncedAt:new Date().toISOString() };
    for (const folder of MANAGED_DRIVE_FOLDERS) {
      try {
        const files = await listDriveFolderFiles({ folderId:folder.folderId, driveId:MIWA_DRIVE_RUNTIME.sharedDriveId });
        summary.scannedFolders += 1;
        summary.scannedFiles += files.length;
        for (const file of files) {
          const record = classifyManagedDriveFile(file, folder);
          if (!record) continue;
          summary.matchedFiles += 1;
          await upsertRecord(record);
          summary.syncedRecords += 1;
        }
      } catch (error) {
        summary.ok = false;
        summary.errors.push({ folderKey:folder.key, message:String(error?.message || error) });
      }
    }
    lastSyncAt = Date.now();
    lastSyncSummary = Object.freeze(summary);
    return lastSyncSummary;
  })();

  try { return await inFlightSync; }
  finally { inFlightSync = null; }
}

export async function listSyncedDriveCorporateRecords(requestContext = {}) {
  if (!requestContext?.personId) return [];
  try {
    const result = await pool.query(
      `SELECT metadata
         FROM public.knowledge_routes
        WHERE status='active'
          AND source_system=$1
          AND route_kind='knowledge'
          AND object_type='corporate_asset'
        ORDER BY updated_at DESC`,
      [SYNC_SOURCE]
    );
    return result.rows.map((row) => row.metadata || {}).filter((meta) => meta.assetId && meta.driveFileId).map((meta) => Object.freeze({
      id:`asset:${meta.assetId}`,
      assetId:meta.assetId,
      canonicalKey:meta.canonicalKey || null,
      kind:"asset",
      title:meta.title || meta.sourceName || "Google Drive资料",
      summary:meta.summary || "Google Drive指定目录自动同步资料。",
      type:meta.type || assetType(meta.mimeType, meta.sourceName),
      mimeType:meta.mimeType || "application/octet-stream",
      version:meta.version || "版本待确认",
      recordStatus:meta.recordStatus || "已同步",
      visibility:meta.visibility || "internal",
      current:meta.current !== false,
      route:meta.route || "company-management-architecture",
      sourceLabel:meta.sourceLabel || "美和之家 → Google Drive",
      sourceName:meta.sourceName || "",
      sourceUrl:meta.sourceUrl || driveViewUrl(meta.driveFileId),
      downloadPath:meta.downloadPath || `/api/v1/drive-assets/synced/${encodeURIComponent(meta.assetId)}/download`,
      downloadable:meta.downloadable !== false,
      aliases:Array.isArray(meta.aliases) ? meta.aliases : [],
      modifiedTime:meta.driveModifiedTime || null
    }));
  } catch (error) {
    console.warn("AIONE Drive registry read failed", { message:error?.message || "unknown" });
    return [];
  }
}

export async function getSyncedDriveAsset(assetId) {
  const result = await pool.query(
    `SELECT metadata
       FROM public.knowledge_routes
      WHERE status='active'
        AND source_system=$1
        AND route_kind='knowledge'
        AND object_type='corporate_asset'
        AND metadata->>'assetId'=$2
      ORDER BY updated_at DESC
      LIMIT 1`,
    [SYNC_SOURCE, String(assetId || "")]
  );
  const meta = result.rows[0]?.metadata;
  if (!meta?.driveFileId) return null;
  return {
    assetId:meta.assetId,
    fileId:meta.driveFileId,
    fileName:meta.sourceName || "download",
    mimeType:meta.mimeType || "application/octet-stream",
    visibility:meta.visibility || "internal",
    downloadable:meta.downloadable !== false,
    current:meta.current !== false,
    boundAt:meta.syncedAt || null,
    folderId:meta.driveFolderId || null,
    sharedDriveId:MIWA_DRIVE_RUNTIME.sharedDriveId
  };
}

export function getDriveRegistrySyncStatus() {
  return { lastSyncAt:lastSyncAt ? new Date(lastSyncAt).toISOString() : null, lastSyncSummary };
}
