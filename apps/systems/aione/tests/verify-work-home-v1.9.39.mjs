import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repoRoot=path.resolve(root,"../../..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const must=(c,m)=>{if(!c)throw new Error(m);};

const page=read("js/pages/miwa-work-home.js");
const html=read("pages/work-home/template.html");
const sidebar=read("js/config/sidebar-registry.js");
const routes=read("js/config/route-registry.js");
const nav=read("js/shell/primary-navigation.js");
const navCss=read("css/shell/primary-navigation.css");
const desktopHeader=read("components/shell/header/desktop-header.html");
const mobileInfo=read("components/shell/header/mobile-info.html");
const mobileBottom=read("components/shell/primary-navigation/mobile-bottom.html");
const system=read("js/miwa-system.js");
const indexHtml=read("index.html");
const core=read("backend/src/routes/core.js");

// 1. Work Home V2.0 is a real-use validation baseline, not a premature final lock.
must(page.includes("Real-use Validation Baseline | V1.9.39"),"V1.9.39 real-use validation baseline marker missing");
must(page.includes("不因“锁定”阻止高价值发现"),"real-use validation principle missing");

// 2. Sidebar order follows the latest chapter model and create-work is no longer a Sidebar chapter/action.
const order=['label:"工作概览"','label:"我的工作"','label:"我的关注"','label:"我的建议"','label:"我的创新"','label:"我的总结"','label:"全部工作"','label:"事业工作"','label:"团队工作"','label:"工作记录"'];
let cursor=-1;
for(const token of order){const pos=sidebar.indexOf(token,cursor+1);must(pos>cursor,`Work Home sidebar order broken at ${token}`);cursor=pos;}
for(const token of ['id:"work-today"','id:"work-waiting"','id:"work-blocked"','id:"work-review"']) must(!sidebar.includes(token),`legacy/status entry must not occupy Work Home sidebar: ${token}`);
must(sidebar.includes("primaryAction: null"),"Work Home sidebar should not carry create-work primary action");
must(sidebar.includes('sectionGapBefore:true'),"Work Home sidebar chapter spacing groups missing");
must(nav.includes('entry.sectionGapBefore')&&navCss.includes('.has-section-gap'),"Sidebar whitespace grouping support missing");

// 3. My Work is the real default route; Today Work remains compatibility-only.
must(routes.includes('"work-mine": route("work-mine", "我的工作"')&&routes.includes('"work-today": route("work-today", "今日工作", "platform", { status: "legacy"'),"My Work/legacy Today route status incorrect");
for(const source of [desktopHeader,mobileInfo,mobileBottom]) must(source.includes('#/work-mine'),"Work Home default link must enter My Work");

// 4. My Work is continuous and uses three time ranges rather than date=today.
for(const token of ['data-work-mine-range="before"','data-work-mine-range="current"','data-work-mine-range="future"','今日以前','当前工作','今日以后']) must(page.includes(token),`My Work time-range capability missing: ${token}`);
must(page.includes('function mineTimeBucket')&&page.includes('mineTimeRange="current"')&&page.includes('mineRangeMatches(item,mineTimeRange)'),"My Work continuous time-range logic incomplete");
must(page.includes('工作跨天不消失'),"cross-day work continuity rule missing");

// 5. Creation is a Main action and opens MIWA AI; Sidebar no longer owns creation.
must(page.includes('data-work-ai-create')&&page.includes('＋ AI创建工作')&&page.includes('function openAIWorkCreate'),"AI create-work action missing from My Work Main");
must(page.includes('window.MIWAAI?.open?.("work-create")'),"AI create-work does not open MIWA AI");

// 6. Mine / All / Business / Team use the same Work Item Browser shell.
must(page.includes('isMine=id==="work-mine"||id==="work-today"')&&page.includes('const heading=isMine?"工作事项一览"'),"My Work is not using the unified Work Item Browser");
must(page.includes('isTeam?"团队工作一览"'),"Team Work browser heading missing");
must(!page.includes('isTeam?teamShellHtml()'),"Team Work still selects a bespoke Main shell in runtime");
must(page.includes('if(id==="work-team")return true'),"Team Work preset must reuse the shared Work Item data set");

// 7. Unified browser keeps required controls, sorting, display density and 12-item pagination.
for(const token of ['data-work-relation','data-work-business','data-work-member','data-work-status','data-work-priority','data-work-time','data-work-more-filter','data-work-sort-toggle']) must(page.includes(token),`browser control missing: ${token}`);
for(const n of ["2","3","4","6"]) must(page.includes(`<option value="${n}">卡片 · ${n}列</option>`),`card density ${n} missing`);
must(page.includes('const WORK_PAGE_SIZE=12;')&&page.includes('function paginationHtml')&&page.includes('function pageSlice'),"12-item pagination missing");
must(page.includes('<th>开始时间</th><th>截止时间</th>'),"Work Item list must distinguish planned start and deadline");

// 8. Core metrics reuse clickable KPI filtering and stay one-row/scrollable.
must(page.includes('data-work-kpi-filter')&&page.includes('refs.kpis?.addEventListener'),"Core KPI cards are not clickable filters");
for(const label of ["工作总数","待开始","进行中","等待中","待验收","异常"]) must(page.includes(label),`Work KPI missing: ${label}`);
must(html.includes('.miwa-work-kpis{display:flex')&&html.includes('overflow-x:auto'),"Work KPI layout must stay one row with overflow protection");

// 9. Work Records remain the fact ledger and summaries are only an optional value layer.
for(const label of ["完成时间","工作事项 / 最终结果","负责人 / 来源","闭环结果","有效工时","证据","工作总结"]) must(page.includes(label),`Work Record fact field missing: ${label}`);
must(page.includes('function hasWorkSummary')&&page.includes('function summaryMeta')&&page.includes('function summaryFilterMatches'),"Work Summary optional relation helpers missing");
must(page.includes('data-work-summary-filter')&&page.includes('有总结')&&page.includes('无总结')&&page.includes('团队推广')&&page.includes('集团推广'),"Work Record summary filtering missing");
must(page.includes('summaryLinksHtml(item,{compact:true})'),"Work Record does not expose real summary links/status");
must(page.includes('if(!hasWorkSummary(item))return compact?')&&page.includes('暂无总结'),"Work Record must not fabricate summaries");

// 10. My Summaries is a personal view over real summaries, not a second truth source.
must(routes.includes('"work-summaries": route("work-summaries", "我的总结"'),"My Summaries route missing");
must(page.includes('if(id==="work-summaries")return hasWorkSummary(item)&&summaryBelongsToMe(item)'),"My Summaries must be a preset over real Work Record summary data");
must(page.includes('美和AI起草')&&page.includes('Google Docs')&&page.includes('A4 PDF'),"summary value/official-file direction missing");
must(page.includes('本版不会把普通已完成工作伪装成工作总结'),"summary empty/real-data guard missing");

// 11. Following copy is ready to expand beyond work while current backend remains honest.
must(page.includes('关注的价值是订阅、快速定位和持续跟踪'),"following value definition missing");
must(page.includes('当前已接入工作事项关注')&&page.includes('总结、商品'),"cross-object following extension note missing");

// 12. Topic marks follow the current chapter.
for(const token of ['"work-following":"注"','"work-suggestions":"议"','"work-innovations":"创"','"work-summaries":"总"','"work-team":"团"','"work-records":"录"']) must(page.includes(token),`topic mark missing: ${token}`);

// 13. Redundant Sidebar kicker is hidden; current business stays in Header.
must(nav.includes('kicker.hidden = true'),"redundant Sidebar current-space kicker is still visible");
must(desktopHeader.includes('miwa-business-context__divider')&&desktopHeader.includes('business-name'),"Header business context component regressed");

// 14. No backend/schema expansion tonight: keep V1.9.36 backend + migration 0060.
must(core.includes('workHomeVersion:"V1.9.36"'),"V1.9.39 should keep V1.9.36 backend baseline");
must(!fs.existsSync(path.join(repoRoot,"data-code/migrations/0061_work_home_v1939.sql")),"V1.9.39 must not add migration 0061");
must(system.includes('v1.9.39-work-home-real-use-baseline')&&indexHtml.includes('v1.9.39-work-home-real-use-baseline'),"V1.9.39 cache version missing");

console.log("V1.9.39 Work Home real-use validation baseline passed.");
