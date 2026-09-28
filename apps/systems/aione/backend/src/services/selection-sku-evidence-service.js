import pool from "../../db.js";
import { fetch1688ProductByUrl } from "../integrations/alibaba1688-client.js";

function clean(value, maxLength = 2000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeSkuEvidence(sku = {}) {
  return {
    sourceSkuId: clean(sku.skuId, 240) || null,
    sourceSpec: clean(sku.spec, 1000) || null,
    sourcePrice: Number.isFinite(Number(sku.price)) ? Number(sku.price) : null,
    sourceStock: Number.isFinite(Number(sku.stock)) ? Number(sku.stock) : null
  };
}

export async function auditSelectionSkuEvidence(selectionId) {
  const id = clean(selectionId, 240);
  if (!id) {
    const error = new Error("Selection id is required.");
    error.statusCode = 400;
    error.code = "selection_id_required";
    throw error;
  }

  const selectionResult = await pool.query(
    `SELECT id, selection_no, title, source_platform, source_ref, source_url, lifecycle_status
     FROM public.product_opportunities
     WHERE id = $1 AND archived_at IS NULL
     LIMIT 1`,
    [id]
  );
  if (!selectionResult.rowCount) {
    const error = new Error("Selection not found.");
    error.statusCode = 404;
    error.code = "selection_not_found";
    throw error;
  }

  const selection = selectionResult.rows[0];
  const sourcePlatform = clean(selection.source_platform, 80).toLowerCase();
  if (sourcePlatform !== "1688") {
    return {
      selection: {
        id: selection.id,
        selectionNo: selection.selection_no,
        title: selection.title,
        lifecycleStatus: selection.lifecycle_status,
        sourcePlatform: selection.source_platform,
        sourceRef: selection.source_ref,
        sourceUrl: selection.source_url
      },
      evidence: {
        status: "unsupported_source",
        source: selection.source_platform || null,
        sufficientForAutomaticSkuInheritance: false,
        skuCount: 0,
        skus: [],
        reason: "CURRENT automatic SKU evidence audit supports 1688 source data only."
      }
    };
  }

  const sourceUrl = clean(selection.source_url, 3000);
  if (!sourceUrl) {
    return {
      selection: {
        id: selection.id,
        selectionNo: selection.selection_no,
        title: selection.title,
        lifecycleStatus: selection.lifecycle_status,
        sourcePlatform: selection.source_platform,
        sourceRef: selection.source_ref,
        sourceUrl: null
      },
      evidence: {
        status: "missing_source_url",
        source: "1688_open_platform",
        sufficientForAutomaticSkuInheritance: false,
        skuCount: 0,
        skus: [],
        reason: "Selection has no 1688 source URL to audit."
      }
    };
  }

  const result = await fetch1688ProductByUrl(sourceUrl);
  const product = result?.product || {};
  const skus = (Array.isArray(product.skus) ? product.skus : []).map(normalizeSkuEvidence);
  const structurallyUsable = skus.filter((sku) => sku.sourceSkuId && sku.sourceSpec);
  const sufficient = skus.length > 0 && structurallyUsable.length === skus.length;

  return {
    selection: {
      id: selection.id,
      selectionNo: selection.selection_no,
      title: selection.title,
      lifecycleStatus: selection.lifecycle_status,
      sourcePlatform: selection.source_platform,
      sourceRef: selection.source_ref,
      sourceUrl: selection.source_url
    },
    evidence: {
      status: sufficient ? "sufficient" : skus.length ? "incomplete" : "missing",
      source: product.source || "1688_open_platform",
      fetchedAt: product.fetchedAt || null,
      offerId: product.offerId || result?.offerId || selection.source_ref || null,
      factsAvailableSkus: Boolean(product?.factsAvailable?.skus),
      skuCount: skus.length,
      usableSkuCount: structurallyUsable.length,
      sufficientForAutomaticSkuInheritance: sufficient,
      skus,
      reason: sufficient
        ? "1688 returned structured source SKU ids and specifications for every SKU."
        : skus.length
          ? "1688 returned SKU rows, but one or more rows are missing sourceSkuId or sourceSpec."
          : "1688 did not return structured SKU evidence for this product."
    }
  };
}
