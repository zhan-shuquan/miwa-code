import { resolveCurrentCuratedFolder } from "./product-curated-folder-contract.js";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.statusCode = 409;
  error.code = code;
  error.details = details;
  throw error;
}

function flattenText(value, output = []) {
  if (value == null) return output;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    output.push(String(value));
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) flattenText(item, output);
    return output;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) flattenText(item, output);
  }
  return output;
}

function normalizedToken(value) {
  return cleanText(value, 160).toLocaleLowerCase("ja-JP").replace(/\s+/g, "");
}

export function validateTemplatePageFactsAndClaims(item, inputFactSnapshot = {}, instructionSnapshot = {}) {
  const bindings = asObject(item?.field_bindings);
  const facts = asObject(inputFactSnapshot);
  const allowedFacts = new Set(asArray(bindings.allowedFacts).map((value) => cleanText(value, 120)).filter(Boolean));
  const requiredFacts = asArray(bindings.requiredFacts).map((value) => cleanText(value, 120)).filter(Boolean);

  if (allowedFacts.size) {
    const unexpected = Object.keys(facts).filter((key) => !allowedFacts.has(key));
    if (unexpected.length) {
      fail(
        "design_template_page_fact_not_allowed",
        "One or more product facts are not allowed by the selected Template Page.",
        { unexpectedFacts: unexpected, allowedFacts: [...allowedFacts] }
      );
    }
  }

  const missing = requiredFacts.filter((key) => {
    const value = facts[key];
    return value == null || value === "" || (Array.isArray(value) && value.length === 0);
  });
  if (missing.length) {
    fail(
      "design_template_page_fact_required",
      "One or more required product facts are missing for the selected Template Page.",
      { missingFacts: missing }
    );
  }

  const approvedClaims = new Set(
    asArray(facts.approvedClaims).map(normalizedToken).filter(Boolean)
  );
  const restrictedClaims = asArray(bindings.restrictedClaims)
    .map((value) => cleanText(value, 160))
    .filter(Boolean);
  const authoredText = flattenText({
    instructions: instructionSnapshot,
    sellingPoints: facts.sellingPoints
  }).join("\n");
  const normalizedAuthoredText = normalizedToken(authoredText);

  const unapprovedClaims = restrictedClaims.filter((claim) => {
    const token = normalizedToken(claim);
    return token && normalizedAuthoredText.includes(token) && !approvedClaims.has(token);
  });
  if (unapprovedClaims.length) {
    fail(
      "design_unapproved_claim",
      "The selected Template Page contains claims that require explicit human approval.",
      { unapprovedClaims, approvedClaims: asArray(facts.approvedClaims) }
    );
  }

  return { facts, approvedClaims: [...approvedClaims] };
}

export async function validateTemplatePageAssets(client, item, { productId, inputAssetIds } = {}) {
  const bindings = asObject(item?.asset_bindings);
  const allowedFolders = new Set(
    asArray(bindings.allowedFolders || bindings.preferredFolders)
      .map((value) => cleanText(value, 120))
      .filter(Boolean)
  );
  const ids = [...new Set(asArray(inputAssetIds).map((value) => cleanText(value, 240)).filter(Boolean))];
  if (!ids.length) {
    fail("design_input_assets_required", "At least one human-selected ProductAsset is required.");
  }

  const result = await client.query(
    `SELECT id, asset_role, canonical_name, original_name, mime_type, metadata
       FROM public.product_assets
      WHERE product_id=$1 AND id = ANY($2::text[]) AND archived_at IS NULL`,
    [cleanText(productId, 240), ids]
  );
  if (result.rowCount !== ids.length) {
    fail(
      "design_input_asset_mismatch",
      "One or more selected ProductAssets are missing or do not belong to the Product.",
      { requestedAssetIds: ids, foundAssetIds: result.rows.map((row) => row.id) }
    );
  }

  const violations = [];
  for (const asset of result.rows) {
    const metadata = asObject(asset.metadata);
    const folderResolution = resolveCurrentCuratedFolder(asset);
    const sourceFolder = cleanText(folderResolution.folder, 120);
    if (metadata.layer !== "SOURCE") {
      violations.push({ assetId: asset.id, reason: "not_source", layer: metadata.layer || null });
      continue;
    }
    if (!String(asset.mime_type || "").startsWith("image/")) {
      violations.push({ assetId: asset.id, reason: "not_image", mimeType: asset.mime_type || null });
      continue;
    }
    if (allowedFolders.size && !allowedFolders.has(sourceFolder)) {
      violations.push({
        assetId: asset.id,
        reason: "folder_not_allowed",
        sourceFolder: sourceFolder || null,
        folderResolutionSource: folderResolution.source
      });
    }
  }
  if (violations.length) {
    fail(
      "design_template_page_asset_not_allowed",
      "One or more selected ProductAssets violate the selected Template Page asset policy.",
      { violations, allowedFolders: [...allowedFolders] }
    );
  }

  return result.rows;
}

export async function validateTemplatePageInputs(client, item, input = {}) {
  validateTemplatePageFactsAndClaims(item, input.inputFactSnapshot, input.instructionSnapshot);
  const assets = await validateTemplatePageAssets(client, item, input);
  return { assets };
}
