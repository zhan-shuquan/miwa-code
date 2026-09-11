import { createHash, randomUUID } from "node:crypto";
import { recordBusinessEvent } from "./event-service.js";

function makeId() {
  return `pmc_${randomUUID()}`;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(stableJson(value), "utf8").digest("hex");
}

async function loadProduct(client, productId) {
  const result = await client.query(
    `SELECT id, product_code, name, lifecycle_status
       FROM public.products
      WHERE id=$1 AND archived_at IS NULL
      LIMIT 1`,
    [productId]
  );
  if (!result.rowCount) throw Object.assign(new Error("Product not found."), { statusCode: 404, code: "product_not_found" });
  return result.rows[0];
}

async function loadActiveSkus(client, productId) {
  const result = await client.query(
    `SELECT id, sku_code, sku_no, name, lifecycle_status, sku_data, metadata
       FROM public.product_skus
      WHERE product_id=$1 AND archived_at IS NULL AND lifecycle_status <> 'retired'
      ORDER BY sku_no`,
    [productId]
  );
  return result.rows;
}

async function loadSourceAssets(client, productId, assetIds) {
  const ids = [...new Set((Array.isArray(assetIds) ? assetIds : []).map((value) => String(value || "").trim()).filter(Boolean))];
  if (!ids.length) throw Object.assign(new Error("At least one curated SOURCE ProductAsset is required."), { statusCode: 400, code: "material_asset_ids_required" });
  const result = await client.query(
    `SELECT id, product_id, asset_type, asset_role, lifecycle_status, metadata, original_name, mime_type
       FROM public.product_assets
      WHERE product_id=$1 AND id = ANY($2::text[]) AND archived_at IS NULL
      ORDER BY asset_no`,
    [productId, ids]
  );
  if (result.rowCount !== ids.length) throw Object.assign(new Error("One or more material assets are missing or do not belong to this Product."), { statusCode: 409, code: "material_asset_mismatch" });
  for (const asset of result.rows) {
    if (asset?.metadata?.layer !== "SOURCE") throw Object.assign(new Error("Material confirmation accepts SOURCE ProductAssets only."), { statusCode: 409, code: "material_source_asset_required" });
  }
  return result.rows;
}

function folderOf(asset) {
  return String(asset?.metadata?.sourceFolder || asset?.metadata?.source_folder || "").trim();
}

function validateCuratedFolders(assets) {
  const allowed = new Set(["01_SKU图", "02_产品图", "03_实拍图"]);
  const folders = new Map();
  for (const asset of assets) {
    const folder = folderOf(asset);
    if (!allowed.has(folder)) {
      throw Object.assign(new Error(`SOURCE asset ${asset.id} is not registered under the CURRENT curated Drive contract.`), {
        statusCode: 409,
        code: "material_source_folder_invalid",
        details: { assetId: asset.id, sourceFolder: folder }
      });
    }
    folders.set(folder, (folders.get(folder) || 0) + 1);
  }
  if (!folders.get("01_SKU图")) throw Object.assign(new Error("01_SKU图 is required before material confirmation."), { statusCode: 409, code: "material_sku_images_required" });
  if (!folders.get("02_产品图")) throw Object.assign(new Error("02_产品图 is required before material confirmation."), { statusCode: 409, code: "material_product_images_required" });
  return Object.fromEntries(folders);
}

export async function getCurrentMaterialConfirmation(client, productId) {
  await loadProduct(client, productId);
  const result = await client.query(
    `SELECT *
       FROM public.product_material_confirmations
      WHERE product_id=$1 AND archived_at IS NULL
      ORDER BY version DESC, created_at DESC
      LIMIT 1`,
    [productId]
  );
  return result.rows[0] || null;
}

