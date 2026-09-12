import pool, { withTransaction } from "../db.js";
import { listDriveFolderFiles } from "../src/integrations/google-drive-client.js";
import { resolveCurrentCuratedFolder } from "../src/services/product-curated-folder-contract.js";
import { confirmProductMaterial } from "../src/services/product-material-confirmation-service.js";

const PRODUCT_CODE = String(process.env.AIONE_PRODUCT_CODE || "").trim();
const MODE = String(process.env.AIONE_CURATED_RECONCILE_MODE || "plan").trim().toLowerCase();
const HUMAN_PERSON_ID = String(process.env.AIONE_HUMAN_PERSON_ID || "").trim();
const DRIVE_ID = String(process.env.AIONE_CURATED_DRIVE_ID || "").trim() || undefined;

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

function normalizeName(value) {
  return String(value || "").normalize("NFKC").trim().toLowerCase();
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

async function loadHistoricalSourceImages(productId) {
  const result = await pool.query(
    `SELECT id, asset_no, asset_role, original_name, canonical_name, mime_type, lifecycle_status, metadata
       FROM public.product_assets
      WHERE product_id=$1
        AND archived_at IS NULL
        AND metadata->>'layer'='SOURCE'
        AND mime_type LIKE 'image/%'
      ORDER BY asset_no`,
    [productId]
  );
  return result.rows.map((asset) => {
    const folder = resolveCurrentCuratedFolder(asset).folder;
    return { ...asset, currentFolder: folder || null };
  });
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
        normalizedName: normalizeName(file.name),
        mimeType: String(file.mimeType || ""),
        size: file.size == null ? null : String(file.size),
        modifiedTime: file.modifiedTime || null,
        folder: folder.name,
        folderId: folder.id
      }));
    groups.push({ folder: folder.name, folderId: folder.id, files });
  }
  return groups;
}

function candidateAssetsForDriveFile(file, assets) {
  const byDriveId = assets.filter((asset) => {
    const metadataDriveFileId = String(asset?.metadata?.driveFileId || asset?.metadata?.curatedDriveFileId || "").trim();
    return metadataDriveFileId && metadataDriveFileId === file.id;
  });
  if (byDriveId.length) return { method: "drive_file_id", candidates: byDriveId };

  const byFolderAndName = assets.filter((asset) =>
    asset.currentFolder === file.folder && normalizeName(asset.original_name) === file.normalizedName
  );
  return { method: "folder_original_name", candidates: byFolderAndName };
}

