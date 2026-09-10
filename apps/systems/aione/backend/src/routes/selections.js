import { Router } from "express";
import pool from "../../db.js";

const router = Router();

const SORT_COLUMNS = Object.freeze({
  selectionDate: "o.selection_date",
  createdAt: "o.created_at",
  updatedAt: "o.updated_at",
  sourcePrice: "o.source_price",
  selectionNo: "o.selection_no"
});

function cleanText(value, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeLimit(value) {
  const parsed = Number(value ?? 50);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
}

function normalizeOffset(value) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

function snakeToCamel(row) {
  const out = {};
  for (const [key, value] of Object.entries(row || {})) {
    out[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
  }
  return out;
}

function selectionView(row) {
  const item = snakeToCamel(row);
  const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata : {};
  const sourceMaterialZip = metadata.sourceMaterialZip || null;
  delete item.totalCount;
  return {
    ...item,
    sourceMaterialZip,
    hasSourceMaterialZip: Boolean(sourceMaterialZip?.fileId)
  };
}

function addEqualsFilter(clauses, values, rawValue, column) {
  const value = cleanText(rawValue);
  if (!value) return;
  values.push(value);
  clauses.push(`${column} = $${values.length}`);
}

router.get("/", async (req, res, next) => {
  try {
    const context = req.aioneContext || {};
    const limit = normalizeLimit(req.query.limit);
    const offset = normalizeOffset(req.query.offset);
    const clauses = ["o.archived_at IS NULL"];
    const values = [];

    addEqualsFilter(clauses, values, req.query.lifecycleStatus, "o.lifecycle_status");
    addEqualsFilter(clauses, values, req.query.sourcePlatform, "o.source_platform");
    addEqualsFilter(clauses, values, req.query.sourceGroup, "o.source_group");
    addEqualsFilter(clauses, values, req.query.sourceFulfillmentHint, "o.source_fulfillment_hint");
    addEqualsFilter(clauses, values, req.query.categoryId, "o.category_id");
    addEqualsFilter(clauses, values, req.query.businessId, "o.business_id");

    const requestedOwner = cleanText(req.query.ownerPersonId, 240);
    const scope = cleanText(req.query.scope, 40).toLowerCase();
    if (scope === "mine") {
      if (!context.personId) return res.status(401).json({ error: "authenticated_actor_required" });
      values.push(context.personId);
      clauses.push(`o.owner_person_id = $${values.length}`);
    } else if (requestedOwner) {
      values.push(requestedOwner);
      clauses.push(`o.owner_person_id = $${values.length}`);
    }

    const q = cleanText(req.query.q, 300);
    if (q) {
      values.push(`%${q}%`);
      const p = `$${values.length}`;
      clauses.push(`(o.title ILIKE ${p} OR o.selection_no ILIKE ${p} OR o.source_ref ILIKE ${p} OR o.source_supplier_name ILIKE ${p})`);
    }

    const sortBy = SORT_COLUMNS[cleanText(req.query.sortBy, 40)] || SORT_COLUMNS.selectionDate;
    const sortDirection = cleanText(req.query.sortDirection, 8).toLowerCase() === "asc" ? "ASC" : "DESC";
    values.push(limit, offset);
    const limitParam = `$${values.length - 1}`;
    const offsetParam = `$${values.length}`;

    const result = await pool.query(
      `SELECT
         o.id, o.selection_no, o.selection_date, o.title,
         o.lifecycle_status, o.selection_mode,
         o.source_platform, o.source_ref, o.source_url, o.source_cover_image_url,
         o.source_price, o.source_currency, o.source_supplier_name, o.source_group,
         o.source_tags, o.source_note, o.source_weight_g, o.source_fulfillment_hint,
         o.source_added_at, o.first_imported_at, o.last_imported_at,
         o.classification_status, o.classification_confidence, o.classification_method,
         o.business_id, o.category_id, o.owner_person_id,
         o.estimated_cost, o.estimated_sale_price, o.currency,
         o.metadata, o.created_at, o.updated_at, o.record_version,
         COUNT(*) OVER()::INTEGER AS total_count
       FROM public.product_opportunities o
       WHERE ${clauses.join(" AND ")}
       ORDER BY ${sortBy} ${sortDirection} NULLS LAST, o.created_at DESC, o.id DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      values
    );

    const total = result.rowCount ? Number(result.rows[0].total_count || 0) : 0;
    return res.json({
      items: result.rows.map(selectionView),
      page: { limit, offset, total, hasMore: offset + result.rowCount < total },
      applied: {
        scope: scope || "all",
        q: q || null,
        lifecycleStatus: cleanText(req.query.lifecycleStatus) || null,
        sourcePlatform: cleanText(req.query.sourcePlatform) || null,
        sourceGroup: cleanText(req.query.sourceGroup) || null,
        sourceFulfillmentHint: cleanText(req.query.sourceFulfillmentHint) || null,
        categoryId: cleanText(req.query.categoryId) || null,
        businessId: cleanText(req.query.businessId) || null,
        ownerPersonId: scope === "mine" ? context.personId || null : requestedOwner || null,
        sortBy: Object.entries(SORT_COLUMNS).find(([, column]) => column === sortBy)?.[0] || "selectionDate",
        sortDirection: sortDirection.toLowerCase()
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = cleanText(req.params.id, 240);
    const result = await pool.query(
      `SELECT
         o.*,
         p.id AS converted_product_id,
         p.product_code AS converted_product_code,
         p.lifecycle_status AS converted_product_status
       FROM public.product_opportunities o
       LEFT JOIN public.products p
         ON p.source_opportunity_id = o.id AND p.archived_at IS NULL
       WHERE o.id = $1 AND o.archived_at IS NULL
       LIMIT 1`,
      [id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "selection_not_found" });

    const item = selectionView(result.rows[0]);
    return res.json({ selection: item });
  } catch (error) {
    return next(error);
  }
});

export default router;
