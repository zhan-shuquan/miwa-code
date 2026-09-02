const BRANDS = [
  { id:'BR-MIWA', name:'MIWA', kana:'美和', scope:'企业品牌', role:'企业品牌', status:'使用中', trademark:'待补录', owner:'美和商会株式会社', story:'已有企业资料，待整理为品牌故事 CURRENT', storyStatus:'待整理', usage:'企业与品牌群' },
  { id:'BR-001', name:'WEARONE', kana:'ウェアワン', scope:'服装服饰', role:'一级分类品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社', story:'待完善', storyStatus:'待完善', usage:'服装服饰' },
  { id:'BR-002', name:'SHOEONE', kana:'シューワン', scope:'鞋靴', role:'一级分类品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社', story:'待完善', storyStatus:'待完善', usage:'鞋靴' },
  { id:'BR-003', name:'BAGONE', kana:'バッグワン', scope:'箱包', role:'一级分类品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社', story:'待完善', storyStatus:'待完善', usage:'箱包' },
  { id:'BR-004', name:'ACCEONE', kana:'アクセワン', scope:'帽饰配件', role:'一级分类品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社', story:'待完善', storyStatus:'待完善', usage:'帽饰配件' },
  { id:'BR-005', name:'LIFEONE', kana:'ライフワン', scope:'家居生活', role:'一级分类品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社', story:'待完善', storyStatus:'待完善', usage:'家居生活' },
  { id:'BR-006', name:'KITCHENONE', kana:'キッチンワン', scope:'厨房餐饮', role:'一级分类品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社', story:'待完善', storyStatus:'待完善', usage:'厨房餐饮' },
  { id:'BR-007', name:'CAREONE', kana:'ケアワン', scope:'健康护理', role:'一级分类品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社', story:'待完善', storyStatus:'待完善', usage:'健康护理' },
  { id:'BR-008', name:'BEAUTYONE', kana:'ビューティーワン', scope:'美容个护', role:'一级分类品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社', story:'待完善', storyStatus:'待完善', usage:'美容个护' },
  { id:'BR-009', name:'TECHONE', kana:'テックワン', scope:'数码电器', role:'一级分类品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社', story:'待完善', storyStatus:'待完善', usage:'数码电器' },
  { id:'BR-010', name:'TRAVELONE', kana:'トラベルワン', scope:'户外旅行', role:'一级分类品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社', story:'待完善', storyStatus:'待完善', usage:'户外旅行' },
  { id:'BR-011', name:'PETONE', kana:'ペットワン', scope:'宠物用品', role:'一级分类品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社', story:'待完善', storyStatus:'待完善', usage:'宠物用品' },
  { id:'BR-012', name:'GIFTONE', kana:'ギフトワン', scope:'文具礼品', role:'一级分类品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社', story:'待完善', storyStatus:'待完善', usage:'文具礼品' },
  { id:'BR-101', name:'SOCKONE', kana:'ソックワン', scope:'袜类', role:'特色品牌', status:'使用中', trademark:'申请准备中', owner:'美和商会株式会社', story:'已有品牌基本台账，待迁移并锁定为 AIONE 品牌故事', storyStatus:'资料待迁移', usage:'袜类' },
  { id:'BR-102', name:'HATORIA', kana:'ハトリア', scope:'帽类', role:'特色品牌', status:'使用中', trademark:'待确认', owner:'美和商会株式会社', story:'已有品牌理念与视觉方向，待整理为标准品牌故事页', storyStatus:'待整理', usage:'帽类 / 外出配件' },
  { id:'BR-103', name:'TIDYONE', kana:'タイディワン', scope:'收纳整理', role:'特色品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社', story:'待完善', storyStatus:'待完善', usage:'收纳整理' },
  { id:'BR-104', name:'SUMAHONE', kana:'スマホワン', scope:'手机周边', role:'特色品牌', status:'规划锁定', trademark:'待检索', owner:'美和商会株式会社', story:'待完善', storyStatus:'待完善', usage:'手机周边' },
  { id:'BR-105', name:'ぺたまる', kana:'ぺたまる', scope:'特色商品方向', role:'特色品牌', status:'使用准备', trademark:'申请中', owner:'美和商会株式会社', story:'待从现有申请与业务资料整理', storyStatus:'待整理', usage:'待补充' },
  { id:'BR-201', name:'HAPPYHOUSE', kana:'ハッピーハウス', scope:'幸せ屋店铺品牌', role:'店铺品牌', status:'使用中', trademark:'申请中', owner:'美和商会株式会社', story:'待从店铺历史与品牌资料整理', storyStatus:'待整理', usage:'幸せ屋 / Rakuten' },
  { id:'BR-202', name:'PrimeLife', kana:'プライムライフ', scope:'PrimeLife店铺品牌', role:'店铺品牌', status:'使用中', trademark:'申请中', owner:'美和商会株式会社', story:'待从店铺历史与品牌资料整理', storyStatus:'待整理', usage:'PrimeLife / Rakuten' }
];

