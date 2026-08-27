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
const nav=read("js/shell/primary-navigation.js");
const navHtml=read("components/shell/primary-navigation/sidebar.html");
const navCss=read("css/shell/primary-navigation.css");
const desktopHeader=read("components/shell/header/desktop-header.html");
const mobileHeader=read("components/shell/header/mobile-topbar.html");
const headerCss=read("css/shell/header.css");
const system=read("js/miwa-system.js");
const indexHtml=read("index.html");
const core=read("backend/src/routes/core.js");

// 1. Work Home sidebar is chapter-oriented: waiting/exception/review are filters, not chapters.
for(const token of ['id:"work-home"','id:"work-today"','id:"work-all"','id:"work-team"','id:"work-records"']) must(sidebar.includes(token),`missing work sidebar chapter: ${token}`);
for(const token of ['id:"work-waiting"','id:"work-blocked"','id:"work-review"']) must(!sidebar.includes(token),`status route must not occupy Work Home sidebar: ${token}`);
must(sidebar.includes('primaryAction: rootId === "work"')&&sidebar.includes('event:"aione:work:create"'),"Work Home create action missing");
must(navHtml.includes('id="sidebar-primary-action"'),"sidebar primary action host missing");
must(nav.includes('window.MIWAAI?.open?.("work-create")')&&nav.includes('ai-secretary-command-input'),"create work action does not open/prefill MIWA AI");
must(navCss.includes('.sidebar-primary-action__button'),"create work action styling missing");

// 2. Current business is a Header context component, not a Sidebar selector.
for(const source of [desktopHeader,mobileHeader]){
  must(source.includes('business-entry')&&source.includes('business-name')&&source.includes('business-menu-list'),"header business switcher IDs missing");
}
must(desktopHeader.includes('miwa-business-context__divider')&&desktopHeader.includes('miwa-business-context__home')&&desktopHeader.includes('miwa-business-context__switch'),"desktop Business Home | current business structure missing");
must(headerCss.includes('.miwa-business-context__divider')&&headerCss.includes('.miwa-business-context__switch'),"header business context styles missing");
must(nav.includes('function renderBusinessSwitcher()')&&nav.includes('host.hidden = true'),"legacy Sidebar business switcher not disabled");
must(nav.includes('contextHead.hidden = isBusinessSidebar'),"business workbench sidebar still exposes redundant current-business context header");

// 3. The overview runtime regression is fixed.
must(page.includes('const businessHtml=businessCounts.length?'),"businessHtml is still referenced without definition");

// 4. All Work follows the logical filter order: search -> relation -> business -> member -> status -> priority -> time -> more -> sort/view/refresh.
const toolbarNeedle='${workSearchHtml()}${relationSelect}<select data-work-business aria-label="\u4e8b\u4e1a">${businessOptionsHtml()}</select><select data-work-member aria-label="\u6210\u5458">';
must(page.includes(toolbarNeedle),"All Work toolbar does not keep search/relation/business/member in the locked order");
for(const token of ['data-work-status aria-label="\u72b6\u6001"','data-work-priority aria-label="\u4f18\u5148\u7ea7"','data-work-time aria-label="\u65f6\u95f4\u8303\u56f4"','data-work-more-filter','data-work-sort-toggle']) must(page.includes(token),`missing browser control: ${token}`);
must(page.includes('data-work-member')&&page.includes('function memberMatches')&&page.includes('function memberOptionsHtml'),"member filter incomplete");
must(page.includes('<option value="assigned">\u6211\u5e03\u7f6e</option>')&&page.includes('function isAssignedByMe'),"assigned-by-me relation missing");

// 5. Today Work is a prominent navigation action in the All Work hero, not a normal filter chip.
must(page.includes('miwa-work-today-primary')&&page.includes('href="#/work-today"'),"All Work hero Today Work action missing");
must(!page.includes('data-work-today-shortcut'),"legacy Today Work filter shortcut remains in toolbar");

