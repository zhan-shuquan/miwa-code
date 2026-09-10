import { randomUUID } from "node:crypto";
import pool, { withTransaction } from "../../db.js";
import { readGcsObject } from "../integrations/google-cloud-storage-client.js";
import { insertCabinetFile } from "../integrations/rakuten-cabinet-upload.js";
import { recordBusinessEvent } from "./event-service.js";

const SLOT_FAMILIES = new Set(["main_images", "sku_or_variation_images", "detail_images", "video"]);

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function mappingId() {
  return `cam_${randomUUID()}`;
}

function proposalSlot(assetRole) {
  if (assetRole === "source_main_image") return "main_images";
  if (assetRole === "source_sku_image") return "sku_or_variation_images";
  if (assetRole === "source_detail_image") return "detail_images";
  if (assetRole === "source_video") return "video";
  return null;
}

function supportedForSlot(asset, slotFamily) {
  if (slotFamily === "video") return asset.asset_type === "video";
  return asset.asset_type === "image";
}

export function buildRakutenPackProposal(assets) {
  const counters = new Map();
  return (Array.isArray(assets) ? assets : [])
    .map((asset) => {
      const slotFamily = proposalSlot(asset.asset_role);
      if (!slotFamily) return null;
      const slotOrder = (counters.get(slotFamily) || 0) + 1;
      counters.set(slotFamily, slotOrder);
      return {
        assetId: asset.id,
        assetNo: asset.asset_no,
        slotFamily,
        slotOrder,
        sourceRole: asset.asset_role,
        canonicalName: asset.canonical_name
      };
    })
    .filter(Boolean);
}

export function validateRakutenPackAssignments({ assets, assignments, shopRef, destinationResolved }) {
  const assetById = new Map((Array.isArray(assets) ? assets : []).map((asset) => [asset.id, asset]));
  const blocking = [];
  const warnings = [];
  const seen = new Set();
  let mainCount = 0;

  if (!cleanText(shopRef, 240)) blocking.push("shop_ref_missing");

  for (const assignment of Array.isArray(assignments) ? assignments : []) {
    const assetId = cleanText(assignment?.assetId, 240);
    const slotFamily = cleanText(assignment?.slotFamily, 120);
    if (!SLOT_FAMILIES.has(slotFamily)) {
      blocking.push("unsupported_slot_family");
      continue;
    }
    const key = `${assetId}:${slotFamily}`;
    if (seen.has(key)) {
      blocking.push("duplicate_slot_assignment");
      continue;
    }
    seen.add(key);
    const asset = assetById.get(assetId);
    if (!asset) {
      blocking.push("assigned_asset_missing");
      continue;
    }
    if (asset.archived_at) {
      blocking.push("assigned_asset_archived");
      continue;
    }
    if (!supportedForSlot(asset, slotFamily)) blocking.push("unsupported_media_type");
    if (!asset.metadata?.gcsBucket || !asset.metadata?.gcsObject) blocking.push("canonical_asset_storage_missing");
    if (slotFamily === "main_images") mainCount += 1;
  }

  if (!mainCount) blocking.push("rakuten_main_image_missing");
  if (!destinationResolved) blocking.push("publish_destination_unresolved");

  const slotFamilies = new Set((assignments || []).map((item) => item?.slotFamily));
  if (!slotFamilies.has("sku_or_variation_images")) warnings.push("rakuten_sku_image_missing");
  if (!slotFamilies.has("detail_images")) warnings.push("rakuten_detail_image_missing");
  if (!slotFamilies.has("video")) warnings.push("rakuten_video_missing");

  return {
    readyForPublish: blocking.length === 0,
    blocking: [...new Set(blocking)],
    warnings: [...new Set(warnings)]
  };
}

