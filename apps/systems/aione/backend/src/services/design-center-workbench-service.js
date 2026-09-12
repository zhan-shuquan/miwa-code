import { resolveDesignProduct } from "./design-product-resolver.js";
import { getProductTagCard } from "./product-tag-card-service.js";
import { getProductHeroSpec, listInstructionPresets } from "./product-hero-spec-service.js";
import { resolveDesignProfile } from "./design-profile-service.js";

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function sourceFolder(asset) {
  return cleanText(asset.metadata?.sourceFolder || asset.metadata?.source_folder, 120);
}

function assetName(asset) {
  return cleanText(asset.original_name || asset.canonical_name, 500);
}

function includesAny(value, terms) {
  const text = String(value || "").toLowerCase();
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function summarizeMaterials(assets) {
  const sku = assets.filter((asset) => sourceFolder(asset) === "01_SKU图" || includesAny(asset.asset_role, ["sku"]));
  const product = assets.filter((asset) => sourceFolder(asset) === "02_产品图");
  const real = assets.filter((asset) => sourceFolder(asset) === "03_实拍图");
  const whiteBackground = product.filter((asset) =>
    includesAny(assetName(asset), ["白底", "white", "main-white"]) || includesAny(asset.asset_role, ["white_bg", "white-background"])
  );
  const detail = product.filter((asset) => includesAny(assetName(asset), ["详情", "细节", "detail", "特写"]));
  return {
    counts: {
      currentConfirmed: assets.length,
      sku: sku.length,
      product: product.length,
      real: real.length,
      whiteBackgroundCandidates: whiteBackground.length,
      detailCandidates: detail.length
    },
    sku,
    whiteBackground,
    detail,
    real,
    product
  };
}

export async function getDesignCenterWorkbench(client, productRef) {
  const product = await resolveDesignProduct(client, productRef);
  const confirmation = await client.query(
    `SELECT id, version, asset_ids, snapshot_hash, confirmed_at, metadata
       FROM public.product_material_confirmations
      WHERE product_id=$1 AND status='confirmed' AND archived_at IS NULL
      ORDER BY version DESC
      LIMIT 1`,
    [product.id]
  );
  const confirmedIds = Array.isArray(confirmation.rows[0]?.asset_ids) ? confirmation.rows[0].asset_ids.map(String) : [];
  let assets = [];
  if (confirmedIds.length) {
    const result = await client.query(
      `SELECT id, asset_no, asset_type, asset_role, source_provider, original_name, canonical_name,
              mime_type, lifecycle_status, metadata
         FROM public.product_assets
        WHERE product_id=$1 AND id = ANY($2::text[]) AND archived_at IS NULL
        ORDER BY asset_no`,
      [product.id, confirmedIds]
    );
    assets = result.rows;
  }

  const [{ tagCard }, { heroSpec }, presets, templateResult] = await Promise.all([
    getProductTagCard(client, product.id),
    getProductHeroSpec(client, product.id),
    listInstructionPresets(client, { categoryScope: product.category_code || undefined }),
    client.query(
      `SELECT * FROM public.design_templates
        WHERE id='dtpl_unified_product_hero_square_v1' AND archived_at IS NULL LIMIT 1`
    )
  ]);

  const productView = {
    id: product.id,
    productCode: product.product_code,
    name: product.name,
    lifecycleStatus: product.lifecycle_status,
    categoryCode: product.category_code,
    categoryName: product.category_name,
    productData: product.product_data || {}
  };

  return {
    product: productView,
    designProfile: resolveDesignProfile(product),
    materialConfirmation: confirmation.rows[0] || null,
    materials: summarizeMaterials(assets),
    tagCard,
    heroSpec,
    heroTemplate: templateResult.rows[0] || null,
    instructionPresets: presets
  };
}
