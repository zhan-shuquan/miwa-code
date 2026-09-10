import pool from "../db.js";
import { formalizeProductSourceAssets } from "../src/services/product-asset-intake-service.js";
import { reconcile1688SourceAssetRoles } from "../src/services/product-asset-role-service.js";

const EXPECTED_SOURCE_REF = "855305580969";

async function main() {
  const sourceRef = String(process.env.AIONE_PRODUCT_ASSET_SOURCE_REF || "").trim();
  if (sourceRef !== EXPECTED_SOURCE_REF) {
    throw Object.assign(new Error("Product Asset Intake V1 is hard-locked to the verified 1688 sourceRef."), {
      code: "product_asset_acceptance_source_ref_mismatch",
      details: { expected: EXPECTED_SOURCE_REF, received: sourceRef || null }
    });
  }

  const intake = await formalizeProductSourceAssets({
    sourceRef,
    bucketName: process.env.AIONE_PRODUCT_ASSET_BUCKET
  });

  const roleReconciliation = await reconcile1688SourceAssetRoles({
    productId: intake.productId,
    sourceRef
  });

  process.stdout.write(`${JSON.stringify({
    contract: "AIONE Product Asset Intake Backend Closure V1",
    ...intake,
    roles: roleReconciliation.roles,
    roleCounts: roleReconciliation.roleCounts,
    reconciledAssetCount: roleReconciliation.reconciledAssetCount,
    updatedRoleCount: roleReconciliation.updatedRoleCount
  }, null, 2)}\n`);
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error.code || "product_asset_intake_failed",
      message: error.message,
      details: error.details || undefined
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
