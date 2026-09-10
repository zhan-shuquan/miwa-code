import { createHash } from "node:crypto";

const RMS_BASE_URL = "https://api.rms.rakuten.co.jp/es/1.0";

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    const error = new Error(`${name} is not configured.`);
    error.statusCode = 503;
    error.code = "rakuten_credentials_not_configured";
    throw error;
  }
  return value;
}

function authorizationHeader() {
  const serviceSecret = requiredEnv("AIONE_RAKUTEN_SERVICE_SECRET");
  const licenseKey = requiredEnv("AIONE_RAKUTEN_LICENSE_KEY");
  return `ESA ${Buffer.from(`${serviceSecret}:${licenseKey}`, "utf8").toString("base64")}`;
}

function decodeXml(value) {
  return String(value ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function xmlText(xml, tagName) {
  const match = String(xml || "").match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXml(match[1].trim()) : null;
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function assertRakutenSuccess(xml) {
  const systemStatus = xmlText(xml, "systemStatus");
  const resultCode = xmlText(xml, "resultCode");
  const successCode = resultCode === "0" || resultCode === "N000";
  if ((systemStatus && systemStatus !== "OK") || (resultCode && !successCode)) {
    const error = new Error(`Rakuten RMS API returned systemStatus=${systemStatus || "unknown"}, resultCode=${resultCode || "unknown"}.`);
    error.statusCode = 502;
    error.code = "rakuten_rms_result_error";
    error.remoteCode = resultCode || systemStatus || undefined;
    error.rakutenBody = String(xml || "").slice(0, 4000);
    throw error;
  }
}

function rakutenExtension(mimeType, fileName) {
  const mime = String(mimeType || "").toLowerCase();
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  const match = String(fileName || "").toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  const ext = match?.[1];
  if (["jpg", "jpeg", "png", "gif"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
  return "jpg";
}

function buildRakutenSafeFilePath(fileName, mimeType) {
  const ext = rakutenExtension(mimeType, fileName);
  const digest = createHash("sha256").update(String(fileName || ""), "utf8").digest("hex").slice(0, 12);
  return `a${digest}.${ext}`;
}

export async function downloadRemoteImage(sourceUrl, { referer } = {}) {
  const response = await fetch(sourceUrl, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 AIONE/1.0",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      ...(referer ? { Referer: referer } : {})
    },
    signal: AbortSignal.timeout(20_000),
    redirect: "follow"
  });
  if (!response.ok) {
    const error = new Error(`Source image download failed with HTTP ${response.status}.`);
    error.statusCode = 502;
    error.code = "source_image_download_failed";
    error.remoteStatus = response.status;
    throw error;
  }
  const contentType = String(response.headers.get("content-type") || "application/octet-stream").split(";")[0].trim().toLowerCase();
  if (!contentType.startsWith("image/")) {
    const error = new Error(`Source URL did not return an image (${contentType || "unknown"}).`);
    error.statusCode = 502;
    error.code = "source_image_invalid_content_type";
    throw error;
  }
  const arrayBuffer = await response.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);
  if (!bytes.length) {
    const error = new Error("Source image response was empty.");
    error.statusCode = 502;
    error.code = "source_image_empty";
    throw error;
  }
  return { bytes, contentType, size: bytes.length };
}

export async function insertCabinetFile({ folderId, fileName, bytes, mimeType = "image/jpeg", overwrite = true }) {
  if (!folderId && folderId !== 0) {
    const error = new Error("folderId is required.");
    error.statusCode = 400;
    error.code = "bad_request";
    throw error;
  }
  const cleanFileName = String(fileName || "").trim();
  if (!cleanFileName || !bytes?.length) {
    const error = new Error("fileName and image bytes are required.");
    error.statusCode = 400;
    error.code = "bad_request";
    throw error;
  }

  const providerFilePath = buildRakutenSafeFilePath(cleanFileName, mimeType);
  const xml = `<?xml version="1.0" encoding="UTF-8"?><request><fileInsertRequest><file><fileName>${escapeXml(providerFilePath)}</fileName><folderId>${escapeXml(folderId)}</folderId><filePath>${escapeXml(providerFilePath)}</filePath><overwrite>${overwrite ? "true" : "false"}</overwrite></file></fileInsertRequest></request>`;
  const form = new FormData();
  form.append("xml", xml);
  form.append("file", new Blob([bytes], { type: mimeType }), providerFilePath);

  const response = await fetch(`${RMS_BASE_URL}/cabinet/file/insert`, {
    method: "POST",
    headers: {
      Authorization: authorizationHeader(),
      Accept: "text/xml, application/xml;q=0.9, */*;q=0.8"
    },
    body: form,
    signal: AbortSignal.timeout(30_000)
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`Rakuten Cabinet upload failed with HTTP ${response.status}.`);
    error.statusCode = 502;
    error.code = "rakuten_cabinet_upload_http_error";
    error.rakutenStatus = response.status;
    error.rakutenBody = text.slice(0, 4000);
    throw error;
  }
  assertRakutenSuccess(text);

  return {
    interfaceId: xmlText(text, "interfaceId"),
    systemStatus: xmlText(text, "systemStatus"),
    resultCode: xmlText(text, "resultCode"),
    fileId: numberOrNull(xmlText(text, "fileId")),
    folderId: numberOrNull(xmlText(text, "folderId")) ?? Number(folderId),
    fileName: xmlText(text, "fileName") || providerFilePath,
    filePath: xmlText(text, "filePath") || providerFilePath,
    fileUrl: xmlText(text, "fileUrl") || xmlText(text, "fileURL") || null
  };
}