// 6. Sorting is a mandatory browser capability and includes the five agreed work sorts.
for(const token of ['["ai","\u7f8e\u548cAI\u5efa\u8bae\u4f18\u5148"]','["priority","\u4f18\u5148\u7ea7\u9ad8\u2192\u4f4e"]','["due","\u622a\u6b62\u65f6\u95f4\u8fd1\u2192\u8fdc"]','["updated","\u6700\u8fd1\u66f4\u65b0"]','["created","\u6700\u8fd1\u521b\u5efa"]']) must(page.includes(token),`missing sort option: ${token}`);
must(page.includes('if(sort==="created")')&&page.includes('if(sort==="updated")')&&page.includes('if(sort==="due")')&&page.includes('if(sort==="priority")'),"sort implementation incomplete");
must(page.includes('sort:id==="work-all"||id==="work-following"||id==="work-records"||id==="work-team"?"updated":"ai"'),"default sorting does not separate Today AI priority from broad browse recency");

// 7. Work Item Browser uses 12 items/page and resets page after filters/sort/view changes.
must(page.includes('const WORK_PAGE_SIZE=12;')&&page.includes('function paginationHtml')&&page.includes('function pageSlice'),"12-item pagination missing");
must(page.includes('data-work-pagination-host')&&page.includes('data-work-page="prev"')&&page.includes('data-work-page="next"'),"pagination controls missing");
must(page.includes('currentPage=1;renderList()'),"browser changes do not reset pagination");
must(html.includes('.miwa-work-pagination'),"pagination styling missing");

// 8. Status quick filters live in All Work and use business language.
for(const token of ['data-work-quick-status="all"','data-work-quick-status="in_progress"','data-work-quick-status="hold"','data-work-quick-status="blocked"','data-work-quick-status="waiting"']) must(page.includes(token),`missing All Work quick status: ${token}`);
must(page.includes('ignoreStatus=false')&&page.includes('ignoreStatus:true'),"quick-status counts must ignore the currently selected status");
must(page.includes('["\u5f02\u5e38",r.filter(x=>x.status==="blocked").length'),"KPI language must use exception instead of blocked");

// 9. Compact desktop toolbar + one-row advanced filters + unified card density control.
must(html.includes('.miwa-work-browser__toolbar{flex-wrap:nowrap')&&html.includes('.miwa-work-searchbox{flex:0 1 410px'),"desktop browser toolbar is not compact/one-line first");
must(html.includes('.miwa-work-browser__advanced{display:flex')&&html.includes('flex-wrap:nowrap'),"advanced filters are not compact one-row first");
for(const n of ["2","3","4","6"]) must(page.includes(`<option value="${n}">\u5361\u7247 \u00b7 ${n}\u5217</option>`),`card density ${n} missing`);

// 10. Today execution does not automatically include work merely created/assigned by the current user.
must(page.includes('function todayIds(items){return new Set([...items].filter(x=>!isCompleted(x)&&["mine","participant"].includes(x.relation))'),"Today Work still treats created-for-others work as the current user's execution queue");

// 11. Topic mark fallback is present for Work Home.
must(page.includes('miwa-level2-head__icon')&&page.includes('>\u5de5</span>'),"Work Home topic mark missing");

// 12. Front-end-only closure: keep V1.9.36 backend/DB baseline and bump cache to V1.9.38.
must(core.includes('workHomeVersion:"V1.9.36"'),"V1.9.38 should not require a backend schema version bump");
must(!fs.existsSync(path.join(repoRoot,"data-code/migrations/0061_work_home_v1938.sql")),"V1.9.38 must not add a database migration");
must(system.includes('v1.9.38-work-home-final-closure')&&indexHtml.includes('v1.9.38-work-home-final-closure'),"V1.9.38 cache version missing");

console.log("V1.9.38 Work Home final closure validation passed.");
