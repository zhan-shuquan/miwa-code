// One raw-byte limit drives validation, browser help and JSON/base64 allowance.
const configured = Number(process.env.AIONE_SELECTION_IMAGE_MAX_MB || 20);
if (!Number.isFinite(configured) || configured < 1 || configured > 100) {
  throw new Error("AIONE_SELECTION_IMAGE_MAX_MB must be between 1 and 100");
}
export const uploadPolicy = Object.freeze({
  maxBytes: Math.floor(configured * 1024 * 1024),
  maxMB: configured,
  formats: ["image/jpeg", "image/png", "image/webp"],
});
export const uploadJsonLimit =
  Math.ceil((uploadPolicy.maxBytes * 4) / 3) + 65536;
