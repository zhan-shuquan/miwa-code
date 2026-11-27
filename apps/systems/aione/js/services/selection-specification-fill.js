// Only fill missing values when the employee has chosen one unambiguous axis.
// Existing row identity, image, price, weight and supplier ID are never rebuilt.
export function fillSingleAttribute(data) {
  const axes = data.specificationAttributes || [];
  if (axes.length !== 1 || !axes[0].sales || !axes[0].attribute) return;
  const axis = axes[0];
  for (const row of data.skus || []) {
    const parts = row.sourceParts || [];
    if (parts.length > 1 || /[+；;]/.test(row.originalName || '')) continue;
    if (Object.entries(row.attributeValues || {}).some(([key,value]) => key !== axis.attribute && value)) continue;
    row.attributeValues ||= {};
    if (!row.attributeValues[axis.attribute] && row.originalName) row.attributeValues[axis.attribute] = row.originalName;
  }
  const values = [...new Set((data.skus || []).filter(s => s.selected !== false).map(s => s.attributeValues?.[axis.attribute]).filter(Boolean))];
  if (values.length) axis.values = values.join('、');
}
