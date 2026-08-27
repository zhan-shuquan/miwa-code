import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repoRoot=path.resolve(root,"../../..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const readRepo=(p)=>fs.readFileSync(path.join(repoRoot,p),"utf8");
const must=(c,m)=>{if(!c)throw new Error(m);};

const page=read("js/pages/miwa-work-home.js");
const html=read("pages/work-home/template.html");
const sidebar=read("js/config/sidebar-registry.js");
const routes=read("js/config/route-registry.js");
const publication=read("js/components/miwa-publication-master.js");
const system=read("js/miwa-system.js");
const desktopHeader=read("components/shell/header/desktop-header.html");
const mobileHeader=read("components/shell/header/mobile-info.html");
const mobileNav=read("components/shell/primary-navigation/mobile-bottom.html");
const core=read("backend/src/routes/core.js");
const indexHtml=read("index.html");

// 1) Sidebar/route：团队工作成为正式独立入口，顺序在事业工作之后。
for(const token of [
  '"work-team": route("work-team", "团队工作"',
  'id:"work-team", label:"团队工作", route:"work-team"',
  '从团队和成员视角查看工作分布、当前重点与推进情况。'
]) must(routes.includes(token)||sidebar.includes(token)||page.includes(token),`团队工作入口缺失：${token}`);
must(sidebar.indexOf('label:"事业工作"')<sidebar.indexOf('label:"团队工作"'),"团队工作没有放在事业工作之后");

// 2) 四个核心入口副标题清楚，并且Header工作之家默认进入今日工作。
for(const token of [
  '聚焦今天最值得推进的工作，按优先顺序开始处理。',
  '查看当前可见的全部工作，快速搜索、筛选和处理。',
  '从团队和成员视角查看工作分布、当前重点与推进情况。'
]) must(sidebar.includes(token)&&page.includes(token),`核心入口副标题未同步：${token}`);
must(sidebar.includes('按事业快速查看工作进展，进入当前最关心的经营现场。')&&page.includes('事业工作｜按事业进入当前最关心的经营现场'),"事业工作副标题/手册说明未同步");
for(const source of [desktopHeader,mobileHeader,mobileNav]) must(source.includes('href="#/work-today"'),"工作之家Header/移动入口未默认进入今日工作");

// 3) 工作手册深链：页面 -> 对应章节主标题，不再统一回封面。
for(const token of [
  'MANUAL_SECTION_MAP','manualHref','manualSectionFromHash','scrollToManualSection',
  'manualSection:"work-today"','manualSection:"work-all"','manualSection:"work-business"',
  'manualSection:"work-team"','manualSection:"work-waiting"','manualSection:"work-blocked"',
  'manualSection:"work-review"','manualSection:"work-records"'
]) must(page.includes(token),`工作手册深链缺失：${token}`);
must(publication.includes('data-manual-section')&&publication.includes('id="manual-${esc(manualSection)}"'),"出版母版未支持章节锚点");
must(html.includes('scroll-margin-top:96px')&&html.includes('is-manual-target'),"手册章节定位视觉反馈缺失");

// 4) 显示方式：列表在前，卡片用2/3/4/6下拉；记住最近选择并自适应保护。
must(page.includes('data-work-view="list">列表</button><select')&&page.includes('data-work-card-cols'),"显示控制没有收口为列表 + 卡片下拉");
for(const n of ["2","3","4","6"]) must(page.includes(`<option value="${n}">卡片 · ${n}列</option>`),`卡片下拉缺少${n}列`);
must(page.includes('["2","3","4","6"].includes(localStorage.getItem("aione.work.columns.v1"))'),"卡片列数没有读取最近个人偏好");
must(page.includes('localStorage.setItem("aione.work.columns.v1",columns)'),"卡片列数没有保存个人偏好");
must(!page.includes('data-work-cols="2"')&&!page.includes('data-work-cols="3"')&&!page.includes('data-work-cols="4"'),"仍保留旧独立列数按钮");
must(!html.includes('miwa-work-column-toggle'),"仍保留旧独立列数按钮样式");
for(const token of ['.miwa-work-card-grid.cols-2','.miwa-work-card-grid.cols-3','.miwa-work-card-grid.cols-4','.miwa-work-card-grid.cols-6','@container (max-width:1500px)','@container (max-width:1180px)','@container (max-width:980px)','@container (max-width:640px)']) must(html.includes(token),`卡片自适应保护缺失：${token}`);

// 5) 团队工作 = 人/团队观察入口，进入成员后仍复用同一Work Item Browser。
for(const token of [
  'function teamShellHtml()','data-team-range="current"','data-team-range="week"','data-team-range="month"','data-team-range="year"',
  'data-team-person','selectedTeamPerson','aggregatePersonRecords','browserRowsHtml(detailItems,view,columns)',
  '团队工作只改变观察入口；具体处理仍回到同一条Work Item。'
]) must(page.includes(token),`团队工作能力缺失：${token}`);
must(page.includes('这里帮助协同和资源判断，不做人员评价。'),"团队工作边界没有明确为协同而非人员评价");

// 6) 工作记录回归历史事实账本，不再承担人员汇总主入口。
must(page.includes('function recordsShellHtml()'),"工作记录Shell缺失");
must(page.includes('历史工作事实')&&page.includes('团队当前工作分布已经移到“团队工作”'),"工作记录没有收口为历史事实");
must(page.includes('if(id==="work-records")return ["completed","cancelled","archived"].includes(item.status)'),"工作记录没有限定历史/闭环事实口径");
must(!page.includes('data-record-view="people"')&&!page.includes('人员工作汇总'),"工作记录仍保留旧人员汇总主入口");

// 7) 本版是前端结构收口，不新增DB迁移/Backend Schema。
must(core.includes('workHomeVersion:"V1.9.36"'),"Backend基线发生意外变化；V1.9.37不应要求Backend升级");
must(!fs.existsSync(path.join(repoRoot,"data-code/migrations/0061_work_home_v1937.sql")),"V1.9.37不应新增数据库迁移");
must(system.includes('v1.9.37-work-home-structure-finalization'),"Work Home模块缓存版本未升级到V1.9.37");
must(page.includes('v=20260827-v1.9.37-manual-section-anchor'),"出版章节锚点没有独立缓存版本");
must(indexHtml.includes('miwa-system.js?v=20260827-v1.9.37-work-home-structure-finalization'),"AIONE主入口缓存版本未升级到V1.9.37");

console.log("V1.9.37 Work Home structure finalization validation passed.");
