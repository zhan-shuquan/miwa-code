import { Router } from "express";
import { randomUUID } from "node:crypto";
import pool, { withTransaction } from "../../db.js";
import { requireWriteActor } from "../http/context.js";
import { readGcsObject } from "../integrations/google-cloud-storage-client.js";
import { recordBusinessEvent } from "../services/event-service.js";

const router = Router();

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function pad(value, width = 2) {
  return String(value).padStart(width, "0");
}

function assetId() {
  return `ast_${randomUUID()}`;
}

function containerId() {
  return `ctr_${randomUUID()}`;
}

function mappingId() {
  return `cam_${randomUUID()}`;
}

function normalizeExtension(value, mimeType) {
  const explicit = cleanText(value, 12).replace(/^\./, "").toLowerCase();
  if (explicit) return explicit.replace(/[^a-z0-9]+/g, "") || "jpg";
  const mime = cleanText(mimeType, 120).toLowerCase();
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/avif") return "avif";
  return "jpg";
}

function safeContentDispositionFilename(value) {
  const fallback = cleanText(value, 240)
    .replace(/[\r\n]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^\.+/, "") || "asset";
  return `inline; filename="${fallback}"`;
}

async function loadProduct(client, productId) {
  const result = await client.query(
    "SELECT id, product_code, name, lifecycle_status FROM public.products WHERE id=$1 AND archived_at IS NULL",
    [productId]
  );
  if (!result.rowCount) {
    const error = new Error("Product not found.");
    error.statusCode = 404;
    error.code = "product_not_found";
    throw error;
  }
  if (!result.rows[0].product_code) {
    const error = new Error("Product Code is required before asset formalization.");
    error.statusCode = 409;
    error.code = "product_code_required";
    throw error;
  }
  return result.rows[0];
}

