import pool, { withTransaction } from "../db.js";
import { confirmProductMaterial } from "../src/services/product-material-confirmation-service.js";
import { CURRENT_CURATED_FOLDERS, resolveCurrentCuratedFolder } from "../src/services/product-curated-folder-contract.js";

const TRANSITIONAL_ADMIN_EMAIL = "info@miwa-happyhouse.com";

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function loadProduct(productCode) {
  const result = await pool.query(
    `SELECT id, product_code, name, lifecycle_status
       FROM public.products
      WHERE product_code=$1 AND archived_at IS NULL
      LIMIT 2`,
    [productCode]
  );
  if (result.rowCount !== 1) {
    fail("Expected exactly one Product for material confirmation.", {
      productCode,
      count: result.rowCount
    });
  }
  return result.rows[0];
}

async function loadSkus(productId) {
  const result = await pool.query(
    `SELECT id, sku_code, sku_no, name, lifecycle_status
       FROM public.product_skus
      WHERE product_id=$1 AND archived_at IS NULL AND lifecycle_status <> 'retired'
      ORDER BY sku_no`,
    [productId]
  );
  if (!result.rowCount) fail("No active MIWA sales SKU exists for Product.", { productId });
  return result.rows;
}

async function loadCuratedSourceAssets(productId) {
  const result = await pool.query(
    `SELECT id, asset_no, asset_type, asset_role, original_name, canonical_name,
            mime_type, lifecycle_status, metadata
       FROM public.product_assets
      WHERE product_id=$1
        AND archived_at IS NULL
        AND metadata->>'layer'='SOURCE'
      ORDER BY asset_no`,
    [productId]
  );

  const allSource = result.rows;
  const resolved = allSource.map((asset) => ({ asset, resolution: resolveCurrentCuratedFolder(asset) }));
  const imageCurated = resolved
    .filter(({ asset, resolution }) => resolution.folder && String(asset.mime_type || "").startsWith("image/"))
    .map(({ asset, resolution }) => ({ ...asset, resolvedFolder: resolution.folder, folderResolutionSource: resolution.source, legacyCompatibility: resolution.legacyCompatibility }));

  const folderCounts = imageCurated.reduce((acc, asset) => {
    acc[asset.resolvedFolder] = (acc[asset.resolvedFolder] || 0) + 1;
    return acc;
  }, {});

  if (!imageCurated.length) {
    fail("No SOURCE images can be mapped to the CURRENT three-folder contract.", {
      productId,
      allSourceCount: allSource.length,
      sourceSamples: resolved.slice(0, 30).map(({ asset, resolution }) => ({
        id: asset.id,
        originalName: asset.original_name,
        role: asset.asset_role,
        explicitSourceFolder: asset?.metadata?.sourceFolder || asset?.metadata?.source_folder || null,
        resolvedFolder: resolution.folder,
        resolutionSource: resolution.source
      }))
    });
  }
  if (!folderCounts["01_SKU图"]) fail("01_SKU图 SOURCE images are missing from CURRENT ProductAsset intake.", { folderCounts });
  if (!folderCounts["02_产品图"]) fail("02_产品图 SOURCE images are missing from CURRENT ProductAsset intake.", { folderCounts });

  return {
    assets: imageCurated,
    folderCounts,
    allSourceCount: allSource.length,
    legacyCompatibilityCount: imageCurated.filter((asset) => asset.legacyCompatibility).length
  };
}

async function resolveHumanActor(email) {
  if (!email || !email.includes("@")) fail("AIONE_MATERIAL_HUMAN_EMAIL is required for confirm mode.");
  if (email === TRANSITIONAL_ADMIN_EMAIL) {
    fail("The transitional Cloud control identity cannot be used as Product material human-confirmation evidence.");
  }
  const result = await pool.query(
    `SELECT DISTINCT p.id, p.display_name, p.primary_email
       FROM public.people p
       JOIN public.external_identities e ON e.person_id=p.id
      WHERE p.status='active' AND p.archived_at IS NULL
        AND e.status='active' AND LOWER(e.provider)='google'
        AND LOWER(COALESCE(p.primary_email,e.email_snapshot,''))=$1`,
    [email]
  );
  if (result.rowCount !== 1) {
    fail("Material confirmation email must resolve to exactly one active canonical Google human identity.", {
      candidateCount: result.rowCount
    });
  }
  return result.rows[0];
}

async function main() {
  const mode = String(process.env.AIONE_MATERIAL_MODE || "inspect").trim().toLowerCase();
  const productCode = String(process.env.AIONE_MATERIAL_PRODUCT_CODE || "").trim();
  if (!productCode) fail("AIONE_MATERIAL_PRODUCT_CODE is required.");
  if (!new Set(["inspect", "confirm"]).has(mode)) fail("AIONE_MATERIAL_MODE must be inspect or confirm.");

  const product = await loadProduct(productCode);
  const skus = await loadSkus(product.id);
  const material = await loadCuratedSourceAssets(product.id);
  const assetIds = material.assets.map((asset) => asset.id);
  const summary = {
    contract: "AIONE Product Material Human Gate V1",
    ok: true,
    mode,
    productId: product.id,
    productCode: product.product_code,
    productName: product.name || null,
    skuCodes: skus.map((sku) => sku.sku_code),
    curatedFolderContract: CURRENT_CURATED_FOLDERS,
    folderCounts: material.folderCounts,
    curatedAssetCount: material.assets.length,
    allSourceAssetCount: material.allSourceCount,
    legacyCompatibilityCount: material.legacyCompatibilityCount,
    assets: material.assets.map((asset) => ({
      id: asset.id,
      assetNo: asset.asset_no,
      folder: asset.resolvedFolder,
      folderResolutionSource: asset.folderResolutionSource,
      role: asset.asset_role,
      originalName: asset.original_name,
      canonicalName: asset.canonical_name
    }))
  };

  if (mode === "inspect") {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    process.stdout.write("[AIONE] PRODUCT MATERIAL INSPECTION PASS - HUMAN CONFIRMATION REQUIRED\n");
    return;
  }

  const email = normalizeEmail(process.env.AIONE_MATERIAL_HUMAN_EMAIL);
  const human = await resolveHumanActor(email);
  const result = await withTransaction((client) => confirmProductMaterial(client, {
    productId: product.id,
    assetIds,
    metadata: {
      confirmationChannel: "Cloud Shell interactive human gate",
      productCode: product.product_code,
      curatedFolderContract: CURRENT_CURATED_FOLDERS,
      legacyCompatibilityCount: material.legacyCompatibilityCount
    },
    context: {
      personId: human.id,
      actorKind: "human",
      sourceSystem: "aione-product-material-human-confirmation-v1",
      correlationId: `material-confirm:${product.product_code}`
    }
  }));

  process.stdout.write(`${JSON.stringify({
    ...summary,
    humanDisplayName: human.display_name || null,
    confirmedByPersonId: human.id,
    confirmationId: result.confirmation.id,
    confirmationVersion: result.confirmation.version,
    confirmationStatus: result.confirmation.status,
    snapshotHash: result.confirmation.snapshot_hash,
    reused: result.reused
  }, null, 2)}\n`);
  process.stdout.write("[AIONE] PRODUCT MATERIAL HUMAN CONFIRMATION PASS\n");
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.code || "product_material_confirmation_failed",
    message: error.message,
    details: error.details || undefined
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
