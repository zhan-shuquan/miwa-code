import { Router } from "express";
import pool from "../../db.js";
import { getRequestContext } from "../http/context.js";
import { recordBusinessEvent } from "../services/event-service.js";
import { fetchDriveFileStream, isDriveProxyEnabled } from "../integrations/google-drive-client.js";
import { getMiwaDriveAsset, listMiwaDriveAssets, MIWA_DRIVE_RUNTIME } from "../integrations/miwa-drive-assets.js";
import { getSyncedDriveAsset, getDriveRegistrySyncStatus, syncMiwaManagedDriveFolders } from "../integrations/miwa-drive-registry-sync.js";
import { requireWriteActor } from "../http/context.js";

const router = Router();

function filenameHeader(fileName) {
  const safeFallback = String(fileName || "download").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 160) || "download";
  const encoded = encodeURIComponent(String(fileName || "download")).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${safeFallback}"; filename*=UTF-8''${encoded}`;
}

async function auditDownload(req, asset, outcome = "started") {
  try {
    const context = getRequestContext(req);
    await recordBusinessEvent(pool, {
      eventType: "corporate_asset.downloaded",
      objectType: "corporate_asset",
      objectId: asset.assetId,
      context,
      payload: {
        assetId: asset.assetId,
        sourceProvider: "google-drive",
        fileName: asset.fileName,
        driveFileId: asset.fileId,
        outcome
      }
    });
  } catch (error) {
    console.warn("AIONE corporate asset audit logging failed", { assetId: asset.assetId, message: error?.message || "unknown" });
  }
}

router.get("/", (req, res) => {
  const items = listMiwaDriveAssets().map((asset) => ({
    assetId: asset.assetId,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    visibility: asset.visibility,
    downloadable: asset.downloadable,
    current: asset.current,
    boundAt: asset.boundAt,
    downloadPath: `/api/v1/drive-assets/${encodeURIComponent(asset.assetId)}/download`
  }));
  res.json({
    provider: "google-drive",
    runtimeProxyEnabled: isDriveProxyEnabled(),
    sharedDrive: { id: MIWA_DRIVE_RUNTIME.sharedDriveId, name: MIWA_DRIVE_RUNTIME.sharedDriveName },
    items
  });
});

router.get("/sync/status", (req, res) => {
  res.json({ provider:"google-drive", registrySync:getDriveRegistrySyncStatus() });
});

router.post("/sync", requireWriteActor, async (req, res, next) => {
  try {
    const summary = await syncMiwaManagedDriveFolders({ force:true });
    res.json({ provider:"google-drive", registrySync:summary });
  } catch (error) { next(error); }
});

router.get("/synced/:assetId/download", async (req, res, next) => {
  try {
    const asset = await getSyncedDriveAsset(req.params.assetId);
    if (!asset || !asset.downloadable) return res.status(404).json({ error:"asset_not_found" });
    const result = await fetchDriveFileStream(asset);
    res.status(200);
    res.setHeader("Content-Type", result.contentType || asset.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", filenameHeader(result.exported ? asset.fileName.replace(/\.[^.]+$/, ".pdf") : asset.fileName));
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-AIONE-Asset-Id", asset.assetId);
    if (result.contentLength) res.setHeader("Content-Length", result.contentLength);
    await auditDownload(req, asset, "started");
    result.stream.on("error", (error) => {
      console.error("AIONE synced Drive stream failed", { assetId:asset.assetId, message:error?.message || "unknown" });
      if (!res.headersSent) next(error);
      else res.destroy(error);
    });
    result.stream.pipe(res);
  } catch (error) { next(error); }
});

router.get("/:assetId/download", async (req, res, next) => {
  const asset = getMiwaDriveAsset(req.params.assetId);
  if (!asset || !asset.downloadable) return res.status(404).json({ error: "asset_not_found" });

  try {
    const result = await fetchDriveFileStream(asset);
    res.status(200);
    res.setHeader("Content-Type", result.contentType || asset.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", filenameHeader(result.exported ? asset.fileName.replace(/\.[^.]+$/, ".pdf") : asset.fileName));
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-AIONE-Asset-Id", asset.assetId);
    if (result.contentLength) res.setHeader("Content-Length", result.contentLength);

    await auditDownload(req, asset, "started");
    result.stream.on("error", (error) => {
      console.error("AIONE Drive stream failed", { assetId: asset.assetId, message: error?.message || "unknown" });
      if (!res.headersSent) next(error);
      else res.destroy(error);
    });
    result.stream.pipe(res);
  } catch (error) {
    return next(error);
  }
});

export default router;
