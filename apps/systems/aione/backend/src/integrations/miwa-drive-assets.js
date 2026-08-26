/*
 * MIWA Google Drive Asset Registry | Backend V1.9.26
 *
 * Security rule:
 * - Browser sends only the stable AIONE asset id.
 * - Backend owns the Google Drive file id mapping.
 * - Production download uses the Cloud Run runtime service account via ADC.
 * - The runtime service account must be a member of the MIWA shared drive.
 */

const SHARED_DRIVE_ID = "0AIPSFkmR2vB_Uk9PVA";
const SHARED_DRIVE_NAME = "美和集团（全球）";
const CORE_ASSET_FOLDER_ID = "19na53zaVPoZSQcKYLDaVxkfbIxiX51Ty";

const ROWS = Object.freeze({
  "army-architecture": ["1sRwEREfX3EZJFxUUMVyd51soLrfWebwa", "00_美和集团现代企业军团总架构_V0.1.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  "army-overview": ["1qMz_tnXQCEWmcOXYxCYNFRLhw3akTePw", "01_美和集团现代企业军团总纲_V0.1.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  "army-staffing": ["17F5AlhA38QJxCc-rloI8u-bAdqEEIUqa", "02_美和集团现代企业军团编制总表_V0.1.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  "command-map": ["1uS9H84s5p4Ftz2VF75Dm5ewV8qR57WIs", "03_美和集团现代企业军团作战指挥关系图_V0.1.pdf", "application/pdf"],
  "supplies-strategy": ["1zW5IxyejoD7OQdjxPmByG8fr17vHgb5r", "04_美和集团军需与战略粮草体系_V0.1.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  "battle-loop": ["119SN7ppUszT_MEI-zjKx8i1_QcGD_vOY", "05_美和集团现代企业军团标准作战流程与经营闭环_V0.1.pdf", "application/pdf"],
  "ai-talent-army": ["1_uGM-2AXzJciSO9BnojGmEDalmuKj-bM", "06_美和集团AI人才军团体系_V0.1.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  "intel-decision": ["1ZVlRrlIPuPYpJE3N5fhaD3UMlEKdeUIE", "07_美和集团情报与决策体系_V0.1.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  "market-battle": ["1ziDO0amOuy6J1dEnGEdBb8x4wh39IgLA", "08_美和集团宣传与市场作战体系_V0.1.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  "digital-logistics": ["1n5XkW9SayIuDO0q1dU0zoqj9SN1_X8kS", "09_美和集团数字后勤与基础设施体系_V0.1.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
});

export const MIWA_DRIVE_RUNTIME = Object.freeze({
  sharedDriveId: SHARED_DRIVE_ID,
  sharedDriveName: SHARED_DRIVE_NAME,
  coreAssetFolderId: CORE_ASSET_FOLDER_ID
});

export const MIWA_DRIVE_ASSETS = Object.freeze(Object.fromEntries(
  Object.entries(ROWS).map(([assetId, [fileId, fileName, mimeType]]) => [assetId, Object.freeze({
    assetId,
    fileId,
    fileName,
    mimeType,
    folderId: CORE_ASSET_FOLDER_ID,
    sharedDriveId: SHARED_DRIVE_ID,
    visibility: "internal",
    downloadable: true,
    current: true,
    boundAt: "2026-08-26"
  })])
));

export function getMiwaDriveAsset(assetId) {
  return MIWA_DRIVE_ASSETS[String(assetId || "").trim()] || null;
}

export function listMiwaDriveAssets() {
  return Object.values(MIWA_DRIVE_ASSETS);
}
