import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { getDesignTask } from "./design-task-service.js";
import { getDesignTemplate } from "./design-template-service.js";
import { readGcsObject, uploadGcsObjectIfAbsent } from "../integrations/google-cloud-storage-client.js";
import { recordBusinessEvent } from "./event-service.js";

const execFileAsync = promisify(execFile);

function makeId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function derivedObjectName(productId, taskId, canonicalName) {
  return `derived/${productId}/${taskId}/v1/${canonicalName}`;
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

async function loadInputAsset(client, task) {
  const ids = Array.isArray(task.input_asset_ids) ? task.input_asset_ids : [];
  if (!ids.length) {
    const error = new Error("DesignTask has no input ProductAsset.");
    error.statusCode = 409;
    error.code = "design_input_assets_required";
    throw error;
  }
  const result = await client.query(
    `SELECT * FROM public.product_assets
      WHERE id=$1 AND product_id=$2 AND archived_at IS NULL
      LIMIT 1`,
    [ids[0], task.product_id]
  );
  if (!result.rowCount) {
    const error = new Error("DesignTask input ProductAsset was not found.");
    error.statusCode = 409;
    error.code = "design_input_asset_missing";
    throw error;
  }
  const asset = result.rows[0];
  const metadata = asset.metadata || {};
  if (metadata.layer !== "SOURCE") {
    const error = new Error("normalize_canvas V1 requires a canonical SOURCE ProductAsset.");
    error.statusCode = 409;
    error.code = "design_source_asset_required";
    throw error;
  }
  if (!metadata.gcsBucket || !metadata.gcsObject) {
    const error = new Error("DesignTask input asset has no canonical GCS storage reference.");
    error.statusCode = 409;
    error.code = "canonical_asset_storage_missing";
    throw error;
  }
  return asset;
}

async function normalizeCanvas(bytes, { width, height }) {
  const workRoot = await mkdtemp(join(tmpdir(), "aione-design-normalize-"));
  const inputPath = join(workRoot, "input");
  const outputPath = join(workRoot, "output.jpg");
  await writeFile(inputPath, bytes);
  try {
    await execFileAsync("convert", [
      inputPath,
      "-auto-orient",
      "-resize", `${width}x${height}`,
      "-background", "white",
      "-gravity", "center",
      "-extent", `${width}x${height}`,
      "-strip",
      "-quality", "92",
      outputPath
    ], { maxBuffer: 20 * 1024 * 1024 });
    const output = await readFile(outputPath);
    if (!output.length) {
      const error = new Error("Deterministic canvas normalization produced no bytes.");
      error.code = "design_output_empty";
      throw error;
    }
    return output;
  } finally {
    await rm(workRoot, { recursive: true, force: true }).catch(() => {});
  }
}

export async function listDesignTaskOutputs(client, taskId) {
  const task = await getDesignTask(client, taskId);
  const result = await client.query(
    `SELECT * FROM public.product_assets
      WHERE product_id=$1
        AND archived_at IS NULL
        AND metadata->>'layer'='DERIVED'
        AND metadata->>'designTaskId'=$2
      ORDER BY asset_no`,
    [task.product_id, taskId]
  );
  return result.rows;
}

export async function executeNormalizeCanvas(client, taskId, context = {}) {
  const task = await getDesignTask(client, taskId);
  if (task.task_type !== "normalize_canvas") {
    const error = new Error("This executor only supports normalize_canvas tasks.");
    error.statusCode = 409;
    error.code = "unsupported_design_task_type";
    throw error;
  }

  if (task.task_status === "completed") {
    const outputs = await listDesignTaskOutputs(client, taskId);
    if (outputs.length) return { task, outputs, reused: true };
  }

  if (task.task_status !== "approved") {
    const error = new Error("DesignTask must be approved before execution.");
    error.statusCode = 409;
    error.code = "design_task_not_approved";
    throw error;
  }

  const template = await getDesignTemplate(client, task.template_id);
  const allowedOperations = Array.isArray(template.allowed_operations) ? template.allowed_operations : [];
  if (!allowedOperations.includes("normalize_canvas")) {
    const error = new Error("Selected DesignTemplate does not allow normalize_canvas.");
    error.statusCode = 409;
    error.code = "design_operation_not_allowed";
    throw error;
  }

  const inputAsset = await loadInputAsset(client, task);

  await client.query(
    `UPDATE public.design_tasks
        SET task_status='running', started_at=COALESCE(started_at,NOW()),
            updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1
      WHERE id=$1`,
    [taskId, context.personId || null]
  );
  await recordBusinessEvent(client, {
    eventType: "product.design_execution_started",
    objectType: "product",
    objectId: task.product_id,
    context,
    payload: { taskId, operationType: "normalize_canvas", inputAssetId: inputAsset.id }
  });

  try {
    const canonical = await readGcsObject({
      bucketName: inputAsset.metadata.gcsBucket,
      objectName: inputAsset.metadata.gcsObject
    });
    const outputBytes = await normalizeCanvas(canonical.bytes, {
      width: Number(template.canvas_width),
      height: Number(template.canvas_height)
    });
    const fileHash = sha256(outputBytes);

    const prior = await client.query(
      `SELECT * FROM public.product_assets
        WHERE product_id=$1 AND archived_at IS NULL
          AND metadata->>'layer'='DERIVED'
          AND metadata->>'designTaskId'=$2
          AND metadata->>'operationType'='normalize_canvas'
        LIMIT 1`,
      [task.product_id, taskId]
    );
    if (prior.rowCount) {
      const completed = await client.query(
        `UPDATE public.design_tasks
            SET task_status='completed', completed_at=COALESCE(completed_at,NOW()),
                failure_code=NULL, failure_detail=NULL,
                updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1
          WHERE id=$1
          RETURNING *`,
        [taskId, context.personId || null]
      );
      return { task: completed.rows[0], outputs: prior.rows, reused: true };
    }

    const product = await client.query(
      "SELECT id, product_code FROM public.products WHERE id=$1 AND archived_at IS NULL LIMIT 1",
      [task.product_id]
    );
    if (!product.rowCount) {
      const error = new Error("Product not found during design execution.");
      error.code = "product_not_found";
      error.statusCode = 404;
      throw error;
    }

    const assetNo = await nextAssetNo(client, task.product_id);
    const canonicalName = `${product.rows[0].product_code}_D${String(assetNo).padStart(2, "0")}.jpg`;
    const bucketName = inputAsset.metadata.gcsBucket;
    const gcsObject = derivedObjectName(task.product_id, taskId, canonicalName);

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
        designTemplateVersion: template.version,
        operationType: "normalize_canvas",
        sourceAssetId: inputAsset.id,
        fileSha256: fileHash
      }
    });

    const metadata = {
      layer: "DERIVED",
      designTaskId: taskId,
      designTemplateId: template.id,
      designTemplateVersion: template.version,
      sourceAssetIds: [inputAsset.id],
      operationType: "normalize_canvas",
      executionType: "deterministic",
      fileSha256: fileHash,
      byteSize: outputBytes.length,
      width: Number(template.canvas_width),
      height: Number(template.canvas_height),
      gcsBucket: bucketName,
      gcsObject,
      validation: {
        storage: "passed",
        dimensions: "normalized_to_template",
        humanReviewRequired: true
      },
      review: { status: "pending" }
    };

    const inserted = await client.query(
      `INSERT INTO public.product_assets
        (id, product_id, asset_no, asset_type, asset_role, source_provider, source_ref,
         original_name, canonical_name, mime_type, lifecycle_status, metadata,
         created_by_person_id, updated_by_person_id, source_system)
       VALUES ($1,$2,$3,'image','derived_detail_image','aione-design',$4,$5,$5,'image/jpeg','formalized',$6::jsonb,$7,$7,$8)
       RETURNING *`,
      [
        makeId("ast"),
        task.product_id,
        assetNo,
        `${taskId}:normalize_canvas:v1`,
        canonicalName,
        JSON.stringify(metadata),
        context.personId || null,
        context.sourceSystem || "aione-ai-assisted-design-v2"
      ]
    );

    const completed = await client.query(
      `UPDATE public.design_tasks
          SET task_status='completed', completed_at=NOW(),
              failure_code=NULL, failure_detail=NULL,
              updated_by_person_id=$2, updated_at=NOW(), record_version=record_version+1
        WHERE id=$1
        RETURNING *`,
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
        operationType: "normalize_canvas",
        canvasWidth: Number(template.canvas_width),
        canvasHeight: Number(template.canvas_height),
        gcsObject,
        reusedGcsObject: uploaded.reused
      }
    });
    await recordBusinessEvent(client, {
      eventType: "product.design_execution_completed",
      objectType: "product",
      objectId: task.product_id,
      context,
      payload: { taskId, outputAssetId: inserted.rows[0].id, operationType: "normalize_canvas" }
    });

    return { task: completed.rows[0], outputs: [inserted.rows[0]], reused: false };
  } catch (error) {
    await client.query(
      `UPDATE public.design_tasks
          SET task_status='failed', failure_code=$2, failure_detail=$3::jsonb,
              completed_at=NOW(), updated_by_person_id=$4, updated_at=NOW(), record_version=record_version+1
        WHERE id=$1`,
      [
        taskId,
        error.code || "design_execution_failed",
        JSON.stringify({ message: error.message || "Design execution failed." }),
        context.personId || null
      ]
    );
    await recordBusinessEvent(client, {
      eventType: "product.design_execution_failed",
      objectType: "product",
      objectId: task.product_id,
      context,
      payload: { taskId, code: error.code || "design_execution_failed" }
    });
    throw error;
  }
}
