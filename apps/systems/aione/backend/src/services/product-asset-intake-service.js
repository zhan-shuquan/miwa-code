import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, normalize, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import pool, { withTransaction } from "../../db.js";
import { fetchDriveFileStream } from "../integrations/google-drive-client.js";
import { uploadGcsObjectIfAbsent, getGcsObjectMetadata } from "../integrations/google-cloud-storage-client.js";
import { recordBusinessEvent } from "./event-service.js";

const execFileAsync = promisify(execFile);
const EXPECTED_SOURCE_PLATFORM = "1688";

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function normalizeRelativePath(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function validateZipEntry(entry) {
  const normalized = normalizeRelativePath(entry).trim();
  if (!normalized || normalized.endsWith("/")) return null;
  if (normalized.includes("\0") || normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) {
    throw Object.assign(new Error(`Unsafe ZIP entry: ${entry}`), { code: "unsafe_zip_entry" });
  }
  const parts = normalized.split("/");
  if (parts.some((part) => part === "..")) {
    throw Object.assign(new Error(`Unsafe ZIP traversal entry: ${entry}`), { code: "unsafe_zip_entry" });
  }
  return normalized;
}

function roleForPath(relativePath) {
  const first = normalizeRelativePath(relativePath).split("/")[0];
  if (first === "sku图片") return "source_sku_image";
  if (first === "主图") return "source_main_image";
  if (first === "详情") return "source_detail_image";
  if (first === "视频") return "source_video";
  return "source_other";
}

function mimeForPath(path) {
  const ext = extname(path).toLowerCase();
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".avif": "image/avif",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".avi": "video/x-msvideo"
  };
  return map[ext] || "application/octet-stream";
}

function assetTypeForMime(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "other";
}

function safeExtension(relativePath, mimeType) {
  const ext = extname(relativePath).replace(/^\./, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ext) return ext;
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "video/mp4") return "mp4";
  return "bin";
}

async function loadProductContext(sourceRef) {
  const result = await pool.query(
    `SELECT p.*, po.id AS opportunity_id, po.lifecycle_status AS opportunity_status,
            po.source_platform AS opportunity_source_platform,
            po.source_ref AS opportunity_source_ref,
            po.source_url AS opportunity_source_url,
            po.metadata AS opportunity_metadata
       FROM public.products p
       JOIN public.product_opportunities po ON po.id=p.source_opportunity_id
      WHERE p.archived_at IS NULL
        AND po.archived_at IS NULL
        AND po.source_platform=$1
        AND po.source_ref=$2
      ORDER BY p.created_at`,
    [EXPECTED_SOURCE_PLATFORM, sourceRef]
  );
  if (result.rowCount !== 1) {
    throw Object.assign(new Error("Expected exactly one formal Product for sourceRef."), {
      code: "product_identity_conflict",
      details: { sourceRef, count: result.rowCount }
    });
  }
  const row = result.rows[0];
  if (row.lifecycle_status !== "draft" || row.opportunity_status !== "converted") {
    throw Object.assign(new Error("Product / ProductOpportunity lifecycle is not eligible for SOURCE asset intake."), {
      code: "product_asset_lifecycle_conflict"
    });
  }
  return row;
}

function sourceZipEvidence(productContext) {
  const metadata = productContext.opportunity_metadata && typeof productContext.opportunity_metadata === "object"
    ? productContext.opportunity_metadata
    : {};
  const evidence = metadata.sourceMaterialZip;
  if (!evidence?.fileId || !evidence?.name) {
    throw Object.assign(new Error("ProductOpportunity has no sourceMaterialZip evidence."), {
      code: "source_material_zip_missing"
    });
  }
  return evidence;
}

async function listZipEntries(zipPath) {
  const { stdout } = await execFileAsync("unzip", ["-Z1", zipPath], { maxBuffer: 20 * 1024 * 1024 });
  return stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

async function rejectSymlinkEntries(zipPath) {
  const { stdout } = await execFileAsync("zipinfo", ["-l", zipPath], { maxBuffer: 20 * 1024 * 1024 });
  const symlinkLine = stdout.split(/\r?\n/).find((line) => /^l[rwx-]{9}\s/.test(line.trim()));
  if (symlinkLine) {
    throw Object.assign(new Error("ZIP contains a symbolic link entry."), { code: "unsafe_zip_symlink" });
  }
}

async function walkFiles(root) {
  const results = [];
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = join(current, entry.name);
      if (entry.isSymbolicLink()) {
        throw Object.assign(new Error("Extracted ZIP contains symbolic link."), { code: "unsafe_zip_symlink" });
      }
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) results.push(absolute);
    }
  }
  await visit(root);
  return results;
}

