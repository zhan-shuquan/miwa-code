import pool from "../db.js";
import {
  selectProductOpportunity,
  convertProductOpportunityToProduct
} from "../src/services/product-lifecycle-service.js";

const EXPECTED_SOURCE_PLATFORM = "1688";
const EXPECTED_SOURCE_REF = "855305580969";
const EXPECTED_SKU_COUNT = 1;

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

async function loadOpportunity() {
  const result = await pool.query(
    `SELECT *
       FROM public.product_opportunities
      WHERE source_platform=$1
        AND source_ref=$2
        AND archived_at IS NULL
      ORDER BY created_at`,
    [EXPECTED_SOURCE_PLATFORM, EXPECTED_SOURCE_REF]
  );
  if (result.rowCount !== 1) {
    fail("Expected exactly one canonical ProductOpportunity.", { count: result.rowCount });
  }
  return result.rows[0];
}

async function loadProduct(opportunityId) {
  const result = await pool.query(
    `SELECT *
       FROM public.products
      WHERE source_opportunity_id=$1
        AND archived_at IS NULL
      ORDER BY created_at`,
    [opportunityId]
  );
  if (result.rowCount !== 1) {
    fail("Expected exactly one Product for the selected ProductOpportunity.", { count: result.rowCount });
  }
  return result.rows[0];
}

async function loadSkus(productId) {
  const result = await pool.query(
    `SELECT *
       FROM public.product_skus
      WHERE product_id=$1
        AND archived_at IS NULL
      ORDER BY sku_no`,
    [productId]
  );
  return result.rows;
}

async function main() {
  const requestedSourceRef = String(process.env.AIONE_ACCEPT_SOURCE_REF || "").trim();
  if (requestedSourceRef !== EXPECTED_SOURCE_REF) {
    fail("Lifecycle acceptance is hard-locked to the human-confirmed 1688 sourceRef.", {
      expected: EXPECTED_SOURCE_REF,
      received: requestedSourceRef || null
    });
  }

  const executionContext = {
    personId: null,
    actorKind: "system",
    sourceSystem: "aione-product-lifecycle-acceptance-v1",
    correlationId: `selection:${EXPECTED_SOURCE_REF}`
  };
  const decisionEvidence = {
    decision: "selected",
    confirmedByHuman: true,
    confirmationChannel: "02|AIONE系统",
    sourcePlatform: EXPECTED_SOURCE_PLATFORM,
    sourceRef: EXPECTED_SOURCE_REF
  };

  let opportunity = await loadOpportunity();
  const startingStatus = opportunity.lifecycle_status;
  if (!["pending", "selected", "converted"].includes(startingStatus)) {
    fail("ProductOpportunity is not eligible for lifecycle acceptance.", { lifecycleStatus: startingStatus });
  }

  if (startingStatus === "pending") {
    await selectProductOpportunity({
      opportunityId: opportunity.id,
      qualificationData: { decisionEvidence },
      context: executionContext
    });
  }

  opportunity = await loadOpportunity();
  if (!["selected", "converted"].includes(opportunity.lifecycle_status)) {
    fail("Selection decision did not reach selected state.", { lifecycleStatus: opportunity.lifecycle_status });
  }

  const firstConversion = await convertProductOpportunityToProduct({
    opportunityId: opportunity.id,
    skuCount: EXPECTED_SKU_COUNT,
    context: executionContext
  });

  const secondConversion = await convertProductOpportunityToProduct({
    opportunityId: opportunity.id,
    skuCount: EXPECTED_SKU_COUNT,
    context: executionContext
  });
  if (!secondConversion.reused) {
    fail("Second conversion must be idempotent and reuse the existing Product.");
  }

  opportunity = await loadOpportunity();
  const product = await loadProduct(opportunity.id);
  const skus = await loadSkus(product.id);
  const productCode = String(product.product_code || "");
  const metadata = opportunity.metadata && typeof opportunity.metadata === "object" ? opportunity.metadata : {};
  const qualificationData = opportunity.qualification_data && typeof opportunity.qualification_data === "object"
    ? opportunity.qualification_data
    : {};
  const storedDecision = qualificationData.decisionEvidence || null;

  const checks = {
    opportunityConverted: opportunity.lifecycle_status === "converted",
    productCodeValid: /^MH\d{7}$/.test(productCode),
    productDraft: product.lifecycle_status === "draft",
    sourceOpportunityLinked: String(product.source_opportunity_id) === String(opportunity.id),
    sourcePlatformRetained: String(product.source_platform) === EXPECTED_SOURCE_PLATFORM,
    sourceRefRetained: String(product.source_ref) === EXPECTED_SOURCE_REF,
    sourceUrlRetained: String(product.source_url || "") === String(opportunity.source_url || ""),
    selectionNoRetained: String(product.product_data?.selectionNo || "") === String(opportunity.selection_no || ""),
    sourceWeightRetained: Number(product.product_data?.sourceWeightG || 0) === Number(opportunity.source_weight_g || 0),
    conversionMetadataIdMatches: String(metadata.convertedProductId || "") === String(product.id),
    conversionMetadataCodeMatches: String(metadata.convertedProductCode || "") === productCode,
    decisionEvidenceRetained: Boolean(
      storedDecision &&
      storedDecision.confirmedByHuman === true &&
      String(storedDecision.sourceRef) === EXPECTED_SOURCE_REF
    ),
    sourcePriceNotPromotedToFinalCost: product.cost_amount == null,
    oneDraftSku: skus.length === EXPECTED_SKU_COUNT && skus.every((sku) => sku.lifecycle_status === "draft"),
    skuCodeValid: skus.length === 1 && String(skus[0].sku_code) === `${productCode}-01`,
    conversionIdempotent: String(firstConversion.product.id) === String(secondConversion.product.id)
  };

  const failures = Object.entries(checks)
    .filter(([, value]) => value !== true)
    .map(([check, value]) => ({ check, value }));

  const summary = {
    ok: failures.length === 0,
    contract: "AIONE Product Lifecycle Acceptance V1",
    sourcePlatform: EXPECTED_SOURCE_PLATFORM,
    sourceRef: EXPECTED_SOURCE_REF,
    startingStatus,
    finalStatus: opportunity.lifecycle_status,
    selectionNo: opportunity.selection_no,
    productId: product.id,
    productCode,
    productStatus: product.lifecycle_status,
    skuCodes: skus.map((sku) => sku.sku_code),
    firstConversionReused: firstConversion.reused,
    secondConversionReused: secondConversion.reused,
    checks,
    failures
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!summary.ok) process.exitCode = 20;
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error.code || "product_lifecycle_acceptance_failed",
      message: error.message,
      details: error.details || undefined
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
