import assert from "node:assert/strict";
import { getDesignExecutionCapability, getDesignExecutionPlan, listDesignExecutionCapabilities } from "../src/services/design-engine-router-service.js";
import { buildWhiteBackgroundPrompt, resolveWhiteBackgroundExecutionMode } from "../src/services/design-white-background-output-service.js";
import { buildModelWearPrompt } from "../src/services/design-model-wear-output-service.js";
import { buildTruthfulSizeGuideSvg, buildProductSpecSvg } from "../src/services/design-deterministic-page-output-service.js";
import { buildSkuColorSvg, buildMaterialTextureSvg } from "../src/services/design-deterministic-media-output-service.js";
import { buildDetailSvg } from "../src/services/design-detail-output-service.js";

const expected = {
  normalize_canvas: ["deterministic", "implemented"],
  deterministic_copy_overlay: ["deterministic", "implemented"],
  benefit_feature_image: ["ai_image_edit", "implemented"],
  compose_sku_color_image: ["deterministic", "implemented"],
  compose_white_background_product: ["hybrid", "implemented"],
  generate_source_anchored_model_wear: ["ai_image_edit", "implemented"],
  compose_material_texture_image: ["deterministic", "implemented"],
  compose_truthful_size_guide: ["deterministic", "implemented"],
  compose_deterministic_product_spec: ["deterministic", "implemented"],
  compose_source_anchored_detail_image: ["hybrid", "implemented"]
};

for (const [taskType, [engine, status]] of Object.entries(expected)) {
  const capability = getDesignExecutionCapability(taskType);
  assert.equal(capability.taskType, taskType);
  assert.equal(capability.engine, engine);
  assert.equal(capability.status, status);
  assert.ok(capability.executor);
}
assert.equal(getDesignExecutionCapability("unknown_task_type").status, "unsupported");

const modelTask = {
  id: "dtk_test", product_id: "prod_test", template_id: "dtpl_test", task_type: "generate_source_anchored_model_wear", task_status: "approved", input_asset_ids: ["ast_1"],
  input_fact_snapshot: { targetGender: "男", season: "秋冬", lengthType: "中筒" },
  instruction_snapshot: { pageType: "model", preserveProductTruth: true, pageSpec: { presentation: { sceneStyle: "outdoor-work", framing: "lower-body", backgroundMode: "studio" }, metadata: { sourceAnchored: true } } }
};
assert.equal(getDesignExecutionPlan(modelTask).status, "implemented");
assert.match(buildModelWearPrompt(modelTask), /Do not redesign the product itself/);

const whiteTask = {
  id: "dtk_white", product_id: "prod_test", template_id: "dtpl_unified_white_bg_square_v1", task_type: "compose_white_background_product", task_status: "approved", input_asset_ids: ["ast_white"],
  input_fact_snapshot: { actualVariants: ["白色", "米色", "卡其", "军绿", "深灰", "黑色"] },
  instruction_snapshot: { pageType: "white_bg", preserveProductTruth: true, pageSpec: { presentation: { cleanupMode: "cleanup", shadowMode: "none" }, metadata: { sourceAnchored: true } } }
};
assert.equal(resolveWhiteBackgroundExecutionMode(whiteTask), "hybrid");
assert.match(buildWhiteBackgroundPrompt(whiteTask), /pure white #FFFFFF/);

const sizeSvg = buildTruthfulSizeGuideSvg({ facts: { supportedSize: "24–27cm" } });
assert.match(sizeSvg, /24–27cm/);
assert.match(sizeSvg, /実測サイズは未確認/);
assert.doesNotMatch(sizeSvg, /20cm|23cm|7\.5cm/);
assert.throws(() => buildTruthfulSizeGuideSvg({ facts: {} }), (error) => error?.code === "supported_size_required");

const specSvg = buildProductSpecSvg({ productCode: "MH0000002", facts: { supportedSize: "24–27cm", actualVariants: ["白色", "米色", "卡其", "军绿", "深灰", "黑色"], season: "秋冬", lengthType: "中筒", setCount: 6 } });
assert.match(specSvg, /MH0000002/);
assert.doesNotMatch(specSvg, /素材<\/text>[\s\S]*綿|生産国<\/text>[\s\S]*中国/);

const fakeImage = "data:image/jpeg;base64,AA==";
const skuSvg = buildSkuColorSvg({ facts: { actualVariants: ["白色", "米色", "卡其", "军绿", "深灰", "黑色"], setCount: 6 }, sourceDataUri: fakeImage, pageSpec: { presentation: { titleText: "COLOR VARIATIONS" }, layoutAdjustments: { columns: 3 } } });
assert.match(skuSvg, /白色/);
assert.match(skuSvg, /黑色/);
assert.match(skuSvg, /6点セット/);
assert.throws(() => buildSkuColorSvg({ facts: {}, sourceDataUri: fakeImage }), (error) => error?.code === "actual_variants_required");

const materialVisualOnly = buildMaterialTextureSvg({ facts: {}, sourceDataUri: fakeImage, pageSpec: { presentation: { copyMode: "confirmed-only", displayMode: "macro" } } });
assert.match(materialVisualOnly, /素材事実は未確認/);
assert.match(materialVisualOnly, /素材名・機能・効能は推測しません/);
assert.doesNotMatch(materialVisualOnly, /綿|ウール/);
const materialConfirmed = buildMaterialTextureSvg({ facts: { material: "綿混", materialFeatures: ["ジャカード"] }, sourceDataUri: fakeImage });
assert.match(materialConfirmed, /綿混/);
assert.match(materialConfirmed, /ジャカード/);

const detailSvg = buildDetailSvg({ facts: { sellingPoints: ["高弹袜口", "Y形/拼色后跟"] }, sourceDataUri: fakeImage, pageSpec: { presentation: { detailType: "heel", layoutMode: "single", titleText: "DETAIL" } } });
assert.match(detailSvg, /高弹袜口/);
assert.match(detailSvg, /Y形\/拼色后跟/);
assert.match(detailSvg, /不发明商品结构/);
const detailWithoutClaims = buildDetailSvg({ facts: {}, sourceDataUri: fakeImage });
assert.match(detailWithoutClaims, /未確認の構造説明は追加しません/);

assert.equal(listDesignExecutionCapabilities().length, Object.keys(expected).length);
console.log("[AIONE] DESIGN ENGINE EXECUTION REGISTRY PASS");
console.log("[AIONE] WHITE BACKGROUND EXECUTOR CONTRACT PASS");
console.log("[AIONE] MODEL WEAR EXECUTOR CONTRACT PASS");
console.log("[AIONE] TRUTHFUL SIZE GUIDE RENDERER CONTRACT PASS");
console.log("[AIONE] PRODUCT SPEC RENDERER CONTRACT PASS");
console.log("[AIONE] SKU COLOR RENDERER CONTRACT PASS");
console.log("[AIONE] MATERIAL TEXTURE RENDERER CONTRACT PASS");
console.log("[AIONE] DETAIL RENDERER CONTRACT PASS");
