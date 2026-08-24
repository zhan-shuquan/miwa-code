import { getRouteId } from "../config/route-registry.js";
import { getContentPageDefinition } from "../config/content-page-definitions.js";
import { mountLevel2EmptyBase } from "../templates/level2-empty-base.js";
import { getTemplateRecipe } from "../templates/template-registry.js";
import { renderPageHeader } from "../components/page-header.js";
import { createLevel2Block } from "../components/level2-block.js";
import { renderCoreMetrics } from "../components/core-metrics.js";
import { createUniversalWorkspace } from "../components/universal-workspace.js";
import { renderObjectCards, renderObjectList } from "../components/object-presenter.js";
import { renderMiwaNineElements } from "../components/miwa-nine-elements.js";
import { bindHorizontalRails } from "../components/horizontal-rail.js";
import { loadContentObjects, createContentObject, importContentObjects } from "../data/content-object-store.js";
import { getActiveSystemParameters } from "../shell/system-settings.js";
import { coerceFieldValue, getHtmlInputType, validateObjectByFields } from "../fields/field-standard.js";

const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
const fmtDate = (value) => value ? new Date(value).toLocaleString("zh-CN", { month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" }) : "—";

function parseCsv(text) {
  const rows = String(text || "").split(/\r?\n/).filter(Boolean).map((line) => {
    const result = []; let cell = ""; let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === "," && !quoted) { result.push(cell); cell = ""; }
      else cell += ch;
    }
    result.push(cell); return result;
  });
  if (!rows.length) return [];
  const headers = rows.shift().map((x) => x.trim());
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function downloadCsv(filename, rows, fields = []) {
  const exportFields = fields.filter((field) => !["body"].includes(field.key));
  const quote = (value) => `"${String(value ?? "").replaceAll('"','""')}"`;
  const lines = [exportFields.map((field) => quote(field.label)).join(",")];
  rows.forEach((row) => lines.push(exportFields.map((field) => quote(row[field.key])).join(",")));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type:"text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

function metricValue(metric, items) {
  if (metric.source === "objects") return items.length;
  if (metric.status) return items.filter((item) => item.status === metric.status).length;
  if (metric.value !== undefined) return metric.value;
  return "待验证";
}

function getHashQuery() {
  const hash = String(window.location.hash || "");
  const index = hash.indexOf("?");
  return new URLSearchParams(index >= 0 ? hash.slice(index + 1) : "");
}

function createContentReader(portal) {
  if (!portal) return null;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <dialog class="miwa-content-reader" data-content-reader>
      <header>
        <div>
          <small data-content-reader-type>知识内容</small>
          <h2 data-content-reader-title>内容标题</h2>
          <div class="miwa-content-reader__meta" data-content-reader-meta></div>
        </div>
        <button type="button" data-content-reader-close aria-label="关闭">×</button>
      </header>
      <article class="miwa-content-reader__body" data-content-reader-body></article>
      <footer><button type="button" class="ghost" data-content-reader-close>关闭</button></footer>
    </dialog>`;
  const dialog = wrapper.firstElementChild;
  portal.appendChild(dialog);
  const title = dialog.querySelector("[data-content-reader-title]");
  const type = dialog.querySelector("[data-content-reader-type]");
  const meta = dialog.querySelector("[data-content-reader-meta]");
  const body = dialog.querySelector("[data-content-reader-body]");
  dialog.querySelectorAll("[data-content-reader-close]").forEach((button) => button.addEventListener("click", () => dialog.close()));
  return {
    dialog,
    open(item = {}) {
      title.textContent = item.title || "知识内容";
      type.textContent = item.type || "知识内容";
      meta.textContent = [item.status, item.version, item.owner].filter(Boolean).join(" · ");
      body.textContent = item.body || item.summary || "暂无正文。";
      if (!dialog.open) dialog.showModal();
    }
  };
}

function createContentDialog(portal, def, types) {
  if (!portal) return null;
  const lifecycle = ["讨论中","验证中","正式锁定","待确认","废止"];
  const linkTypes = [{value:"internal",label:"AIONE内部内容"},{value:"external",label:"外部来源"}];
  const renderField = (field) => {
    const required = field.required ? "required" : "";
    const full = field.ui?.span === "full" ? ' style="grid-column:1/-1"' : "";
    if (field.key === "type") return `<label${full}><span>${esc(field.label)}${field.required?" *":""}</span><select name="${esc(field.key)}" ${required}><option value="">请选择</option>${types.map((x)=>`<option>${esc(x)}</option>`).join("")}</select></label>`;
    if (field.key === "status") return `<label${full}><span>${esc(field.label)}</span><select name="status">${lifecycle.map((x)=>`<option>${esc(x)}</option>`).join("")}</select></label>`;
    if (field.key === "linkType") return `<label${full}><span>${esc(field.label)}</span><select name="linkType">${linkTypes.map((x)=>`<option value="${esc(x.value)}">${esc(x.label)}</option>`).join("")}</select></label>`;
    if (field.ui?.input === "textarea") return `<label class="miwa-content-textarea"${full}><span>${esc(field.label)}${field.required?" *":""}</span><textarea name="${esc(field.key)}" rows="${Number(field.ui?.rows)||3}" ${required} placeholder="${esc(field.ui?.placeholder||"")}"></textarea></label>`;
    return `<label${full}><span>${esc(field.label)}${field.required?" *":""}</span><input name="${esc(field.key)}" type="${esc(getHtmlInputType(field))}" ${required}></label>`;
  };
  portal.innerHTML = `
    <dialog class="miwa-content-dialog" data-content-create-dialog>
      <form method="dialog" data-content-create-form>
        <header><div><small>统一内容入口</small><h2>${esc(def.createLabel || "新建内容")}</h2><p>人工与AI秘书使用同一内容对象与同一字段标准；页面只调用标准组件。</p></div><button type="button" data-content-dialog-close aria-label="关闭">×</button></header>
        <div class="miwa-content-form-grid">${def.fields.filter((field)=>field.ui?.input!=="textarea").map(renderField).join("")}</div>
        ${def.fields.filter((field)=>field.ui?.input==="textarea").map(renderField).join("")}
        <footer><button type="button" class="ghost" data-content-dialog-close>取消</button><button type="submit" class="primary">保存</button></footer>
      </form>
    </dialog>
    <div class="miwa-business-toast" data-content-toast aria-live="polite"></div>`;
  return {
    dialog: portal.querySelector("[data-content-create-dialog]"),
    form: portal.querySelector("[data-content-create-form]"),
    toast: portal.querySelector("[data-content-toast]")
  };
}

export async function initContentPage() {
  const routeId = getRouteId();
  const def = getContentPageDefinition(routeId);
  const entry = document.getElementById("miwa-content-template-entry");
  if (!def || !entry) return false;
  if (!getTemplateRecipe("content")) throw new Error("内容母版Recipe未注册");

  const params = getActiveSystemParameters?.() || {};
  const configured = params.dictionaries?.[def.typeDictionaryKey];
  const configuredTypes = (Array.isArray(configured) && configured.length ? configured : def.types) || [];
  const types = [...new Set([...(def.requiredTypes || []), ...configuredTypes])];
  let items = loadContentObjects(routeId, def.seedObjects || []);
  let activeType = "";
  let toastTimer = null;
  const focusParams = getHashQuery();
  const focusId = focusParams.get("focus") || "";
  const anchorId = focusParams.get("anchor") || "";
  const requestedType = focusParams.get("type") || "";

  const base = await mountLevel2EmptyBase(entry, { routeId, recipeId:"content", pageKind:"content" });
  renderPageHeader(base.pageHeader, {
    icon: def.icon || "知",
    title: def.title,
    description: def.description,
    actions: [
      { key:"overview", label:def.overviewLabel || "内容概览" },
      { key:"create", label:`＋ ${def.createLabel || "新建内容"}`, primary:true, disabled:params.permissions?.allowCreate === false }
    ]
  });

  const typeBlock = types.length ? createLevel2Block(base.main, {
    id:`${routeId}-content-types`, title:def.typeTitle || "内容类型",
    description:"前三个重点类型优先显示；更多类型横向滑动，页面基础高度不变。",
    railTarget:`${routeId}-content-type-track`
  }) : null;
  if (typeBlock) {
    typeBlock.body.id = `${routeId}-content-type-track`;
    typeBlock.body.className = "miwa-horizontal-rail";
  }

  const metricBlock = createLevel2Block(base.main, {
    id:`${routeId}-content-metrics-block`, title:"核心指标",
    description:"只展示当前最常用的内容管理指标；一屏最多6项，更多横向滑动。",
    railTarget:`${routeId}-content-metrics`
  });
  metricBlock.body.id = `${routeId}-content-metrics`;

  const sortOptions = def.sortOptions || [
    { value:"default", label:"默认排序" },
    { value:"updated-desc", label:"最近更新", field:"updatedAt", direction:"desc", type:"date" },
    { value:"title-asc", label:"标题 A-Z", field:"title", direction:"asc" },
    { value:"status-asc", label:"状态", field:"status", direction:"asc" }
  ];
  const workspace = createUniversalWorkspace(base.main, {
    pageId: routeId,
    title: def.objectPlural || "内容",
    description:"同一内容对象支持搜索、筛选、排序与多视图展示；内容正文只维护一份。",
    searchPlaceholder:"搜索标题、分类、摘要",
    filterAllLabel:"全部类型",
    filterOptions: types,
    sortOptions,
    views: def.views || ["card","list"],
    defaultView:"card",
    cardColumns:[3,4,6],
    defaultCardColumns:3,
    allowImport: params.permissions?.allowImport !== false,
    allowExport: params.permissions?.allowExport !== false,
    onStateChange: () => renderItems(),
    onImportRequest: (fileInput) => fileInput?.click(),
    onExportRequest: () => {
      downloadCsv(`${def.title}_${new Date().toISOString().slice(0,10)}.csv`, getVisibleItems(), def.fields);
      showToast("已按当前筛选与排序结果导出CSV");
    }
  });

  const related = Array.isArray(def.related) ? def.related : [];
  const relatedBlock = related.length ? createLevel2Block(base.main, {
    id:`${routeId}-related-block`, title:"相关内容",
    description:"引用关联对象，不复制正文；保持单行，超出横向滑动。",
    railTarget:`${routeId}-related-track`
  }) : null;
  if (relatedBlock) {
    relatedBlock.body.id = `${routeId}-related-track`;
    relatedBlock.body.className = "miwa-horizontal-rail";
  }

  renderMiwaNineElements(base.nineElements, { context:def.title });
  const dialog = createContentDialog(base.portal, def, types);
  const reader = createContentReader(base.portal);
  if (requestedType && types.includes(requestedType)) workspace.setFilterOptions(types, requestedType);

  function showToast(text) {
    const node = dialog?.toast; if (!node) return;
    node.textContent = text; node.classList.add("is-visible"); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove("is-visible"), 2200);
  }
  function matches(item, workspaceState) {
    if (workspaceState.filter && item.type !== workspaceState.filter) return false;
    const q = workspaceState.query.trim().toLowerCase();
    return !q || [item.title,item.type,item.status,item.owner,item.summary].join(" ").toLowerCase().includes(q);
  }
  function getVisibleItems() {
    const state = workspace.getState();
    return workspace.sortItems(items.filter((item) => matches(item, state)));
  }
  function renderTypes() {
    if (!typeBlock) return;
    typeBlock.body.dataset.visible = String(Math.min(3, Math.max(1, types.length || 1)));
    typeBlock.body.innerHTML = types.map((type) => `<article class="miwa-content-type-card${workspace.getState().filter === type ? " is-active" : ""}" data-content-type="${esc(type)}"><header><strong>${esc(type)}</strong><b>${items.filter((x) => x.type === type).length}</b></header><p>统一管理${esc(type)}内容；分类在真实使用中逐步验证和锁定。</p></article>`).join("");
  }
  function renderMetrics() {
    renderCoreMetrics(metricBlock.body, (def.metrics || []).map((metric) => ({ label:metric.label, value:metricValue(metric, items) })), { maxVisible:6 });
  }
  function renderRelated() {
    if (!relatedBlock) return;
    relatedBlock.body.dataset.visible = String(Math.min(5, Math.max(1, related.length)));
    relatedBlock.body.innerHTML = related.map((item) => `<article class="miwa-auxiliary-card"><h3>${esc(item.title)}</h3><p>${esc(item.text || "")}</p>${item.route ? `<a href="#/${esc(item.route)}">进入 ›</a>` : ""}${item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">打开 ↗</a>` : ""}</article>`).join("");
  }
  function renderItems() {
    const rows = getVisibleItems();
    workspace.setCount(rows.length);
    renderTypes();
    if (!rows.length) {
      if (items.length && (workspace.getState().query || workspace.getState().filter)) workspace.showNoResults();
      else workspace.showEmpty(`暂无${def.objectPlural || "内容"}`, "可以新建内容、导入已有资料，或让AI秘书整理后进入同一内容对象。");
      return;
    }
    workspace.hideEmpty();
    const cardHost = workspace.getViewHost("card");
    if (cardHost) renderObjectCards(cardHost, rows, {
      focusId,
      title:(item)=>item.title,
      type:(item)=>item.type || "内容",
      state:(item)=>item.status || "待确认",
      visual:(item)=>esc(String(item.title || "知").slice(0,1)),
      fields:[
        { label:"版本", value:(item)=>item.version || "—" },
        { label:"负责人", value:(item)=>item.owner || "待确认" },
        { label:"更新时间", value:(item)=>fmtDate(item.updatedAt) }
      ],
      summary:(item)=>item.summary || "暂无摘要",
      actions:[
        { key:"detail", label:"查看内容" },
        { key:"external", label:"外部来源 ↗", href:(item)=>item.url || "", external:true, visible:(item)=>Boolean(item.url) }
      ]
    });
    for (const viewId of ["list","table"]) {
      const viewHost = workspace.getViewHost(viewId); if (!viewHost) continue;
      const table = workspace.getTableNodes(viewId);
      renderObjectList(table.head, table.body, rows, {
        fields:[
          { label:"标题", value:(item)=>item.title },{ label:"类型", value:(item)=>item.type },{ label:"状态", value:(item)=>item.status || "待确认" },
          { label:"版本", value:(item)=>item.version || "—" },{ label:"负责人", value:(item)=>item.owner || "待确认" },{ label:"更新时间", value:(item)=>fmtDate(item.updatedAt) }
        ],
        actions:[{ key:"detail", label:"查看" },{ key:"external", label:"外部", href:(item)=>item.url || "", external:true, visible:(item)=>Boolean(item.url) }]
      });
    }
    if (focusId) {
      requestAnimationFrame(() => base.root.querySelector(`[data-object-id="${CSS.escape(focusId)}"]`)?.scrollIntoView({ block:"center" }));
    }
  }

  base.root.addEventListener("click", (event) => {
    const pageAction = event.target.closest("[data-page-action]");
    if (pageAction?.dataset.pageAction === "overview") { window.scrollTo({ top:0, behavior:"smooth" }); return; }
    if (pageAction?.dataset.pageAction === "create" && !pageAction.disabled) { dialog?.dialog?.showModal(); return; }
    const type = event.target.closest("[data-content-type]");
    if (type) { workspace.setFilter(workspace.getState().filter === type.dataset.contentType ? "" : type.dataset.contentType); return; }
    const action = event.target.closest("[data-object-action]");
    if (action?.dataset.objectAction === "detail") {
      const id = action.dataset.objectId;
      const item = items.find((row) => String(row.id) === String(id));
      if (item?.body) reader?.open(item);
      else showToast(anchorId && id === focusId ? `已精准定位：${item?.title || "知识"} / ${anchorId}` : "当前内容尚未补充正文；已保留稳定知识ID与锚点路由。");
    }
  });

  dialog?.portal;
  dialog?.dialog?.querySelectorAll("[data-content-dialog-close]").forEach((button) => button.addEventListener("click", () => dialog.dialog.close()));
  dialog?.form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget); const obj = {};
    def.fields.forEach((field) => { obj[field.key] = coerceFieldValue(field, fd.get(field.key) ?? ""); });
    const validation = validateObjectByFields(def.fields, obj);
    if (!validation.ok) { showToast(validation.errors[0] || "字段校验未通过"); return; }
    const result = createContentObject(routeId, obj, def.seedObjects || []); items = result.items;
    dialog.dialog.close(); event.currentTarget.reset(); renderAll(); showToast("内容已保存到AIONE统一内容对象");
  });
  workspace.nodes.importFile?.addEventListener("change", async () => {
    const file = workspace.nodes.importFile.files?.[0]; if (!file) return;
    try {
      let rows = [];
      if (/\.csv$/i.test(file.name)) rows = parseCsv(await file.text());
      else if (/\.xlsx$/i.test(file.name)) {
        if (!window.XLSX) throw new Error("Excel解析组件未加载");
        const book = window.XLSX.read(await file.arrayBuffer(), { type:"array" });
        rows = window.XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval:"" });
      } else throw new Error("仅支持CSV/XLSX");
      const aliasMap = new Map();
      def.fields.forEach((field) => [field.label,field.key,field.fieldCode,...(field.importAliases||[])].filter(Boolean).forEach((alias)=>aliasMap.set(String(alias).trim(),field)));
      const mapped = rows.map((r) => { const obj={}; Object.entries(r||{}).forEach(([key,value])=>{const field=aliasMap.get(String(key).trim());if(field)obj[field.key]=coerceFieldValue(field,value);}); return obj; }).filter((r)=>r.title);
      const result = importContentObjects(routeId, mapped, def.seedObjects || []); items = result.items; renderAll(); showToast(`导入完成：新增 ${result.added} 条`);
    } catch (error) { showToast(`导入失败：${error.message || error}`); }
    finally { workspace.nodes.importFile.value = ""; }
  });

  function renderAll() { renderTypes(); renderMetrics(); renderItems(); renderRelated(); bindHorizontalRails(base.root); }
  const asideItems=(def.auxiliary||[]).slice(0,3).map((item)=>({label:item.title||"关联信息",value:item.text||"",route:item.route||""}));
  window.dispatchEvent(new CustomEvent("aione:page-aside-context", { detail:{state:asideItems.length?"standard":"light",kicker:"当前内容",title:def.title||"内容页面",text:def.description||"",items:asideItems} }));
  renderAll();
  return true;
}
