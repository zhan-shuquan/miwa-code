// Shared workspace chrome: business identity, operations and views. No domain transitions.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function businessWorkspaceHeader({title, identity, status, connection, actions, more, tabs}) {
  return `<header class="sw-workspace-header"><div class="sw-workspace-identity"><div><h1>${escape(title)}</h1>${identity}</div><div data-workspace-status>${status}</div></div><div class="sw-workspace-operations"><span data-workspace-connection>${escape(connection)}</span><div class="sw-toolbar">${actions}<details class="sw-more"><summary>更多操作</summary><div data-stage-two-actions>${more}</div></details></div></div><nav class="sw-workspace-tabs" aria-label="选品工作区">${tabs}</nav></header>`;
}
export function selectionHeaderStatus(record) {
  const job = record?.jobs?.[0];
  const stage = record?.erpResult?.stage;
  return {
    conclusion: record?.pool?.state === 'abandoned' ? '放弃选品' : ({draft:'待确认',number_pending:'已确认 · 货号待处理',confirmed:'已确认',submitted:'已确认',erp_pending:'已确认',abandoned:'放弃选品'})[record?.status] || '待确认',
    intake: stage === 'item_created' ? `建档成功 · ${record.erpResult.skuCount ?? 0}个SKU`
      : job?.status === 'failed' ? `建档失败：${job.result?.message || '请展开ERP处理记录'}`
      : ['queued','processing'].includes(job?.status) ? '处理中' : '未提交',
  };
}
