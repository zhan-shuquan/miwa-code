const BRANDS = [
  { id:'BR-001', name:'WEARONE', kana:'ウェアワン', scope:'服装服饰', level:'一级主品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社' },
  { id:'BR-002', name:'SHOEONE', kana:'シューワン', scope:'鞋靴', level:'一级主品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社' },
  { id:'BR-003', name:'BAGONE', kana:'バッグワン', scope:'箱包', level:'一级主品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社' },
  { id:'BR-004', name:'ACCEONE', kana:'アクセワン', scope:'帽饰配件', level:'一级主品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社' },
  { id:'BR-005', name:'LIFEONE', kana:'ライフワン', scope:'家居生活', level:'一级主品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社' },
  { id:'BR-006', name:'KITCHENONE', kana:'キッチンワン', scope:'厨房餐饮', level:'一级主品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社' },
  { id:'BR-007', name:'CAREONE', kana:'ケアワン', scope:'健康护理', level:'一级主品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社' },
  { id:'BR-008', name:'BEAUTYONE', kana:'ビューティーワン', scope:'美容个护', level:'一级主品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社' },
  { id:'BR-009', name:'TECHONE', kana:'テックワン', scope:'数码电器', level:'一级主品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社' },
  { id:'BR-010', name:'TRAVELONE', kana:'トラベルワン', scope:'户外旅行', level:'一级主品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社' },
  { id:'BR-011', name:'PETONE', kana:'ペットワン', scope:'宠物用品', level:'一级主品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社' },
  { id:'BR-012', name:'GIFTONE', kana:'ギフトワン', scope:'文具礼品', level:'一级主品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社' },
  { id:'BR-101', name:'SOCKONE', kana:'ソックワン', scope:'袜类', level:'专业品牌', status:'已使用', trademark:'申请准备中', owner:'美和商会株式会社' },
  { id:'BR-102', name:'HATORIA', kana:'ハトリア', scope:'帽类', level:'专业品牌', status:'已使用', trademark:'待确认', owner:'美和商会株式会社' },
  { id:'BR-103', name:'TIDYONE', kana:'タイディワン', scope:'收纳整理', level:'专业品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社' },
  { id:'BR-104', name:'SUMAHONE', kana:'スマホワン', scope:'手机周边', level:'专业品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社' }
];

const state = { view:'directory', group:'全部品牌', selected:'BR-101' };
const JPLATPAT_URL='https://www.j-platpat.inpit.go.jp/';
const SAKUTTO_URL='https://sakutto.pcinfo.jpo.go.jp/';

