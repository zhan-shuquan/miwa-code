/* Pure filename classifier for MIWA Drive registry sync | V1.9.30.1 */
import crypto from "node:crypto";

function normalize(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[\s\u3000]+/g, "");
}

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

function extractDate(fileName = "") {
  const match = String(fileName).match(/(20\d{2})[-_.年](\d{1,2})[-_.月](\d{1,2})/);
  if (!match) return "";
  return `${match[1]}-${String(match[2]).padStart(2,"0")}-${String(match[3]).padStart(2,"0")}`;
}

function extractVersion(fileName = "") {
  const match = String(fileName).match(/\bV(\d+(?:\.\d+)+)\b/i);
  return match ? `V${match[1]}` : "";
}

function stableAssetId(canonicalKey, fileId) {
  const digest = crypto.createHash("sha256").update(String(fileId)).digest("hex").slice(0, 12);
  return `drive-${canonicalKey}-${digest}`;
}

function driveViewUrl(fileId) {
  return `https://drive.google.com/open?id=${encodeURIComponent(fileId)}`;
}

export function classifyManagedDriveFile(file, folder) {
  const fileName = String(file?.name || "").trim();
  const normalized = normalize(fileName);
  if (!file?.id || !fileName || !folder?.folderId) return null;

  const isManagementArchitecture = normalized.includes("美和集团ai经营总架构") || normalized.includes("美和集团经营架构");
  if (!isManagementArchitecture) return null;

  const isSummary = normalized.includes("阶段性总结") || normalized.includes("总结");
  const isStrategic = normalized.includes("战略版") || normalized.includes("战略");
  const type = assetType(file.mimeType, fileName);
  const date = extractDate(fileName);
  const explicitVersion = extractVersion(fileName);
  const canonicalKey = isSummary ? "management-architecture-summary" : isStrategic ? "management-architecture-strategy" : "management-architecture-file";
  const title = isSummary ? "美和集团AI经营总架构｜阶段性总结" : isStrategic ? "美和集团AI经营总架构" : "美和集团AI经营总架构｜相关资料";
  const version = explicitVersion || (isStrategic && date ? `战略版｜${date}` : isSummary && date ? `阶段性总结｜${date}` : date || "版本待确认");
  const recordStatus = isStrategic ? "已同步｜战略版｜正式版本号待确认" : isSummary ? "已同步｜阶段性说明" : "已同步｜版本待确认";
  const aliases = [
    "美和集团AI经营总架构", "AI经营总架构", "经营总架构", "经营架构", "美和集团经营架构",
    isStrategic ? "战略版" : "", isSummary ? "阶段性总结" : "", type === "IMAGE" ? "经营总架构图片" : "", fileName
  ].filter(Boolean);

  const assetId = stableAssetId(canonicalKey, file.id);
  return Object.freeze({
    id:`asset:${assetId}`,
    assetId,
    canonicalKey,
    kind:"asset",
    title,
    summary:isStrategic
      ? "美和集团AI经营总架构战略版原件；由Google Drive指定经营架构目录自动同步到AIONE正式资料索引。"
      : "美和集团AI经营总架构阶段性文字说明；用于说明稳定骨架、共享三层结构、人/AI责任与经营闭环。",
    type,
    mimeType:file.mimeType || "application/octet-stream",
    version,
    recordStatus,
    visibility:"internal",
    current:true,
    route:folder.route,
    sourceLabel:folder.sourceLabel,
    sourceName:fileName,
    sourceUrl:file.webViewLink || driveViewUrl(file.id),
    downloadPath:`/api/v1/drive-assets/synced/${encodeURIComponent(assetId)}/download`,
    downloadable:true,
    aliases,
    driveFileId:file.id,
    driveFolderId:folder.folderId,
    driveModifiedTime:file.modifiedTime || null,
    driveCreatedTime:file.createdTime || null,
    syncedAt:new Date().toISOString()
  });
}
