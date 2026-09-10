import pool from "../db.js";
import { recordBusinessEvent } from "../src/services/event-service.js";
import { convertProductOpportunityToProduct } from "../src/services/product-lifecycle-service.js";

const EXPECTED_SOURCE_PLATFORM = "1688";
const EXPECTED_SOURCE_REF = "855305580969";
const CONFIRMATION_REF = "02|AIONE系统:855305580969:2026-09-10";

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
    fail("Expected exactly one existing Product for the converted ProductOpportunity.", { count: result.rowCount });
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

async function ensureHumanConfirmationEvidence(opportunity, context) {
  const existing = await pool.query(
    `SELECT id
       FROM public.business_events
      WHERE event_type='selection.human_confirmation_recorded'
        AND object_type='product_opportunity'
        AND object_id=$1
        AND correlation_id=$2
      LIMIT 1`,
    [opportunity.id, CONFIRMATION_REF]
  );
  if (existing.rowCount) return { eventId: existing.rows[0].id, reused: true };

  const eventId = await recordBusinessEvent(pool, {
    eventType: "selection.human_confirmation_recorded",
    objectType: "product_opportunity",
    objectId: opportunity.id,
    context: { ...context, correlationId: CONFIRMATION_REF },
    payload: {
      decision: "selected",
      confirmedByHuman: true,
      confirmationChannel: "02|AIONE系统",
      sourcePlatform: EXPECTED_SOURCE_PLATFORM,
      sourceRef: EXPECTED_SOURCE_REF,
      historicalLifecycleStatus: opportunity.lifecycle_status
    }
  });
  return { eventId, reused: false };
}

async function loadConfirmationEvidence(opportunityId) {
  const result = await pool.query(
    `SELECT id, event_type, object_type, object_id, actor_kind, actor_person_id,
            correlation_id, payload, source_system
       FROM public.business_events
      WHERE event_type='selection.human_confirmation_recorded'
        AND object_type='product_opportunity'
        AND object_id=$1
        AND correlation_id=$2
      ORDER BY id
      LIMIT 2`,
    [opportunityId, CONFIRMATION_REF]
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
    correlationId: CONFIRMATION_REF
  };

  let opportunity = await loadOpportunity();
  const startingStatus = opportunity.lifecycle_status;
  if (startingStatus !== "converted") {
    fail("This acceptance is for the already-converted historical ProductOpportunity and must not mutate lifecycle state.", {
      expectedLifecycleStatus: "converted",
      actualLifecycleStatus: startingStatus
    });
  }

  const productBefore = await loadProduct(opportunity.id);
  const confirmation = await ensureHumanConfirmationEvidence(opportunity, executionContext);

  const firstConversion = await convertProductOpportunityToProduct({
    opportunityId: opportunity.id,
    skuCount: 1,
    context: executionContext
  });
  const secondConversion = await convertProductOpportunityToProduct({
    opportunityId: opportunity.id,
    skuCount: 1,
    context: executionContext
  });

  opportunity = await loadOpportunity();
  const product = await loadProduct(opportunity.id);
  const skus = await loadSkus(product.id);
  const confirmationEvents = await loadConfirmationEvidence(opportunity.id);
  const productCode = String(product.product_code || "");
  const metadata = opportunity.metadata && typeof opportunity.metadata === "object" ? opportunity.metadata : {};
  const evidence = confirmationEvents[0] || null;

  const checks = {
    historicalOpportunityRemainsConverted: opportunity.lifecycle_status === "converted",
    exactlyOneExistingProduct: String(product.id) === String(productBefore.id),
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
    sourcePriceNotPromotedToFinalCost: product.cost_amount == null,
    hasDraftSku: skus.length >= 1 && skus.every((sku) => sku.lifecycle_status === "draft"),
    skuCodesBelongToProduct: skus.length >= 1 && skus.every((sku) => String(sku.sku_code || "").startsWith(`${productCode}-`)),
    firstConversionReusedExistingProduct: firstConversion.reused === true && String(firstConversion.product.id) === String(product.id),
    secondConversionReusedExistingProduct: secondConversion.reused === true && String(secondConversion.product.id) === String(product.id),
    exactlyOneConfirmationEvidence: confirmationEvents.length === 1,
    confirmationEvidenceTruthful: Boolean(
      evidence &&
      evidence.actor_kind === "system" &&
      evidence.actor_person_id == null &&
      evidence.payload?.confirmedByHuman === true &&
      String(evidence.payload?.sourceRef || "") === EXPECTED_SOURCE_REF &&
      String(evidence.payload?.confirmationChannel || "") === "02|AIONE系统"
    )
  };

  const failures = Object.entries(checks)
    .filter(([, value]) => value !== true)
    .map(([check, value]) => ({ check, value }));

  const summary = {
    ok: failures.length === 0,
    contract: "AIONE Product Lifecycle Acceptance V1 - existing converted object",
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
    confirmationEventId: confirmation.eventId,
    confirmationEventReused: confirmation.reused,
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
