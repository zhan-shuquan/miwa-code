import { SYSTEM_TREE, STORE_TAXONOMIES, findNode } from "./category-center-preview-data.js";

export function renderPageShell(state) {
  return `
    <section class="category-center-preview" data-category-center-preview>
      ${renderPageHeader(state)}
      ${renderTabs(state)}
      <div class="category-view-host" data-category-view-host>${renderCurrentView(state)}</div>
      ${renderDialogs()}
      <div class="category-toast" data-category-toast aria-live="polite"></div>
    </section>`;
}

export function renderCurrentView(state) {
  if (state.view === "overview") return renderOverview();
  if (state.view === "store") return renderStoreView(state);
  if (state.view === "mapping") return renderMappingView(state);
  return renderSystemView(state);
}

export function renderTabs(state) {
  const tabs = [["overview", "概览"], ["system", "系统分类"], ["store", "店铺分类"], ["mapping", "分类映射"]];
  return `<nav class="category-tabs" aria-label="分类中心章节小节">${tabs.map(([id, label]) => `<button type="button" data-view="${id}" class="${state.view === id ? "is-active" : ""}">${label}</button>`).join("")}</nav>`;
}

function renderPageHeader(state) {
  return `
    <header class="category-page-header">
      <div>
        <div class="category-page-kicker">商品之家 · 第01章</div>
        <h1>分类中心</h1>
        <p>用一套可视化分类母版，统一系统分类与店铺分类；辅助分类只负责快速映射和取得代码。</p>
      </div>
      <div class="category-page-actions" aria-label="分类中心常规操作">
        <button type="button" class="tax-btn" data-action="batch"><span class="miwa-semantic-icon" data-icon="apps"></span>${state.manageMode ? "退出管理" : "批量管理"}</button>
        <button type="button" class="tax-btn" data-action="io"><span class="miwa-semantic-icon" data-icon="file"></span>导入 / 导出</button>
        <button type="button" class="tax-btn tax-btn--primary" data-action="new"><span aria-hidden="true">＋</span>新建分类</button>
        <div class="tax-more-wrap">
          <button type="button" class="tax-btn tax-btn--icon" data-action="more" aria-label="更多操作"><span class="miwa-semantic-icon" data-icon="more"></span></button>
          <div class="tax-more-menu" data-more-menu hidden>
            <button type="button" data-tool="settings"><span class="miwa-semantic-icon" data-icon="settings"></span>分类设置</button>
            <button type="button" data-tool="trash"><span class="miwa-semantic-icon" data-icon="file"></span>回收站</button>
            <button type="button" data-tool="history"><span class="miwa-semantic-icon" data-icon="evidence"></span>操作记录</button>
          </div>
        </div>
      </div>
    </header>`;
}

function renderOverview() {
  return `
    <div class="category-manual">
      <section class="manual-hero">
        <div class="manual-number">01</div>
        <div><span>商品之家学习手册</span><h2>先把商品世界分清楚，再建立商品。</h2><p>美和系统分类是主干；店铺分类负责顾客看到的陈列逻辑；平台、海关、GS1分类作为辅助体系，通过映射快速取得所需代码。</p></div>
      </section>
      <section class="manual-grid">
        <article><b>系统分类</b><h3>商品本质是什么</h3><p>一级 → 二级 → 三级，形成美和统一 Master Taxonomy，也是属性、规格、AI和自动化的业务入口。</p></article>
        <article><b>店铺分类</b><h3>顾客怎么找到商品</h3><p>与系统分类共用同一套可视化装修，但允许按店铺、季节、活动和销售策略灵活组合。</p></article>
        <article><b>分类映射</b><h3>外部系统要什么代码</h3><p>平台分类、海关编码、GS1 GPC不抢主视觉，只在需要时通过映射、API或标准库快速查询。</p></article>
      </section>
      <section class="manual-flow"><div><span>系统分类</span><strong>美和标准</strong></div><i>→</i><div><span>商品属性</span><strong>具体商品事实</strong></div><i>→</i><div><span>分类映射</span><strong>外部代码</strong></div><i>→</i><div><span>店铺分类</span><strong>销售陈列</strong></div></section>
    </div>`;
}

