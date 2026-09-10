function safeToken(value, fallback) {
  const token = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return token || fallback;
}

function extensionFromMime(mimeType, canonicalName) {
  const mime = String(mimeType || "").toLowerCase();
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";

  const match = String(canonicalName || "").toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  const ext = match?.[1];
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
  return "jpg";
}

export function buildRakutenPublicationFileName({ productCode, slotFamily, slotOrder, mimeType, canonicalName }) {
  const product = safeToken(productCode, "product");
  const slot = safeToken(slotFamily, "asset");
  const order = String(Number(slotOrder || 1)).padStart(2, "0");
  const ext = extensionFromMime(mimeType, canonicalName);
  return `${product}-${slot}-${order}.${ext}`;
}
