import { createDesignTask } from "./design-task-service.js";
import {
  assertTemplateSetItemExecutable,
  getDesignTemplateSetItem
} from "./design-template-set-service.js";

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function mergeInstructionDefaults(defaults, supplied) {
  const base = defaults && typeof defaults === "object" && !Array.isArray(defaults) ? defaults : {};
  const override = supplied && typeof supplied === "object" && !Array.isArray(supplied) ? supplied : {};
  return { ...base, ...override };
}

export async function createDesignTaskFromTemplateSetPage(client, {
  productId,
  templateSetItemId,
  inputAssetIds,
  inputFactSnapshot = {},
  instructionSnapshot = {},
  context = {}
}) {
  const normalizedProductId = cleanText(productId, 240);
  const item = assertTemplateSetItemExecutable(
    await getDesignTemplateSetItem(client, templateSetItemId)
  );

  const mergedInstructions = mergeInstructionDefaults(
    item.instruction_defaults,
    instructionSnapshot
  );

  const created = await createDesignTask(client, {
    productId: normalizedProductId,
    templateId: item.template_id,
    taskType: item.output_type,
    inputAssetIds,
    inputFactSnapshot: {
      ...(inputFactSnapshot || {}),
      designTemplateSetId: item.template_set_id,
      designTemplateSetVersion: item.template_set_version,
      designTemplateSetItemId: item.id,
      designPageCode: item.page_code,
      designPageNo: item.page_no
    },
    instructionSnapshot: mergedInstructions,
    context
  });

  const task = created.task;
  if (task.template_set_item_id && task.template_set_item_id !== item.id) {
    const error = new Error("Existing DesignTask is already bound to another template-set page.");
    error.statusCode = 409;
    error.code = "design_task_template_set_conflict";
    throw error;
  }

  const updated = await client.query(
    `UPDATE public.design_tasks
        SET template_set_id=$2,
            template_set_item_id=$3,
            page_code=$4,
            page_no=$5,
            updated_by_person_id=$6,
            updated_at=NOW(),
            record_version=CASE
              WHEN template_set_item_id IS DISTINCT FROM $3 OR template_set_id IS DISTINCT FROM $2
                THEN record_version+1
              ELSE record_version
            END
      WHERE id=$1
      RETURNING *`,
    [
      task.id,
      item.template_set_id,
      item.id,
      item.page_code,
      item.page_no,
      context.personId || null
    ]
  );

  return {
    ...created,
    task: updated.rows[0],
    templateSetPage: item
  };
}

export async function listTemplateSetTasksForProduct(client, productId, templateSetId) {
  const values = [cleanText(productId, 240)];
  const where = ["t.product_id=$1", "t.archived_at IS NULL", "t.template_set_id IS NOT NULL"];
  const normalizedSetId = cleanText(templateSetId, 240);
  if (normalizedSetId) {
    values.push(normalizedSetId);
    where.push(`t.template_set_id=$${values.length}`);
  }
  const result = await client.query(
    `SELECT t.*, s.set_code, s.name AS template_set_name, s.version AS template_set_version,
            i.page_code AS template_page_code, i.page_name AS template_page_name,
            i.page_no AS template_page_no,
            dt.template_code, dt.name AS template_name, dt.version AS template_version,
            dt.output_type, dt.canvas_width, dt.canvas_height
       FROM public.design_tasks t
       JOIN public.design_template_sets s ON s.id=t.template_set_id
       JOIN public.design_template_set_items i ON i.id=t.template_set_item_id
       JOIN public.design_templates dt ON dt.id=t.template_id
      WHERE ${where.join(" AND ")}
      ORDER BY t.page_no NULLS LAST, t.created_at DESC`,
    values
  );
  return result.rows;
}
