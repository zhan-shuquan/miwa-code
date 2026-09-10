import { randomUUID } from "node:crypto";
import pool from "../db.js";
import {
  buildRakutenPackProposal,
  publishRakutenCanonicalPack
} from "../src/services/rakuten-canonical-publish-service.js";
import {
  createCabinetFolder,
  getAllCabinetFolders
} from "../src/integrations/rakuten-rms-client.js";

const EXPECTED_PRODUCT_CODE = "MH0000002";
const EXPECTED_SOURCE_REF = "855305580969";
const EXPECTED_SHOP_REF = "global-dimensions";
const EXPECTED_CONTAINER_CODE = "rkc001";
const PACK_VERSION = "acceptance-v1";

function stop(message, code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function safeRemoteBody(value) {
  return String(value || "")
    .replace(/Authorization\s*[:=]\s*[^\s<]+/gi, "Authorization:[REDACTED]")
    .replace(/ESA\s+[A-Za-z0-9+/=]+/g, "ESA [REDACTED]")
    .slice(0, 4000);
}

async function loadProduct() {
  const result = await pool.query(
    `SELECT p.id, p.product_code, p.name, p.source_opportunity_id,
            po.source_platform, po.source_ref
       FROM public.products p
       LEFT JOIN public.product_opportunities po ON po.id=p.source_opportunity_id
      WHERE p.product_code=$1 AND p.archived_at IS NULL
      LIMIT 1`,
    [EXPECTED_PRODUCT_CODE]
  );
  if (!result.rowCount) stop("Expected Product MH0000002 was not found.", "acceptance_product_missing");
  const product = result.rows[0];
  if (product.source_platform !== "1688" || String(product.source_ref || "") !== EXPECTED_SOURCE_REF) {
    stop("Product source provenance does not match the accepted 1688 sourceRef.", "acceptance_source_provenance_mismatch");
  }
  return product;
}

async function ensureAcceptanceContainer() {
  let result = await pool.query(
    `SELECT * FROM public.channel_asset_containers
      WHERE channel='rakuten' AND shop_ref=$1 AND container_code=$2
        AND archived_at IS NULL
      LIMIT 1`,
    [EXPECTED_SHOP_REF, EXPECTED_CONTAINER_CODE]
  );

  if (!result.rowCount) {
    result = await pool.query(
      `INSERT INTO public.channel_asset_containers
        (id, channel, shop_ref, container_code, capacity_limit, lifecycle_status, metadata, source_system)
       VALUES ($1,'rakuten',$2,$3,NULL,'active','{}'::jsonb,'aione-rakuten-canonical-acceptance-v1')
       RETURNING *`,
      [`ctr_${randomUUID()}`, EXPECTED_SHOP_REF, EXPECTED_CONTAINER_CODE]
    );
  } else if (result.rows[0].lifecycle_status !== "active") {
    result = await pool.query(
      `UPDATE public.channel_asset_containers
          SET lifecycle_status='active', updated_at=NOW(), record_version=record_version+1
        WHERE id=$1
        RETURNING *`,
      [result.rows[0].id]
    );
  }

  let container = result.rows[0];
  let folderId = Number(container.metadata?.rakutenFolderId || 0) || null;
  if (!folderId) {
    let folders = await getAllCabinetFolders();
    let folder = folders.find((item) => String(item.folderName || "").trim().toLowerCase() === EXPECTED_CONTAINER_CODE);
    if (!folder) {
      const created = await createCabinetFolder({ folderName: EXPECTED_CONTAINER_CODE });
      if (created?.folderId) {
        folder = created;
      } else {
        folders = await getAllCabinetFolders();
        folder = folders.find((item) => String(item.folderName || "").trim().toLowerCase() === EXPECTED_CONTAINER_CODE) || null;
      }
    }
    folderId = Number(folder?.folderId || 0) || null;
    if (!folderId) stop("Rakuten R-Cabinet folder rkc001 could not be resolved.", "acceptance_rakuten_folder_unresolved");

    const metadata = {
      ...(container.metadata || {}),
      rakutenFolderId: folderId,
      rakutenFolderName: folder.folderName || EXPECTED_CONTAINER_CODE,
      rakutenFolderPath: folder.folderPath || null,
      acceptanceTarget: true,
      acceptanceStore: EXPECTED_SHOP_REF,
      rakutenFolderSyncedAt: new Date().toISOString()
    };
    const updated = await pool.query(
      `UPDATE public.channel_asset_containers
          SET metadata=$1::jsonb, updated_at=NOW(), record_version=record_version+1
        WHERE id=$2
        RETURNING *`,
      [JSON.stringify(metadata), container.id]
    );
    container = updated.rows[0];
  }

  return { container, folderId };
}

async function loadAssets(productId) {
  const result = await pool.query(
    `SELECT * FROM public.product_assets
      WHERE product_id=$1 AND archived_at IS NULL
      ORDER BY asset_no`,
    [productId]
  );
  if (!result.rowCount) stop("No ProductAssets found for MH0000002.", "acceptance_assets_missing");
  return result.rows;
}

async function run() {
  const product = await loadProduct();
  const { folderId } = await ensureAcceptanceContainer();
  const assets = await loadAssets(product.id);
  const proposal = buildRakutenPackProposal(assets);
  const main = proposal.find((item) => item.slotFamily === "main_images");
  if (!main) stop("No canonical source_main_image is available for acceptance.", "acceptance_main_image_missing");

  const sourceAsset = assets.find((asset) => asset.id === main.assetId);
  if (!sourceAsset?.metadata?.gcsBucket || !sourceAsset?.metadata?.gcsObject) {
    stop("Acceptance main image has no canonical GCS storage metadata.", "acceptance_gcs_metadata_missing");
  }

  const assignments = [{ assetId: main.assetId, slotFamily: "main_images", slotOrder: 1 }];
  const context = {
    sourceSystem: "aione-rakuten-canonical-acceptance-v1",
    correlationId: `rakuten-acceptance:${EXPECTED_PRODUCT_CODE}:${EXPECTED_SHOP_REF}`
  };

  const first = await publishRakutenCanonicalPack({
    productId: product.id,
    shopRef: EXPECTED_SHOP_REF,
    containerCode: EXPECTED_CONTAINER_CODE,
    packVersion: PACK_VERSION,
    assignments,
    context
  });
  if (!first.ok || first.results.length !== 1) stop("First canonical publish did not return one successful result.", "acceptance_first_publish_failed");
  if (!first.results[0].externalAssetId) stop("Rakuten provider file identity was not persisted.", "acceptance_provider_identity_missing");

  const second = await publishRakutenCanonicalPack({
    productId: product.id,
    shopRef: EXPECTED_SHOP_REF,
    containerCode: EXPECTED_CONTAINER_CODE,
    packVersion: PACK_VERSION,
    assignments,
    context
  });
  if (!second.ok || second.results.length !== 1 || second.results[0].reused !== true) {
    stop("Second canonical publish did not prove idempotent mapping reuse.", "acceptance_idempotency_failed");
  }

  const mappingCount = await pool.query(
    `SELECT COUNT(*)::int AS count
       FROM public.channel_asset_mappings
      WHERE asset_id=$1 AND channel='rakuten' AND shop_ref=$2
        AND archived_at IS NULL
        AND metadata->>'packVersion'=$3
        AND metadata->>'slotFamily'='main_images'`,
    [main.assetId, EXPECTED_SHOP_REF, PACK_VERSION]
  );
  if (Number(mappingCount.rows[0].count) !== 1) stop("Canonical publish created duplicate channel mappings.", "acceptance_duplicate_mapping");

  console.log(JSON.stringify({
    contract: "AIONE Rakuten Canonical Publish Backend Closure V1",
    ok: true,
    productId: product.id,
    productCode: product.product_code,
    sourceRef: product.source_ref,
    shopRef: EXPECTED_SHOP_REF,
    containerCode: EXPECTED_CONTAINER_CODE,
    rakutenFolderId: folderId,
    packVersion: PACK_VERSION,
    assetId: main.assetId,
    canonicalName: main.canonicalName,
    sourceRole: main.sourceRole,
    gcsBucket: sourceAsset.metadata.gcsBucket,
    gcsObject: sourceAsset.metadata.gcsObject,
    firstRunReused: Boolean(first.results[0].reused),
    secondRunReused: Boolean(second.results[0].reused),
    externalAssetId: second.results[0].externalAssetId,
    externalPath: second.results[0].externalPath,
    channelMappingCount: Number(mappingCount.rows[0].count)
  }, null, 2));
}

run()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(JSON.stringify({
      contract: "AIONE Rakuten Canonical Publish Backend Closure V1",
      ok: false,
      error: error.code || "acceptance_failed",
      message: error.message,
      remoteStatus: error.rakutenStatus || error.remoteStatus || null,
      remoteCode: error.remoteCode || null,
      remoteBody: safeRemoteBody(error.rakutenBody)
    }, null, 2));
    await pool.end().catch(() => {});
    process.exit(1);
  });
