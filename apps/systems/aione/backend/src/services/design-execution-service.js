import { getDesignTask } from "./design-task-service.js";
import { executeNormalizeCanvas } from "./design-output-service.js";
import { executeBenefitFeatureImage } from "./design-ai-output-service.js";

export async function executeDesignTask(client, taskId, context = {}) {
  const task = await getDesignTask(client, taskId);
  if (task.task_type === "normalize_canvas") {
    return executeNormalizeCanvas(client, taskId, context);
  }
  if (task.task_type === "benefit_feature_image") {
    return executeBenefitFeatureImage(client, taskId, context);
  }
  const error = new Error(`No executor is registered for DesignTask type: ${task.task_type}`);
  error.statusCode = 409;
  error.code = "unsupported_design_task_type";
  throw error;
}
