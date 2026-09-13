import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { getDesignTask } from "./design-task-service.js";
import { getDesignTemplate } from "./design-template-service.js";
import { listDesignTaskOutputs } from "./design-output-service.js";
import { readGcsObject, uploadGcsObjectIfAbsent } from "../integrations/google-cloud-storage-client.js";
import { runOpenAIImageEdit } from "../ai/openai-image-provider.js";
import { recordBusinessEvent } from "./event-service.js";

const execFileAsync = promisify(execFile);

function makeId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function pageSpecFromTask(task) {
  const instruction = task?.instruction_snapshot && typeof task.instruction_snapshot === "object"
    ? task.instruction_snapshot
    : {};
  return instruction.pageSpec && typeof instruction.pageSpec === "object"
    ? instruction.pageSpec
    : {};
}

export function resolveWhiteBackgroundExecutionMode(task) {
  const pageSpec = pageSpecFromTask(task);
  const presentation = pageSpec.presentation && typeof pageSpec.presentation === "object"
    ? pageSpec.presentation
    : {};
  return String(presentation.cleanupMode || "cleanup").trim() === "preserve"
    ? "deterministic"
    : "hybrid";
}

export function buildWhiteBackgroundPrompt(task) {
  const pageSpec = pageSpecFromTask(task);
  const presentation = pageSpec.presentation && typeof pageSpec.presentation === "object"
    ? pageSpec.presentation
    : {};
  const facts = JSON.stringify(task?.input_fact_snapshot || {}).slice(0, 12000);
  const shadow = String(presentation.shadowMode || "none") === "soft"
    ? "Keep only a subtle natural contact shadow directly under the real product."
    : "Do not add decorative shadows.";
  return [
    "Edit the supplied real product photo into a clean Japanese ecommerce white-background product image.",
    "Use the supplied SOURCE image as visual truth. Preserve the exact product shape, colors, pattern, proportions, length, cuff, seams, visible structure, labels and logo.",
    "Remove only the original background and unrelated surrounding objects. Do not redesign, beautify, recolor, simplify, extend or regenerate the product itself.",
    "Use a pure white #FFFFFF background. Keep the complete product visible and commercially centered with comfortable margins.",
    shadow,
    "Do not add text, badges, props, hands, models, packaging, accessories or claims.",
    `Verified product facts snapshot: ${facts}`
  ].join("\n");
}

async function loadSourceAsset(client, task) {
  const ids = Array.isArray(task.input_asset_ids) ? task.input_asset_ids : [];
  if (ids.length !== 1) {
    const error = new Error("White-background execution requires exactly one canonical SOURCE ProductAsset.");
    error.statusCode = 409;
    error.code = "white_background_single_source_required";
    throw error;
  }
  const result = await client.query(
    `SELECT * FROM public.product_assets
      WHERE id=$1 AND product_id=$2 AND archived_at IS NULL
      LIMIT 1`,
    [ids[0], task.product_id]
  );
  if (!result.rowCount) {
    const error = new Error("White-background SOURCE ProductAsset was not found.");
    error.statusCode = 409;
    error.code = "design_input_asset_missing";
    throw error;
  }
  const asset = result.rows[0];
  const metadata = asset.metadata || {};
  if (metadata.layer !== "SOURCE") {
    const error = new Error("White-background execution accepts canonical SOURCE assets only.");
    error.statusCode = 409;
    error.code = "design_source_asset_required";
    throw error;
  }
  if (!String(asset.mime_type || "").startsWith("image/")) {
    const error = new Error("White-background execution requires an image SOURCE asset.");
    error.statusCode = 409;
    error.code = "design_source_asset_not_image";
    throw error;
  }
  if (!metadata.gcsBucket || !metadata.gcsObject) {
    const error = new Error("White-background SOURCE asset has no canonical GCS storage reference.");
    error.statusCode = 409;
    error.code = "canonical_asset_storage_missing";
    throw error;
  }
  return asset;
}

async function nextAssetNo(client, productId) {
  const result = await client.query(
    "SELECT COALESCE(MAX(asset_no),0)+1 AS next_no FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL",
    [productId]
  );
  const value = Number(result.rows[0]?.next_no || 0);
  if (!Number.isInteger(value) || value < 1 || value > 999) {
    const error = new Error("Product asset capacity exhausted.");
    error.statusCode = 409;
    error.code = "product_asset_capacity_exhausted";
    throw error;
  }
  return value;
}