export async function confirmProductMaterial(client, {
  productId,
  assetIds,
  metadata = {},
  context = {}
}) {
  if (!context.personId) throw Object.assign(new Error("A human person identity is required to confirm Product SKU and material truth."), { statusCode: 403, code: "human_material_confirmation_required" });
  const product = await loadProduct(client, productId);
  const skus = await loadActiveSkus(client, productId);
  if (!skus.length) throw Object.assign(new Error("At least one active MIWA sales SKU is required before material confirmation."), { statusCode: 409, code: "material_sales_sku_required" });
  const assets = await loadSourceAssets(client, productId, assetIds);
  const folderCounts = validateCuratedFolders(assets);
  const skuSnapshot = skus.map((sku) => ({
    id: sku.id,
    skuCode: sku.sku_code,
    skuNo: sku.sku_no,
    name: sku.name,
    lifecycleStatus: sku.lifecycle_status,
    skuData: sku.sku_data || {},
    metadata: sku.metadata || {}
  }));
  const normalizedAssetIds = assets.map((asset) => asset.id).sort();
  const snapshotHash = sha256({ productId, skuSnapshot, assetIds: normalizedAssetIds });

  const current = await client.query(
    `SELECT * FROM public.product_material_confirmations
      WHERE product_id=$1 AND archived_at IS NULL
      ORDER BY version DESC LIMIT 1 FOR UPDATE`,
    [productId]
  );
  const latest = current.rows[0] || null;
  if (latest?.status === "confirmed" && latest.snapshot_hash === snapshotHash) {
    return { confirmation: latest, product, assets, skus, reused: true };
  }
  if (latest?.status === "confirmed") {
    await client.query(
      `UPDATE public.product_material_confirmations
          SET status='invalidated', invalidated_at=NOW(), invalidated_reason='superseded_by_new_confirmation',
              updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1
        WHERE id=$1`,
      [latest.id, context.personId]
    );
  }

  const version = Number(latest?.version || 0) + 1;
  const id = makeId();
  const result = await client.query(
    `INSERT INTO public.product_material_confirmations
      (id, product_id, version, status, sku_snapshot, asset_ids, snapshot_hash,
       confirmed_by_person_id, confirmed_at, metadata, created_by_person_id,
       updated_by_person_id, source_system)
     VALUES ($1,$2,$3,'confirmed',$4::jsonb,$5::jsonb,$6,$7,NOW(),$8::jsonb,$7,$7,$9)
     RETURNING *`,
    [id, productId, version, JSON.stringify(skuSnapshot), JSON.stringify(normalizedAssetIds), snapshotHash,
      context.personId, JSON.stringify({ ...metadata, folderCounts }), context.sourceSystem || "aione"]
  );

  await recordBusinessEvent(client, {
    eventType: "product.material_confirmed",
    objectType: "product",
    objectId: productId,
    context,
    payload: {
      confirmationId: id,
      version,
      snapshotHash,
      assetIds: normalizedAssetIds,
      skuCodes: skus.map((sku) => sku.sku_code),
      folderCounts
    }
  });
  return { confirmation: result.rows[0], product, assets, skus, reused: false };
}

export async function invalidateProductMaterialConfirmation(client, {
  productId,
  reason,
  context = {}
}) {
  if (!context.personId) throw Object.assign(new Error("A human person identity is required to invalidate Product material confirmation."), { statusCode: 403, code: "human_material_confirmation_required" });
  const current = await client.query(
    `SELECT * FROM public.product_material_confirmations
      WHERE product_id=$1 AND status='confirmed' AND archived_at IS NULL
      LIMIT 1 FOR UPDATE`,
    [productId]
  );
  if (!current.rowCount) return { confirmation: null, reused: true };
  const normalizedReason = String(reason || "product_truth_changed").trim().slice(0, 1000) || "product_truth_changed";
  const result = await client.query(
    `UPDATE public.product_material_confirmations
        SET status='invalidated', invalidated_at=NOW(), invalidated_reason=$2,
            updated_by_person_id=$3, updated_at=NOW(), record_version=record_version+1
      WHERE id=$1 RETURNING *`,
    [current.rows[0].id, normalizedReason, context.personId]
  );
  await recordBusinessEvent(client, {
    eventType: "product.material_confirmation_invalidated",
    objectType: "product",
    objectId: productId,
    context,
    payload: { confirmationId: result.rows[0].id, reason: normalizedReason }
  });
  return { confirmation: result.rows[0], reused: false };
}

export async function requireConfirmedProductMaterial(client, productId, requestedAssetIds = []) {
  const result = await client.query(
    `SELECT * FROM public.product_material_confirmations
      WHERE product_id=$1 AND status='confirmed' AND archived_at IS NULL
      LIMIT 1`,
    [productId]
  );
  if (!result.rowCount) throw Object.assign(new Error("Human-confirmed Product SKU and material snapshot is required before AI design."), { statusCode: 409, code: "material_confirmation_required" });
  const confirmation = result.rows[0];
  const confirmedAssetIds = Array.isArray(confirmation.asset_ids) ? confirmation.asset_ids.map(String).sort() : [];
  const requested = [...new Set((Array.isArray(requestedAssetIds) ? requestedAssetIds : []).map(String).filter(Boolean))].sort();
  if (requested.length && requested.some((id) => !confirmedAssetIds.includes(id))) {
    throw Object.assign(new Error("Design input assets must be a subset of the current human-confirmed material snapshot."), { statusCode: 409, code: "design_assets_not_confirmed" });
  }
  return confirmation;
}
