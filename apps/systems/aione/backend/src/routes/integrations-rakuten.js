import { Router } from "express";
import pool from "../../db.js";
import { requireWriteActor } from "../http/context.js";
import {
  createCabinetFolder,
  getAllCabinetFolders,
  getCabinetFolders,
  getCabinetUsage
} from "../integrations/rakuten-rms-client.js";

const router = Router();

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

router.get("/cabinet/usage", async (req, res, next) => {
  try {
    const usage = await getCabinetUsage();
    res.json({
      ok: true,
      provider: "rakuten-rms",
      service: "CabinetAPI",
      usage
    });
  } catch (error) {
    next(error);
  }
});

router.get("/cabinet/folders", async (req, res, next) => {
  try {
    const offset = Number(req.query.offset || 1);
    const limit = Number(req.query.limit || 100);
    const result = await getCabinetFolders({ offset, limit });
    res.json({
      ok: true,
      provider: "rakuten-rms",
      service: "CabinetAPI",
      ...result
    });
  } catch (error) {
    next(error);
  }
});

router.post("/cabinet/folders/ensure", requireWriteActor, async (req, res, next) => {
  try {
    const shopRef = cleanText(req.body?.shopRef, 240);
    const containerCode = cleanText(req.body?.containerCode, 120).toLowerCase();
    if (!shopRef || !/^rkc\d{3,}$/i.test(containerCode)) {
      return res.status(400).json({
        error: "bad_request",
        message: "shopRef and a containerCode such as rkc001 are required."
      });
    }

    const containerResult = await pool.query(
      `SELECT *
         FROM public.channel_asset_containers
        WHERE channel='rakuten' AND shop_ref=$1 AND container_code=$2
          AND archived_at IS NULL
        LIMIT 1`,
      [shopRef, containerCode]
    );
    if (!containerResult.rowCount) {
      return res.status(404).json({
        error: "rakuten_container_not_found",
        message: "AIONE Rakuten container is not configured for this shop."
      });
    }

    const folders = await getAllCabinetFolders();
    let folder = folders.find((item) => String(item.folderName || "").trim().toLowerCase() === containerCode);
    let created = false;

    if (!folder) {
      const createdFolder = await createCabinetFolder({ folderName: containerCode });
      created = true;
      folder = createdFolder.folderId
        ? {
            folderId: createdFolder.folderId,
            folderName: createdFolder.folderName || containerCode,
            upperFolderId: null,
            folderPath: null,
            fileCount: 0
          }
        : null;

      if (!folder) {
        const refreshedFolders = await getAllCabinetFolders();
        folder = refreshedFolders.find((item) => String(item.folderName || "").trim().toLowerCase() === containerCode) || null;
      }
    }

    if (!folder?.folderId) {
      const error = new Error("Rakuten folder was created or found, but folderId could not be resolved.");
      error.statusCode = 502;
      error.code = "rakuten_folder_id_unresolved";
      throw error;
    }

    const metadata = {
      ...(containerResult.rows[0].metadata || {}),
      rakutenFolderId: folder.folderId,
      rakutenFolderName: folder.folderName || containerCode,
      rakutenFolderPath: folder.folderPath || null,
      rakutenFolderSyncedAt: new Date().toISOString()
    };

    const updated = await pool.query(
      `UPDATE public.channel_asset_containers
          SET metadata=$1::jsonb,
              updated_at=NOW(),
              updated_by_person_id=$2,
              record_version=record_version+1
        WHERE id=$3
        RETURNING *`,
      [JSON.stringify(metadata), req.aioneContext?.personId || null, containerResult.rows[0].id]
    );

    res.json({
      ok: true,
      provider: "rakuten-rms",
      service: "CabinetAPI",
      shopRef,
      containerCode,
      created,
      folder,
      container: updated.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

export default router;
