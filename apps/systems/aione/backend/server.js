import express from "express";
import pool from "./db.js";
import coreRouter from "./src/routes/core.js";
import currentUserRouter from "./src/routes/me.js";
import aiSecretaryRouter from "./src/routes/ai-secretary.js";
import integrations1688Router from "./src/routes/integrations-1688.js";
import integrationsRakutenRouter from "./src/routes/integrations-rakuten.js";
import driveAssetsRouter from "./src/routes/drive-assets.js";
import selectionsRouter from "./src/routes/selections.js";
import productLifecycleRouter from "./src/routes/product-lifecycle.js";
import productAssetsRouter from "./src/routes/product-assets.js";
import productAssetReadinessRouter from "./src/routes/product-asset-readiness.js";
import productMaterialConfirmationRouter from "./src/routes/product-material-confirmation.js";
import rakutenCanonicalPublishRouter from "./src/routes/rakuten-canonical-publish.js";
import designRouter from "./src/routes/design.js";
import designCenterRouter from "./src/routes/design-center.js";
import { resolveAioneGoogleIdentity } from "./src/http/google-auth.js";

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

// Local Preview may run the static frontend on :5500 and Backend on :8080.
const corsOrigins = new Set(String(process.env.AIONE_CORS_ORIGINS || "http://127.0.0.1:5500,http://localhost:5500").split(",").map((item) => item.trim()).filter(Boolean));
app.use((req, res, next) => {
  const origin = req.header("origin");
  if (origin && corsOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, x-aione-person-id, x-aione-assignment-id, x-aione-source-system, x-correlation-id");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, Content-Length, X-AIONE-Asset-Id");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/health", async (req, res) => {
  try {
    const [dbResult, migrationResult] = await Promise.all([
      pool.query("SELECT NOW() AS database_time"),
      pool.query("SELECT version, applied_at FROM public.schema_migrations ORDER BY applied_at DESC LIMIT 1").catch(() => ({ rows: [] }))
    ]);
    res.json({
      ok: true,
      service: "aione-backend",
      apiVersion: "v1",
      database: "connected",
      databaseTime: dbResult.rows[0].database_time,
      latestMigration: migrationResult.rows[0] || null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, database: "disconnected" });
  }
});

function cookieValue(header, name) {
  const prefix = `${name}=`;
  for (const part of String(header || "").split(";")) {
    const item = part.trim();
    if (item.startsWith(prefix)) return decodeURIComponent(item.slice(prefix.length));
  }
  return "";
}

// Branch Preview only. Production leaves this disabled, so these files are not served.
const designCenterPreviewEnabled = String(process.env.AIONE_ENABLE_DESIGN_CENTER_PREVIEW || "false").toLowerCase() === "true";
if (designCenterPreviewEnabled) {
  const previewRoot = String(process.env.AIONE_DESIGN_CENTER_PREVIEW_ROOT || "/app/design-center-preview").trim();
  const previewAccessToken = String(process.env.AIONE_PREVIEW_ACCESS_TOKEN || "").trim();

  // Direct branch preview may be exposed through an isolated Cloud Run service.
  // The service can be IAM-public only when this application token gate is configured.
  // A valid URL token establishes a short-lived secure same-origin cookie so subsequent
  // static assets and API calls do not need to carry the token in every request.
  if (previewAccessToken) {
    app.use((req, res, next) => {
      const supplied = String(req.query?.preview_key || "").trim();
      const cookie = cookieValue(req.header("cookie"), "aione_preview_access");
      const accepted = supplied === previewAccessToken || cookie === previewAccessToken;
      if (!accepted) {
        return res.status(401).type("text/plain").send("AIONE Design Center preview access required.");
      }
      if (supplied === previewAccessToken && cookie !== previewAccessToken) {
        res.append("Set-Cookie", `aione_preview_access=${encodeURIComponent(previewAccessToken)}; Path=/; Max-Age=21600; HttpOnly; Secure; SameSite=Lax`);
      }
      next();
    });
  }

  app.get("/", (_req, res) => res.redirect("/design-center-v1.html?product=MH0000002"));
  app.use(express.static(previewRoot, { index: false, fallthrough: true, maxAge: 0 }));
}

// Production API requests must resolve a real Google identity server-side.
// Cloud Run IAM remains a separate service-to-service boundary in front of this middleware.
app.use(resolveAioneGoogleIdentity);

app.use("/api/v1/me", currentUserRouter);
app.use("/api/v1/ai-secretary", aiSecretaryRouter);
app.use("/api/v1/integrations/1688", integrations1688Router);
app.use("/api/v1/integrations/rakuten", integrationsRakutenRouter);
app.use("/api/v1/drive-assets", driveAssetsRouter);
app.use("/api/v1/selections", selectionsRouter);
app.use("/api/v1/product-lifecycle", productLifecycleRouter);
app.use("/api/v1/product-assets", productAssetsRouter);
app.use("/api/v1/product-assets", productAssetReadinessRouter);
app.use("/api/v1", productMaterialConfirmationRouter);
app.use("/api/v1", rakutenCanonicalPublishRouter);
app.use("/api/v1", designRouter);
app.use("/api/v1", designCenterRouter);
app.use("/api/v1", coreRouter);

app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  const status = error.statusCode || (error.code === "23505" ? 409 : error.code === "23503" ? 409 : 500);
  res.status(status).json({
    error: error.code || (status === 500 ? "internal_error" : status === 401 ? "authenticated_actor_required" : status === 400 ? "bad_request" : "data_conflict"),
    message: status === 500 ? "AIONE backend request failed." : (error.message || "AIONE request failed."),
    missing: error.missing || undefined,
    remoteCode: error.remoteCode || undefined,
    detail: process.env.NODE_ENV === "production" ? undefined : error.message
  });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`AIONE Backend API listening on port ${port}`);
});
