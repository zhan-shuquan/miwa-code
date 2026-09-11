import { createHash, randomUUID } from "node:crypto";
import { getDesignTemplate } from "./design-template-service.js";
import { requireConfirmedProductMaterial } from "./product-material-confirmation-service.js";
import { recordBusinessEvent } from "./event-service.js";

function makeId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(stableJson(value), "utf8").digest("hex");
}

async function loadProduct(client, productId) {
  const result = await client.query(
    `SELECT id, product_code, name, lifecycle_status, metadata
       FROM public.products
      WHERE id=$1 AND archived_at IS NULL
      LIMIT 1`,
    [productId]
  );
  if (!result.rowCount) {
    const error = new Error("Product not found.");
    error.statusCode = 404;
    error.code = "product_not_found";
    throw error;
  }
  return result.rows[0];
}

async function validateAssets(client, productId, assetIds) {
  if (!Array.isArray(assetIds) || !assetIds.length) {
    const error = new Error("At least one canonical ProductAsset is required.");
    error.statusCode = 400;
    error.code = "design_input_assets_required";
    throw error;
  }
  const unique = [...new Set(assetIds.map((value) => String(value || "").trim()).filter(Boolean))];
  const result = await client.query(
    `SELECT id, product_id, asset_role, canonical_name, mime_type, lifecycle_status, metadata
       FROM public.product_assets
      WHERE product_id=$1 AND id = ANY($2::text[]) AND archived_at IS NULL`,
    [productId, unique]
  );
  if (result.rowCount !== unique.length) {
    const error = new Error("One or more design input assets are missing or do not belong to the Product.");
    error.statusCode = 409;
    error.code = "design_input_asset_mismatch";
    throw error;
  }
  return result.rows;
}

export async function createDesignTask(client, {
  productId,
  templateId,
  taskType,
  inputAssetIds,
  inputFactSnapshot = {},
  instructionSnapshot = {},
  context = {}
}) {
  const product = await loadProduct(client, productId);
  const template = await getDesignTemplate(client, templateId);
  if (template.lifecycle_status !== "active") {
    const error = new Error("Design template must be active before creating a task.");
    error.statusCode = 409;
    error.code = "design_template_not_active";
    throw error;
  }

  const assets = await validateAssets(client, productId, inputAssetIds);
  const normalizedAssetIds = assets.map((asset) => asset.id).sort();
  const materialConfirmation = await requireConfirmedProductMaterial(client, productId, normalizedAssetIds);
  const confirmedSkuSnapshot = Array.isArray(materialConfirmation.sku_snapshot) ? materialConfirmation.sku_snapshot : [];
  const enrichedFactSnapshot = {
    ...(inputFactSnapshot || {}),
    materialConfirmationId: materialConfirmation.id,
    materialSnapshotHash: materialConfirmation.snapshot_hash,
    confirmedSkuSnapshot
  };
  const inputSnapshot = {
    productId,
    templateId,
    templateVersion: template.version,
    materialConfirmationId: materialConfirmation.id,
    materialSnapshotHash: materialConfirmation.snapshot_hash,
    assetIds: normalizedAssetIds,
    facts: enrichedFactSnapshot
  };
  const inputSnapshotHash = sha256(inputSnapshot);
  const instructionHash = sha256(instructionSnapshot || {});
  const idempotencyKey = `design-task:${productId}:${templateId}:${inputSnapshotHash}:${instructionHash}`;

  const existing = await client.query(
    `SELECT * FROM public.design_tasks
      WHERE idempotency_key=$1 AND archived_at IS NULL
      LIMIT 1`,
    [idempotencyKey]
  );
  if (existing.rowCount) {
    return { task: existing.rows[0], reused: true, product, template, assets, materialConfirmation };
  }

  const taskId = makeId("dtk");
  const result = await client.query(
    `INSERT INTO public.design_tasks
      (id, product_id, template_id, task_type, task_status,
       input_asset_ids, input_fact_snapshot, instruction_snapshot,
       input_snapshot_hash, instruction_hash, idempotency_key,
       material_confirmation_id, material_snapshot_hash,
       created_by_person_id, updated_by_person_id, source_system)
     VALUES ($1,$2,$3,$4,'draft',$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13,$13,$14)
     RETURNING *`,
    [
      taskId,
      productId,
      templateId,
      String(taskType || template.output_type || "design").trim(),
      JSON.stringify(normalizedAssetIds),
      JSON.stringify(enrichedFactSnapshot),
      JSON.stringify(instructionSnapshot || {}),
      inputSnapshotHash,
      instructionHash,
      idempotencyKey,
      materialConfirmation.id,
      materialConfirmation.snapshot_hash,
      context.personId || null,
      context.sourceSystem || "aione"
    ]
  );

  await recordBusinessEvent(client, {
    eventType: "product.design_task_created",
    objectType: "product",
    objectId: productId,
    context,
    payload: {
      taskId,
      templateId,
      templateVersion: template.version,
      taskType: result.rows[0].task_type,
      materialConfirmationId: materialConfirmation.id,
      materialSnapshotHash: materialConfirmation.snapshot_hash
    }
  });

  return { task: result.rows[0], reused: false, product, template, assets, materialConfirmation };
}

