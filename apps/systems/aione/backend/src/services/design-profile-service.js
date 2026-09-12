function clean(value) {
  return String(value ?? "").trim();
}

function productTruthText(product = {}) {
  const data = product.product_data || {};
  return [
    data.approvedPrimaryValue,
    ...(Array.isArray(data.sellingPoints) ? data.sellingPoints : []),
    data.productType,
    data.productName,
    data.targetGender,
    data.lengthType
  ].map(clean).filter(Boolean).join(" ");
}

function isSockCategory(product = {}) {
  const code = clean(product.category_code).toLowerCase();
  const name = clean(product.category_name);
  const truth = productTruthText(product).toLowerCase();
  return code.includes("sock") || name.includes("袜") || truth.includes("袜") || truth.includes("sock");
}

function genderTheme(product = {}) {
  const code = clean(product.category_code).toLowerCase();
  const name = clean(product.category_name);
  const data = product.product_data || {};
  const gender = clean(data.targetGender).toLowerCase();
  const truth = productTruthText(product).toLowerCase();

  if (code.includes("women") || name.includes("女袜") || gender.includes("女") || gender.includes("women") || truth.includes("女袜")) {
    return "warm-rose";
  }
  if (code.includes("men") || name.includes("男袜") || gender.includes("男") || gender.includes("men") || truth.includes("男袜")) {
    return "navy-gold";
  }
  return "neutral";
}

function socksPrimaryBadge(productData = {}) {
  const setCount = Number(productData.setCount);
  const variants = Array.isArray(productData.actualVariants) ? productData.actualVariants.filter(Boolean) : [];
  if (Number.isFinite(setCount) && setCount > 0 && variants.length > 0) {
    return `${setCount}足${variants.length}色`;
  }
  if (Number.isFinite(setCount) && setCount > 0) return `${setCount}足セット`;
  return "";
}

export function resolveDesignProfile(product = {}) {
  if (!isSockCategory(product)) {
    return {
      profileCode: "GENERIC-PRODUCT-DESIGN-V1",
      scope: "generic",
      tagCardDefaults: null,
      heroDefaults: null
    };
  }

  const productData = product.product_data || {};
  return {
    profileCode: "SOCKONE-SOCKS-DESIGN-V1",
    scope: "socks",
    brandSource: "interim-category-brand-rule",
    brandGovernanceNote: "SOCKONE is the single socks brand for mens and womens socks. Replace the interim category rule with Brand Center canonical binding when Brand Center truth is available.",
    tagCardDefaults: {
      templatePresetId: "dip_miwa_product_tag_card_v1",
      brandNameEn: "SOCKONE",
      brandSublineEn: "Daily Socks Collection",
      brandSloganJa: "毎日に寄りそう一足。",
      colorTheme: genderTheme(product),
      usageScopes: ["hero", "packaging"],
      slots: [
        { type: "setCount", sourceFactPath: "setCount", textOverride: "", prefix: "", suffix: "足セット", iconCode: "", visible: true },
        { type: "size", sourceFactPath: "supportedSize", textOverride: "", prefix: "SIZE ", suffix: "", iconCode: "", visible: true },
        { type: "style", sourceFactPath: "", textOverride: "クルー丈", prefix: "", suffix: "", iconCode: "", visible: true },
        { type: "style", sourceFactPath: "", textOverride: "秋冬", prefix: "", suffix: "", iconCode: "", visible: true }
      ]
    },
    heroDefaults: {
      layoutPresetId: "dip_unified_hero_square_layout_v1",
      modelPresetId: "dip_socks_white_bg_model_v1",
      productDisplayPresetId: "dip_socks_flat_lay_set_v1",
      productDisplayMode: "flat_lay",
      primarySellingPointBinding: {
        sourceFactPath: "",
        textOverride: socksPrimaryBadge(productData),
        prefix: "",
        suffix: ""
      },
      secondarySellingPointBinding: {
        sourceFactPath: "",
        textOverride: "ボーダー柄クルー丈",
        prefix: "",
        suffix: ""
      }
    }
  };
}