router.get("/products/:productId/assets", async (req, res, next) => {
  try {
    const productId = cleanText(req.params.productId, 240);
    const product = await loadProduct(pool, productId);
    const result = await pool.query(
      `SELECT a.*,
              COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    'channel', m.channel,
                    'shopRef', m.shop_ref,
                    'containerCode', c.container_code,
                    'externalPath', m.external_path,
                    'status', m.lifecycle_status
                  ) ORDER BY m.channel, m.shop_ref
                ) FILTER (WHERE m.id IS NOT NULL),
                '[]'::jsonb
              ) AS channel_mappings
         FROM public.product_assets a
         LEFT JOIN public.channel_asset_mappings m
           ON m.asset_id=a.id AND m.archived_at IS NULL
         LEFT JOIN public.channel_asset_containers c
           ON c.id=m.container_id AND c.archived_at IS NULL
        WHERE a.product_id=$1 AND a.archived_at IS NULL
        GROUP BY a.id
        ORDER BY a.asset_no`,
      [productId]
    );
    res.json({ product, assets: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get("/:assetId/content", async (req, res, next) => {
  try {
    const requestedAssetId = cleanText(req.params.assetId, 240);
    if (!requestedAssetId) {
      return res.status(400).json({ error: "bad_request", message: "assetId is required." });
    }

    const result = await pool.query(
      `SELECT id, product_id, asset_type, canonical_name, mime_type, lifecycle_status, metadata
         FROM public.product_assets
        WHERE id=$1 AND archived_at IS NULL
        LIMIT 1`,
      [requestedAssetId]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: "product_asset_not_found", message: "ProductAsset not found." });
    }

    const asset = result.rows[0];
    const metadata = asset.metadata && typeof asset.metadata === "object" ? asset.metadata : {};
    const bucketName = cleanText(metadata.gcsBucket, 512);
    const objectName = cleanText(metadata.gcsObject, 2048);
    if (!bucketName || !objectName) {
      const error = new Error("ProductAsset has no canonical GCS storage reference.");
      error.statusCode = 409;
      error.code = "canonical_asset_storage_missing";
      throw error;
    }

    const declaredMime = cleanText(asset.mime_type, 120).toLowerCase();
    if (asset.asset_type !== "image" || (declaredMime && !declaredMime.startsWith("image/"))) {
      const error = new Error("Inline ProductAsset preview currently supports image assets only.");
      error.statusCode = 415;
      error.code = "product_asset_preview_not_supported";
      throw error;
    }

    const canonical = await readGcsObject({ bucketName, objectName });
    const contentType = cleanText(canonical.contentType, 120) || declaredMime || "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      const error = new Error("Canonical ProductAsset object is not an image.");
      error.statusCode = 409;
      error.code = "canonical_asset_content_type_mismatch";
      throw error;
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", String(canonical.size));
    res.setHeader("Content-Disposition", safeContentDispositionFilename(asset.canonical_name));
    res.setHeader("X-AIONE-Asset-Id", asset.id);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.send(canonical.bytes);
  } catch (error) {
    next(error);
  }
});

router.post("/products/:productId/assets/plan", requireWriteActor, async (req, res, next) => {
  try {
    const productId = cleanText(req.params.productId, 240);
    const count = Number(req.body?.count ?? 0);
    if (!Number.isInteger(count) || count <= 0 || count > 999) {
      return res.status(400).json({ error: "bad_request", message: "count must be an integer from 1 to 999." });
    }
    const product = await loadProduct(pool, productId);
    const roles = Array.isArray(req.body?.roles) ? req.body.roles : [];
    const extension = normalizeExtension(req.body?.extension, req.body?.mimeType);
    const items = Array.from({ length: count }, (_, index) => ({
      assetNo: index + 1,
      canonicalName: `${product.product_code}_${pad(index + 1)}.${extension}`,
      assetRole: cleanText(roles[index], 120) || null
    }));
    res.json({ product, namingRule: "{ProductCode}_{NN}.{ext}", items });
  } catch (error) {
    next(error);
  }
});

router.post("/products/:productId/assets/register", requireWriteActor, async (req, res, next) => {
  const productId = cleanText(req.params.productId, 240);
  const assets = Array.isArray(req.body?.assets) ? req.body.assets : null;
  if (!assets?.length || assets.length > 999) {
    return res.status(400).json({ error: "bad_request", message: "assets must contain 1 to 999 items." });
  }

  try {
    const context = req.aioneContext || {};
    const result = await withTransaction(async (client) => {
      const product = await loadProduct(client, productId);
      const rows = [];
      const seenNumbers = new Set();

      for (let index = 0; index < assets.length; index += 1) {
        const input = assets[index] || {};
        const assetNo = Number(input.assetNo ?? index + 1);
        if (!Number.isInteger(assetNo) || assetNo <= 0 || assetNo > 999 || seenNumbers.has(assetNo)) {
          const error = new Error("Each assetNo must be a unique integer from 1 to 999.");
          error.statusCode = 400;
          error.code = "invalid_asset_no";
          throw error;
        }
        seenNumbers.add(assetNo);

        const extension = normalizeExtension(input.extension, input.mimeType);
        const canonicalName = `${product.product_code}_${pad(assetNo)}.${extension}`;
        const metadata = input.metadata && typeof input.metadata === "object" ? input.metadata : {};
        const row = await client.query(
          `INSERT INTO public.product_assets
            (id, product_id, asset_no, asset_type, asset_role, source_provider, source_ref,
             source_url, original_name, canonical_name, mime_type, lifecycle_status, metadata,
             created_by_person_id, updated_by_person_id, source_system)
           VALUES ($1,$2,$3,'image',$4,$5,$6,$7,$8,$9,$10,'formalized',$11::jsonb,$12,$12,$13)
           ON CONFLICT (product_id, asset_no) DO UPDATE
             SET asset_role=EXCLUDED.asset_role,
                 source_provider=EXCLUDED.source_provider,
                 source_ref=EXCLUDED.source_ref,
                 source_url=EXCLUDED.source_url,
                 original_name=COALESCE(EXCLUDED.original_name, public.product_assets.original_name),
                 canonical_name=EXCLUDED.canonical_name,
                 mime_type=EXCLUDED.mime_type,
                 lifecycle_status='formalized',
                 metadata=public.product_assets.metadata || EXCLUDED.metadata,
                 updated_at=NOW(),
                 updated_by_person_id=EXCLUDED.updated_by_person_id,
                 record_version=public.product_assets.record_version+1
           RETURNING *`,
          [
            assetId(),
            productId,
            assetNo,
            cleanText(input.assetRole, 120) || null,
            cleanText(input.sourceProvider, 120) || null,
            cleanText(input.sourceRef, 500) || null,
            cleanText(input.sourceUrl, 2000) || null,
            cleanText(input.originalName, 500) || null,
            canonicalName,
            cleanText(input.mimeType, 120) || null,
            JSON.stringify(metadata),
            context.personId || null,
            context.sourceSystem || "aione"
          ]
        );
        rows.push(row.rows[0]);
      }

      await recordBusinessEvent(client, {
        eventType: "product.assets_formalized",
        objectType: "product",
        objectId: productId,
        context,
        payload: {
          productCode: product.product_code,
          assetCount: rows.length,
          canonicalNames: rows.map((row) => row.canonical_name)
        }
      });

      return { product, assets: rows };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/rakuten/containers", requireWriteActor, async (req, res, next) => {
  const shopRef = cleanText(req.body?.shopRef, 240);
  const containerCode = cleanText(req.body?.containerCode, 120).toLowerCase();
  const capacityLimitRaw = req.body?.capacityLimit;
  const capacityLimit = capacityLimitRaw === null || capacityLimitRaw === undefined || capacityLimitRaw === ""
    ? null
    : Number(capacityLimitRaw);

  if (!shopRef || !/^rkc\d{3,}$/i.test(containerCode)) {
    return res.status(400).json({ error: "bad_request", message: "shopRef and a containerCode such as rkc001 are required." });
  }
  if (capacityLimit !== null && (!Number.isInteger(capacityLimit) || capacityLimit <= 0)) {
    return res.status(400).json({ error: "bad_request", message: "capacityLimit must be a positive integer or null." });
  }

  try {
    const context = req.aioneContext || {};
    const result = await pool.query(
      `INSERT INTO public.channel_asset_containers
        (id, channel, shop_ref, container_code, capacity_limit, created_by_person_id, updated_by_person_id, source_system)
       VALUES ($1,'rakuten',$2,$3,$4,$5,$5,$6)
       ON CONFLICT (channel, shop_ref, container_code) DO UPDATE
         SET capacity_limit=EXCLUDED.capacity_limit,
             lifecycle_status='active',
             updated_at=NOW(),
             updated_by_person_id=EXCLUDED.updated_by_person_id,
             record_version=public.channel_asset_containers.record_version+1
       RETURNING *`,
      [containerId(), shopRef, containerCode, capacityLimit, context.personId || null, context.sourceSystem || "aione"]
    );
    res.status(201).json({ container: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post("/products/:productId/rakuten/allocate", requireWriteActor, async (req, res, next) => {
  const productId = cleanText(req.params.productId, 240);
  const shopRef = cleanText(req.body?.shopRef, 240);
  if (!shopRef) {
    return res.status(400).json({ error: "bad_request", message: "shopRef is required." });
  }

  try {
    const context = req.aioneContext || {};
    const result = await withTransaction(async (client) => {
      const product = await loadProduct(client, productId);
      const assetsResult = await client.query(
        "SELECT * FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL ORDER BY asset_no FOR UPDATE",
        [productId]
      );
      if (!assetsResult.rowCount) {
        const error = new Error("Formalized product assets are required before Rakuten allocation.");
        error.statusCode = 409;
        error.code = "product_assets_required";
        throw error;
      }

      const lockedContainersResult = await client.query(
        `SELECT *
           FROM public.channel_asset_containers
          WHERE channel='rakuten' AND shop_ref=$1 AND archived_at IS NULL AND lifecycle_status='active'
          ORDER BY container_code
          FOR UPDATE`,
        [shopRef]
      );
      if (!lockedContainersResult.rowCount) {
        const error = new Error("No active Rakuten R-Cabinet container is configured for this shop.");
        error.statusCode = 409;
        error.code = "rakuten_container_not_configured";
        throw error;
      }

      const allocationCountsResult = await client.query(
        `SELECT container_id,
                COUNT(*) FILTER (WHERE archived_at IS NULL AND lifecycle_status <> 'deleted')::int AS allocated_count
           FROM public.channel_asset_mappings
          WHERE container_id = ANY($1::text[])
          GROUP BY container_id`,
        [lockedContainersResult.rows.map((row) => row.id)]
      );
      const allocationCountByContainerId = new Map(
        allocationCountsResult.rows.map((row) => [row.container_id, Number(row.allocated_count || 0)])
      );
      const containers = lockedContainersResult.rows.map((row) => ({
        ...row,
        allocated_count: allocationCountByContainerId.get(row.id) || 0
      }));
      const mappings = [];

      for (const asset of assetsResult.rows) {
        const existing = await client.query(
          `SELECT m.*, c.container_code
             FROM public.channel_asset_mappings m
             LEFT JOIN public.channel_asset_containers c ON c.id=m.container_id
            WHERE m.asset_id=$1 AND m.channel='rakuten' AND m.shop_ref=$2 AND m.archived_at IS NULL
            LIMIT 1`,
          [asset.id, shopRef]
        );
        if (existing.rowCount) {
          mappings.push(existing.rows[0]);
          continue;
        }

        const container = containers.find((candidate) => candidate.capacity_limit === null || candidate.allocated_count < Number(candidate.capacity_limit));
        if (!container) {
          const error = new Error("All configured Rakuten R-Cabinet containers are full.");
          error.statusCode = 409;
          error.code = "rakuten_container_capacity_exhausted";
          throw error;
        }

        const externalPath = `${container.container_code}/${asset.canonical_name}`;
        const inserted = await client.query(
          `INSERT INTO public.channel_asset_mappings
            (id, asset_id, channel, shop_ref, container_id, external_path, lifecycle_status, metadata, source_system)
           VALUES ($1,$2,'rakuten',$3,$4,$5,'planned',$6::jsonb,$7)
           RETURNING *`,
          [
            mappingId(),
            asset.id,
            shopRef,
            container.id,
            externalPath,
            JSON.stringify({ productCode: product.product_code }),
            context.sourceSystem || "aione"
          ]
        );
        container.allocated_count += 1;
        mappings.push({ ...inserted.rows[0], container_code: container.container_code });
      }

      await recordBusinessEvent(client, {
        eventType: "product.rakuten_assets_allocated",
        objectType: "product",
        objectId: productId,
        context,
        payload: {
          productCode: product.product_code,
          shopRef,
          mappings: mappings.map((row) => ({ assetId: row.asset_id, externalPath: row.external_path }))
        }
      });

      return { product, shopRef, mappings };
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