function renderSystemView(state) {
  const root = findNode(SYSTEM_TREE, state.systemRootId) || SYSTEM_TREE[0];
  const child = findNode(root.children, state.systemChildId) || root.children[0];
  const leafNode = findNode(child.children, state.systemLeafId) || child.children[0];
  return `${renderValidationNote("系统分类", "当前为交互验证数据；数量、分类名称与最终三级目录需继续按真实业务确认。")}${renderTaxonomyExplorer(state, { mode: "system", roots: SYSTEM_TREE, root, child, leafNode })}${renderLeafDetail(leafNode, { mode: "system", root, child })}`;
}

function renderStoreView(state) {
  const tree = STORE_TAXONOMIES[state.storeId] || STORE_TAXONOMIES.nagai;
  const root = findNode(tree.roots, state.storeRootId) || tree.roots[0];
  const child = findNode(root.children, state.storeChildId) || root.children[0];
  const leafNode = findNode(child.children, state.storeLeafId) || child.children[0];
  return `
    <div class="store-control-strip">
      <label>店铺<select data-store-select>${Object.entries(STORE_TAXONOMIES).map(([id, item]) => `<option value="${id}" ${id === state.storeId ? "selected" : ""}>${item.label}</option>`).join("")}</select></label>
      <span><b>同步对象</b>${tree.sync}</span><span><b>定位</b>分类与陈列控制室</span>
      <button type="button" class="tax-btn" data-action="sync-store">检查与乐天差异</button>
    </div>
    ${renderValidationNote("店铺分类", "与系统分类共用同一 Visual Taxonomy Explorer；这里的示例目录仅用于验证交互，不代表正式店铺分类。")}
    ${renderTaxonomyExplorer(state, { mode: "store", roots: tree.roots, root, child, leafNode })}
    ${renderLeafDetail(leafNode, { mode: "store", root, child, store: tree })}`;
}

function renderMappingView(state) {
  const root = findNode(SYSTEM_TREE, state.systemRootId) || SYSTEM_TREE[0];
  const child = findNode(root.children, state.systemChildId) || root.children[0];
  const leafNode = findNode(child.children, state.systemLeafId) || child.children[0];
  const path = `${root.name} > ${child.name} > ${leafNode?.name || "待选择三级分类"}`;
  return `
    <section class="mapping-view">
      <header class="mapping-head"><div><span>当前系统分类</span><h2>${path}</h2><p>系统分类是主干；辅助体系只返回对应分类路径、代码、来源和确认状态。</p></div><button type="button" class="tax-btn" data-action="mapping-search"><span class="miwa-semantic-icon" data-icon="search"></span>重新查询映射</button></header>
      <div class="mapping-grid">
        ${mappingCard("平台分类", "Rakuten / Amazon / 1688", "待 API / 平台分类库映射", "平台上架时返回 Genre / Browse Node / Category ID", "platform")}
        ${mappingCard("海关分类", "HS / 日本税则 / 中国海关", leafNode?.name.includes("袜") ? "6115（候选章目）" : "待标准库映射", "最终编码必须结合具体商品材质、用途、结构等属性确认", "customs")}
        ${mappingCard("GS1分类", "GPC", "待 GS1 标准库映射", "返回 Segment / Family / Class / Brick 与对应代码", "gs1")}
      </div>
      <div class="mapping-note"><strong>关键边界</strong><span>HS / GPC 的分类体系在分类中心；具体商品最终确认的编码写回商品属性 / 标识信息。一份事实，多处调用。</span></div>
    </section>`;
}

function mappingCard(title, subtitle, code, description, kind) {
  return `<article class="mapping-card mapping-card--${kind}"><div class="mapping-card__icon">${kind === "platform" ? "🛒" : kind === "customs" ? "🌐" : "▦"}</div><div><span>${subtitle}</span><h3>${title}</h3><code>${escapeHtml(code)}</code><p>${description}</p><div class="mapping-card__actions"><button type="button" data-copy="${escapeHtml(code)}">复制代码</button><button type="button" data-action="open-${kind}">查看来源</button></div></div></article>`;
}

