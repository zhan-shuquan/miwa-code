const BRANDS = [
  { id:'BR-001', name:'SOCKONE', kana:'ソックワン', type:'自有品牌', owner:'美和商会株式会社', category:'男袜', rights:'申请准备中', channels:['Rakuten','Amazon'], tone:'navy', mark:'SO' },
  { id:'BR-002', name:'HATORIA', kana:'ハトリア', type:'自有品牌', owner:'美和商会株式会社', category:'帽子・傘・バッグ', rights:'待确认', channels:['Rakuten'], tone:'green', mark:'HA' },
  { id:'BR-003', name:'BAGONE', kana:'バッグワン', type:'自有品牌', owner:'美和商会株式会社', category:'箱包', rights:'待确认', channels:['Rakuten'], tone:'sand', mark:'BA' },
  { id:'BR-004', name:'LIFEONE', kana:'ライフワン', type:'自有品牌', owner:'美和商会株式会社', category:'生活杂货', rights:'待确认', channels:['Rakuten'], tone:'mint', mark:'LI' },
  { id:'BR-101', name:'WOSADO', kana:'WOSADO', type:'第三方品牌', owner:'外部品牌方', category:'美容个护', rights:'授权资料待确认', channels:['Rakuten'], tone:'rose', mark:'WO' },
  { id:'BR-102', name:'KAPPA', kana:'KAPPA', type:'第三方品牌', owner:'外部品牌方', category:'服装服饰', rights:'授权范围待确认', channels:['批发'], tone:'blue', mark:'KA' }
];

const state = { view:'directory', type:'全部品牌', selected:'BR-001' };

