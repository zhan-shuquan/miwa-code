import pool from "../db.js";

const PRODUCT_CODE = String(process.env.AIONE_DESIGN_PRODUCT_CODE || "MH0000002").trim();

function clean(value) {
  return String(value ?? "").trim();
}

function sourceFolder(asset) {
  return clean(asset.metadata?.sourceFolder || asset.metadata?.source_folder);
}

function nameOf(asset) {
  return clean(asset.original_name || asset.canonical_name);
}

function includesAny(value, terms) {
  const text = String(value || "").toLowerCase();
  return terms.some((term) => text.includes(String(term).toLowerCase()));
}

function classify(assets) {
  const sku = assets.filter((asset) => sourceFolder(asset) === "01_SKU图" || includesAny(asset.asset_role, ["sku"]));
  const product = assets.filter((asset) => sourceFolder(asset) === "02_产品图");
  const real = assets.filter((asset) => sourceFolder(asset) === "03_实拍图");
  const white = product.filter((asset) => includesAny(nameOf(asset), ["白底", "white", "main-white"]) || includesAny(asset.asset_role, ["white_bg", "white-background"]));
  const detail = product.filter((asset) => includesAny(nameOf(asset), ["详情", "细节", "detail", "特写"]));
  return { sku, product, real, white, detail };
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const productResult = await client.query(
      `SELECT p.id, p.product_code, p.name, p.lifecycle_status, p.product_data,
              c.code AS category_code, c.name AS category_name
         FROM public.products p
         LEFT JOIN public.product_categories c ON c.id=p.category_id
        WHERE p.product_code=$1 AND p.archived_at IS NULL
        LIMIT 2`,
      [PRODUCT_CODE]
    );
    if (productResult.rowCount !== 1) {
      throw Object.assign(new Error(productResult.rowCount ? "Product code is ambiguous." : "Product not found."), {
        code: productResult.rowCount ? "product_code_ambiguous" : "product_not_found"
      });
    }
    const product = productResult.rows[0];

    const confirmationResult = await client.query(
      `SELECT id, version, status, asset_ids, snapshot_hash, confirmed_at, metadata
         FROM public.product_material_confirmations
        WHERE product_id=$1 AND status='confirmed' AND archived_at IS NULL
        ORDER BY version DESC
        LIMIT 1`,
      [product.id]
    );
    if (!confirmationResult.rowCount) {
      throw Object.assign(new Error("No CURRENT confirmed material snapshot exists."), { code: "material_confirmation_required" });
    }
    const confirmation = confirmationResult.rows[0];
    const ids = Array.isArray(confirmation.asset_ids) ? confirmation.asset_ids.map(String) : [];
    const assetsResult = await client.query(
      `SELECT id, asset_no, asset_type, asset_role, original_name, canonical_name, mime_type, metadata
         FROM public.product_assets
        WHERE product_id=$1 AND id = ANY($2::text[]) AND archived_at IS NULL
        ORDER BY asset_no`,
      [product.id, ids]
    );
    if (assetsResult.rowCount !== ids.length) {
      throw Object.assign(new Error("Confirmed snapshot contains missing ProductAssets."), { code: "confirmed_asset_mismatch" });
    }

    const groups = classify(assetsResult.rows);
    const facts = product.product_data || {};
    const summary = {
      ok: true,
      databaseMode: "READ ONLY",
      product: {
        id: product.id,
        productCode: product.product_code,
        name: product.name,
        lifecycleStatus: product.lifecycle_status,
        categoryCode: product.category_code,
        categoryName: product.category_name
      },
      currentConfirmation: {
        id: confirmation.id,
        version: confirmation.version,
        snapshotHash: confirmation.snapshot_hash,
        confirmedAt: confirmation.confirmed_at,
        assetCount: ids.length
      },
      materialRoles: {
        sku: groups.sku.length,
        product: groups.product.length,
        real: groups.real.length,
        whiteBackgroundCandidates: groups.white.length,
        detailCandidates: groups.detail.length
      },
      whiteBackgroundCandidates: groups.white.map((asset) => ({ id: asset.id, name: nameOf(asset), role: asset.asset_role })),
      skuAssets: groups.sku.map((asset) => ({ id: asset.id, name: nameOf(asset), role: asset.asset_role })),
      coreFacts: {
        setCount: facts.setCount ?? null,
        actualVariants: facts.actualVariants ?? null,
        approvedPrimaryValue: facts.approvedPrimaryValue ?? null,
        sellingPoints: facts.sellingPoints ?? null,
        supportedSize: facts.supportedSize ?? null
      }
    };
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    process.stdout.write("[AIONE] DESIGN CENTER CURRENT INPUT AUDIT PASS - READ ONLY - NO IMAGE GENERATED\n");
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.code || "design_center_current_input_audit_failed", message: error.message }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