function renderValidationNote(title, text) {
  return `<div class="taxonomy-validation-note"><span class="miwa-semantic-icon" data-icon="help"></span><strong>${title} · 交互验证版</strong><span>${text}</span></div>`;
}

function renderTaxonomyExplorer(state, { mode, roots, root, child, leafNode }) {
  const labels = mode === "system" ? ["一级分类（12大类）", `二级分类 · ${root.name}`, `三级分类 · ${child.name}`] : ["一级店铺分类", `二级店铺分类 · ${root.name}`, `三级店铺分类 · ${child.name}`];
  return `<section class="taxonomy-explorer ${state.manageMode ? "is-managing" : ""}" data-taxonomy-mode="${mode}">${state.manageMode ? renderBatchBar(state) : ""}${renderLevelSection(state, { level: 1, label: labels[0], nodes: roots, selectedId: root.id, mode, compact: state.compactParents })}${renderLevelSection(state, { level: 2, label: labels[1], nodes: root.children || [], selectedId: child?.id, mode, visual: true })}${renderLevelSection(state, { level: 3, label: labels[2], nodes: child?.children || [], selectedId: leafNode?.id, mode, compactCards: true })}</section>`;
}

function renderLevelSection(state, { level, label, nodes, selectedId, mode, compact = false, visual = false, compactCards = false }) {
  return `<section class="taxonomy-level taxonomy-level--${level} ${compact ? "is-compact" : ""}" data-tax-level="${level}"><header class="taxonomy-level__head"><div><span>LEVEL ${level}</span><h2>${label}</h2></div><div class="taxonomy-level__actions"><button type="button" data-level-action="sort" data-level="${level}">设置排序</button><button type="button" data-level-action="toggle" data-level="${level}">${compact ? "展开" : "展开/收起"}</button><button type="button" data-level-action="add" data-level="${level}">＋ 新建${level === 1 ? "一级" : level === 2 ? "二级" : "三级"}</button></div></header><div class="taxonomy-cards taxonomy-cards--${level} ${visual ? "taxonomy-cards--visual" : ""} ${compactCards ? "taxonomy-cards--compact" : ""}">${nodes.map((node) => renderTaxonomyCard(state, node, { level, selected: node.id === selectedId, mode, visual, compactCards })).join("") || `<div class="taxonomy-empty">暂无下级分类</div>`}</div></section>`;
}

function renderTaxonomyCard(state, node, { level, selected, mode, visual, compactCards }) {
  const selectable = state.manageMode ? `<input type="checkbox" class="taxonomy-card__check" data-select-node="${node.id}" ${state.selected.has(node.id) ? "checked" : ""} aria-label="选择${node.name}">` : "";
  const meta = mode === "store" ? (node.children?.length ? `${node.children.length} 个下级 · 同步状态待校验` : "店铺陈列节点") : (node.children?.length ? `${node.children.length} 个下级分类` : "末级分类");
  return `<article class="taxonomy-card tone-${node.tone || "stone"} ${selected ? "is-selected" : ""} ${compactCards ? "is-compact-card" : ""}" data-node-id="${node.id}" data-node-level="${level}" tabindex="0" role="button" aria-pressed="${selected}">${selectable}<button type="button" class="taxonomy-card__menu" data-card-menu="${node.id}" aria-label="${node.name}更多操作">⋯</button><div class="taxonomy-card__visual ${visual ? "is-visual" : ""}"><span>${node.icon || "•"}</span></div><div class="taxonomy-card__body"><div class="taxonomy-card__title"><small>${node.id}</small><strong>${node.name}</strong></div><p>${meta}</p></div><span class="taxonomy-card__arrow">›</span></article>`;
}

function renderBatchBar(state) {
  return `<div class="taxonomy-batch-bar"><strong>管理模式</strong><span>已选择 ${state.selected.size} 项</span><div><button data-batch-action="move">移动</button><button data-batch-action="sort">调整排序</button><button data-batch-action="status">修改状态</button><button data-batch-action="merge">合并</button><button data-batch-action="export">导出</button><button class="danger" data-batch-action="disable">停用</button></div></div>`;
}

