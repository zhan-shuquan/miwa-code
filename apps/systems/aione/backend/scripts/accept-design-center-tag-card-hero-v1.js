import pool from "../db.js";
import { confirmProductMaterial } from "../src/services/product-material-confirmation-service.js";
import { getDesignCenterWorkbench } from "../src/services/design-center-workbench-service.js";
import { upsertProductTagCard } from "../src/services/product-tag-card-service.js";
import { upsertProductHeroSpec } from "../src/services/product-hero-spec-service.js";
import { createDesignTask } from "../src/services/design-task-service.js";

const PRODUCT_ID = "prod_design_center_fixture_v1";
const PRODUCT_CODE = "MH9999999";
const CATEGORY_ID = "cat_design_center_mens_socks_v1";
const SKU_ASSET_ID = "asset_design_center_sku_v1";
const WHITE_ASSET_ID = "asset_design_center_white_v1";
const DETAIL_ASSET_ID = "asset_design_center_detail_v1";
const PERSON_ID = "person_design_center_fixture_v1";

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) fail(message, { actual, expected });
}

async function seedFixture(client) {
  await client.query(
    `INSERT INTO public.product_categories (id, code, name, status)
     VALUES ($1,'mens-socks','男袜','active')`,
    [CATEGORY_ID]
  );
  await client.query(
    `INSERT INTO public.products
      (id, category_id, name, lifecycle_status, product_data, metadata, product_code)
     VALUES ($1,$2,'Design Center Fixture Socks','preparing',$3::jsonb,'{}'::jsonb,$4)`,
    [
      PRODUCT_ID,
      CATEGORY_ID,
      JSON.stringify({
        setCount: 6,
        actualVariants: ["白色", "米色", "卡其", "军绿", "深灰", "黑色"],
        supportedSize: "39–45",
        approvedPrimaryValue: "秋冬男士中筒条纹6双套装",
        sellingPoints: ["高弹袜口", "Y形拼色后跟", "中筒条纹设计"]
      }),
      PRODUCT_CODE
    ]
  );
  await client.query(
    `INSERT INTO public.product_skus
      (id, product_id, sku_code, sku_no, name, lifecycle_status, sku_data, metadata)
     VALUES ('sku_design_center_fixture_v1',$1,'MH9999999-01',1,'6双6色套装','preparing',$2::jsonb,'{}'::jsonb)`,
    [PRODUCT_ID, JSON.stringify({ setCount: 6, colors: ["白色", "米色", "卡其", "军绿", "深灰", "黑色"] })]
  );

  const assets = [
    [SKU_ASSET_ID, 1, "sku_set", "SKU-01.jpg", "MH9999999_D01.jpg", "01_SKU图"],
    [WHITE_ASSET_ID, 2, "white_bg_product", "白底图-01.jpg", "MH9999999_D02.jpg", "02_产品图"],
    [DETAIL_ASSET_ID, 3, "product_detail", "详情-袜口.jpg", "MH9999999_D03.jpg", "02_产品图"]
  ];
  for (const [id, no, role, originalName, canonicalName, sourceFolder] of assets) {
    await client.query(
      `INSERT INTO public.product_assets
        (id, product_id, asset_no, asset_type, asset_role, source_provider,
         original_name, canonical_name, mime_type, lifecycle_status, metadata)
       VALUES ($1,$2,$3,'image',$4,'fixture',$5,$6,'image/jpeg','formalized',$7::jsonb)`,
      [id, PRODUCT_ID, no, role, originalName, canonicalName, JSON.stringify({ layer: "SOURCE", sourceFolder })]
    );
  }
}