async function renderExactWhiteCanvas(bytes, template, task) {
  const width = Number(template.canvas_width);
  const height = Number(template.canvas_height);
  const pageSpec = pageSpecFromTask(task);
  const layout = pageSpec.layoutAdjustments || pageSpec.layout_adjustments || {};
  const presentation = pageSpec.presentation || {};
  const safeMargin = clampNumber(layout.safeMargin, 2, 30, 10);
  const productScale = clampNumber(layout.productScale, 60, 145, 100);
  const offsetXPercent = clampNumber(layout.productOffsetX, -25, 25, 0);
  const offsetYPercent = clampNumber(layout.productOffsetY, -25, 25, 0);
  const baseWidth = Math.max(1, Math.round(width * (1 - (safeMargin * 2 / 100))));
  const baseHeight = Math.max(1, Math.round(height * (1 - (safeMargin * 2 / 100))));
  const targetWidth = Math.max(1, Math.round(baseWidth * productScale / 100));
  const targetHeight = Math.max(1, Math.round(baseHeight * productScale / 100));
  const offsetX = Math.round(width * offsetXPercent / 100);
  const offsetY = Math.round(height * offsetYPercent / 100);
  const objectFit = String(presentation.objectFit || "contain") === "cover" ? "cover" : "contain";

  const root = await mkdtemp(join(tmpdir(), "aione-white-bg-"));
  const inputPath = join(root, "input");
  const outputPath = join(root, "output.jpg");
  await writeFile(inputPath, bytes);
  try {
    const resizeArgs = objectFit === "cover"
      ? ["-resize", `${targetWidth}x${targetHeight}^`, "-gravity", "center", "-extent", `${targetWidth}x${targetHeight}`]
      : ["-resize", `${targetWidth}x${targetHeight}`];
    await execFileAsync("convert", [
      "-size", `${width}x${height}`, "xc:white",
      "(", inputPath, "-auto-orient", ...resizeArgs, "-background", "white", "-alpha", "remove", "-alpha", "off", ")",
      "-gravity", "center", "-geometry", `${offsetX >= 0 ? "+" : ""}${offsetX}${offsetY >= 0 ? "+" : ""}${offsetY}`,
      "-composite", "-strip", "-quality", "94", outputPath
    ], { maxBuffer: 20 * 1024 * 1024 });
    const output = await readFile(outputPath);
    if (!output.length) {
      const error = new Error("White-background renderer produced no bytes.");
      error.code = "design_output_empty";
      throw error;
    }
    return output;
  } finally {
    await rm(root, { recursive: true, force: true }).catch(() => {});
  }
}

async function startAIExecution(client, task, context, promptHash) {
  const id = makeId("aix");
  await client.query(
    `INSERT INTO public.ai_executions
      (id, requested_by_person_id, objective, status, provider, model, started_at, metadata)
     VALUES ($1,$2,$3,'running','openai',$4,NOW(),$5::jsonb)`,
    [
      id,
      context.personId || null,
      `Clean white background for product ${task.product_id}`,
      process.env.AIONE_AI_IMAGE_MODEL || "gpt-image-2.5-sunburst",
      JSON.stringify({ modality: "image", designTaskId: task.id, templateId: task.template_id, operationType: "compose_white_background_product", promptHash })
    ]
  );
  await client.query("UPDATE public.design_tasks SET ai_execution_id=$2 WHERE id=$1", [task.id, id]);
  return id;
}

async function finishAIExecution(client, id, generated, outputAssetId) {
  await client.query(
    `UPDATE public.ai_executions
        SET status='completed', completed_at=NOW(), provider=$2, model=$3,
            result_summary=$4, metadata=metadata || $5::jsonb, updated_at=NOW()
      WHERE id=$1`,
    [
      id,
      generated.provider,
      generated.model,
      "white-background DERIVED asset created",
      JSON.stringify({ quality: generated.quality, outputAssetId, usage: generated.usage || null })
    ]
  );
}

async function failAIExecution(client, id, error) {
  if (!id) return;
  await client.query(
    `UPDATE public.ai_executions
        SET status='failed', completed_at=NOW(), result_summary=$2,
            metadata=metadata || $3::jsonb, updated_at=NOW()
      WHERE id=$1`,
    [
      id,
      String(error.message || "White-background image execution failed.").slice(0, 4000),
      JSON.stringify({ failureCode: error.code || "white_background_execution_failed" })
    ]
  ).catch(() => {});
}

function derivedObjectName(productId, taskId, canonicalName) {
  return `derived/${productId}/${taskId}/v1/${canonicalName}`;
}