function currentBrand(){ return BRANDS.find((item)=>item.id===state.selected) || BRANDS[0]; }
function escapeHtml(value){ return String(value ?? '').replace(/[&<>\"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c])); }

function pageHeader(){
  return `<header class="brand-page-header">
    <div><span>商品之家 · 第02章</span><h1>品牌中心</h1><p>统一管理品牌规划、英文文字商标注册准备、品牌使用与长期维护。品牌名称锁定不等于商标可注册，正式申请前必须完成官方检索与人工确认。</p></div>
    <div class="brand-page-actions"><button type="button" data-brand-action="ai" class="brand-btn brand-btn--ai">✦ 商品之家AI秘书</button><button type="button" class="brand-btn brand-btn--primary" data-brand-action="new">＋ 新建品牌</button></div>
  </header>`;
}

function tabs(){
  const items=[['overview','概览'],['directory','品牌一览'],['planning','品牌规划'],['registration','品牌注册'],['usage','品牌使用']];
  return `<nav class="brand-tabs">${items.map(([id,label])=>`<button type="button" data-brand-view="${id}" class="${state.view===id?'is-active':''}">${label}${id==='overview'?'<small>最后生成</small>':''}</button>`).join('')}</nav>`;
}

function groupStrip(){
  const groups=[['全部品牌',BRANDS.length],['一级主品牌',BRANDS.filter(x=>x.level==='一级主品牌').length],['专业品牌',BRANDS.filter(x=>x.level==='专业品牌').length],['待检索',BRANDS.filter(x=>x.trademark==='待检索').length]];
  return `<section class="brand-type-strip">${groups.map(([label,count])=>`<button type="button" data-brand-group="${label}" class="${state.group===label?'is-active':''}"><span>${label}</span><strong>${count}</strong></button>`).join('')}</section>`;
}

function brandCard(item){
  return `<article class="brand-card ${state.selected===item.id?'is-selected':''}" data-brand-id="${item.id}">
    <div class="brand-wordmark">${escapeHtml(item.name)}</div>
    <div class="brand-card__eyebrow"><span>${item.id}</span><em>${item.level}</em></div>
    <h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.kana)}</p>
    <dl><div><dt>预定使用范围</dt><dd>${escapeHtml(item.scope)}</dd></div><div><dt>商标状态</dt><dd>${escapeHtml(item.trademark)}</dd></div></dl>
    <div class="brand-card__channels"><span>${escapeHtml(item.status)}</span></div>
  </article>`;
}

function directoryView(){
  const filtered=state.group==='全部品牌'?BRANDS:state.group==='待检索'?BRANDS.filter(x=>x.trademark==='待检索'):BRANDS.filter(x=>x.level===state.group);
  const brand=currentBrand();
  return `<div class="brand-view">${groupStrip()}<section class="brand-workspace">
    <div class="brand-list-panel"><header><div><span>Brand Master</span><h2>品牌一览</h2></div><label>搜索品牌<input type="search" placeholder="品牌名 / 使用范围"></label></header><div class="brand-grid">${filtered.map(brandCard).join('')}</div></div>
    <aside class="brand-context-panel"><div class="brand-context-head"><div class="brand-context-wordmark">${brand.name}</div><div><small>${brand.level}</small><h2>${brand.name}</h2><p>${brand.kana}</p></div></div>
      <div class="brand-context-section"><h3>品牌事实</h3><dl><div><dt>品牌所有者</dt><dd>${brand.owner}</dd></div><div><dt>预定使用范围</dt><dd>${brand.scope}</dd></div><div><dt>规划状态</dt><dd>${brand.status}</dd></div><div><dt>商标状态</dt><dd>${brand.trademark}</dd></div></dl></div>
      <div class="brand-context-section"><h3>快捷工作</h3><button data-brand-view-link="registration">进入品牌注册 →</button><button data-brand-ai-prompt="检查 ${brand.name} 的品牌事实、英文文字商标申请准备和缺失资料。">✦ AI检查资料完整度</button></div>
    </aside></section></div>`;
}

function planningView(){
  const masters=BRANDS.filter(x=>x.level==='一级主品牌');
  const specialty=BRANDS.filter(x=>x.level==='专业品牌');
  return `<section class="brand-planning"><header class="brand-section-head"><div><span>Brand Planning V1</span><h2>美和品牌群规划</h2><p>12个一级大类统一建立ONE系列主品牌；专业品牌只保留少数已明确方向，后续确有需要再增加。</p></div><button class="brand-btn" data-brand-action="ai-planning">✦ AI检查品牌群</button></header>
    <div class="planning-block"><div class="planning-title"><div><b>12</b><span>一级大类主品牌</span></div><em>已锁定规划</em></div><div class="planning-grid">${masters.map(brandCard).join('')}</div></div>
    <div class="planning-block"><div class="planning-title"><div><b>4</b><span>专业品牌</span></div><em>按业务需要深化</em></div><div class="planning-grid planning-grid--special">${specialty.map(brandCard).join('')}</div></div>
  </section>`;
}

function registrationView(){
  const brand=currentBrand();
  const steps=['选择品牌','确认申请主体','确认英文文字商标','选择日本申请','确认指定商品 / 服务','近似商标检索','生成申请资料','人工确认','打开官方申请','登记并跟踪状态'];
  return `<section class="brand-registration"><header class="brand-section-head"><div><span>Trademark Registration</span><h2>品牌注册</h2><p>第一期只跑通“日本 × 英文文字商标”闭环：AIONE准备事实和资料，官方系统负责检索与正式提交。</p></div><div><button class="brand-btn" data-brand-action="jplatpat">打开 J-PlatPat ↗</button><button class="brand-btn brand-btn--primary" data-brand-action="sakutto">打开官方申请工具 ↗</button></div></header>
    <div class="registration-layout"><div class="registration-flow">${steps.map((x,i)=>`<button type="button" data-step="${i+1}" class="${i===5?'is-key':''}"><b>${String(i+1).padStart(2,'0')}</b><span>${x}</span><small>${i===5?'官方检索':i===8?'正式提交入口':'AIONE准备'}</small></button>`).join('')}</div>
    <aside class="registration-panel"><span>当前申请品牌</span><div class="registration-wordmark">${brand.name}</div><h3>${brand.name}</h3><p>${brand.kana} · ${brand.scope}</p>
      <div class="registration-facts"><div><small>申请主体</small><strong>${brand.owner}</strong></div><div><small>商标形式</small><strong>英文文字商标</strong></div><div><small>国家 / 地区</small><strong>日本</strong></div><div><small>当前状态</small><strong>${brand.trademark}</strong></div></div>
      <div class="registration-actions"><button data-brand-ai-prompt="为 ${brand.name} 准备英文文字商标检索条件：品牌名、日文称呼、预定商品范围、需要人工确认的项目。">✦ AI准备检索条件</button><button data-brand-action="jplatpat">近似商标检索 · J-PlatPat ↗</button><button data-brand-ai-prompt="为 ${brand.name} 生成日本英文文字商标申请资料清单，区分自动继承、待人工确认、官方提交三部分。">✦ AI生成申请资料清单</button><button data-brand-action="sakutto" class="is-primary">资料确认后打开官方申请 ↗</button></div>
      <div class="registration-note"><b>第一期规则</b>英文品牌名直接作为统一品牌视觉；不要求上传Logo。名称锁定 ≠ 商标可注册，检索结果与正式法律判断必须人工确认并留证。</div>
    </aside></div>
  </section>`;
}

function usageView(){
  return `<section class="brand-usage"><header class="brand-section-head"><div><span>Brand Usage</span><h2>品牌使用</h2><p>品牌是独立对象；商品分类、商品、店铺与渠道只是使用关系。允许跨分类使用，不把品牌硬绑成分类子对象。</p></div><button class="brand-btn" data-brand-action="ai-usage">✦ AI检查使用关系</button></header><div class="usage-table"><div class="usage-row usage-row--head"><span>品牌</span><span>主要使用范围</span><span>规划层级</span><span>状态</span></div>${BRANDS.map(x=>`<div class="usage-row" data-brand-id="${x.id}"><strong>${x.name}</strong><span>${x.scope}</span><span>${x.level}</span><em>${x.status}</em></div>`).join('')}</div></section>`;
}

function overviewView(){ return `<section class="brand-overview-placeholder"><div>02</div><span>概览最后生成</span><h2>品牌中心正文正在按真实业务闭环收口。</h2><p>等品牌一览、品牌规划、品牌注册、品牌使用全部锁定后，再根据真实页面和状态生成概览。</p><button data-brand-view-link="planning">先查看品牌规划</button></section>`; }

function render(){
  const host=document.getElementById('app-main-host'); if(!host) return;
  document.body.dataset.brandCenterPreview='true';
  const view=state.view==='directory'?directoryView():state.view==='planning'?planningView():state.view==='registration'?registrationView():state.view==='usage'?usageView():overviewView();
  host.innerHTML=`<section class="brand-center-preview">${pageHeader()}${tabs()}<div class="brand-view-host">${view}</div></section>`;
}
function openAI(prompt=''){ window.MIWAAI?.open?.('product-home-brand-center'); setTimeout(()=>{const input=document.getElementById('ai-secretary-command-input'); if(!input)return; if(prompt)input.value=prompt; input.focus();},80); }
function openExternal(url){ window.open(url,'_blank','noopener,noreferrer'); }
function bind(){
  const host=document.getElementById('app-main-host'); if(!host || host.dataset.brandCenterBound==='true') return; host.dataset.brandCenterBound='true';
  host.addEventListener('click',(event)=>{
    const tab=event.target.closest('[data-brand-view]'); if(tab){state.view=tab.dataset.brandView;render();return;}
    const group=event.target.closest('[data-brand-group]'); if(group){state.group=group.dataset.brandGroup;render();return;}
    const card=event.target.closest('[data-brand-id]'); if(card){state.selected=card.dataset.brandId; if(state.view==='usage')state.view='directory'; render();return;}
    const link=event.target.closest('[data-brand-view-link]'); if(link){state.view=link.dataset.brandViewLink;render();return;}
    const prompt=event.target.closest('[data-brand-ai-prompt]'); if(prompt){openAI(prompt.dataset.brandAiPrompt);return;}
    const action=event.target.closest('[data-brand-action]')?.dataset.brandAction;
    if(action==='jplatpat') openExternal(JPLATPAT_URL);
    if(action==='sakutto') openExternal(SAKUTTO_URL);
    if(action==='ai') openAI('作为商品之家AI秘书，请检查品牌中心当前最重要的品牌规划、注册准备和品牌使用问题。');
    if(action==='ai-planning') openAI('检查美和品牌群V1：12个一级主品牌和4个专业品牌的命名、用途与商标检索待办，不要擅自增加新品牌。');
    if(action==='ai-usage') openAI('检查当前品牌的商品、分类、店铺和渠道使用关系是否存在重复、冲突或未关联。');
    if(action==='new') openAI('我要提出一个新品牌。先检查现有品牌池能否承载，确实不能承载时再建立新品牌对象。');
  });
}
export function initBrandCenterPreview(){ render(); bind(); }
