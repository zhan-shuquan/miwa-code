import { aioneApi } from "../services/aione-api-client.js";
import { getCollaborationData } from "../data/collaboration-store.js";
import { announceWorkItemsChanged, computeWorkAttention } from "../services/work-attention-service.js?v=20260826-v1.9.30.2-work-attention";
import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260824-v1.9.5-sidebar-aside-lock-candidate";
import { MIWA_BUSINESSES } from "../data/miwa-business-home-content.js";
import { PREVIEW_IDENTITIES } from "../config/preview-identities.js";
import {
  bindPublicationActions,
  configurePublicationAside,
  publicationBackCover,
  publicationCover,
  publicationCoverSpread,
  publicationPage,
  publicationSingle,
  publicationSpread,
  setPublicationPageMode,
  validatePublicationPages
} from "../components/miwa-publication-master.js?v=20260827-v1.9.37-manual-section-anchor";

// V1.9.33 legacy publication chapter token: 第08章｜当前工作动态
// V1.9.34 legacy handbook tokens: 第11章 事业工作怎么用｜第12章 等待与阻塞怎么用｜第13章 待验收怎么用｜第14章 工作记录怎么用
// V1.9.32 legacy principle token: 后台复杂，前台简单
/* Work Home V2.0 Real-use Validation Baseline | V1.9.39
   原则：Work Item保持唯一事实；工作之家先进入真实运行验证，不因“锁定”阻止高价值发现。
   Sidebar只保留章节；创建工作回到“我的工作”Main；工作记录保存事实，工作总结只作为少数有价值工作的可选成果层。 */
const STATUS_LABELS=Object.freeze({draft:"待整理",pending:"待开始",in_progress:"执行中",active:"执行中",blocked:"异常处理",waiting:"待验收",completed:"已闭环",done:"已闭环",cancelled:"已取消",archived:"已归档"});
const PRIORITY_LABELS=Object.freeze({low:"低",normal:"普通",high:"重要",important:"重要",urgent:"紧急"});
const STATUS_FILTERS=[["all","全部"],["pending","待开始"],["in_progress","进行中"],["hold","等待中"],["blocked","异常处理"],["waiting","待验收"],["completed","已完成"]];
const PRIORITY_FILTERS=[["all","全部优先级"],["urgent","紧急"],["high","重要"],["normal","普通"],["low","低"]];
const SORT_OPTIONS=[["ai","美和AI建议优先"],["priority","优先级高→低"],["due","截止时间近→远"],["updated","最近更新"],["created","最近创建"]];
const WORK_PAGE_SIZE=12;
const TIME_FILTERS=[["all","全部时间"],["today","今日"],["week","本周"],["month","本月"],["year","本年"],["custom","自定义"]];
const TIME_BASIS_FILTERS=[["relevant","关联时间"],["due","截止时间"],["updated","更新时间"],["created","创建时间"],["completed","闭环时间"]];
const MONEY_FILTERS=[["all","全部金额"],["has","涉及金额"],["none","无金额"]];
const SUMMARY_FILTERS=[["all","全部总结"],["has","有总结"],["none","无总结"],["team","团队推广"],["group","集团推广"]];
const RELATED_WORK_ENDPOINT="/api/v1/work-home?limit=200"; // 相关工作口径：我的工作、我的总结等个人视图共用。
const ALL_WORK_ENDPOINT="/api/v1/work-home?scope=all&limit=500";
const FOLLOWING_WORK_ENDPOINT="/api/v1/work-home?scope=following&limit=500";
const LIKED_WORK_ENDPOINT="/api/v1/work-home?scope=liked&limit=500";
const BUSINESS_BY_ID=Object.freeze(Object.fromEntries(MIWA_BUSINESSES.map((item)=>[item.id,item])));
const BUSINESS_ROUTE_MAP=Object.freeze(Object.fromEntries(MIWA_BUSINESSES.map((item)=>[`work-business-${item.id}`,item.id])));
const CROSSBORDER_WORKBENCHES=new Set(["selection","sampling","procurement","design","publishing","operations","orders","inventory","service"]);
const ROUTE_TITLES=Object.freeze({
  work:"工作概览","work-mine":"我的工作","work-assigned":"我安排的","work-batch":"批量安排工作","work-today":"我的工作","work-all":"全部工作","work-following":"我的关注",
  "work-suggestions":"我的建议","work-innovations":"我的创新","work-summaries":"我的总结","work-business-more":"更多事业","work-team":"团队工作",
  "work-waiting":"等待中","work-blocked":"异常处理","work-review":"待验收","work-records":"工作记录",
  "work-pending":"待开始","work-active":"进行中","work-completed":"工作记录",
  ...Object.fromEntries(MIWA_BUSINESSES.map((item)=>[`work-business-${item.id}`,`${item.name}工作`]))
});
const ROUTE_SUBTITLES=Object.freeze({
  work:"理解工作之家为什么存在、怎样运行以及每个章节怎么使用。",
  "work-mine":"从过去未完、当前应办到未来安排，连续管理当前用户自己的工作。",
  "work-assigned":"查看由当前用户安排给他人的工作；与负责人的“我的工作”读取同一个工作编号。",
  "work-batch":"导入极简工作种子，由美和AI补全为待确认方案，再由管理者批量批准并派发。",
  "work-today":"兼容旧入口：已统一进入“我的工作”连续工作视角。",
  "work-all":"查看当前可见的全部工作，快速搜索、筛选和处理。",
  "work-following":"集中查看你主动关注的重要对象；当前工作事项已接入统一关注能力。",
  "work-suggestions":"记录和跟踪我提出的业务改善建议。",
  "work-innovations":"记录和跟踪值得验证的新方法、新产品、新模式或新能力。",
  "work-summaries":"只查看本人主动形成并确认的有价值工作总结；普通工作不强制总结。",
  "work-business-more":"查看其他事业工作，按需进入最关心的经营现场。",
  "work-team":"从团队和成员视角浏览同一份真实Work Item，不建立第二套工作数据。",
  "work-waiting":"查看正常等待外部结果、回复或下一检查时间的工作。",
  "work-blocked":"集中处理真正阻止工作继续推进的问题和异常。",
  "work-review":"确认已经提交结果的工作是否达到闭环标准。",
  "work-records":"按时间回看所有闭环工作的真实事实；有总结的记录同时关联总结资料。"
});
const MANUAL_SECTION_MAP=Object.freeze({
  "work-mine":"work-mine","work-today":"work-mine","work-all":"work-all","work-following":"work-following",
  "work-suggestions":"work-contributions","work-innovations":"work-contributions","work-summaries":"work-records",
  "work-business-more":"work-business","work-team":"work-team","work-waiting":"work-waiting",
  "work-blocked":"work-blocked","work-review":"work-review","work-records":"work-records"
});
const TOPIC_MARKS=Object.freeze({
  work:"工","work-mine":"工","work-today":"工","work-all":"工","work-following":"注",
  "work-suggestions":"议","work-innovations":"创","work-summaries":"总","work-team":"团","work-records":"录"
});