export async function executeWhiteBackgroundProduct(client, taskId, context = {}) {
  let task = await getDesignTask(client, taskId);
  if (task.task_type !== "compose_white_background_product") {
    const error = new Error("This executor only supports compose_white_background_product tasks.");
    error.statusCode = 409;
    error.code = "unsupported_design_task_type";
    throw error;
  }

  if (task.task_status === "completed") {
    const outputs = await listDesignTaskOutputs(client, taskId);
    if (outputs.length) return { task, outputs, reused: true, executionMode: resolveWhiteBackgroundExecutionMode(task) };
  }
  if (task.task_status !== "approved") {
    const error = new Error("DesignTask must be approved before execution.");
    error.statusCode = 409;
    error.code = "design_task_not_approved";
    throw error;
  }

  const template = await getDesignTemplate(client, task.template_id);
  const allowed = Array.isArray(template.allowed_operations) ? template.allowed_operations : [];
  if (!allowed.includes("compose_white_background_product")) {
    const error = new Error("Selected DesignTemplate does not allow compose_white_background_product.");
    error.statusCode = 409;
    error.code = "design_operation_not_allowed";
    throw error;
  }
  const inputAsset = await loadSourceAsset(client, task);
  const executionMode = resolveWhiteBackgroundExecutionMode(task);

  const claimed = await client.query(
    `UPDATE public.design_tasks
        SET task_status='running', started_at=COALESCE(started_at,NOW()),
            updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1
      WHERE id=$1 AND task_status='approved'
      RETURNING *`,
    [taskId, context.personId || null]
  );
  if (!claimed.rowCount) {
    task = await getDesignTask(client, taskId);
    if (task.task_status === "completed") {
      const outputs = await listDesignTaskOutputs(client, taskId);
      if (outputs.length) return { task, outputs, reused: true, executionMode };
    }
    const error = new Error("White-background DesignTask is already claimed or no longer executable.");
    error.statusCode = 409;
    error.code = "design_task_execution_conflict";
    throw error;
  }
  task = claimed.rows[0];

  await recordBusinessEvent(client, {
    eventType: "product.design_execution_started",
    objectType: "product",
    objectId: task.product_id,
    context,
    payload: { taskId, operationType: "compose_white_background_product", executionMode, inputAssetId: inputAsset.id }
  });

  let aiExecutionId = null;
  try {
    const canonical = await readGcsObject({ bucketName: inputAsset.metadata.gcsBucket, objectName: inputAsset.metadata.gcsObject });
    let sourceBytes = canonical.bytes;
    let generated = null;
    let promptHash = null;

    if (executionMode === "hybrid") {
      const prompt = buildWhiteBackgroundPrompt(task);
      promptHash = sha256(Buffer.from(prompt, "utf8"));
      aiExecutionId = await startAIExecution(client, task, context, promptHash);
      generated = await runOpenAIImageEdit({
        prompt,
        images: [{
          bytes: canonical.bytes,
          contentType: canonical.contentType || inputAsset.mime_type || "image/jpeg",
          filename: inputAsset.canonical_name || inputAsset.original_name || `${inputAsset.id}.jpg`
        }],
        size: "1024x1024"
      });
      sourceBytes = generated.bytes;
    }

    const outputBytes = await renderExactWhiteCanvas(sourceBytes, template, task);
    const fileHash = sha256(outputBytes);
    const prior = await client.query(
      `SELECT * FROM public.product_assets
        WHERE product_id=$1 AND archived_at IS NULL
          AND metadata->>'layer'='DERIVED'
          AND metadata->>'designTaskId'=$2
          AND metadata->>'operationType'='compose_white_background_product'
        LIMIT 1`,
      [task.product_id, taskId]
    );
    if (prior.rowCount) {
      const completed = await client.query(
        `UPDATE public.design_tasks
            SET task_status='completed', completed_at=COALESCE(completed_at,NOW()),
                failure_code=NULL, failure_detail=NULL,
                updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1
          WHERE id=$1 RETURNING *`,
        [taskId, context.personId || null]
      );
      if (generated && aiExecutionId) await finishAIExecution(client, aiExecutionId, generated, prior.rows[0].id);
      return { task: completed.rows[0], outputs: prior.rows, reused: true, executionMode };
    }

    const product = await client.query(
      "SELECT id, product_code FROM public.products WHERE id=$1 AND archived_at IS NULL LIMIT 1",
      [task.product_id]
    );
    if (!product.rowCount) {
      const error = new Error("Product not found during white-background execution.");
      error.statusCode = 404;
      error.code = "product_not_found";
      throw error;
    }
    const assetNo = await nextAssetNo(client, task.product_id);
    const canonicalName = `${product.rows[0].product_code}_D${String(assetNo).padStart(2, "0")}.jpg`;
    const bucketName = inputAsset.metadata.gcsBucket;
    const gcsObject = derivedObjectName(task.product_id, taskId, canonicalName);
    const metadata = {
      layer: "DERIVED",
      designTaskId: taskId,
      designTemplateId: template.id,
      designTemplateVersion: template.version,
      sourceAssetIds: [inputAsset.id],
      operationType: "compose_white_background_product",
      executionType: executionMode,
      aiExecutionId,
      aiProvider: generated?.provider || null,
      aiModel: generated?.model || null,
      promptHash,
      fileSha256: fileHash,
      byteSize: outputBytes.length,
      width: Number(template.canvas_width),
      height: Number(template.canvas_height),
      gcsBucket: bucketName,
      gcsObject,
      background: "#FFFFFF",
      validation: {
        storage: "passed",
        dimensions: "normalized_to_template",
        background: "white",
        sourceTruthRequired: true,
        humanReviewRequired: true
      },
      review: { status: "pending" }
    };
    const uploaded = await uploadGcsObjectIfAbsent({
      bucketName,
      objectName: gcsObject,
      buffer: outputBytes,
      contentType: "image/jpeg",
      metadata: {
        layer: "DERIVED",
        productId: task.product_id,
        designTaskId: taskId,
        designTemplateId: template.id,
        designTemplateVersion: String(template.version),
        operationType: "compose_white_background_product",
        executionType: executionMode,
        fileSha256: fileHash,
        sourceAssetId: inputAsset.id,
        aiExecutionId: aiExecutionId || ""
      }
    });
    const inserted = await client.query(
      `INSERT INTO public.product_assets
        (id, product_id, asset_no, asset_type, asset_role, source_provider, source_ref,
         original_name, canonical_name, mime_type, lifecycle_status, metadata,
         created_by_person_id, updated_by_person_id, source_system)
       VALUES ($1,$2,$3,'image','derived_white_background_product','aione-design',$4,$5,$5,'image/jpeg','formalized',$6::jsonb,$7,$7,$8)
       RETURNING *`,
      [
        makeId("ast"), task.product_id, assetNo, `${taskId}:compose_white_background_product:v1`, canonicalName,
        JSON.stringify(metadata), context.personId || null, context.sourceSystem || "aione-design-engine-v1"
      ]
    );
    if (generated && aiExecutionId) await finishAIExecution(client, aiExecutionId, generated, inserted.rows[0].id);

    const completed = await client.query(
      `UPDATE public.design_tasks
          SET task_status='completed', completed_at=NOW(), failure_code=NULL, failure_detail=NULL,
              updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1
        WHERE id=$1 RETURNING *`,
      [taskId, context.personId || null]
    );
    await recordBusinessEvent(client, {
      eventType: "product.derived_asset_created",
      objectType: "product",
      objectId: task.product_id,
      context,
      payload: {
        taskId,
        outputAssetId: inserted.rows[0].id,
        inputAssetId: inputAsset.id,
        operationType: "compose_white_background_product",
        executionMode,
        aiExecutionId,
        gcsObject,
        reusedGcsObject: uploaded.reused
      }
    });
    await recordBusinessEvent(client, {
      eventType: "product.design_execution_completed",
      objectType: "product",
      objectId: task.product_id,
      context,
      payload: { taskId, outputAssetId: inserted.rows[0].id, operationType: "compose_white_background_product", executionMode }
    });
    return { task: completed.rows[0], outputs: [inserted.rows[0]], reused: false, executionMode };
  } catch (error) {
    await failAIExecution(client, aiExecutionId, error);
    await client.query(
      `UPDATE public.design_tasks
          SET task_status='failed', failure_code=$2, failure_detail=$3::jsonb,
              completed_at=NOW(), updated_by_person_id=$4, updated_at=NOW(), record_version=record_version+1
        WHERE id=$1 AND task_status='running'`,
      [
        taskId,
        error.code || "white_background_execution_failed",
        JSON.stringify({ message: error.message || "White-background execution failed." }),
        context.personId || null
      ]
    );
    await recordBusinessEvent(client, {
      eventType: "product.design_execution_failed",
      objectType: "product",
      objectId: task.product_id,
      context,
      payload: { taskId, code: error.code || "white_background_execution_failed", operationType: "compose_white_background_product", executionMode }
    });
    throw error;
  }
}
