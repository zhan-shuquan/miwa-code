import pool, { withTransaction } from "../db.js";
import { listDriveFolderFiles } from "../src/integrations/google-drive-client.js";
import { confirmProductMaterial } from "../src/services/product-material-confirmation-service.js";
import { formalizeCuratedDriveImage, curatedDriveSourceProvider } from "../src/services/product-curated-drive-asset-service.js";

const PRODUCT_CODE = String(process.env.AIONE_PRODUCT_CODE || "").trim();
const MODE = String(process.env.AIONE_CURATED_RECONCILE_MODE || "plan").trim().toLowerCase();
const HUMAN_PERSON_ID = String(process.env.AIONE_HUMAN_PERSON_ID || "").trim();
const DRIVE_ID = String(process.env.AIONE_CURATED_DRIVE_ID || "").trim() || undefined;
const BUCKET = String(process.env.AIONE_PRODUCT_ASSET_BUCKET || "").trim();

const FOLDERS = [
  { name: "01_SKU图", id: String(process.env.AIONE_CURATED_FOLDER_SKU_ID || "").trim() },
  { name: "02_产品图", id: String(process.env.AIONE_CURATED_FOLDER_PRODUCT_ID || "").trim() },
  { name: "03_实拍图", id: String(process.env.AIONE_CURATED_FOLDER_REAL_ID || "").trim() }
];

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function loadProduct(productCode) {
  const result = await pool.query(
    `SELECT id, product_code, name, lifecycle_status
       FROM public.products
      WHERE product_code=$1 AND archived_at IS NULL
      LIMIT 2`,
    [productCode]
  );
  if (result.rowCount !== 1) fail("Curated material reconciliation requires exactly one Product.", { productCode, count: result.rowCount });
  return result.rows[0];
}

async function loadCurrentConfirmation(productId) {
  const result = await pool.query(
    `SELECT id, version, status, asset_ids, snapshot_hash, confirmed_at, confirmed_by_person_id
       FROM public.product_material_confirmations
      WHERE product_id=$1 AND status='confirmed' AND archived_at IS NULL
      ORDER BY version DESC, created_at DESC
      LIMIT 2`,
    [productId]
  );
  if (result.rowCount > 1) fail("More than one CURRENT material confirmation exists.", { productId, count: result.rowCount });
  return result.rows[0] || null;
}

async function loadDriveCurrentFiles() {
  for (const folder of FOLDERS) {
    if (!folder.id) fail(`Missing Google Drive folder id for ${folder.name}.`);
  }

  const groups = [];
  for (const folder of FOLDERS) {
    const entries = await listDriveFolderFiles({ folderId: folder.id, driveId: DRIVE_ID, pageSize: 1000 });
    const files = entries
      .filter((file) => String(file.mimeType || "").startsWith("image/"))
      .map((file) => ({
        id: String(file.id),
        name: String(file.name || ""),
        mimeType: String(file.mimeType || ""),
        size: file.size == null ? null : String(file.size),
        modifiedTime: file.modifiedTime || null,
        webViewLink: file.webViewLink || null,
        folder: folder.name,
        folderId: folder.id
      }));
    groups.push({ folder: folder.name, folderId: folder.id, files });
  }
  return groups;
}

async function loadCurrentCuratedAssets(productId) {
  const provider = curatedDriveSourceProvider();
  const result = await pool.query(
    `SELECT id, asset_no, asset_role, original_name, canonical_name, mime_type, lifecycle_status, metadata, source_ref
       FROM public.product_assets
      WHERE product_id=$1
        AND archived_at IS NULL
        AND source_provider=$2
        AND metadata->>'layer'='SOURCE'
        AND mime_type LIKE 'image/%'
      ORDER BY asset_no`,
    [productId, provider]
  );
  return result.rows;
}