function currentBrand(){ return BRANDS.find((item)=>item.id===state.selected) || BRANDS[0]; }
function escapeHtml(value){ return String(value ?? '').replace(/[&<>\"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c])); }

function pageHeader(){
  return `<header class="brand-page-header">
    <div><span>商品之家 · 第02章</span><h1>品牌中心</h1><p>统一管理“商品是谁的”：一个品牌一个 Brand 对象，品牌事实、权利和渠道映射共用同一事实源。</p></div>
    <div class="brand-page-actions">
      <button type="button" data-brand-action="ai" class="brand-btn brand-btn--ai">✦ 让商品之家AI秘书检查</button>
      <button type="button" class="brand-btn">导入 / 导出</button>
      <button type="button" class="brand-btn brand-btn--primary" data-brand-action="new">＋ 新建品牌</button>
      <button type="button" class="brand-btn brand-btn--icon">⋯</button>
    </div>
  </header>`;
}

function tabs(){
  const items=[['overview','概览'],['directory','品牌一览'],['rights','品牌权利'],['mapping','品牌映射']];
  return `<nav class="brand-tabs">${items.map(([id,label])=>`<button type="button" data-brand-view="${id}" class="${state.view===id?'is-active':''}">${label}${id==='overview'?'<small>最后生成</small>':''}</button>`).join('')}</nav>`;
}

function typeCards(){
  const types=[['全部品牌',BRANDS.length],['自有品牌',BRANDS.filter(x=>x.type==='自有品牌').length],['授权品牌',0],['第三方品牌',BRANDS.filter(x=>x.type==='第三方品牌').length]];
  return `<section class="brand-type-strip">${types.map(([label,count])=>`<button type="button" data-brand-type="${label}" class="${state.type===label?'is-active':''}"><span>${label}</span><strong>${count}</strong></button>`).join('')}</section>`;
}

function brandCard(item){
  return `<article class="brand-card tone-${item.tone} ${state.selected===item.id?'is-selected':''}" data-brand-id="${item.id}">
    <div class="brand-card__visual"><span>${item.mark}</span></div>
    <div class="brand-card__main"><div class="brand-card__eyebrow"><span>${item.id}</span><em>${item.type}</em></div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.kana)}</p></div>
    <dl><div><dt>主要分类</dt><dd>${escapeHtml(item.category)}</dd></div><div><dt>权利状态</dt><dd>${escapeHtml(item.rights)}</dd></div></dl>
    <div class="brand-card__channels">${item.channels.map(x=>`<span>${x}</span>`).join('')}</div>
  </article>`;
}

function directoryView(){
  const filtered=state.type==='全部品牌'?BRANDS:BRANDS.filter(x=>x.type===state.type);
  const brand=currentBrand();
  return `<div class="brand-view">
    ${typeCards()}
    <section class="brand-workspace">
      <div class="brand-list-panel"><header><div><span>统一品牌对象</span><h2>品牌一览</h2></div><label>搜索品牌<input type="search" placeholder="品牌名 / 编号"></label></header><div class="brand-grid">${filtered.map(brandCard).join('') || '<div class="brand-empty">暂无品牌</div>'}</div></div>
      <aside class="brand-context-panel"><div class="brand-context-head tone-${brand.tone}"><span>${brand.mark}</span><div><small>${brand.type}</small><h2>${brand.name}</h2><p>${brand.kana}</p></div></div>
        <div class="brand-context-section"><h3>品牌事实</h3><dl><div><dt>品牌所有者</dt><dd>${brand.owner}</dd></div><div><dt>主要分类</dt><dd>${brand.category}</dd></div><div><dt>渠道</dt><dd>${brand.channels.join(' / ')}</dd></div></dl></div>
        <div class="brand-context-section"><h3>当前需要关注</h3><button data-brand-ai-prompt="检查 ${brand.name} 的品牌事实、权利资料和渠道映射缺口。">✦ AI检查品牌完整度</button><button data-brand-view-link="rights">查看品牌权利 →</button><button data-brand-view-link="mapping">查看渠道映射 →</button></div>
      </aside>
    </section>
  </div>`;
}

function rightsView(){
  const brand=currentBrand();
  return `<section class="brand-rights">
    <header class="brand-section-head"><div><span>Brand Rights</span><h2>品牌权利</h2><p>管理与品牌直接相关的商标、品牌所有权、授权关系和权利证据；专利、著作权等统一知识产权对象以后归知识之家。</p></div><div><button class="brand-btn" data-brand-action="ai-rights">✦ AI申请前检查</button><button class="brand-btn brand-btn--primary" data-brand-action="trademark">＋ 申请商标</button></div></header>
    <div class="brand-rights-layout">
      <div class="rights-flow"><h3>商标申请闭环</h3>${['选择品牌','确认申请主体','确认商标形式','选择国家/地区','选择商品/服务类别','近似商标检索','生成申请资料','人工确认','官方提交','跟踪审查状态'].map((x,i)=>`<div><b>${String(i+1).padStart(2,'0')}</b><span>${x}</span></div>`).join('')}</div>
      <div class="rights-current"><span>当前品牌</span><h3>${brand.name}</h3><div class="rights-kpis"><div><small>品牌类型</small><strong>${brand.type}</strong></div><div><small>权利状态</small><strong>${brand.rights}</strong></div></div><div class="rights-ai"><b>商品之家AI秘书</b><p>可先检查申请主体、Logo/文字商标、指定商品候选、资料缺口与申请前风险；正式法律判断和提交必须人工确认。</p><button data-brand-ai-prompt="为 ${brand.name} 做商标申请前检查：区分已知事实、待确认资料、推荐准备顺序，不要编造法律结论。">开始AI检查</button></div></div>
    </div>
  </section>`;
}

function mappingView(){
  return `<section class="brand-mapping"><header class="brand-section-head"><div><span>Channel Mapping</span><h2>品牌映射</h2><p>AIONE 内部只维护一个 Brand；外部平台名称和 Brand ID 通过映射输出，不复制品牌对象。</p></div><button class="brand-btn" data-brand-action="ai-mapping">✦ AI检查映射异常</button></header>
    <div class="mapping-table"><div class="mapping-row mapping-row--head"><span>AIONE品牌</span><span>渠道</span><span>外部品牌名</span><span>外部ID</span><span>状态</span></div>
      ${BRANDS.slice(0,4).flatMap(item=>item.channels.map(channel=>`<div class="mapping-row"><strong>${item.name}</strong><span>${channel}</span><span>${item.name}</span><code>待API确认</code><em>${channel==='Rakuten'?'待校验':'待接入'}</em></div>`)).join('')}
    </div>
  </section>`;
}

function overviewView(){
  return `<section class="brand-overview-placeholder"><div>02</div><span>概览最后生成</span><h2>品牌中心正文尚在收口，概览暂不提前写。</h2><p>等“品牌一览 / 品牌权利 / 品牌映射”全部锁定后，再根据真实页面状态生成正常业务概览。</p><button data-brand-view-link="directory">先进入品牌一览</button></section>`;
}

function render(){
  const host=document.getElementById('app-main-host');
  if(!host) return;
  document.body.dataset.brandCenterPreview='true';
  host.innerHTML=`<section class="brand-center-preview" data-brand-center-preview>${pageHeader()}${tabs()}<div class="brand-view-host">${state.view==='directory'?directoryView():state.view==='rights'?rightsView():state.view==='mapping'?mappingView():overviewView()}</div></section>`;
  window.dispatchEvent(new CustomEvent('aione:brand-center-rendered',{detail:{view:state.view,brand:currentBrand()}}));
}

function openAI(prompt=''){
  window.MIWAAI?.open?.('product-home-brand-center');
  window.setTimeout(()=>{
    const input=document.getElementById('ai-secretary-command-input');
    if(!input) return;
    if(prompt) input.value=prompt;
    input.focus();
    input.setSelectionRange?.(input.value.length,input.value.length);
  },80);
}

function bind(){
  const host=document.getElementById('app-main-host');
  if(!host || host.dataset.brandCenterBound==='true') return;
  host.dataset.brandCenterBound='true';
  host.addEventListener('click',(event)=>{
    const tab=event.target.closest('[data-brand-view]'); if(tab){state.view=tab.dataset.brandView;render();return;}
    const type=event.target.closest('[data-brand-type]'); if(type){state.type=type.dataset.brandType;render();return;}
    const card=event.target.closest('[data-brand-id]'); if(card){state.selected=card.dataset.brandId;render();return;}
    const link=event.target.closest('[data-brand-view-link]'); if(link){state.view=link.dataset.brandViewLink;render();return;}
    const prompt=event.target.closest('[data-brand-ai-prompt]'); if(prompt){openAI(prompt.dataset.brandAiPrompt);return;}
    const action=event.target.closest('[data-brand-action]')?.dataset.brandAction;
    if(action==='ai') openAI('作为商品之家AI秘书，请检查当前品牌中心最值得关注的品牌事实、权利和渠道映射缺口。');
    if(action==='ai-rights') openAI('作为商品之家AI秘书，请检查当前品牌权利页的申请准备情况、资料缺口与下一步。');
    if(action==='ai-mapping') openAI('作为商品之家AI秘书，请检查品牌渠道映射中的缺失、冲突和待确认项。');
    if(action==='trademark') openAI(`我要为 ${currentBrand().name} 准备商标申请。请按申请主体、商标形式、国家地区、指定商品/服务、近似检索、资料准备、人工确认、官方提交的顺序辅助我。`);
    if(action==='new') openAI('我要新建一个品牌对象。请先检查最少必须事实，不要增加无必要字段。');
  });
}

export function initBrandCenterPreview(){ render(); bind(); }
