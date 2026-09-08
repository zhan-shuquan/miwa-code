import { Router } from "express";
import pool, { withTransaction } from "../../db.js";
import { requireWriteActor } from "../http/context.js";
import { fetch1688ProductByUrl } from "../integrations/alibaba1688-client.js";
import { downloadRemoteImage, insertCabinetFile } from "../integrations/rakuten-cabinet-upload.js";
import {
  createCabinetFolder,
  getAllCabinetFolders,
  getCabinetFolders,
  getCabinetUsage
} from "../integrations/rakuten-rms-client.js";
import { recordBusinessEvent } from "../services/event-service.js";

const router = Router();

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function sourceUrlForOffer(offerId) {
  return `https://detail.1688.com/offer/${encodeURIComponent(offerId)}.html`;
}

async function ensureRakutenFolder({ shopRef, containerCode, personId }) {
  const containerResult = await pool.query(
    `SELECT *
       FROM public.channel_asset_containers
      WHERE channel='rakuten' AND shop_ref=$1 AND container_code=$2
        AND archived_at IS NULL
      LIMIT 1`,
    [shopRef, containerCode]
  );
  if (!containerResult.rowCount) {
    const error = new Error("AIONE Rakuten container is not configured for this shop.");
    error.statusCode = 404;
    error.code = "rakuten_container_not_found";
    throw error;
  }

  const container = containerResult.rows[0];
  const existingFolderId = Number(container.metadata?.rakutenFolderId || 0) || null;
  if (existingFolderId) {
    return {
      container,
      created: false,
      folder: {
        folderId: existingFolderId,
        folderName: container.metadata?.rakutenFolderName || containerCode,
        folderPath: container.metadata?.rakutenFolderPath || null,
        fileCount: null
      }
    };
  }

  const folders = await getAllCabinetFolders();
  let folder = folders.find((item) => String(item.folderName || "").trim().toLowerCase() === containerCode);
  let created = false;
  if (!folder) {
    const createdFolder = await createCabinetFolder({ folderName: containerCode });
    created = true;
    folder = createdFolder.folderId
      ? {
          folderId: createdFolder.folderId,
          folderName: createdFolder.folderName || containerCode,
          upperFolderId: null,
          folderPath: null,
          fileCount: 0
        }
      : null;
    if (!folder) {
      const refreshedFolders = await getAllCabinetFolders();
      folder = refreshedFolders.find((item) => String(item.folderName || "").trim().toLowerCase() === containerCode) || null;
    }
  }
  if (!folder?.folderId) {
    const error = new Error("Rakuten folder was created or found, but folderId could not be resolved.");
    error.statusCode = 502;
    error.code = "rakuten_folder_id_unresolved";
    throw error;
  }

  const metadata = {
    ...(container.metadata || {}),
    rakutenFolderId: folder.folderId,
    rakutenFolderName: folder.folderName || containerCode,
    rakutenFolderPath: folder.folderPath || null,
    rakutenFolderSyncedAt: new Date().toISOString()
  };
  const updated = await pool.query(
    `UPDATE public.channel_asset_containers
        SET metadata=$1::jsonb,
            updated_at=NOW(),
            updated_by_person_id=$2,
            record_version=record_version+1
      WHERE id=$3
      RETURNING *`,
    [JSON.stringify(metadata), personId || null, container.id]
  );
  return { container: updated.rows[0], created, folder };
}

router.get("/cabinet/usage", async (req, res, next) => {
  try {
    const usage = await getCabinetUsage();
    res.json({ ok: true, provider: "rakuten-rms", service: "CabinetAPI", usage });
  } catch (error) {
    next(error);
  }
});

router.get("/cabinet/folders", async (req, res, next) => {
  try {
    const offset = Number(req.query.offset || 1);
    const limit = Number(req.query.limit || 100);
    const result = await getCabinetFolders({ offset, limit });
    res.json({ ok: true, provider: "rakuten-rms", service: "CabinetAPI", ...result });
  } catch (error) {
    next(error);
  }
});