function buildPlan({ product, driveGroups, curatedAssets, confirmation }) {
  const driveFiles = driveGroups.flatMap((group) => group.files);
  const byDriveId = new Map(curatedAssets.map((asset) => [String(asset.metadata?.driveFileId || asset.source_ref || ""), asset]));
  const matched = [];
  const missingRegistration = [];

  for (const file of driveFiles) {
    const asset = byDriveId.get(file.id);
    if (!asset) {
      missingRegistration.push({ driveFileId: file.id, driveName: file.name, folder: file.folder });
      continue;
    }
    matched.push({
      driveFileId: file.id,
      driveName: file.name,
      folder: file.folder,
      assetId: String(asset.id),
      assetNo: Number(asset.asset_no),
      assetRole: asset.asset_role,
      canonicalName: asset.canonical_name
    });
  }

  const driveIds = new Set(driveFiles.map((file) => file.id));
  const staleCuratedAssets = curatedAssets
    .filter((asset) => !driveIds.has(String(asset.metadata?.driveFileId || asset.source_ref || "")))
    .map((asset) => ({
      assetId: String(asset.id),
      assetNo: Number(asset.asset_no),
      originalName: asset.original_name,
      driveFileId: asset.metadata?.driveFileId || asset.source_ref || null
    }));

  const matchedAssetIds = matched.map((item) => item.assetId).sort();
  const confirmedAssetIds = asArray(confirmation?.asset_ids).map(String).sort();
  const currentSet = new Set(matchedAssetIds);
  const confirmedSet = new Set(confirmedAssetIds);
  const confirmedNotCurrent = confirmedAssetIds.filter((id) => !currentSet.has(id));
  const currentNotConfirmed = matchedAssetIds.filter((id) => !confirmedSet.has(id));

  const folderCounts = Object.fromEntries(driveGroups.map((group) => [group.folder, group.files.length]));
  const blockers = [];
  if (!folderCounts["01_SKU图"]) blockers.push("current_drive_missing:01_SKU图");
  if (!folderCounts["02_产品图"]) blockers.push("current_drive_missing:02_产品图");
  if (MODE === "plan" && missingRegistration.length) blockers.push(`current_drive_requires_registration:${missingRegistration.length}`);

  const confirmationAligned = missingRegistration.length === 0
    && confirmedAssetIds.length === matchedAssetIds.length
    && confirmedNotCurrent.length === 0
    && currentNotConfirmed.length === 0;

  return {
    contract: "AIONE Current Curated Material Reconciliation V2",
    product: { id: product.id, productCode: product.product_code, name: product.name },
    driveCurrent: {
      totalImages: driveFiles.length,
      folderCounts,
      folderIds: Object.fromEntries(driveGroups.map((group) => [group.folder, group.folderId]))
    },
    curatedAssetCount: curatedAssets.length,
    currentConfirmation: confirmation ? {
      id: confirmation.id,
      version: confirmation.version,
      confirmedAt: confirmation.confirmed_at,
      confirmedByPersonId: confirmation.confirmed_by_person_id,
      confirmedAssetCount: confirmedAssetIds.length,
      snapshotHash: confirmation.snapshot_hash
    } : null,
    matchedCurrentAssetCount: matchedAssetIds.length,
    matchedCurrentAssetIds: matchedAssetIds,
    matches: matched,
    missingRegistration,
    staleCuratedAssets,
    confirmedNotCurrent,
    currentNotConfirmed,
    confirmationAligned,
    confirmationNeedsUpdate: !confirmationAligned,
    blockers,
    readyToConfirm: blockers.length === 0 && missingRegistration.length === 0
  };
}

async function formalizeDriveCurrent({ product, driveGroups }) {
  if (MODE !== "apply") return [];
  if (!BUCKET) fail("AIONE_PRODUCT_ASSET_BUCKET is required in apply mode.");
  const results = [];
  for (const file of driveGroups.flatMap((group) => group.files)) {
    const result = await formalizeCuratedDriveImage({ product, file, bucketName: BUCKET });
    results.push({
      driveFileId: file.id,
      name: file.name,
      folder: file.folder,
      assetId: result.asset.id,
      assetNo: Number(result.asset.asset_no),
      reused: result.reused,
      uploadedReused: result.uploadedReused
    });
  }
  return results;
}

