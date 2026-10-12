import { createHash } from "node:crypto";
import { classifyEmployeeImageName, validImageBytes } from "./product-image-name-contract.js";

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const MIME = Object.freeze({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" });

export function validProductIdentity(value) {
  return /^(?:prd_)?[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function invalid(code, message) {
  return Object.assign(new Error(message), { code, statusCode: 400 });
}

export function inspectLocalImageUpload(body, localCode) {
  const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
  const image = classifyEmployeeImageName(fileName, localCode);
  if (!image) throw invalid("image_filename_invalid", "图片名称不符合当前商品的 _01 / _c01 命名规则。");
  const base64 = body?.base64;
  if (typeof base64 !== "string" || base64.length < 24 ||
      base64.length > Math.ceil(IMAGE_MAX_BYTES / 3) * 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))
    throw invalid("image_base64_invalid", "图片数据格式或大小无效。");
  const bytes = Buffer.from(base64, "base64");
  const mime = MIME[image.extension];
  if (bytes.length < 16 || bytes.length > IMAGE_MAX_BYTES || !validImageBytes(bytes, mime))
    throw invalid("image_invalid", "仅支持不超过2MB的有效JPG、PNG或WebP图片。");
  return {
    image, bytes, mime,
    digest: createHash("sha256").update(bytes).digest("hex"),
    slotKey: image.kind + ":" + image.index
  };
}

export function assertGcsImageMetadata(metadata, { digest, size, mime }) {
  if (!metadata) throw Object.assign(new Error("云端图片不存在。"), { code: "image_storage_missing", statusCode: 409 });
  if (Number(metadata.size) !== size || String(metadata.contentType || "").toLowerCase() !== mime)
    throw Object.assign(new Error("云端图片大小或格式不匹配。"), { code: "image_storage_conflict", statusCode: 409 });
  const cloudDigest = metadata.metadata?.fileSha256;
  if (cloudDigest && cloudDigest !== digest)
    throw Object.assign(new Error("云端图片哈希不匹配。"), { code: "image_storage_conflict", statusCode: 409 });
  return Boolean(cloudDigest === digest);
}

export function sortLocalImageFiles(names, localCode) {
  return names.map(fileName => classifyEmployeeImageName(fileName, localCode))
    .filter(Boolean)
    .sort((a, b) => {
      const type = v => v.kind === "sku" ? 1 : 0;
      return type(a) - type(b) || a.index - b.index || a.originalName.localeCompare(b.originalName);
    });
}

/**
 * Reconcile local naming slots against ALL existing ProductAssets.
 * Especially important when _01 was already uploaded through the manual
 * primary-image button. Never silently create a second primary.
 */
export function chooseExistingLocalImageAsset(rows, { slotKey, digest, kind }) {
  const assets = Array.isArray(rows) ? rows : [];
  const slots = assets.filter(a => a.metadata?.localImageSlot === slotKey);
  const conflict = (code, message) => {
    throw Object.assign(new Error(message), { code, statusCode: 409 });
  };
  if (slots.length > 1) conflict("image_slot_duplicate", "同一图片位置出现多条资产，需人工修复。");
  if (slots.length === 1) {
    if (slots[0].metadata?.fileSha256 !== digest)
      conflict("image_slot_changed", "图片位置已有其他版本，不能自动覆盖。");
    return { action: "reuse_slot", asset: slots[0] };
  }
  if (kind !== "main") return { action: "create", asset: null };
  const primaries = assets.filter(a => a.asset_role === "source_main_image");
  if (!primaries.length) return { action: "create", asset: null };
  if (primaries.length !== 1 || primaries[0].metadata?.fileSha256 !== digest)
    conflict("main_image_already_exists", "AIONE 已有不同或多张主图，禁止自动创建第二张主图；需要人工核对。");
  return { action: "reuse_primary", asset: primaries[0] };
}