function esc(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function routeId(){return String(window.location.hash||"#/work").replace(/^#\/?/,"").split(/[/?]/)[0]||"work";}
function routeSubtitle(id=routeId()){if(BUSINESS_ROUTE_MAP[id])return `按${BUSINESS_BY_ID[BUSINESS_ROUTE_MAP[id]]?.name||"当前事业"}快速查看工作进展，进入当前最关心的经营现场。`;return ROUTE_SUBTITLES[id]||"从当前工作意图出发，快速进入同一份真实工作事项。";}
function topicMark(id=routeId()){if(BUSINESS_ROUTE_MAP[id])return "事";return TOPIC_MARKS[id]||"工";}
function manualSectionForRoute(id=routeId()){if(BUSINESS_ROUTE_MAP[id])return "work-business";return MANUAL_SECTION_MAP[id]||"work-overview";}
function manualHref(id=routeId()){return `#/work?section=${encodeURIComponent(manualSectionForRoute(id))}`;}
function manualSectionFromHash(){const raw=String(window.location.hash||"");const query=raw.includes("?")?raw.slice(raw.indexOf("?")+1):"";return new URLSearchParams(query).get("section")||"";}
function scrollToManualSection(){const section=manualSectionFromHash();if(!section)return;window.requestAnimationFrame(()=>{const target=document.getElementById(`manual-${section}`);if(!target)return;target.classList.add("is-manual-target");target.scrollIntoView({behavior:"smooth",block:"start"});window.setTimeout(()=>target.classList.remove("is-manual-target"),1800);});}
function identity(){return window.AIONEPreviewIdentity||{};}
function dateObject(v){if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d;}
function dateText(v){const d=dateObject(v);return d?d.toLocaleString("zh-CN",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}):"—";}
function dayKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function statusLabel(v){return STATUS_LABELS[String(v||"").toLowerCase()]||v||"待确认";}
function priorityLabel(v){return PRIORITY_LABELS[String(v||"").toLowerCase()]||v||"普通";}
function sourceLabel(item){if(item.sourceSystem==="aione-ai-secretary"||item.metadata?.aiProposalId)return "美和AI";if(item.sourceSystem==="aione-web")return "AIONE";return item.sourceSystem||"AIONE";}
function personName(personId,fallback=""){const id=String(personId||"");return PREVIEW_IDENTITIES.find((person)=>String(person.subjectId)===id)?.displayName||fallback||id||"待确认";}
function responsiblePersonId(item){return String(item.responsiblePersonId||item.ownerPersonId||"");}
function ownerLabel(item){return personName(responsiblePersonId(item),item.responsiblePersonName||item.ownerName);}
function sourceHref(item){const v=item.metadata?.sourceHash||"";return String(v).startsWith("#/")?v:"";}
function isCompleted(item){return ["completed","done","cancelled","archived"].includes(String(item.status||"").toLowerCase());}
function isOverdue(item){const d=dateObject(item.dueAt);return Boolean(!isCompleted(item)&&d&&d.getTime()<Date.now());}
function isDueToday(item){const d=dateObject(item.dueAt);return Boolean(d&&dayKey(d)===dayKey(new Date()));}
function hasWaitingSignal(item){return Boolean(item.metadata?.waitingReason||item.metadata?.nextReviewAt||item.metadata?.executionState==="waiting");}
function inferBusinessCode(item){
  const explicit=String(item.metadata?.businessCode||item.metadata?.businessId||item.businessId||"").trim();
  if(explicit&&BUSINESS_BY_ID[explicit])return explicit;
  const route=String(item.metadata?.sourceRoute||item.metadata?.sourceHash||item.workbenchCode||"").replace(/^#\/?/,"").split(/[/?]/)[0];
  if(route.startsWith("wholesale-"))return "wholesale";
  if(CROSSBORDER_WORKBENCHES.has(route)||CROSSBORDER_WORKBENCHES.has(String(item.workbenchCode||"")))return "crossborder";
  for(const business of MIWA_BUSINESSES){if(route.includes(business.id))return business.id;}
  return "group";
}
function businessLabel(item){const code=inferBusinessCode(item);return BUSINESS_BY_ID[code]?.name||(code==="group"?"集团 / AIONE":"待归属事业");}
function projectLabel(item){return item.metadata?.projectName||item.metadata?.projectCode||item.projectName||"";}
function teamLabel(item){return item.metadata?.teamName||item.metadata?.teamCode||item.teamName||"";}
function assignedByPersonId(item){return String(item.assignedByPersonId||item.metadata?.assignedByPersonId||item.metadata?.assigned_by_person_id||item.createdByPersonId||"");}
function isAssignedByMe(item){const me=String(identity().subjectId||""),responsible=responsiblePersonId(item);return Boolean(me&&responsible!==me&&assignedByPersonId(item)===me);}
function relationLabel(item){
  const me=String(identity().subjectId||"");
  if(responsiblePersonId(item)===me)return "我负责";
  if(isAssignedByMe(item))return "我安排";
  if(String(item.createdByPersonId||"")===me)return "我创建";
  if(item.isFollowing)return "我关注";
  if(item.isParticipant){if(item.participantRole==="reviewer")return "待我确认";return "我参与";}
  return "公司公开";
}
function normalizeRemote(item,personId){
  const responsible=responsiblePersonId(item),creator=String(item.createdByPersonId||""),assignedBy=assignedByPersonId(item);
  const participants=Array.isArray(item.participants)?item.participants.map((p)=>({personId:String(p.personId||""),role:String(p.role||p.participantRole||"collaborator")})).filter((p)=>p.personId):[];
  const moneySummary=Array.isArray(item.moneySummary)?item.moneySummary:[];
  return {...item,responsiblePersonId:responsible,ownerPersonId:responsible,assignedByPersonId:assignedBy,participants,moneySummary,relation:responsible===String(personId)?"mine":assignedBy===String(personId)&&responsible!==String(personId)?"assigned":creator===String(personId)?"created":item.isFollowing?"following":item.isParticipant?"participant":"shared",status:String(item.status||"pending").toLowerCase(),priority:String(item.priority||"normal").toLowerCase(),sourceSystem:item.sourceSystem||"aione",metadata:item.metadata&&typeof item.metadata==="object"?item.metadata:{},createdAt:item.createdAt||"",updatedAt:item.updatedAt||item.createdAt||"",isFollowing:Boolean(item.isFollowing),isLiked:Boolean(item.isLiked),likeCount:Number(item.likeCount||0)||0,activeSeconds:Number(item.activeSeconds||0)||0,isParticipant:Boolean(item.isParticipant),participantRole:item.participantRole||""};
}
function normalizeLocal(t,personId){return {id:t.id,title:t.title,description:t.description||"",goalSummary:t.goalSummary||"",expectedResult:t.expectedResult||"",status:t.status==="done"?"completed":t.status==="active"?"in_progress":String(t.status||"pending"),priority:t.priority||"normal",ownerPersonId:t.assigneeId||personId,createdByPersonId:t.creatorId||personId,workbenchCode:t.workbench||"",relatedObjectId:t.businessObjectId||"",sourceSystem:t.source||"local-preview",createdAt:t.createdAt||"",updatedAt:t.completedAt||t.createdAt||"",completedAt:t.completedAt||"",dueAt:t.dueDate||"",metadata:{sourceHash:t.route||"",...(t.metadata||{})},participants:[],moneySummary:Array.isArray(t.moneySummary)?t.moneySummary:[],activeSeconds:Number(t.activeSeconds||0)||0,relation:String(t.assigneeId||personId)===String(personId)?"mine":String(t.creatorId||"")===String(personId)?"created":"shared",isFollowing:localFollowingIds().has(String(t.id)),isLiked:localLikedIds().has(String(t.id)),likeCount:Number(t.likeCount||0)||0,isParticipant:false,participantRole:""};}
function localFollowingIds(){try{return new Set(JSON.parse(localStorage.getItem("aione.work.following.v1")||"[]").map(String));}catch(_){return new Set();}}
function saveLocalFollowing(ids){try{localStorage.setItem("aione.work.following.v1",JSON.stringify([...ids]));}catch(_){}}
function localLikedIds(){try{return new Set(JSON.parse(localStorage.getItem("aione.work.liked.v1")||"[]").map(String));}catch(_){return new Set();}}
function saveLocalLiked(ids){try{localStorage.setItem("aione.work.liked.v1",JSON.stringify([...ids]));}catch(_){}}
function todayScore(item){if(isCompleted(item))return -9999;const p={urgent:500,high:360,important:360,normal:220,low:100}[item.priority]||180;const s={blocked:260,waiting:180,in_progress:120,active:120,pending:80,draft:40}[item.status]||40;let due=0;if(isOverdue(item))due=360;else if(isDueToday(item))due=240;else{const d=dateObject(item.dueAt);if(d){const days=(d.getTime()-Date.now())/86400000;if(days<=2)due=150;else if(days<=5)due=80;}}return p+s+due+(item.relation==="mine"?80:item.isFollowing?30:0);}
function todayIds(items){return new Set([...items].filter(x=>!isCompleted(x)&&["mine","participant"].includes(x.relation)).sort((a,b)=>todayScore(b)-todayScore(a)).slice(0,12).map(x=>String(x.id)));}
function metrics(items){const related=items.filter(x=>["mine","created","participant"].includes(x.relation));const a=computeWorkAttention(related,identity().subjectId||"");return {total:items.length,mine:items.filter(x=>x.relation==="mine"&&!isCompleted(x)).length,active:items.filter(x=>["in_progress","active"].includes(x.status)).length,blocked:items.filter(x=>x.status==="blocked").length,review:items.filter(x=>x.status==="waiting").length,overdue:items.filter(isOverdue).length,completed:items.filter(x=>x.status==="completed").length,following:items.filter(x=>x.isFollowing&&!isCompleted(x)).length,attention:a.count,today:todayIds(items).size};}
function workReason(item){if(isOverdue(item))return "已超过截止时间，建议优先处理";if(item.status==="blocked")return item.metadata?.blockReason||item.metadata?.waitingReason||"当前工作存在阻塞，需要先解除问题";if(item.priority==="urgent")return "紧急工作，建议立即确认下一步";if(isDueToday(item))return "今天到期，需要在计划时间内推进";if(["in_progress","active"].includes(item.status))return "工作已经开始，建议保持连续推进";if(item.status==="waiting")return "执行结果已提交，等待验收确认";return item.metadata?.workReason||item.goalSummary||item.description||"当前计划工作";}
function nextAction(item){return item.metadata?.nextAction||item.nextAction||(item.status==="pending"?"开始处理，并记录第一步结果":item.status==="blocked"?"确认阻塞原因，选择解决路径后继续推进":item.status==="waiting"?"检查执行结果与证据，决定是否验收":["in_progress","active"].includes(item.status)?"继续推进当前执行，并记录最新进展":item.status==="completed"?"查看闭环结果与执行证据":"确认下一步行动");}
function acceptanceCriteria(item){return item.metadata?.acceptanceCriteria||item.acceptanceCriteria||item.expectedResult||"待补充：明确怎样才算真正完成";}
const WORKBENCH_LABELS=Object.freeze({"work-home":"工作之家",selection:"选品工作台",sampling:"测样工作台",procurement:"采购工作台",design:"视觉设计工作台",publishing:"上架发布工作台",operations:"运营推广工作台",orders:"订单与库存工作台",inventory:"订单与库存工作台",service:"客服与售后工作台"});
const OBJECT_TYPE_LABELS=Object.freeze({aione_route:"AIONE业务页面",external_link:"外部业务资料",business_reference:"业务资料",product_opportunity:"商品机会",work_item:"工作事项"});
function workbenchLabel(item){return WORKBENCH_LABELS[item.workbenchCode]||item.metadata?.sourcePage||"工作之家";}
function relatedLabel(item){const type=OBJECT_TYPE_LABELS[item.relatedObjectType]||"业务对象";return item.relatedObjectId?`${type}：${item.relatedObjectId}`:"待补充关联对象";}
function contextLabel(item){return item.metadata?.sourcePage||workbenchLabel(item)||"工作之家";}
function estimatedText(item){const n=Number(item.metadata?.estimatedMinutes||item.estimatedMinutes||0);return Number.isFinite(n)&&n>0?`预计 ${n}分钟`:"";}
function durationText(seconds){const n=Math.max(0,Number(seconds||0)||0);if(!n)return "";const mins=Math.round(n/60);if(mins<60)return `已记录 ${mins}分钟`;const h=Math.floor(mins/60),m=mins%60;return `已记录 ${h}小时${m?`${m}分`:""}`;}
function updatedText(item){return item.updatedAt?`更新 ${dateText(item.updatedAt)}`:"";}
function moneyRows(item){return Array.isArray(item.moneySummary)?item.moneySummary.filter((x)=>Number(x?.amount||0)>0):[];}
function moneyLabel(row){const type=String(row?.moneyType||"").trim();const dir={income:"收入",expense:"支出",cost:"成本",transfer:"划转",other:"金额"}[row?.direction]||"金额";const amount=Number(row?.amount||0);const currency=String(row?.currency||"JPY");const formatted=new Intl.NumberFormat("ja-JP",{maximumFractionDigits:0}).format(amount);return `${type||dir} ${currency==="JPY"?"¥":`${currency} `}${formatted}`;}
function moneyText(item){const rows=moneyRows(item);return rows.length?moneyLabel(rows[0]):"";}
function summaryMeta(item){
  const meta=item?.metadata&&typeof item.metadata==="object"?item.metadata:{};
  const nested=meta.workSummary&&typeof meta.workSummary==="object"?meta.workSummary:{};
  return {
    id:String(nested.id||meta.workSummaryId||meta.work_summary_id||"").trim(),
    status:String(nested.status||meta.workSummaryStatus||meta.summaryStatus||"").trim().toLowerCase(),
    title:String(nested.title||meta.workSummaryTitle||meta.summaryTitle||"").trim(),
    abstract:String(nested.abstract||nested.summary||meta.workSummaryAbstract||meta.summaryAbstract||meta.summaryText||"").trim(),
    authorPersonId:String(nested.authorPersonId||meta.workSummaryAuthorPersonId||meta.summaryAuthorPersonId||"").trim(),
    googleDocUrl:String(nested.googleDocUrl||meta.workSummaryGoogleDocUrl||meta.summaryGoogleDocUrl||"").trim(),
    pdfUrl:String(nested.pdfUrl||meta.workSummaryPdfUrl||meta.summaryPdfUrl||"").trim(),
    promotionScope:String(nested.promotionScope||meta.workSummaryPromotionScope||meta.summaryPromotionScope||"").trim().toLowerCase(),
    version:String(nested.version||meta.workSummaryVersion||meta.summaryVersion||"").trim()
  };
}
function hasWorkSummary(item){const s=summaryMeta(item);return Boolean(s.id||s.status||s.title||s.abstract||s.googleDocUrl||s.pdfUrl);}
function summaryBelongsToMe(item){const me=String(identity().subjectId||""),s=summaryMeta(item);if(s.authorPersonId)return s.authorPersonId===me;return String(item.ownerPersonId||"")===me||String(item.createdByPersonId||"")===me;}
function summaryStatusLabel(item){const s=summaryMeta(item);if(!hasWorkSummary(item))return "—";return ({draft:"草稿",review:"待确认",pending:"待确认",confirmed:"已确认",published:"已确认",approved:"已确认"})[s.status]||"已总结";}
function summaryPromotionLabel(item){const s=summaryMeta(item);return ({team:"团队推广",business:"事业推广",group:"集团推广",company:"集团推广"})[s.promotionScope]||"";}
function summaryFilterMatches(item,value="all"){if(!value||value==="all")return true;const has=hasWorkSummary(item),scope=summaryMeta(item).promotionScope;if(value==="has")return has;if(value==="none")return !has;if(value==="team")return has&&scope==="team";if(value==="group")return has&&["group","company"].includes(scope);return true;}
function summaryLinksHtml(item,{compact=false}={}){const s=summaryMeta(item);if(!hasWorkSummary(item))return compact?`<span class="miwa-work-summary-empty">—</span>`:`<span class="miwa-work-summary-empty">暂无总结</span>`;const links=[];if(s.googleDocUrl&&safeHref(s.googleDocUrl))links.push(`<a href="${esc(safeHref(s.googleDocUrl))}" target="_blank" rel="noopener">Google Docs</a>`);if(s.pdfUrl&&safeHref(s.pdfUrl))links.push(`<a href="${esc(safeHref(s.pdfUrl))}" target="_blank" rel="noopener">PDF</a>`);const promo=summaryPromotionLabel(item);return `<span class="miwa-work-summary-state">${esc(summaryStatusLabel(item))}</span>${promo?`<span class="miwa-work-summary-promo">${esc(promo)}</span>`:""}${links.length?`<span class="miwa-work-summary-links">${links.join("")}</span>`:""}`;}
function plannedStartDate(item){return dateObject(item.plannedStartAt||item.metadata?.plannedStartAt||item.metadata?.planned_start_at||item.startedAt||"");}
function mineTimeBucket(item,now=new Date()){
  if(isCompleted(item))return "closed";
  const start=new Date(now);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);
  const due=dateObject(item.dueAt),planned=plannedStartDate(item),status=String(item.status||"");
  if(due&&due.getTime()<start.getTime())return "before";
  if(planned&&planned.getTime()>=end.getTime()&&!['in_progress','active','blocked','waiting'].includes(status))return "future";
  if(!planned&&due&&due.getTime()>=end.getTime()&&['pending','draft'].includes(status))return "future";
  return "current";
}
function mineRangeMatches(item,range="current"){return range==="all"||mineTimeBucket(item)===range;}
function scopeEndpoint(interactionView="following"){const id=routeId();if(id==="work-following")return interactionView==="liked"?LIKED_WORK_ENDPOINT:FOLLOWING_WORK_ENDPOINT;if(id==="work-today"||id==="work-mine"||id==="work-summaries"||id==="work-pending"||id==="work-active"||id==="work-completed")return RELATED_WORK_ENDPOINT;return ALL_WORK_ENDPOINT;}
function routeMatches(item,allItems,interactionView="following"){const id=routeId();if(id==="work-today"||id==="work-mine")return item.relation==="mine"&&!isCompleted(item);if(id==="work-assigned")return isAssignedByMe(item);if(id==="work-following")return interactionView==="liked"?item.isLiked:item.isFollowing;if(id==="work-summaries")return hasWorkSummary(item)&&summaryBelongsToMe(item);if(BUSINESS_ROUTE_MAP[id])return inferBusinessCode(item)===BUSINESS_ROUTE_MAP[id];if(id==="work-team")return true;if(id==="work-waiting")return hasWaitingSignal(item)&&item.status!=="waiting"&&item.status!=="blocked"&&!isCompleted(item);if(id==="work-blocked")return item.status==="blocked"||Boolean(item.metadata?.exceptionReason||item.metadata?.errorCode||item.metadata?.executionState==="error");if(id==="work-review")return item.status==="waiting";if(id==="work-records")return ["completed","cancelled","archived"].includes(item.status);if(id==="work-pending")return item.status==="pending";if(id==="work-active")return ["in_progress","active"].includes(item.status);if(id==="work-completed")return item.status==="completed";return true;}
function searchMatches(item,q){if(!q)return true;return [item.title,item.description,item.goalSummary,item.expectedResult,item.workbenchCode,item.relatedObjectType,item.relatedObjectId,item.metadata?.sourcePage,item.metadata?.nextAction,item.metadata?.workReason,sourceLabel(item),businessLabel(item),projectLabel(item),teamLabel(item),ownerLabel(item)].join(" ").toLowerCase().includes(q.toLowerCase());}
function relationMatches(item,v){if(!v||v==="all")return true;if(v==="mine")return item.relation==="mine";if(v==="assigned")return isAssignedByMe(item);if(v==="created")return String(item.createdByPersonId||"")===String(identity().subjectId||"");if(v==="following")return item.isFollowing;if(v==="participant")return item.isParticipant&&!item.isFollowing;return true;}
function memberMatches(item,v){if(!v||v==="all")return true;return String(item.ownerPersonId||"")===String(v);}
function memberOptionsHtml(items){const map=new Map();for(const item of items){const id=String(item.ownerPersonId||"").trim();if(!id)continue;if(!map.has(id))map.set(id,ownerLabel(item)||personProfile(id).displayName||id);}return `<option value="all">全部成员</option>${[...map.entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),"zh-CN")).map(([id,label])=>`<option value="${esc(id)}">${esc(label)}</option>`).join("")}`;}
function statusMatches(item,v){if(!v||v==="all")return true;if(v==="in_progress")return ["in_progress","active"].includes(item.status);if(v==="hold")return hasWaitingSignal(item)&&item.status!=="waiting"&&item.status!=="blocked"&&!isCompleted(item);return item.status===v;}
function priorityMatches(item,v){return !v||v==="all"||item.priority===v;}
function businessMatches(item,v){return !v||v==="all"||inferBusinessCode(item)===v;}
function teamMatches(item,v){return !v||v==="all"||teamLabel(item)===v;}
function projectMatches(item,v){return !v||v==="all"||projectLabel(item)===v;}
function workTimeReference(item,basis="relevant"){if(basis==="due")return dateObject(item.dueAt);if(basis==="updated")return dateObject(item.updatedAt);if(basis==="created")return dateObject(item.createdAt);if(basis==="completed")return dateObject(item.completedAt);return isCompleted(item)?dateObject(item.completedAt||item.updatedAt||item.createdAt):dateObject(item.dueAt||item.updatedAt||item.createdAt);}
function rangeBounds(kind,from="",to="",now=new Date()){const start=new Date(now),end=new Date(now);start.setHours(0,0,0,0);end.setHours(0,0,0,0);if(kind==="today"){end.setDate(end.getDate()+1);return [start,end];}if(kind==="week"){const day=(start.getDay()+6)%7;start.setDate(start.getDate()-day);end.setTime(start.getTime());end.setDate(end.getDate()+7);return [start,end];}if(kind==="month"){start.setDate(1);end.setFullYear(start.getFullYear(),start.getMonth()+1,1);return [start,end];}if(kind==="year"){start.setMonth(0,1);end.setFullYear(start.getFullYear()+1,0,1);return [start,end];}if(kind==="custom"){const a=from?new Date(`${from}T00:00:00`):null,b=to?new Date(`${to}T00:00:00`):null;if(b)b.setDate(b.getDate()+1);return [a&&!Number.isNaN(a.getTime())?a:null,b&&!Number.isNaN(b.getTime())?b:null];}return [null,null];}
function timeMatches(item,kind="all",basis="relevant",from="",to=""){if(!kind||kind==="all")return true;const d=workTimeReference(item,basis);if(!d)return false;const [start,end]=rangeBounds(kind,from,to);if(start&&d<start)return false;if(end&&d>=end)return false;return true;}
function moneyMatches(item,mode="all",minAmount=""){const rows=moneyRows(item),has=rows.length>0;if(mode==="has"&&!has)return false;if(mode==="none"&&has)return false;const min=Number(minAmount||0);if(Number.isFinite(min)&&min>0)return rows.some((x)=>Number(x.amount||0)>=min);return true;}
function sortItems(items,sort){const arr=[...items];if(sort==="due")return arr.sort((a,b)=>(dateObject(a.dueAt)?.getTime()||Number.MAX_SAFE_INTEGER)-(dateObject(b.dueAt)?.getTime()||Number.MAX_SAFE_INTEGER));if(sort==="updated")return arr.sort((a,b)=>(dateObject(b.updatedAt)?.getTime()||0)-(dateObject(a.updatedAt)?.getTime()||0));if(sort==="created")return arr.sort((a,b)=>(dateObject(b.createdAt)?.getTime()||0)-(dateObject(a.createdAt)?.getTime()||0));if(sort==="priority")return arr.sort((a,b)=>({urgent:4,high:3,normal:2,low:1}[b.priority]||0)-({urgent:4,high:3,normal:2,low:1}[a.priority]||0));return arr.sort((a,b)=>todayScore(b)-todayScore(a));}

function routeNote(id){
  if(id==="work-mine"||id==="work-today")return "我的工作不是“日期=今天”：过去未完、当前应办和未来安排连续存在，工作不会因为跨过午夜就消失。";
  if(id==="work-all")return "全部工作是统一工作事项入口：需要查、找、比较、筛选大量工作时使用同一Work Item Browser。";
  if(id==="work-following")return "关注是个人选择：用于持续跟踪和快速定位重要对象，不等于接手、不改变负责人，也不自动生成待办。";
  if(id==="work-summaries")return "我的总结只保留本人主动形成的高价值工作成果；普通工作不强制总结，正式总结可继续关联Google Docs与A4 PDF。";
  if(BUSINESS_ROUTE_MAP[id])return `${BUSINESS_BY_ID[BUSINESS_ROUTE_MAP[id]]?.name||"当前事业"}工作只预设该事业范围，处理仍回到同一条真实Work Item。`;
  if(id==="work-waiting")return "只看正常等待外部回复、平台结果或下一检查时间的事项；等待不是异常，到点后重新进入推进范围。";
  if(id==="work-blocked")return "这里只处理真正影响工作继续推进的异常：阻塞、数据问题、系统错误或其他需要人工介入的问题。";
  if(id==="work-review")return "执行完成不等于闭环。这里集中处理已提交结果、等待确认的工作。";
  if(id==="work-suggestions")return "记录我提出的改善建议，并明确汇总到美和之家 → 经营与战略 → 建议中心；建议被受理后再转工作事项或项目执行。";
  if(id==="work-innovations")return "记录我提出的新方法、新产品、新模式或新能力，并汇总到美和之家 → 经营与战略 → 创新中心进行验证。";
  if(id==="work-business-more")return "查看除常用事业之外的其他事业工作；仍然使用同一工作事项一览，只改变事业查询条件。";
  if(id==="work-team")return "团队工作只是团队/成员观察入口；Main继续复用统一Work Item Browser，不再另做一套人员工作页面。";
  if(id==="work-records")return "工作记录保存闭环事实；只有少数有意义、有复用价值的工作才额外关联工作总结。";
  return "一份工作事实，多种视图；看得到不等于要处理，也不等于可以修改。";
}
function aside(items){
  const m=metrics(items),id=routeId();
  const contextItems=id==="work-following"?
    [{label:"已关注",value:`${m.following}项`},{label:"价值",value:"订阅 + 定位 + 跟踪"},{label:"原则",value:"个人关注 ≠ 组织推广"}]:
    id==="work-summaries"?
    [{label:"用途",value:"个人成果沉淀"},{label:"原则",value:"主动总结，不强制"},{label:"正式资料",value:"Google Docs + A4 PDF"}]:
    id==="work-team"?
    [{label:"用途",value:"团队协同"},{label:"视角",value:"成员 / 工作"},{label:"原则",value:"同一Work Item"}]:
    id==="work-records"?
    [{label:"用途",value:"闭环事实账本"},{label:"总结",value:"有价值才生成"},{label:"原则",value:"事实 ≠ 总结 ≠ 绩效"}]:
    [{label:"当前可见",value:`${items.length}项`},{label:"需要关注",value:`${m.attention}项`},{label:"原则",value:"看得到 ≠ 要处理 ≠ 能操作"}];
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"standard",kicker:"工作之家 V2.0",title:ROUTE_TITLES[id]||"工作之家",text:routeNote(id),items:contextItems}}));
}
async function loadItems(interactionView="following"){const personId=identity().subjectId||"";try{const r=await aioneApi(scopeEndpoint(interactionView));return {items:(r.items||[]).map(x=>normalizeRemote(x,r.personId||personId)),mode:"database"};}catch(error){const local=getCollaborationData();return {items:(local.tasks||[]).map(x=>normalizeLocal(x,personId)),mode:"local",error};}}

