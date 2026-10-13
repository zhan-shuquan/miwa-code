// R-Cabinet accepts JPEG/PNG/GIF etc., but not WebP, and limits uploads to
// 2 MB and 1600 x 1200 pixels (CabinetAPI file.insert specification).
// Always preserve the immutable SOURCE asset in GCS; convert in memory only.
import { spawn } from "node:child_process";

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
export const CABINET_IMAGE_LIMITS = Object.freeze({
  maxBytes: 2 * 1024 * 1024,
  maxWidth: 1600,
  maxHeight: 1200
});

function invalid(code, message) {
  return Object.assign(new Error(message), { code, statusCode: 422 });
}

async function magick(args, source, maxOutputBytes = CABINET_IMAGE_LIMITS.maxBytes + 1024) {
  return new Promise((resolve, reject) => {
    const child = spawn(args[0], args.slice(1), {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, MAGICK_THREAD_LIMIT: "1" }
    });
    let settled = false;
    const chunks = [];
    let outputBytes = 0, stderr = "";
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(value);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(invalid("rakuten_image_processing_timeout", "R-Cabinet image processing timed out."));
    }, 20_000);
    child.stdout.on("data", chunk => {
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) {
        child.kill("SIGKILL");
        finish(invalid("rakuten_image_processing_size", "R-Cabinet image processing exceeded output limit."));
      } else chunks.push(chunk);
    });
    child.stderr.on("data", chunk => {
      stderr = (stderr + String(chunk)).slice(-300);
    });
    child.on("error", () => finish(invalid("rakuten_image_processing_unavailable", "ImageMagick binary is unavailable.")));
    child.on("close", code => {
      if (code === 0 && !settled) finish(null, Buffer.concat(chunks));
      else if (!settled) finish(invalid("rakuten_image_processing_failed", "ImageMagick could not decode or transform this source image."));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(source);
  });
}

export async function prepareRakutenCabinetImage({ bytes, mimeType = "", convert = magick }) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 16 || bytes.length > MAX_SOURCE_BYTES) {
    throw invalid("rakuten_image_source_invalid", "Source image is missing or exceeds 20 MB.");
  }
  const source = await convert(["identify", "-ping", "-format", "%m %w %h\\n", "-"], bytes, 2048);
  const lines = source.toString("utf8").trim().split(/\\r?\\n/);
  if (lines.length !== 1) {
    throw invalid("rakuten_image_multiframe_unsupported", "Animated or multi-page source image is not supported for this pilot.");
  }
  const info = lines[0].match(/^([A-Za-z]+) (\\d+) (\\d+)$/);
  if (!info) throw invalid("rakuten_image_format_invalid", "Unable to determine source image format and dimensions.");
  const format = info[1].toUpperCase(), width = Number(info[2]), height = Number(info[3]);
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width > 10000 || height > 10000) {
    throw invalid("rakuten_image_dimensions_invalid", "Source image dimensions are invalid.");
  }
  if (!["JPEG", "PNG", "WEBP", "GIF", "TIFF", "BMP"].includes(format)) {
    throw invalid("rakuten_image_format_unsupported", "Source image format is not compatible with Cabinet upload.");
  }
  // Keep compliant JPEG byte-for-byte unchanged.
  if (format === "JPEG" && bytes.length <= CABINET_IMAGE_LIMITS.maxBytes
      && width <= CABINET_IMAGE_LIMITS.maxWidth && height <= CABINET_IMAGE_LIMITS.maxHeight) {
    return { bytes, mimeType: "image/jpeg", width, height, sourceFormat: format,
      sourceMimeType: mimeType, sourceWidth: width, sourceHeight: height, converted: false };
  }
  let lastError = null;
  for (const quality of [86, 76, 66]) {
    try {
      const converted = await convert(["convert", "-", "-auto-orient", "-resize", "1600x1200>",
        "-background", "white", "-alpha", "remove", "-alpha", "off", "-strip",
        "-quality", String(quality), "jpeg:-"], bytes, CABINET_IMAGE_LIMITS.maxBytes + 1024);
      if (converted.length > 16 && converted.length <= CABINET_IMAGE_LIMITS.maxBytes
          && converted[0] === 0xff && converted[1] === 0xd8 && converted[2] === 0xff) {
        const output = await convert(["identify", "-ping", "-format", "%m %w %h\\n", "-"], converted, 2048);
        const dimensions = output.toString("utf8").trim().match(/^JPEG (\\d+) (\\d+)$/);
        const w = Number(dimensions?.[1]), h = Number(dimensions?.[2]);
        if (w > 0 && h > 0 && w <= 1600 && h <= 1200) {
          return { bytes: converted, mimeType: "image/jpeg", width: w, height: h,
            sourceFormat: format, sourceMimeType: mimeType,
            sourceWidth: width, sourceHeight: height, converted: true };
        }
      }
    } catch (error) { lastError = error; }
  }
  throw invalid("rakuten_image_normalization_failed",
    "Could not produce a supported JPEG within the R-Cabinet size and dimension limits.");
}
