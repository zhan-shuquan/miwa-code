/* ========================================
   Selection Workbench｜選品ワークベンチ
   第1階層ページの表示・絞り込み・カード／一覧切替を管理する。
======================================== */

import { getPreviewOpportunities, importPreviewOpportunities } from '../data/preview-opportunities.js';

const SELECTION_ITEMS = getPreviewOpportunities();

function refreshSelectionItems(){
  SELECTION_ITEMS.splice(0,SELECTION_ITEMS.length,...getPreviewOpportunities());
}

const TYPE_ORDER = ['直发选品','常规选品','产品开发'];
const STAGES = [
  ['opportunity','商品机会'],
  ['data','数据录入'],
  ['cost','成本试算'],
  ['pricing','智能定价'],
  ['decision','上架判断']
];

const PAGE_SIZE = 12;
const workbenchState = {type:'',stage:'',status:'',owner:'',query:'',view:'card',page:1};

function money(value){return `¥${Number(value).toLocaleString('ja-JP')}`}
function itemStatus(item){return item.result === '待形成' ? 'ongoing' : 'decided'}
function resultClass(result){return result === '上架' ? 'listed' : result === '不上架' || result === '已作废' ? 'rejected' : 'pending'}
function resultText(result){return result === '上架' ? '✓ 上架' : result === '不上架' ? '× 不上架' : result === '已作废' ? '已作废' : '待形成'}
function judgementAlert(item){return item.result === '不上架' || /缺口|异常|不满足/.test(`${item.info}${item.rule}${item.ai}`)}