async function loadContext({ productId, shopRef, containerCode }) {
  const productResult = await pool.query(
    "SELECT id, product_code, name, lifecycle_status FROM public.products WHERE id=$1 AND archived_at IS NULL LIMIT 1",
    [productId]
  );
  if (!productResult.rowCount) {
    throw Object.assign(new Error("Product not found."), { code: "product_not_found", statusCode: 404 });
  }

  const assetsResult = await pool.query(
    "SELECT * FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL ORDER BY asset_no",
    [productId]
  );

  const params = [shopRef];
  let sql = `SELECT * FROM public.channel_asset_containers
              WHERE channel='rakuten' AND shop_ref=$1
                AND archived_at IS NULL AND lifecycle_status='active'`;
  if (containerCode) {
    params.push(containerCode);
    sql += " AND container_code=$2";
  }
  sql += " ORDER BY container_code LIMIT 1";
  const containerResult = await pool.query(sql, params);
  const container = containerResult.rows[0] || null;
  const folderId = Number(container?.metadata?.rakutenFolderId || 0) || null;

  return {
    product: productResult.rows[0],
    assets: assetsResult.rows,
    container,
    folderId
  };
}

export async function getRakutenCanonicalPackReadiness({ productId, shopRef, containerCode }) {
  const normalizedProductId = cleanText(productId, 240);
  const normalizedShopRef = cleanText(shopRef, 240);
  const normalizedContainerCode = cleanText(containerCode, 120).toLowerCase() || null;
  const context = await loadContext({
    productId: normalizedProductId,
    shopRef: normalizedShopRef,
    containerCode: normalizedContainerCode
  });
  const proposal = buildRakutenPackProposal(context.assets);
  const validation = validateRakutenPackAssignments({
    assets: context.assets,
    assignments: proposal,
    shopRef: normalizedShopRef,
    destinationResolved: Boolean(context.container && context.folderId)
  });
  return {
    product: context.product,
    shopRef: normalizedShopRef,
    container: context.container ? {
      id: context.container.id,
      containerCode: context.container.container_code,
      rakutenFolderId: context.folderId
    } : null,
    proposal,
    proposalValidation: validation,
    assignmentState: "proposal_only",
    readyForPublish: false,
    blocking: [...new Set(["explicit_pack_assignment_required", ...validation.blocking])],
    warnings: validation.warnings
  };
}

