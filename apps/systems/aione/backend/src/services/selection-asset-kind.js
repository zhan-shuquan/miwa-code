// Roles share the existing attachment store and access checks, not product identity.
export const auxiliaryIds = record => record.selection_workspace.auxiliaryAssetIds || [];
export const assetKind = (record, id) => auxiliaryIds(record).includes(id) ? 'auxiliary'
  : (record.selection_workspace.researchAssetIds || []).includes(id) ? 'market' : 'product';
