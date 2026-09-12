import pool from "../db.js";

const PRODUCT_CODE = String(process.env.AIONE_ACCEPT_IMAGE_PRODUCT_CODE || "MH0000002").trim();
const TEMPLATE_SET_ID = "dtset_mens_socks_rakuten_detail_v1";
const TRIAL_PAGE_CODES = ["MS-HERO-01", "MS-REASON1-04", "MS-SIZE-12"];

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function pickFact(productData, keys) {
  for (const key of keys) {
    if (productData?.[key] !== undefined && productData?.[key] !== null && productData?.[key] !== "") return { key, value: productData[key] };
  }
  return null;
}

function sourceDescriptor(asset) {
  return {
    id: asset.id,
    assetNo: asset.asset_no,
    assetRole: asset.asset_role,
    canonicalName: asset.canonical_name,
    originalName: asset.original_name,
    sourceFolder: asset.metadata?.sourceFolder || asset.metadata?.source_folder || null,
    driveFileId: asset.metadata?.driveFileId || null,
    sourceProvider: asset.source_provider,
    humanConfirmed: true
  };
}

async function main() {
  if (!PRODUCT_CODE) fail("Product Code is required for men's-socks Trial Gate C preflight.");

  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");

    const productResult = await client.query(
      `SELECT id, product_code, name, lifecycle_status, product_data, readiness_data, metadata
         FROM public.products
        WHERE product_code=$1 AND archived_at IS NULL
        LIMIT 2`,
      [PRODUCT_CODE]
    );
    if (productResult.rowCount !== 1) fail("Trial Gate C preflight requires exactly one Product.", { productCode: PRODUCT_CODE, count: productResult.rowCount });
    const product = productResult.rows[0];

    const confirmationResult = await client.query(
      `SELECT id, version, confirmed_at, asset_ids, snapshot_hash, confirmed_by_person_id, metadata
         FROM public.product_material_confirmations
        WHERE product_id=$1 AND status='confirmed' AND archived_at IS NULL
        ORDER BY version DESC
        LIMIT 2`,
      [product.id]
    );
    if (confirmationResult.rowCount !== 1) fail("Trial Gate C preflight requires exactly one CURRENT human-confirmed material snapshot.", { productCode: PRODUCT_CODE, count: confirmationResult.rowCount });
    const confirmation = confirmationResult.rows[0];
    const confirmedIds = asArray(confirmation.asset_ids).map(String);
    if (!confirmedIds.length) fail("CURRENT human-confirmed material snapshot contains no assets.");

    const setResult = await client.query(
      `SELECT id, set_code, name, version, category_scope, channel_scope, lifecycle_status, metadata
         FROM public.design_template_sets
        WHERE id=$1 AND archived_at IS NULL
        LIMIT 1`,
      [TEMPLATE_SET_ID]
    );
    if (!setResult.rowCount) fail("Men's-socks Template Set foundation is missing.", { templateSetId: TEMPLATE_SET_ID });
    const templateSet = setResult.rows[0];

    const pageResult = await client.query(
      `SELECT i.id, i.page_no, i.page_code, i.page_name, i.item_kind, i.template_id,
              i.field_bindings, i.asset_bindings, i.instruction_defaults, i.metadata,
              t.template_code, t.output_type, t.canvas_width, t.canvas_height,
              t.required_source_roles, t.required_product_facts, t.allowed_operations,
              t.lifecycle_status AS template_status, t.layout_spec, t.validation_rules
         FROM public.design_template_set_items i
         JOIN public.design_templates t ON t.id=i.template_id
        WHERE i.template_set_id=$1
          AND i.page_code = ANY($2::text[])
          AND i.archived_at IS NULL
        ORDER BY i.page_no`,
      [TEMPLATE_SET_ID, TRIAL_PAGE_CODES]
    );
    if (pageResult.rowCount !== 3) fail("Trial Gate C preflight requires exactly three trial pages.", { count: pageResult.rowCount });

    const assetResult = await client.query(
      `SELECT id, asset_no, asset_role, canonical_name, original_name, mime_type, lifecycle_status, metadata, source_provider
         FROM public.product_assets
        WHERE product_id=$1
          AND id = ANY($2::text[])
          AND archived_at IS NULL
          AND metadata->>'layer'='SOURCE'
          AND mime_type LIKE 'image/%'
        ORDER BY asset_no`,
      [product.id, confirmedIds]
    );
    if (assetResult.rowCount !== confirmedIds.length) {
      fail("CURRENT human-confirmed material snapshot references missing or non-SOURCE image assets.", {
        confirmedAssetCount: confirmedIds.length,
        resolvedAssetCount: assetResult.rowCount
      });
    }
    const assets = assetResult.rows.map(sourceDescriptor);

    const productData = product.product_data || {};
    const factEvidence = {
      setCount: pickFact(productData, ["bundleQuantityPairs", "setCount", "pairCount"]),
      actualVariants: pickFact(productData, ["colors", "actualVariants", "variants"]),
      approvedPrimaryValue: pickFact(productData, ["approvedPrimaryValue", "primarySellingPoint", "sellingPoint"]),
      sellingPoints: pickFact(productData, ["sellingPoints", "approvedSellingPoints", "features"]),
      supportedSize: pickFact(productData, ["supportedSize", "size", "sizeRange"]),
      measurements: pickFact(productData, ["measurements", "sizeMeasurements", "measurementGuide"])
    };

    const pagePreflight = pageResult.rows.map((page) => {
      const requiredFacts = asArray(page.field_bindings?.requiredFacts || page.required_product_facts).map(String);
      const missingFacts = requiredFacts.filter((fact) => !factEvidence[fact]);
      return {
        pageNo: Number(page.page_no),
        pageCode: page.page_code,
        pageName: page.page_name,
        itemKind: page.item_kind,
        templateId: page.template_id,
        templateCode: page.template_code,
        templateStatus: page.template_status,
        canvas: `${page.canvas_width}x${page.canvas_height}`,
        outputType: page.output_type,
        requiredFacts,
        missingFacts,
        semanticAssetRoles: asArray(page.asset_bindings?.semanticRoles),
        persistedRequiredSourceRoles: asArray(page.required_source_roles),
        allowedFolders: asArray(page.asset_bindings?.allowedFolders),
        textPolicy: page.instruction_defaults?.textPolicy || page.validation_rules?.textPolicy || null,
        copyLayerMode: page.instruction_defaults?.copyLayerMode || page.validation_rules?.copyLayerMode || null,
        highRiskNumericFacts: Boolean(page.instruction_defaults?.highRiskNumericFacts || page.metadata?.highRiskFacts),
        executableNow: false
      };
    });

    await client.query("ROLLBACK");

    const blockers = [];
    if (templateSet.lifecycle_status !== "draft") blockers.push(`unexpected_template_set_status:${templateSet.lifecycle_status}`);
    for (const page of pagePreflight) {
      for (const missing of page.missingFacts) blockers.push(`${page.pageCode}:missing_fact:${missing}`);
    }

    const payload = {
      contract: "AIONE Mens Socks Trial Gate C Preflight V2",
      ok: blockers.length === 0,
      readOnly: true,
      product: {
        id: product.id,
        productCode: product.product_code,
        name: product.name,
        lifecycleStatus: product.lifecycle_status,
        productData,
        readinessData: product.readiness_data || {},
        metadata: product.metadata || {}
      },
      materialConfirmation: {
        id: confirmation.id,
        version: confirmation.version,
        confirmedAt: confirmation.confirmed_at,
        confirmedByPersonId: confirmation.confirmed_by_person_id,
        snapshotHash: confirmation.snapshot_hash,
        confirmedAssetCount: confirmedIds.length,
        metadata: confirmation.metadata || {}
      },
      currentConfirmedSourceAssetCount: assets.length,
      currentConfirmedSourceAssets: assets,
      factEvidence,
      templateSet: {
        id: templateSet.id,
        code: templateSet.set_code,
        status: templateSet.lifecycle_status,
        implementationStage: templateSet.metadata?.implementationStage || null
      },
      trialPages: pagePreflight,
      blockers,
      nextAction: blockers.length ? "resolve-current-product-truth-blockers-before-any-image-generation" : "resolve-semantic-asset-bindings-and-execution-mode-before-gate-c"
    };

    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    for (const page of pagePreflight) {
      process.stdout.write(`[AIONE_MENS_SOCKS_TRIAL] ${page.pageCode} | ${page.canvas} | missingFacts=${page.missingFacts.join(",") || "none"} | semanticRoles=${page.semanticAssetRoles.join(",") || "none"}\n`);
    }
    process.stdout.write(`[AIONE_MENS_SOCKS_TRIAL] currentConfirmedSourceAssets=${assets.length}\n`);

    if (blockers.length) {
      process.stdout.write(`[AIONE] MENS SOCKS TRIAL GATE C PREFLIGHT BLOCKED - ${blockers.length} BLOCKER(S)\n`);
      process.exitCode = 2;
      return;
    }
    process.stdout.write("[AIONE] MENS SOCKS TRIAL GATE C PREFLIGHT PASS - NO IMAGE GENERATED\n");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.code || "mens_socks_trial_gate_c_preflight_failed", message: error.message, details: error.details || undefined }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
