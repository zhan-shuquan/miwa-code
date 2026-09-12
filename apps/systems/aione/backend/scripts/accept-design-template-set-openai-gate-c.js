import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "../db.js";
import { getDesignTemplate } from "../src/services/design-template-service.js";
import { getDesignTemplateSetItem } from "../src/services/design-template-set-service.js";
import { createDesignTaskFromTemplateSetPage } from "../src/services/design-template-set-task-service.js";
import { executeBenefitFeatureImageTechnicalAcceptance } from "../src/services/design-ai-output-service.js";
import { resolveCurrentCuratedFolder } from "../src/services/product-curated-folder-contract.js";
import { getGcsObjectMetadata } from "../src/integrations/google-cloud-storage-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = path.resolve(__dirname, "../../../../../data-code/migrations/0096_design_template_sets_v1.sql");
const PRODUCT_CODE = String(process.env.AIONE_ACCEPT_IMAGE_PRODUCT_CODE || "MH0000002").trim();
const TEMPLATE_SET_ID = "dtset_socks_rakuten_base_v1";
const TEMPLATE_SET_ITEM_ID = "dtsi_socks_rakuten_base_benefit_v1";
const TEMPLATE_ID = "dtpl_socks_rakuten_benefit_1000x1500_v1";
const DEFAULT_PROMPT = [
  "Create exactly one premium Japanese Rakuten ecommerce benefit/feature image using the supplied real product photos as the visual truth.",
  "The real socks must remain immediately recognizable: preserve the exact visible sock shape, stripe/rib pattern, colors, knit texture and construction from the SOURCE images.",
  "Do not replace the socks with another pattern, another length, another colorway or another product style.",
  "Use a clean Japanese ecommerce composition with generous spacing and a restrained neutral background.",
  "Do not add unsupported measurements, materials, certifications, warmth claims, performance claims, logos, accessories or invented product details.",
  "If text is needed for composition, use only neutral labels such as DETAIL or POINT."
].join("\n");

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function migrationBody(sql) {
  const withoutBegin = String(sql || "").replace(/^\s*BEGIN;\s*/i, "");
  const withoutCommit = withoutBegin.replace(/\s*COMMIT;\s*$/i, "");
  if (withoutCommit === sql || /\bCOMMIT;\s*$/i.test(withoutCommit)) {
    fail("Gate C could not isolate migration 0096 transaction boundaries.");
  }
  return withoutCommit;
}

async function migrationState(client) {
  const result = await client.query(
    `SELECT EXISTS(
       SELECT 1 FROM public.schema_migrations WHERE version='0096'
     ) AS applied`
  );
  return Boolean(result.rows[0]?.applied);
}

async function loadExactlyOneProduct(client) {
  const result = await client.query(
    `SELECT id, product_code, name, lifecycle_status
       FROM public.products
      WHERE product_code=$1 AND archived_at IS NULL
      LIMIT 2`,
    [PRODUCT_CODE]
  );
  if (result.rowCount !== 1) {
    fail("Gate C requires exactly one real Product for the requested product code.", {
      productCode: PRODUCT_CODE,
      count: result.rowCount
    });
  }
  return result.rows[0];
}

async function loadCurrentMaterialConfirmation(client, productId) {
  const result = await client.query(
    `SELECT * FROM public.product_material_confirmations
      WHERE product_id=$1 AND status='confirmed' AND archived_at IS NULL
      ORDER BY version DESC
      LIMIT 2`,
    [productId]
  );
  if (result.rowCount !== 1) {
    fail("Gate C requires exactly one CURRENT human-confirmed material snapshot.", {
      productId,
      count: result.rowCount
    });
  }
  return result.rows[0];
}

async function selectExactTechnicalAcceptanceAssets(client, product, template, confirmation) {
  const requiredRoles = Array.isArray(template.required_source_roles)
    ? template.required_source_roles.map(String).filter(Boolean)
    : [];
  if (!requiredRoles.length) {
    fail("Gate C template must declare required SOURCE roles.", { templateId: template.id });
  }

  const result = await client.query(
    `SELECT id, asset_no, asset_role, canonical_name, original_name, mime_type, metadata
       FROM public.product_assets
      WHERE product_id=$1
        AND archived_at IS NULL
        AND metadata->>'layer'='SOURCE'
        AND asset_role = ANY($2::text[])
      ORDER BY asset_no`,
    [product.id, requiredRoles]
  );

  const selected = [];
  for (const role of requiredRoles) {
    const asset = result.rows.find((row) => row.asset_role === role);
    if (!asset) fail("Gate C real Product is missing a required SOURCE role.", { role, productCode: product.product_code });
    selected.push(asset);
  }

  const confirmedIds = new Set(
    Array.isArray(confirmation.asset_ids)
      ? confirmation.asset_ids.map((value) => String(value || "").trim()).filter(Boolean)
      : []
  );
  const outsideConfirmation = selected.filter((asset) => !confirmedIds.has(asset.id));
  if (outsideConfirmation.length) {
    fail("Gate C technical-acceptance SOURCE selection differs from the CURRENT human-confirmed material snapshot.", {
      unconfirmedAssetIds: outsideConfirmation.map((asset) => asset.id),
      roles: outsideConfirmation.map((asset) => asset.asset_role)
    });
  }

  return selected;
}

