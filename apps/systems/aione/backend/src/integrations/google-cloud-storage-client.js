import { GoogleAuth } from "google-auth-library";

const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const STORAGE_API = "https://storage.googleapis.com/storage/v1";
const STORAGE_UPLOAD_API = "https://storage.googleapis.com/upload/storage/v1";

const auth = new GoogleAuth({ scopes: [CLOUD_PLATFORM_SCOPE] });
let cachedClient = null;

async function getClient() {
  if (!cachedClient) cachedClient = await auth.getClient();
  return cachedClient;
}

function requiredBucket(bucketName = process.env.AIONE_PRODUCT_ASSET_BUCKET) {
  const value = String(bucketName || "").trim();
  if (!value) {
    const error = new Error("AIONE_PRODUCT_ASSET_BUCKET is required.");
    error.code = "product_asset_bucket_required";
    throw error;
  }
  return value;
}

function objectMetadataUrl(bucket, objectName) {
  return `${STORAGE_API}/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectName)}`;
}

export async function getGcsObjectMetadata({ bucketName, objectName }) {
  const bucket = requiredBucket(bucketName);
  const client = await getClient();
  try {
    const response = await client.request({
      url: objectMetadataUrl(bucket, objectName),
      method: "GET"
    });
    return response.data || null;
  } catch (error) {
    const status = Number(error?.response?.status || 0);
    if (status === 404) return null;
    const wrapped = new Error("GCS object metadata lookup failed.");
    wrapped.code = "gcs_metadata_failed";
    wrapped.statusCode = status || 502;
    throw wrapped;
  }
}

export async function readGcsObject({ bucketName, objectName }) {
  const bucket = requiredBucket(bucketName);
  const cleanObjectName = String(objectName || "").trim();
  if (!cleanObjectName) {
    const error = new Error("GCS objectName is required.");
    error.code = "canonical_asset_storage_missing";
    error.statusCode = 409;
    throw error;
  }

  const metadata = await getGcsObjectMetadata({ bucketName: bucket, objectName: cleanObjectName });
  if (!metadata) {
    const error = new Error("Canonical GCS asset object was not found.");
    error.code = "canonical_asset_object_missing";
    error.statusCode = 409;
    throw error;
  }

  const client = await getClient();
  try {
    const response = await client.request({
      url: `${objectMetadataUrl(bucket, cleanObjectName)}?alt=media`,
      method: "GET",
      responseType: "arraybuffer"
    });
    const bytes = Buffer.from(response.data || []);
    if (!bytes.length) {
      const error = new Error("Canonical GCS asset object was empty.");
      error.code = "canonical_asset_object_empty";
      error.statusCode = 409;
      throw error;
    }
    const expectedSize = Number(metadata.size || 0);
    if (expectedSize && expectedSize !== bytes.length) {
      const error = new Error("Canonical GCS asset size verification failed.");
      error.code = "canonical_asset_size_mismatch";
      error.statusCode = 409;
      throw error;
    }
    return {
      bytes,
      contentType: String(metadata.contentType || "application/octet-stream"),
      size: bytes.length,
      metadata
    };
  } catch (error) {
    if (error?.code?.startsWith?.("canonical_asset_")) throw error;
    const wrapped = new Error("Canonical GCS asset download failed.");
    wrapped.code = "canonical_asset_download_failed";
    wrapped.statusCode = Number(error?.response?.status || 0) || 502;
    throw wrapped;
  }
}

export async function uploadGcsObjectIfAbsent({ bucketName, objectName, buffer, contentType, metadata = {} }) {
  const bucket = requiredBucket(bucketName);
  const existing = await getGcsObjectMetadata({ bucketName: bucket, objectName });
  if (existing) {
    return { reused: true, metadata: existing };
  }

  const client = await getClient();
  const params = new URLSearchParams({
    uploadType: "media",
    name: objectName,
    ifGenerationMatch: "0"
  });

  try {
    const response = await client.request({
      url: `${STORAGE_UPLOAD_API}/b/${encodeURIComponent(bucket)}/o?${params.toString()}`,
      method: "POST",
      data: buffer,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Content-Length": String(buffer.length)
      }
    });

    if (Object.keys(metadata).length) {
      await client.request({
        url: objectMetadataUrl(bucket, objectName),
        method: "PATCH",
        data: { metadata }
      });
    }

    const finalMetadata = await getGcsObjectMetadata({ bucketName: bucket, objectName });
    return { reused: false, metadata: finalMetadata || response.data || null };
  } catch (error) {
    const status = Number(error?.response?.status || 0);
    if (status === 412) {
      const raced = await getGcsObjectMetadata({ bucketName: bucket, objectName });
      if (raced) return { reused: true, metadata: raced };
    }
    const wrapped = new Error("GCS object upload failed.");
    wrapped.code = "gcs_upload_failed";
    wrapped.statusCode = status || 502;
    throw wrapped;
  }
}
