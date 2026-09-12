export const CURRENT_CURATED_FOLDERS = Object.freeze([
  "01_SKU图",
  "02_产品图",
  "03_实拍图"
]);

const ALLOWED_FOLDERS = new Set(CURRENT_CURATED_FOLDERS);
const LEGACY_ROLE_FOLDER_MAP = new Map([
  ["source_sku_image", "01_SKU图"],
  ["source_main_image", "02_产品图"],
  ["source_detail_image", "02_产品图"],
  ["source_real_photo", "03_实拍图"]
]);

export function explicitCuratedFolder(asset) {
  return String(asset?.metadata?.sourceFolder || asset?.metadata?.source_folder || "").trim();
}

export function resolveCurrentCuratedFolder(asset) {
  const explicit = explicitCuratedFolder(asset);
  if (ALLOWED_FOLDERS.has(explicit)) {
    return {
      folder: explicit,
      source: "explicit-current-folder",
      legacyCompatibility: false
    };
  }

  const role = String(asset?.asset_role || "").trim();
  const legacyFolder = LEGACY_ROLE_FOLDER_MAP.get(role) || null;
  if (legacyFolder) {
    return {
      folder: legacyFolder,
      source: "legacy-source-role-compatibility",
      legacyCompatibility: true
    };
  }

  return {
    folder: null,
    source: explicit ? "invalid-explicit-folder" : "unclassified",
    legacyCompatibility: false
  };
}

export function isCurrentCuratedFolder(value) {
  return ALLOWED_FOLDERS.has(String(value || "").trim());
}