export async function listProductDesignTasks(client, productId) {
  await loadProduct(client, productId);
  const result = await client.query(
    `SELECT t.*, dt.template_code, dt.name AS template_name, dt.version AS template_version,
            dt.output_type, dt.canvas_width, dt.canvas_height
       FROM public.design_tasks t
       JOIN public.design_templates dt ON dt.id=t.template_id
      WHERE t.product_id=$1 AND t.archived_at IS NULL
      ORDER BY t.created_at DESC`,
    [productId]
  );
  return result.rows;
}

export async function getDesignTask(client, taskId) {
  const result = await client.query(
    `SELECT t.*, dt.template_code, dt.name AS template_name, dt.version AS template_version,
            dt.output_type, dt.canvas_width, dt.canvas_height
       FROM public.design_tasks t
       JOIN public.design_templates dt ON dt.id=t.template_id
      WHERE t.id=$1 AND t.archived_at IS NULL
      LIMIT 1`,
    [taskId]
  );
  if (!result.rowCount) {
    const error = new Error("Design task not found.");
    error.statusCode = 404;
    error.code = "design_task_not_found";
    throw error;
  }
  return result.rows[0];
}

async function transition(client, taskId, allowedFrom, nextStatus, context, eventType, patchSql = "", patchValues = []) {
  const task = await getDesignTask(client, taskId);
  if (!allowedFrom.includes(task.task_status)) {
    const error = new Error(`Design task cannot transition from ${task.task_status} to ${nextStatus}.`);
    error.statusCode = 409;
    error.code = "invalid_design_task_transition";
    throw error;
  }
  const values = [nextStatus, context.personId || null, taskId, ...patchValues];
  const result = await client.query(
    `UPDATE public.design_tasks
        SET task_status=$1,
            updated_by_person_id=$2,
            updated_at=NOW(),
            record_version=record_version+1
            ${patchSql}
      WHERE id=$3
      RETURNING *`,
    values
  );
  await recordBusinessEvent(client, {
    eventType,
    objectType: "product",
    objectId: task.product_id,
    context,
    payload: { taskId, from: task.task_status, to: nextStatus }
  });
  return result.rows[0];
}

export function proposeDesignTask(client, taskId, context = {}) {
  return transition(client, taskId, ["draft"], "proposed", context, "product.design_task_proposed");
}

export function approveDesignTask(client, taskId, context = {}) {
  if (!context.personId) {
    const error = new Error("A human person identity is required to approve a DesignTask.");
    error.statusCode = 403;
    error.code = "human_approval_required";
    throw error;
  }
  return transition(
    client,
    taskId,
    ["proposed"],
    "approved",
    context,
    "product.design_task_approved",
    ", approved_by_person_id=$4, approved_at=NOW()",
    [context.personId]
  );
}

export async function reviewDesignTask(client, taskId, { outcome, detail = {} }, context = {}) {
  if (!context.personId) {
    const error = new Error("A human person identity is required to review a design output.");
    error.statusCode = 403;
    error.code = "human_review_required";
    throw error;
  }
  const normalized = String(outcome || "").trim();
  const map = {
    approve: "approved",
    reject: "rejected",
    regenerate: "regenerate_requested"
  };
  const reviewStatus = map[normalized];
  if (!reviewStatus) {
    const error = new Error("Review outcome must be approve, reject or regenerate.");
    error.statusCode = 400;
    error.code = "invalid_design_review_outcome";
    throw error;
  }
  const task = await getDesignTask(client, taskId);
  if (task.task_status !== "completed") {
    const error = new Error("Only a completed DesignTask can be reviewed.");
    error.statusCode = 409;
    error.code = "design_task_not_completed";
    throw error;
  }
  const result = await client.query(
    `UPDATE public.design_tasks
        SET review_status=$1,
            reviewed_by_person_id=$2,
            reviewed_at=NOW(),
            review_detail=$3::jsonb,
            updated_by_person_id=$2,
            updated_at=NOW(),
            record_version=record_version+1
      WHERE id=$4
      RETURNING *`,
    [reviewStatus, context.personId, JSON.stringify(detail || {}), taskId]
  );
  const eventType = reviewStatus === "approved"
    ? "product.design_output_approved"
    : reviewStatus === "rejected"
      ? "product.design_output_rejected"
      : "product.design_regeneration_requested";
  await recordBusinessEvent(client, {
    eventType,
    objectType: "product",
    objectId: task.product_id,
    context,
    payload: { taskId, reviewStatus, detail: detail || {} }
  });
  return result.rows[0];
}