function followButton(item,compact=false){return `<button class="miwa-work-follow${item.isFollowing?" is-following":""}" type="button" data-work-follow="${esc(item.id)}" aria-pressed="${item.isFollowing?"true":"false"}" title="${item.isFollowing?"取消关注":"关注工作动态"}">${item.isFollowing?"★ 已关注":"☆ 关注"}${compact?"":""}</button>`;}
function likeButton(item){const count=Number(item.likeCount||0)||0;return `<button class="miwa-work-like${item.isLiked?" is-liked":""}" type="button" data-work-like="${esc(item.id)}" aria-pressed="${item.isLiked?"true":"false"}" title="${item.isLiked?"取消点赞":"点赞表示认可，不等于关注"}">👍${count?` <span>${count}</span>`:""}</button>`;}
function displayStatusLabel(item){if(item.status==="blocked")return "异常处理";if(hasWaitingSignal(item)&&item.status!=="waiting"&&!isCompleted(item))return "等待中";return statusLabel(item.status);}
function cardHtml(item){const href=sourceHref(item),context=contextLabel(item),sourceNode=href?`<a class="miwa-work-source-link" href="${esc(href)}">${esc(context)}</a>`:esc(context),risk=isOverdue(item)||item.status==="blocked"||item.priority==="urgent"?" is-risk":"",est=estimatedText(item),spent=durationText(item.activeSeconds),money=moneyText(item),project=projectLabel(item),team=teamLabel(item);return `<article class="miwa-work-card${risk}" data-work-item-id="${esc(item.id)}"><div class="miwa-work-card__head"><div class="miwa-work-card__tags"><span class="miwa-work-relation">${esc(relationLabel(item))}</span><span class="miwa-work-status">${esc(displayStatusLabel(item))}</span><span class="miwa-work-priority">${esc(priorityLabel(item.priority))}</span></div><div class="miwa-work-card__social">${likeButton(item)}${followButton(item,true)}</div></div><div class="miwa-work-card__title"><strong>${esc(item.title||"未命名工作")}</strong><p>${esc(workReason(item))}</p></div><div class="miwa-work-card__scope"><span>${esc(businessLabel(item))}</span>${project?`<span>${esc(project)}</span>`:""}${team?`<span>${esc(team)}</span>`:""}${money?`<span class="is-money">${esc(money)}</span>`:""}</div><div class="miwa-work-next"><span>下一步</span><strong>${esc(nextAction(item))}</strong></div><div class="miwa-work-card__meta"><span>${esc(ownerLabel(item))}</span><span>${item.dueAt?`截止 ${esc(dateText(item.dueAt))}`:"无明确截止"}</span>${est?`<span>${esc(est)}</span>`:""}${spent?`<span>${esc(spent)}</span>`:""}<span>${esc(updatedText(item))}</span></div><div class="miwa-work-card__footer"><small>${sourceNode}${sourceLabel(item)==="美和AI"?" · 美和AI整理":""}</small><button class="miwa-work-primary" type="button" data-work-open="${esc(item.id)}">${item.status==="waiting"?"验收":"处理"}</button></div></article>`;}
function listRowHtml(item){const project=projectLabel(item),team=teamLabel(item),money=moneyText(item),spent=durationText(item.activeSeconds),planned=plannedStartDate(item);return `<tr data-work-item-id="${esc(item.id)}"><td><span class="miwa-work-priority-dot ${item.priority}"></span>${esc(priorityLabel(item.priority))}</td><td><button class="miwa-work-title-link" type="button" data-work-open="${esc(item.id)}"><strong>${esc(item.title||"未命名工作")}</strong><small>${esc(nextAction(item))}</small>${money?`<small class="miwa-work-money-line">${esc(money)}</small>`:""}</button></td><td><strong>${esc(businessLabel(item))}</strong><small>${esc(project||team||contextLabel(item))}</small></td><td>${esc(ownerLabel(item))}<small>${esc(relationLabel(item))}</small></td><td><span class="miwa-work-table-status">${esc(displayStatusLabel(item))}</span></td><td>${planned?esc(dateText(planned)):"—"}<small>${esc(updatedText(item))}</small></td><td>${item.dueAt?esc(dateText(item.dueAt)):"—"}<small>${isOverdue(item)?"已逾期":spent?esc(spent):""}</small></td><td><div class="miwa-work-table-social">${likeButton(item)}${followButton(item,true)}</div></td><td><button class="miwa-work-table-action" type="button" data-work-open="${esc(item.id)}">${item.status==="waiting"?"验收":"处理"}</button></td></tr>`;}
function browserRowsHtml(items,view,columns="3"){if(!items.length)return `<div class="miwa-work-empty">当前条件下暂无工作事项。</div>`;if(view==="list")return `<div class="miwa-work-table-wrap"><table class="miwa-work-table"><thead><tr><th>优先</th><th>工作事项 / 下一步</th><th>事业 / 项目</th><th>负责人</th><th>状态</th><th>开始时间</th><th>截止时间</th><th>互动</th><th>操作</th></tr></thead><tbody>${items.map(listRowHtml).join("")}</tbody></table></div>`;return `<div class="miwa-work-card-grid cols-${esc(columns)}">${items.map(cardHtml).join("")}</div>`;}
function optionsHtml(items,getter,placeholder){const values=[...new Set(items.map(getter).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),"zh-CN"));return `<option value="all">${esc(placeholder)}</option>${values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("")}`;}
function businessOptionsHtml(){return `<option value="all">全部事业</option><option value="group">集团 / AIONE</option>${MIWA_BUSINESSES.map(b=>`<option value="${esc(b.id)}">${esc(b.name)}</option>`).join("")}`;}
function pagePresentation(id=routeId()){
  if(id==="work-following")return "focus";
  if(id==="work-records")return "records";
  if(id==="work-summaries")return "summaries";
  if(id==="work-waiting"||id==="work-blocked"||id==="work-review")return "compact";
  return "browser";
}
function viewToggleHtml(){return `<div class="miwa-work-view-toggle" role="group" aria-label="工作显示方式"><button type="button" data-work-view="list">列表</button><select class="miwa-work-card-cols" data-work-card-cols aria-label="卡片列数"><option value="2">卡片 · 2列</option><option value="3">卡片 · 3列</option><option value="4">卡片 · 4列</option><option value="6">卡片 · 6列</option></select></div>`;}
function refreshButtonHtml(){return `<button class="miwa-work-refresh" type="button" data-work-refresh aria-label="刷新数据" title="刷新数据">↻</button>`;}
function timeFilterHtml(){return `<select data-work-time aria-label="时间范围">${TIME_FILTERS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select>`;}
function sortControlHtml(){return `<div class="miwa-work-sort-control"><button class="miwa-work-sort-toggle" type="button" data-work-sort-toggle aria-haspopup="menu" aria-expanded="false">排序 <span>⌄</span></button><div class="miwa-work-sort-menu" data-work-sort-menu role="menu" hidden>${SORT_OPTIONS.map(([v,l])=>`<button type="button" role="menuitemradio" data-work-sort-option="${v}" aria-checked="false"><span>${esc(l)}</span><b aria-hidden="true"></b></button>`).join("")}</div><input type="hidden" data-work-sort value="ai"></div>`;}
function toolbarActionsHtml({sort=true}={}){return `<div class="miwa-work-toolbar-actions">${sort?sortControlHtml():""}${viewToggleHtml()}${refreshButtonHtml()}</div>`;}
function workSearchHtml(placeholder="搜索工作名称、下一步、业务对象、负责人…"){return `<div class="miwa-work-searchbox"><span>⌕</span><input class="miwa-work-search" data-work-search placeholder="${esc(placeholder)}"></div>`;}
function quickStatusHtml(){return `<div class="miwa-work-quick-status" data-work-quick-status-bar><button type="button" data-work-quick-status="all" class="is-active">全部 <b data-work-quick-count="all"></b></button><button type="button" data-work-quick-status="in_progress">进行中 <b data-work-quick-count="in_progress"></b></button><button type="button" data-work-quick-status="hold">等待中 <b data-work-quick-count="hold"></b></button><button type="button" data-work-quick-status="blocked">异常处理 <b data-work-quick-count="blocked"></b></button><button type="button" data-work-quick-status="waiting">待验收 <b data-work-quick-count="waiting"></b></button></div>`;}
function mineRangeRailHtml(){return `<section class="miwa-work-mine-range" aria-label="我的工作时间范围"><button type="button" data-work-mine-range="before"><span>今日以前</span><strong data-work-mine-count="before">0</strong><small>过去应推进但仍未闭环</small></button><button type="button" data-work-mine-range="current" class="is-active"><span>当前工作</span><strong data-work-mine-count="current">0</strong><small>现在需要行动、判断或跟进</small></button><button type="button" data-work-mine-range="future"><span>今日以后</span><strong data-work-mine-count="future">0</strong><small>未来已经安排的工作</small></button></section>`;}
function workProcessHtml(){return `<section class="miwa-work-process-strip" aria-label="工作标准流程"><div><span>工作标准流程</span><strong>创建 / 布置 → 待开始 → 进行中 → 等待 / 阻碍 → 待验收 → 闭环</strong></div><small>工作跨天不消失；无法闭环时必须留下明确下一步、等待原因或下一检查时间。</small></section>`;}
function paginationHtml(total,page){const pages=Math.max(1,Math.ceil(total/WORK_PAGE_SIZE)),safe=Math.min(Math.max(1,page),pages),start=total?(safe-1)*WORK_PAGE_SIZE+1:0,end=Math.min(total,safe*WORK_PAGE_SIZE);return `<footer class="miwa-work-pagination" data-work-pagination><span>当前显示 ${start}-${end} / ${total} 项 · 每页${WORK_PAGE_SIZE}项</span><nav aria-label="工作事项分页"><button type="button" data-work-page="prev" ${safe<=1?"disabled":""}>上一页</button><span>${safe} / ${pages}</span><button type="button" data-work-page="next" ${safe>=pages?"disabled":""}>下一页</button></nav></footer>`;}
function openAIWorkCreate(){window.MIWAAI?.open?.("work-create");window.setTimeout(()=>{const input=document.getElementById("ai-secretary-command-input");if(!input)return;if(!input.value.trim())input.value="我要创建/交代一项工作：";input.focus();input.setSelectionRange?.(input.value.length,input.value.length);},80);}
function browserShellHtml(){
  const id=routeId(),presentation=pagePresentation(id),isMine=id==="work-mine"||id==="work-today",isFollowing=id==="work-following",isTeam=id==="work-team";
  const relationSelect=`<select data-work-relation aria-label="关系"><option value="all">全部关系</option><option value="mine">我负责</option><option value="assigned">我布置</option><option value="participant">我参与</option><option value="created">我创建</option><option value="following">我关注</option></select>`;
  const me=identity(),memberSelect=isMine?`<select data-work-member aria-label="成员" disabled><option value="${esc(me.subjectId||"me")}">${esc(me.displayName||"当前用户")}</option></select>`:`<select data-work-member aria-label="成员"><option value="all">全部成员</option></select>`;
  const fullToolbar=presentation==="browser"?`${workSearchHtml()}${relationSelect}<select data-work-business aria-label="事业">${businessOptionsHtml()}</select>${memberSelect}<select data-work-status aria-label="状态">${STATUS_FILTERS.map(([v,l])=>`<option value="${v}">${v==="all"?"全部状态":l}</option>`).join("")}</select><select data-work-priority aria-label="优先级">${PRIORITY_FILTERS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select>${timeFilterHtml()}<div class="miwa-work-filter-actions"><button class="miwa-work-more-filter" type="button" data-work-more-filter>更多筛选 <span data-work-more-count></span></button><button class="miwa-work-reset" type="button" data-work-reset hidden>重置</button></div>${toolbarActionsHtml({sort:true})}`:"";
  const focusToolbar=presentation==="focus"?`${workSearchHtml("搜索已关注工作…")}<button class="miwa-work-liked-history" type="button" data-work-liked-history>点赞记录</button>${toolbarActionsHtml({sort:false})}`:"";
  const compactToolbar=presentation==="compact"?`${workSearchHtml()}<select data-work-business>${businessOptionsHtml()}</select>${timeFilterHtml()}${toolbarActionsHtml({sort:true})}`:"";
  const heading=isMine?"工作事项一览":isFollowing?"关注内容":isTeam?"团队工作一览":"工作事项一览";
  const summary=isMine?"从今日以前、当前工作和今日以后连续管理；工作不会因为跨天自动消失。":isFollowing?"这里先读取已接入的工作关注；关注的价值是订阅、快速定位和持续跟踪，不改变责任。":isTeam?"团队工作与全部工作复用同一浏览母版；通过成员、团队、事业等条件改变观察范围。":"卡片用于快速理解，列表用于大量比较；不同入口只改变预设查询，不复制真实工作数据。";
  const heroActions=`${isMine?`<button class="miwa-level2-head__button is-primary" type="button" data-work-ai-create>＋ AI创建工作</button>`:""}${id==="work-all"?`<a class="miwa-level2-head__button is-primary miwa-work-mine-primary" href="#/work-mine">我的工作</a>`:""}<a href="${manualHref(id)}" class="miwa-level2-head__button miwa-work-guide-link">查看工作手册</a>`;
  return `<section class="miwa-work-home miwa-work-home--${presentation}"><header class="miwa-work-hero miwa-level2-head"><div class="miwa-level2-head__identity"><span class="miwa-level2-head__icon" aria-hidden="true">${esc(topicMark(id))}</span><div><div class="miwa-work-hero__eyebrow">MIWA GROUP WORK · REAL-USE</div><h1>${esc(ROUTE_TITLES[id]||"工作之家")}</h1><p>${esc(routeSubtitle(id))}</p></div></div><div class="miwa-level2-head__actions">${heroActions}</div></header>${isMine?mineRangeRailHtml()+workProcessHtml():""}<div class="miwa-work-kpis" data-work-kpis hidden></div>${id==="work-all"?quickStatusHtml():""}<section class="miwa-work-browser"><div class="miwa-work-browser__toolbar">${fullToolbar||focusToolbar||compactToolbar}</div><div class="miwa-work-browser__advanced" data-work-advanced hidden><label>团队<select data-work-team><option value="all">全部团队</option></select></label><label>项目<select data-work-project><option value="all">全部项目</option></select></label><label>时间依据<select data-work-time-basis>${TIME_BASIS_FILTERS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></label><label data-work-custom-date hidden>开始日期<input type="date" data-work-date-from></label><label data-work-custom-date hidden>结束日期<input type="date" data-work-date-to></label><label>金额<select data-work-money>${MONEY_FILTERS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></label><label>最低金额<input type="number" min="0" step="1" data-work-min-amount placeholder="例如 100000"></label></div><div class="miwa-work-browser__summary"><div><h2 data-work-heading>${heading}</h2><p data-work-summary>${summary}</p></div><span data-work-count></span></div><div data-work-error></div><div data-work-list><div class="miwa-work-loading">正在读取工作事项…</div></div><div data-work-pagination-host></div></section><dialog class="miwa-work-detail" data-work-detail><div class="miwa-work-detail-body" data-work-detail-body></div></dialog></section>`;
}

function contributionShellHtml(kind){const suggestion=kind==="suggestion",title=suggestion?"我的建议":"我的创新",center=suggestion?"建议中心":"创新中心",centerRoute=suggestion?"company-suggestion-center":"company-innovation-center";return `<section class="miwa-work-home miwa-work-home--contribution"><header class="miwa-work-hero"><div class="miwa-work-hero__eyebrow">MIWA GROUP CONTRIBUTION</div><div class="miwa-work-hero__row"><div><h1>${title}</h1><p>${esc(routeNote(routeId()))}</p></div><a href="#/${centerRoute}" class="miwa-work-guide-link">查看集团${center}</a></div></header><section class="miwa-work-contribution"><div class="miwa-work-contribution__head"><div><h2>${suggestion?"我发现哪里可以做得更好":"我想到哪些新的可能"}</h2><p>${suggestion?"个人端负责提出与跟踪；集团建议中心负责接住、分诊、分派和回写结果。":"个人端负责提出与跟踪；集团创新中心负责评估、验证并决定是否项目化。"}</p></div><button type="button" data-contribution-new>${suggestion?"＋ 提出建议":"＋ 提出创新"}</button></div><div class="miwa-work-contribution__flow"><span>提出</span><b>→</b><span>${suggestion?"建议中心评估":"创新中心评估"}</span><b>→</b><span>Work Item / Project</span><b>→</b><span>验证与结果</span><b>→</b><span>工作记录 / 结果回写</span></div><div class="miwa-work-empty">本版本先锁定入口、归口中心、责任与闭环结构。正式多用户提交/汇总数据接口将在后续版本接入；当前不会把本地草稿伪装成集团正式数据。</div></section></section>`;}

