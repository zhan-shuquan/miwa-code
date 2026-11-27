// Presentation only: move existing bound controls; retain ERP metadata and events.
export function arrangeProductInfo(root, icon) {
  const original = root.querySelector('[data-layout-group="basic"]');
  if (!original) return;
  const basic = document.createElement('section');
  for (const attr of original.attributes) if (attr.name !== 'open') basic.setAttribute(attr.name,attr.value);
  basic.append(...original.childNodes);
  original.replaceWith(basic);
  basic.classList.add('sw-product-info');
  basic.querySelector(':scope > summary')?.remove();
  const grid = basic.querySelector(':scope > .sw-grid');
  const field = id => root.querySelector(`[data-field="${id}"]`)?.closest('.sw-field');
  const add = (parent, id, label) => {
    const node = field(id);
    if (!node) return;
    node.removeAttribute('style');
    node.classList.remove('sw-field-inline');
    if (label) {
      const span = node.querySelector('label > span');
      if (span) {
        const required = span.querySelector('.sw-required');
        span.replaceChildren(document.createTextNode(label));
        if (required) span.append(required);
      }
    }
    parent.append(node);
    return node;
  };
  const top = document.createElement('div');
  top.className = 'sw-info-top';
  const media = root.querySelector('.sw-media-field');
  media?.removeAttribute('style');
  if (media) top.append(media);
  const manual = document.createElement('div');
  manual.className = 'sw-info-manual';
  top.append(manual);
  for (const [id, label] of [['sourceUrl','采购URL'],['custom_商品长标题中文','商品长标题']]) {
    const node = add(manual,id,label);
    node?.classList.add('sw-info-wide');
    if (id === 'custom_商品长标题中文' && node) {
      const spacer = document.createElement('span');
      spacer.className = 'sw-url-spacer';
      node.append(spacer);
    }
  }
  const row = document.createElement('div');
  row.className = 'sw-info-six';
  manual.append(row);
  for (const [id,label] of [['item_code','正式商品货号'],['custom_单个采购价','单个采购价（CNY）'],['custom_单个净重g','单个净重（g）'],['custom_套装数量','套装数量'],['stock_uom','计量单位'],['custom_中国国内运费','中国国内运费（CNY）']]) add(row,id,label);
  const note = add(manual,'custom_miwa_selection_notes');
  if (note) {
    note.querySelector('[data-expand-text]')?.remove();
    const old = note.querySelector('textarea');
    const input = document.createElement('input');
    input.type = 'text'; input.id = old.id;
    input.dataset.field = old.dataset.field;
    input.value = old.value;
    old.replaceWith(input);
    note.classList.add('sw-info-note');
  }
  const automatic = document.createElement('div');
  automatic.className = 'sw-info-auto';
  for (const [id,label] of [['item_name','商品简称'],['custom_库存类型','库存类型'],['item_group','商品分类'],['brand','品牌']]) {
    const node = add(automatic,id,label);
    const span = node?.querySelector('label > span');
    if (span) span.insertAdjacentHTML('afterbegin',icon('lock'));
  }
  const auxiliary = field('custom_miwa_auxiliary_info');
  auxiliary?.removeAttribute('style');
  if (auxiliary) {
    auxiliary.classList.add('sw-info-auxiliary');
    auxiliary.open = false;
    const toolbar = basic.querySelector(':scope > .sw-toolbar');
    if (toolbar) auxiliary.append(toolbar);
    auxiliary.insertAdjacentHTML('beforeend','<div class="sw-auxiliary-drop" tabindex="0" aria-label="辅助参考图片，支持粘贴和拖拽"><button type="button" data-add-auxiliary>添加参考图片</button><input type="file" data-auxiliary-upload accept="image/png,image/jpeg,image/webp" multiple hidden><div class="sw-auxiliary-assets" data-auxiliary-assets></div><small data-auxiliary-status role="status"></small></div>');
  }
  grid.before(top,automatic);
  const logistics = root.querySelector('[data-layout-group="logistics"]');
  if (logistics) { logistics.open = true; logistics.classList.add('sw-info-logistics'); automatic.after(logistics); }
  if (auxiliary) {
    auxiliary.classList.add('sw-card');
    auxiliary.dataset.layoutGroup = 'basic';
    basic.parentElement.append(auxiliary);
  }
  if (!grid.children.length) grid.remove();
}
