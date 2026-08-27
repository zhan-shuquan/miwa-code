import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const must=(c,m)=>{if(!c)throw new Error(m);};

const page=read("js/pages/miwa-work-home.js");
const html=read("pages/work-home/template.html");
const routes=read("js/config/route-registry.js");
const sidebar=read("js/config/sidebar-registry.js");
const header=read("components/shell/header/desktop-header.html");
const company=read("js/data/miwa-company-content.js");
const system=read("js/miwa-system.js");

for(const token of [
  'label:"工作概览"', 'label:"今日工作"', 'label:"全部工作"', 'label:"我的关注"',
  'label:"我的建议"', 'label:"我的创新"', 'label:"事业工作"', 'label:"等待中"',
  'label:"异常处理"', 'label:"待验收"', 'label:"工作记录"'
]) must(sidebar.includes(token),`Sidebar缺少锁定入口：${token}`);

const sidebarOrder=[
  'label:"工作概览"','label:"今日工作"','label:"全部工作"','label:"我的关注"',
  'label:"我的建议"','label:"我的创新"','label:"事业工作"','label:"等待中"',
  'label:"异常处理"','label:"待验收"','label:"工作记录"'
];
let lastSidebarIndex=-1;
for(const token of sidebarOrder){
  const nextIndex=sidebar.indexOf(token);
  must(nextIndex>lastSidebarIndex,`Sidebar顺序不符合锁定版：${token}`);
  lastSidebarIndex=nextIndex;
}

must(header.includes('href="#/work-today" data-header-route="work"'),"Header工作之家未默认进入今日工作");
for(const id of ["work-suggestions","work-innovations","work-business-more","work-waiting","work-blocked"]) must(routes.includes(`"${id}"`),`缺少工作之家路由 ${id}`);

for(const token of [
  'data-work-reset', '重置', 'data-work-more-count', '更多筛选',
  'data-work-like', '点赞后端', 'data-work-view="card"', 'data-work-view="list"', 'data-work-cols="3"', 'data-work-cols="4"', 'data-work-cols="6"',
  'work-waiting', '异常处理', 'displayStatusLabel'
]) must(page.includes(token),`统一工作事项一览能力缺失：${token}`);

for(const token of [
  'data-record-person-view="card"', 'data-record-person-view="list"',
  'data-record-item-view="card"', 'data-record-item-view="list"',
  'AIONEPeopleDirectory', 'browserRowsHtml(sortItems(detailItems,"updated"),view)'
]) must(page.includes(token),`工作记录统一浏览/人员主数据能力缺失：${token}`);

for(const token of [
  '第11章 我的建议与我的创新', '第12章 事业工作怎么用', '第13章 等待中怎么用',
  '第14章 异常处理怎么用', '第15章 待验收怎么用', '第16章 工作记录怎么用'
]) must(page.includes(token),`美和工作手册未按锁定Sidebar补齐：${token}`);

must(company.includes('"company-suggestion-center"')&&company.includes('"company-innovation-center"'),"美和之家经营与战略缺少建议/创新中心");
must(company.includes('建议中心属于美和之家')&&company.includes('创新中心属于美和之家'),"建议/创新中心归属说明缺失");
must(html.includes('.miwa-work-reset')&&html.includes('.miwa-work-like')&&html.includes('.miwa-work-contribution'),"V1.9.35页面样式缺失");
must(system.includes('v1.9.35-work-home-unified-browser-contributions'),"Work Home前端缓存版本未更新");

console.log("V1.9.35 Work Home unified browser + contribution entrances validation passed.");
