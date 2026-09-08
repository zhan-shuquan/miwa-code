import { Router } from "express";
import { getCabinetUsage } from "../integrations/rakuten-rms-client.js";

const router = Router();

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

export default router;