function personProfile(personId){const id=String(personId||"");const directory=window.AIONEPeopleDirectory||window.AIONEUserDirectory||{};const external=Array.isArray(directory)?directory.find((x)=>String(x.subjectId||x.personId||x.id)===id):directory[id];const p=PREVIEW_IDENTITIES.find((x)=>String(x.subjectId)===id);const live=String(identity().subjectId||"")===id?identity():{};const base=external||p||{};return {subjectId:id,displayName:live.displayName||base.displayName||base.name||id||"待确认",initial:live.initial||base.initial||(base.displayName||base.name||id||"?").slice(0,1),avatarUrl:live.avatarUrl||base.avatarUrl||base.avatar||base.picture||"",primaryWorkIdentity:live.primaryWorkIdentity||base.primaryWorkIdentity||base.positionName||"待确认岗位",workAssignment:live.workAssignment||base.workAssignment||{businessUnit:""}};}
function participantFacts(item){const facts=[];const ownerId=String(item.ownerPersonId||"");if(ownerId)facts.push({personId:ownerId,role:"owner"});for(const p of item.participants||[]){const pid=String(p.personId||"");if(!pid||pid===ownerId||p.role==="observer")continue;facts.push({personId:pid,role:p.role||"collaborator"});}return facts;}
function recordReferenceDate(item){return dateObject(item.completedAt||item.updatedAt||item.startedAt||item.createdAt);}
function rangeStart(range,now=new Date()){
  const d=new Date(now);d.setHours(0,0,0,0);
  if(range==="week"){const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d;}
  if(range==="month"){d.setDate(1);return d;}
  if(range==="year"){d.setMonth(0,1);return d;}
  return new Date(0);
}
function recordsInRange(items,range){const start=rangeStart(range).getTime();return items.filter((item)=>{const d=recordReferenceDate(item);return Boolean(d&&d.getTime()>=start);});}
function finalResultText(item){return String(item.resultSummary||item.metadata?.resultSummary||item.metadata?.finalResult||item.expectedResult||"已形成闭环事实，详细结果请查看工作详情。").trim();}
function creatorLabel(item){const id=String(item.createdByPersonId||"").trim();return id?personProfile(id).displayName||id:sourceLabel(item);}
function recordEvidenceText(item){const n=Number(item.evidenceCount||item.metadata?.evidenceCount||0)||0;if(n>0)return `${n}项证据`;if(item.metadata?.evidenceUri||item.metadata?.evidenceSummary)return "已有证据";return "查看详情";}
function recordDurationLabel(item){const t=durationText(item.activeSeconds);return t?t.replace(/^已记录 /,""):"—";}
function recordListRowHtml(item){const project=projectLabel(item),summary=summaryLinksHtml(item,{compact:true});return `<tr data-work-item-id="${esc(item.id)}"><td>${esc(dateText(item.completedAt||item.updatedAt||item.createdAt))}</td><td><button class="miwa-work-title-link" type="button" data-work-open="${esc(item.id)}"><strong>${esc(item.title||"未命名工作")}</strong><small>${esc(finalResultText(item))}</small></button></td><td><strong>${esc(businessLabel(item))}</strong><small>${esc(project||contextLabel(item))}</small></td><td>${esc(ownerLabel(item))}<small>来源：${esc(creatorLabel(item))}</small></td><td><span class="miwa-work-table-status">${esc(item.status==="completed"?"已闭环":statusLabel(item.status))}</span></td><td>${esc(recordDurationLabel(item))}</td><td>${esc(recordEvidenceText(item))}</td><td><div class="miwa-work-summary-cell">${summary}</div></td><td><button class="miwa-work-table-action" type="button" data-work-open="${esc(item.id)}">查看记录</button></td></tr>`;}
function recordCardHtml(item){const project=projectLabel(item),summary=summaryLinksHtml(item);return `<article class="miwa-work-record-card" data-work-item-id="${esc(item.id)}"><div class="miwa-work-record-card__head"><div><span>${esc(dateText(item.completedAt||item.updatedAt||item.createdAt))}</span><h3>${esc(item.title||"未命名工作")}</h3></div><span class="miwa-work-table-status">${esc(item.status==="completed"?"已闭环":statusLabel(item.status))}</span></div><p>${esc(finalResultText(item))}</p><div class="miwa-work-record-card__meta"><span>${esc(businessLabel(item))}${project?` · ${esc(project)}`:""}</span><span>负责人 ${esc(ownerLabel(item))}</span><span>有效工时 ${esc(recordDurationLabel(item))}</span><span>证据 ${esc(recordEvidenceText(item))}</span></div><div class="miwa-work-record-card__summary"><b>工作总结</b><div>${summary}</div></div><button class="miwa-work-table-action" type="button" data-work-open="${esc(item.id)}">查看完整记录</button></article>`;}
function recordRowsHtml(items,view,columns="3"){if(!items.length)return `<div class="miwa-work-empty">当前条件下暂无工作记录。</div>`;if(view==="list")return `<div class="miwa-work-table-wrap"><table class="miwa-work-table miwa-work-record-table"><thead><tr><th>完成时间</th><th>工作事项 / 最终结果</th><th>事业 / 项目</th><th>负责人 / 来源</th><th>闭环结果</th><th>有效工时</th><th>证据</th><th>工作总结</th><th>操作</th></tr></thead><tbody>${items.map(recordListRowHtml).join("")}</tbody></table></div>`;return `<div class="miwa-work-card-grid miwa-work-record-card-grid cols-${esc(columns)}">${items.map(recordCardHtml).join("")}</div>`;}
function summaryCardHtml(item){const sm=summaryMeta(item),project=projectLabel(item);return `<article class="miwa-work-summary-card"><div class="miwa-work-summary-card__head"><span>${esc(summaryStatusLabel(item))}</span>${summaryPromotionLabel(item)?`<b>${esc(summaryPromotionLabel(item))}</b>`:""}</div><h3>${esc(sm.title||item.title||"工作总结")}</h3><p>${esc(sm.abstract||finalResultText(item))}</p><div class="miwa-work-summary-card__meta"><span>${esc(businessLabel(item))}${project?` · ${esc(project)}`:""}</span><span>${esc(ownerLabel(item))}</span><span>${esc(dateText(item.completedAt||item.updatedAt))}</span>${sm.version?`<span>${esc(sm.version)}</span>`:""}</div><div class="miwa-work-summary-card__actions">${summaryLinksHtml(item)}<button class="miwa-work-table-action" type="button" data-work-open="${esc(item.id)}">查看原工作</button></div></article>`;}
function summaryListRowHtml(item){const sm=summaryMeta(item),project=projectLabel(item);return `<tr><td>${esc(dateText(item.completedAt||item.updatedAt))}</td><td><strong>${esc(sm.title||item.title||"工作总结")}</strong><small>${esc(sm.abstract||finalResultText(item))}</small></td><td><strong>${esc(businessLabel(item))}</strong><small>${esc(project||contextLabel(item))}</small></td><td>${esc(ownerLabel(item))}</td><td>${esc(summaryPromotionLabel(item)||"个人留存")}</td><td><div class="miwa-work-summary-cell">${summaryLinksHtml(item,{compact:true})}</div></td><td><button class="miwa-work-table-action" type="button" data-work-open="${esc(item.id)}">查看原工作</button></td></tr>`;}
function summaryRowsHtml(items,view,columns="3"){if(!items.length)return `<div class="miwa-work-empty"><strong>当前还没有工作总结</strong><br>普通工作不要求总结。只有你主动认为有意义、有复用价值的工作，才由美和AI起草、本人阅读修改并确认后进入这里。</div>`;if(view==="list")return `<div class="miwa-work-table-wrap"><table class="miwa-work-table"><thead><tr><th>总结时间</th><th>工作成果 / 核心结论</th><th>事业 / 项目</th><th>负责人</th><th>推广范围</th><th>正式资料</th><th>操作</th></tr></thead><tbody>${items.map(summaryListRowHtml).join("")}</tbody></table></div>`;return `<div class="miwa-work-card-grid miwa-work-summary-card-grid cols-${esc(columns)}">${items.map(summaryCardHtml).join("")}</div>`;}
function topValues(values,limit=3){const count=new Map();for(const raw of values){const v=String(raw||"").trim();if(v)count.set(v,(count.get(v)||0)+1);}return [...count.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"zh-CN")).slice(0,limit).map(([v])=>v);}
function aggregatePersonRecords(items){
  const map=new Map();
  for(const item of items){for(const fact of participantFacts(item)){const profile=personProfile(fact.personId);let row=map.get(fact.personId);if(!row){row={personId:fact.personId,profile,responsible:0,participated:0,closed:0,active:0,items:new Set(),businesses:[],projects:[],flows:[]};map.set(fact.personId,row);}row.items.add(String(item.id));if(fact.role==="owner")row.responsible+=1;else row.participated+=1;if(isCompleted(item))row.closed+=1;else row.active+=1;row.businesses.push(businessLabel(item));row.projects.push(projectLabel(item));row.flows.push(workbenchLabel(item));}}
  return [...map.values()].map((row)=>({...row,total:row.items.size,businesses:topValues(row.businesses,2),projects:topValues(row.projects,3),flows:topValues(row.flows,4)})).sort((a,b)=>b.total-a.total||b.closed-a.closed||a.profile.displayName.localeCompare(b.profile.displayName,"zh-CN"));
}
function avatarHtml(profile){const name=profile.displayName||"待确认",initial=profile.initial||name.slice(0,1)||"?",url=String(profile.avatarUrl||"");return `<span class="miwa-work-person-avatar${url?" has-image":""}" aria-label="${esc(name)}">${url?`<img src="${esc(url)}" alt="">`:esc(initial)}</span>`;}
function personSummaryHtml(rows,view="card",{actionLabel="查看工作",buttonAttr="data-team-person",emptyText="当前范围内还没有可汇总的成员工作。"}={}){if(!rows.length)return `<div class="miwa-work-empty">${esc(emptyText)}</div>`;return `<div class="miwa-work-person-grid ${view==="list"?"is-list":""}">${rows.map((r)=>`<article class="miwa-work-person-card"><div class="miwa-work-person-card__head">${avatarHtml(r.profile)}<div><h3>${esc(r.profile.displayName)}</h3><p>${esc(r.profile.primaryWorkIdentity||r.profile.workAssignment?.primaryResponsibility||"")}</p></div><button type="button" ${buttonAttr}="${esc(r.personId)}">${esc(actionLabel)}</button></div><div class="miwa-work-person-card__counts"><span><b>${r.total}</b>工作</span><span><b>${r.responsible}</b>负责</span><span><b>${r.participated}</b>参与</span><span><b>${r.active}</b>当前</span></div><dl><div><dt>主要事业</dt><dd>${esc(r.businesses.join(" / ")||"待归属")}</dd></div><div><dt>主要项目</dt><dd>${esc(r.projects.join(" / ")||"暂无明确项目")}</dd></div><div><dt>主要流程</dt><dd>${esc(r.flows.join(" / ")||"待归属流程")}</dd></div></dl></article>`).join("")}</div>`;}
function teamReferenceDate(item){return dateObject(item.updatedAt||item.startedAt||item.createdAt||item.completedAt);}
function teamItemsInRange(items,range){if(range==="current")return items.filter((item)=>!isCompleted(item));const start=rangeStart(range).getTime();return items.filter((item)=>{const d=teamReferenceDate(item);return Boolean(d&&d.getTime()>=start);});}
function teamShellHtml(){return `<section class="miwa-work-home miwa-work-home--team"><header class="miwa-work-hero miwa-level2-head"><div class="miwa-level2-head__identity"><span class="miwa-level2-head__icon" aria-hidden="true">工</span><div><div class="miwa-work-hero__eyebrow">MIWA GROUP WORK · TEAM</div><h1>团队工作</h1><p>${esc(routeSubtitle("work-team"))}</p></div></div><div class="miwa-level2-head__actions"><a href="${manualHref("work-team")}" class="miwa-level2-head__button miwa-work-guide-link">查看工作手册</a></div></header><section class="miwa-work-records miwa-work-team"><div class="miwa-work-records__controls"><div class="miwa-work-record-range" role="group" aria-label="团队工作范围"><button type="button" data-team-range="current" class="is-active">当前</button><button type="button" data-team-range="week">本周</button><button type="button" data-team-range="month">本月</button><button type="button" data-team-range="year">本年</button></div><div class="miwa-work-view-toggle" data-team-person-view-toggle role="group" aria-label="团队成员显示方式"><button type="button" data-team-person-view="card" class="is-active">卡片</button><button type="button" data-team-person-view="list">列表</button></div><div class="miwa-work-record-actions">${refreshButtonHtml()}</div></div><div class="miwa-work-record-browser-toolbar" data-team-items-toolbar hidden>${workSearchHtml("搜索成员工作…")}<select data-work-status>${STATUS_FILTERS.map(([v,l])=>`<option value="${v}">${v==="all"?"全部状态":l}</option>`).join("")}</select><select data-work-priority>${PRIORITY_FILTERS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select><select data-work-business>${businessOptionsHtml()}</select>${timeFilterHtml()}<div class="miwa-work-filter-actions"><button class="miwa-work-more-filter" type="button" data-work-more-filter>更多筛选 <span data-work-more-count></span></button><button class="miwa-work-reset" type="button" data-work-reset hidden>重置</button></div>${toolbarActionsHtml({sort:true})}</div><div class="miwa-work-browser__advanced miwa-work-record-advanced" data-work-advanced hidden><label>团队<select data-work-team><option value="all">全部团队</option></select></label><label>项目<select data-work-project><option value="all">全部项目</option></select></label><label>时间依据<select data-work-time-basis>${TIME_BASIS_FILTERS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></label><label data-work-custom-date hidden>开始日期<input type="date" data-work-date-from></label><label data-work-custom-date hidden>结束日期<input type="date" data-work-date-to></label><label>金额<select data-work-money>${MONEY_FILTERS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></label><label>最低金额<input type="number" min="0" step="1" data-work-min-amount placeholder="例如 100000"></label><p>团队工作只改变观察入口；具体处理仍回到同一条Work Item。</p></div><div class="miwa-work-records__intro"><div><h2 data-team-title>团队工作目录</h2><p>先看成员工作分布，再进入具体成员的统一工作事项一览。这里帮助协同和资源判断，不做人员评价。</p></div><span data-team-count></span></div><div data-work-error></div><div data-team-content><div class="miwa-work-loading">正在汇总团队工作…</div></div></section><dialog class="miwa-work-detail" data-work-detail><div class="miwa-work-detail-body" data-work-detail-body></div></dialog></section>`;}
function recordsShellHtml(){return `<section class="miwa-work-home miwa-work-home--records"><header class="miwa-work-hero miwa-level2-head"><div class="miwa-level2-head__identity"><span class="miwa-level2-head__icon" aria-hidden="true">${esc(topicMark("work-records"))}</span><div><div class="miwa-work-hero__eyebrow">MIWA GROUP WORK · FACT RECORDS</div><h1>工作记录</h1><p>${esc(routeSubtitle("work-records"))}</p></div></div><div class="miwa-level2-head__actions"><a href="#/work-summaries" class="miwa-level2-head__button">我的总结</a><a href="${manualHref("work-records")}" class="miwa-level2-head__button miwa-work-guide-link">查看工作手册</a></div></header><section class="miwa-work-records"><div class="miwa-work-records__controls"><div class="miwa-work-record-range" role="group" aria-label="完成时间范围"><button type="button" data-record-range="week">本周</button><button type="button" data-record-range="month" class="is-active">本月</button><button type="button" data-record-range="year">本年</button></div><div class="miwa-work-record-actions">${refreshButtonHtml()}</div></div><div class="miwa-work-record-browser-toolbar">${workSearchHtml("搜索工作事项、最终结果、业务对象…")}<select data-work-member aria-label="成员"><option value="all">全部成员</option></select><select data-work-business aria-label="事业">${businessOptionsHtml()}</select><select data-work-summary-filter aria-label="总结状态">${SUMMARY_FILTERS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select><div class="miwa-work-filter-actions"><button class="miwa-work-more-filter" type="button" data-work-more-filter>更多筛选 <span data-work-more-count></span></button><button class="miwa-work-reset" type="button" data-work-reset hidden>重置</button></div>${toolbarActionsHtml({sort:true})}</div><div class="miwa-work-browser__advanced miwa-work-record-advanced" data-work-advanced hidden><label>关系<select data-work-relation><option value="all">全部关系</option><option value="mine">我负责</option><option value="assigned">我布置</option><option value="participant">我参与</option><option value="created">我创建</option></select></label><label>团队<select data-work-team><option value="all">全部团队</option></select></label><label>项目<select data-work-project><option value="all">全部项目</option></select></label><label>金额<select data-work-money>${MONEY_FILTERS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></label><label>最低金额<input type="number" min="0" step="1" data-work-min-amount placeholder="例如 100000"></label></div><div class="miwa-work-records__intro"><div><h2>工作事实一览</h2><p>所有闭环工作都可以留下事实；只有少数有意义、有复用价值的工作才额外形成工作总结。事实与总结不重复维护。</p></div><span data-record-count></span></div><div data-work-error></div><div data-record-content><div class="miwa-work-loading">正在读取工作事实…</div></div><div data-work-pagination-host></div></section><dialog class="miwa-work-detail" data-work-detail><div class="miwa-work-detail-body" data-work-detail-body></div></dialog></section>`;}
function summariesShellHtml(){return `<section class="miwa-work-home miwa-work-home--summaries"><header class="miwa-work-hero miwa-level2-head"><div class="miwa-level2-head__identity"><span class="miwa-level2-head__icon" aria-hidden="true">${esc(topicMark("work-summaries"))}</span><div><div class="miwa-work-hero__eyebrow">MIWA GROUP WORK · MY SUMMARIES</div><h1>我的总结</h1><p>${esc(routeSubtitle("work-summaries"))}</p></div></div><div class="miwa-level2-head__actions"><a href="#/work-records" class="miwa-level2-head__button">工作记录</a><a href="${manualHref("work-summaries")}" class="miwa-level2-head__button miwa-work-guide-link">查看工作手册</a></div></header><section class="miwa-work-summary-library"><div class="miwa-work-summary-library__principle"><strong>主动总结，不强制写报告</strong><span>有价值的真实工作 → 美和AI起草 → 本人阅读判断 / 适当修改 → 确认后关联Google Docs与A4 PDF。</span></div><div class="miwa-work-record-browser-toolbar">${workSearchHtml("搜索我的工作总结…")}<select data-work-business aria-label="事业">${businessOptionsHtml()}</select>${timeFilterHtml()}${toolbarActionsHtml({sort:true})}</div><div class="miwa-work-records__intro"><div><h2>工作总结一览</h2><p>这里只显示已经存在真实总结信息的工作；本版不会把普通已完成工作伪装成工作总结。</p></div><span data-summary-count></span></div><div data-work-error></div><div data-summary-content><div class="miwa-work-loading">正在读取我的总结…</div></div><div data-work-pagination-host></div></section><dialog class="miwa-work-detail" data-work-detail><div class="miwa-work-detail-body" data-work-detail-body></div></dialog></section>`;}


