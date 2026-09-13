const EXECUTION_REGISTRY = Object.freeze({
  normalize_canvas: {
    engine: "deterministic",
    executor: "normalize_canvas",
    status: "implemented"
  },
  deterministic_copy_overlay: {
    engine: "deterministic",
    executor: "deterministic_copy_overlay",
    status: "implemented"
  },
  benefit_feature_image: {
    engine: "ai_image_edit",
    executor: "benefit_feature_image",
    status: "implemented"
  },
  compose_sku_color_image: {
    engine: "deterministic",
    executor: "sku_color_renderer",
    status: "planned"
  },
  compose_white_background_product: {
    engine: "hybrid",
    executor: "white_background_renderer",
    status: "implemented"
  },
  generate_source_anchored_model_wear: {
    engine: "ai_image_edit",
    executor: "source_anchored_model_wear",
    status: "planned"
  },
  compose_material_texture_image: {
    engine: "deterministic",
    executor: "material_texture_renderer",
    status: "planned"
  },
  compose_truthful_size_guide: {
    engine: "deterministic",
    executor: "truthful_size_guide_renderer",
    status: "planned"
  },
  compose_deterministic_product_spec: {
    engine: "deterministic",
    executor: "product_spec_renderer",
    status: "planned"
  },
  compose_detail_structure_image: {
    engine: "hybrid",
    executor: "detail_structure_renderer",
    status: "planned"
  }
});

export function getDesignExecutionCapability(taskType) {
  const normalized = String(taskType || "").trim();
  const capability = EXECUTION_REGISTRY[normalized];
  if (!capability) {
    return {
      taskType: normalized,
      engine: "unknown",
      executor: null,
      status: "unsupported"
    };
  }
  return { taskType: normalized, ...capability };
}

export function getDesignExecutionPlan(task) {
  const capability = getDesignExecutionCapability(task?.task_type);
  const instruction = task?.instruction_snapshot && typeof task.instruction_snapshot === "object"
    ? task.instruction_snapshot
    : {};
  const pageSpec = instruction.pageSpec && typeof instruction.pageSpec === "object"
    ? instruction.pageSpec
    : {};
  return {
    taskId: task?.id || null,
    productId: task?.product_id || null,
    templateId: task?.template_id || null,
    taskStatus: task?.task_status || null,
    pageType: instruction.pageType || pageSpec?.metadata?.pageType || null,
    ...capability,
    sourceAssetIds: Array.isArray(task?.input_asset_ids) ? task.input_asset_ids : [],
    deterministicRendering: Boolean(instruction.deterministicRendering || pageSpec?.metadata?.deterministicRendering),
    sourceAnchored: Boolean(instruction.preserveProductTruth || pageSpec?.metadata?.sourceAnchored),
    humanReviewRequired: true
  };
}

export function listDesignExecutionCapabilities() {
  return Object.entries(EXECUTION_REGISTRY).map(([taskType, capability]) => ({ taskType, ...capability }));
}
