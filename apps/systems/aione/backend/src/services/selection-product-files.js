import { assetKind } from "./selection-asset-kind.js";
import { randomUUID, createHash } from 'node:crypto';

export async function requestProductFiles(c, record, actor) {
  const workspace = record.selection_workspace;
  if (!['confirmed', 'submitted'].includes(workspace.status) || !workspace.formalNumber?.code)
    return null;
  const assets = (await c.query(
    'SELECT id,filename,content_type,sha256,position FROM selection_workspace_assets WHERE selection_id=$1 ORDER BY position,created_at',
    [record.id],
  )).rows.filter(a => !(workspace.researchAssetIds || []).includes(a.id)).map(a => ({...a, role: assetKind(record, a.id)}))
    .sort((a,b) => Number(a.role === 'auxiliary') - Number(b.role === 'auxiliary'));
  const payload = {
    selectionId: record.id, selectionNo: record.selection_no, owner: record.owner_person_id,
    status: workspace.status, data: workspace.data, assets, actor,version:record.record_version,
    erpSkus:workspace.erpResult?.skus || [],
    allowPublish: false, allowPaidAI: false, allowEmail: false,
  };
  const signature = createHash('sha256').update(JSON.stringify({data:payload.data, assets,erpSkus:payload.erpSkus})).digest('hex');
  const job = (await c.query(
    `INSERT INTO selection_erp_commands(id,command_key,kind,selection_id,payload)
     VALUES($1,$2,'product_files',$3,$4)
     ON CONFLICT(command_key) DO UPDATE SET status=CASE WHEN selection_erp_commands.status='failed' THEN 'queued' ELSE selection_erp_commands.status END
     RETURNING id,status`,
    [randomUUID(), 'product-files:' + record.id + ':' + signature, record.id, JSON.stringify(payload)],
  )).rows[0];
  return job;
}
