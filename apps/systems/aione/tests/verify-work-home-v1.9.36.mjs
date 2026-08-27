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
const core=read("backend/src/routes/core.js");
const preflight=read("backend/scripts/preflight.js");
const system=read("js/miwa-system.js");
const migration=readRepo("data-code/migrations/0060_object_reactions.sql");

for(const token of [
  'data-work-cols="2"','data-work-cols="3"','data-work-cols="4"',
  'data-work-time','全部时间','本周','本月','本年','自定义',
  'data-work-more-filter','data-work-more-count','data-work-reset','重置',
  'data-work-money','data-work-min-amount','timeMatches','moneyMatches',
  'miwa-work-toolbar-actions','miwa-work-filter-actions'
]) must(page.includes(token)||html.includes(token),`统一Work Browser缺少：${token}`);

must(!page.includes('data-work-cols="6"'),"工作事项仍暴露6列按钮");
must(!html.includes('cols-6'),"工作事项样式仍保留6列布局");
must(page.includes('["2","3","4"].includes'),"卡片列数未限制为2/3/4");
must(html.includes('@container (max-width:980px)')&&html.includes('@container (max-width:640px)'),"工作卡未按容器宽度自适应降列");

for(const token of [
  'router.post("/work-home/:id/like"','router.delete("/work-home/:id/like"',
  'scope = ["related", "all", "following", "liked"]','AS is_liked','AS like_count',
  'AS money_summary','AS active_seconds','workHomeVersion:"V1.9.36"'
]) must(core.includes(token),`Backend工作互动/摘要能力缺失：${token}`);

must(migration.includes('CREATE TABLE IF NOT EXISTS public.object_reactions'),"点赞互动表迁移缺失");
must(migration.includes('UNIQUE (object_type, object_id, person_id, reaction_type)'),"点赞幂等唯一约束缺失");
must(preflight.includes('"object_reactions"'),"数据库预检未包含object_reactions");

for(const token of [
  'LIKED_WORK_ENDPOINT','interactionView==="liked"','toggleLike','data-work-liked-history',
  'isLiked:Boolean(item.isLiked)','likeCount:Number(item.likeCount||0)||0'
]) must(page.includes(token),`点赞/关注前端真实数据闭环缺失：${token}`);

for(const token of [
  'data-record-items-toolbar','applyBrowserFilters(detailItemsBase,{useRoute:false})',
  'browserRowsHtml(detailItems,view,columns)','data-record-range="week"','data-record-range="month"','data-record-range="year"'
]) must(page.includes(token),`工作记录未复用统一Work Item Browser：${token}`);

must(page.includes('moneyText(item)')&&page.includes('durationText(item.activeSeconds)'),"工作卡/列表未体现钱与已记录操作时间");
must(system.includes('v1.9.36-work-home-browser-experience-lock'),"Work Home缓存版本未升级");

console.log("V1.9.36 Work Home browser experience lock validation passed.");
