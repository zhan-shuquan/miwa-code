/* MIWA Corporate Live Search | V1.9.30.1
 * Merges the stable AIONE registry with Drive-managed records discovered by the runtime sync.
 */
import {
  listMiwaCorporateRecords,
  searchMiwaCorporateRecordList,
  executeMiwaCorporateRetrievalAgainstRecords,
  resolveMiwaCorporateIntent
} from "./miwa-corporate-search.js";
import { syncMiwaManagedDriveFolders, listSyncedDriveCorporateRecords } from "./miwa-drive-registry-sync.js";

export async function listMiwaCorporateRecordsWithDriveSync(requestContext = {}) {
  const base = listMiwaCorporateRecords(requestContext);
  if (!requestContext?.personId) return base;
  try {
    await syncMiwaManagedDriveFolders();
  } catch (error) {
    console.warn("AIONE Drive registry auto-sync failed; continuing with last known registry", { message:error?.message || "unknown" });
  }
  const synced = await listSyncedDriveCorporateRecords(requestContext);
  const seen = new Set();
  return [...synced, ...base].filter((item) => {
    const key = item.id || `${item.kind}:${item.assetId || item.route || item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchMiwaCorporateRecordsWithDriveSync(query, options = {}) {
  const requestContext = options.requestContext || {};
  const records = await listMiwaCorporateRecordsWithDriveSync(requestContext);
  return searchMiwaCorporateRecordList(records, query, options);
}

export async function executeMiwaCorporateRetrievalWithDriveSync(objective, requestContext = {}) {
  const intent = resolveMiwaCorporateIntent(objective);
  if (!intent) return null;
  const records = await listMiwaCorporateRecordsWithDriveSync(requestContext);
  return executeMiwaCorporateRetrievalAgainstRecords(objective, requestContext, records);
}