function publicationNineQuestions(){const nine=[["01","要做什么？","工作内容"],["02","为什么要做？","原因与业务价值"],["03","属于哪里？","事业、流程与工作台"],["04","和什么有关？","商品、订单、客户等对象"],["05","谁来负责？","最终负责人和执行者"],["06","现在到哪一步？","当前状态"],["07","应该先做还是后做？","优先级"],["08","下一步做什么？","Next Action"],["09","怎样才算真正完成？","验收标准与闭环"]];return `<div class="miwa-publication-editorial-grid cols-3 compact">${nine.map(([n,q,a],i)=>`<article class="miwa-publication-editorial-card is-compact ${i%3===1?"tone-red":"tone-green"}"><span>${n}</span><h3>${esc(q)}</h3><p>${esc(a)}</p></article>`).join("")}</div>`;}
function guideStepsHtml(steps=[]){return `<div class="miwa-work-guide-steps">${steps.map((s,i)=>`<article><span>STEP ${String(i+1).padStart(2,"0")}</span><h3>${esc(s[0])}</h3><p>${esc(s[1])}</p>${s[2]||""}</article>`).join("")}</div>`;}
function guideLink(route,label){return `<a class="miwa-work-guide-action" href="#/${esc(route)}">${esc(label)} →</a>`;}
function miniWorkCard({title="工作事项",meta="美和跨境 · 进行中",next="确认下一步",follow=false}={}){return `<div class="miwa-work-guide-demo"><div><span>${esc(meta)}</span><strong>${esc(title)}</strong><p>下一步：${esc(next)}</p></div>${follow?`<b>☆ 关注</b>`:`<b>处理</b>`}</div>`;}
function overviewHtml(items,mode){
  const m=metrics(items),businessCounts=MIWA_BUSINESSES.map(b=>[b.name,items.filter(x=>inferBusinessCode(x)===b.id&&!isCompleted(x)).length]).filter(([,n])=>n>0).slice(0,6);
  const businessHtml=businessCounts.length?businessCounts.map(([name,n])=>`<article class="miwa-publication-editorial-card tone-green is-compact"><span>事业工作</span><h3>${esc(name)}</h3><p>${n} 项当前工作</p></article>`).join(""):`<article class="miwa-publication-editorial-card tone-green is-compact"><span>事业工作</span><h3>当前暂无事业工作摘要</h3><p>事业工作产生后会在这里形成动态索引。</p></article>`;
  const cover=publicationCover({title:"工作之家",englishTitle:"MIWA WORK HOME",subtitle:"美和集团所有需要被完成的工作的统一入口、执行中枢与工作事实来源。",statement:"理解工作 · 找到工作 · 推进工作 · 关注动态 · 验收结果 · 沉淀事实",bookLabel:"美和工作手册",version:"V2.0",visualHtml:`<span class="miwa-work-book-cover-icon" data-icon="work" aria-hidden="true"></span>`});
  const back=publicationBackCover({title:"关于《美和工作手册》",summary:"这不是一页文字说明，而是工作之家的场景数字手册：前半部分解释底层方法，后半部分严格按照Sidebar顺序说明每个页面怎样使用，并提供简单操作演示和直接入口。",contents:["理解工作之家","美和工作9问","今日 / 全部 / 关注","建议 / 创新","事业 / 等待 / 异常","验收 / 工作记录"],audiences:["集团成员","事业负责人","项目参与者","AI与自动化设计者"],bookLabel:"美和工作手册",version:"V2.0",visualHtml:`<span class="miwa-work-book-cover-icon" data-icon="work" aria-hidden="true"></span>`});
  const page2=publicationPage({pageNumber:2,section:"PART 01｜第01章 工作之家是什么",title:"工作之家不是任务仓库，而是美和集团统一的工作事实与执行入口",lead:"无论工作来自人、美和AI、业务流程、异常还是未来外部系统，只要需要采取行动并产生结果，就进入同一 Work Item。",content:`<div class="miwa-publication-editorial-grid cols-3"><article class="miwa-publication-editorial-card tone-green"><span>01</span><h3>一份工作事实</h3><p>工作台、事业、项目、团队和个人查看的是同一条 Work Item，不重复建任务。</p></article><article class="miwa-publication-editorial-card tone-red"><span>02</span><h3>多种观察视图</h3><p>我的工作、全部、关注、事业、团队等页面只改变查询条件，不重新建立一套任务。</p></article><article class="miwa-publication-editorial-card tone-green"><span>03</span><h3>真正闭环</h3><p>执行完成后还要经过结果、证据、验收和业务状态同步，才能成为组织事实。</p></article></div>`,conclusion:"后台负责结构化与自动整理，前台只让人清楚知道公司在做什么、跟自己有什么关系、下一步是什么。",bookLabel:"美和工作手册",version:"V2.0"});
  const page3=publicationPage({pageNumber:3,section:"PART 01｜第02章 为什么需要工作之家",title:"工作越来越多以后，真正危险的不是忙，而是遗漏、混乱和失去闭环",lead:"AIONE不要求员工把精力花在整理系统上。美和AI持续整理，人负责需要判断、执行和承担结果的部分。",content:`<div class="miwa-publication-editorial-grid cols-2"><article class="miwa-publication-editorial-card tone-green"><span>不遗漏</span><h3>所有需要行动的事情统一收口</h3><p>等待、阻塞、待验收和下一次检查由系统持续跟踪，不依赖个人记忆。</p></article><article class="miwa-publication-editorial-card tone-red"><span>不混乱</span><h3>透明与推送分开</h3><p>看得到 ≠ 要处理 ≠ 能操作；公司可以透明，但只把真正相关的工作推给你。</p></article><article class="miwa-publication-editorial-card tone-green"><span>有重点</span><h3>我的工作回答“现在、过去未完与未来安排分别是什么”</h3><p>优先级、时间、依赖、经营影响和未来产能共同决定工作顺序。</p></article><article class="miwa-publication-editorial-card tone-red"><span>有结果</span><h3>完成不等于闭环</h3><p>没有结果事实、证据和验收的“已完成”，不能成为经营证据。</p></article></div>`,conclusion:"系统负责放大正确的方法，而不是放大混乱。",bookLabel:"美和工作手册",version:"V2.0"});
  const page4=publicationPage({pageNumber:4,section:"PART 01｜第03章 美和工作9问｜验证中",title:"九个问题，先作为工作事项结构与AI补全框架持续验证",lead:"美和工作9问目前处于验证中：先服务Work Item结构和美和AI整理，真实使用一段时间后再判断是否正式纳入美和方法论。",content:publicationNineQuestions(),conclusion:"先真实运行、形成证据，再形成标准；当前不把候选框架提前锁成正式方法论。",bookLabel:"美和工作手册",version:"V2.0"});
  const flow=["发现工作","AI整理","确定责任","判断优先","明确下一步","执行推进","等待 / 阻塞","验收","闭环"];
  const page5=publicationPage({pageNumber:5,section:"PART 01｜第04章 工作如何流动",title:"从发现到闭环，每一步都有明确状态和责任",lead:"状态机保持简单，风险、超期和优先级作为属性存在，不把所有概念都塞进状态。",content:`<div class="miwa-publication-process-grid">${flow.map((x,i)=>`<span><b>${String(i+1).padStart(2,"0")}</b>${esc(x)}</span>`).join("")}</div><div class="miwa-publication-editorial-note"><strong>关键规则</strong><p>WAITING 是正常等待；BLOCKED 是异常阻塞。CLOSED 原则上不重新打开，新问题建立新的关联工作事项。</p></div>`,conclusion:"流程负责推动业务状态，Work Item 负责推动人和AI行动。",bookLabel:"美和工作手册",version:"V2.0"});
  const page6=publicationPage({pageNumber:6,section:"PART 01｜第05章 人与美和AI",title:"员工负责完成工作，美和AI负责让工作系统长期保持整洁",lead:"AI不是聊天框，而是持续运行的整理层：识别、去重、分类、排序、提醒、发现阻塞、准备下一步和辅助验收。",content:`<div class="miwa-publication-editorial-grid cols-2"><article class="miwa-publication-editorial-card tone-green"><span>HUMAN</span><h3>人负责目标、关键判断、重大异常与最终结果</h3><p>AI可以执行和建议，但关键业务必须保留明确的人类最终负责人。</p></article><article class="miwa-publication-editorial-card tone-red"><span>MIWA AI</span><h3>AI负责持续整理、辅助判断与可标准化执行</h3><p>能够规则化的规则化，能够自动化的自动化，需要判断的交给AI，需要负责的留给人。</p></article></div>`,conclusion:"员工不负责维护复杂任务系统；AI先整理，只有无法确定的事实才向人请求确认。",bookLabel:"美和工作手册",version:"V2.0"});
  const page7=publicationPage({pageNumber:7,section:"PART 01｜第06章 工作如何组织",title:"事业是主要工作边界；全部工作保持集团透明，关注负责跨边界连接",lead:"跨境团队日常优先看美和跨境；其他事业默认不干扰，但任何人仍可查看并主动关注。",content:`<div class="miwa-publication-editorial-grid cols-3"><article class="miwa-publication-editorial-card tone-green"><span>事业</span><h3>默认工作视野</h3><p>按事业聚合工作，避免不相关内容长期占用员工注意力。</p></article><article class="miwa-publication-editorial-card tone-red"><span>全部工作</span><h3>集团透明入口</h3><p>公司内部默认可以了解其他事业在做什么；敏感事项例外。</p></article><article class="miwa-publication-editorial-card tone-green"><span>关注</span><h3>主动建立相关性</h3><p>关注后订阅重要工作变化，但不改变负责人、待办和操作权限。</p></article></div>`,conclusion:"事业解决默认边界，关注解决主动跨界，全部工作解决组织透明。",bookLabel:"美和工作手册",version:"V2.0"});
  const page8=publicationPage({pageNumber:8,section:"PART 01｜第07章 工作之家与美和日历",title:"Work Item 管“做什么”，美和日历管“什么时候做”",lead:"美和日历不是第二套任务系统，而是工作事项在时间维度上的投影。",content:`<div class="miwa-publication-editorial-grid cols-2"><article class="miwa-publication-editorial-card tone-green"><span>WORK</span><h3>工作之家</h3><p>负责人、业务归属、下一步、优先级、等待/阻塞、验收和闭环。</p></article><article class="miwa-publication-editorial-card tone-red"><span>TIME</span><h3>美和日历</h3><p>工作时间块、关键截止点、next_review_at 检查节点和工作进程时间线。</p></article></div>`,conclusion:"一份数据，多种视图；不是所有工作都进入日历，只有明确时间节点才投影。",bookLabel:"美和工作手册",version:"V2.0"});
  const page9=publicationPage({pageNumber:9,manualSection:"work-mine",section:"PART 02｜第08章 我的工作怎么用",title:"我的工作｜从过去未完、当前应办到未来安排连续管理",lead:"我的工作不是“日期=今天”的机械列表，而是当前用户连续工作的统一入口。工作跨天不消失，并按今日以前、当前工作、今日以后帮助定位。",content:`${guideStepsHtml([["先看三个时间范围","今日以前处理过去应推进但仍未闭环的工作；当前工作聚焦现在需要行动、判断或跟进的事项；今日以后查看未来安排。",miniWorkCard({title:"确认供应商报价",next:"确认MOQ与最早交期"})],["点击处理","进入工作详情，按下一步行动推进并留下结果或证据。",""],["不能闭环就留下下一步","无法当天闭环时，明确等待原因、下一检查时间或下一步，不让工作跨天后消失。",guideLink("work-mine","进入我的工作")]])}`,conclusion:"没有特别管理意图时，工作之家默认进入我的工作。",bookLabel:"美和工作手册",version:"V2.0 · 验证中"});
  const page10=publicationPage({pageNumber:10,manualSection:"work-all",section:"PART 02｜第09章 全部工作怎么用",title:"全部工作｜需要查找、比较和管理大量工作时使用",lead:"全部工作是集团透明入口，也是搜索、时间、高频/更多筛选、排序、列表/卡片显示最完整的Work Item Browser。",content:`${guideStepsHtml([["先搜索","知道工作名、对象、负责人或下一步时，直接搜索最快。",""],["再用时间和筛选","常用条件优先显示；团队、项目、金额等放进更多筛选，重置恢复当前入口默认条件。",""],["按习惯选择显示方式","列表适合横向比较；卡片可选择2/3/4/6列，系统记住最近选择并按Main宽度自动保护可读性。",guideLink("work-all","进入全部工作")]])}`,conclusion:"入口服务查找意图，处理始终回到同一条真实Work Item。",bookLabel:"美和工作手册",version:"V2.0"});
  const page11=publicationPage({pageNumber:11,manualSection:"work-following",section:"PART 02｜第10章 我的关注怎么用",title:"我的关注｜持续跟踪重要工作，但不改变责任关系",lead:"看到其他事业或项目中值得持续了解的工作，可以关注；它不会进入你的待办，也不会改变权限。",content:`${guideStepsHtml([["找到想持续了解的工作","在全部工作或事业工作中找到工作事项。",miniWorkCard({title:"美和留学业务流程规划",meta:"美和留学 · 进行中",next:"确认第一版业务闭环",follow:true})],["点击 ☆ 关注","关注成功后，按钮变成 ★ 已关注。",""],["进入我的关注","这里只调用同一个工作事项一览，并过滤为你已关注的工作。",guideLink("work-following","查看我的关注")]])}`,conclusion:"关注负责跨边界连接；点赞是主动认可的互动记录。透明不等于打扰。",bookLabel:"美和工作手册",version:"V2.0"});
  const page12=publicationPage({pageNumber:12,manualSection:"work-contributions",section:"PART 02｜第11章 我的建议与我的创新",title:"我的建议 / 我的创新｜主动改善与创造新的可能",lead:"改善现状进入建议；创造新的可能进入创新。个人从工作之家提出和跟踪，集团归口机制另由对应中心承接。",content:`<div class="miwa-publication-editorial-grid cols-2"><article class="miwa-publication-editorial-card tone-green"><span>建议</span><h3>哪里可以做得更好？</h3><p>建议被受理后再进入Work Item / Project执行；未采用也应有明确结论。</p>${guideLink("work-suggestions","进入我的建议")}</article><article class="miwa-publication-editorial-card tone-red"><span>创新</span><h3>还有什么新的可能？</h3><p>创新不局限于AI，要经过真实业务验证，再决定是否形成正式方法、产品、Skill或自动化。</p>${guideLink("work-innovations","进入我的创新")}</article></div>`,conclusion:"建议不能没有去处，创新不能没有验证。",bookLabel:"美和工作手册",version:"V2.0"});
  const page13=publicationPage({pageNumber:13,manualSection:"work-business",section:"PART 02｜第12章 事业工作怎么用",title:"事业工作｜按事业进入当前最关心的经营现场",lead:"事业工作强调经营边界。特别关心某个事业时，直接进入该事业；没有特别管理意图时仍回到我的工作。",content:`${guideStepsHtml([["进入当前事业","跨境团队优先看美和跨境；新启动美和留学时，也可以直接从事业入口进入。",""],["只看本事业工作","页面继续调用统一Work Item Browser，只预设事业条件。",""],["查看更多事业","常用事业放Sidebar，其他事业进入“更多事业”；真正相关的工作可继续关注。",guideLink("work-business-crossborder","查看美和跨境工作")]])}`,conclusion:"我的工作回答“我现在及前后安排是什么”，事业工作回答“这个事业现在在做什么”。",bookLabel:"美和工作手册",version:"V2.0"});
  const page14=publicationPage({pageNumber:14,manualSection:"work-team",section:"PART 02｜第13章 团队工作怎么用",title:"团队工作｜从成员视角理解工作分布、重点与推进情况",lead:"团队工作回答“大家现在分别在做什么”。先看成员工作分布，再进入某个成员的统一Work Item Browser；这里不做人员评价。",content:`${guideStepsHtml([["选择当前或周期","默认看当前工作；需要回看阶段活动时切换本周 / 本月 / 本年。",""],["查看成员工作分布","成员卡读取统一人员资料和真实Work Item关系，不维护第二份人员数据。",""],["进入成员工作","点击“查看工作”后继续使用统一Work Item Browser搜索、筛选和处理。",guideLink("work-team","进入团队工作")]])}`,conclusion:"团队工作是管理和协同入口，不是绩效页面；人才相关关系等人才之家开发时再单独设计。",bookLabel:"美和工作手册",version:"V2.0"});
  const page15=publicationPage({pageNumber:15,manualSection:"work-waiting",section:"PART 02｜状态说明01 等待中",title:"等待中｜正常等待外部结果，但必须知道什么时候回来检查",lead:"供应商回复、平台审核、物流更新、客户确认等都可以进入等待中；系统不应让等待事项永久沉底。",content:`${guideStepsHtml([["明确在等什么","等待原因必须可理解，不能只写“等一下”。",""],["明确检查时间","使用next_review_at或计划时间，到点重新进入工作范围。",""],["有结果就恢复推进","收到结果后继续原Work Item，不另建一套任务。",guideLink("work-all","进入全部工作筛选")]])}`,conclusion:"等待不依赖个人记忆。",bookLabel:"美和工作手册",version:"V2.0"});
  const page16=publicationPage({pageNumber:16,manualSection:"work-blocked",section:"PART 02｜状态说明02 异常处理",title:"异常处理｜集中解决真正阻止工作继续推进的问题",lead:"后台可以保留BLOCKED、errorCode等精确事实；前台统一用“异常处理”告诉员工：这里需要解决问题。",content:`${guideStepsHtml([["确认异常事实","区分业务阻塞、数据问题、系统错误、权限问题等。",""],["找到解决路径","美和AI可以给方案，但重大风险和最终责任仍由人承担。",""],["异常解除后继续原工作","恢复执行，不把异常处理变成第二套工作系统。",guideLink("work-all","进入全部工作筛选")]])}`,conclusion:"异常必须有人处理，也必须能够回到原工作继续推进。",bookLabel:"美和工作手册",version:"V2.0"});
  const page17=publicationPage({pageNumber:17,manualSection:"work-review",section:"PART 02｜状态说明03 待验收",title:"待验收｜“我做完了”只是提交结果，验收通过才真正闭环",lead:"待验收集中处理执行者已经提交结果、但业务责任尚未最终确认的工作。",content:`${guideStepsHtml([["查看执行结果","确认工作目标、结果摘要和实际证据。",""],["按美和工作9问检查","特别确认“怎样才算真正完成”是否满足。",""],["验收或退回继续处理","验收通过后形成闭环事实；不足则继续推进。",guideLink("work-all","进入全部工作筛选")]])}`,conclusion:"完成率和闭环率不是一回事；管理更应该关注后者。",bookLabel:"美和工作手册",version:"V2.0"});
  const page18=publicationPage({pageNumber:18,manualSection:"work-records",section:"PART 02｜第17章 工作记录与工作总结",title:"工作记录｜保存真实事实；有价值的工作再主动形成总结",lead:"所有闭环工作都可以留下真实事实，但普通工作不要求总结。只有少数有意义、有复用价值的成果，由本人主动发起，美和AI起草，人阅读判断、适当修改并确认。",content:`${guideStepsHtml([["先查真实事实","用本周 / 本月 / 本年、成员、事业等条件回看已闭环工作。",""],["有价值再总结","不是每项工作都写报告。值得留下的成果才形成总结，并继续关联Google Docs可编辑稿与A4 PDF归档稿。",""],["需要时再推广","上级可以洞察哪些总结值得团队或集团推广；推广范围和渠道属于后续正式组织能力，不在本版伪造数据。",guideLink("work-summaries","进入我的总结")]])}`,conclusion:"工作记录是事实账本；工作总结是少数高价值事实上的可选成果层。",bookLabel:"美和工作手册",version:"V2.0 · 验证中"});
  const page19=publicationPage({pageNumber:19,section:"附录｜当前工作动态",title:"让组织自己保持同步，而不是靠反复开会广播信息",lead:`${mode==="database"?"当前读取AIONE正式工作事实。":"正式Backend暂未连接，当前使用本地预览工作记录。"} 工作动态帮助成员快速知道公司正在推进什么、哪里异常、最近有什么成果。`,content:`<div class="miwa-work-publication-kpis"><div><span>当前可见</span><strong>${m.total}</strong></div><div><span>今日建议</span><strong>${m.today}</strong></div><div><span>我的关注</span><strong>${m.following}</strong></div><div class="${m.blocked?"is-risk":""}"><span>异常</span><strong>${m.blocked}</strong></div><div><span>待验收</span><strong>${m.review}</strong></div><div><span>已闭环</span><strong>${m.completed}</strong></div></div><div class="miwa-publication-editorial-grid cols-2 compact">${businessHtml}</div>`,conclusion:"概览负责理解，我的工作负责个人连续执行，事业负责经营聚焦，团队负责协同，工作记录负责历史事实与总结关联。",bookLabel:"美和工作手册",version:"V2.0"});
  const page20=publicationPage({pageNumber:20,manualSection:"work-overview",section:"附录｜场景手册深链",title:"从哪里需要帮助，就直接定位到工作手册对应主标题",lead:"页面副标题负责马上理解；“查看工作手册”负责深入理解。用户不再先回到封面再翻目录。",content:`<div class="miwa-publication-editorial-grid cols-2"><article class="miwa-publication-editorial-card tone-green"><span>页面</span><h3>当前工作现场</h3><p>我的工作、全部工作、事业工作、团队工作、关注、总结和工作记录都拥有明确的一句话职责。</p></article><article class="miwa-publication-editorial-card tone-red"><span>手册</span><h3>对应章节主标题</h3><p>点击“查看工作手册”直接滚动到这一页对应章节；知识之家、电子出版中心和帮助中心的最终定位等后续正式开发时再统一梳理。</p></article></div>`,conclusion:"帮助不脱离业务现场；本版本只锁定工作之家场景深链，不扩展知识之家工程。",bookLabel:"美和工作手册",version:"V2.0"});
  return `<article class="miwa-work-manual miwa-publication-book" data-publication-book="work-home">${publicationCoverSpread(cover,back)}${publicationSpread(page2,page3,"work-chapters-01-02")}${publicationSpread(page4,page5,"work-chapters-03-04")}${publicationSpread(page6,page7,"work-chapters-05-06")}${publicationSpread(page8,page9,"work-chapters-07-08")}${publicationSpread(page10,page11,"work-chapters-09-10")}${publicationSpread(page12,page13,"work-chapters-11-12")}${publicationSpread(page14,page15,"work-chapters-13-14")}${publicationSpread(page16,page17,"work-chapters-15-16")}${publicationSpread(page18,page19,"work-chapter-17-appendix")}${publicationSingle(page20)}</article>`;

}

