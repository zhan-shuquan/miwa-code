import assert from "node:assert/strict";

process.env.OPENAI_API_KEY = "test-only-key";
process.env.OPENAI_API_BASE = "https://example.invalid/v1";
process.env.AIONE_AI_IMAGE_MODEL = "gpt-image-2.5-sunburst";
process.env.AIONE_AI_IMAGE_QUALITY = "medium";

const expectedBytes = Buffer.from("aione-image-test-output", "utf8");
let captured = null;
globalThis.fetch = async (url, options = {}) => {
  captured = { url, options };
  const form = options.body;
  assert.equal(form.get("model"), "gpt-image-2.5-sunburst");
  assert.equal(form.get("size"), "1024x1536");
  assert.equal(form.get("quality"), "medium");
  assert.equal(form.get("output_format"), "jpeg");
  assert.match(String(form.get("prompt")), /Rakuten benefit image/);
  const images = form.getAll("image[]");
  assert.equal(images.length, 2);
  return new Response(JSON.stringify({
    created: 1789110000,
    data: [{ b64_json: expectedBytes.toString("base64") }],
    usage: { total_tokens: 123 }
  }), { status: 200, headers: { "content-type": "application/json" } });
};

const { getOpenAIImageRuntimeStatus, runOpenAIImageEdit } = await import("../src/ai/openai-image-provider.js");
const status = getOpenAIImageRuntimeStatus();
assert.equal(status.configured, true);
assert.equal(status.model, "gpt-image-2.5-sunburst");

const result = await runOpenAIImageEdit({
  prompt: "Create a Rakuten benefit image from verified product truth.",
  images: [
    { bytes: Buffer.from("source-main"), contentType: "image/jpeg", filename: "main.jpg" },
    { bytes: Buffer.from("source-detail"), contentType: "image/png", filename: "detail.png" }
  ]
});

assert.equal(captured.url, "https://example.invalid/v1/images/edits");
assert.equal(captured.options.method, "POST");
assert.match(String(captured.options.headers.Authorization), /^Bearer /);
assert.deepEqual(result.bytes, expectedBytes);
assert.equal(result.provider, "openai");
assert.equal(result.model, "gpt-image-2.5-sunburst");
assert.equal(result.quality, "medium");
assert.equal(result.usage.total_tokens, 123);

process.stdout.write("[AIONE] OPENAI IMAGE PROVIDER CONTRACT PASS\n");
