import {
  bindPublicationActions,
  configurePublicationAside,
  publicationBackCover,
  publicationCover,
  publicationCoverSpread,
  publicationPage,
  publicationSpread,
  setPublicationPageMode,
  validatePublicationPages
} from "../components/miwa-publication-master.js?v=20260827-v1.9.37-manual-section-anchor";

const esc=(value)=>String(value??"").replace(/[&<>\"]/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
const iconUrl=new URL("../../assets/icons/miwa/001-work-manual-v1.png",import.meta.url).href;

function manualSectionFromHash(){
  const raw=String(window.location.hash||"");
  const query=raw.includes("?")?raw.slice(raw.indexOf("?")+1):"";
  return new URLSearchParams(query).get("section")||"";
}
function resetSelectionOverviewScroll(){
  const reset=()=>{
    window.scrollTo(0,0);
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
    const main=document.querySelector(".app-main");
    const host=document.getElementById("app-main-host");
    if(main)main.scrollTop=0;
    if(host)host.scrollTop=0;
  };
  reset();
  window.requestAnimationFrame(reset);
}
function scrollToManualSection(){
  const section=manualSectionFromHash();
  if(!section)return;
  window.requestAnimationFrame(()=>{
    const target=document.getElementById(`manual-${section}`);
    if(!target)return;
    target.classList.add("is-manual-target");
    target.scrollIntoView({behavior:"smooth",block:"start"});
    window.setTimeout(()=>target.classList.remove("is-manual-target"),1600);
  });
}
function page2(){return publicationPage({pageNumber:2,section:"第01章｜工作台定位",title:"选品工作台本身就是概览与工作手册",lead:"点击选品工作台首先进入概览，用于理解工作台定位、对象、方法和工作规则；具体业务从左侧二级目录进入。",content:`<div class="miwa-publication-editorial-grid cols-2"><article class="miwa-publication-editorial-card tone-green"><span>PUBLIC</span><h3>商品机会一览</h3><p>公司共享的商品机会池，用于发现、判断、关注和后续推进。</p></article><article class="miwa-publication-editorial-card tone-red"><span>PERSONAL</span><h3>我的选品</h3><p>员工开始选品和继续推进自己选品工作的主要入口。</p></article></div>`,conclusion:"公共机会共享，个人主动参与，正式结果统一沉淀。",bookLabel:"选品工作台",manualSection:"workbench"});}
function page3(){return publicationPage({pageNumber:3,section:"第02章｜商品机会",title:"商品机会是一等业务对象，不只是一行列表数据",lead:"列表做薄，对象做厚。商品机会最终应承载负责人、状态、资料、关联、讨论与结果等完整业务事实。",content:`<div class="miwa-publication-editorial-grid cols-3"><article class="miwa-publication-editorial-card tone-green"><span>01</span><h3>对象</h3><p>每个商品机会拥有唯一身份和完整生命周期。</p></article><article class="miwa-publication-editorial-card tone-red"><span>02</span><h3>协作</h3><p>点赞、关注、评论、转发等能力围绕对象发生，不让正式讨论散落在微信。</p></article><article class="miwa-publication-editorial-card tone-green"><span>03</span><h3>结果</h3><p>后续选品、测样、上架及淘汰都要能够回溯到原始机会。</p></article></div>`,conclusion:"有对象，就在对象下面讨论；讨论形成记录，记录成为公司记忆。",bookLabel:"选品工作台",manualSection:"opportunity"});}
function page4(){return publicationPage({pageNumber:4,section:"第03章｜我的选品",title:"我的选品，是员工开始选品工作的地方",lead:"公司所有成员均可根据自己的时间安排自主选品。页面优先让员工快速开始、查看状态并继续推进。",content:`<div class="miwa-publication-process-grid">${["直发选品","常规选品","批量选品","继续推进","形成判断","沉淀结果"].map((item,index)=>`<span><b>${String(index+1).padStart(2,"0")}</b>${esc(item)}</span>`).join("")}</div>`,conclusion:"二级页面打开就进入工作；少层级、少重复、快进入工作。",bookLabel:"选品工作台",manualSection:"my-selection"});}
function page5(){return publicationPage({pageNumber:5,section:"第04章｜美和业务9要素",title:"9要素负责查漏补缺，不强制规定字段顺序",lead:"美和业务9要素正式为：目标｜人｜物｜事｜渠道｜时间｜钱｜信息｜结果。默认顺序有逻辑，但页面和字段可以按实际场景调整。",content:`<div class="miwa-publication-process-grid">${["目标","人","物","事","渠道","时间","钱","信息","结果"].map((item,index)=>`<span><b>${String(index+1).padStart(2,"0")}</b>${esc(item)}</span>`).join("")}</div>`,conclusion:"9要素决定“有没有漏”，业务场景决定“怎么排”。",bookLabel:"选品工作台",manualSection:"nine-elements"});}
function page6(){return publicationPage({pageNumber:6,section:"第05章｜未来能力",title:"AI选品与产品开发先预留，不抢跑",lead:"当前先把真实商品机会与员工选品跑通。AI选品和产品开发保留入口，待业务验证成熟后再单独冻结。",content:`<div class="miwa-publication-editorial-grid cols-2"><article class="miwa-publication-editorial-card tone-green"><span>AI</span><h3>AI选品</h3><p>未来由美和AI主动发现、分析和推荐商品机会；当前状态：开发中。</p></article><article class="miwa-publication-editorial-card tone-red"><span>DEV</span><h3>产品开发</h3><p>面向打样、定制、OEM／ODM及自有品牌开发；当前状态：开发中。</p></article></div>`,conclusion:"先形成标准，再扩大自动化。",bookLabel:"选品工作台",manualSection:"future"});}
function page7(){return publicationPage({pageNumber:7,section:"第06章｜我的互动",title:"互动围绕对象发生，形成持续协作信号",lead:"“我的互动”用于集中承载员工围绕商品机会发生的点赞、关注、收藏、评论、转发等互动。正式对象能力接入后，这些数据将服务团队协作和AI推荐。",content:`<div class="miwa-publication-editorial-grid cols-2"><article class="miwa-publication-editorial-card tone-green"><span>LIKE</span><h3>点赞</h3><p>表达轻量认可，是团队兴趣和机会热度的重要信号。</p></article><article class="miwa-publication-editorial-card tone-red"><span>FOLLOW</span><h3>关注</h3><p>表达持续跟踪意图，未来可用于对象变化提醒和个性化工作视图。</p></article></div>`,conclusion:"前台保持简单，后台把行为信号保存好。",bookLabel:"选品工作台",manualSection:"following"});}

function bookHtml(){
  const cover=publicationCover({title:"选品工作台",englishTitle:"MIWA SELECTION WORKBENCH",subtitle:"面向美和全体成员的商品机会发现、判断、分析与选品工作标准。",statement:"发现机会 · 判断价值 · 形成依据 · 推进结果",bookLabel:"美和选品工作手册",visualHtml:`<img src="${iconUrl}" alt="工作手册图标">`});
  const back=publicationBackCover({title:"关于《美和选品工作手册》",summary:"本手册用于明确选品工作台的定位、商品机会、我的选品、业务9要素和后续能力边界。",contents:["工作台定位","商品机会","我的选品","业务9要素","AI选品与产品开发","我的互动"],audiences:["公司全体成员","选品负责人","业务负责人","AI与自动化设计者"],bookLabel:"选品工作台",visualHtml:`<img src="${iconUrl}" alt="工作手册图标">`});
  return `<article class="miwa-selection-publication-book miwa-publication-book" data-publication-book="selection-overview">${publicationCoverSpread(cover,back)}${publicationSpread(page2(),page3(),"foundation")}${publicationSpread(page4(),page5(),"work")}${publicationSpread(page6(),page7(),"future")}</article>`;
}

export async function initSelectionOverview(){
  const host=document.getElementById("selection-overview-publication");
  if(!host)return false;
  setPublicationPageMode(true);
  resetSelectionOverviewScroll();
  host.innerHTML=bookHtml();
  bindPublicationActions(host);
  validatePublicationPages(host);
  configurePublicationAside({kicker:"选品概览",title:"选品工作手册",summary:"概览本身就是正式工作手册；按电子出版物结构阅读。",bookTitle:"美和选品工作手册",chapter:"选品概览",version:"V1.0",date:"2026.08"});
  document.title="美和AIONE一体化工作平台｜选品工作台";
  scrollToManualSection();
  return true;
}
