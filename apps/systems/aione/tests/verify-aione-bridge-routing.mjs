import assert from "node:assert/strict";
import { backendTarget } from "../api/aione-bridge.js";

const original = {
  vercelEnv: process.env.VERCEL_ENV,
  previewUrl: process.env.AIONE_PREVIEW_BACKEND_URL,
  previewAudience: process.env.AIONE_PREVIEW_BACKEND_AUDIENCE
};

try {
  process.env.VERCEL_ENV = "preview";
  delete process.env.AIONE_PREVIEW_BACKEND_URL;
  delete process.env.AIONE_PREVIEW_BACKEND_AUDIENCE;
  assert.deepEqual(backendTarget(), { error: "aione_preview_backend_not_configured" });

  process.env.AIONE_PREVIEW_BACKEND_URL = "https://aione-backend-preview.example/";
  assert.deepEqual(backendTarget(), {
    backendUrl: "https://aione-backend-preview.example",
    backendAudience: "https://aione-backend-preview.example"
  });

  process.env.AIONE_PREVIEW_BACKEND_AUDIENCE = "https://preview-audience.example";
  assert.equal(backendTarget().backendAudience, "https://preview-audience.example");

  process.env.VERCEL_ENV = "production";
  process.env.AIONE_PREVIEW_BACKEND_URL = "https://must-not-be-used.example";
  assert.deepEqual(backendTarget(), {
    backendUrl: "https://aione-backend-current-jjlnxogxta-an.a.run.app",
    backendAudience: "https://aione-backend-current-jjlnxogxta-an.a.run.app"
  });

  console.log("AIONE bridge Preview fail-closed and Production isolation PASS.");
} finally {
  const restore = (key, value) => value === undefined ? delete process.env[key] : process.env[key] = value;
  restore("VERCEL_ENV", original.vercelEnv);
  restore("AIONE_PREVIEW_BACKEND_URL", original.previewUrl);
  restore("AIONE_PREVIEW_BACKEND_AUDIENCE", original.previewAudience);
}