const state = {
  view:'brands',
  group:'全部',
  selected:'BR-101',
  brandMode:'grid',
  detailTab:'home',
  registrationBrand:null,
  registrationStep:1
};

const JPLATPAT_URL='https://www.j-platpat.inpit.go.jp/';
const SAKUTTO_URL='https://sakutto.pcinfo.jpo.go.jp/';
const ROLE_ORDER=['企业品牌','一级分类品牌','特色品牌','店铺品牌'];

function currentBrand(){ return BRANDS.find((item)=>item.id===state.selected) || BRANDS[0]; }
function registrationBrand(){ return BRANDS.find((item)=>item.id===state.registrationBrand) || null; }
function escapeHtml(value){ return String(value ?? '').replace(/[&<>\"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c])); }

function pageHeader(){
  return `<header class="brand-page-header">
    <div><span>商品之家 · 第02章</span><h1>品牌中心</h1><p>管理美和品牌的身份、故事、商标、视觉、资料与实际使用。品牌事实只维护一份，品牌故事与商标申请作为标准能力持续复用。</p></div>
    <div class="brand-page-actions"><button type="button" data-brand-action="ai" class="brand-btn brand-btn--ai">✦ 商品之家AI秘书</button><button type="button" class="brand-btn brand-btn--primary" data-brand-action="new">＋ 新建品牌</button></div>
  </header>`;
}

function tabs(){
  const items=[['overview','概览'],['brands','美和品牌'],['registration','品牌注册']];
  return `<nav class="brand-tabs">${items.map(([id,label])=>`<button type="button" data-brand-view="${id}" class="${state.view===id?'is-active':''}">${label}</button>`).join('')}</nav>`;
}

function chip(label,value){ return `<span class="brand-chip brand-chip--${value==='申请中'?'blue':value==='使用中'?'green':value==='待检索'?'amber':'neutral'}">${escapeHtml(label)}</span>`; }

function portfolioStats(){
  const applying=BRANDS.filter(x=>x.trademark==='申请中').length;
  const waiting=BRANDS.filter(x=>x.trademark==='待检索').length;
  return `<section class="brand-stat-strip">
    <div><span>美和品牌</span><strong>${BRANDS.length}</strong><small>当前 Brand Master</small></div>
    <div><span>一级分类品牌</span><strong>${BRANDS.filter(x=>x.role==='一级分类品牌').length}</strong><small>12大类品牌骨架</small></div>
    <div><span>特色品牌</span><strong>${BRANDS.filter(x=>x.role==='特色品牌').length}</strong><small>重点经营方向</small></div>
    <div><span>商标推进</span><strong>${applying + waiting}</strong><small>${applying}申请中 · ${waiting}待检索</small></div>
  </section>`;
}

function brandCard(item,compact=false){
  return `<article class="brand-card ${compact?'is-compact':''}" data-brand-id="${item.id}">
    <div class="brand-wordmark">${escapeHtml(item.name)}</div>
    <div class="brand-card__top"><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.kana)}</p></div>${chip(item.role,item.role)}</div>
    <div class="brand-card__meta"><span>${escapeHtml(item.scope)}</span><span>·</span><span>${escapeHtml(item.trademark)}</span></div>
    <div class="brand-card__footer">${chip(item.status,item.status)}<span>故事：${escapeHtml(item.storyStatus)}</span><b>打开 →</b></div>
  </article>`;
}

function brandGroupNav(){
  const items=['全部',...ROLE_ORDER];
  return `<div class="brand-filter-row">${items.map(x=>`<button type="button" data-brand-group="${x}" class="${state.group===x?'is-active':''}">${x}${x==='全部'?` <em>${BRANDS.length}</em>`:` <em>${BRANDS.filter(b=>b.role===x).length}</em>`}</button>`).join('')}</div>`;
}

function brandGridView(){
  const roles=state.group==='全部'?ROLE_ORDER:[state.group];
  return `<div class="brand-view">${portfolioStats()}<section class="brand-portfolio">
    <header class="brand-section-head"><div><span>MIWA BRAND PORTFOLIO</span><h2>美和品牌群</h2><p>“一级分类品牌 / 特色品牌 / 店铺品牌”是品牌角色，不是父子层级。品牌规划状态直接显示在 Brand 对象上。</p></div><button class="brand-btn" data-brand-action="ai-portfolio">✦ AI检查品牌群</button></header>
    <div class="brand-portfolio-body">${brandGroupNav()}${roles.map(role=>{
      const list=BRANDS.filter(x=>x.role===role); if(!list.length) return '';
      return `<section class="brand-role-section"><div class="brand-role-title"><div><span>${role}</span><strong>${list.length}</strong></div><small>${role==='一级分类品牌'?'对应12个一级商品分类':role==='特色品牌'?'重点商品方向与独立品牌策略':role==='店铺品牌'?'长期对外形成消费者识别的店铺品牌':'美和企业品牌本身'}</small></div><div class="brand-grid">${list.map(x=>brandCard(x)).join('')}</div></section>`;
    }).join('')}</div>
  </section></div>`;
}

function detailNav(){
  const items=[['home','品牌主页'],['story','品牌故事'],['rights','商标与权利'],['usage','品牌使用']];
  return `<nav class="brand-detail-nav">${items.map(([id,label])=>`<button type="button" data-detail-tab="${id}" class="${state.detailTab===id?'is-active':''}">${label}</button>`).join('')}</nav>`;
}

function brandHero(brand){
  return `<section class="brand-object-hero"><div class="brand-object-title"><button class="brand-back" data-brand-action="back-brands">← 美和品牌</button><span>${brand.id}</span><h2>${escapeHtml(brand.name)}</h2><p>${escapeHtml(brand.kana)} · ${escapeHtml(brand.scope)}</p><div class="brand-object-chips">${chip('美和品牌','美和品牌')}${chip(brand.role,brand.role)}${chip(brand.status,brand.status)}${chip(brand.trademark,brand.trademark)}</div></div><div class="brand-object-mark">${escapeHtml(brand.name)}</div><div class="brand-object-actions"><button class="brand-btn" data-brand-ai-prompt="检查 ${brand.name} 的品牌资料完整度、品牌故事、商标和使用关系。">✦ AI检查</button><button class="brand-btn brand-btn--primary" data-brand-action="register-current">商标注册</button></div></section>`;
}

function brandHomeView(brand){
  return `<div class="brand-object-grid">
    <section class="object-card object-card--wide"><header><span>Brand Identity</span><h3>品牌基本信息</h3></header><div class="fact-grid"><div><small>品牌名称</small><strong>${brand.name}</strong></div><div><small>日文名称</small><strong>${brand.kana}</strong></div><div><small>品牌角色</small><strong>${brand.role}</strong></div><div><small>主要使用范围</small><strong>${brand.scope}</strong></div><div><small>品牌所有者</small><strong>${brand.owner}</strong></div><div><small>商标状态</small><strong>${brand.trademark}</strong></div></div></section>
    <section class="object-card object-card--story"><header><span>Brand Story</span><h3>品牌故事</h3></header><p class="story-preview">${escapeHtml(brand.story)}</p><div class="story-keywords"><span>为什么存在</span><span>品牌定位</span><span>目标顾客</span><span>核心价值</span><span>品牌语言</span></div><button data-detail-tab="story">打开标准品牌故事页 →</button></section>
    <section class="object-card"><header><span>Trademark</span><h3>商标与权利</h3></header><div class="object-status"><b>${escapeHtml(brand.trademark)}</b><small>日本 · 英文文字商标第一期</small></div><button data-brand-action="register-current">继续商标注册 →</button></section>
    <section class="object-card"><header><span>Brand Usage</span><h3>品牌使用</h3></header><div class="usage-mini"><div><b>商品</b><span>待接真实数据</span></div><div><b>范围</b><span>${escapeHtml(brand.usage)}</span></div><div><b>店铺</b><span>待关联</span></div><div><b>渠道</b><span>待关联</span></div></div><button data-detail-tab="usage">查看使用关系 →</button></section>
  </div>`;
}

function brandStoryView(brand){
  const known=brand.storyStatus!=='待完善';
  return `<article class="brand-story-page">
    <section class="story-hero"><span>BRAND STORY</span><div class="story-wordmark">${escapeHtml(brand.name)}</div><h2>${known?escapeHtml(brand.story):'品牌故事待建立'}</h2><p>标准 Brand Story Page：一份正式内容，多处调用到商品详情、店铺、包装、官网、批发资料与美和AI。</p><div><button class="brand-btn brand-btn--ai" data-brand-ai-prompt="根据 ${brand.name} 当前真实品牌资料，整理品牌故事草案。严格区分已有事实和待确认内容。">✦ AI整理品牌故事</button><button class="brand-btn">编辑内容</button></div></section>
    <div class="story-sections">
      <section><span>01</span><div><h3>为什么创立</h3><p>${known?'从现有正式资料迁移品牌起源、真实业务背景与创建原因。':'待补充：品牌为什么存在、源自什么真实业务问题。'}</p></div></section>
      <section><span>02</span><div><h3>品牌定位</h3><p>待锁定：品牌服务的市场位置、商品方向，以及与美和其他品牌的差异。</p></div></section>
      <section><span>03</span><div><h3>目标顾客</h3><p>待锁定：主要顾客、使用场景与核心需求。</p></div></section>
      <section><span>04</span><div><h3>核心价值</h3><p>待锁定：希望消费者长期记住的价值、体验和承诺。</p></div></section>
      <section><span>05</span><div><h3>品牌理念与关键词</h3><p>Mission / Vision / Values、关键词与品牌个性只记录已确认内容，不为形式完整而编造。</p></div></section>
      <section><span>06</span><div><h3>品牌语言</h3><p>定义商品文案、广告、包装与AI生成内容需要遵循的语气、禁用表达与长期术语。</p></div></section>
      <section><span>07</span><div><h3>品牌发展</h3><p>记录创建、首个商品、商标申请、视觉锁定和重要经营里程碑。</p></div></section>
    </div>
  </article>`;
}

function brandRightsView(brand){
  return `<div class="brand-object-grid"><section class="object-card object-card--wide"><header><span>Trademark & Rights</span><h3>${brand.name} 商标与权利</h3></header><div class="rights-summary"><div><small>申请主体</small><strong>${brand.owner}</strong></div><div><small>第一期形式</small><strong>英文文字商标</strong></div><div><small>申请地区</small><strong>日本</strong></div><div><small>当前状态</small><strong>${brand.trademark}</strong></div></div><div class="rights-actions"><button class="brand-btn brand-btn--primary" data-brand-action="register-current">进入商标注册流程</button><button class="brand-btn" data-brand-action="jplatpat">打开 J-PlatPat ↗</button></div></section><section class="object-card object-card--wide"><header><span>Evidence</span><h3>申请资料与证据</h3></header><p class="muted-copy">正式接入后统一关联申请资料、近似检索证据、申请号、官方通知、期限与状态历史；不在品牌页面复制文件。</p></section></div>`;
}

function brandUsageView(brand){
  return `<section class="brand-usage-google"><header><span>BRAND USAGE</span><h3>${brand.name} 在哪里使用</h3><p>不做单调总表；按对象关系进入商品、范围、店铺、渠道和资料。</p></header><div class="usage-card-grid">
    <button><span class="usage-icon">商</span><div><b>商品</b><small>关联使用该品牌的商品</small><em>待接真实数据 →</em></div></button>
    <button><span class="usage-icon">类</span><div><b>商品范围</b><small>${escapeHtml(brand.usage)}</small><em>查看关联范围 →</em></div></button>
    <button><span class="usage-icon">店</span><div><b>店铺</b><small>品牌在哪些店铺实际使用</small><em>待接 Store 关系 →</em></div></button>
    <button><span class="usage-icon">渠</span><div><b>渠道</b><small>Rakuten / Amazon / 批发等</small><em>待接 Channel 关系 →</em></div></button>
    <button><span class="usage-icon">资</span><div><b>品牌资料</b><small>商品页品牌区、包装、宣传资料</small><em>进入资料关系 →</em></div></button>
    <button><span class="usage-icon">视</span><div><b>品牌视觉</b><small>文字标识、Logo、色彩与AI视觉资产</small><em>进入视觉资产 →</em></div></button>
  </div></section>`;
}

function brandDetailView(){
  const brand=currentBrand();
  const body=state.detailTab==='story'?brandStoryView(brand):state.detailTab==='rights'?brandRightsView(brand):state.detailTab==='usage'?brandUsageView(brand):brandHomeView(brand);
  return `<div class="brand-detail">${brandHero(brand)}${detailNav()}<div class="brand-detail-body">${body}</div></div>`;
}

function brandsView(){ return state.brandMode==='detail'?brandDetailView():brandGridView(); }

function overviewView(){
  const applying=BRANDS.filter(x=>x.trademark==='申请中');
  const needsStory=BRANDS.filter(x=>['待完善','待整理','资料待迁移'].includes(x.storyStatus));
  return `<div class="brand-overview">
    <section class="overview-hero"><div><span>BRAND CENTER</span><h2>美和品牌资产，一处管理。</h2><p>先看品牌群，再推进商标注册；进入单个 Brand 后管理品牌故事、商标、视觉、资料与实际使用。</p><div><button class="brand-btn brand-btn--primary" data-brand-view-link="brands">打开美和品牌</button><button class="brand-btn" data-brand-view-link="registration">进入品牌注册</button></div></div><div class="overview-mark">MIWA<br><small>BRAND SYSTEM</small></div></section>
    ${portfolioStats()}
    <div class="overview-grid">
      <section class="overview-card"><header><span>品牌群结构</span><b>20</b></header><div class="overview-list">${ROLE_ORDER.map(role=>`<div><span>${role}</span><strong>${BRANDS.filter(x=>x.role===role).length}</strong></div>`).join('')}</div><button data-brand-view-link="brands">查看品牌群 →</button></section>
      <section class="overview-card"><header><span>商标注册推进</span><b>${applying.length}</b></header><p>当前明确处于申请中的品牌</p><div class="overview-brand-chips">${applying.map(x=>`<span>${x.name}</span>`).join('')}</div><button data-brand-view-link="registration">继续申请工作 →</button></section>
      <section class="overview-card"><header><span>品牌内容</span><b>${needsStory.length}</b></header><p>品牌故事或正式内容仍需整理。Brand Story Page 已作为统一标准页。</p><button data-brand-action="ai-story-audit">✦ AI检查品牌故事缺口 →</button></section>
      <section class="overview-card overview-card--accent"><header><span>当前规则</span><b>V1</b></header><p>12个一级分类品牌 + 5个特色品牌 + 企业品牌 + 2个店铺品牌。新增品牌优先检查现有品牌是否可以承载。</p></section>
    </div>
  </div>`;
}

const REG_STEPS=[
  ['选择品牌','从美和品牌群选择本次申请对象'],
  ['确认申请主体','确认申请主体与基础申请人事实'],
  ['确认英文文字商标','第一期只申请英文文字商标'],
  ['选择日本申请','第一期国家 / 地区固定日本'],
  ['指定商品 / 服务','根据真实经营范围准备指定商品候选'],
  ['近似商标检索','AI准备条件 + J-PlatPat 官方检索'],
  ['生成申请资料','汇总自动继承事实与待确认资料'],
  ['人工确认','负责人确认后才允许进入官方提交'],
  ['官方提交','快捷打开日本官方申请工具'],
  ['登记并跟踪状态','保存申请号、状态、通知和期限']
];

function registrationStepper(){
  return `<aside class="registration-stepper"><div class="registration-progress"><span>商标申请流程</span><b>${String(state.registrationStep).padStart(2,'0')} / 10</b><div><i style="width:${state.registrationStep*10}%"></i></div></div>${REG_STEPS.map((step,i)=>{
    const n=i+1, status=n<state.registrationStep?'is-done':n===state.registrationStep?'is-active':'';
    return `<button type="button" data-registration-step="${n}" class="${status}"><span>${n<state.registrationStep?'✓':String(n).padStart(2,'0')}</span><div><b>${step[0]}</b><small>${step[1]}</small></div></button>`;
  }).join('')}</aside>`;
}

function registrationBrandChooser(){
  return `<div class="registration-brand-chooser"><div class="registration-panel-title"><span>STEP 01</span><h3>选择申请品牌</h3><p>直接复用“美和品牌群”中的 Brand 对象，不重新创建品牌资料。</p></div>${ROLE_ORDER.map(role=>`<section><header><b>${role}</b><small>${BRANDS.filter(x=>x.role===role).length}</small></header><div class="registration-brand-grid">${BRANDS.filter(x=>x.role===role).map(x=>`<button type="button" data-registration-brand="${x.id}"><strong>${x.name}</strong><span>${x.kana}</span><small>${x.scope}</small><em>${x.trademark}</em></button>`).join('')}</div></section>`).join('')}</div>`;
}

function registrationStepContent(){
  const brand=registrationBrand();
  if(state.registrationStep===1 || !brand) return registrationBrandChooser();
  const n=state.registrationStep;
  const step=REG_STEPS[n-1];
  const common=`<div class="registration-selected-brand"><div><span>本次申请品牌</span><strong>${brand.name}</strong><small>${brand.kana} · ${brand.role} · ${brand.scope}</small></div><button data-registration-step="1">更换品牌</button></div>`;
  let body='';
  if(n===2) body=`<div class="step-fact-grid"><div><small>申请主体</small><strong>${brand.owner}</strong></div><div><small>资料来源</small><strong>企业主体资料</strong></div></div><div class="step-callout">系统应自动继承企业主体信息；员工只确认，不重复填写。</div>`;
  if(n===3) body=`<div class="step-choice is-selected"><span>ABC</span><div><b>英文文字商标</b><small>${brand.name}</small></div><em>第一期锁定</em></div><div class="step-callout">第一期不要求 Logo。英文品牌名同时作为统一基础品牌视觉。</div>`;
  if(n===4) body=`<div class="step-choice is-selected"><span>JP</span><div><b>日本</b><small>Japan Patent Office</small></div><em>第一期锁定</em></div>`;
  if(n===5) body=`<div class="step-context"><span>当前预定使用范围</span><strong>${brand.scope}</strong><p>这里未来读取商品事实与经营范围，AI只辅助生成“指定商品 / 服务”候选，最终由人工确认。</p><button data-brand-ai-prompt="根据 ${brand.name} 的真实使用范围 ${brand.scope}，准备日本英文文字商标申请的指定商品/服务候选。不要编造未确认业务。">✦ AI准备指定商品候选</button></div>`;
  if(n===6) body=`<div class="search-workspace"><div><span>检索对象</span><strong>${brand.name}</strong><small>称呼候选：${brand.kana}</small></div><div class="search-actions"><button data-brand-ai-prompt="为 ${brand.name} 准备 J-PlatPat 近似商标检索条件，包括英文精确名称、日文称呼与需要结合的指定商品范围。">✦ AI准备检索条件</button><button data-brand-action="jplatpat" class="is-primary">打开 J-PlatPat ↗</button></div><div class="search-result"><span>检索结果记录</span><b>待检索</b><small>正式版保存检索日期、负责人、结论、证据链接 / 截图。</small></div></div>`;
  if(n===7) body=`<div class="document-checklist"><div>✓ 品牌名称 <b>${brand.name}</b></div><div>✓ 申请主体 <b>${brand.owner}</b></div><div>✓ 商标形式 <b>英文文字</b></div><div>✓ 国家 / 地区 <b>日本</b></div><div>○ 指定商品 / 服务 <b>待确认</b></div><div>○ 近似检索证据 <b>待完成</b></div></div><button class="brand-btn brand-btn--ai" data-brand-ai-prompt="为 ${brand.name} 生成商标申请资料清单，区分自动继承、待人工确认、官方提交三部分。">✦ AI生成申请资料清单</button>`;
  if(n===8) body=`<div class="approval-card"><span>负责人确认</span><h4>申请前最终检查</h4><p>名称、主体、指定商品、检索结果和申请资料全部确认后，才进入官方提交。</p><button class="brand-btn brand-btn--primary" data-registration-step="9">确认可提交</button></div>`;
  if(n===9) body=`<div class="official-submit"><span>OFFICIAL SUBMISSION</span><h4>资料确认后进入日本官方申请</h4><p>AIONE负责准备、校验与留痕；官方系统负责正式提交。</p><button data-brand-action="sakutto">打开官方申请工具 ↗</button></div>`;
  if(n===10) body=`<div class="tracking-card"><div><small>品牌</small><strong>${brand.name}</strong></div><div><small>当前AIONE状态</small><strong>${brand.trademark}</strong></div><div><small>申请号</small><strong>待登记</strong></div><div><small>下一期限</small><strong>待登记</strong></div></div><div class="step-callout">正式版通过申请记录对象持续跟踪审查状态、通知、补正、注册与续展。</div>`;
  return `${common}<div class="registration-panel-title"><span>STEP ${String(n).padStart(2,'0')}</span><h3>${step[0]}</h3><p>${step[1]}</p></div>${body}<div class="step-footer">${n>1?`<button data-registration-step="${n-1}">← 上一步</button>`:''}${n<10?`<button class="is-primary" data-registration-step="${n+1}">下一步 →</button>`:''}</div>`;
}

function registrationView(){
  return `<section class="brand-registration-google"><header class="brand-section-head"><div><span>TRADEMARK REGISTRATION</span><h2>品牌注册</h2><p>第一期跑通“日本 × 英文文字商标”真实闭环。左侧是连续流程，右侧只处理当前一步。</p></div><div><button class="brand-btn" data-brand-action="jplatpat">J-PlatPat ↗</button><button class="brand-btn" data-brand-action="sakutto">官方申请工具 ↗</button></div></header><div class="registration-google-layout">${registrationStepper()}<main class="registration-current-step">${registrationStepContent()}</main></div></section>`;
}

function render(){
  const host=document.getElementById('app-main-host'); if(!host) return;
  document.body.dataset.brandCenterPreview='true';
  const view=state.view==='overview'?overviewView():state.view==='registration'?registrationView():brandsView();
  host.innerHTML=`<section class="brand-center-preview">${pageHeader()}${tabs()}<div class="brand-view-host">${view}</div></section>`;
}

function openAI(prompt=''){ window.MIWAAI?.open?.('product-home-brand-center'); setTimeout(()=>{const input=document.getElementById('ai-secretary-command-input'); if(!input)return; if(prompt)input.value=prompt; input.focus();},80); }
function openExternal(url){ window.open(url,'_blank','noopener,noreferrer'); }
function openBrand(id){ state.selected=id; state.brandMode='detail'; state.detailTab='home'; state.view='brands'; render(); }
function registerCurrent(){ const brand=currentBrand(); state.registrationBrand=brand.id; state.registrationStep=2; state.view='registration'; render(); }

function bind(){
  const host=document.getElementById('app-main-host'); if(!host || host.dataset.brandCenterBound==='true') return; host.dataset.brandCenterBound='true';
  host.addEventListener('click',(event)=>{
    const tab=event.target.closest('[data-brand-view]'); if(tab){ state.view=tab.dataset.brandView; if(state.view==='brands')state.brandMode='grid'; if(state.view==='registration'){state.registrationBrand=null;state.registrationStep=1;} render(); return; }
    const viewLink=event.target.closest('[data-brand-view-link]'); if(viewLink){state.view=viewLink.dataset.brandViewLink;if(state.view==='brands')state.brandMode='grid';if(state.view==='registration'){state.registrationBrand=null;state.registrationStep=1;}render();return;}
    const group=event.target.closest('[data-brand-group]'); if(group){state.group=group.dataset.brandGroup;render();return;}
    const detailTab=event.target.closest('[data-detail-tab]'); if(detailTab){state.detailTab=detailTab.dataset.detailTab;render();return;}
    const regBrand=event.target.closest('[data-registration-brand]'); if(regBrand){state.registrationBrand=regBrand.dataset.registrationBrand;state.selected=regBrand.dataset.registrationBrand;state.registrationStep=2;render();return;}
    const regStep=event.target.closest('[data-registration-step]'); if(regStep){state.registrationStep=Number(regStep.dataset.registrationStep)||1;render();return;}
    const prompt=event.target.closest('[data-brand-ai-prompt]'); if(prompt){openAI(prompt.dataset.brandAiPrompt);return;}
    const card=event.target.closest('.brand-card[data-brand-id]'); if(card){openBrand(card.dataset.brandId);return;}
    const action=event.target.closest('[data-brand-action]')?.dataset.brandAction;
    if(action==='back-brands'){state.brandMode='grid';render();return;}
    if(action==='register-current'){registerCurrent();return;}
    if(action==='jplatpat'){openExternal(JPLATPAT_URL);return;}
    if(action==='sakutto'){openExternal(SAKUTTO_URL);return;}
    if(action==='ai') openAI('作为商品之家AI秘书，请检查品牌中心的品牌事实、品牌故事、商标注册与使用关系缺口。');
    if(action==='ai-portfolio') openAI('检查美和品牌群：企业品牌、12个一级分类品牌、特色品牌和店铺品牌的当前状态与待办，不要擅自新增品牌。');
    if(action==='ai-story-audit') openAI('检查所有美和品牌的品牌故事完整度，区分已有正式资料、待迁移资料和待创建内容。');
    if(action==='new') openAI('我要提出一个新品牌。先检查现有美和品牌是否可以承载，确实不能承载时再建立新 Brand 对象。');
  });
}

export function initBrandCenterPreview(){ render(); bind(); }
