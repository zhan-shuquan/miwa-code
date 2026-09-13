import { getDesignTask } from "./design-task-service.js";
import { executeNormalizeCanvas } from "./design-output-service.js";
import { executeBenefitFeatureImage } from "./design-ai-output-service.js";
import { executeDeterministicCopyOverlay } from "./design-copy-overlay-service.js";
import { executeWhiteBackgroundProduct } from "./design-white-background-output-service.js";
import { executeSourceAnchoredModelWear } from "./design-model-wear-output-service.js";
import { executeTruthfulSizeGuide, executeDeterministicProductSpec } from "./design-deterministic-page-output-service.js";
import { executeSkuColorImage, executeMaterialTextureImage } from "./design-deterministic-media-output-service.js";
import { executeSourceAnchoredDetailImage } from "./design-detail-output-service.js";
import { getDesignExecutionPlan } from "./design-engine-router-service.js";

const EXECUTORS = Object.freeze({
  normalize_canvas: executeNormalizeCanvas,
  benefit_feature_image: executeBenefitFeatureImage,
  deterministic_copy_overlay: executeDeterministicCopyOverlay,
  white_background_renderer: executeWhiteBackgroundProduct,
  source_anchored_model_wear: executeSourceAnchoredModelWear,
  truthful_size_guide_renderer: executeTruthfulSizeGuide,
  product_spec_renderer: executeDeterministicProductSpec,
  sku_color_renderer: executeSkuColorImage,
  material_texture_renderer: executeMaterialTextureImage,
  detail_structure_renderer: executeSourceAnchoredDetailImage
});

export async function getDesignTaskExecutionPlan(client, taskId) {
  const task = await getDesignTask(client, taskId);
  return getDesignExecutionPlan(task);
}

export async function executeDesignTask(client, taskId, context = {}) {
  const task = await getDesignTask(client, taskId);
  const plan = getDesignExecutionPlan(task);
  const executor = plan.executor ? EXECUTORS[plan.executor] : null;

  if (plan.status === "implemented" && executor) return executor(client, taskId, context);

  if (plan.status === "planned") {
    const error = new Error(`Design Engine executor is planned but not implemented yet: ${plan.executor}`);
    error.statusCode = 409;
    error.code = "design_executor_not_implemented";
    error.details = plan;
    throw error;
  }

  const error = new Error(`No Design Engine capability is registered for DesignTask type: ${task.task_type}`);
  error.statusCode = 409;
  error.code = "unsupported_design_task_type";
  error.details = plan;
  throw error;
}