router.post("/cabinet/folders/ensure", requireWriteActor, async (req, res, next) => {
  try {
    const shopRef = cleanText(req.body?.shopRef, 240);
    const containerCode = cleanText(req.body?.containerCode, 120).toLowerCase();
    if (!shopRef || !/^rkc\d{3,}$/i.test(containerCode)) {
      return res.status(400).json({ error: "bad_request", message: "shopRef and a containerCode such as rkc001 are required." });
    }
    const result = await ensureRakutenFolder({
      shopRef,
      containerCode,
      personId: req.aioneContext?.personId || null
    });
    res.json({
      ok: true,
      provider: "rakuten-rms",
      service: "CabinetAPI",
      shopRef,
      containerCode,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

router.post("/products/:productId/cabinet/source-sync", requireWriteActor, async (req, res, next) => {
  try {
    const productId = cleanText(req.params.productId, 240);
    const productResult = await pool.query(
      `SELECT p.id, p.product_code, p.name,
              po.source_ref,
              po.source_url
         FROM public.products p
         LEFT JOIN public.product_opportunities po ON po.id=p.source_opportunity_id
        WHERE p.id=$1 AND p.archived_at IS NULL
        LIMIT 1`,
      [productId]
    );
    if (!productResult.rowCount) {
      return res.status(404).json({ error: "product_not_found", message: "Product not found." });
    }
    const product = productResult.rows[0];
    const assetsResult = await pool.query(
      `SELECT * FROM public.product_assets
        WHERE product_id=$1 AND archived_at IS NULL
        ORDER BY asset_no`,
      [productId]
    );
    if (!assetsResult.rowCount) {
      return res.status(409).json({ error: "product_assets_required", message: "Product assets are required before source sync." });
    }

    const firstAssetRef = cleanText(assetsResult.rows[0].source_ref, 500);
    const offerIdMatch = firstAssetRef.match(/^(\d{6,20}):image:/);
    const offerId = offerIdMatch?.[1] || cleanText(product.source_ref, 100).match(/\d{6,20}/)?.[0] || null;
    if (!offerId) {
      return res.status(409).json({ error: "source_offer_id_unresolved", message: "1688 offer id could not be resolved from Product source facts." });
    }

    const sourceUrl = cleanText(product.source_url, 2000) || sourceUrlForOffer(offerId);
    const fetched = await fetch1688ProductByUrl(sourceUrl);
    const images = Array.isArray(fetched?.product?.images) ? fetched.product.images : [];
    if (!images.length) {
      return res.status(502).json({ error: "source_images_unavailable", message: "1688 returned no product images." });
    }
    if (images.length < assetsResult.rowCount) {
      return res.status(409).json({
        error: "source_image_count_mismatch",
        message: `1688 returned ${images.length} images, but AIONE has ${assetsResult.rowCount} formalized assets.`,
        sourceImageCount: images.length,
        assetCount: assetsResult.rowCount
      });
    }

    const rows = [];
    for (const asset of assetsResult.rows) {
      const index = Number(asset.asset_no) - 1;
      const sourceImageUrl = images[index] || null;
      if (!sourceImageUrl) continue;
      const metadata = {
        ...(asset.metadata || {}),
        sourceImageOrder: Number(asset.asset_no),
        sourceSyncedAt: new Date().toISOString()
      };
      const updated = await pool.query(
        `UPDATE public.product_assets
            SET source_provider='1688',
                source_ref=$1,
                source_url=$2,
                metadata=$3::jsonb,
                updated_at=NOW(),
                updated_by_person_id=$4,
                record_version=record_version+1
          WHERE id=$5
          RETURNING *`,
        [
          `${offerId}:image:${asset.asset_no}`,
          sourceImageUrl,
          JSON.stringify(metadata),
          req.aioneContext?.personId || null,
          asset.id
        ]
      );
      rows.push(updated.rows[0]);
    }

    await recordBusinessEvent(pool, {
      eventType: "product.source_assets_synced",
      objectType: "product",
      objectId: productId,
      context: req.aioneContext || {},
      payload: {
        provider: "1688",
        offerId,
        sourceUrl,
        sourceImageCount: images.length,
        syncedAssetCount: rows.length
      }
    });

    res.json({
      ok: true,
      provider: "1688",
      productId,
      productCode: product.product_code,
      offerId,
      sourceUrl,
      sourceImageCount: images.length,
      assets: rows.map((row) => ({
        assetId: row.id,
        assetNo: row.asset_no,
        canonicalName: row.canonical_name,
        sourceUrl: row.source_url
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.post("/products/:productId/cabinet/publish", requireWriteActor, async (req, res, next) => {
  try {
    const productId = cleanText(req.params.productId, 240);
    const shopRef = cleanText(req.body?.shopRef, 240);
    const containerCode = cleanText(req.body?.containerCode || "rkc001", 120).toLowerCase();
    if (!shopRef || !/^rkc\d{3,}$/i.test(containerCode)) {
      return res.status(400).json({ error: "bad_request", message: "shopRef and a containerCode such as rkc001 are required." });
    }

    const productResult = await pool.query(
      "SELECT id, product_code, name FROM public.products WHERE id=$1 AND archived_at IS NULL LIMIT 1",
      [productId]
    );
    if (!productResult.rowCount) {
      return res.status(404).json({ error: "product_not_found", message: "Product not found." });
    }
    const product = productResult.rows[0];
    const folderResult = await ensureRakutenFolder({
      shopRef,
      containerCode,
      personId: req.aioneContext?.personId || null
    });
    const folderId = Number(folderResult.folder.folderId);

    const assetsResult = await pool.query(
      `SELECT a.*, m.id AS mapping_id, m.lifecycle_status AS mapping_status,
              m.external_path, m.external_asset_id, m.metadata AS mapping_metadata
         FROM public.product_assets a
         JOIN public.channel_asset_mappings m
           ON m.asset_id=a.id AND m.channel='rakuten' AND m.shop_ref=$2 AND m.archived_at IS NULL
        WHERE a.product_id=$1 AND a.archived_at IS NULL
        ORDER BY a.asset_no`,
      [productId, shopRef]
    );
    if (!assetsResult.rowCount) {
      return res.status(409).json({ error: "rakuten_asset_mappings_required", message: "Rakuten asset mappings are required before publish." });
    }

    const results = [];
    for (const asset of assetsResult.rows) {
      if (!asset.source_url) {
        results.push({ assetId: asset.id, canonicalName: asset.canonical_name, ok: false, error: "source_url_missing" });
        continue;
      }
      try {
        await pool.query(
          `UPDATE public.channel_asset_mappings
              SET lifecycle_status='uploading', last_error=NULL, updated_at=NOW(), record_version=record_version+1
            WHERE id=$1`,
          [asset.mapping_id]
        );
        const source = await downloadRemoteImage(asset.source_url, {
          referer: asset.source_provider === "1688" ? "https://detail.1688.com/" : undefined
        });
        const uploaded = await insertCabinetFile({
          folderId,
          fileName: asset.canonical_name,
          bytes: source.bytes,
          mimeType: source.contentType,
          overwrite: true
        });
        const mappingMetadata = {
          ...(asset.mapping_metadata || {}),
          rakutenFolderId: folderId,
          rakutenFileName: uploaded.fileName,
          rakutenFilePath: uploaded.filePath,
          rakutenFileUrl: uploaded.fileUrl,
          uploadedAt: new Date().toISOString(),
          sourceSizeBytes: source.size,
          sourceMimeType: source.contentType
        };
        const updated = await pool.query(
          `UPDATE public.channel_asset_mappings
              SET lifecycle_status='active',
                  external_asset_id=$1,
                  external_path=$2,
                  metadata=$3::jsonb,
                  last_synced_at=NOW(),
                  last_error=NULL,
                  updated_at=NOW(),
                  record_version=record_version+1
            WHERE id=$4
            RETURNING *`,
          [
            uploaded.fileId === null ? null : String(uploaded.fileId),
            uploaded.filePath || `${containerCode}/${asset.canonical_name}`,
            JSON.stringify(mappingMetadata),
            asset.mapping_id
          ]
        );
        await pool.query(
          `UPDATE public.product_assets
              SET lifecycle_status='published', updated_at=NOW(), updated_by_person_id=$1, record_version=record_version+1
            WHERE id=$2`,
          [req.aioneContext?.personId || null, asset.id]
        );
        results.push({
          assetId: asset.id,
          canonicalName: asset.canonical_name,
          ok: true,
          fileId: uploaded.fileId,
          filePath: uploaded.filePath,
          fileUrl: uploaded.fileUrl,
          mappingStatus: updated.rows[0].lifecycle_status
        });
      } catch (error) {
        const lastError = {
          code: error.code || "rakuten_publish_failed",
          message: error.message || "Rakuten publish failed.",
          remoteCode: error.remoteCode || null,
          at: new Date().toISOString()
        };
        await pool.query(
          `UPDATE public.channel_asset_mappings
              SET lifecycle_status='failed', last_error=$1::jsonb, updated_at=NOW(), record_version=record_version+1
            WHERE id=$2`,
          [JSON.stringify(lastError), asset.mapping_id]
        );
        results.push({ assetId: asset.id, canonicalName: asset.canonical_name, ok: false, error: lastError });
      }
    }

    const successCount = results.filter((item) => item.ok).length;
    const failedCount = results.length - successCount;
    await recordBusinessEvent(pool, {
      eventType: "product.rakuten_assets_published",
      objectType: "product",
      objectId: productId,
      context: req.aioneContext || {},
      payload: {
        productCode: product.product_code,
        shopRef,
        containerCode,
        folderId,
        successCount,
        failedCount
      }
    });

    res.status(failedCount ? 207 : 200).json({
      ok: failedCount === 0,
      provider: "rakuten-rms",
      service: "CabinetAPI",
      productId,
      productCode: product.product_code,
      shopRef,
      containerCode,
      folderId,
      successCount,
      failedCount,
      results
    });
  } catch (error) {
    next(error);
  }
});

router.post("/products/:productId/cabinet/sync-and-publish", requireWriteActor, async (req, res, next) => {
  try {
    const productId = cleanText(req.params.productId, 240);
    const shopRef = cleanText(req.body?.shopRef, 240);
    const containerCode = cleanText(req.body?.containerCode || "rkc001", 120).toLowerCase();
    if (!shopRef || !/^rkc\d{3,}$/i.test(containerCode)) {
      return res.status(400).json({ error: "bad_request", message: "shopRef and a containerCode such as rkc001 are required." });
    }

    const assetsResult = await pool.query(
      `SELECT * FROM public.product_assets
        WHERE product_id=$1 AND archived_at IS NULL
        ORDER BY asset_no`,
      [productId]
    );
    if (!assetsResult.rowCount) {
      return res.status(409).json({ error: "product_assets_required", message: "Product assets are required before publish." });
    }
    const firstAssetRef = cleanText(assetsResult.rows[0].source_ref, 500);
    const offerId = firstAssetRef.match(/^(\d{6,20}):image:/)?.[1] || null;
    if (!offerId) {
      return res.status(409).json({ error: "source_offer_id_unresolved", message: "1688 offer id could not be resolved from Product assets." });
    }
    const sourceUrl = sourceUrlForOffer(offerId);
    const fetched = await fetch1688ProductByUrl(sourceUrl);
    const images = Array.isArray(fetched?.product?.images) ? fetched.product.images : [];
    if (images.length < assetsResult.rowCount) {
      return res.status(409).json({
        error: "source_image_count_mismatch",
        message: `1688 returned ${images.length} images, but AIONE has ${assetsResult.rowCount} assets.`,
        sourceImageCount: images.length,
        assetCount: assetsResult.rowCount
      });
    }

    for (const asset of assetsResult.rows) {
      const sourceImageUrl = images[Number(asset.asset_no) - 1] || null;
      if (!sourceImageUrl) continue;
      await pool.query(
        `UPDATE public.product_assets
            SET source_provider='1688', source_ref=$1, source_url=$2,
                metadata=metadata || $3::jsonb,
                updated_at=NOW(), updated_by_person_id=$4, record_version=record_version+1
          WHERE id=$5`,
        [
          `${offerId}:image:${asset.asset_no}`,
          sourceImageUrl,
          JSON.stringify({ sourceImageOrder: Number(asset.asset_no), sourceSyncedAt: new Date().toISOString() }),
          req.aioneContext?.personId || null,
          asset.id
        ]
      );
    }

    const folderResult = await ensureRakutenFolder({
      shopRef,
      containerCode,
      personId: req.aioneContext?.personId || null
    });
    const folderId = Number(folderResult.folder.folderId);
    const publishRows = await pool.query(
      `SELECT a.*, m.id AS mapping_id, m.metadata AS mapping_metadata
         FROM public.product_assets a
         JOIN public.channel_asset_mappings m
           ON m.asset_id=a.id AND m.channel='rakuten' AND m.shop_ref=$2 AND m.archived_at IS NULL
        WHERE a.product_id=$1 AND a.archived_at IS NULL
        ORDER BY a.asset_no`,
      [productId, shopRef]
    );
    const results = [];
    for (const asset of publishRows.rows) {
      try {
        await pool.query(
          `UPDATE public.channel_asset_mappings
              SET lifecycle_status='uploading', last_error=NULL, updated_at=NOW(), record_version=record_version+1
            WHERE id=$1`,
          [asset.mapping_id]
        );
        const source = await downloadRemoteImage(asset.source_url, { referer: "https://detail.1688.com/" });
        const uploaded = await insertCabinetFile({
          folderId,
          fileName: asset.canonical_name,
          bytes: source.bytes,
          mimeType: source.contentType,
          overwrite: true
        });
        const mappingMetadata = {
          ...(asset.mapping_metadata || {}),
          rakutenFolderId: folderId,
          rakutenFileName: uploaded.fileName,
          rakutenFilePath: uploaded.filePath,
          rakutenFileUrl: uploaded.fileUrl,
          uploadedAt: new Date().toISOString(),
          sourceSizeBytes: source.size,
          sourceMimeType: source.contentType
        };
        await pool.query(
          `UPDATE public.channel_asset_mappings
              SET lifecycle_status='active', external_asset_id=$1, external_path=$2,
                  metadata=$3::jsonb, last_synced_at=NOW(), last_error=NULL,
                  updated_at=NOW(), record_version=record_version+1
            WHERE id=$4`,
          [
            uploaded.fileId === null ? null : String(uploaded.fileId),
            uploaded.filePath || `${containerCode}/${asset.canonical_name}`,
            JSON.stringify(mappingMetadata),
            asset.mapping_id
          ]
        );
        await pool.query(
          `UPDATE public.product_assets
              SET lifecycle_status='published', updated_at=NOW(), updated_by_person_id=$1, record_version=record_version+1
            WHERE id=$2`,
          [req.aioneContext?.personId || null, asset.id]
        );
        results.push({ assetNo: asset.asset_no, canonicalName: asset.canonical_name, ok: true, fileId: uploaded.fileId, fileUrl: uploaded.fileUrl });
      } catch (error) {
        const lastError = {
          code: error.code || "rakuten_publish_failed",
          message: error.message || "Rakuten publish failed.",
          remoteCode: error.remoteCode || null,
          at: new Date().toISOString()
        };
        await pool.query(
          `UPDATE public.channel_asset_mappings
              SET lifecycle_status='failed', last_error=$1::jsonb, updated_at=NOW(), record_version=record_version+1
            WHERE id=$2`,
          [JSON.stringify(lastError), asset.mapping_id]
        );
        results.push({ assetNo: asset.asset_no, canonicalName: asset.canonical_name, ok: false, error: lastError });
      }
    }
    const successCount = results.filter((item) => item.ok).length;
    const failedCount = results.length - successCount;
    await recordBusinessEvent(pool, {
      eventType: "product.rakuten_source_sync_and_publish",
      objectType: "product",
      objectId: productId,
      context: req.aioneContext || {},
      payload: { provider: "1688", offerId, shopRef, containerCode, folderId, successCount, failedCount }
    });
    res.status(failedCount ? 207 : 200).json({
      ok: failedCount === 0,
      productId,
      shopRef,
      containerCode,
      folderId,
      offerId,
      sourceImageCount: images.length,
      successCount,
      failedCount,
      results
    });
  } catch (error) {
    next(error);
  }
});

export default router;
