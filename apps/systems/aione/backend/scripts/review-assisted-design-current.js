import pool, { withTransaction } from "../db.js";
import { reviewDesignTask } from "../src/services/design-task-service.js";
import { recordBusinessEvent } from "../src/services/event-service.js";

const TRANSITIONAL_ADMIN_EMAIL = "info@miwa-happyhouse.com";

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function parseReviewDetail() {
  const detailBase64 = String(process.env.AIONE_REVIEW_DETAIL_B64 || "").trim();
  const detailJson = detailBase64
    ? Buffer.from(detailBase64, "base64").toString("utf8")
    : String(process.env.AIONE_REVIEW_DETAIL_JSON || "").trim();
  if (!detailJson) return {};
  try {
    return JSON.parse(detailJson);
  } catch {
    fail("AIONE review detail payload must decode to valid JSON.");
  }
}

async function resolveHumanActor(email) {
  if (!email || !email.includes("@")) fail("AIONE_REVIEW_HUMAN_EMAIL is required.");
  if (email === TRANSITIONAL_ADMIN_EMAIL) fail("The transitional admin identity cannot be used as human review evidence.");

  const result = await pool.query(`
    SELECT DISTINCT p.id
      FROM public.people p
      JOIN public.external_identities e ON e.person_id=p.id
     WHERE p.status='active' AND p.archived_at IS NULL
       AND e.status='active' AND LOWER(e.provider)='google'
       AND LOWER(COALESCE(p.primary_email,e.email_snapshot,''))=$1
  `, [email]);

  if (result.rowCount !== 1) {
    fail("Explicit review email must resolve to exactly one active canonical Google human identity.", { candidateCount: result.rowCount });
  }
  return result.rows[0].id;
}

async function reviewDerivedAsset(assetId, outcome, detail, personId) {
  const statusMap = {
    approve: "approved",
    reject: "rejected",
    regenerate: "regenerate_requested"
  };
  const reviewStatus = statusMap[outcome];
  const context = {
    personId,
    actorKind: "human",
    sourceSystem: "aione-assisted-design-explicit-review-v1"
  };

  return withTransaction(async (client) => {
    const assetResult = await client.query(
      `SELECT * FROM public.product_assets
        WHERE id=$1 AND archived_at IS NULL
        LIMIT 1`,
      [assetId]
    );
    if (assetResult.rowCount !== 1) fail("Review ProductAsset was not found.", { assetId });
    const asset = assetResult.rows[0];
    const metadata = asset.metadata || {};
    if (metadata.layer !== "DERIVED") {
      fail("Only DERIVED ProductAssets can be reviewed through asset review mode.", {
        assetId,
        layer: metadata.layer || null
      });
    }

    const currentReview = metadata.review && typeof metadata.review === "object" && !Array.isArray(metadata.review)
      ? metadata.review
      : {};
    if (currentReview.status && currentReview.status !== "pending" && currentReview.status !== reviewStatus) {
      fail("DERIVED ProductAsset already has a conflicting explicit review outcome.", {
        assetId,
        currentStatus: currentReview.status,
        requestedStatus: reviewStatus
      });
    }

    const reviewedAt = new Date().toISOString();
    const nextMetadata = {
      ...metadata,
      review: {
        ...currentReview,
        status: reviewStatus,
        reviewedByPersonId: personId,
        reviewedAt,
        detail: detail || {}
      }
    };

    const updated = await client.query(
      `UPDATE public.product_assets
          SET metadata=$2::jsonb,
              updated_by_person_id=$3,
              updated_at=NOW(),
              record_version=record_version+1
        WHERE id=$1
        RETURNING *`,
      [assetId, JSON.stringify(nextMetadata), personId]
    );

    const eventType = reviewStatus === "approved"
      ? "product.design_output_asset_approved"
      : reviewStatus === "rejected"
        ? "product.design_output_asset_rejected"
        : "product.design_output_asset_regeneration_requested";

    await recordBusinessEvent(client, {
      eventType,
      objectType: "product",
      objectId: asset.product_id,
      context,
      payload: { assetId, reviewStatus, detail: detail || {} }
    });

    return updated.rows[0];
  });
}

async function main() {
  const taskId = String(process.env.AIONE_REVIEW_TASK_ID || "").trim();
  const assetId = String(process.env.AIONE_REVIEW_ASSET_ID || "").trim();
  const outcome = String(process.env.AIONE_REVIEW_OUTCOME || "").trim().toLowerCase();
  const email = normalizeEmail(process.env.AIONE_REVIEW_HUMAN_EMAIL);
  if (!taskId && !assetId) fail("AIONE_REVIEW_TASK_ID or AIONE_REVIEW_ASSET_ID is required.");
  if (taskId && assetId) fail("Review exactly one target: task or DERIVED ProductAsset.");
  if (!new Set(["approve", "reject", "regenerate"]).has(outcome)) {
    fail("AIONE_REVIEW_OUTCOME must be approve, reject or regenerate.");
  }

  const detail = parseReviewDetail();
  const personId = await resolveHumanActor(email);

  if (assetId) {
    const asset = await reviewDerivedAsset(assetId, outcome, detail, personId);
    process.stdout.write(`${JSON.stringify({
      contract: "AIONE Assisted Design Explicit Human Review V1",
      ok: true,
      reviewTarget: "derived-product-asset",
      assetId: asset.id,
      productId: asset.product_id,
      reviewStatus: asset.metadata?.review?.status || null,
      humanEmail: email,
      reviewedByPersonId: asset.metadata?.review?.reviewedByPersonId || null,
      reviewDetail: asset.metadata?.review?.detail || {}
    }, null, 2)}\n`);
    process.stdout.write("[AIONE] ASSISTED DESIGN EXPLICIT HUMAN REVIEW V1 PASS\n");
    return;
  }

  const context = { personId, actorKind: "human", sourceSystem: "aione-assisted-design-explicit-review-v1" };
  const task = await withTransaction((client) => reviewDesignTask(client, taskId, { outcome, detail }, context));

  process.stdout.write(`${JSON.stringify({
    contract: "AIONE Assisted Design Explicit Human Review V1",
    ok: true,
    reviewTarget: "design-task",
    taskId: task.id,
    reviewStatus: task.review_status,
    humanEmail: email,
    reviewedByPersonId: task.reviewed_by_person_id,
    reviewDetail: task.review_detail
  }, null, 2)}\n`);
  process.stdout.write("[AIONE] ASSISTED DESIGN EXPLICIT HUMAN REVIEW V1 PASS\n");
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.code || "assisted_design_review_failed",
    message: error.message,
    details: error.details || undefined
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
