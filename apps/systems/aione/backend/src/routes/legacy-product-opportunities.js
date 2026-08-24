import { Router } from "express";
import pool from "../../db.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM public.product_opportunities
      ORDER BY created_at DESC
    `);
    res.json({ items: result.rows, legacy: true });
  } catch (error) {
    next(error);
  }
});

export default router;