function evidenceTypeLabel(v){return ({completion:"完成证据",review:"确认记录",ai_review:"美和AI复盘",execution_note:"执行记录",link:"证据链接",file:"文件证据"})[v]||v||"执行记录";}
function safeHref(v){try{const u=new URL(String(v||""),window.location.href);return ["http:","https:"].includes(u.protocol)?u.href:"";}catch(_){return "";}}
function publishWorkContext(detail=null){window.AIONEWorkExecutionContext=detail?{generatedAt:new Date().toISOString(),workItem:detail.workItem,evidence:detail.evidence||[],results:detail.results||[],permissions:detail.permissions||{},following:Boolean(detail.following),liked:Boolean(detail.liked),likeCount:Number(detail.likeCount||0)||0}:null;window.dispatchEvent(new CustomEvent("aione:work-detail-context-change",{detail:window.AIONEWorkExecutionContext}));}
function evidenceHtml(items=[]){if(!items.length)return `<div class="miwa-work-detail-empty">还没有执行证据。开始执行后，可持续记录说明、链接、文件位置和关键结果。</div>`;return items.map(i=>`<article class="miwa-work-evidence"><div><strong>${esc(evidenceTypeLabel(i.evidenceType))}</strong><span>${esc(dateText(i.happenedAt||i.createdAt))}</span></div><p>${esc(i.summary||"—")}</p>${safeHref(i.evidenceUri)?`<a href="${esc(safeHref(i.evidenceUri))}" target="_blank" rel="noopener">打开证据 ↗</a>`:""}</article>`).join("");}
function resultsHtml(items=[]){if(!items.length)return `<div class="miwa-work-detail-empty">尚未形成结果事实。</div>`;return items.map(i=>`<article class="miwa-work-result"><div><strong>${esc(i.resultType||"工作结果")}</strong><span>${esc(i.status||"observed")}</span></div><p>${esc(i.textValue||i.numericValue||"—")}</p></article>`).join("");}
function workNineHtml(item){const facts=item.metadata?.structuredFacts||item.metadata||{};const where=facts.where||[businessLabel(item),workbenchLabel(item)].filter(Boolean).join(" · ")||"待补充业务归属",related=facts.related||relatedLabel(item),qs=[["01","要做什么？",facts.what||item.title||"待补充工作标题"],["02","为什么要做？",facts.why||facts.workReason||item.goalSummary||item.description||"待补充工作原因"],["03","属于哪里？",where],["04","和什么有关？",related],["05","谁来负责？",ownerLabel(item)],["06","现在到哪一步？",statusLabel(item.status)],["07","应该先做还是后做？",`${priorityLabel(item.priority)}${item.dueAt?` · 截止 ${dateText(item.dueAt)}`:""}${isOverdue(item)?" · 已超期":""}`],["08","下一步做什么？",facts.nextAction||nextAction(item)],["09","怎样才算真正完成？",facts.acceptanceCriteria||acceptanceCriteria(item)]];return `<section class="miwa-work-nine"><div class="miwa-work-nine__head"><div><span>MIWA WORK 9 QUESTIONS</span><h3>美和工作9问</h3></div><p>全部答案读取同一条Work结构化事实；页面不再自行猜测负责人、归属或关联对象。</p></div><div class="miwa-work-nine__grid">${qs.map(([n,q,a])=>`<article><span>${n}</span><h4>${esc(q)}</h4><p>${esc(a)}</p></article>`).join("")}</div></section>`;}
function detailHtml(detail){const item={...(detail.workItem||{}),isLiked:Boolean(detail.liked),likeCount:Number(detail.likeCount||0)||0,moneySummary:Array.isArray(detail.moneySummary)?detail.moneySummary:[],activeSeconds:Number(detail.activeSeconds||0)||0},p=detail.permissions||{};return `<div class="miwa-work-detail-head"><div><span>WORK EXECUTION</span><h2>${esc(item.title||"工作事项")}</h2><p>${esc(item.description||item.goalSummary||"暂无补充说明")}</p></div><div class="miwa-work-detail-head__actions">${likeButton(item)}${followButton({...item,isFollowing:Boolean(detail.following)},true)}<button type="button" class="miwa-work-detail-close" data-work-detail-close aria-label="关闭">×</button></div></div><div class="miwa-work-detail-meta"><span>状态 <b>${esc(statusLabel(item.status))}</b></span><span>优先级 <b>${esc(priorityLabel(item.priority))}</b></span><span>负责人 <b>${esc(ownerLabel(item))}</b></span><span>事业 <b>${esc(businessLabel(item))}</b></span><span>关系 <b>${esc(relationLabel({...item,isFollowing:Boolean(detail.following),isParticipant:Boolean(detail.participantRoles?.length),participantRole:detail.participantRoles?.[0]||""}))}</b></span></div><div class="miwa-work-detail-timeline"><span class="${["in_progress","waiting","completed"].includes(item.status)?"is-done":"is-current"}">待开始</span><span class="${["waiting","completed"].includes(item.status)?"is-done":item.status==="in_progress"?"is-current":""}">执行中</span><span class="${item.status==="completed"?"is-done":item.status==="waiting"?"is-current":""}">待验收</span><span class="${item.status==="completed"?"is-current":""}">已闭环</span></div>${workNineHtml(item)}<div class="miwa-work-detail-grid"><section><h3>执行证据</h3><div class="miwa-work-evidence-list">${evidenceHtml(detail.evidence)}</div></section><section><h3>结果事实</h3><div class="miwa-work-result-list">${resultsHtml(detail.results)}</div>${item.resultSummary?`<div class="miwa-work-result-summary"><b>当前结果</b><p>${esc(item.resultSummary)}</p></div>`:""}</section></div><div class="miwa-work-detail-actions">${p.canStart?`<button class="primary" type="button" data-work-action="start">开始执行</button>`:""}${p.canAddEvidence?`<button type="button" data-work-toggle="evidence">添加执行记录</button>`:""}${p.canSubmitCompletion?`<button type="button" data-work-toggle="complete">提交完成</button>`:""}${p.canApproveCompletion?`<button class="primary" type="button" data-work-toggle="approve">确认完成</button>`:""}${p.canAIReview?`<button type="button" data-work-action="ai-review">让美和AI复盘</button>`:""}${!p.canStart&&!p.canAddEvidence&&!p.canSubmitCompletion&&!p.canApproveCompletion?`<span class="miwa-work-readonly-note">当前为查看/关注关系，无执行权限。</span>`:""}</div><form class="miwa-work-detail-form" data-work-evidence-form hidden><label>执行说明<textarea name="summary" rows="3" placeholder="记录做了什么、发生了什么、下一步是什么"></textarea></label><label>证据链接 / 文件地址（可选）<input name="evidenceUri" placeholder="Google Drive、AIONE页面或其他可追溯地址"></label><div><button type="button" data-work-form-cancel="evidence">取消</button><button class="primary" type="submit">保存执行记录</button></div></form><form class="miwa-work-detail-form" data-work-complete-form hidden><label>执行结果<textarea name="resultSummary" rows="4" required placeholder="明确说明完成了什么、结果是否达到目标、还有什么遗留问题"></textarea></label><label>完成证据说明（可选）<textarea name="evidenceSummary" rows="2"></textarea></label><label>证据链接 / 文件地址（可选）<input name="evidenceUri"></label><div><button type="button" data-work-form-cancel="complete">取消</button><button class="primary" type="submit">提交结果</button></div></form><form class="miwa-work-detail-form" data-work-approve-form hidden><label>确认意见<textarea name="reviewSummary" rows="3">确认执行结果，工作完成。</textarea></label><div><button type="button" data-work-form-cancel="approve">取消</button><button class="primary" type="submit">确认完成</button></div></form>`;}

function batchShellHtml(){return `<section class="miwa-work-home miwa-work-home--batch"><header class="miwa-work-hero miwa-level2-head"><div class="miwa-level2-head__identity"><span class="miwa-level2-head__icon" aria-hidden="true">批</span><div><div class="miwa-work-hero__eyebrow">WORK SEED → PROPOSAL → WORK</div><h1>批量安排工作</h1><p>人工只提供最少原始事实，美和AI补全后先生成待确认方案，不直接创建正式工作。</p></div></div><div class="miwa-level2-head__actions"><button class="miwa-level2-head__button" type="button" data-work-template>下载极简模板</button><a class="miwa-level2-head__button" href="#/work-assigned">我安排的</a></div></header><section class="miwa-work-batch-flow"><span>1 导入工作种子</span><span>2 AI补全</span><span>3 Proposal预览</span><span>4 批量批准并派发</span></section><section class="miwa-work-batch-import"><div><h2>导入本地表格</h2><p>模板只有五列：工作安排（必填）、负责人、时间要求、关联资料、备注。CSV 可直接使用 Excel/WPS 编辑。</p></div><label class="miwa-work-batch-file">选择 CSV 文件<input type="file" accept=".csv,text/csv" data-work-seed-file></label><button class="miwa-level2-head__button is-primary" type="button" data-work-seed-import disabled>生成 Proposal 预览</button></section><div data-work-batch-message></div><section class="miwa-work-batch-preview" data-work-batch-preview hidden><div class="miwa-work-batch-preview__head"><div><h2>Proposal 预览</h2><p data-work-batch-count></p></div><button class="miwa-level2-head__button is-primary" type="button" data-work-batch-approve>批量批准并派发</button></div><div data-work-batch-table></div></section></section>`;}
function parseCsv(text){const rows=[];let row=[],cell="",quoted=false;for(let i=0;i<text.length;i+=1){const c=text[i],n=text[i+1];if(c==='"'&&quoted&&n==='"'){cell+='"';i+=1;}else if(c==='"'){quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell="";}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&n==='\n')i+=1;row.push(cell);if(row.some((v)=>String(v).trim()))rows.push(row);row=[];cell="";}else cell+=c;}row.push(cell);if(row.some((v)=>String(v).trim()))rows.push(row);if(!rows.length)return[];const headers=rows.shift().map((v)=>String(v).replace(/^\uFEFF/,"").trim());return rows.map((values)=>Object.fromEntries(headers.map((h,i)=>[h,String(values[i]||"").trim()])));}
function resolveSeedRows(rows){return rows.map((row)=>{const responsible=String(row["负责人"]||"").trim();const profile=PREVIEW_IDENTITIES.find((person)=>person.displayName===responsible||person.email===responsible||String(person.subjectId)===responsible);return {workRequest:row["工作安排"],responsible,responsiblePersonId:profile?.subjectId||"",timeRequirement:row["时间要求"],relatedMaterial:row["关联资料"],notes:row["备注"]};});}
function proposalTableHtml(items=[]){if(!items.length)return `<div class="miwa-work-empty">尚未生成待确认方案。</div>`;return `<div class="miwa-work-table-wrap"><table class="miwa-work-table"><thead><tr><th>选择</th><th>状态</th><th>工作事项</th><th>负责人</th><th>归属</th><th>优先级</th><th>完成标准</th></tr></thead><tbody>${items.map((p)=>{const facts=p.structuredFacts||{};const ready=p.status==="waiting_confirmation";return `<tr><td><input type="checkbox" data-work-proposal-id="${esc(p.id)}" ${ready?"checked":"disabled"}></td><td><span class="miwa-work-table-status">${ready?"可派发":"待确认"}</span></td><td><strong>${esc(p.title)}</strong><small>${esc(facts.nextAction||"")}</small></td><td>${esc(personName(p.responsiblePersonId,p.responsibleInput))}</td><td>${esc(facts.where||"待确认")}</td><td>${esc(priorityLabel(p.priority))}</td><td>${esc(p.expectedResult||facts.acceptanceCriteria||"待确认")}</td></tr>`;}).join("")}</tbody></table></div>`;}
function downloadWorkSeedTemplate(){const content="\uFEFF工作安排,负责人,时间要求,关联资料,备注\r\n补货ZSQ027黄色10个并合并空运到日暮里,于硕,尽快,ZSQ027,保留发运凭证\r\n";const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="AIONE工作种子极简模板.csv";link.click();URL.revokeObjectURL(url);}

