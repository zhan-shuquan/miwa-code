// Shared browser/backend contract. Empty overrides inherit; explicit zero is retained.
export const SKU_COST_FIELDS = Object.freeze([
 "setQuantity", "purchaseCostBasis", "actualShipmentWeightG", "domesticFreightCny",
 "logisticsMethod", "packagingMethod", "customPackagingCostCny", "packagingMaterial",
 "packageLengthCm", "packageWidthCm", "packageHeightCm"
]);
const present = value => value !== null && value !== undefined && value !== "";
export function findSkuOverride(product, identity, index) {
 const rows = product.skuOverrides || [];
 return rows.find(row => row.identity === identity) || rows.find(row => !row.identity && row.index === index) || {};
}
export function resolveEffectiveSku(product, override = {}) {
 const costsEnabled = product.extraAttributes?.independentSkuCosts !== "false";
 const cost = costsEnabled ? override : {};
 const effective = {...product};
 for (const key of SKU_COST_FIELDS) if (present(cost[key])) effective[key] = cost[key];
 effective.purchaseUnitCostCny = present(cost.purchaseCostCny) ? cost.purchaseCostCny : product.purchaseUnitCostCny ?? null;
 effective.weightG = present(cost.weightG) ? cost.weightG : product.weightG ?? null;
 effective.sizeClass = cost.sizeClass || product.sizeClass || "";
 effective.purchaseCostBasis ||= "unit";
 // A different net weight or set quantity invalidates the inherited measured parcel weight.
 if (!present(cost.actualShipmentWeightG) &&
     ((present(cost.weightG) && Number(cost.weightG) !== Number(product.weightG)) ||
      (present(cost.setQuantity) && Number(cost.setQuantity) !== Number(product.setQuantity ?? 1)))) effective.actualShipmentWeightG = null;
 effective.salePriceJpy = product.extraAttributes?.independentSkuPricing === "true" && present(override.priceJpy)
   ? override.priceJpy : product.salePriceJpy ?? null;
 return {
  ...Object.fromEntries(SKU_COST_FIELDS.map(key => [key, effective[key] ?? null])),
  priceJpy: effective.salePriceJpy, purchaseCostCny: effective.purchaseUnitCostCny,
  weightG: effective.weightG, sizeClass: effective.sizeClass,
  stock: override.stock ?? product.defaultStock ?? 1000,
  imageFile: override.imageFile || "", effectiveProduct: effective
 };
}
