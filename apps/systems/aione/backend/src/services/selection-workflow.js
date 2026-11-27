import { fingerprint } from './selection-intake-contract.js';

// A view of existing facts, never a second persisted business status.
export function selectionStage(record) {
  const ws = record.selection_workspace || {}, data = ws.data || {}, p = ws.pool || {};
  const stage = (code, label, nextAction) => ({ code, label, nextAction });
  if (record.archived_at || p.state === 'archived') return stage('archived','已归档','查看资料');
  if (p.state === 'abandoned') return stage('no_source','暂无合适货源','继续寻找或归档');
  if (ws.erpResult?.stage === 'item_created' || record.erp_job_status === 'succeeded')
    return stage('erp_success','ERP建档成功','后续美工');
  if (ws.status === 'submitting' || ['queued','processing'].includes(record.erp_job_status))
    return stage('erp_processing','ERP处理中','查看处理结果');
  if (ws.status === 'submitted') return stage('erp_processing','ERP已提交','查看处理结果');
  if (ws.status === 'confirmed') return stage('confirmed','已确认选品','提交ERP');
  if (ws.status === 'number_pending') return stage('await_confirmation','确认处理中','查看正式货号结果');
  if (!record.owner_person_id || p.state === 'pending') return stage('unclaimed','待认领','认领／分配');
  if (!data.sourceUrl) return stage('need_source','待找货源','1688找同款');
  if (p.entryCompletedAt)
    return stage('await_confirmation','待确认选品','确认选品');
  if (ws.pool?.entryStartedAt || data.item_name || data.skus?.length)
    return stage('entering','资料录入中','继续录入');
  return stage('source_found','已找到货源','商品资料录入');
}

const labels = {
  'pool-collect':'收集商品', 'pool-claim':'认领商品', 'pool-assign':'分配及转交商品',
  'source-found':'找到同款货源', 'entry-complete':'完成商品资料录入',
  'confirm-selection':'确认选品', submit:'提交ERP', 'erp-result':'ERP建档结果',
};
export async function recordSelectionWork(c, record, action, { personId = null, detail = {}, occurrence } = {}) {
  if (!labels[action]) return;
  if (action === 'confirm-selection' && record.selection_workspace?.status !== 'confirmed') return;
  const key = occurrence || (['pool-assign','pool-claim'].includes(action) ? String(record.record_version) : 'first');
  // A business milestone counts once. Audit history still records subsequent edits.
  const id = 'selection-work:' + fingerprint([record.id, action, key].join(':'));
  const conflict = action === 'erp-result'
    ? "ON CONFLICT(id) DO UPDATE SET result_code=EXCLUDED.result_code,payload=EXCLUDED.payload,happened_at=now() WHERE work_evidence.result_code IS DISTINCT FROM EXCLUDED.result_code"
    : 'ON CONFLICT(id) DO NOTHING';
  await c.query(`INSERT INTO work_evidence
    (id,person_id,related_object_type,related_object_id,evidence_type,action_code,result_code,summary,payload,work_item_id)
    VALUES($1,$2,'product_opportunity',$3,'business_operation',$4,$5,$6,
      $7::jsonb || jsonb_build_object('businessDate',(now() AT TIME ZONE 'Asia/Tokyo')::date,'completedAt',now()),
      (SELECT id FROM work_items WHERE id='selection-research:'||$3))
    ${conflict}`, [id, personId, record.id, action,
    detail.status || 'completed', labels[action], JSON.stringify({
      selectionNo:record.selection_no, itemCode:record.selection_workspace?.data?.item_code || null,
      actorKind:personId ? 'human' : 'system', timeZone:'Asia/Tokyo', result:detail,
    })]);
}
