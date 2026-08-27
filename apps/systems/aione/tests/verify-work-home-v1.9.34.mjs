import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const must=(c,m)=>{if(!c)throw new Error(m);};

const page=read("js/pages/miwa-work-home.js");
const html=read("pages/work-home/template.html");
const core=read("backend/src/routes/core.js");
const help=read("js/data/help-center-articles.js");
const content=read("js/config/content-page-definitions.js");
const system=read("js/miwa-system.js");

for(const token of [
  'id==="work-today"||id==="work-following"',
  'data-work-view="card"',
  'data-work-view="list"',
  '与今日工作使用同一工作事项一览',
  '关注接口尚未部署到当前AIONE Backend'
]) must(page.includes(token),`今日/关注统一工作事项一览或真实关注错误提示缺失：${token}`);

for(const token of [
  'data-record-range="week"',
  'data-record-range="month"',
  'data-record-range="year"',
  'data-record-view="people"',
  'data-record-view="items"',
  'aggregatePersonRecords',
  'participantFacts',
  'PREVIEW_IDENTITIES'
]) must(page.includes(token),`工作记录人员事实汇总能力缺失：${token}`);

for(const token of [
  'PART 02｜第08章 今日工作怎么用',
  '第09章 全部工作怎么用',
  '第10章 我的关注怎么用',
  '第11章 事业工作怎么用',
  '第12章 等待与阻塞怎么用',
  '第13章 待验收怎么用',
  '第14章 工作记录怎么用',
  'guideStepsHtml',
  'guideLink',
  'miniWorkCard'
]) must(page.includes(token),`《美和工作手册》使用指南不完整：${token}`);

must(html.includes('.miwa-work-person-avatar img{'),"人员头像图片样式缺失");
must(html.includes('.miwa-work-record-range')&&html.includes('.miwa-work-record-tabs'),"工作记录时间/视图控制样式缺失");

must(core.includes('router.get("/work-home/capabilities"'),"工作之家能力探针缺失");
must(core.includes('workHomeVersion:"V1.9.34"'),"工作之家能力版本不是V1.9.34");
must(core.includes('router.get("/work-home/people-summary"'),"人才之家可复用人员工作汇总接口缺失");
must(core.includes("participant_role <> 'observer'"),"关注者被错误计入工作贡献事实");
must(core.includes('performanceScore:false'),"工作事实层未明确与绩效评分分离");
must(core.includes("Asia/Tokyo"),"工作记录时间范围未按日本时区处理");

must(help.includes('WORK_HOME_MANUAL_V2'),"帮助中心缺少工作手册聚合条目");
must(help.includes('唯一正式入口')||help.includes('不重复'),"帮助中心未体现一份知识多处调用");
must(content.includes('HELP_CENTER_ARTICLES.WORK_HOME_MANUAL_V2'),"知识/帮助内容定义未聚合工作手册");
must(system.includes('v1.9.34-work-home-context-records-upgrade'),"工作之家V1.9.34缓存版本未更新");

console.log("V1.9.34 Work Home context + records upgrade validation passed.");
