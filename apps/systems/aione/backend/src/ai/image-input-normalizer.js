import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_INPUT_BYTES = 40 * 1024 * 1024;

function enabled(value) {
  return String(value ?? "true").trim().toLowerCase() !== "false";
}

function safeStem(value, fallback) {
  const raw = String(value || fallback || "source").replace(/\.[^.]+$/, "");
  const safe = raw.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
  return safe || fallback || "source";
}

export function isOpenAIImageInputNormalizationEnabled() {
  return enabled(process.env.AIONE_AI_IMAGE_NORMALIZE_INPUTS);
}

export async function normalizeImageForOpenAI(image, index = 0) {
  const bytes = Buffer.isBuffer(image?.bytes) ? image.bytes : Buffer.from(image?.bytes || []);
  if (!bytes.length) {
    const error = new Error(`OpenAI image input ${index + 1} is empty before normalization.`);
    error.code = "design_source_asset_empty";
    error.statusCode = 409;
    throw error;
  }
  if (bytes.length > MAX_INPUT_BYTES) {
    const error = new Error(`OpenAI image input ${index + 1} exceeds the AIONE 40MB SOURCE normalization limit.`);
    error.code = "design_source_asset_too_large";
    error.statusCode = 409;
    throw error;
  }

  const root = await mkdtemp(join(tmpdir(), "aione-openai-input-"));
  const input = join(root, `source-${index + 1}.bin`);
  const output = join(root, `source-${index + 1}.jpg`);
  await writeFile(input, bytes);

  try {
    await execFileAsync(
      "convert",
      [
        `${input}[0]`,
        "-auto-orient",
        "-colorspace", "sRGB",
        "-alpha", "remove",
        "-alpha", "off",
        "-strip",
        "-quality", "92",
        output
      ],
      { maxBuffer: 20 * 1024 * 1024 }
    );
    const normalized = await readFile(output);
    if (!normalized.length) throw new Error("normalized image is empty");
    return {
      bytes: normalized,
      contentType: "image/jpeg",
      filename: `${safeStem(image?.filename, `source-${index + 1}`)}.jpg`,
      normalized: true,
      originalContentType: String(image?.contentType || "application/octet-stream"),
      originalByteSize: bytes.length,
      normalizedByteSize: normalized.length
    };
  } catch (cause) {
    const error = new Error(`SOURCE image ${index + 1} cannot be decoded and normalized for AI generation${image?.filename ? `: ${image.filename}` : ""}.`);
    error.code = "design_source_asset_invalid_image";
    error.statusCode = 409;
    error.details = {
      index: index + 1,
      filename: image?.filename || null,
      contentType: image?.contentType || null,
      byteSize: bytes.length,
      normalizer: "imagemagick"
    };
    error.cause = cause;
    throw error;
  } finally {
    await rm(root, { recursive: true, force: true }).catch(() => {});
  }
}

export async function normalizeImagesForOpenAI(images) {
  const items = Array.isArray(images) ? images : [];
  if (!isOpenAIImageInputNormalizationEnabled()) return items;
  const normalized = [];
  for (let index = 0; index < items.length; index += 1) {
    normalized.push(await normalizeImageForOpenAI(items[index], index));
  }
  return normalized;
}