async function proveSelectedTemplatePageAgainstRealProduct() {
  const client = await pool.connect();
  let proof;
  let migrationAppliedBefore = false;
  try {
    migrationAppliedBefore = await migrationState(client);
    await client.query("BEGIN");

    if (!migrationAppliedBefore) {
      const rawMigration = await fs.readFile(MIGRATION_PATH, "utf8");
      await client.query(migrationBody(rawMigration));
    }

    const item = await getDesignTemplateSetItem(client, TEMPLATE_SET_ITEM_ID);
    if (item.template_set_id !== TEMPLATE_SET_ID || item.template_id !== TEMPLATE_ID) {
      fail("Gate C selected Template Set/Page binding is not CURRENT validator binding.", {
        templateSetId: item.template_set_id,
        templateId: item.template_id
      });
    }

    const product = await loadExactlyOneProduct(client);
    const confirmation = await loadCurrentMaterialConfirmation(client, product.id);
    const template = await getDesignTemplate(client, item.template_id);
    const sourceAssets = await selectExactTechnicalAcceptanceAssets(client, product, template, confirmation);
    const prompt = String(process.env.AIONE_ACCEPT_IMAGE_PROMPT || DEFAULT_PROMPT).trim();
    if (!prompt) fail("Gate C prompt is empty.");

    const categoryScope = String(item.template_set_category_scope || "").trim();
    const channelScope = String(item.template_set_channel_scope || "").trim();
    if (!categoryScope) fail("Gate C selected Template Set has no category scope.");

    const context = {
      personId: null,
      actorKind: "system",
      sourceSystem: "aione-design-template-set-gate-c-v1",
      correlationId: `gate-c:${product.product_code}:${TEMPLATE_SET_ITEM_ID}`
    };

    const created = await createDesignTaskFromTemplateSetPage(client, {
      productId: product.id,
      templateSetItemId: TEMPLATE_SET_ITEM_ID,
      inputAssetIds: sourceAssets.map((asset) => asset.id),
      inputFactSnapshot: {
        productCode: product.product_code,
        productName: product.name || null,
        category: categoryScope,
        targetChannel: channelScope || null,
        validationPurpose: "design-template-set-gate-c"
      },
      instructionSnapshot: { prompt },
      context
    });

    const task = created.task;
    if (!task) fail("Gate C selected Template Set/Page produced no DesignTask.");
    if (task.template_set_id !== TEMPLATE_SET_ID || task.template_set_item_id !== TEMPLATE_SET_ITEM_ID) {
      fail("Gate C DesignTask lost selected Template Set/Page identity.", {
        templateSetId: task.template_set_id,
        templateSetItemId: task.template_set_item_id
      });
    }
    if (task.template_id !== TEMPLATE_ID || task.page_code !== item.page_code || Number(task.page_no) !== Number(item.page_no)) {
      fail("Gate C DesignTask template/page binding is incorrect.", {
        templateId: task.template_id,
        pageCode: task.page_code,
        pageNo: task.page_no
      });
    }
    if (task.material_confirmation_id !== confirmation.id || task.material_snapshot_hash !== confirmation.snapshot_hash) {
      fail("Gate C DesignTask is not bound to the CURRENT human-confirmed material snapshot.");
    }

    proof = {
      product,
      prompt,
      categoryScope,
      channelScope: channelScope || null,
      templateSetId: TEMPLATE_SET_ID,
      templateSetItemId: TEMPLATE_SET_ITEM_ID,
      pageCode: item.page_code,
      pageNo: Number(item.page_no),
      templateId: item.template_id,
      materialConfirmationId: confirmation.id,
      materialSnapshotHash: confirmation.snapshot_hash,
      ephemeralTaskId: task.id,
      ephemeralTaskStatus: task.task_status,
      sourceAssets: sourceAssets.map((asset) => {
        const folderResolution = resolveCurrentCuratedFolder(asset);
        return {
          id: asset.id,
          role: asset.asset_role,
          canonicalName: asset.canonical_name,
          sourceFolder: folderResolution.folder,
          folderResolutionSource: folderResolution.source
        };
      })
    };

    await client.query("ROLLBACK");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  const migrationAppliedAfterResult = await pool.query(
    `SELECT EXISTS(
       SELECT 1 FROM public.schema_migrations WHERE version='0096'
     ) AS applied`
  );
  const migrationAppliedAfter = Boolean(migrationAppliedAfterResult.rows[0]?.applied);
  if (migrationAppliedAfter !== migrationAppliedBefore) {
    fail("Gate C changed CURRENT schema migration state; this is forbidden before merge.", {
      migrationAppliedBefore,
      migrationAppliedAfter
    });
  }

  return {
    ...proof,
    migrationAppliedBefore,
    migrationAppliedAfter,
    temporarySchemaRolledBack: !migrationAppliedBefore
  };
}

async function main() {
  if (!String(process.env.OPENAI_API_KEY || "").trim()) {
    fail("OPENAI_API_KEY is required for Gate C live OpenAI generation.");
  }

  const proof = await proveSelectedTemplatePageAgainstRealProduct();
  const context = {
    personId: null,
    actorKind: "system",
    sourceSystem: "aione-design-template-set-gate-c-v1",
    correlationId: `gate-c:${proof.product.product_code}:${proof.templateSetItemId}`
  };

  const generated = await executeBenefitFeatureImageTechnicalAcceptance(pool, {
    productCode: proof.product.product_code,
    templateId: proof.templateId,
    prompt: proof.prompt
  }, context);

  const output = generated.output;
  if (!output) fail("Gate C OpenAI generation produced no DERIVED ProductAsset.");
  if (output.metadata?.layer !== "DERIVED") fail("Gate C output is not DERIVED.");
  if (output.metadata?.review?.status !== "pending") fail("Gate C output must remain pending explicit human visual review.");
  if (Number(output.metadata?.width) !== 1000 || Number(output.metadata?.height) !== 1500) {
    fail("Gate C output canvas is not 1000x1500.");
  }

  const generatedSourceIds = Array.isArray(output.metadata?.sourceAssetIds)
    ? output.metadata.sourceAssetIds.map(String)
    : [];
  const taskSourceIds = proof.sourceAssets.map((asset) => asset.id);
  if (JSON.stringify(generatedSourceIds) !== JSON.stringify(taskSourceIds)) {
    fail("Gate C OpenAI generation did not use the exact SOURCE assets proven by the selected Template Set/Page task.", {
      taskSourceIds,
      generatedSourceIds
    });
  }

  const gcs = await getGcsObjectMetadata({
    bucketName: output.metadata.gcsBucket,
    objectName: output.metadata.gcsObject
  });
  if (!gcs || Number(gcs.size || 0) <= 0) fail("Gate C DERIVED GCS object is missing or empty.");

  process.stdout.write(`${JSON.stringify({
    contract: "AIONE Design Template Set Gate C V1",
    ok: true,
    gateA: "passed-in-ci",
    gateB: "passed-in-ci-and-reproven-against-real-product",
    gateC: "live-openai-derived-product-asset-created",
    productCode: proof.product.product_code,
    productName: proof.product.name || null,
    categoryScope: proof.categoryScope,
    channelScope: proof.channelScope,
    templateSetId: proof.templateSetId,
    templateSetItemId: proof.templateSetItemId,
    pageCode: proof.pageCode,
    pageNo: proof.pageNo,
    templateId: proof.templateId,
    materialConfirmationId: proof.materialConfirmationId,
    sourceAssets: proof.sourceAssets,
    ephemeralTaskId: proof.ephemeralTaskId,
    temporarySchemaRolledBack: proof.temporarySchemaRolledBack,
    migrationAppliedBefore: proof.migrationAppliedBefore,
    migrationAppliedAfter: proof.migrationAppliedAfter,
    outputAssetId: output.id,
    aiExecutionId: generated.aiExecutionId,
    provider: generated.provider,
    model: generated.model,
    canvas: `${output.metadata.width}x${output.metadata.height}`,
    gcsBucket: output.metadata.gcsBucket,
    gcsObject: output.metadata.gcsObject,
    reviewStatus: output.metadata.review.status,
    mainMergeAllowed: false,
    nextRequiredAction: "explicit-human-visual-review"
  }, null, 2)}\n`);
  process.stdout.write("[AIONE] DESIGN TEMPLATE SET GATE C LIVE OPENAI PASS - HUMAN VISUAL REVIEW REQUIRED\n");
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.code || "design_template_set_gate_c_failed",
    message: error.message,
    details: error.details || undefined
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