async function inspectZip(buffer) {
  const workRoot = await mkdtemp(join(tmpdir(), "aione-product-assets-"));
  const zipPath = join(workRoot, "source.zip");
  const extractRoot = join(workRoot, "extract");
  await writeFile(zipPath, buffer);
  await execFileAsync("mkdir", ["-p", extractRoot]);

  try {
    const entries = await listZipEntries(zipPath);
    if (!entries.length) throw Object.assign(new Error("ZIP contains no entries."), { code: "empty_zip" });
    for (const entry of entries) validateZipEntry(entry);
    await rejectSymlinkEntries(zipPath);
    await execFileAsync("unzip", ["-qq", "-o", zipPath, "-d", extractRoot], { maxBuffer: 20 * 1024 * 1024 });

    const rootResolved = resolve(extractRoot) + sep;
    const files = await walkFiles(extractRoot);
    const inspected = [];
    for (const absolute of files) {
      const absoluteResolved = resolve(absolute);
      if (!absoluteResolved.startsWith(rootResolved)) {
        throw Object.assign(new Error("Extracted file escaped temporary root."), { code: "unsafe_zip_entry" });
      }
      const relativePath = normalizeRelativePath(relative(extractRoot, absolute));
      const data = await readFile(absolute);
      if (!data.length) continue;
      const mimeType = mimeForPath(relativePath);
      inspected.push({
        absolutePath: absolute,
        relativePath,
        originalName: basename(relativePath),
        byteSize: data.length,
        fileSha256: sha256(data),
        mimeType,
        assetType: assetTypeForMime(mimeType),
        assetRole: roleForPath(relativePath),
        extension: safeExtension(relativePath, mimeType),
        buffer: data
      });
    }
    if (!inspected.length) throw Object.assign(new Error("ZIP contains no non-empty files."), { code: "empty_zip_files" });
    return { workRoot, files: inspected };
  } catch (error) {
    await rm(workRoot, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

async function upsertAsset({ productContext, sourceRef, sourceZip, sourceZipSha256, file, bucketName, gcsObject }) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT * FROM public.product_assets
        WHERE product_id=$1
          AND archived_at IS NULL
          AND source_provider='1688'
          AND source_ref=$2
          AND metadata->>'layer'='SOURCE'
          AND metadata->>'sourceZipSha256'=$3
          AND metadata->>'relativePath'=$4
          AND metadata->>'fileSha256'=$5
        LIMIT 1 FOR UPDATE`,
      [productContext.id, sourceRef, sourceZipSha256, file.relativePath, file.fileSha256]
    );

    const metadataPatch = {
      layer: "SOURCE",
      driveFileId: sourceZip.fileId,
      sourceZipName: sourceZip.name,
      sourceZipSha256,
      relativePath: file.relativePath,
      fileSha256: file.fileSha256,
      byteSize: file.byteSize,
      gcsBucket: bucketName,
      gcsObject
    };

    if (existing.rowCount) {
      const updated = await client.query(
        `UPDATE public.product_assets
            SET metadata=metadata || $2::jsonb,
                updated_at=NOW(),
                record_version=record_version+1
          WHERE id=$1
          RETURNING *`,
        [existing.rows[0].id, JSON.stringify(metadataPatch)]
      );
      return { asset: updated.rows[0], reused: true };
    }

    const nextNoResult = await client.query(
      "SELECT COALESCE(MAX(asset_no),0)+1 AS next_no FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL",
      [productContext.id]
    );
    const assetNo = Number(nextNoResult.rows[0].next_no);
    if (!Number.isInteger(assetNo) || assetNo < 1 || assetNo > 999) {
      throw Object.assign(new Error("Product asset_no capacity exhausted."), { code: "product_asset_capacity_exhausted" });
    }
    const canonicalName = `${productContext.product_code}_${String(assetNo).padStart(2, "0")}.${file.extension}`;
    const inserted = await client.query(
      `INSERT INTO public.product_assets
        (id, product_id, asset_no, asset_type, asset_role, source_provider, source_ref,
         source_url, original_name, canonical_name, mime_type, lifecycle_status, metadata, source_system)
       VALUES ($1,$2,$3,$4,$5,'1688',$6,$7,$8,$9,$10,'formalized',$11::jsonb,'aione-product-asset-intake-v1')
       RETURNING *`,
      [
        `ast_${randomUUID()}`,
        productContext.id,
        assetNo,
        file.assetType,
        file.assetRole,
        sourceRef,
        productContext.opportunity_source_url || null,
        file.originalName,
        canonicalName,
        file.mimeType,
        JSON.stringify(metadataPatch)
      ]
    );
    return { asset: inserted.rows[0], reused: false };
  });
}

export async function formalizeProductSourceAssets({ sourceRef, bucketName = process.env.AIONE_PRODUCT_ASSET_BUCKET }) {
  const normalizedSourceRef = String(sourceRef || "").trim();
  if (!/^\d+$/.test(normalizedSourceRef)) {
    throw Object.assign(new Error("Numeric 1688 sourceRef is required."), { code: "invalid_source_ref" });
  }
  const bucket = String(bucketName || "").trim();
  if (!bucket) throw Object.assign(new Error("AIONE_PRODUCT_ASSET_BUCKET is required."), { code: "product_asset_bucket_required" });

  const productContext = await loadProductContext(normalizedSourceRef);
  const sourceZip = sourceZipEvidence(productContext);
  const downloaded = await fetchDriveFileStream({ fileId: sourceZip.fileId, mimeType: sourceZip.mimeType || "application/zip" });
  const zipBuffer = await streamToBuffer(downloaded.stream);
  if (!zipBuffer.length) throw Object.assign(new Error("Drive ZIP is empty."), { code: "source_zip_empty" });
  const sourceZipSha256 = sha256(zipBuffer);
  const inspected = await inspectZip(zipBuffer);

  try {
    const results = [];
    for (const file of inspected.files) {
      const gcsObject = `source/1688/${normalizedSourceRef}/${sourceZipSha256}/${file.relativePath}`;
      const uploaded = await uploadGcsObjectIfAbsent({
        bucketName: bucket,
        objectName: gcsObject,
        buffer: file.buffer,
        contentType: file.mimeType,
        metadata: {
          sourceProvider: "1688",
          sourceRef: normalizedSourceRef,
          sourceZipSha256,
          fileSha256: file.fileSha256,
          layer: "SOURCE"
        }
      });
      const gcsSize = Number(uploaded.metadata?.size || 0);
      if (gcsSize && gcsSize !== file.byteSize) {
        throw Object.assign(new Error("GCS object size does not match source file."), {
          code: "gcs_size_mismatch",
          details: { gcsObject, sourceSize: file.byteSize, gcsSize }
        });
      }
      const registered = await upsertAsset({
        productContext,
        sourceRef: normalizedSourceRef,
        sourceZip,
        sourceZipSha256,
        file,
        bucketName: bucket,
        gcsObject
      });
      results.push({ ...registered, uploadedReused: uploaded.reused, gcsObject, file });
    }

    const counts = results.reduce((acc, item) => {
      if (item.file.assetType === "image") acc.imageCount += 1;
      else if (item.file.assetType === "video") acc.videoCount += 1;
      else acc.otherCount += 1;
      return acc;
    }, { imageCount: 0, videoCount: 0, otherCount: 0 });

    await withTransaction(async (client) => {
      await recordBusinessEvent(client, {
        eventType: "product.source_assets_formalized",
        objectType: "product",
        objectId: productContext.id,
        context: {
          actorKind: "system",
          sourceSystem: "aione-product-asset-intake-v1",
          correlationId: `product-assets:${normalizedSourceRef}:${sourceZipSha256}`
        },
        payload: {
          productId: productContext.id,
          productCode: productContext.product_code,
          sourcePlatform: EXPECTED_SOURCE_PLATFORM,
          sourceRef: normalizedSourceRef,
          sourceZipSha256,
          assetCount: results.length,
          ...counts,
          reusedAssetCount: results.filter((item) => item.reused).length,
          reusedGcsCount: results.filter((item) => item.uploadedReused).length
        }
      });
    });

    const finalAssets = await pool.query(
      `SELECT * FROM public.product_assets
        WHERE product_id=$1 AND archived_at IS NULL AND source_provider='1688' AND source_ref=$2
          AND metadata->>'layer'='SOURCE'
        ORDER BY asset_no`,
      [productContext.id, normalizedSourceRef]
    );

    for (const asset of finalAssets.rows) {
      const metadata = asset.metadata || {};
      const objectMeta = await getGcsObjectMetadata({ bucketName: metadata.gcsBucket, objectName: metadata.gcsObject });
      if (!objectMeta || Number(objectMeta.size || 0) !== Number(metadata.byteSize || 0)) {
        throw Object.assign(new Error("Registered ProductAsset is not backed by the expected GCS object."), {
          code: "product_asset_gcs_verification_failed",
          details: { assetId: asset.id }
        });
      }
    }

    return {
      ok: true,
      productId: productContext.id,
      productCode: productContext.product_code,
      sourcePlatform: EXPECTED_SOURCE_PLATFORM,
      sourceRef: normalizedSourceRef,
      sourceZipName: sourceZip.name,
      sourceZipSha256,
      bucketName: bucket,
      processedFileCount: results.length,
      sourceAssetCount: finalAssets.rowCount,
      createdAssetCount: results.filter((item) => !item.reused).length,
      reusedAssetCount: results.filter((item) => item.reused).length,
      uploadedObjectCount: results.filter((item) => !item.uploadedReused).length,
      reusedObjectCount: results.filter((item) => item.uploadedReused).length,
      roles: [...new Set(results.map((item) => item.file.assetRole))].sort(),
      ...counts
    };
  } finally {
    await rm(inspected.workRoot, { recursive: true, force: true }).catch(() => {});
  }
}