function buildPlan({ product, driveGroups, assets, confirmation }) {
  const driveFiles = driveGroups.flatMap((group) => group.files);
  const matches = [];
  const unmatched = [];
  const ambiguous = [];
  const claimedAssetIds = new Set();

  for (const file of driveFiles) {
    const { method, candidates } = candidateAssetsForDriveFile(file, assets);
    const available = candidates.filter((asset) => !claimedAssetIds.has(String(asset.id)));
    if (available.length === 1) {
      const asset = available[0];
      claimedAssetIds.add(String(asset.id));
      matches.push({
        driveFileId: file.id,
        driveName: file.name,
        folder: file.folder,
        matchMethod: method,
        assetId: String(asset.id),
        assetNo: Number(asset.asset_no),
        assetRole: asset.asset_role,
        originalName: asset.original_name,
        canonicalName: asset.canonical_name
      });
      continue;
    }
    if (available.length === 0) {
      unmatched.push({ driveFileId: file.id, driveName: file.name, folder: file.folder, candidateCount: candidates.length });
      continue;
    }
    ambiguous.push({
      driveFileId: file.id,
      driveName: file.name,
      folder: file.folder,
      candidateAssetIds: available.map((asset) => String(asset.id))
    });
  }

  const matchedAssetIds = matches.map((match) => match.assetId).sort();
  const historicalAssetIds = new Set(assets.map((asset) => String(asset.id)));
  const historicalNotCurrent = assets
    .filter((asset) => !claimedAssetIds.has(String(asset.id)))
    .map((asset) => ({
      assetId: String(asset.id),
      assetNo: Number(asset.asset_no),
      assetRole: asset.asset_role,
      originalName: asset.original_name,
      currentFolder: asset.currentFolder
    }));

  const confirmedAssetIds = asArray(confirmation?.asset_ids).map(String).sort();
  const currentSet = new Set(matchedAssetIds);
  const confirmedSet = new Set(confirmedAssetIds);
  const confirmedNotInDrive = confirmedAssetIds.filter((id) => historicalAssetIds.has(id) && !currentSet.has(id));
  const driveNotConfirmed = matchedAssetIds.filter((id) => !confirmedSet.has(id));
  const confirmationAligned = unmatched.length === 0 && ambiguous.length === 0 && confirmedAssetIds.length === matchedAssetIds.length && confirmedNotInDrive.length === 0 && driveNotConfirmed.length === 0;

  const folderCounts = Object.fromEntries(driveGroups.map((group) => [group.folder, group.files.length]));
  const blockers = [];
  if (!folderCounts["01_SKU图"]) blockers.push("current_drive_missing:01_SKU图");
  if (!folderCounts["02_产品图"]) blockers.push("current_drive_missing:02_产品图");
  if (unmatched.length) blockers.push(`drive_files_unmatched:${unmatched.length}`);
  if (ambiguous.length) blockers.push(`drive_files_ambiguous:${ambiguous.length}`);
  if (new Set(matchedAssetIds).size !== matchedAssetIds.length) blockers.push("asset_match_not_one_to_one");

  return {
    contract: "AIONE Current Curated Material Reconciliation V1",
    product: { id: product.id, productCode: product.product_code, name: product.name },
    driveCurrent: {
      totalImages: driveFiles.length,
      folderCounts,
      folderIds: Object.fromEntries(driveGroups.map((group) => [group.folder, group.folderId]))
    },
    historicalSourceImageCount: assets.length,
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
    matches,
    unmatched,
    ambiguous,
    historicalNotCurrent,
    confirmedNotInDrive,
    driveNotConfirmed,
    confirmationAligned,
    confirmationNeedsUpdate: !confirmationAligned,
    blockers,
    readyToConfirm: blockers.length === 0
  };
}

async function applyConfirmation({ product, plan, driveGroups }) {
  if (MODE !== "apply") return null;
  if (!HUMAN_PERSON_ID) fail("AIONE_HUMAN_PERSON_ID is required in apply mode.");
  if (!plan.readyToConfirm) fail("Cannot apply curated material confirmation while reconciliation has blockers.", { blockers: plan.blockers });

  const result = await withTransaction(async (client) => confirmProductMaterial(client, {
    productId: product.id,
    assetIds: plan.matchedCurrentAssetIds,
    metadata: {
      reconciliationContract: "current-curated-material-v1",
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
      historicalSourceImageCount: plan.historicalSourceImageCount,
      currentCuratedImageCount: plan.driveCurrent.totalImages
    },
    context: {
      personId: HUMAN_PERSON_ID,
      actorKind: "human",
      sourceSystem: "aione-curated-material-reconciliation-v1",
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
  const [assets, confirmation, driveGroups] = await Promise.all([
    loadHistoricalSourceImages(product.id),
    loadCurrentConfirmation(product.id),
    loadDriveCurrentFiles()
  ]);
  const plan = buildPlan({ product, driveGroups, assets, confirmation });
  const applied = await applyConfirmation({ product, plan, driveGroups });

  const output = { ...plan, mode: MODE, applied };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(`[AIONE_CURATED_MATERIAL] Product=${PRODUCT_CODE} | DriveCurrent=${plan.driveCurrent.totalImages} | HistoricalSOURCE=${plan.historicalSourceImageCount} | Matched=${plan.matchedCurrentAssetCount} | ConfirmationAligned=${plan.confirmationAligned}\n`);

  if (plan.blockers.length) {
    process.stdout.write(`[AIONE] CURATED MATERIAL RECONCILIATION BLOCKED - ${plan.blockers.join(",")}\n`);
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
