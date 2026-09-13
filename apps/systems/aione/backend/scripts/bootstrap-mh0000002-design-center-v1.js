import pool from "../db.js";
import { getDesignCenterWorkbench } from "../src/services/design-center-workbench-service.js";
import { upsertProductTagCard } from "../src/services/product-tag-card-service.js";
import { upsertProductHeroSpec } from "../src/services/product-hero-spec-service.js";

const PRODUCT_CODE = "MH0000002";

function stop(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

async function main() {
  const requested = String(process.env.AIONE_DESIGN_PRODUCT_CODE || PRODUCT_CODE).trim();
  if (requested !== PRODUCT_CODE) stop("wrong_product_guard", `Bootstrap is locked to ${PRODUCT_CODE}.`, { requested });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const before = await getDesignCenterWorkbench(client, PRODUCT_CODE);
    const profile = before.designProfile;
    if (profile?.profileCode !== "SOCKONE-SOCKS-DESIGN-V1") {
      stop("sockone_profile_required", "MH0000002 did not resolve to the SOCKONE socks design profile.", { profileCode: profile?.profileCode || null });
    }
    if (!before.materialConfirmation?.id) stop("material_confirmation_required", "CURRENT confirmed material snapshot is required.");
    if (!before.materials?.sku?.length) stop("sku_material_required", "At least one CURRENT SKU material is required.");
    if (!before.materials?.whiteBackground?.length) stop("white_background_required", "The first real Hero preview requires a CURRENT white-background candidate.");

    const context = { actorKind: "system", sourceSystem: "aione-design-center-preview-bootstrap-v1" };
    const tag = await upsertProductTagCard(client, {
      productRef: PRODUCT_CODE,
      input: { ...profile.tagCardDefaults, lifecycleStatus: "draft" },
      context
    });

    const defaults = profile.heroDefaults || {};
    const hero = await upsertProductHeroSpec(client, {
      productRef: PRODUCT_CODE,
      input: {
        ...defaults,
        tagCardId: tag.tagCard.id,
        productDisplayAssetId: before.materials.whiteBackground[0].id,
        skuAssetIds: before.materials.sku.map((asset) => asset.id),
        lifecycleStatus: "draft"
      },
      context
    });

    const after = await getDesignCenterWorkbench(client, PRODUCT_CODE);
    if (after.tagCard?.brand_name_en !== "SOCKONE") stop("sockone_brand_postcondition_failed", "SOCKONE tag card was not persisted.");
    if (!after.heroSpec?.id) stop("hero_spec_postcondition_failed", "Hero Spec was not persisted.");

    await client.query("COMMIT");
    process.stdout.write(`${JSON.stringify({
      ok: true,
      productCode: PRODUCT_CODE,
      designProfile: profile.profileCode,
      brand: after.tagCard.brand_name_en,
      tagCardId: after.tagCard.id,
      tagSlots: after.tagCard.resolved_slots?.map((slot) => slot.resolvedText) || [],
      heroSpecId: after.heroSpec.id,
      productDisplayAssetId: after.heroSpec.product_display_asset_id,
      skuAssetCount: Array.isArray(after.heroSpec.sku_asset_ids) ? after.heroSpec.sku_asset_ids.length : 0,
      primaryBadge: after.heroSpec.resolved_primary_selling_point?.resolvedText || "",
      secondaryBadge: after.heroSpec.resolved_secondary_selling_point?.resolvedText || "",
      imageGenerated: false
    }, null, 2)}\n`);
    process.stdout.write("[AIONE] MH0000002 DESIGN CENTER BOOTSTRAP PASS - NO IMAGE GENERATED\n");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.code || "design_center_bootstrap_failed", message: error.message, details: error.details || undefined }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
