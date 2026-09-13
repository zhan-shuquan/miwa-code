import assert from "node:assert/strict";
import {
  getDesignExecutionCapability,
  getDesignExecutionPlan,
  listDesignExecutionCapabilities
} from "../src/services/design-engine-router-service.js";
import {
  buildWhiteBackgroundPrompt,
  resolveWhiteBackgroundExecutionMode
} from "../src/services/design-white-background-output-service.js";
import { buildModelWearPrompt } from "../src/services/design-model-wear-output-service.js";
import {
  buildTruthfulSizeGuideSvg,
  buildProductSpecSvg
} from "../src/services/design-deterministic-page-output-service.js";

const expected = {
  normalize_canvas: ["deterministic", "implemented"],
  deterministic_copy_overlay: ["deterministic", "implemented"],
  benefit_feature_image: ["ai_image_edit", "implemented"],
  compose_sku_color_image: ["deterministic", "planned"],
  compose_white_background_product: ["hybrid", "implemented"],
  generate_source_anchored_model_wear: ["ai_image_edit", "implemented"],
  compose_material_texture_image: ["deterministic", "planned"],
  compose_truthful_size_guide: ["deterministic", "implemented"],
  compose_deterministic_product_spec: ["deterministic", "implemented"],
  compose_detail_structure_image: ["hybrid", "planned"]
};

for (const [taskType, [engine, status]] of Object.entries(expected)) {
  const capability = getDesignExecutionCapability(taskType);
  assert.equal(capability.taskType, taskType);
  assert.equal(capability.engine, engine);
  assert.equal(capability.status, status);
  assert.ok(capability.executor);
}

const unsupported = getDesignExecutionCapability("unknown_task_type");
assert.equal(unsupported.status, "unsupported");
assert.equal(unsupported.executor, null);

const modelTask = {
  id: "dtk_test",
  product_id: "prod_test",
  template_id: "dtpl_test",
  task_type: "generate_source_anchored_model_wear",
  task_status: "approved",
  input_asset_ids: ["ast_1"],
  input_fact_snapshot: {
    targetGender: "男",
    season: "秋冬",
    lengthType: "中筒"
  },
  instruction_snapshot: {
    pageType: "model",
    preserveProductTruth: true,
    pageSpec: {
      presentation: {
        sceneStyle: "outdoor-work",
        framing: "lower-body",
        backgroundMode: "studio"
      },
      metadata: { sourceAnchored: true }
    }
  }
};
const plan = getDesignExecutionPlan(modelTask);
assert.equal(plan.pageType, "model");
assert.equal(plan.engine, "ai_image_edit");
assert.equal(plan.status, "implemented");
assert.equal(plan.sourceAnchored, true);
assert.equal(plan.humanReviewRequired, true);
const modelPrompt = buildModelWearPrompt(modelTask);
assert.match(modelPrompt, /Generate only the human model/);
assert.match(modelPrompt, /Do not redesign the product itself/);
assert.match(modelPrompt, /outdoor-work/);
assert.match(modelPrompt, /中筒/);

const whiteTask = {
  id: "dtk_white",
  product_id: "prod_test",
  template_id: "dtpl_unified_white_bg_square_v1",
  task_type: "compose_white_background_product",
  task_status: "approved",
  input_asset_ids: ["ast_white"],
  input_fact_snapshot: {
    actualVariants: ["白色", "米色", "卡其", "军绿", "深灰", "黑色"]
  },
  instruction_snapshot: {
    pageType: "white_bg",
    preserveProductTruth: true,
    pageSpec: {
      presentation: { cleanupMode: "cleanup", shadowMode: "none" },
      metadata: { sourceAnchored: true }
    }
  }
};
assert.equal(resolveWhiteBackgroundExecutionMode(whiteTask), "hybrid");
assert.equal(getDesignExecutionPlan(whiteTask).status, "implemented");
const prompt = buildWhiteBackgroundPrompt(whiteTask);
assert.match(prompt, /pure white #FFFFFF/);
assert.match(prompt, /Do not add text/);
assert.match(prompt, /Preserve the exact product shape/);

const preserveTask = structuredClone(whiteTask);
preserveTask.instruction_snapshot.pageSpec.presentation.cleanupMode = "preserve";
assert.equal(resolveWhiteBackgroundExecutionMode(preserveTask), "deterministic");

const sizeSvg = buildTruthfulSizeGuideSvg({
  facts: { supportedSize: "24–27cm" }
});
assert.match(sizeSvg, /24–27cm/);
assert.match(sizeSvg, /実測サイズは未確認/);
assert.doesNotMatch(sizeSvg, /20cm|23cm|7\.5cm/);
assert.equal(getDesignExecutionCapability("compose_truthful_size_guide").status, "implemented");

const sizeWithMeasurements = buildTruthfulSizeGuideSvg({
  facts: {
    supportedSize: "24–27cm",
    measurements: [
      { label: "後踵から履き口", value: "20", unit: "cm" },
      { label: "足底", value: "23", unit: "cm" }
    ]
  }
});
assert.match(sizeWithMeasurements, /後踵から履き口/);
assert.match(sizeWithMeasurements, /20 cm/);
assert.match(sizeWithMeasurements, /23 cm/);

assert.throws(
  () => buildTruthfulSizeGuideSvg({ facts: {} }),
  (error) => error?.code === "supported_size_required"
);

const specSvg = buildProductSpecSvg({
  productCode: "MH0000002",
  facts: {
    supportedSize: "24–27cm",
    actualVariants: ["白色", "米色", "卡其", "军绿", "深灰", "黑色"],
    season: "秋冬",
    lengthType: "中筒",
    setCount: 6
  }
});
assert.match(specSvg, /MH0000002/);
assert.match(specSvg, /24–27cm/);
assert.match(specSvg, /秋冬/);
assert.match(specSvg, /中筒/);
assert.doesNotMatch(specSvg, /素材<\/text>[\s\S]*綿|生産国<\/text>[\s\S]*中国/);
assert.equal(getDesignExecutionCapability("compose_deterministic_product_spec").status, "implemented");

const listed = listDesignExecutionCapabilities();
assert.equal(listed.length, Object.keys(expected).length);

console.log("[AIONE] DESIGN ENGINE EXECUTION REGISTRY PASS");
console.log("[AIONE] WHITE BACKGROUND EXECUTOR CONTRACT PASS");
console.log("[AIONE] MODEL WEAR EXECUTOR CONTRACT PASS");
console.log("[AIONE] TRUTHFUL SIZE GUIDE RENDERER CONTRACT PASS");
console.log("[AIONE] PRODUCT SPEC RENDERER CONTRACT PASS");