function productIcon(){
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="22" y="26" width="56" height="49" rx="9"></rect><path d="M35 26V18h30v8"></path><path d="M34 43h32M34 55h24M34 67h18"></path><circle cx="68" cy="67" r="7"></circle></svg>`;
}

function platformTags(platforms, limit=2){
  const values = Array.isArray(platforms) ? platforms : [];
  const visible = values.slice(0,limit);
  const hidden = Math.max(0,values.length-visible.length);
  const all = values.join(' / ');
  return `<div class="selection-card__platforms" title="${all}">${visible.map(x=>`<span class="selection-card__platform">${x}</span>`).join('')}${hidden ? `<span class="selection-card__platform selection-card__platform--more" aria-label="还有${hidden}个平台" title="${all}">+${hidden}</span>` : ''}</div>`;
}

function splitTime(value){
  const [date,time=''] = String(value || '').split(' ');
  return `<time class="selection-table__time" datetime="${String(value || '').replace(' ','T')}"><span>${date || '—'}</span>${time ? `<small>${time}</small>` : ''}</time>`;
}

function sourceEntry(item, context='table'){
  const label = String(item?.source || '').trim();
  if(!label) return '';
  const url = String(item?.sourceUrl || '').trim();
  const prefix = context === 'card' ? 'selection-card' : 'selection-table';
  if(url){
    return `<a class="${prefix}__source-link" href="${url}" target="_blank" rel="noopener noreferrer" title="打开采购来源">${label} ↗</a>`;
  }
  return `<span class="${prefix}__source-label" title="当前原型未录入真实采购来源链接">${label}</span>`;
}


function escapeAttr(value=''){
  return String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function representativeImageMarkup(item,context='card'){
  const url = String(item?.representativeImage?.url || '').trim();
  if(url){
    const cls = context === 'card' ? 'selection-card__representative-img' : 'selection-table__representative-img';
    const fallbackClass = context === 'card' ? 'selection-card__image-fallback' : 'selection-table__image-fallback';
    return `<img class="${cls}" src="${escapeAttr(url)}" alt="${escapeAttr(item?.name || '选品代表图')}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false;"><span class="${fallbackClass}" hidden>${productIcon()}</span>`;
  }
  return context === 'card'
    ? `${productIcon()}<span>暂无选品代表图</span>`
    : productIcon();
}

function renderCard(item){
  const resultState = resultClass(item.result);
  const judgement = item.rule || '待补充判断依据';
  return `<article class="selection-card selection-card--locked">
    <section class="selection-card__top">
      <h3 class="selection-card__name" title="${item.name}">${item.name}</h3>
      <div class="selection-card__identity-grid">
        <div class="selection-card__image" aria-label="选品代表图">
          ${representativeImageMarkup(item,'card')}
        </div>
        <div class="selection-card__identity-space" aria-hidden="true"></div>
        <div class="selection-card__identity-meta">
          <div class="selection-card__meta-row">${item.id}</div>
          <div class="selection-card__meta-row selection-card__meta-row--type">${item.type}</div>
          <div class="selection-card__meta-row">${sourceEntry(item,'card')}</div>
          <button class="selection-card__meta-row selection-card__meta-row--elements" type="button" data-card-elements>要素 ${item.elements} ›</button>
          <div class="selection-card__meta-row selection-card__meta-row--edit">
            <button class="selection-card__edit" type="button" data-edit-id="${item.id}">编辑</button>
          </div>
        </div>
      </div>
    </section>

    <section class="selection-card__main">
      <div class="selection-card__goal-line"><strong>目标：</strong><span>完成该商品机会的选品判断，确认是否值得继续推进。</span></div>
      <div class="selection-card__factors">
        <div class="selection-card__factor"><span class="selection-card__label">选品负责人</span><b>${item.owner}</b></div>
        <div class="selection-card__factor"><span class="selection-card__label">当前事项</span><b>${item.stageName}</b></div>
        <div class="selection-card__factor"><span class="selection-card__label">销售平台</span>${platformTags(item.platforms)}</div>
        <div class="selection-card__factor"><span class="selection-card__label">选品时间</span><b>${item.time}</b></div>
        <div class="selection-card__factor"><span class="selection-card__label">投入成本</span><b>${money(item.cost)}</b></div>
        <div class="selection-card__factor"><span class="selection-card__label">信息状态</span><b>${item.info}</b></div>
      </div>
    </section>

    <footer class="selection-card__decision selection-card__decision--${resultState}">
      <span class="selection-card__result-pill">${resultText(item.result)}</span>
      <div class="selection-card__reason"><strong>判断依据：</strong><span>${judgement}</span></div>
    </footer>
  </article>`;
}

function renderTableRow(item){
  return `<tr>
    <td class="selection-table__product">
      <div class="selection-table__product-inner">
        <span class="selection-table__thumb">${representativeImageMarkup(item,'table')}</span>
        <span class="selection-table__product-copy"><b title="${item.name}">${item.name}</b><small><span>${item.id}</span><em>${item.type}</em>${sourceEntry(item)}<button class="selection-table__elements" type="button" data-card-elements>要素 ${item.elements} ›</button></small></span>
      </div>
    </td>
    <td class="selection-table__owner"><span class="selection-table__clamp">${item.owner}</span></td>
    <td class="selection-table__matter">
      <div class="selection-table__matter-inner"><span class="selection-table__stage">${item.stageName}</span><button type="button" data-edit-id="${item.id}">编辑</button></div>
    </td>
    <td class="selection-table__platforms">${platformTags(item.platforms,2)}</td>
    <td>${splitTime(item.time)}</td>
    <td class="selection-table__cost"><strong>${money(item.cost)}</strong></td>
    <td class="selection-table__info"><span class="selection-table__clamp" title="${item.info}">${item.info}</span></td>
    <td class="selection-table__result-cell"><span class="selection-table__result ${resultClass(item.result)}">${resultText(item.result)}</span></td>
  </tr>`;
}

function createPreviewOpportunityId(){
  // 新建商品机会必须生成当前日期下未被占用的新编号，不能用列表长度推算序号。
  // 否则批量导入后再手工新建，可能与既有记录撞号并误打开旧记录。
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const d = String(now.getDate()).padStart(2,'0');
  const prefix = `XP${y}${m}${d}`;
  let maxSequence = 0;

  SELECTION_ITEMS.forEach(item=>{
    const match = String(item?.id || '').match(new RegExp(`^${prefix}(\\d{6})$`));
    if(match) maxSequence = Math.max(maxSequence, Number(match[1]));
  });

  let nextSequence = maxSequence + 1;
  let candidate = `${prefix}${String(nextSequence).padStart(6,'0')}`;

  // 浏览器预演可能留有已删除记录的草稿/流程状态；继续避开这些已占用编号。
  try{
    while(
      window.localStorage.getItem(`aione:selection:draft:${candidate}`) ||
      window.localStorage.getItem(`aione:selection:workflow:${candidate}`)
    ){
      nextSequence += 1;
      candidate = `${prefix}${String(nextSequence).padStart(6,'0')}`;
    }
  }catch(_){ /* localStorage不可用时仍使用当前列表中的最大序号。 */ }

  return candidate;
}

function formatLocalDateTime(value = new Date()){
  const date = value instanceof Date ? value : new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  const hh = String(date.getHours()).padStart(2,'0');
  const mm = String(date.getMinutes()).padStart(2,'0');
  return `${y}/${m}/${d} ${hh}:${mm}`;
}

function openSelectionRecordDetail({id, type='', mode='edit'} = {}){
  const recordId = String(id || '').trim();
  if(!recordId) return;

  // 新建模式必须从干净业务状态开始，绝不继承同编号的历史草稿或流程状态。
  if(mode === 'create'){
    try{
      window.localStorage.removeItem(`aione:selection:draft:${recordId}`);
      window.localStorage.removeItem(`aione:selection:workflow:${recordId}`);
    }catch(_){ /* 预演环境无法访问localStorage时继续进入空白创建页。 */ }
  }

  const target = new URL('./pages/selection-workbench/record-detail/index.html', window.location.href);
  target.searchParams.set('opportunity_id', recordId);
  target.searchParams.set('mode', mode);

  if(type) target.searchParams.set('selection_type', type);
  if(mode === 'create'){
    target.searchParams.set('owner', '张美和');
    target.searchParams.set('created_at', formatLocalDateTime());
  }

  target.hash = `/selection/opportunity/${encodeURIComponent(recordId)}`;
  window.location.href = target.href;
}


function focusRequestedWorkbenchArea(){
  const params = new URLSearchParams(window.location.search);
  if(params.get('focus') !== 'opportunity-overview') return;

  const heading = document.getElementById('selection-opportunity-title');
  const target = heading?.closest('.selection-core-area') || heading;
  if(!target) return;

  requestAnimationFrame(() => {
    const desktopHeader = document.getElementById('desktop-header-host');
    const mobileTop = document.getElementById('mobile-topbar-host');
    const mobileInfo = document.getElementById('mobile-info-host');

    const desktopHeight = desktopHeader && getComputedStyle(desktopHeader).display !== 'none'
      ? desktopHeader.getBoundingClientRect().height
      : 0;
    const mobileHeight =
      (mobileTop && getComputedStyle(mobileTop).display !== 'none' ? mobileTop.getBoundingClientRect().height : 0) +
      (mobileInfo && getComputedStyle(mobileInfo).display !== 'none' ? mobileInfo.getBoundingClientRect().height : 0);

    const offset = Math.max(desktopHeight, mobileHeight) + 14;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({top:Math.max(0, top), behavior:'auto'});

    // 定位完成后清理临时focus参数，保持正式URL干净。
    const clean = new URL(window.location.href);
    clean.searchParams.delete('focus');
    history.replaceState(null, '', `${clean.pathname}${clean.search}${clean.hash}`);
  });
}



function initBatchImport(root, showToast, onCreated){
  const dialog = document.getElementById('selection-batch-dialog');
  if(!dialog) return null;

  const stepItems = [...dialog.querySelectorAll('[data-batch-step]')];
  const typeLabel = dialog.querySelector('#selection-batch-type-label');
  const contextType = dialog.querySelector('#selection-batch-context-type');
  const templateTitle = dialog.querySelector('#selection-batch-template-title');
  const templateDesc = dialog.querySelector('#selection-batch-template-desc');
  const templateStatus = dialog.querySelector('#selection-batch-template-status');
  const downloadButton = dialog.querySelector('#selection-batch-download');
  const fileInput = dialog.querySelector('#selection-batch-file');
  const dropZone = dialog.querySelector('#selection-batch-drop-zone');
  const fileStatus = dialog.querySelector('#selection-batch-file-status');
  const validationPanel = dialog.querySelector('#selection-batch-validation');
  const actionButton = dialog.querySelector('#selection-batch-action');

  const templateMap = {
    '直发选品': {
      title:'直发选品｜Excel人工填报模板',
      description:'用于直发选品的采购来源型批量录入；业务类型由当前入口自动带入。',
      path:'./assets/templates/AIONE_SOURCE_IMPORT_TEMPLATE.xlsx',
      filename:'AIONE_直发选品_批量导入模板.xlsx'
    },
    '常规选品': {
      title:'常规选品｜Excel人工填报模板',
      description:'用于常规选品的采购来源型批量录入；员工只填写当前业务闭环真正需要的数据。',
      path:'./assets/templates/AIONE_SOURCE_IMPORT_TEMPLATE.xlsx',
      filename:'AIONE_常规选品_批量导入模板.xlsx'
    },
    '产品开发': {
      title:'产品开发｜Excel人工填报模板',
      description:'产品开发不强制采购来源链接，模板以开发需求名称、参考资料和开发要求为核心。',
      path:'./assets/templates/AIONE_PRODUCT_DEV_IMPORT_TEMPLATE.xlsx',
      filename:'AIONE_产品开发_批量导入模板.xlsx'
    }
  };

  const state = {type:'',file:null,validated:false,created:false,records:[]};
  const selectedTemplate = ()=>state.type ? templateMap[state.type] : null;

  function setSteps(){
    let current = 1;
    if(state.file) current = 2;
    if(state.validated) current = 3;
    if(state.created) current = 4;
    stepItems.forEach(item=>{
      const step = Number(item.dataset.batchStep);
      item.classList.toggle('is-done', step < current || state.created);
      item.classList.toggle('is-current', !state.created && step === current);
    });
  }

  function resetValidation(){
    state.validated = false;
    state.created = false;
    state.records = [];
    validationPanel.hidden = true;
    validationPanel.className = 'selection-batch-validation';
    validationPanel.innerHTML = '';
    actionButton.textContent = '校验Excel';
  }

  function updateTemplate(){
    const config = selectedTemplate();
    if(!config) return;
    typeLabel.textContent = state.type;
    contextType.textContent = state.type;
    templateTitle.textContent = config.title;
    templateDesc.textContent = config.description;
    templateStatus.textContent = '模板已匹配';
    templateStatus.classList.add('is-ready');
    downloadButton.disabled = false;
    downloadButton.textContent = `↓ 下载${state.type}模板`;
  }

  function updateFileStatus(message='', isError=false){
    if(!message){
      fileStatus.hidden = true;
      fileStatus.textContent = '';
      fileStatus.classList.remove('is-error');
      return;
    }
    fileStatus.hidden = false;
    fileStatus.textContent = message;
    fileStatus.classList.toggle('is-error',isError);
  }

  function updateAction(){
    if(state.created){
      actionButton.disabled = false;
      actionButton.textContent = '完成';
      return;
    }
    actionButton.disabled = !(state.type && state.file);
    actionButton.textContent = state.validated ? '确认批量创建' : '校验Excel';
  }

  function resetAll(type){
    state.type = TYPE_ORDER.includes(type) ? type : '';
    state.file = null;
    state.validated = false;
    state.created = false;
    state.records = [];
    if(fileInput) fileInput.value = '';
    updateFileStatus();
    validationPanel.hidden = true;
    validationPanel.className = 'selection-batch-validation';
    validationPanel.innerHTML = '';
    updateTemplate();
    updateAction();
    setSteps();
  }

  function acceptFile(file){
    resetValidation();
    const filename = String(file?.name || '');
    const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    if(!['.xlsx','.csv'].includes(extension)){
      state.file = null;
      if(fileInput) fileInput.value = '';
      updateFileStatus('文件格式不支持，请上传 .xlsx 或 .csv。',true);
      updateAction();
      setSteps();
      return;
    }
    state.file = file;
    const size = file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1,Math.round(file.size / 1024))} KB`;
    updateFileStatus(`已选择：${filename}｜${size}`);
    updateAction();
    setSteps();
  }

  async function inspectFile(){
    const file = state.file;
    if(!file) return {ok:false,message:'尚未选择文件。'};
    const filename = String(file.name || '');
    const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    const size = file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1,Math.round(file.size / 1024))} KB`;
    let records=[];

    try{
      if(extension === '.csv'){
        const text = await file.text();
        const workbook = XLSX.read(text,{type:'string'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        records = XLSX.utils.sheet_to_json(sheet,{defval:''});
      }else{
        if(typeof XLSX === 'undefined') return {ok:false,message:'Excel解析组件未加载，请刷新页面后重试。'};
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer,{type:'array'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        records = XLSX.utils.sheet_to_json(sheet,{defval:''});
      }
    }catch(error){
      console.error(error);
      return {ok:false,message:'Excel读取失败，请确认文件未损坏且使用AIONE模板。'};
    }

    records=records.filter(row=>Object.values(row).some(value=>String(value??'').trim()));
    if(!records.length) return {ok:false,message:'Excel中没有可创建的商品机会数据。',filename,size,rows:'0 条'};

    if(state.type !== '产品开发'){
      const missing=records.filter(row=>!String(row['采购来源链接'] || row['采购来源网址'] || '').trim());
      if(missing.length){
        return {ok:false,message:`检测到 ${missing.length} 条数据缺少“采购来源链接”，请补充后重新上传。`,filename,size,rows:`${records.length} 条`};
      }
    }

    return {
      ok:true,filename,size,rows:`${records.length} 条数据`,records,
      note:'已完成Excel真实解析与必填校验；确认后将写入当前浏览器的AIONE预演数据层。'
    };
  }

  function open(type){
    if(!TYPE_ORDER.includes(type)) return;
    resetAll(type);
    try{
      if(typeof dialog.showModal === 'function'){
        if(!dialog.open) dialog.showModal();
      }else{
        dialog.setAttribute('open','');
        dialog.classList.add('is-fallback-open');
      }
    }catch(error){
      console.error('[AIONE][selection] 批量导入弹窗打开失败，启用备用模式', error);
      dialog.setAttribute('open','');
      dialog.classList.add('is-fallback-open');
    }
  }

  dialog.querySelectorAll('[data-selection-batch-close]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('click',event=>{
    if(event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if(!inside) dialog.close();
  });

  downloadButton?.addEventListener('click',()=>{
    const config = selectedTemplate();
    if(!config) return;
    const anchor = document.createElement('a');
    anchor.href = config.path;
    anchor.download = config.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    showToast?.(`${state.type}｜模板下载已开始`);
  });

  fileInput?.addEventListener('change',()=>{
    const file = fileInput.files?.[0];
    if(file) acceptFile(file);
  });

  ['dragenter','dragover'].forEach(name=>dropZone?.addEventListener(name,event=>{
    event.preventDefault();
    dropZone.classList.add('is-dragging');
  }));
  ['dragleave','drop'].forEach(name=>dropZone?.addEventListener(name,event=>{
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
  }));
  dropZone?.addEventListener('drop',event=>{
    const file = event.dataTransfer?.files?.[0];
    if(file) acceptFile(file);
  });

  actionButton?.addEventListener('click',async()=>{
    if(state.created){
      dialog.close();
      return;
    }
    if(!state.type || !state.file) return;

    if(!state.validated){
      actionButton.disabled = true;
      actionButton.textContent = '校验中…';
      const result = await inspectFile();
      if(!result.ok){
        validationPanel.hidden = false;
        validationPanel.className = 'selection-batch-validation is-error';
        validationPanel.innerHTML = `<strong>校验发现问题</strong><br>${result.message}`;
        state.validated = false;
        actionButton.disabled = false;
        actionButton.textContent = '重新校验';
        setSteps();
        return;
      }
      state.validated = true;
      state.records = result.records || [];
      validationPanel.hidden = false;
      validationPanel.className = 'selection-batch-validation';
      validationPanel.innerHTML = `<strong>预检查通过（原型环境）</strong><br>业务类型：${state.type}｜文件：${result.filename}｜大小：${result.size}<br>数据量：${result.rows}<br>${result.note}<br>正式系统将继续执行：读取行 → 去重 → 必填校验 → 缺失／冲突项进入待确认 → 生成商品机会ID。`;
      updateAction();
      setSteps();
      return;
    }

    let created=[];
    try{
      created=importPreviewOpportunities(state.records,state.type);
    }catch(error){
      console.error(error);
      validationPanel.hidden = false;
      validationPanel.className = 'selection-batch-validation is-error';
      validationPanel.innerHTML = `<strong>批量创建失败</strong><br>预演数据未能写入浏览器，请确认使用本地HTTP方式打开AIONE。`;
      showToast?.('批量创建失败，请检查浏览器本地存储权限。');
      return;
    }
    state.created = true;
    refreshSelectionItems();
    onCreated?.();
    validationPanel.hidden = false;
    validationPanel.className = 'selection-batch-validation is-created';
    validationPanel.innerHTML = `<strong>批量创建成功｜${created.length} 个商品机会</strong><br>已真实写入当前浏览器的AIONE预演数据层。关闭窗口后可在商品机会列表中查看；刷新页面后数据仍会保留。`;
    showToast?.(`批量创建成功：${created.length} 个商品机会已保存到预演数据。`);
    updateAction();
    setSteps();
  });

  return {open};
}

export function initSelectionWorkbench(){
  const root = document.querySelector('.selection-page');
  if(!root) return;

  const state = workbenchState;
  const typeGrid = root.querySelector('#selection-type-grid');
  const flowTrack = root.querySelector('#selection-flow-track');
  const metrics = root.querySelector('#selection-metrics');
  const cardGrid = root.querySelector('#selection-card-grid');
  const listView = root.querySelector('#selection-list-view');
  const tableBody = root.querySelector('#selection-table-body');
  const visibleCount = root.querySelector('#selection-visible-count');
  const typeSelect = root.querySelector('#selection-type-select');
  const statusSelect = root.querySelector('#selection-status-select');
  const ownerSelect = root.querySelector('#selection-owner-select');
  const searchInput = root.querySelector('#selection-search');
  const flowLabel = root.querySelector('#selection-flow-label');
  const overlay = document.getElementById('selection-elements-overlay');
  const toast = document.getElementById('selection-toast');
  let toastTimer;

  function showToast(text){
    if(!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>toast.classList.remove('show'),2100);
  }

  function renderOverview(){
    if(typeGrid) typeGrid.innerHTML = TYPE_ORDER.map(type=>{
      const count = SELECTION_ITEMS.filter(x=>x.type===type).length;
      return `<article class="selection-type-card">
        <button class="selection-type-card__summary${state.type===type?' active':''}" type="button" data-type-filter="${type}" aria-label="查看${type}商品机会">
          <span>${type}</span><b>${count}</b>
        </button>
        <div class="selection-type-card__actions">
          <button class="selection-type-card__action" type="button" data-create-opportunity="${type}"><span aria-hidden="true">＋</span>新建商品机会</button>
          <button class="selection-type-card__action" type="button" data-batch-import-type="${type}"><span aria-hidden="true">⇧</span>批量导入</button>
        </div>
      </article>`;
    }).join('');

    if(flowTrack) flowTrack.innerHTML = STAGES.map(([key,label],index)=>{
      const count = SELECTION_ITEMS.filter(x=>x.stage===key).length;
      return `<button class="selection-flow-step${state.stage===key?' active':''}" type="button" data-stage-filter="${key}" data-stage-name="${label}"><small>0${index+1}</small><span>${label}</span><b>${count}</b></button>`;
    }).join('');

    const total = SELECTION_ITEMS.length;
    const listed = SELECTION_ITEMS.filter(x=>x.result==='上架').length;
    const rejected = SELECTION_ITEMS.filter(x=>x.result==='不上架').length;
    const ongoing = SELECTION_ITEMS.filter(x=>x.result==='待形成').length;
    const decided = listed + rejected;
    const rate = decided ? Math.round(listed/decided*100) : 0;
    const cost = SELECTION_ITEMS.reduce((sum,x)=>sum+x.cost,0);
    if(metrics) metrics.innerHTML = [
      ['商品机会总数',total],['上架',listed],['不上架',rejected],['上架率',`${rate}%`],['进行中',ongoing],['投入总成本',money(cost)]
    ].map(([label,value])=>`<div class="selection-metric"><span>${label}</span><strong>${value}</strong></div>`).join('');
    const flowTotal = root.querySelector('#selection-flow-total');
    if(flowTotal) flowTotal.textContent = String(total);
  }

  function filtered(){
    const q = state.query.trim().toLowerCase();
    return SELECTION_ITEMS.filter(item=>{
      if(state.type && item.type!==state.type) return false;
      if(state.stage && item.stage!==state.stage) return false;
      if(state.status && itemStatus(item)!==state.status) return false;
      if(state.owner && item.owner!==state.owner) return false;
      if(q && !`${item.name} ${item.id} ${item.owner}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderResults(){
    const rows = filtered();
    const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if(state.page > pageCount) state.page = pageCount;
    if(state.page < 1) state.page = 1;
    const startIndex = (state.page - 1) * PAGE_SIZE;
    const pageRows = rows.slice(startIndex, startIndex + PAGE_SIZE);
    if(cardGrid) cardGrid.innerHTML = pageRows.map(renderCard).join('');
    if(tableBody) tableBody.innerHTML = pageRows.map(renderTableRow).join('');
    const currentCost = rows.reduce((sum,item)=>sum+Number(item.cost||0),0);
    const startLabel = rows.length ? startIndex + 1 : 0;
    const endLabel = rows.length ? startIndex + pageRows.length : 0;
    if(visibleCount) visibleCount.textContent = `当前显示 ${startLabel}–${endLabel} / ${rows.length} 项 · 当前投入成本 ${money(currentCost)}`;
    const pageLabel = root.querySelector('#selection-page-label');
    const prevButton = root.querySelector('#selection-page-prev');
    const nextButton = root.querySelector('#selection-page-next');
    if(pageLabel) pageLabel.textContent = `${state.page} / ${pageCount}`;
    if(prevButton) prevButton.disabled = state.page <= 1;
    if(nextButton) nextButton.disabled = state.page >= pageCount;
    if(cardGrid) cardGrid.hidden = state.view!=='card';
    if(listView) listView.hidden = state.view!=='list';
    root.querySelectorAll('[data-selection-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.selectionView===state.view));
    root.querySelectorAll('[data-type-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.typeFilter===state.type));
    root.querySelectorAll('[data-stage-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.stageFilter===state.stage));
    if(flowLabel) flowLabel.textContent = state.stage ? STAGES.find(x=>x[0]===state.stage)?.[1] || '全部' : '全部';
  }

  // 先完成商品机会总览与列表渲染，再初始化批量导入。
  // 批量导入属于辅助能力，任何局部异常都不能阻断商品机会主列表。
  renderOverview();
  try{
    renderResults();
  }catch(error){
    console.error('[AIONE][selection] 商品机会一览渲染失败', error);
    if(cardGrid){
      cardGrid.hidden = false;
      cardGrid.innerHTML = '<div class=\"selection-render-warning\">商品机会列表加载异常，请刷新后重试。</div>';
    }
  }

  let batchImport = null;
  try{
    batchImport = initBatchImport(root, showToast, ()=>{renderOverview();renderResults();});
  }catch(error){
    console.error('[AIONE][selection] 批量导入初始化失败', error);
  }

  if(ownerSelect){
    [...new Set(SELECTION_ITEMS.map(x=>x.owner))].forEach(owner=>{
      const option=document.createElement('option');option.value=owner;option.textContent=owner;ownerSelect.appendChild(option);
    });
    ownerSelect.value = state.owner;
  }
  if(typeSelect) typeSelect.value = state.type;
  if(statusSelect) statusSelect.value = state.status;
  if(searchInput) searchInput.value = state.query;

  root.addEventListener('click',event=>{
    const createButton=event.target.closest('[data-create-opportunity]');
    if(createButton){
      const type=createButton.dataset.createOpportunity || '';
      const opportunityId=createPreviewOpportunityId();
      openSelectionRecordDetail({id:opportunityId,type,mode:'create'});
      return;
    }
    const batchButton=event.target.closest('[data-batch-import-type]');
    if(batchButton){batchImport?.open(batchButton.dataset.batchImportType || '');return;}
    const typeButton=event.target.closest('[data-type-filter]');
    if(typeButton){state.type=typeButton.dataset.typeFilter||'';state.page=1;if(typeSelect) typeSelect.value=state.type;renderOverview();renderResults();return;}
    const stageButton=event.target.closest('[data-stage-filter]');
    if(stageButton){state.stage=stageButton.dataset.stageFilter||'';state.page=1;renderOverview();renderResults();return;}
    const viewButton=event.target.closest('[data-selection-view]');
    if(viewButton){state.view=viewButton.dataset.selectionView;renderResults();return;}
    if(event.target.closest('[data-card-elements]')){overlay?.classList.add('open');overlay?.setAttribute('aria-hidden','false');return;}
    const edit=event.target.closest('[data-edit-id]');
    if(edit){
      const item = SELECTION_ITEMS.find(x=>x.id===edit.dataset.editId);
      openSelectionRecordDetail({
        id: edit.dataset.editId,
        type: item?.type || '',
        mode: 'edit'
      });
      return;
    }
    const help=event.target.closest('[data-selection-help]');
    if(help){showToast('预览：正式版由帮助中心调用对应模块说明。');return;}
    const element=event.target.closest('[data-element]');
    if(element){showToast(`业务关键要素｜${element.dataset.element}`);return;}
  });

  typeSelect?.addEventListener('change',()=>{state.type=typeSelect.value;state.page=1;renderOverview();renderResults()});
  statusSelect?.addEventListener('change',()=>{state.status=statusSelect.value;state.page=1;renderResults()});
  ownerSelect?.addEventListener('change',()=>{state.owner=ownerSelect.value;state.page=1;renderResults()});
  searchInput?.addEventListener('input',()=>{state.query=searchInput.value;state.page=1;renderResults()});
  root.querySelector('#selection-time-select')?.addEventListener('change',()=>showToast('预览数据集中显示全部时间；正式版接入真实时间筛选。'));
  root.querySelector('#selection-reset')?.addEventListener('click',()=>{
    state.type='';state.stage='';state.status='';state.owner='';state.query='';state.page=1;
    if(typeSelect) typeSelect.value='';if(statusSelect) statusSelect.value='';if(ownerSelect) ownerSelect.value='';if(searchInput) searchInput.value='';
    renderOverview();renderResults();
  });

  root.querySelector('#selection-page-prev')?.addEventListener('click',()=>{ if(state.page>1){state.page-=1;renderResults();} });
  root.querySelector('#selection-page-next')?.addEventListener('click',()=>{ const pageCount=Math.max(1,Math.ceil(filtered().length/PAGE_SIZE)); if(state.page<pageCount){state.page+=1;renderResults();} });


  document.getElementById('selection-elements-close')?.addEventListener('click',()=>{overlay?.classList.remove('open');overlay?.setAttribute('aria-hidden','true')});
  overlay?.addEventListener('click',event=>{if(event.target===overlay){overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true')}});

  // 最终再同步一次总览，确保负责人筛选等初始化完成后页面状态一致。
  renderOverview();
  try{ renderResults(); }catch(error){ console.error('[AIONE][selection] 商品机会一览二次渲染失败', error); }
  focusRequestedWorkbenchArea();
}