export async function publishRakutenCanonicalPack({ productId, shopRef, containerCode, packVersion, assignments, context = {} }) {
  const normalizedProductId = cleanText(productId, 240);
  const normalizedShopRef = cleanText(shopRef, 240);
  const normalizedContainerCode = cleanText(containerCode, 120).toLowerCase() || null;
  const normalizedPackVersion = cleanText(packVersion || "v1", 80);
  if (!Array.isArray(assignments) || !assignments.length) {
    throw Object.assign(new Error("Explicit Rakuten pack assignments are required."), {
      code: "explicit_pack_assignment_required",
      statusCode: 400
    });
  }

  const loaded = await loadContext({
    productId: normalizedProductId,
    shopRef: normalizedShopRef,
    containerCode: normalizedContainerCode
  });
  const validation = validateRakutenPackAssignments({
    assets: loaded.assets,
    assignments,
    shopRef: normalizedShopRef,
    destinationResolved: Boolean(loaded.container && loaded.folderId)
  });
  if (!validation.readyForPublish) {
    const error = new Error("Rakuten canonical PublishAssetPack is not ready.");
    error.code = "rakuten_publish_pack_not_ready";
    error.statusCode = 409;
    error.missing = validation.blocking;
    throw error;
  }

  const attemptId = `rakuten-publish:${normalizedProductId}:${normalizedShopRef}:${normalizedPackVersion}`;
  const assetById = new Map(loaded.assets.map((asset) => [asset.id, asset]));
  const results = [];

  for (const assignment of assignments) {
    const asset = assetById.get(cleanText(assignment.assetId, 240));
    const slotFamily = cleanText(assignment.slotFamily, 120);
    const slotOrder = Number(assignment.slotOrder || 0) || 1;

    const existing = await pool.query(
      `SELECT * FROM public.channel_asset_mappings
        WHERE asset_id=$1 AND channel='rakuten' AND shop_ref=$2
          AND archived_at IS NULL
          AND metadata->>'packVersion'=$3
          AND metadata->>'slotFamily'=$4
          AND lifecycle_status='active'
        LIMIT 1`,
      [asset.id, normalizedShopRef, normalizedPackVersion, slotFamily]
    );
    if (existing.rowCount && existing.rows[0].external_asset_id) {
      results.push({
        assetId: asset.id,
        slotFamily,
        slotOrder,
        reused: true,
        mappingId: existing.rows[0].id,
        externalAssetId: existing.rows[0].external_asset_id,
        externalPath: existing.rows[0].external_path
      });
      continue;
    }

    const canonical = await readGcsObject({
      bucketName: asset.metadata.gcsBucket,
      objectName: asset.metadata.gcsObject
    });
    const uploaded = await insertCabinetFile({
      folderId: loaded.folderId,
      fileName: asset.canonical_name,
      bytes: canonical.bytes,
      mimeType: canonical.contentType || asset.mime_type || "application/octet-stream",
      overwrite: true
    });

    const mappingMetadata = {
      packVersion: normalizedPackVersion,
      slotFamily,
      slotOrder,
      validationState: "ready",
      publicationAttemptId: attemptId,
      sourceLayer: asset.metadata?.layer || null,
      gcsBucket: asset.metadata.gcsBucket,
      gcsObject: asset.metadata.gcsObject,
      providerFileUrl: uploaded.fileUrl || null,
      publishedAt: new Date().toISOString()
    };

    const mapping = await withTransaction(async (client) => {
      const prior = await client.query(
        `SELECT * FROM public.channel_asset_mappings
          WHERE asset_id=$1 AND channel='rakuten' AND shop_ref=$2
            AND archived_at IS NULL
            AND metadata->>'packVersion'=$3
            AND metadata->>'slotFamily'=$4
          LIMIT 1 FOR UPDATE`,
        [asset.id, normalizedShopRef, normalizedPackVersion, slotFamily]
      );
      if (prior.rowCount) {
        const updated = await client.query(
          `UPDATE public.channel_asset_mappings
              SET container_id=$1,
                  external_path=$2,
                  external_asset_id=$3,
                  lifecycle_status='active',
                  metadata=metadata || $4::jsonb,
                  last_synced_at=NOW(),
                  last_error=NULL,
                  updated_at=NOW(),
                  record_version=record_version+1
            WHERE id=$5
            RETURNING *`,
          [loaded.container.id, uploaded.filePath || `${loaded.container.container_code}/${asset.canonical_name}`, uploaded.fileId === null ? null : String(uploaded.fileId), JSON.stringify(mappingMetadata), prior.rows[0].id]
        );
        return updated.rows[0];
      }
      const inserted = await client.query(
        `INSERT INTO public.channel_asset_mappings
          (id, asset_id, channel, shop_ref, container_id, external_path, external_asset_id,
           lifecycle_status, metadata, source_system, last_synced_at)
         VALUES ($1,$2,'rakuten',$3,$4,$5,$6,'active',$7::jsonb,$8,NOW())
         RETURNING *`,
        [
          mappingId(),
          asset.id,
          normalizedShopRef,
          loaded.container.id,
          uploaded.filePath || `${loaded.container.container_code}/${asset.canonical_name}`,
          uploaded.fileId === null ? null : String(uploaded.fileId),
          JSON.stringify(mappingMetadata),
          context.sourceSystem || "aione-rakuten-canonical-publish-v1"
        ]
      );
      return inserted.rows[0];
    });

    results.push({
      assetId: asset.id,
      slotFamily,
      slotOrder,
      reused: false,
      mappingId: mapping.id,
      externalAssetId: mapping.external_asset_id,
      externalPath: mapping.external_path,
      fileUrl: uploaded.fileUrl || null
    });
  }

  await recordBusinessEvent(pool, {
    eventType: "product.rakuten_canonical_pack_published",
    objectType: "product",
    objectId: normalizedProductId,
    context,
    payload: {
      attemptId,
      productCode: loaded.product.product_code,
      shopRef: normalizedShopRef,
      containerCode: loaded.container.container_code,
      packVersion: normalizedPackVersion,
      assignedAssetCount: assignments.length,
      resultCount: results.length,
      reusedCount: results.filter((item) => item.reused).length
    }
  });

  return {
    ok: true,
    attemptId,
    product: loaded.product,
    shopRef: normalizedShopRef,
    containerCode: loaded.container.container_code,
    packVersion: normalizedPackVersion,
    validation,
    results
  };
}
