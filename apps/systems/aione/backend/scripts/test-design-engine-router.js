import assert from "node:assert/strict";
import {
  getDesignExecutionCapability,
  getDesignExecutionPlan,
  listDesignExecutionCapabilities
} from "../src/services/design-engine-router-service.js";

const expected = {
  normalize_canvas: ["deterministic", "implemented"],
  deterministic_copy_overlay: ["deterministic", "implemented"],
  benefit_feature_image: ["ai_image_edit", "implemented"],
  compose_sku_color_image: ["deterministic", "planned"],
  compose_white_background_product: ["hybrid", "planned"],
  generate_source_anchored_model_wear: ["ai_image_edit", "planned"],
  compose_material_texture_image: ["deterministic", "planned"],
  compose_truthful_size_guide: ["deterministic", "planned"],
  compose_deterministic_product_spec: ["deterministic", "planned"],
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

const plan = getDesignExecutionPlan({
  id: "dtk_test",
  product_id: "prod_test",
  template_id: "dtpl_test",
  task_type: "generate_source_anchored_model_wear",
  task_status: "approved",
  input_asset_ids: ["ast_1"],
  instruction_snapshot: {
    pageType: "model",
    preserveProductTruth: true,
    pageSpec: { metadata: { sourceAnchored: true } }
  }
});
assert.equal(plan.pageType, "model");
assert.equal(plan.engine, "ai_image_edit");
assert.equal(plan.status, "planned");
assert.equal(plan.sourceAnchored, true);
assert.equal(plan.humanReviewRequired, true);

const listed = listDesignExecutionCapabilities();
assert.equal(listed.length, Object.keys(expected).length);

console.log("[AIONE] DESIGN ENGINE EXECUTION REGISTRY PASS");