async function initBatchWork(host){let rows=[],batchId="",proposals=[];const file=host.querySelector("[data-work-seed-file]"),button=host.querySelector("[data-work-seed-import]"),message=host.querySelector("[data-work-batch-message]"),preview=host.querySelector("[data-work-batch-preview]"),table=host.querySelector("[data-work-batch-table]"),count=host.querySelector("[data-work-batch-count]");host.querySelector("[data-work-template]")?.addEventListener("click",downloadWorkSeedTemplate);file?.addEventListener("change",async()=>{const selected=file.files?.[0];rows=selected?resolveSeedRows(parseCsv(await selected.text())):[];button.disabled=!rows.length;message.innerHTML=rows.length?`<div class="miwa-work-batch-message">已读取 ${rows.length} 条工作种子。导入后仍需确认，不会直接派发。</div>`:`<div class="miwa-work-error">未读取到有效数据，请使用标准五列表头。</div>`;});button?.addEventListener("click",async()=>{try{button.disabled=true;message.innerHTML=`<div class="miwa-work-batch-message">美和AI正在补全工作事实…</div>`;const result=await aioneApi("/api/v1/work-home/batch/seeds",{method:"POST",body:JSON.stringify({rows})});batchId=result.batchId;proposals=result.proposals||[];table.innerHTML=proposalTableHtml(proposals);count.textContent=`全部 ${proposals.length}｜可派发 ${result.counts?.ready||0}｜待确认 ${result.counts?.needsConfirmation||0}`;preview.hidden=false;message.innerHTML="";}catch(error){message.innerHTML=`<div class="miwa-work-error">${esc(error?.message||"导入失败，请确认Backend和数据库迁移已更新。")}</div>`;}finally{button.disabled=!rows.length;}});host.querySelector("[data-work-batch-approve]")?.addEventListener("click",async()=>{const ids=[...host.querySelectorAll("[data-work-proposal-id]:checked")].map((node)=>node.dataset.workProposalId);if(!ids.length)return;try{const result=await aioneApi(`/api/v1/work-home/batch/${encodeURIComponent(batchId)}/approve`,{method:"POST",body:JSON.stringify({proposalIds:ids})});message.innerHTML=`<div class="miwa-work-batch-success">已批准并派发 ${result.createdCount} 项正式工作。负责人和安排人现在从同一个 work_id 查看。</div>`;proposals=proposals.map((p)=>ids.includes(String(p.id))?{...p,status:"approved"}:p);table.innerHTML=proposalTableHtml(proposals);announceWorkItemsChanged({reason:"work-batch-approved",batchId});}catch(error){message.innerHTML=`<div class="miwa-work-error">${esc(error?.message||"批量派发失败。")}</div>`;}});aside([]);return true;}