async function applyConfirmation({ product, plan, driveGroups }) {
  if (MODE !== "apply") return null;
  if (!HUMAN_PERSON_ID) fail("AIONE_HUMAN_PERSON_ID is required in apply mode.");
  if (!plan.readyToConfirm) fail("Cannot apply curated material confirmation while reconciliation has blockers.", { blockers: plan.blockers, missingRegistration: plan.missingRegistration.length });

  const result = await withTransaction(async (client) => confirmProductMaterial(client, {
    productId: product.id,
    assetIds: plan.matchedCurrentAssetIds,
    metadata: {
      reconciliationContract: "current-curated-material-v2",
      curatedDriveSnapshot: {
        folderIds: Object.fromEntries(driveGroups.map((group) => [group.folder, group.folderId])),
        files: driveGroups.flatMap((group) => group.files.map((file) => ({
          driveFileId: file.id,
          name: file.name,
          folder: file.folder,
          mimeType: file.mimeType,
          size: file.size,
          modifiedTime: file.modifiedTime
        })))
      },
      currentCuratedImageCount: plan.driveCurrent.totalImages
    },
    context: {
      personId: HUMAN_PERSON_ID,
      actorKind: "human",
      sourceSystem: "aione-curated-material-reconciliation-v2",
      correlationId: `curated-material:${product.product_code}`
    }
  }));

  return {
    confirmationId: result.confirmation.id,
    version: result.confirmation.version,
    snapshotHash: result.confirmation.snapshot_hash,
    reused: result.reused,
    confirmedAssetCount: asArray(result.confirmation.asset_ids).length
  };
}

async function main() {
  if (!PRODUCT_CODE) fail("AIONE_PRODUCT_CODE is required.");
  if (!new Set(["plan", "apply"]).has(MODE)) fail("AIONE_CURATED_RECONCILE_MODE must be plan or apply.");

  const product = await loadProduct(PRODUCT_CODE);
  const [confirmation, driveGroups] = await Promise.all([
    loadCurrentConfirmation(product.id),
    loadDriveCurrentFiles()
  ]);

  const initialAssets = await loadCurrentCuratedAssets(product.id);
  const initialPlan = buildPlan({ product, driveGroups, curatedAssets: initialAssets, confirmation });

  let formalized = [];
  if (MODE === "apply") {
    if (initialPlan.blockers.some((blocker) => blocker.startsWith("current_drive_missing:"))) {
      fail("Cannot apply curated material confirmation while required curated Drive folders are empty.", { blockers: initialPlan.blockers });
    }
    formalized = await formalizeDriveCurrent({ product, driveGroups });
  }

  const finalAssets = MODE === "apply" ? await loadCurrentCuratedAssets(product.id) : initialAssets;
  const finalPlan = buildPlan({ product, driveGroups, curatedAssets: finalAssets, confirmation });
  const applied = await applyConfirmation({ product, plan: finalPlan, driveGroups });

  const output = { ...finalPlan, mode: MODE, formalized, applied };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(`[AIONE_CURATED_MATERIAL] Product=${PRODUCT_CODE} | DriveCurrent=${finalPlan.driveCurrent.totalImages} | CuratedSOURCE=${finalPlan.curatedAssetCount} | Matched=${finalPlan.matchedCurrentAssetCount} | ConfirmationAligned=${finalPlan.confirmationAligned}\n`);

  if (finalPlan.blockers.length) {
    process.stdout.write(`[AIONE] CURATED MATERIAL RECONCILIATION BLOCKED - ${finalPlan.blockers.join(",")}\n`);
    process.exitCode = 2;
    return;
  }
  if (MODE === "plan") {
    process.stdout.write("[AIONE] CURATED MATERIAL RECONCILIATION PLAN PASS - READY TO CONFIRM\n");
    return;
  }
  process.stdout.write("[AIONE] CURATED MATERIAL RECONCILIATION APPLY PASS - CURRENT CONFIRMATION UPDATED\n");
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.code || "curated_material_reconciliation_failed", message: error.message, details: error.details || undefined }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
