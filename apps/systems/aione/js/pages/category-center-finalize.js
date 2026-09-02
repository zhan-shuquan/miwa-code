function currentCategoryContext() {
  const root = document.querySelector('[data-category-center-preview]');
  if (!root) return null;
  const systemActive = root.querySelector('[data-view="system"]')?.classList.contains('is-active');
  const storeActive = root.querySelector('[data-view="store"]')?.classList.contains('is-active');
  const selected = root.querySelector('.taxonomy-card.is-selected [data-node-id], .taxonomy-card.is-selected');
  const selectedName = root.querySelector('.taxonomy-card.is-selected strong')?.textContent?.trim() || '当前分类';
  const selectedCode = root.querySelector('.taxonomy-card.is-selected small')?.textContent?.trim() || '';
  return {
    root,
    mode: storeActive ? 'store' : (systemActive ? 'system' : 'system'),
    label: storeActive ? '店铺分类' : '系统分类',
    selectedName,
    selectedCode
  };
}

function importPanelHtml(context) {
  return `
    <div class="category-io-grid">
      <label><span>导入对象</span><select data-io-import-target><option ${context.mode === 'system' ? 'selected' : ''}>系统分类</option><option ${context.mode === 'store' ? 'selected' : ''}>当前店铺分类</option></select></label>
      <label><span>导入范围</span><select data-io-import-scope><option>整个分类体系</option><option>当前一级分类</option><option>当前二级分类</option><option>当前分类分支</option></select></label>
      <label><span>导入方式</span><select data-io-import-mode><option>新增 + 更新</option><option>仅新增</option><option>仅更新</option></select></label>
      <label><span>冲突处理</span><select data-io-conflict><option>有冲突时停止并预览</option><option>跳过冲突项继续预览</option></select></label>
    </div>
    <label class="upload-box"><input type="file" accept=".csv,.xlsx" data-import-file><span>选择 CSV / Excel</span><small data-import-name>尚未选择文件</small></label>
    <div class="dialog-checks category-io-required" aria-label="系统强制校验">
      <span>✓ 字段校验 <small>强制</small></span><span>✓ 父级关系检查 <small>强制</small></span><span>✓ 编码冲突检查 <small>强制</small></span><span>✓ 变更预览 <small>强制</small></span>
    </div>`;
}

function exportPanelHtml(context) {
  const branchLabel = context.selectedCode ? `${context.selectedCode} ${context.selectedName}` : context.selectedName;
  return `
    <div class="category-io-section">
      <h3>导出范围</h3>
      <div class="category-io-choice-list">
        <label><input type="radio" name="export-scope" value="branch" checked><span>当前分类分支<small>${branchLabel}</small></span></label>
        <label><input type="radio" name="export-scope" value="level"><span>当前层级<small>导出当前所处层级的全部分类</small></span></label>
        <label><input type="radio" name="export-scope" value="all"><span>整个分类体系<small>${context.label}全部节点</small></span></label>
      </div>
    </div>
    <div class="category-io-section">
      <h3>导出字段</h3>
      <div class="category-io-check-list">
        ${['分类编号','分类名称','父级编号','层级','状态','映射关系'].map((label) => `<label><input type="checkbox" checked><span>${label}</span></label>`).join('')}
      </div>
    </div>
    <div class="category-io-section category-io-format">
      <h3>导出格式</h3>
      <label><input type="radio" name="export-format" value="xlsx" checked> Excel</label>
      <label><input type="radio" name="export-format" value="csv"> CSV</label>
    </div>`;
}

function renderIoTab(dialog, isExport) {
  const context = currentCategoryContext();
  if (!context) return;
  const panel = dialog.querySelector('.dialog-panel');
  const footer = dialog.querySelector('footer');
  if (!panel || !footer) return;
  panel.innerHTML = isExport ? exportPanelHtml(context) : importPanelHtml(context);
  footer.innerHTML = isExport
    ? '<button value="cancel" class="tax-btn">取消</button><button type="button" class="tax-btn tax-btn--primary" data-action="preview-export">预览导出</button>'
    : '<button value="cancel" class="tax-btn">取消</button><button type="button" class="tax-btn" data-action="download-template">下载模板</button><button type="button" class="tax-btn tax-btn--primary" data-action="preview-import">预览导入</button>';
}

function enhanceIoDialog(root) {
  const dialog = root.querySelector('[data-dialog="io"]');
  if (!dialog || dialog.dataset.finalized === 'true') return;
  dialog.dataset.finalized = 'true';
  const tabs = [...dialog.querySelectorAll('.dialog-tabs button')];
  tabs.forEach((tab, index) => tab.addEventListener('click', () => {
    tabs.forEach((item) => item.classList.toggle('is-active', item === tab));
    renderIoTab(dialog, index === 1);
  }, true));
  renderIoTab(dialog, false);
}

function enhancePanorama(root) {
  const dialog = root.querySelector('[data-category-panorama-dialog]');
  if (!dialog || dialog.dataset.finalized === 'true') return;
  dialog.dataset.finalized = 'true';

  const tree = dialog.querySelector('.category-panorama-tree');
  const search = dialog.querySelector('input[type="search"]');
  const buttons = [...dialog.querySelectorAll('.category-panorama-toolbar button')];
  const allChildren = () => [...dialog.querySelectorAll('.category-panorama-node__children')];

  buttons[0]?.addEventListener('click', () => allChildren().forEach((node) => node.hidden = false));
  buttons[1]?.addEventListener('click', () => allChildren().forEach((node) => node.hidden = true));

  dialog.addEventListener('click', (event) => {
    const row = event.target.closest('.category-panorama-node__row');
    if (!row) return;
    const childWrap = row.parentElement?.querySelector(':scope > .category-panorama-node__children');
    if (childWrap) childWrap.hidden = !childWrap.hidden;
  });

  search?.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    dialog.querySelectorAll('.category-panorama-node').forEach((node) => {
      const row = node.querySelector(':scope > .category-panorama-node__row');
      if (!row) return;
      node.hidden = Boolean(q) && !row.textContent.toLowerCase().includes(q) && !node.textContent.toLowerCase().includes(q);
    });
    if (q) allChildren().forEach((node) => node.hidden = false);
  });

  if (tree) tree.tabIndex = 0;
}

function enhance() {
  const root = document.querySelector('[data-category-center-preview]');
  if (!root) return;
  enhanceIoDialog(root);
  enhancePanorama(root);
}

const observer = new MutationObserver(enhance);
window.addEventListener('DOMContentLoaded', () => {
  observer.observe(document.body, { childList:true, subtree:true });
  enhance();
});
window.addEventListener('aione:category-preview-rendered', () => setTimeout(enhance, 0));
window.setTimeout(enhance, 700);