export async function initMiwaWorkHome(){
  const host=document.getElementById("miwa-work-home-entry");
  if(!host)return false;
  publishWorkContext(null);

  const id=routeId();
  const isOverview=id==="work";
  const isRecords=id==="work-records";
  const isSummary=id==="work-summaries";
  const isBatch=id==="work-batch";
  const isContribution=["work-suggestions","work-innovations"].includes(id);
  const presentation=pagePresentation(id);
  const defaultSort=["work-all","work-following","work-records","work-summaries","work-team"].includes(id)?"updated":"ai";
  setPublicationPageMode(isOverview);

  let allItems=[];
  let mode="database";
  let activeDetail=null;
  let view=localStorage.getItem("aione.work.view.v1")||"card";
  let columns=["2","3","4","6"].includes(localStorage.getItem("aione.work.columns.v1"))?localStorage.getItem("aione.work.columns.v1"):"3";
  let recordRange="month";
  let mineTimeRange="current";
  let interactionView="following";
  let summaryFilter="all";
  let currentPage=1;
  let filters={relation:"all",member:"all",status:"all",priority:"all",business:BUSINESS_ROUTE_MAP[id]||"all",team:"all",project:"all",time:"all",timeBasis:"relevant",dateFrom:"",dateTo:"",money:"all",minAmount:"",sort:defaultSort};

  host.innerHTML=isOverview
    ?`<section class="miwa-work-home"><div class="miwa-work-loading">正在装订《美和工作手册》…</div></section>`
    :isBatch
      ?batchShellHtml()
    :isContribution
      ?contributionShellHtml(id==="work-suggestions"?"suggestion":"innovation")
      :isSummary
        ?summariesShellHtml()
        :isRecords
          ?recordsShellHtml()
          :browserShellHtml();

  if(isBatch)return initBatchWork(host);

  const refs={
    list:host.querySelector("[data-work-list]"),
    kpis:host.querySelector("[data-work-kpis]"),
    count:host.querySelector("[data-work-count]"),
    search:host.querySelector("[data-work-search]"),
    relation:host.querySelector("[data-work-relation]"),
    member:host.querySelector("[data-work-member]"),
    status:host.querySelector("[data-work-status]"),
    priority:host.querySelector("[data-work-priority]"),
    business:host.querySelector("[data-work-business]"),
    team:host.querySelector("[data-work-team]"),
    project:host.querySelector("[data-work-project]"),
    time:host.querySelector("[data-work-time]"),
    timeBasis:host.querySelector("[data-work-time-basis]"),
    dateFrom:host.querySelector("[data-work-date-from]"),
    dateTo:host.querySelector("[data-work-date-to]"),
    money:host.querySelector("[data-work-money]"),
    minAmount:host.querySelector("[data-work-min-amount]"),
    sort:host.querySelector("[data-work-sort]"),
    pagination:host.querySelector("[data-work-pagination-host]"),
    error:host.querySelector("[data-work-error]"),
    dialog:host.querySelector("[data-work-detail]"),
    detailBody:host.querySelector("[data-work-detail-body]"),
    recordContent:host.querySelector("[data-record-content]"),
    recordCount:host.querySelector("[data-record-count]"),
    summaryContent:host.querySelector("[data-summary-content]"),
    summaryCount:host.querySelector("[data-summary-count]"),
    summaryFilter:host.querySelector("[data-work-summary-filter]")
  };

  if(isContribution){
    host.querySelector("[data-contribution-new]")?.addEventListener("click",()=>alert("当前版本先验证建议/创新的个人入口与集团归口关系；正式多用户提交接口将在后续按真实业务继续接入。"));
    aside([]);
    return true;
  }

  if(refs.business&&BUSINESS_ROUTE_MAP[id]){
    refs.business.value=BUSINESS_ROUTE_MAP[id];
    refs.business.disabled=true;
  }
  if(refs.sort)refs.sort.value=filters.sort;

  function syncDynamicFilters(){
    if(refs.member&&!refs.member.disabled){
      const prev=refs.member.value||"all";
      refs.member.innerHTML=memberOptionsHtml(allItems);
      refs.member.value=[...refs.member.options].some(o=>o.value===prev)?prev:"all";
    }
    if(refs.team){
      const prev=refs.team.value||"all";
      refs.team.innerHTML=optionsHtml(allItems,teamLabel,"全部团队");
      refs.team.value=[...refs.team.options].some(o=>o.value===prev)?prev:"all";
    }
    if(refs.project){
      const prev=refs.project.value||"all";
      refs.project.innerHTML=optionsHtml(allItems,projectLabel,"全部项目");
      refs.project.value=[...refs.project.options].some(o=>o.value===prev)?prev:"all";
    }
  }

  function applyBrowserFilters(baseItems,{useRoute=true,ignoreStatus=false}={}){
    const q=refs.search?.value?.trim()||"";
    return sortItems(baseItems
      .filter(x=>!useRoute||routeMatches(x,baseItems,interactionView))
      .filter(x=>searchMatches(x,q))
      .filter(x=>relationMatches(x,filters.relation))
      .filter(x=>memberMatches(x,filters.member))
      .filter(x=>ignoreStatus||statusMatches(x,filters.status))
      .filter(x=>priorityMatches(x,filters.priority))
      .filter(x=>businessMatches(x,filters.business))
      .filter(x=>teamMatches(x,filters.team))
      .filter(x=>projectMatches(x,filters.project))
      .filter(x=>timeMatches(x,filters.time,filters.timeBasis,filters.dateFrom,filters.dateTo))
      .filter(x=>moneyMatches(x,filters.money,filters.minAmount)),filters.sort);
  }

  function rows(){
    let result=applyBrowserFilters(allItems,{useRoute:true});
    if(id==="work-mine"||id==="work-today")result=result.filter(item=>mineRangeMatches(item,mineTimeRange));
    return result;
  }

  function pageSlice(items){
    const pages=Math.max(1,Math.ceil(items.length/WORK_PAGE_SIZE));
    currentPage=Math.min(Math.max(1,currentPage),pages);
    return items.slice((currentPage-1)*WORK_PAGE_SIZE,currentPage*WORK_PAGE_SIZE);
  }

  function syncViewControls(){
    host.querySelectorAll("[data-work-view]").forEach(button=>button.classList.toggle("is-active",button.dataset.workView===view));
    host.querySelectorAll("[data-work-card-cols]").forEach(select=>{select.value=columns;select.classList.toggle("is-active",view==="card");});
  }

  function syncSortControl(){
    host.querySelectorAll("[data-work-sort-option]").forEach(button=>{
      const active=button.dataset.workSortOption===filters.sort;
      button.setAttribute("aria-checked",String(active));
      const mark=button.querySelector("b");
      if(mark)mark.textContent=active?"✓":"";
    });
    if(refs.sort)refs.sort.value=filters.sort;
  }

  function syncQuickStatus(base){
    if(id!=="work-all")return;
    const counts={
      all:base.length,
      in_progress:base.filter(x=>["in_progress","active"].includes(x.status)).length,
      hold:base.filter(x=>hasWaitingSignal(x)&&x.status!=="waiting"&&x.status!=="blocked"&&!isCompleted(x)).length,
      blocked:base.filter(x=>x.status==="blocked"||Boolean(x.metadata?.exceptionReason||x.metadata?.errorCode||x.metadata?.executionState==="error")).length,
      waiting:base.filter(x=>x.status==="waiting").length
    };
    host.querySelectorAll("[data-work-quick-status]").forEach(button=>button.classList.toggle("is-active",button.dataset.workQuickStatus===filters.status));
    host.querySelectorAll("[data-work-quick-count]").forEach(node=>node.textContent=counts[node.dataset.workQuickCount]??"");
  }

  function syncMineRange(){
    if(id!=="work-mine"&&id!=="work-today")return;
    const base=applyBrowserFilters(allItems,{useRoute:true,ignoreStatus:true});
    const counts={before:0,current:0,future:0};
    for(const item of base){const bucket=mineTimeBucket(item);if(bucket in counts)counts[bucket]+=1;}
    host.querySelectorAll("[data-work-mine-count]").forEach(node=>node.textContent=counts[node.dataset.workMineCount]??0);
    host.querySelectorAll("[data-work-mine-range]").forEach(button=>button.classList.toggle("is-active",button.dataset.workMineRange===mineTimeRange));
  }

  function kpiBaseRows(){
    let base=applyBrowserFilters(allItems,{useRoute:true,ignoreStatus:true});
    if(id==="work-mine"||id==="work-today")base=base.filter(item=>mineRangeMatches(item,mineTimeRange));
    return base;
  }

  function renderKpis(){
    if(!refs.kpis)return;
    const show=presentation==="browser";
    refs.kpis.hidden=!show;
    if(!show)return;
    const base=kpiBaseRows();
    const cards=[
      ["all","工作总数",base.length,false],
      ["pending","待开始",base.filter(x=>x.status==="pending").length,false],
      ["in_progress","进行中",base.filter(x=>["in_progress","active"].includes(x.status)).length,false],
      ["hold","等待中",base.filter(x=>hasWaitingSignal(x)&&x.status!=="waiting"&&x.status!=="blocked"&&!isCompleted(x)).length,false],
      ["waiting","待验收",base.filter(x=>x.status==="waiting").length,false],
      ["blocked","异常",base.filter(x=>x.status==="blocked"||Boolean(x.metadata?.exceptionReason||x.metadata?.errorCode||x.metadata?.executionState==="error")).length,true]
    ];
    refs.kpis.innerHTML=cards.map(([value,label,n,risk])=>`<button type="button" class="miwa-work-kpi${filters.status===value?" is-active":""}${risk&&n?" is-risk":""}" data-work-kpi-filter="${value}"><span>${label}</span><strong>${n}</strong></button>`).join("");
  }

  function renderList(){
    const m=metrics(allItems),result=rows(),visible=pageSlice(result);
    renderKpis();
    if(refs.count)refs.count.textContent=`${result.length} 项 · ${view==="card"?`卡片${columns}列`:"列表"}`;
    if(refs.list)refs.list.innerHTML=browserRowsHtml(visible,view,columns);
    if(refs.pagination)refs.pagination.innerHTML=result.length>WORK_PAGE_SIZE?paginationHtml(result.length,currentPage):"";

    if(id==="work-following"){
      const heading=host.querySelector("[data-work-heading]"),summaryHost=host.querySelector("[data-work-summary]"),toggle=host.querySelector("[data-work-liked-history]");
      if(heading)heading.textContent=interactionView==="liked"?"我的点赞":"关注内容";
      if(summaryHost)summaryHost.textContent=interactionView==="liked"
        ?"点赞代表主动认可；这里用于回看互动记录，不等于关注、收藏或接手工作。"
        :"当前已接入工作事项关注；以后同一关注能力可继续扩展到总结、商品等有稳定身份的对象。";
      if(toggle)toggle.textContent=interactionView==="liked"?"返回关注":"点赞记录";
    }

    syncViewControls();
    syncSortControl();
    syncMineRange();
    syncQuickStatus(kpiBaseRows());

    const advancedCount=[filters.team!=="all",filters.project!=="all",filters.timeBasis!=="relevant",filters.time==="custom"&&Boolean(filters.dateFrom||filters.dateTo),filters.money!=="all",Number(filters.minAmount||0)>0].filter(Boolean).length;
    const moreCount=host.querySelector("[data-work-more-count]");
    if(moreCount)moreCount.textContent=advancedCount?`· ${advancedCount}`:"";
    const reset=host.querySelector("[data-work-reset]");
    if(reset)reset.hidden=!(advancedCount||filters.relation!=="all"||filters.member!=="all"||filters.status!=="all"||filters.priority!=="all"||filters.business!==(BUSINESS_ROUTE_MAP[id]||"all")||filters.time!=="all"||(refs.search?.value||"").trim());
    host.querySelectorAll("[data-work-custom-date]").forEach(el=>el.hidden=filters.time!=="custom");

    window.MIWAHeader?.setWorkCount?.(m.attention);
    aside(allItems);
    if(refs.error)refs.error.innerHTML=mode==="local"?`<div class="miwa-work-error">正式数据库暂时未连接，当前显示本地预览工作记录；正式关注与执行闭环需要AIONE Backend。</div>`:"";
  }

  function renderRecords(){
    const historical=allItems.filter(item=>routeMatches(item,allItems));
    const ranged=recordsInRange(historical,recordRange);
    const filtered=applyBrowserFilters(ranged,{useRoute:false}).filter(item=>summaryFilterMatches(item,summaryFilter));
    const visible=pageSlice(filtered);
    if(refs.recordCount)refs.recordCount.textContent=`${filtered.length} 项 · ${view==="card"?`卡片${columns}列`:"列表"}`;
    if(refs.recordContent)refs.recordContent.innerHTML=recordRowsHtml(visible,view,columns);
    if(refs.pagination)refs.pagination.innerHTML=filtered.length>WORK_PAGE_SIZE?paginationHtml(filtered.length,currentPage):"";
    syncSortControl();
    syncViewControls();
    host.querySelectorAll("[data-record-range]").forEach(button=>button.classList.toggle("is-active",button.dataset.recordRange===recordRange));
    if(refs.summaryFilter)refs.summaryFilter.value=summaryFilter;
    const advancedCount=[filters.team!=="all",filters.project!=="all",filters.money!=="all",Number(filters.minAmount||0)>0].filter(Boolean).length;
    const moreCount=host.querySelector("[data-work-more-count]");
    if(moreCount)moreCount.textContent=advancedCount?`· ${advancedCount}`:"";
    const reset=host.querySelector("[data-work-reset]");
    if(reset)reset.hidden=!(advancedCount||filters.relation!=="all"||filters.member!=="all"||filters.business!=="all"||summaryFilter!=="all"||(refs.search?.value||"").trim());
    window.MIWAHeader?.setWorkCount?.(metrics(allItems).attention);
    aside(allItems);
    if(refs.error)refs.error.innerHTML=mode==="local"?`<div class="miwa-work-error">当前为本地预览事实；正式工作记录需要AIONE Backend工作数据。总结列只显示真实存在的总结信息，不生成假链接。</div>`:"";
  }

  function renderSummaries(){
    const filtered=applyBrowserFilters(allItems,{useRoute:true});
    const visible=pageSlice(filtered);
    if(refs.summaryCount)refs.summaryCount.textContent=`${filtered.length} 份 · ${view==="card"?`卡片${columns}列`:"列表"}`;
    if(refs.summaryContent)refs.summaryContent.innerHTML=summaryRowsHtml(visible,view,columns);
    if(refs.pagination)refs.pagination.innerHTML=filtered.length>WORK_PAGE_SIZE?paginationHtml(filtered.length,currentPage):"";
    syncSortControl();
    syncViewControls();
    window.MIWAHeader?.setWorkCount?.(metrics(allItems).attention);
    aside(allItems);
    if(refs.error)refs.error.innerHTML=mode==="local"?`<div class="miwa-work-error">当前为本地预览事实；只有后端真实存在总结字段时才会进入“我的总结”。Google Docs、PDF与推广能力将在正式总结对象接入后继续实现。</div>`:"";
  }

  async function refresh(){
    if(refs.list)refs.list.innerHTML=`<div class="miwa-work-loading">正在读取工作事项…</div>`;
    if(refs.recordContent)refs.recordContent.innerHTML=`<div class="miwa-work-loading">正在读取工作事实…</div>`;
    if(refs.summaryContent)refs.summaryContent.innerHTML=`<div class="miwa-work-loading">正在读取我的总结…</div>`;
    const loaded=await loadItems(interactionView);
    allItems=loaded.items;
    mode=loaded.mode;

    if(isOverview){
      host.innerHTML=overviewHtml(allItems,mode);
      renderSemanticIcons(host);
      bindPublicationActions(host);
      configurePublicationAside({kicker:"工作之家",title:"工作概览",summary:"《美和工作手册》解释当前方法与页面使用方式；工作之家V2.0继续处于真实运行验证，不因过早锁定阻止高价值发现。",bookTitle:"美和工作手册",chapter:"PART 01 方法 + PART 02 使用指南",version:"V2.0 · 验证中"});
      validatePublicationPages(host);
      scrollToManualSection();
      window.MIWAHeader?.setWorkCount?.(metrics(allItems).attention);
      return;
    }
    syncDynamicFilters();
    if(isSummary){renderSummaries();return;}
    if(isRecords){renderRecords();return;}
    renderList();
  }

  async function toggleFollow(workId,nextValue=null){
    const item=allItems.find(x=>String(x.id)===String(workId));if(!item)return;
    const target=nextValue??!item.isFollowing;
    try{
      if(mode==="database")await aioneApi(`/api/v1/work-home/${encodeURIComponent(workId)}/follow`,{method:target?"POST":"DELETE",body:target?"{}":undefined});
      else{const ids=localFollowingIds();if(target)ids.add(String(workId));else ids.delete(String(workId));saveLocalFollowing(ids);}
      item.isFollowing=target;
      item.relation=item.relation==="mine"||item.relation==="created"?item.relation:target?"following":"shared";
      announceWorkItemsChanged({reason:target?"work-followed":"work-unfollowed",workItemId:workId});
      if(activeDetail&&String(activeDetail.workItem?.id)===String(workId)){activeDetail.following=target;refs.detailBody.innerHTML=detailHtml(activeDetail);bindDetailActions();}
      await refresh();
    }catch(e){
      if(e?.status===404){alert("关注接口尚未部署到当前AIONE Backend。系统不会把本地收藏伪装成正式关注成功。");return;}
      workError(e);
    }
  }

  async function toggleLike(workId,nextValue=null){
    const item=allItems.find(x=>String(x.id)===String(workId));if(!item)return;
    const target=nextValue??!item.isLiked;
    try{
      if(mode==="database"){const result=await aioneApi(`/api/v1/work-home/${encodeURIComponent(workId)}/like`,{method:target?"POST":"DELETE",body:target?"{}":undefined});item.likeCount=Number(result.likeCount||0)||0;}
      else{const ids=localLikedIds();if(target)ids.add(String(workId));else ids.delete(String(workId));saveLocalLiked(ids);item.likeCount=Math.max(0,(Number(item.likeCount||0)||0)+(target?1:-1));}
      item.isLiked=target;
      announceWorkItemsChanged({reason:target?"work-liked":"work-unliked",workItemId:workId});
      if(activeDetail&&String(activeDetail.workItem?.id)===String(workId)){activeDetail.liked=target;activeDetail.likeCount=item.likeCount;refs.detailBody.innerHTML=detailHtml(activeDetail);bindDetailActions();}
      await refresh();
    }catch(e){if(e?.status===404){alert("点赞接口尚未部署到当前AIONE Backend。请确认V1.9.36数据库迁移与Backend部署状态后再试。");return;}workError(e);}
  }

  async function loadDetail(workId){
    if(mode!=="database")throw new Error("正式执行闭环需要连接AIONE Backend。");
    const detail=await aioneApi(`/api/v1/work-home/${encodeURIComponent(workId)}/execution`);
    activeDetail=detail;
    publishWorkContext(detail);
    refs.detailBody.innerHTML=detailHtml(detail);
    bindDetailActions();
    if(refs.dialog&&!refs.dialog.open)refs.dialog.showModal();
  }
  async function reloadActiveDetail(){if(activeDetail?.workItem?.id)await loadDetail(activeDetail.workItem.id);await refresh();}
  function closeDetail(){if(refs.dialog?.open)refs.dialog.close();activeDetail=null;publishWorkContext(null);}
  function setForm(name,visible){const form=refs.detailBody?.querySelector(`[data-work-${name}-form]`);if(form)form.hidden=!visible;}
  function workError(e){alert(e?.message||"工作执行失败，请稍后重试。");}
  async function startWork(){try{await aioneApi(`/api/v1/work-home/${encodeURIComponent(activeDetail.workItem.id)}/start`,{method:"POST",body:"{}"});announceWorkItemsChanged({reason:"work-started",workItemId:activeDetail.workItem.id});await reloadActiveDetail();}catch(e){workError(e);}}
  async function addEvidence(form){const d=new FormData(form),summary=String(d.get("summary")||"").trim(),evidenceUri=String(d.get("evidenceUri")||"").trim();try{await aioneApi(`/api/v1/work-home/${encodeURIComponent(activeDetail.workItem.id)}/evidence`,{method:"POST",body:JSON.stringify({summary,evidenceUri,evidenceType:evidenceUri?"link":"execution_note"})});announceWorkItemsChanged({reason:"work-evidence-added",workItemId:activeDetail.workItem.id});form.reset();await reloadActiveDetail();}catch(e){workError(e);}}
  async function completeWork(form){const d=new FormData(form),resultSummary=String(d.get("resultSummary")||"").trim(),evidenceSummary=String(d.get("evidenceSummary")||"").trim(),evidenceUri=String(d.get("evidenceUri")||"").trim();try{const result=await aioneApi(`/api/v1/work-home/${encodeURIComponent(activeDetail.workItem.id)}/complete`,{method:"POST",body:JSON.stringify({resultSummary,evidenceSummary,evidenceUri})});announceWorkItemsChanged({reason:"work-completion-submitted",workItemId:activeDetail.workItem.id,completionState:result.completionState||""});form.reset();await reloadActiveDetail();if(result.completionState==="waiting")alert("执行结果已提交，等待工作创建者确认。\n美和AI已经可以读取本次结果和证据进行复盘。");}catch(e){workError(e);}}
  async function approveWork(form){const d=new FormData(form),reviewSummary=String(d.get("reviewSummary")||"").trim();try{await aioneApi(`/api/v1/work-home/${encodeURIComponent(activeDetail.workItem.id)}/approve`,{method:"POST",body:JSON.stringify({reviewSummary})});announceWorkItemsChanged({reason:"work-completion-approved",workItemId:activeDetail.workItem.id});await reloadActiveDetail();}catch(e){workError(e);}}
  function aiReview(){publishWorkContext(activeDetail);window.MIWAAI?.open?.("work-home-review");const prompt="复盘当前工作结果。请基于工作目标、美和工作9问、原始Proposal来源、执行证据和结果事实判断：1）是否真正完成目标；2）有哪些遗留问题；3）是否应沉淀为规则、知识、Skill或自动化；4）是否需要创建下一轮工作。事实不足的地方标记待确认，不要编造。";window.setTimeout(()=>window.AIONEAISecretary?.sendCommand?.(prompt,{capabilityCode:"work.execution_review",capabilityLabel:"复盘工作结果"}),120);}
  function bindDetailActions(){
    refs.detailBody?.querySelector("[data-work-detail-close]")?.addEventListener("click",closeDetail);
    refs.detailBody?.querySelector("[data-work-like]")?.addEventListener("click",e=>toggleLike(e.currentTarget.dataset.workLike));
    refs.detailBody?.querySelector("[data-work-follow]")?.addEventListener("click",e=>toggleFollow(e.currentTarget.dataset.workFollow));
    refs.detailBody?.querySelector('[data-work-action="start"]')?.addEventListener("click",startWork);
    refs.detailBody?.querySelector('[data-work-action="ai-review"]')?.addEventListener("click",aiReview);
    refs.detailBody?.querySelectorAll("[data-work-toggle]").forEach(button=>button.addEventListener("click",()=>setForm(button.dataset.workToggle,true)));
    refs.detailBody?.querySelectorAll("[data-work-form-cancel]").forEach(button=>button.addEventListener("click",()=>setForm(button.dataset.workFormCancel,false)));
    refs.detailBody?.querySelector("[data-work-evidence-form]")?.addEventListener("submit",e=>{e.preventDefault();addEvidence(e.currentTarget);});
    refs.detailBody?.querySelector("[data-work-complete-form]")?.addEventListener("submit",e=>{e.preventDefault();completeWork(e.currentTarget);});
    refs.detailBody?.querySelector("[data-work-approve-form]")?.addEventListener("submit",e=>{e.preventDefault();approveWork(e.currentTarget);});
  }

  function bindSort(renderFn,fallback=defaultSort){
    host.querySelector("[data-work-sort-toggle]")?.addEventListener("click",()=>{
      const menu=host.querySelector("[data-work-sort-menu]"),toggle=host.querySelector("[data-work-sort-toggle]");
      if(!menu)return;
      menu.hidden=!menu.hidden;
      toggle?.setAttribute("aria-expanded",String(!menu.hidden));
    });
    host.querySelectorAll("[data-work-sort-option]").forEach(button=>button.addEventListener("click",()=>{
      filters.sort=button.dataset.workSortOption||fallback;
      currentPage=1;
      const menu=host.querySelector("[data-work-sort-menu]");if(menu)menu.hidden=true;
      host.querySelector("[data-work-sort-toggle]")?.setAttribute("aria-expanded","false");
      renderFn();
    }));
  }

  function bindView(renderFn){
    host.querySelector('[data-work-view="list"]')?.addEventListener("click",()=>{view="list";currentPage=1;localStorage.setItem("aione.work.view.v1",view);renderFn();});
    host.querySelector("[data-work-card-cols]")?.addEventListener("change",e=>{columns=["2","3","4","6"].includes(e.currentTarget.value)?e.currentTarget.value:"3";localStorage.setItem("aione.work.columns.v1",columns);view="card";currentPage=1;localStorage.setItem("aione.work.view.v1",view);renderFn();});
  }

  function bindPagination(renderFn){
    refs.pagination?.addEventListener("click",e=>{const button=e.target.closest("[data-work-page]");if(!button)return;currentPage=Math.max(1,currentPage+(button.dataset.workPage==="next"?1:-1));renderFn();});
  }

  function bindOpen(container){
    container?.addEventListener("click",e=>{
      const like=e.target.closest("[data-work-like]");if(like){toggleLike(like.dataset.workLike);return;}
      const follow=e.target.closest("[data-work-follow]");if(follow){toggleFollow(follow.dataset.workFollow);return;}
      const open=e.target.closest("[data-work-open]");if(open)loadDetail(open.dataset.workOpen).catch(workError);
    });
  }

  if(!isOverview&&!isRecords&&!isSummary){
    host.querySelector("[data-work-ai-create]")?.addEventListener("click",openAIWorkCreate);
    host.querySelector("[data-work-liked-history]")?.addEventListener("click",async()=>{interactionView=interactionView==="liked"?"following":"liked";currentPage=1;await refresh();});
    refs.search?.addEventListener("input",()=>{currentPage=1;renderList();});
    refs.relation?.addEventListener("change",()=>{filters.relation=refs.relation.value;currentPage=1;renderList();});
    refs.member?.addEventListener("change",()=>{if(!refs.member.disabled)filters.member=refs.member.value;currentPage=1;renderList();});
    refs.status?.addEventListener("change",()=>{filters.status=refs.status.value;currentPage=1;renderList();});
    refs.priority?.addEventListener("change",()=>{filters.priority=refs.priority.value;currentPage=1;renderList();});
    refs.business?.addEventListener("change",()=>{filters.business=refs.business.value;currentPage=1;renderList();});
    refs.team?.addEventListener("change",()=>{filters.team=refs.team.value;currentPage=1;renderList();});
    refs.project?.addEventListener("change",()=>{filters.project=refs.project.value;currentPage=1;renderList();});
    refs.time?.addEventListener("change",()=>{filters.time=refs.time.value;currentPage=1;const advanced=host.querySelector("[data-work-advanced]");if(filters.time==="custom"&&advanced)advanced.hidden=false;renderList();});
    refs.timeBasis?.addEventListener("change",()=>{filters.timeBasis=refs.timeBasis.value;currentPage=1;renderList();});
    refs.dateFrom?.addEventListener("change",()=>{filters.dateFrom=refs.dateFrom.value;currentPage=1;renderList();});
    refs.dateTo?.addEventListener("change",()=>{filters.dateTo=refs.dateTo.value;currentPage=1;renderList();});
    refs.money?.addEventListener("change",()=>{filters.money=refs.money.value;currentPage=1;renderList();});
    refs.minAmount?.addEventListener("input",()=>{filters.minAmount=refs.minAmount.value;currentPage=1;renderList();});
    host.querySelector("[data-work-more-filter]")?.addEventListener("click",()=>{const advanced=host.querySelector("[data-work-advanced]");if(advanced)advanced.hidden=!advanced.hidden;});
    host.querySelectorAll("[data-work-quick-status]").forEach(button=>button.addEventListener("click",()=>{filters.status=button.dataset.workQuickStatus||"all";if(refs.status)refs.status.value=filters.status;currentPage=1;renderList();}));
    host.querySelectorAll("[data-work-mine-range]").forEach(button=>button.addEventListener("click",()=>{mineTimeRange=button.dataset.workMineRange||"current";currentPage=1;renderList();}));
    refs.kpis?.addEventListener("click",e=>{const button=e.target.closest("[data-work-kpi-filter]");if(!button)return;filters.status=button.dataset.workKpiFilter||"all";if(refs.status)refs.status.value=filters.status;currentPage=1;renderList();});
    bindSort(renderList,defaultSort);
    bindView(renderList);
    bindPagination(renderList);
    host.querySelector("[data-work-reset]")?.addEventListener("click",()=>{
      if(refs.search)refs.search.value="";
      filters={relation:"all",member:"all",status:"all",priority:"all",business:BUSINESS_ROUTE_MAP[id]||"all",team:"all",project:"all",time:"all",timeBasis:"relevant",dateFrom:"",dateTo:"",money:"all",minAmount:"",sort:defaultSort};
      mineTimeRange="current";
      currentPage=1;
      [refs.relation,refs.status,refs.priority,refs.team,refs.project,refs.time,refs.money].forEach(el=>{if(el)el.value="all";});
      if(refs.member&&!refs.member.disabled)refs.member.value="all";
      if(refs.timeBasis)refs.timeBasis.value="relevant";
      if(refs.business)refs.business.value=filters.business;
      if(refs.dateFrom)refs.dateFrom.value="";if(refs.dateTo)refs.dateTo.value="";if(refs.minAmount)refs.minAmount.value="";if(refs.sort)refs.sort.value=filters.sort;
      renderList();
    });
    host.querySelectorAll("[data-work-refresh]").forEach(button=>button.addEventListener("click",refresh));
    bindOpen(refs.list);
  }

  if(isRecords){
    bindSort(renderRecords,"updated");
    bindView(renderRecords);
    bindPagination(renderRecords);
    host.querySelectorAll("[data-work-refresh]").forEach(button=>button.addEventListener("click",refresh));
    host.querySelectorAll("[data-record-range]").forEach(button=>button.addEventListener("click",()=>{recordRange=button.dataset.recordRange||"month";currentPage=1;renderRecords();}));
    refs.search?.addEventListener("input",()=>{currentPage=1;renderRecords();});
    refs.member?.addEventListener("change",()=>{filters.member=refs.member.value;currentPage=1;renderRecords();});
    refs.relation?.addEventListener("change",()=>{filters.relation=refs.relation.value;currentPage=1;renderRecords();});
    refs.business?.addEventListener("change",()=>{filters.business=refs.business.value;currentPage=1;renderRecords();});
    refs.team?.addEventListener("change",()=>{filters.team=refs.team.value;currentPage=1;renderRecords();});
    refs.project?.addEventListener("change",()=>{filters.project=refs.project.value;currentPage=1;renderRecords();});
    refs.money?.addEventListener("change",()=>{filters.money=refs.money.value;currentPage=1;renderRecords();});
    refs.minAmount?.addEventListener("input",()=>{filters.minAmount=refs.minAmount.value;currentPage=1;renderRecords();});
    refs.summaryFilter?.addEventListener("change",()=>{summaryFilter=refs.summaryFilter.value||"all";currentPage=1;renderRecords();});
    host.querySelector("[data-work-more-filter]")?.addEventListener("click",()=>{const advanced=host.querySelector("[data-work-advanced]");if(advanced)advanced.hidden=!advanced.hidden;});
    host.querySelector("[data-work-reset]")?.addEventListener("click",()=>{
      if(refs.search)refs.search.value="";
      filters={...filters,relation:"all",member:"all",business:"all",team:"all",project:"all",money:"all",minAmount:"",sort:"updated"};
      summaryFilter="all";currentPage=1;
      [refs.relation,refs.member,refs.business,refs.team,refs.project,refs.money,refs.summaryFilter].forEach(el=>{if(el)el.value="all";});
      if(refs.minAmount)refs.minAmount.value="";if(refs.sort)refs.sort.value="updated";
      renderRecords();
    });
    bindOpen(refs.recordContent);
  }

  if(isSummary){
    bindSort(renderSummaries,"updated");
    bindView(renderSummaries);
    bindPagination(renderSummaries);
    host.querySelectorAll("[data-work-refresh]").forEach(button=>button.addEventListener("click",refresh));
    refs.search?.addEventListener("input",()=>{currentPage=1;renderSummaries();});
    refs.business?.addEventListener("change",()=>{filters.business=refs.business.value;currentPage=1;renderSummaries();});
    refs.time?.addEventListener("change",()=>{filters.time=refs.time.value;currentPage=1;renderSummaries();});
    bindOpen(refs.summaryContent);
  }

  refs.dialog?.addEventListener("close",()=>{activeDetail=null;publishWorkContext(null);});
  refs.dialog?.addEventListener("click",e=>{if(e.target===refs.dialog)closeDetail();});

  await refresh();
  return true;
}
