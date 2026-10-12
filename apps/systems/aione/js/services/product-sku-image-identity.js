// Match editable SKU specification values to the persisted, stable ProductSKU.
// Business-facing zjl238-01 is not always the canonical database sku_code.
// A filename such as _c01 is only a candidate for human confirmation.
export function matchPersistedSkuByAttributes(storedSkus, expectedAttributes) {
  if (!Array.isArray(storedSkus) || !expectedAttributes || typeof expectedAttributes !== "object" || Array.isArray(expectedAttributes)) return null;
  const names = Object.keys(expectedAttributes).sort();
  if (names.some(name => name.startsWith("__aione"))) return null;
  const matched = storedSkus.filter(row => {
    if (!row?.id || !row?.sku_code || !row.attributes || typeof row.attributes !== "object" || Array.isArray(row.attributes)) return false;
    const actualNames = Object.keys(row.attributes).filter(name => !name.startsWith("__aione")).sort();
    return names.length === actualNames.length
      && names.every((name, i) => name === actualNames[i] && String(expectedAttributes[name]) === String(row.attributes[name]));
  });
  return matched.length === 1 ? matched[0] : null;
}
