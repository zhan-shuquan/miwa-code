import pool from "../db.js";
import { recordBusinessEvent } from "../src/services/event-service.js";

const PRODUCT_CODE = "MH0000002";
const WRITE_GUARD = "YES";
const EXPECTED_TRUTH = Object.freeze({
  setCount: 6,
  actualVariants: ["白色", "米色", "卡其", "军绿", "深灰", "黑色"],
  approvedPrimaryValue: "秋冬男士中筒条纹6双套装",
  sellingPoints: ["6双6色组合", "中筒条纹设计", "高弹袜口", "Y形/拼色后跟", "秋冬男袜"],
  supportedSize: "24–27cm"
});

// The earlier Design Center trial incorrectly promoted the supplier's 39–45
// shoe-size notation into canonical Japanese sock supportedSize. That value is
// allowed to be corrected exactly once; all other non-null conflicts still stop.
const ALLOWED_CORRECTIONS = Object.freeze({
  supportedSize: ["39–45", "39-45"]
});

function equalJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function coreFacts(data = {}) {
  return {
    setCount: data.setCount ?? null,
    actualVariants: data.actualVariants ?? null,
    approvedPrimaryValue: data.approvedPrimaryValue ?? null,
    sellingPoints: data.sellingPoints ?? null,
    supportedSize: data.supportedSize ?? null
  };
}

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

async function main() {
  if (String(process.env.AIONE_ALLOW_MH0000002_TRUTH_RECONCILE || "").trim() !== WRITE_GUARD) {
    fail("write_guard_required", "Explicit write guard is required.");
  }
  const requestedProduct = String(process.env.AIONE_DESIGN_PRODUCT_CODE || PRODUCT_CODE).trim();
  if (requestedProduct !== PRODUCT_CODE) {
    fail("wrong_product_guard", `This reconciler is locked to ${PRODUCT_CODE}.`, { requestedProduct });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT id, product_code, name, lifecycle_status, product_data, record_version
         FROM public.products
        WHERE product_code=$1 AND archived_at IS NULL
        LIMIT 2
        FOR UPDATE`,
      [PRODUCT_CODE]
    );
    if (result.rowCount !== 1) {
      fail(result.rowCount ? "product_code_ambiguous" : "product_not_found", result.rowCount ? "Product code is ambiguous." : "Product not found.");
    }

    const product = result.rows[0];
    const before = product.product_data && typeof product.product_data === "object" ? product.product_data : {};
    const patch = {};
    const alreadyCorrect = [];
    const correctedKeys = [];
    const conflicts = [];

    for (const [key, expected] of Object.entries(EXPECTED_TRUTH)) {
      const current = before[key];
      if (current === undefined || current === null) {
        patch[key] = expected;
      } else if (equalJson(current, expected)) {
        alreadyCorrect.push(key);
      } else if ((ALLOWED_CORRECTIONS[key] || []).some((legacy) => equalJson(current, legacy))) {
        patch[key] = expected;
        correctedKeys.push({ key, from: current, to: expected });
      } else {
        conflicts.push({ key, current, expected });
      }
    }

    if (conflicts.length) {
      fail("confirmed_product_truth_conflict", "Existing non-null Product Truth conflicts with the confirmed MH0000002 facts. Nothing was changed.", { conflicts });
    }

    const writtenKeys = Object.keys(patch);
    let after = before;
    let recordVersion = Number(product.record_version || 1);

    if (writtenKeys.length) {
      after = { ...before, ...patch };
      const update = await client.query(
        `UPDATE public.products
            SET product_data=$2::jsonb,
                updated_at=NOW(),
                record_version=record_version+1
          WHERE id=$1
          RETURNING product_data, record_version`,
        [product.id, JSON.stringify(after)]
      );
      after = update.rows[0].product_data;
      recordVersion = Number(update.rows[0].record_version);

      await recordBusinessEvent(client, {
        eventType: "product.truth_reconciled",
        objectType: "product",
        objectId: product.id,
        actorKind: "system",
        context: { sourceSystem: "aione-mh0000002-truth-reconcile-v1" },
        payload: {
          productCode: PRODUCT_CODE,
          writtenKeys,
          correctedKeys,
          preservedExistingKeys: Object.keys(before).filter((key) => !writtenKeys.includes(key)),
          reason: correctedKeys.length
            ? "correct previously misclassified supplier shoe-size notation to confirmed Japanese sock supported size"
            : "confirmed real-product truth required by Design Center V1"
        }
      });
    }

    for (const [key, expected] of Object.entries(EXPECTED_TRUTH)) {
      if (!equalJson(after[key], expected)) {
        fail("postcondition_failed", `Product Truth postcondition failed for ${key}.`, { key, actual: after[key], expected });
      }
    }

    await client.query("COMMIT");
    process.stdout.write(`${JSON.stringify({
      ok: true,
      productCode: PRODUCT_CODE,
      productId: product.id,
      mode: writtenKeys.length ? (correctedKeys.length ? "CORRECT_CONFIRMED_FACTS" : "WRITE_MISSING_CONFIRMED_FACTS") : "IDEMPOTENT_NO_CHANGE",
      writtenKeys,
      correctedKeys,
      alreadyCorrect,
      recordVersion,
      coreFacts: coreFacts(after),
      migration: false,
      imageGenerated: false
    }, null, 2)}\n`);
    process.stdout.write("[AIONE] MH0000002 PRODUCT TRUTH RECONCILE PASS - CONFIRMED FACTS ONLY\n");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.code || "mh0000002_product_truth_reconcile_failed",
    message: error.message,
    details: error.details || undefined
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