async function main() {
  const client = await pool.connect();
  await client.query("BEGIN");
  try {
    await seedFixture(client);

    const context = { personId: PERSON_ID, actorKind: "human", sourceSystem: "controlled-ci" };
    const material = await confirmProductMaterial(client, {
      productId: PRODUCT_ID,
      assetIds: [SKU_ASSET_ID, WHITE_ASSET_ID, DETAIL_ASSET_ID],
      metadata: { purpose: "design-center-tag-card-hero-v1-acceptance" },
      context
    });
    assertEqual(material.confirmation.status, "confirmed", "Material confirmation must be confirmed.");

    const before = await getDesignCenterWorkbench(client, PRODUCT_CODE);
    assertEqual(before.materials.counts.currentConfirmed, 3, "Workbench must read only the confirmed CURRENT snapshot.");
    assertEqual(before.materials.counts.sku, 1, "Workbench must identify the SKU image.");
    assertEqual(before.materials.counts.whiteBackgroundCandidates, 1, "Workbench must identify the white-background product image.");
    assertEqual(before.materials.counts.detailCandidates, 1, "Workbench must identify the detail image.");

    const tagResult = await upsertProductTagCard(client, {
      productRef: PRODUCT_CODE,
      input: {
        templatePresetId: "dip_miwa_product_tag_card_v1",
        brandNameEn: "SOCKONE",
        brandSublineEn: "Men's Daily Socks",
        brandSloganJa: "毎日に頼れる一足",
        colorTheme: "navy-gold",
        usageScopes: ["hero", "packaging"],
        lifecycleStatus: "draft",
        slots: [
          { type: "setCount", sourceFactPath: "setCount", suffix: "足セット", visible: true },
          { type: "size", sourceFactPath: "supportedSize", visible: true },
          { type: "feature", sourceFactPath: "sellingPoints.0", visible: true },
          { type: "material", textOverride: "綿混", visible: true }
        ]
      },
      context
    });

    const resolvedSlots = tagResult.tagCard.resolved_slots.map((slot) => slot.resolvedText);
    assertEqual(resolvedSlots[0], "6足セット", "Slot 1 must bind setCount from Product Truth.");
    assertEqual(resolvedSlots[1], "39–45", "Slot 2 must bind supportedSize from Product Truth.");
    assertEqual(resolvedSlots[2], "高弹袜口", "Slot 3 must bind a selling point from Product Truth.");
    assertEqual(resolvedSlots[3], "綿混", "Slot 4 may use presentation-only text when no canonical material fact exists.");

    const heroResult = await upsertProductHeroSpec(client, {
      productRef: PRODUCT_CODE,
      input: {
        tagCardId: tagResult.tagCard.id,
        layoutPresetId: "dip_unified_hero_square_layout_v1",
        modelPresetId: "dip_socks_white_bg_model_v1",
        productDisplayPresetId: "dip_socks_flat_lay_set_v1",
        productDisplayAssetId: WHITE_ASSET_ID,
        skuAssetIds: [SKU_ASSET_ID],
        productDisplayMode: "flat_lay",
        primarySellingPointBinding: { sourceFactPath: "approvedPrimaryValue" },
        secondarySellingPointBinding: { sourceFactPath: "sellingPoints.1" },
        lifecycleStatus: "draft"
      },
      context
    });
    assertEqual(heroResult.heroSpec.resolved_primary_selling_point.resolvedText, "秋冬男士中筒条纹6双套装", "Hero primary selling point must resolve from Product Truth.");
    assertEqual(heroResult.heroSpec.resolved_secondary_selling_point.resolvedText, "Y形拼色后跟", "Hero secondary selling point must resolve from Product Truth.");

    const taskResult = await createDesignTask(client, {
      productId: PRODUCT_ID,
      templateId: "dtpl_unified_product_hero_square_v1",
      taskType: "compose_product_hero",
      inputAssetIds: [SKU_ASSET_ID, WHITE_ASSET_ID],
      inputFactSnapshot: before.product.productData,
      instructionSnapshot: {
        contract: "AIONE Unified Hero Five Slot V1",
        tagCardId: tagResult.tagCard.id,
        heroSpecId: heroResult.heroSpec.id
      },
      context
    });
    assertEqual(taskResult.task.task_status, "draft", "Hero task must stop at draft before review/generation.");
    assertEqual(taskResult.task.material_confirmation_id, material.confirmation.id, "Hero task must reference the CURRENT human-confirmed material snapshot.");

    const after = await getDesignCenterWorkbench(client, PRODUCT_ID);
    if (!after.tagCard?.id || !after.heroSpec?.id) {
      fail("Workbench must return saved Product Tag Card and Hero Spec.", {
        tagCard: after.tagCard?.id || null,
        heroSpec: after.heroSpec?.id || null
      });
    }
    assertEqual(Number(after.heroTemplate.canvas_width), 1000, "Unified hero width must be 1000.");
    assertEqual(Number(after.heroTemplate.canvas_height), 1000, "Unified hero height must be 1000.");

    const summary = {
      ok: true,
      contract: "AIONE Design Center Product Tag Card + Hero V1",
      productCode: PRODUCT_CODE,
      confirmedAssets: after.materials.counts.currentConfirmed,
      skuImages: after.materials.counts.sku,
      whiteBackgroundCandidates: after.materials.counts.whiteBackgroundCandidates,
      detailCandidates: after.materials.counts.detailCandidates,
      tagCardSlots: resolvedSlots,
      heroCanvas: `${after.heroTemplate.canvas_width}x${after.heroTemplate.canvas_height}`,
      heroTaskStatus: taskResult.task.task_status,
      imageGenerated: false
    };
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    process.stdout.write("[AIONE] DESIGN CENTER TAG CARD + HERO V1 PASS - NO IMAGE GENERATED\n");
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.code || "design_center_tag_card_hero_v1_failed",
    message: error.message,
    details: error.details || undefined
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
