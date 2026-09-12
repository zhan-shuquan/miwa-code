import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";
import { fetchDriveFileStream } from "../integrations/google-drive-client.js";
import { uploadGcsObjectIfAbsent } from "../integrations/google-cloud-storage-client.js";
import { withTransaction } from "../../db.js";

const SOURCE_PROVIDER = "google_drive_curated";
const SOURCE_SYSTEM = "aione-curated-drive-asset-v1";

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function normalizeName(value) {
  return String(value || "").normalize("NFKC").trim().toLowerCase();
}

function safeExtension(name, mimeType) {
  const ext = extname(String(name || "")).replace(/^\./, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ext) return ext;
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "bin";
}

function roleForCuratedFile(file) {
  if (file.folder === "01_SKU图") return "source_sku_image";
  if (file.folder === "03_实拍图") return "source_real_photo";
  const name = normalizeName(file.name);
  if (name.includes("主图") || name.includes("白底")) return "source_main_image";
  if (name.includes("详情")) return "source_detail_image";
  if (name.includes("颜色") || name.includes("配色")) return "source_color_image";
  return "source_product_image";
}

async function loadExistingExact(productId, driveFileId, fileSha256) {
  const result = await withTransaction(async (client) => client.query(
    `SELECT *
       FROM public.product_assets
      WHERE product_id=$1
        AND archived_at IS NULL
        AND source_provider=$2
        AND source_ref=$3
        AND metadata->>'layer'='SOURCE'
        AND metadata->>'fileSha256'=$4
      ORDER BY asset_no DESC
      LIMIT 1`,
    [productId, SOURCE_PROVIDER, driveFileId, fileSha256]
  ));
  return result.rows[0] || null;
}

async function registerAsset({ product, file, fileSha256, byteSize, bucketName, gcsObject }) {
  return withTransaction(async (client) => {
    await client.query("SELECT id FROM public.products WHERE id=$1 FOR UPDATE", [product.id]);

    const existing = await client.query(
      `SELECT *
         FROM public.product_assets
        WHERE product_id=$1
          AND archived_at IS NULL
          AND source_provider=$2
          AND source_ref=$3
          AND metadata->>'layer'='SOURCE'
          AND metadata->>'fileSha256'=$4
        ORDER BY asset_no DESC
        LIMIT 1`,
      [product.id, SOURCE_PROVIDER, file.id, fileSha256]
    );
    if (existing.rowCount) return { asset: existing.rows[0], reused: true };

    const nextNoResult = await client.query(
      "SELECT COALESCE(MAX(asset_no),0)+1 AS next_no FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL",
      [product.id]
    );
    const assetNo = Number(nextNoResult.rows[0].next_no);
    if (!Number.isInteger(assetNo) || assetNo < 1 || assetNo > 999) {
      throw Object.assign(new Error("Product asset_no capacity exhausted."), { code: "product_asset_capacity_exhausted" });
    }

    const extension = safeExtension(file.name, file.mimeType);
    const canonicalName = `${product.product_code}_${String(assetNo).padStart(2, "0")}.${extension}`;
    const metadata = {
      layer: "SOURCE",
      currentCuratedContract: "three-folder-v1",
      currentCurated: true,
      sourceFolder: file.folder,
      driveFolderId: file.folderId,
      driveFileId: file.id,
      driveModifiedTime: file.modifiedTime || null,
      driveSize: file.size == null ? null : String(file.size),
      fileSha256,
      byteSize,
      gcsBucket: bucketName,
      gcsObject,
      original1688ProvenanceRequired: false
    };

    const inserted = await client.query(
      `INSERT INTO public.product_assets
        (id, product_id, asset_no, asset_type, asset_role, source_provider, source_ref,
         source_url, original_name, canonical_name, mime_type, lifecycle_status, metadata, source_system)
       VALUES ($1,$2,$3,'image',$4,$5,$6,$7,$8,$9,$10,'formalized',$11::jsonb,$12)
       RETURNING *`,
      [
        `ast_${randomUUID()}`,
        product.id,
        assetNo,
        roleForCuratedFile(file),
        SOURCE_PROVIDER,
        file.id,
        file.webViewLink || null,
        file.name,
        canonicalName,
        file.mimeType,
        JSON.stringify(metadata),
        SOURCE_SYSTEM
      ]
    );
    return { asset: inserted.rows[0], reused: false };
  });
}

export async function formalizeCuratedDriveImage({ product, file, bucketName }) {
  if (!product?.id || !product?.product_code) {
    throw Object.assign(new Error("Canonical Product context is required."), { code: "curated_product_context_required" });
  }
  if (!file?.id || !file?.folder || !file?.mimeType?.startsWith?.("image/")) {
    throw Object.assign(new Error("Curated Drive image metadata is incomplete."), { code: "curated_drive_image_invalid" });
  }
  const bucket = String(bucketName || "").trim();
  if (!bucket) throw Object.assign(new Error("AIONE_PRODUCT_ASSET_BUCKET is required."), { code: "product_asset_bucket_required" });

  const downloaded = await fetchDriveFileStream({ fileId: file.id, mimeType: file.mimeType });
  const buffer = await streamToBuffer(downloaded.stream);
  if (!buffer.length) throw Object.assign(new Error("Curated Drive image is empty."), { code: "curated_drive_image_empty" });
  const fileSha256 = sha256(buffer);

  const exact = await loadExistingExact(product.id, file.id, fileSha256);
  if (exact) return { asset: exact, reused: true, uploadedReused: true, fileSha256 };

  const extension = safeExtension(file.name, file.mimeType);
  const gcsObject = `source/curated/${product.product_code}/${file.id}/${fileSha256}.${extension}`;
  const uploaded = await uploadGcsObjectIfAbsent({
    bucketName: bucket,
    objectName: gcsObject,
    buffer,
    contentType: file.mimeType,
    metadata: {
      layer: "SOURCE",
      sourceProvider: SOURCE_PROVIDER,
      productCode: product.product_code,
      driveFileId: file.id,
      sourceFolder: file.folder,
      fileSha256
    }
  });

  const registered = await registerAsset({
    product,
    file,
    fileSha256,
    byteSize: buffer.length,
    bucketName: bucket,
    gcsObject
  });
  return { ...registered, uploadedReused: uploaded.reused, fileSha256, gcsObject };
}

export function curatedDriveSourceProvider() {
  return SOURCE_PROVIDER;
}
