/* OpenAI Image API modality adapter for the existing AIONE OpenAI provider. */
const API_BASE = () => String(process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");
const IMAGE_MODEL = () => String(process.env.AIONE_AI_IMAGE_MODEL || "gpt-image-2.5-sunburst").trim();
const ALLOWED_QUALITIES = new Set(["low", "medium", "high", "xhigh", "max", "auto"]);

function requiredPrompt(value) {
  const prompt = String(value || "").trim();
  if (!prompt) {
    const error = new Error("A benefit feature image prompt is required.");
    error.code = "design_image_prompt_required";
    error.statusCode = 409;
    throw error;
  }
  return prompt;
}

function normalizedQuality(value) {
  const quality = String(value || process.env.AIONE_AI_IMAGE_QUALITY || "medium").trim().toLowerCase();
  return ALLOWED_QUALITIES.has(quality) ? quality : "medium";
}

function normalizedImages(images) {
  const items = Array.isArray(images) ? images : [];
  if (!items.length) {
    const error = new Error("At least one canonical SOURCE image is required for OpenAI image editing.");
    error.code = "design_source_asset_required";
    error.statusCode = 409;
    throw error;
  }
  return items.map((image, index) => {
    const bytes = Buffer.isBuffer(image?.bytes) ? image.bytes : Buffer.from(image?.bytes || []);
    if (!bytes.length) {
      const error = new Error(`OpenAI image input ${index + 1} is empty.`);
      error.code = "design_source_asset_empty";
      error.statusCode = 409;
      throw error;
    }
    const contentType = String(image?.contentType || "image/jpeg").trim().toLowerCase();
    if (!contentType.startsWith("image/")) {
      const error = new Error(`OpenAI image input ${index + 1} is not an image.`);
      error.code = "design_source_asset_not_image";
      error.statusCode = 409;
      throw error;
    }
    return {
      bytes,
      contentType,
      filename: String(image?.filename || `source-${index + 1}.jpg`).trim()
    };
  });
}

export function getOpenAIImageRuntimeStatus() {
  return {
    provider: "openai",
    configured: Boolean(String(process.env.OPENAI_API_KEY || "").trim()),
    model: IMAGE_MODEL(),
    quality: normalizedQuality()
  };
}

export async function runOpenAIImageEdit({ prompt, images, size = "1024x1536", quality } = {}) {
  const key = String(process.env.OPENAI_API_KEY || "").trim();
  if (!key) {
    const error = new Error("OPENAI_API_KEY is not configured for image execution.");
    error.code = "openai_image_provider_not_configured";
    error.statusCode = 503;
    throw error;
  }

  const safePrompt = requiredPrompt(prompt);
  const safeImages = normalizedImages(images);
  const model = IMAGE_MODEL();
  const form = new FormData();
  form.set("model", model);
  form.set("prompt", safePrompt);
  form.set("size", String(size || "1024x1536"));
  form.set("quality", normalizedQuality(quality));
  form.set("output_format", "jpeg");

  for (const image of safeImages) {
    form.append("image[]", new Blob([image.bytes], { type: image.contentType }), image.filename);
  }

  const response = await fetch(`${API_BASE()}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `OpenAI Image API ${response.status}`);
    error.code = payload?.error?.code || "openai_image_execution_failed";
    error.statusCode = response.status || 502;
    throw error;
  }

  const encoded = payload?.data?.[0]?.b64_json;
  if (!encoded) {
    const error = new Error("OpenAI Image API returned no image bytes.");
    error.code = "openai_image_output_missing";
    error.statusCode = 502;
    throw error;
  }
  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length) {
    const error = new Error("OpenAI Image API returned an empty image.");
    error.code = "openai_image_output_empty";
    error.statusCode = 502;
    throw error;
  }

  return {
    bytes,
    contentType: "image/jpeg",
    provider: "openai",
    model,
    quality: normalizedQuality(quality),
    createdAt: payload?.created ? new Date(Number(payload.created) * 1000).toISOString() : null,
    usage: payload?.usage || null
  };
}
