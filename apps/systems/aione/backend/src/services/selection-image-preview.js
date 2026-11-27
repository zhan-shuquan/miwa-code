import sharp from "sharp";

// Bounded derivative cache; the original bytes remain in the existing asset store.
// Derivatives can always be regenerated, including for historical assets.
const cache = new Map();
let cacheBytes = 0;
export async function imageDerivative(asset, size) {
  const width = size === "thumbnail" ? 240 : 1400;
  const key = `${asset.sha256}:${width}`;
  if (cache.has(key)) return cache.get(key);
  const bytes = await sharp(asset.bytes, { limitInputPixels: 80000000 })
    .rotate()
    .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
    .webp({ quality: size === "thumbnail" ? 76 : 84 })
    .toBuffer();
  while (cacheBytes + bytes.length > 64 * 1024 * 1024 && cache.size) {
    const first = cache.keys().next().value;
    cacheBytes -= cache.get(first).length;
    cache.delete(first);
  }
  cache.set(key, bytes);
  cacheBytes += bytes.length;
  return bytes;
}