function renderLeafDetail(leafNode, context) {
  if (!leafNode) return "";
  const path = context.mode === "system" ? `${context.root.name} > ${context.child.name} > ${leafNode.name}` : `${context.store?.label || "店铺"} > ${context.root.name} > ${context.child.name} > ${leafNode.name}`;
  return `<section class="taxonomy-detail"><div class="taxonomy-detail__visual tone-${leafNode.tone || "stone"}"><span>${leafNode.icon || "•"}</span></div><div class="taxonomy-detail__main"><span>${context.mode === "system" ? "当前分类对象" : "当前店铺陈列节点"}</span><h2>${leafNode.name}</h2><p>${path}</p><div class="taxonomy-detail__chips"><span>编号 ${leafNode.id}</span><span>${context.mode === "system" ? "关联属性模板" : "关联商品规则"}</span><span>${context.mode === "system" ? "可查询辅助分类代码" : "可同步店铺"}</span></div></div><div class="taxonomy-detail__actions"><button type="button" class="tax-btn" data-action="edit-current">编辑</button><button type="button" class="tax-btn" data-action="view-related">查看关联</button>${context.mode === "system" ? `<button type="button" class="tax-btn tax-btn--primary" data-action="view-mapping">查看分类映射</button>` : `<button type="button" class="tax-btn tax-btn--primary" data-action="sync-current">同步到店铺</button>`}</div></section>`;
}

function renderDialogs() {
  return `
    <dialog class="taxonomy-dialog" data-dialog="io"><form method="dialog"><header><div><span>分类数据工具</span><h2>导入 / 导出</h2><p>先校验、再预览变化，确认后才执行；正式版将接入统一导入服务。</p></div><button value="cancel" aria-label="关闭">×</button></header><div class="dialog-tabs"><button type="button" class="is-active">导入分类</button><button type="button">导出分类</button></div><div class="dialog-panel"><label class="upload-box"><input type="file" accept=".csv,.xlsx" data-import-file><span>选择 CSV / Excel</span><small data-import-name>尚未选择文件</small></label><div class="dialog-checks"><span>✓ 字段校验</span><span>✓ 父级关系检查</span><span>✓ 编码冲突检查</span><span>✓ 变更预览</span></div></div><footer><button value="cancel" class="tax-btn">取消</button><button type="button" class="tax-btn" data-action="download-template">下载模板</button><button type="button" class="tax-btn tax-btn--primary" data-action="preview-import">预览导入</button></footer></form></dialog>
    <dialog class="taxonomy-dialog taxonomy-dialog--small" data-dialog="new"><form method="dialog" data-new-form><header><div><span>当前分类树</span><h2>新建分类</h2><p>预览版只在当前会话中新增，用于验证入口、层级和表单。</p></div><button value="cancel" aria-label="关闭">×</button></header><div class="form-grid"><label>分类名称<input name="name" required placeholder="例如：冬季功能袜"></label><label>分类编号<input name="code" placeholder="自动生成或手动输入"></label><label>所属层级<select name="level"><option value="1">一级分类</option><option value="2" selected>二级分类</option><option value="3">三级分类</option></select></label><label>状态<select name="status"><option>启用</option><option>草稿</option></select></label></div><footer><button value="cancel" class="tax-btn">取消</button><button value="default" class="tax-btn tax-btn--primary">保存预览</button></footer></form></dialog>
    <dialog class="taxonomy-dialog taxonomy-dialog--small" data-dialog="tool"><form method="dialog"><header><div><span>治理工具</span><h2 data-tool-title>分类设置</h2><p data-tool-description>分类设置、回收站与操作记录统一收在低频治理入口。</p></div><button value="cancel" aria-label="关闭">×</button></header><div class="tool-content" data-tool-content></div><footer><button value="cancel" class="tax-btn tax-btn--primary">完成</button></footer></form></dialog>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
