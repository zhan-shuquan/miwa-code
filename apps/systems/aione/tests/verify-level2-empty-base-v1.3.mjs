import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const must = (cond, msg) => { if (!cond) throw new Error(msg); };
const count = (text, token) => (text.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

const emptyBase = read('layouts/level2-empty-base.html');
const baseJs = read('js/templates/level2-empty-base.js');
const registry = read('js/templates/template-registry.js');
const businessHtml = read('pages/business-home/template.html');
const contentHtml = read('pages/content-home/template.html');
const businessJs = read('js/pages/business-page-template.js');
const contentJs = read('js/pages/content-page-template.js');
const workspace = read('js/components/universal-workspace.js');
const views = read('js/components/view-registry.js');
const presenter = read('js/components/object-presenter.js');
const nine = read('js/components/miwa-nine-elements.js');
const defs = read('js/config/business-page-definitions.js');
const header = read('components/shell/header/desktop-header.html');
const headerJs = read('js/shell/header.js');
const config = read('js/config/system-config.js');
const index = read('index.html');

// 1. Unique Empty Base
must(fs.existsSync(path.join(root, 'layouts/level2-empty-base.html')), '缺少唯一二级空母版');
for (const slot of ['page-header', 'main', 'nine-elements', 'portal']) {
  must(emptyBase.includes(`data-level2-slot="${slot}"`), `空母版缺少挂载位：${slot}`);
}
must(!/客户|商品|选品|通知中心|美和之家|知识之家/.test(emptyBase), '空母版混入具体业务内容');
must(baseJs.includes('mountLevel2EmptyBase'), '缺少空母版挂载函数');
must(baseJs.includes('aione:level2-mounted') && baseJs.includes('workEvidenceScope'), '空母版缺少未来工作证据/时间统计挂载接口');
must(baseJs.includes('LEVEL2_BASE_URL = "./layouts/level2-empty-base.html"'), '空母版URL不是唯一来源');

// 2. Template Registry only two core recipes for current stage
const recipeIds = [...registry.matchAll(/^\s{2}(?:"([^"]+)"|([a-zA-Z0-9_-]+)):\s*Object\.freeze\(\{/gm)].map(m => m[1] || m[2]);
must(recipeIds.length === 2 && recipeIds.includes('standard-business') && recipeIds.includes('content'), `当前核心Recipe应只有standard-business/content，实际：${recipeIds.join(',')}`);
must(registry.includes('base: "level2-empty-base"'), 'Recipe未绑定唯一空母版');

// 3. Static page entries must stay thin; no component copies
must(businessHtml.includes('data-template-recipe="standard-business"'), '业务页面入口未声明标准业务母版');
must(contentHtml.includes('data-template-recipe="content"'), '内容页面入口未声明内容母版');
for (const [name, html] of [['业务入口', businessHtml], ['内容入口', contentHtml]]) {
  must(html.trim().split(/\n/).length <= 3, `${name}不再是薄入口，疑似复制页面结构`);
  for (const forbidden of ['miwa-object-card', 'miwa-object-table', 'miwa-nine-elements', 'miwa-object-toolbar', 'miwa-level2-block__head']) {
    must(!html.includes(forbidden), `${name}复制了标准组件：${forbidden}`);
  }
}

// 4. Both page families call shared Empty Base + shared components
for (const [name, js] of [['标准业务页', businessJs], ['内容页', contentJs]]) {
  must(js.includes('mountLevel2EmptyBase'), `${name}没有调用唯一空母版`);
  must(js.includes('renderPageHeader'), `${name}没有调用共享PageHeader`);
  must(js.includes('createUniversalWorkspace'), `${name}没有调用统一Workspace`);
  must(js.includes('renderObjectCards') && js.includes('renderObjectList'), `${name}没有调用共享对象卡片/列表`);
  must(js.includes('renderMiwaNineElements'), `${name}没有调用共享美和9要素`);
}
must(!businessJs.includes('class="miwa-object-card"'), '业务页内复制了对象卡片HTML');
must(!contentJs.includes('class="miwa-object-card"'), '内容页内复制了对象卡片HTML');

// 5. Universal Workspace engineering basics
for (const token of [
  'data-workspace-search', 'data-workspace-filter', 'data-workspace-sort',
  'data-workspace-import', 'data-workspace-export', 'data-workspace-view-switch',
  'cardColumns', '[3, 4, 6]', 'data-card-columns=',
  'localStorage', 'setCount', 'showEmpty', 'showNoResults', 'showLoading', 'showError', 'showForbidden', 'data-workspace-reset', 'sortItems'
]) must(workspace.includes(token), `统一Workspace缺少基础能力：${token}`);

for (const id of ['card','list','table','kanban','calendar','gantt','gallery','form','chart']) {
  must(new RegExp(`\\b${id}:\\s*Object\\.freeze`).test(views), `View Registry缺少：${id}`);
}
must(presenter.includes('renderObjectCards') && presenter.includes('renderObjectList'), '缺少共享对象Presenter');

// 6. MIWA 9 Elements order + precise internal knowledge routes
const labels = [...defs.matchAll(/\{ key: "[^"]+", label: "([^"]+)"/g)].slice(0, 9).map(m => m[1]);
const expected = ['目标','人','物','事','平台','时间','钱','信息','结果'];
must(JSON.stringify(labels) === JSON.stringify(expected), `美和9要素顺序错误：${labels.join('|')}`);
must(nine.includes('KNOW-MIWA-METHODOLOGY'), '9要素缺少美和方法论内部知识路由');
must(nine.includes('KNOW-MIWA-9') && nine.includes('anchor'), '9要素缺少精准知识锚点路由');

// 7. Header: one notification-center entry, before Today Work; top strip = 今日印象 | 日程 | 通知
must(count(header, 'data-header-route="notifications"') === 1, '桌面Header通知中心入口不是唯一一个');
const notifPos = header.indexOf('data-header-route="notifications"');
const workPos = header.indexOf('data-header-route="work"');
must(notifPos >= 0 && workPos >= 0 && notifPos < workPos, '通知中心图标必须位于今日工作左侧');
for (const token of ['今日印象', 'miwaDynamicSchedule', '>日程<', 'miwaDynamicNotice', '>通知<']) must(header.includes(token), `顶部信息带缺少：${token}`);
must(!header.includes('>节气<') && !header.includes('>星座<'), '顶部信息带不应显示“节气/星座”名称');
must(headerJs.includes('setImportantSchedule') && headerJs.includes('clearImportantSchedule'), 'Header缺少重要日程运行时接口');
must(headerJs.includes('#/calendar?filter=important'), '重要日程未路由到美和日历重要日程筛选');

// 8. Version/cache marker
must(config.includes('20260822-v1.3.0-level2-empty-base-candidate'), '系统配置未标记V1.3候选版本');
must(index.includes('20260822-v1.3.0-level2-empty-base-candidate'), 'index缓存版本未更新到V1.3候选');

console.log('V1.3 Level-2 Empty Base validation passed.');
