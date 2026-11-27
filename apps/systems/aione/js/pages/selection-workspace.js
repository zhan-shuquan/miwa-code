import { businessWorkspaceHeader, selectionHeaderStatus } from "../components/business-workspace-header.js";
import { mountSpecifications } from '../components/selection-specifications.js';
import { mergeSavedDraft, serializeDraftSaves, rebaseDraft } from '../services/selection-draft-save.js';
import { bindFileIntake } from "../components/file-intake.js";
import {
  sortableKeys,
  nextTableSort,
  tableSortState,
} from "../components/table-sort.js";
import { renderSemanticIcons } from "../config/semantic-icons.js";
import { aioneApi, getAioneApiBaseUrl } from "../services/aione-api-client.js";
const icon = (name) =>
  `<span class="sw-icon" data-icon="${esc(name)}" aria-hidden="true"></span>`;
const BASE = "/api/v1/selection-workspace";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const yen = (v) => (v == null ? "—" : "¥" + Number(v).toLocaleString("ja-JP"));
const api = (path, method = "GET", body) =>
  aioneApi(BASE + path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const navigate = (view, id) => {
  location.hash =
    "#/product-home?" + new URLSearchParams({ view, ...(id ? { id } : {}) });
};
let disposer;
export async function initSelectionWorkspace(host, forcedView) {
  disposer?.();
  if (
    !forcedView &&
    new URLSearchParams(location.hash.split("?")[1]).get("view") === "pool"
  ) {
    const { initSelectionPool } = await import("./selection-pool.js");
    return initSelectionPool(host);
  }
  const controller = new AbortController(),
    signal = controller.signal,
    urls = [];
  disposer = () => {
    controller.abort();
    urls.forEach(URL.revokeObjectURL);
  };
  const on = (el, event, fn) => el?.addEventListener(event, fn, { signal });
  host.addEventListener(
    "wheel",
    (event) => {
      if (
        event.target instanceof HTMLInputElement &&
        event.target.type === "number"
      ) {
        event.preventDefault();
      }
    },
    { signal, passive: false },
  );
  const report = (e) => {
    const box = host.querySelector("[data-message]");
    if (box) {
      box.textContent = e.message || String(e);
      box.hidden = !box.textContent;
      box.dataset.severity = e instanceof Error || (e && typeof e === "object" && e.message) ? "error" : "success";
      box.setAttribute("role", box.dataset.severity === "error" ? "alert" : "status");
    }
  };
  const guarded =
    (fn) =>
    async (...args) => {
      try {
        await fn(...args);
      } catch (e) {
        report(e);
      }
    };
  if (!document.getElementById("selection-workspace-css")) {
    const link = document.createElement("link");
    link.id = "selection-workspace-css";
    link.rel = "stylesheet";
    link.href = "./css/pages/selection-workspace.css";
    document.head.append(link);
  }
  host.innerHTML =
    '<section class="sw"><p>正在读取ERP字段与个人选品资料…</p></section>';
  let boot;
  try {
    boot = await api("/bootstrap");
  } catch (e) {
    host.innerHTML =
      '<section class="sw"><h2>商品之家</h2><p>' +
      esc(e.message) +
      "</p></section>";
    return;
  }
  if (signal.aborted) return;
  const query = new URLSearchParams(location.hash.split("?")[1] || ""),
    view = forcedView || query.get("view") || "entry";
  host.innerHTML = `<section class="sw ${view === "entry" ? "sw-entry" : ""}"><header class="sw-heading"><div><small>商品之家 · 美和跨境选品</small><h1>${view === "list" ? "选品一览" : view === "layout" ? "表单布局设置" : view === "sync" ? "ERP同步状态" : "选品录入"}</h1></div><nav><button data-nav="pool">选品池</button><button data-nav="entry">选品录入</button><button data-nav="list">选品一览</button>${boot.identity.admin ? '<button data-nav="layout">布局设置</button><button data-nav="sync">同步状态</button>' : ""}${window.AIONE_SELECTION_PREVIEW && !window.AIONE_AUTHENTICATED_DEVELOPMENT ? '<a href="/preview">切换测试身份</a>' : ""}</nav></header><div class="sw-status"><span>${esc(boot.identity.name)}</span><span>${boot.connection.online ? "ERP已连接" : "ERP离线 / 使用最近同步参数"}</span></div><p class="sw-warning">历史参数待验证 · 预计利润仅供选品参考</p><p data-message role="status" hidden></p><div data-content></div></section>`;
  if (view === "entry") { host.querySelector(".sw-heading")?.remove(); host.querySelector(".sw-status")?.remove(); }
  host.querySelectorAll("[data-nav]").forEach((b) =>
    on(b, "click", () => {
      if (["layout", "sync"].includes(b.dataset.nav))
        location.hash = "#/settings?section=selection-" + b.dataset.nav;
      else navigate(b.dataset.nav);
    }),
  );
  const content = host.querySelector("[data-content]");
  const imageUrl = async (id, asset, size = "preview") => {
    const response = await fetch(
      getAioneApiBaseUrl() +
        BASE +
        `/records/${encodeURIComponent(id)}/assets/${asset}?size=${size}`,
      { credentials: "same-origin", headers: await imageHeaders() },
    );
    if (!response.ok) throw Error("图片读取失败");
    const url = URL.createObjectURL(await response.blob());
    urls.push(url);
    return url;
  };
  async function imageHeaders() {
    try {
      const s = JSON.parse(
        sessionStorage.getItem("aione.preview.session.v3") || "{}",
      );
      return s.googleCredential
        ? { Authorization: "Bearer " + s.googleCredential }
        : {};
    } catch {
      return {};
    }
  }
  async function download(path, name) {
    const r = await fetch(getAioneApiBaseUrl() + BASE + path, {
      headers: await imageHeaders(),
    });
    if (!r.ok) {
      const b = await r.json();
      throw Error(b.error || "下载失败");
    }
    const url = URL.createObjectURL(await r.blob()),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  const file64 = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  function fieldInput(f, value, attribute = "data-field", layoutField = {}) {
    const id = esc(f.id),
      val = value ?? "";
    if (f.readOnly)
      return `<input ${attribute}="${id}" value="${esc(val)}" readonly aria-readonly="true" placeholder="${f.id === "custom_库存类型" ? "待判定" : f.id === "item_code" ? "待生成" : "待ERP回传"}" title="系统自动关联 · 只读">`;
    if (f.display === "radio")
      return (
        '<span class="sw-radio">' +
        f.options
          .map(
            (v) =>
              `<label><input type="radio" name="${id}" ${attribute}="${id}" value="${esc(v)}" ${v === val ? "checked" : ""}>${esc(v)}</label>`,
          )
          .join("") +
        "</span>"
      );
    if (f.type === "textarea")
      return (
        "<textarea " +
        attribute +
        '="' +
        id +
        '" rows="' +
        (layoutField.rows || 3) +
        '" placeholder="' +
        esc(f.placeholder || "") +
        '" data-auto-grow>' +
        esc(val) +
        "</textarea>"
      );
    if (f.type === "select")
      return `<select ${attribute}="${id}"><option value="">请选择</option>${val && !f.options.includes(val) ? `<option value="${esc(val)}" selected disabled>${esc(val)}（历史值，已停用）</option>` : ''}${f.options.map((v) => `<option ${v === val ? "selected" : ""} value="${esc(v)}">${esc(f.optionLabels?.[v] || v)}</option>`).join("")}</select>`;
    const choices = f.type === "text" && f.options?.length;
    return `<input ${attribute}="${id}" type="${f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}" ${f.type === "number" ? 'min="0" step="any"' : ""} ${choices ? 'list="sw-options-' + id + '"' : ""} value="${esc(val)}">${choices ? '<datalist id="sw-options-' + id + '">' + f.options.map((v) => '<option value="' + esc(v) + '"></option>').join("") + "</datalist>" : ""}`;
  }
  async function layoutEditor() {
    if (!boot.identity.admin) throw Error("布局设置需要管理员权限");
    let layout = structuredClone(boot.layout),
      drag;
    const render = () => {
      content.innerHTML = `<p>拖动字段行调整顺序。位置与宽度不会改变ERP字段、计算规则或必填校验。</p><div class="sw-toolbar"><label>左侧比例 <input data-ratio type="number" min="40" max="75" value="${layout.ratio}"> %</label><button data-layout-save>保存默认布局</button><button data-layout-reset>恢复默认</button><button data-layout-preview>预览布局</button></div><div class="sw-layout-list">${layout.fields
        .map((l, i) => {
          const f = boot.fields.find((f) => f.id === l.id);
          return `<div draggable="true" data-layout-row="${i}"><span>${esc(f.label)}</span><select data-group="${i}">${layout.groups.map((g) => `<option value="${g.id}" ${g.id === l.group ? "selected" : ""}>${esc(g.label)}</option>`).join("")}</select><select data-width="${i}">${[2, 3, 4, 6, 8, 12].map((w) => `<option ${w === l.width ? "selected" : ""}>${w}</option>`).join("")}</select><select data-display="${i}" aria-label="字段显示方式"><option value="stacked" ${l.display !== "inline" ? "selected" : ""}>上下显示</option><option value="inline" ${l.display === "inline" ? "selected" : ""}>同行显示</option></select><label>起始列<input type="number" min="1" max="12" data-column-start="${i}" value="${l.columnStart || ""}"></label><label>文本行数<input type="number" min="1" max="30" data-text-rows="${i}" value="${l.rows || 3}"></label><label>跨行<input type="number" min="1" max="6" data-row-span="${i}" value="${l.rowSpan || 1}"></label><label><input type="checkbox" data-hidden="${i}" ${l.hidden ? "checked" : ""}>隐藏</label><button data-up="${i}" aria-label="上移">上移</button><button data-down="${i}" aria-label="下移">下移</button></div>`;
        })
        .join("")}</div><h3>区块顺序与折叠</h3>${layout.groups
        .map(
          (g, i) =>
            `<div class="sw-toolbar"><span>${esc(g.label)}</span><select data-region="${i}">${[
              ["top", "首行"],
              ["main", "资料区"],
              ["aside", "右侧"],
            ]
              .map(
                ([v, t]) =>
                  `<option value="${v}" ${(g.region || "main") === v ? "selected" : ""}>${t}</option>`,
              )
              .join(
                "",
              )}</select><label><input type="checkbox" data-collapse="${i}" ${g.collapsed ? "checked" : ""}>默认折叠</label><button data-group-up="${i}">上移</button></div>`,
        )
        .join("")}<div data-layout-preview-area></div>`;
      content
        .querySelectorAll("[data-region]")
        .forEach((e) =>
          on(
            e,
            "change",
            () => (layout.groups[Number(e.dataset.region)].region = e.value),
          ),
        );
      content
        .querySelectorAll("[data-row-span]")
        .forEach((e) =>
          on(
            e,
            "input",
            () =>
              (layout.fields[Number(e.dataset.rowSpan)].rowSpan = Number(
                e.value,
              )),
          ),
        );
      content
        .querySelectorAll("[data-column-start]")
        .forEach((e) =>
          on(
            e,
            "input",
            () =>
              (layout.fields[Number(e.dataset.columnStart)].columnStart =
                e.value ? Number(e.value) : null),
          ),
        );
      content
        .querySelectorAll("[data-text-rows]")
        .forEach((e) =>
          on(
            e,
            "input",
            () =>
              (layout.fields[Number(e.dataset.textRows)].rows = Number(
                e.value,
              )),
          ),
        );
      content
        .querySelectorAll("[data-display]")
        .forEach((e) =>
          on(
            e,
            "change",
            () => (layout.fields[Number(e.dataset.display)].display = e.value),
          ),
        );
      on(
        content.querySelector("[data-ratio]"),
        "input",
        (e) => (layout.ratio = Number(e.target.value)),
      );
      content
        .querySelectorAll("[data-group]")
        .forEach((e) =>
          on(
            e,
            "change",
            () => (layout.fields[Number(e.dataset.group)].group = e.value),
          ),
        );
      content
        .querySelectorAll("[data-width]")
        .forEach((e) =>
          on(
            e,
            "change",
            () =>
              (layout.fields[Number(e.dataset.width)].width = Number(e.value)),
          ),
        );
      content
        .querySelectorAll("[data-hidden]")
        .forEach((e) =>
          on(
            e,
            "change",
            () => (layout.fields[Number(e.dataset.hidden)].hidden = e.checked),
          ),
        );
      content
        .querySelectorAll("[data-collapse]")
        .forEach((e) =>
          on(
            e,
            "change",
            () =>
              (layout.groups[Number(e.dataset.collapse)].collapsed = e.checked),
          ),
        );
      content.querySelectorAll("[data-up],[data-down]").forEach((e) =>
        on(e, "click", () => {
          const i = Number(e.dataset.up ?? e.dataset.down),
            j = e.dataset.up !== undefined ? i - 1 : i + 1;
          if (j >= 0 && j < layout.fields.length)
            [layout.fields[i], layout.fields[j]] = [
              layout.fields[j],
              layout.fields[i],
            ];
          render();
        }),
      );
      content.querySelectorAll("[data-group-up]").forEach((e) =>
        on(e, "click", () => {
          const i = Number(e.dataset.groupUp);
          if (i > 0)
            [layout.groups[i], layout.groups[i - 1]] = [
              layout.groups[i - 1],
              layout.groups[i],
            ];
          render();
        }),
      );
      content.querySelectorAll("[data-layout-row]").forEach((e) => {
        on(e, "dragstart", () => (drag = Number(e.dataset.layoutRow)));
        on(e, "dragover", (ev) => ev.preventDefault());
        on(e, "drop", (ev) => {
          ev.preventDefault();
          const i = Number(e.dataset.layoutRow);
          if (Number.isInteger(drag)) {
            const [f] = layout.fields.splice(drag, 1);
            layout.fields.splice(i, 0, f);
            render();
          }
        });
      });
      on(
        content.querySelector("[data-layout-save]"),
        "click",
        guarded(async () => {
          await api("/layout", "PUT", layout);
          report("布局已保存，刷新页面即可应用，无需部署。");
        }),
      );
      on(content.querySelector("[data-layout-reset]"), "click", () => {
        layout = structuredClone(boot.defaults);
        render();
      });
      on(content.querySelector("[data-layout-preview]"), "click", () => {
        content.querySelector("[data-layout-preview-area]").innerHTML =
          formMarkup(layout, {}, "top") +
          '<div class="sw-split" style="--sw-left:' +
          layout.ratio +
          '%"><div>' +
          formMarkup(layout, {}) +
          "</div><aside>" +
          formMarkup(layout, {}, "aside") +
          "</aside></div>";
        renderSemanticIcons(
          content.querySelector("[data-layout-preview-area]"),
        );
      });
    };
    render();
  }
  function formMarkup(layout, data, region = "main") {
    return layout.groups
      .filter((g) => !g.hidden && (g.region || "main") === region)
      .map((g) => {
        const fields = layout.fields.filter(
          (l) => l.group === g.id && !l.hidden,
        );
        if (!fields.length) return "";
        return (
          '<details data-layout-group="' +
          esc(g.id) +
          '" class="sw-card" ' +
          (g.collapsed ? "" : "open") +
          "><summary>" +
          icon(g.icon || "product") +
          esc(g.label) +
          '</summary><div class="sw-grid">' +
          fields
            .map((l) => {
              const f = boot.fields.find((f) => f.id === l.id);
              const style =
                "grid-column:" +
                (l.columnStart ? l.columnStart + " / span " : "span ") +
                l.width +
                ";grid-row:span " +
                (l.rowSpan || 1);
              if (f.type === "computed")
                return (
                  '<div class="sw-cost-row ' +
                  (f.group === "profit" || f.id.includes("保本售价")
                    ? "sw-paired-metric "
                    : "") +
                  (f.id === "result:totalCost" ? "sw-total " : "") +
                  (f.group === "cost" &&
                  ![
                    "result:到日本仓成本",
                    "result:日本配送日本",
                    "result:平台交易成本",
                    "result:销售运营成本",
                    "result:totalCost",
                  ].includes(f.id)
                    ? "sw-cost-detail "
                    : "") +
                  ([
                    "result:到日本仓成本",
                    "result:日本配送日本",
                    "result:平台交易成本",
                    "result:销售运营成本",
                    "result:totalCost",
                  ].includes(f.id)
                    ? "sw-subtotal "
                    : "") +
                  ([
                    "result:目标毛利率达标售价",
                    "result:运营后毛利润",
                    "result:运营后毛利率",
                  ].includes(f.id)
                    ? "sw-highlight"
                    : "") +
                  '" style="' +
                  style +
                  '"><span>' +
                  ({
                    "result:到日本仓成本": "product",
                    "result:日本配送日本": "supplier",
                    "result:平台交易成本": "store",
                    "result:销售运营成本": "operations",
                  }[f.id]
                    ? icon(
                        {
                          "result:到日本仓成本": "product",
                          "result:日本配送日本": "supplier",
                          "result:平台交易成本": "store",
                          "result:销售运营成本": "operations",
                        }[f.id],
                      )
                    : "") +
                  esc(f.label) +
                  '</span><b data-cost="' +
                  esc(f.id.slice(7)) +
                  '">—</b></div>'
                );
              if (f.type === "specifications") return '<div data-specifications style="grid-column:1/-1"></div>';
              if (f.type === "links")
                return (
                  '<section class="sw-field sw-links-field" style="' +
                  style +
                  '"><strong>' +
                  esc(f.label) +
                  '</strong><div data-reference-links></div><button type="button" data-add-reference>添加参考链接</button></section>'
                );
              if (f.type === "market")
                return (
                  '<section class="sw-market-field" style="' +
                  style +
                  '"><strong>' +
                  esc(f.label) +
                  '</strong><button type="button" data-ai="市场分析" disabled title="AI市场分析尚未启用">AI市场分析</button><div class="sw-drop" data-market-drop tabindex="0" title="支持拖放或粘贴市场附件"><label>添加市场附件<input type="file" data-market-upload multiple accept="image/png,image/jpeg,image/webp,.pdf,.xlsx,.docx,.txt,.csv"></label></div><div class="sw-market-assets" data-market-assets></div></section>'
                );
              if (f.type === "images")
                return (
                  '<section class="sw-media-field" tabindex="0" style="' +
                  style +
                  '" title="点击添加、拖放或Ctrl+V粘贴；JPG/PNG/WebP；单张最多' +
                  boot.uploadPolicy.maxMB +
                  'MB"><div class="sw-images" data-images></div><div class="sw-media-actions"><button type="button" data-add-images>添加 / 更换</button><button type="button" data-image-url-toggle aria-expanded="false">图片网址</button><button type="button" data-ai="白底图" disabled title="AI白底图尚未启用">AI白底图</button></div><div data-image-url-panel hidden><input type="url" data-image-url aria-label="商品图片网址" placeholder="https://…"><button type="button" data-image-url-read>读取图片</button></div><input data-upload type="file" accept="image/png,image/jpeg,image/webp" multiple hidden><small data-upload-status role="status"></small></section>'
                );
              if (f.type === "textarea")
                return `<section class="sw-field sw-text-field" style="${style}"><div class="sw-field-heading"><label for="sw-text-${esc(f.id)}">${esc(f.label)}</label><span>${f.id === "selectionRationale" ? '<button type="button" data-ai="选品依据" disabled title="AI选品依据尚未启用">AI选品依据</button>' : ""}<button type="button" data-expand-text="${esc(f.id)}">放大编辑</button></span></div>${fieldInput(f, data[f.id], "data-field", l).replace("<textarea ", '<textarea id="sw-text-' + esc(f.id) + '" ')}</section>`;
              return (
                '<div class="sw-field ' +
                (l.display === "inline" ? "sw-field-inline" : "") +
                (f.id === "custom_实际售价" ? " sw-sale-price" : "") +
                '" style="' +
                style +
                '">' +
                (f.display === "radio"
                  ? '<div class="sw-radio-field" role="group" aria-label="' +
                    esc(f.label) +
                    '"><span>'
                  : "<label><span>") +
                esc(f.label) +
                (f.required
                  ? ' <span class="sw-required" aria-label="确认销售方案前必填">*</span>'
                  : "") +
                (f.readOnly
                  ? ' <span class="sw-lock" aria-label="ERP只读">' +
                    icon("lock") +
                    "</span>"
                  : "") +
                "</span>" +
                fieldInput(f, data[f.id], "data-field", l) +
                (f.display === "radio" ? "</div>" : "</label>") +
                (f.type === "textarea"
                  ? '<button type="button" data-expand-text="' +
                    esc(f.id) +
                    '">放大编辑</button>'
                  : "") +
                (f.costKey
                  ? '<small class="sw-inline-cost">成本（JPY） <b data-cost="' +
                    esc(f.costKey) +
                    '">—</b></small>'
                  : "") +
                (f.id === "sourceUrl"
                  ? '<div class="sw-url-actions"><a data-purchase-open target="_blank" rel="noopener noreferrer" title="打开采购页面" aria-label="打开采购页面">' +
                    icon("external") +
                    '</a><button type="button" data-read-source>读取资料</button></div>'
                  : "") +
                "</div>"
              );
            })
            .join("") +
          "</div>" +
          (g.id === "sales"
            ? '<div class="sw-sales-facts" data-platform-facts>ERP统一试算费率 <b>' +
              esc(boot.parameters.platformRate) +
              '%</b></div><button type="button" data-add-platform hidden>增加销售平台</button><small data-sales-status hidden></small>'
            : "") +
          (g.id === "operations"
            ? '<div class="sw-toolbar"><span data-operation-rate>综合运营费率 0%</span><button data-reset-rates>恢复0%</button><button data-ai="运营建议" disabled title="该AI功能尚未启用">AI运营建议</button></div>'
            : "") +
          (g.id === "strategy"
            ? '<button data-ai="运营策略" disabled title="该AI功能尚未启用">AI运营策略</button>'
            : "") +
          (g.id === "basic"
            ? '<div class="sw-toolbar"><button data-identify-source>ERP重新识别</button><button data-import-source>导入现有资料表</button><input data-source-file type="file" accept=".xlsx" hidden><span data-source-status role="status"></span></div>'
            : "") +
          "</details>"
        );
      })
      .join("");
  }
  async function entry() {
    let record = query.get("id")
      ? await api("/records/" + encodeURIComponent(query.get("id")))
      : null;
    let data = record
      ? structuredClone(record.data)
      : Object.fromEntries(
          boot.fields
            .filter(
              (f) =>
                f.default != null &&
                f.default !== "" &&
                f.id !== "custom_库存类型",
            )
            .map((f) => [f.id, f.default]),
        );
    for (const f of boot.fields) {
      if ((data[f.id] == null || data[f.id] === "") &&
          f.default != null && f.default !== "" && !f.readOnly)
        data[f.id] = f.default;
    }
    data.skus ||= [];
    data.shortNameManual ??= !!data.item_name;
    let pricing = record?.pricing,
      timer,
      sequence = 0;
    const header = businessWorkspaceHeader({
      title: "选品录入",
      identity: '<span data-selection-number></span><span data-save-state></span><span data-selector></span>',
      status: '<span>正式商品货号：<strong data-formal-code></strong></span><span>选品结论：<span data-conclusion-status></span></span><span data-intake-status></span>',
      connection: boot.connection.online ? "ERP已连接" : "ERP离线 / 使用最近同步参数",
      actions: '<button data-back-list>返回选品一览</button><button data-save class="sw-primary">保存草稿</button><button data-confirm-selection>确认选品</button><button data-submit>提交ERP</button>',
      more: '<button data-ai="综合选品分析" disabled title="该AI功能尚未启用">AI综合分析</button>',
      tabs: `<button data-workspace-tab="entry" aria-pressed="true">${icon("product")}商品信息</button><button data-workspace-tab="specifications" aria-pressed="false">${icon("product")}商品规格</button><button data-workspace-tab="market" aria-pressed="false">${icon("search")}市场调研</button><button data-workspace-tab="sample" aria-pressed="false">${icon("product")}样品测试</button>`,
    });
    content.innerHTML = header + `<section class="sw-card" data-sample-panel hidden>样品测试 · 关联当前选品记录，具体规则待确认。</section>${formMarkup(boot.layout, data, "top")}<div class="sw-split" style="--sw-left:${boot.layout.ratio}%"><div>${formMarkup(boot.layout, data)}</div><aside class="sw-profit sw-card"><details class="sw-context-help"><summary>计算依据</summary><div data-calculation-context class="sw-context"></div></details><div data-reconciliation role="status"></div><div data-profit></div>${formMarkup(boot.layout, data, "aside")}</aside></div><details class="sw-card sw-workspace-history"><summary>修改记录 / ERP处理状态</summary><div data-history>${record?.erpResult?.stage === "item_created" ? `<p>ERP已建档：${esc(record.erpResult.itemCode)} · SKU数量：${esc(record.erpResult.skuCount)}</p><p>${(record.erpResult.skus || []).map(s=>esc(s.name)).join("、")}</p>` : ""}${(record?.events || []).map((e) => `<p>${esc(e.created_at)} · ${esc(e.actor_id)} · ${esc(e.action)}</p>`).join("") || "尚无修改记录"}${(record?.jobs || []).map((j) => `<p>ERP任务：${esc(j.status)} ${esc(j.result?.message || "")} ${j.status === "failed" ? `<button data-retry="${j.id}">重试</button>` : ""}</p>`).join("")}</div></details>`;
    const specificationsPanel = document.createElement("section");
    content.querySelector(".sw-split").before(specificationsPanel);
    const specificationsGroup = content.querySelector('[data-layout-group="specifications"]');
    if (specificationsGroup) specificationsPanel.append(specificationsGroup);
    const switchWorkspace = (tab) => {
      specificationsPanel.hidden = tab !== "specifications";
      content.querySelector(".sw-split").hidden = tab === "specifications" || tab === "sample";
      content.querySelector("[data-sample-panel]").hidden = tab !== "sample";
      content.querySelectorAll("[data-layout-group]").forEach((group) => {
        const config = boot.layout.groups.find(
          (g) => g.id === group.dataset.layoutGroup,
        );
        if ((config?.region || "main") === "main")
          group.hidden = (config.id === "specifications" ? "specifications" : config.id === "market" ? "market" : "entry") !== tab;
      });
      content
        .querySelectorAll("[data-workspace-tab]")
        .forEach((button) =>
          button.setAttribute(
            "aria-pressed",
            String(button.dataset.workspaceTab === tab),
          ),
        );
      if (tab === "market")
        content
          .querySelectorAll('[data-layout-group="market"] textarea')
          .forEach((el) => {
            el.style.height =
              Math.max(el.scrollHeight, Number(el.rows) * 22 + 14) + "px";
          });
    };
    content
      .querySelectorAll("[data-workspace-tab]")
      .forEach((button) =>
        on(button, "click", () => switchWorkspace(button.dataset.workspaceTab)),
      );
    switchWorkspace("entry");
    if (record?.pool) {
      const inherited = document.createElement("details");
      inherited.className = "sw-card";
      inherited.innerHTML =
        "<summary>原始选品资料</summary><p>选品人：" +
        esc(record.selectorName) +
        " · " +
        esc(record.selector) +
        "</p><p>参考采购价：" +
        esc(record.pool.referencePrice ?? "待补充") +
        "</p><p>" +
        esc(record.pool.sourceFacts?.supplier || "") +
        "</p><p>" +
        esc(record.pool.rawShare || "") +
        "</p>";
      content.querySelector(".sw-workspace-header").after(inherited);
    }
    const selectionLabel = content.querySelector('[data-selection-number]');
    const selectorLabel = content.querySelector('[data-selector]');
    const conclusion = content.querySelector('[data-workspace-status]');
    function updateHeader() {
      const state = selectionHeaderStatus(record);
      selectionLabel.textContent = '选品货号：' + (record?.selectionNo || '保存后生成');
      selectorLabel.textContent = '选品人：' + (record?.selectorName || (!record || record.selector === boot.identity.id ? boot.identity.name : '姓名待同步')) + '（' + (record?.selector || boot.identity.id) + '）';
      content.querySelector('[data-save-state]').textContent = record ? '版本 ' + record.version : '新草稿';
      content.querySelector('[data-formal-code]').textContent = data.item_code || '未分配';
      conclusion.querySelector('[data-conclusion-status]').textContent = state.conclusion;
      content.querySelector('[data-intake-status]').textContent = 'ERP建档：' + state.intake;
      content.querySelector('[data-intake-status]').dataset.severity = state.severity;
      const locked = record?.status === 'submitted' || record?.archived;
      content.querySelector('[data-submit]').disabled = !!locked || ['queued','processing'].includes(record?.jobs?.[0]?.status);
      const codeField = content.querySelector('[data-field="item_code"]');
      if (codeField) codeField.readOnly = !!locked || !!record?.formalNumber?.code || record?.status === 'number_pending';
      const historyBox = content.querySelector('[data-history]');
      if (historyBox) historyBox.innerHTML =
        (record?.erpResult?.stage === 'item_created' ? `<p>ERP已建档：${esc(record.erpResult.itemCode)} · SKU数量：${esc(record.erpResult.skuCount)}</p><p>${(record.erpResult.skus || []).map(s=>esc(s.name)).join('、')}</p>` : '') +
        (record?.events || []).map(e=>`<p>${esc(e.created_at)} · ${esc(e.actor_id)} · ${esc(e.action)}</p>`).join('') +
        (record?.jobs || []).map(j=>`<p>ERP任务：${esc(j.status)} ${esc(j.result?.message || '')} ${j.status === 'failed' ? `<button data-retry="${esc(j.id)}">重试</button>` : ''}</p>`).join('');
    }
    updateHeader();
    const deriveStock = () => {
      const values = [
        ...new Set(
          boot.logisticsRelations
            .filter((r) => r.method === data.custom_国际物流方式)
            .map((r) => r.fulfillment)
            .filter(Boolean),
        ),
      ];
      data.custom_库存类型 = values.length === 1 ? values[0] : "";
      const input = content.querySelector('[data-field="custom_库存类型"]');
      if (input) input.value = data.custom_库存类型;
    };
    deriveStock();
    renderSemanticIcons(content);
    const priceDependent = new Set([
      "平台交易成本",
      "销售运营成本",
      "totalCost",
      "未运营毛利润",
      "未运营毛利率",
      "运营后毛利润",
      "运营后毛利率",
    ]);
    let calculationError = "",
      composing = false;
    const operationKeys = [
      "custom_aione_coupon",
      "custom_aione_points",
      "custom_aione_ads",
      "custom_aione_other",
    ];
    const drawProfit = () => {
      const platformFacts = content.querySelector('[data-platform-facts]');
      if (platformFacts) {
        const policy = boot.platformPolicies?.[data.salesPlatform];
        platformFacts.textContent = policy ? `ERP试算费率 ${policy.rate ?? '待配置'}% · ${policy.warning || '参数待业务验证'}`
          : `ERP统一试算费率 ${boot.parameters.platformRate ?? '待配置'}% · 当前平台正式参数待核实`;
      }
      const ready = pricing?.status === "estimated" && !calculationError,
        r = ready ? pricing.results : {};
      content.querySelectorAll("[data-cost]").forEach((el) => {
        const key = el.dataset.cost;
        const parts = [
          "custom_到日本仓成本",
          "custom_日本配送日本",
          "custom_平台交易成本",
          "custom_销售运营成本",
        ];
        const value =
          key === "totalCost"
            ? parts.every((k) => r[k] != null)
              ? parts.reduce((n, k) => n + Number(r[k]), 0)
              : null
            : key.startsWith("operation:")
              ? pricing?.operationFees?.[Number(key.slice(10))]
              : key.startsWith("breakdown:")
                ? pricing?.breakdown?.[key.slice(10)]
                : r["custom_" + key];
        const available =
          ready &&
          value != null &&
          (!priceDependent.has(key) || Number(data.custom_实际售价) > 0);
        el.textContent = !available
          ? "—"
          : key.endsWith("率")
            ? Number(value).toFixed(2) + "%"
            : pricing?.costNotes?.[key] && Number(value) === 0
              ? pricing.costNotes[key]
              : yen(value);
        el.classList.toggle("sw-loss", available && Number(value) < 0);
      });
      const audit = ready ? pricing?.reconciliation : null;
      const auditBox = content.querySelector("[data-reconciliation]");
      if (auditBox) {
        auditBox.className =
          "sw-reconciliation " +
          (audit?.status === "mismatch" ? "sw-loss" : "");
        auditBox.textContent =
          audit?.status === "matched"
            ? "明细与汇总一致"
            : audit?.status === "mismatch"
              ? "成本核算差异：" +
                audit.checks
                  .filter((c) => c.status === "mismatch")
                  .map((c) => c.label + " 差额 " + yen(c.difference))
                  .join("；") +
                "。可保存草稿，禁止提交ERP。"
              : "明细校验 · 待计算";
      }
      const context = content.querySelector("[data-calculation-context]");
      if (context)
        context.textContent =
          "目标毛利率（运营前） " +
          boot.parameters.targetMargin +
          "% · 最低利润金额：ERP未配置 · 汇率 " +
          boot.parameters.exchange +
          " JPY/CNY · 关税 " +
          boot.parameters.tariffRate +
          "%";
      const loss =
        ready &&
        Number(data.custom_实际售价) > 0 &&
        Number(r.custom_运营后毛利润) < 0;
      content.querySelector("[data-profit]").innerHTML =
        '<p class="sw-calculation-status ' +
        (loss ? "sw-loss" : "") +
        '" role="status">' +
        esc(
          (loss ? "预计亏损，请检查售价和经营方案。 " : "") +
            (calculationError ||
              pricing?.message ||
              "请填写采购价、重量及物流参数"),
        ) +
        "</p>";
      const rate = content.querySelector("[data-operation-rate]");
      if (rate)
        rate.textContent =
          "综合运营费率 " +
          operationKeys
            .reduce((sum, k) => sum + Number(data[k] || 0), 0)
            .toFixed(2) +
          "%";
    };
    const recalc = () => {
      clearTimeout(timer);
      const seq = ++sequence;
      if (composing) return;
      pricing = null;
      drawProfit();
      timer = setTimeout(async () => {
        try {
          const result = await api("/calculate", "POST", data);
          if (seq !== sequence || signal.aborted) return;
          pricing = result;
          calculationError = "";
          drawProfit();
        } catch (e) {
          if (seq !== sequence || signal.aborted) return;
          calculationError = e.message;
          drawProfit();
        }
      }, 350);
    };
    on(signal, "abort", () => clearTimeout(timer));
    const purchaseLink = content.querySelector("[data-purchase-open]");
    const updatePurchaseLink = () => {
      if (!purchaseLink) return;
      try {
        const u = new URL(String(data.sourceUrl || "").trim());
        if (!["https:", "http:"].includes(u.protocol)) throw Error();
        purchaseLink.href = u.href;
        purchaseLink.removeAttribute("aria-disabled");
      } catch {
        purchaseLink.removeAttribute("href");
        purchaseLink.setAttribute("aria-disabled", "true");
      }
    };
    content.querySelectorAll("[data-field],[data-extra]").forEach((input) => {
      const update = () => {
        if (input.readOnly || (input.type === "radio" && !input.checked))
          return;
        const key = input.dataset.field || input.dataset.extra;
        data[key] =
          input.type === "number"
            ? input.value === ""
              ? ""
              : Number(input.value)
            : input.value;
        if (key === "item_name") data.shortNameManual = true;
        if (key === "custom_国际物流方式") deriveStock();
        updatePurchaseLink();
        drawProfit();
        recalc();
      };
      on(input, "compositionstart", () => {
        composing = true;
        clearTimeout(timer);
        sequence++;
      });
      on(input, "compositionend", () => {
        composing = false;
        update();
      });
      on(input, "input", update);
      on(input, "change", update);
      if (input.type === "number")
        on(input, "wheel", (e) => e.preventDefault());
    });
    updatePurchaseLink();
    on(content.querySelector("[data-add-platform]"), "click", () => {
      content.querySelector("[data-sales-status]").textContent =
        boot.salesCapabilities.reason;
    });
    const grow = (el) => {
      el.style.height = "auto";
      el.style.height =
        Math.max(el.scrollHeight, Number(el.rows) * 22 + 14) + "px";
    };
    content.querySelectorAll("[data-auto-grow]").forEach((el) => {
      grow(el);
      on(el, "input", () => grow(el));
    });
    content.querySelectorAll("[data-expand-text]").forEach((button) =>
      on(button, "click", () => {
        const field = content.querySelector(
            '[data-field="' + button.dataset.expandText + '"]',
          ),
          dialog = document.createElement("dialog");
        dialog.className = "sw-text-dialog";
        dialog.innerHTML =
          "<h2>" +
          esc(
            boot.fields.find((f) => f.id === button.dataset.expandText).label,
          ) +
          '</h2><textarea rows="16"></textarea><button data-apply>应用</button><button data-cancel>取消</button>';
        host.append(dialog);
        dialog.querySelector("textarea").value = field.value;
        dialog.querySelector("[data-apply]").onclick = () => {
          field.value = dialog.querySelector("textarea").value;
          field.dispatchEvent(new Event("input", { bubbles: true }));
          dialog.remove();
        };
        dialog.querySelector("[data-cancel]").onclick = () => dialog.remove();
        dialog.showModal();
      }),
    );
    const specificationsEditor = mountSpecifications({root:content.querySelector("[data-specifications]"),getData:()=>data,attributes:boot.itemAttributes||[],erpSkus:record?.erpResult?.skus||[],api,file64,esc,on,guarded,report});
    let numberingTimer;
    signal.addEventListener("abort", () => clearTimeout(numberingTimer));
    function watchNumber() {
      clearTimeout(numberingTimer);
      if (record?.status !== "number_pending" && !["queued", "processing"].includes(record?.jobs?.[0]?.status)) return;
      numberingTimer = setTimeout(async () => {
        if (
          signal.aborted ||
          new URLSearchParams(location.hash.split("?")[1]).get("id") !==
            record.id
        )
          return;
        try {
          const fresh = await api("/records/" + encodeURIComponent(record.id));
          if (signal.aborted) return;
          if (fresh.id !== record.id || fresh.version < record.version) {
            watchNumber();
            return;
          }
          record = fresh;
          updateHeader();
          if (fresh.status === "confirmed") {
            // Only the assigned identifier changes; preserve unsaved employee input.
            data.item_code = fresh.data.item_code;
            const field = content.querySelector('[data-field="item_code"]');
            if (field) field.value = data.item_code;
            content.querySelector("[data-save-state]").textContent =
              "已确认选品 · " + data.item_code;
            conclusion.querySelector("[data-conclusion-status]").textContent =
              "正式货号：" + data.item_code + "；未提交ERP";
            report("ERP已分配正式货号：" + data.item_code);
          } else if (fresh.status === "number_pending") {
            conclusion.querySelector("[data-conclusion-status]").textContent =
              "待生成正式货号 · " +
              (fresh.numberRequests?.[0]?.result?.message ||
                "ERP正在处理，资料已保存");
          }
        } catch (error) {
          if (error.status === 404) return;
        }
        updateHeader();
        watchNumber();
      }, 5000);
    }
    const creationRequestKey = crypto.randomUUID();
    const save = serializeDraftSaves(async () => {
      const submitted = structuredClone(data);
      const previous = record;
      let saved;
      try { saved = await api(
        record ? "/records/" + encodeURIComponent(record.id) : "/records",
        record ? "PATCH" : "POST",
        { data: submitted, version: record?.version, requestKey: creationRequestKey },
      ); } catch (error) {
        if (error.status !== 409 || !previous) throw error;
        const fresh = await api('/records/' + encodeURIComponent(previous.id));
        const rebased = rebaseDraft(previous.data, submitted, fresh.data);
        if (rebased.conflicts.length || ['submitted','erp_pending'].includes(fresh.status)) {
          throw Error('资料已被其他操作更新，未覆盖任何数据。本页修改仍保留，请核对冲突内容后再保存。');
        }
        saved = await api('/records/' + encodeURIComponent(previous.id), 'PATCH', {data:rebased.merged,version:fresh.version});
      }
      record = {...saved, selectorName:saved.selectorName || previous?.selectorName};
      selectionLabel.textContent = record.selectionNo;
      data = mergeSavedDraft(submitted, data, record.data);
      const hasNewEdits = JSON.stringify(data) !== JSON.stringify(record.data);
      renderReferences();
      specificationsEditor.draw();
      pricing = record.pricing;
      calculationError = "";
      report(
        hasNewEdits ? "草稿已保存；保存期间新增的修改仍保留，请再次保存。" : record.status === "confirmed"
          ? "资料已保存，选品确认状态保留。"
          : "草稿已保存。",
      );
      conclusion.querySelector("[data-conclusion-status]").textContent =
        record.status === "confirmed"
          ? "已确认选品 · 待第二阶段资料完善"
          : "草稿 · 确认选品不等于提交ERP";
      content.querySelector("[data-save-state]").textContent =
        record.selectionNo + (hasNewEdits ? " · 有未保存修改 · 版本 " : " · 已保存 · 版本 ") + record.version;
      history.replaceState(
        null,
        "",
        "#/product-home?view=entry&id=" + encodeURIComponent(record.id),
      );
      updateHeader();
      drawProfit();
      return record;
    });
    let draftCreation;
    const ensureDraft = () =>
      record
        ? Promise.resolve(record)
        : (draftCreation ||= save().finally(() => {
            draftCreation = null;
          }));
    on(content.querySelector("[data-back-list]"), "click", () =>
      navigate("list"),
    );
    on(
      content.querySelector("[data-confirm-selection]"),
      "click",
      guarded(async () => {
        const validation = await api("/confirmation-check", "POST", data);
        if (validation.issues.length) {
          const issue = validation.issues[0];
          switchWorkspace("entry");
          const field = content.querySelector(
            '[data-field="' + issue.field + '"]',
          );
          if (field) {
            field.closest("details").open = true;
            field.focus();
            field.scrollIntoView({ block: "center" });
          }
          throw Error(validation.issues.map((i) => i.message).join("；"));
        }
        await save();
        const result = await api("/batch", "POST", {
          action: "confirm",
          items: [{ id: record.id, version: record.version }],
        });
        record = { ...record, ...result.items[0] };
        content.querySelector("[data-save-state]").textContent =
          record.status === "number_pending"
            ? "待生成正式货号"
            : "已确认选品 · " + record.data.item_code;
        conclusion.querySelector("[data-conclusion-status]").textContent =
          record.status === "number_pending"
            ? "资料已保存，等待ERP分配正式货号"
            : "已确认选品 · 待第二阶段资料完善；未提交ERP";
        report(
          record.status === "number_pending"
            ? "待生成正式货号；资料已保存，ERP处理后刷新可查看结果。"
            : "已确认选品；未提交ERP、未上架。",
        );
        updateHeader();
        watchNumber();
      }),
    );
    on(content.querySelector("[data-reset-rates]"), "click", () => {
      for (const key of operationKeys) {
        data[key] = 0;
        const f = content.querySelector('[data-field="' + key + '"]');
        if (f) f.value = 0;
      }
      drawProfit();
      recalc();
    });
    data.referenceLinks ||= [];
    data.referencePrices ||= data.referenceLinks.map((_, i) =>
      i === 0 ? (data.marketReferencePrice ?? null) : null,
    );
    if (!data.referenceLinks.length) data.referenceLinks.push("");
    function renderReferences() {
      const box = content.querySelector("[data-reference-links]");
      if (!box) return;
      data.referencePrices ||= [];
      if (!data.referenceLinks.length) data.referenceLinks.push("");
      box.innerHTML = data.referenceLinks
        .map(
          (url, i) =>
            '<div class="sw-reference"><input type="url" aria-label="参考链接 ' +
            (i + 1) +
            '" data-reference="' +
            i +
            '" value="' +
            esc(url) +
            '"><input type="number" min="0" step="any" class="sw-reference-price" aria-label="参考售价（JPY） ' +
            (i + 1) +
            '" placeholder="售价 JPY" data-reference-price="' +
            i +
            '" value="' +
            esc(data.referencePrices[i] ?? "") +
            '"><a data-reference-open="' +
            i +
            '" target="_blank" rel="noopener noreferrer" title="打开参考页面" aria-label="打开参考页面">' +
            icon("external") +
            '</a><button data-reference-remove="' +
            i +
            '">删除</button></div>',
        )
        .join("");
      renderSemanticIcons(box);
      box.querySelectorAll("[data-reference]").forEach((input) => {
        const update = () => {
          data.referenceLinks[Number(input.dataset.reference)] = input.value;
          const a = box.querySelector(
            '[data-reference-open="' + input.dataset.reference + '"]',
          );
          try {
            const u = new URL(input.value);
            if (!["https:", "http:"].includes(u.protocol)) throw Error();
            a.href = u.href;
          } catch {
            a.removeAttribute("href");
          }
        };
        on(input, "input", update);
        update();
      });
      box.querySelectorAll("[data-reference-price]").forEach((input) =>
        on(input, "input", () => {
          data.referencePrices[Number(input.dataset.referencePrice)] =
            input.value === "" ? null : Number(input.value);
        }),
      );
      box.querySelectorAll("[data-reference-remove]").forEach((b) =>
        on(b, "click", () => {
          data.referenceLinks.splice(Number(b.dataset.referenceRemove), 1);
          data.referencePrices.splice(Number(b.dataset.referenceRemove), 1);
          renderReferences();
      specificationsEditor.draw();
        }),
      );
    }
    renderReferences();
    on(content.querySelector("[data-add-reference]"), "click", () => {
      data.referenceLinks.push("");
      data.referencePrices.push(null);
      renderReferences();
      specificationsEditor.draw();
    });
    on(
      content.querySelector("[data-read-source]"),
      "click",
      guarded(async () => {
        const result = await api("/source-check", "POST", {
          sourceUrl: data.sourceUrl,
          excludeId: record?.id,
        });
        if (result.product?.title) {
          data.custom_商品长标题中文 = result.product.title;
          const title = content.querySelector(
            '[data-field="custom_商品长标题中文"]',
          );
          if (title) {
            title.value = result.product.title;
            title.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
        const box = content.querySelector("[data-source-status]");
        box.textContent =
          (result.duplicates.length
            ? "已发现相同来源的选品，请检查选品池。 "
            : "链接有效；全局来源检查未发现重复。 ") + result.reading.message;
      }),
    );
    on(content.querySelector("[data-import-source]"), "click", () =>
      content.querySelector("[data-source-file]").click(),
    );
    on(
      content.querySelector("[data-source-file]"),
      "change",
      guarded(async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const result = await api("/import", "POST", {
          filename: file.name,
          base64: await file64(file),
        });
        if (result.errors.length || result.items.length !== 1)
          throw Error("请导入一份有效的商品快速录入资料表");
        const source = result.items[0].data;
        for (const [key, value] of Object.entries(source)) {
          if (data[key] == null || data[key] === "") {
            data[key] = value;
            const input = content.querySelector('[data-field="' + key + '"]');
            if (input) input.value = value;
          }
        }
        updatePurchaseLink();
        recalc();
        report("已读取现有资料表并补充空白字段，人工值未覆盖，请核对后保存。");
      }),
    );
    const aiResult = document.createElement("div");
    aiResult.className = "sw-ai-result";
    aiResult.setAttribute("role", "status");
    content.append(aiResult);
    content.querySelectorAll("[data-ai]").forEach((b) =>
      on(
        b,
        "click",
        guarded(async () => {
          aiResult.textContent = "正在检查统一AI能力…";
          const result = await api("/assist-context", "POST", {
            id: record?.id,
            data,
            objective: b.dataset.ai,
          });
          aiResult.textContent = result.message;
          aiResult.scrollIntoView({ block: "nearest" });
        }),
      ),
    );
    on(content.querySelector("[data-save]"), "click", guarded(save));
    let identifySequence = 0,
      identifyTimer;
    const recognize = async () => {
      const title = data.custom_商品长标题中文,
        seq = ++identifySequence;
      if (!title) return;
      const status = content.querySelector("[data-source-status]");
      try {
        const suggestion = await api("/identify", "POST", { title });
        if (
          seq !== identifySequence ||
          signal.aborted ||
          title !== data.custom_商品长标题中文
        )
          return;
        for (const [key, value] of Object.entries({
          item_name: suggestion.shortName?.name || "",
          item_group: suggestion.category || "",
          brand: data.brand || suggestion.brand || "",
        })) {
          if (key === "item_name" && data.shortNameManual) continue;
          data[key] = value;
          const field = content.querySelector('[data-field="' + key + '"]');
          if (field) field.value = value;
        }
        if (status)
          status.textContent = suggestion.shortName?.review
            ? "ERP识别待核实；仍可试算"
            : "ERP已识别 · 未回传字段保持待定";
      } catch {
        if (status) status.textContent = "ERP识别待回传，可继续录入与试算";
      }
    };
    on(content.querySelector("[data-identify-source]"), "click", recognize);
    on(
      content.querySelector('[data-field="custom_商品长标题中文"]'),
      "input",
      () => {
        identifySequence++;
        if (!data.shortNameManual) {
          data.item_name = "";
          content.querySelector('[data-field="item_name"]').value = "";
        }
        clearTimeout(identifyTimer);
        identifyTimer = setTimeout(recognize, 500);
      },
    );
    on(signal, "abort", () => clearTimeout(identifyTimer));
    if (data.custom_商品长标题中文) recognize();
    const packageButton = document.createElement("button");
    packageButton.textContent = "下载ERP资料包";
    packageButton.dataset.download = "";
    content.querySelector("[data-stage-two-actions]").append(packageButton);
    on(
      packageButton,
      "click",
      guarded(async () => {
        if (!record || (record.status !== "submitted" && !record.archived))
          await save();
        await download(
          "/records/" + encodeURIComponent(record.id) + "/package",
          (data.item_code || "selection") + ".zip",
        );
      }),
    );
    on(
      content.querySelector("[data-submit]"),
      "click",
      guarded(async () => {
        await save();
        await api("/batch", "POST", {
          action: "submit",
          items: [{ id: record.id, version: record.version }],
        });
        record = await api("/records/" + encodeURIComponent(record.id));
        updateHeader();
        watchNumber();
        report("已提交ERP同步队列。确认选品不代表已经上架。");
      }),
    );
    on(content.querySelector('[data-history]'), 'click', guarded(async event => {
      const button = event.target.closest('[data-retry]');
      if (!button) return;
      await api('/jobs/' + button.dataset.retry + '/retry', 'POST', {});
      record = await api('/records/' + encodeURIComponent(record.id));
      updateHeader(); watchNumber(); report('已重新排队');
    }));
    async function images() {
      const emptyBox = content.querySelector("[data-images]");
      if (!record) {
        if (emptyBox)
          emptyBox.innerHTML =
            '<button type="button" class="sw-empty-image" data-empty-image>添加图片，支持拖拽及粘贴</button>';
        return;
      }
      const fresh = await api("/records/" + encodeURIComponent(record.id));
      record.assets = fresh.assets;
      const box = content.querySelector("[data-images]");
      if (!box) return;
      box.innerHTML = record.assets.length
        ? ""
        : '<button type="button" class="sw-empty-image" data-empty-image>添加图片，支持拖拽及粘贴</button>';
      for (const [i, a] of record.assets.entries()) {
        const url = await imageUrl(record.id, a.id);
        if (signal.aborted) return;
        const wrap = document.createElement("div");
        wrap.innerHTML = `<div class="sw-image-visual"><button class="sw-image-open"><img src="${url}" alt="${esc(a.filename)}"></button></div><small>${i === 0 ? "主图" : esc(a.filename)}</small><button data-main>设为主图</button><button data-left>前移</button><button data-right>后移</button><button data-remove>删除</button>`;
        box.append(wrap);
        on(wrap.querySelector(".sw-image-open"), "click", () => {
          const dialog = document.createElement("dialog");
          dialog.className = "sw-image-dialog";
          dialog.innerHTML = `<button>关闭</button><img src="${url}" alt="商品图片预览">`;
          host.append(dialog);
          dialog.querySelector("button").onclick = () => dialog.remove();
          dialog.showModal();
        });
        const reorder = async (mode) => {
          let ids = record.assets.map((x) => x.id),
            at = ids.indexOf(a.id);
          if (mode === "remove") ids.splice(at, 1);
          else {
            const target =
              mode === "main"
                ? 0
                : mode === "left"
                  ? Math.max(0, at - 1)
                  : Math.min(ids.length - 1, at + 1);
            ids.splice(at, 1);
            ids.splice(target, 0, a.id);
          }
          await api(
            "/records/" + encodeURIComponent(record.id) + "/assets",
            "PUT",
            { ids },
          );
          await images();
        };
        for (const action of ["main", "left", "right", "remove"])
          on(
            wrap.querySelector("[data-" + action + "]"),
            "click",
            guarded(() => reorder(action)),
          );
      }
    }
    let uploading = Promise.resolve();
    const uploadFiles = async (files) => {
      const status = content.querySelector("[data-upload-status]");
      if (status) status.textContent = "正在上传…";
      await ensureDraft();
      for (const file of files) {
        if (file.size > boot.uploadPolicy.maxBytes)
          throw Error(`单张图片不能超过${boot.uploadPolicy.maxMB}MB`);
        await api(
          "/records/" + encodeURIComponent(record.id) + "/assets",
          "POST",
          { filename: file.name, base64: await file64(file) },
        );
      }
      await images();
      if (status) status.textContent = "";
      host.querySelector("[data-message]").hidden = true;
    };
    const queueImageUpload = (work) => {
      uploading = uploading
        .catch(() => {})
        .then(work)
        .catch((e) => {
          const status = content.querySelector("[data-upload-status]");
          if (status) status.textContent = "上传失败：" + e.message;
          throw e;
        });
      return uploading;
    };
    const upload = (files) => {
      const selected = Array.from(files || []);
      if (selected.length) return queueImageUpload(() => uploadFiles(selected));
    };
    const media = content.querySelector(".sw-media-field");
    on(media?.querySelector('[data-image-url-toggle]'), 'click', e => {
      const panel = media.querySelector('[data-image-url-panel]');
      panel.hidden = !panel.hidden;
      e.currentTarget.setAttribute('aria-expanded', String(!panel.hidden));
      if (!panel.hidden) media.querySelector('[data-image-url]').focus();
    });
    on(media?.querySelector('[data-image-url-read]'), 'click', guarded(() => queueImageUpload(async () => {
      const input = media.querySelector('[data-image-url]');
      const sourceUrl = input.value.trim();
      let url;
      try { url = new URL(sourceUrl); } catch { throw Error('请输入有效HTTP或HTTPS图片网址'); }
      if (!['http:', 'https:'].includes(url.protocol)) throw Error('请输入有效HTTP或HTTPS图片网址');
      media.querySelector('[data-upload-status]').textContent = '正在读取图片…';
      await ensureDraft();
      await api('/records/' + encodeURIComponent(record.id) + '/assets', 'POST', { sourceUrl });
      await images();
      media.querySelector('[data-upload-status]').textContent = '';
      host.querySelector('[data-message]').hidden = true;
      input.value = '';
      media.querySelector('[data-image-url-panel]').hidden = true;
      media.querySelector('[data-image-url-toggle]').setAttribute('aria-expanded', 'false');
    })));
    on(media, "click", (e) => {
      if (e.target.closest("[data-add-images],[data-empty-image]"))
        content.querySelector("[data-upload]").click();
    });
    bindFileIntake({
      zone: content.querySelector(".sw-media-field"),
      input: content.querySelector("[data-upload]"),
      onFiles: guarded(upload),
      signal,
    });
    async function marketAssets() {
      const box = content.querySelector("[data-market-assets]");
      if (!record || !box) return;
      const fresh = await api("/records/" + encodeURIComponent(record.id));
      box.innerHTML = "";
      for (const [i, a] of (fresh.marketAssets || []).entries()) {
        const card = document.createElement("div");
        card.className = "sw-market-asset";
        const isImage = a.content_type.startsWith("image/");
        const url = isImage ? await imageUrl(record.id, a.id) : null;
        card.innerHTML =
          (isImage
            ? '<button data-preview><img src="' +
              url +
              '" alt="' +
              esc(a.filename) +
              '"></button>'
            : "<button data-download>下载附件</button>") +
          "<small>" +
          esc(a.filename) +
          "</small><button data-up>↑</button><button data-down>↓</button><button data-remove>删除</button>";
        box.append(card);
        on(card.querySelector("[data-preview]"), "click", () => {
          const d = document.createElement("dialog");
          d.className = "sw-image-dialog";
          d.innerHTML =
            '<button>关闭</button><img src="' + url + '" alt="市场参考预览">';
          host.append(d);
          d.querySelector("button").onclick = () => d.remove();
          d.showModal();
        });
        on(
          card.querySelector("[data-download]"),
          "click",
          guarded(() =>
            download(
              "/records/" + encodeURIComponent(record.id) + "/assets/" + a.id,
              a.filename,
            ),
          ),
        );
        for (const action of ["up", "down", "remove"])
          on(
            card.querySelector("[data-" + action + "]"),
            "click",
            guarded(async () => {
              const ids = fresh.marketAssets.map((x) => x.id);
              ids.splice(i, 1);
              if (action !== "remove")
                ids.splice(
                  action === "up"
                    ? Math.max(0, i - 1)
                    : Math.min(ids.length, i + 1),
                  0,
                  a.id,
                );
              await api(
                "/records/" + encodeURIComponent(record.id) + "/assets",
                "PUT",
                { ids, kind: "market" },
              );
              await marketAssets();
            }),
          );
      }
    }
    const uploadMarket = async (files) => {
      await ensureDraft();
      for (const file of files) {
        if (file.size > boot.uploadPolicy.maxBytes)
          throw Error(`单个附件不能超过${boot.uploadPolicy.maxMB}MB`);
        await api(
          "/records/" + encodeURIComponent(record.id) + "/assets",
          "POST",
          { kind: "market", filename: file.name, base64: await file64(file) },
        );
      }
      await marketAssets();
      host.querySelector("[data-message]").hidden = true;
    };
    bindFileIntake({
      zone: content.querySelector("[data-market-drop]"),
      input: content.querySelector("[data-market-upload]"),
      onFiles: guarded(uploadMarket),
      signal,
    });
    await marketAssets();
    drawProfit();
    recalc();
    await images();
    updateHeader();
    watchNumber();
    if (record?.status === "submitted" || record?.archived) {
      content
        .querySelectorAll("input,select,textarea")
        .forEach((el) => (el.disabled = true));
      content.querySelectorAll("button").forEach((el) => {
        if (
          !el.matches(
            "[data-workspace-tab],[data-back-list],[data-conclusion-list],.sw-image-open,[data-preview],[data-download]",
          )
        )
          el.disabled = true;
      });
    }
  }
  async function list() {
    const stateKey = "aione.selection.list:" + boot.identity.id;
    let saved = {};
    try {
      saved = JSON.parse(sessionStorage.getItem(stateKey) || "{}");
    } catch {}
    let selected = new Map(),
      offset = saved.offset || 0,
      filters = saved.filters || { sort: "createdAt", direction: "desc" },
      result,
      columns = boot.preferences.columns || [
        "image",
        "item_code",
        "item_name",
        "item_group",
        "custom_库存类型",
        "cost",
        "suggestion",
        "price",
        "profit",
        "margin",
        "selector",
        "brand",
        "owner",
        "createdAt",
        "status",
        "sourceUrl",
        "totalCost",
        "operationRate",
        "selectionRationale",
        "operatingStrategy",
        "erpStatus",
      ];
    columns = [
      ...new Set(["image", "selectionNo", "sourcePlatform", ...columns]),
    ];
    const names = {
      image: "商品图片",
      selectionNo: "选品货号",
      sourcePlatform: "选品来源",
      item_code: "正式商品货号",
      item_name: "商品简称",
      item_group: "商品分类",
      custom_库存类型: "库存类型",
      cost: "采购价(CNY)",
      suggestion: "建议售价",
      price: "实际售价",
      profit: "预计利润",
      margin: "预计毛利率",
      selector: "选品人",
      brand: "品牌",
      owner: "负责人",
      createdAt: "选品时间",
      status: "选品状态",
      sourceUrl: "采购URL",
      totalCost: "预计销售总成本",
      operationRate: "运营费率",
      selectionRationale: "选品依据",
      operatingStrategy: "运营策略",
      erpStatus: "ERP处理状态",
    };
    content.innerHTML = `<div class="sw-toolbar"><input data-search placeholder="搜索货号、商品简称"><select data-filter-status><option value="">全部状态</option><option value="draft">草稿</option><option value="confirmed">已确认选品</option><option value="submitted">已提交ERP</option></select><select data-category><option value="">全部分类</option>${boot.fields
      .find((f) => f.id === "item_group")
      .options.map((x) => `<option>${esc(x)}</option>`)
      .join(
        "",
      )}</select><input data-from type="date" aria-label="开始日期"><input data-to type="date" aria-label="结束日期"><input data-margin type="number" placeholder="最低利润率"><select data-sort aria-label="排序字段"><option value="createdAt">创建时间</option><option value="item_code">货号</option><option value="item_name">商品简称</option><option value="cost">采购价</option><option value="suggestion">建议售价</option><option value="price">实际售价</option><option value="profit">利润</option><option value="margin">利润率</option></select><label><input data-archived type="checkbox">已归档</label><button data-query>查询</button></div><div class="sw-toolbar"><button data-new>新增</button>${["copy", "edit", "submit", "archive", "restore", ...(boot.identity.admin ? ["delete"] : [])].map((a, i) => `<button data-action="${a}">${{ copy: "复制", edit: "批量编辑", submit: "提交ERP", archive: "归档", restore: "恢复", delete: "删除" }[a]}</button>`).join("")}<button data-import>导入</button><button data-export="xlsx">导出Excel</button><button data-export="csv">导出CSV</button><button data-columns>显示配置</button><span data-count></span></div><div class="sw-table-wrap"><table><thead></thead><tbody></tbody></table></div><div class="sw-toolbar"><button data-prev>上一页</button><span data-page></span><button data-next>下一页</button></div><input data-import-file type="file" accept=".xlsx,.csv" hidden>`;
    columns = [
      "image",
      "item_code",
      ...columns.filter((k) => !["image", "item_code"].includes(k)),
    ];
    const sortable = new Set(
      sortableKeys(
        Object.fromEntries(
          Object.keys(names).map((k) => [k, { sortable: k !== "image" }]),
        ),
      ),
    );
    const peopleControls=document.createElement('span');
    peopleControls.className='sw-toolbar';
    peopleControls.hidden=!(boot.employeeOptions || []).length;
    peopleControls.innerHTML=['selector','owner'].map(key=>`<select data-${key} aria-label="${key==='selector'?'选品人':'负责人'}"><option value="">全部${key==='selector'?'选品人':'负责人'}</option>${(boot.employeeOptions || []).map(p=>`<option value="${esc(p.id)}">${esc(p.display_name)} · ${esc(p.id)}</option>`).join('')}</select>`).join('');
    content.querySelector('[data-query]').before(peopleControls);
    content.querySelector("[data-sort]").innerHTML = [...sortable]
      .map((k) => `<option value="${k}">${names[k]}</option>`)
      .join("");
    for (const [selector, key] of [
      ["data-selector", "selector"],
      ["data-owner", "owner"],
      ["data-search", "q"],
      ["data-filter-status", "status"],
      ["data-category", "category"],
      ["data-from", "from"],
      ["data-to", "to"],
      ["data-margin", "minMargin"],
      ["data-sort", "sort"],
    ]) {
      const input = content.querySelector(`[${selector}]`);
      if (filters[key] != null) input.value = filters[key];
    }
    content.querySelector("[data-archived]").checked =
      String(filters.archived) === "true";
    const qs = () =>
      new URLSearchParams({ ...filters, offset, limit: 25 }).toString();
    let loadSequence = 0;
    async function load() {
      const currentLoad = ++loadSequence;
      sessionStorage.setItem(stateKey, JSON.stringify({ offset, filters }));
      const loaded = await api("/records?" + qs());
      if (currentLoad !== loadSequence || signal.aborted) return;
      result = loaded;
      selected.clear();
      content.querySelector("[data-count]").textContent =
        "共 " + result.total + " 条";
      content.querySelector("[data-page]").textContent =
        `${Math.floor(offset / 25) + 1} / ${Math.max(1, Math.ceil(result.total / 25))}`;
      content.querySelector("thead").innerHTML =
        '<tr><th><input data-all type="checkbox" aria-label="选择本页"></th>' +
        columns
          .map(
            (k) =>
              `<th data-column="${k}" aria-sort="${tableSortState(filters, k).ariaSort}" style="width:${Number(boot.preferences.widths?.[k]) || 140}px"><div class="sw-col" data-col="${k}">${sortable.has(k) ? `<button data-sort-column="${k}" title="排序">${names[k]}${icon(tableSortState(filters, k).icon)}</button>` : names[k]}</div></th>`,
          )
          .join("") +
        "<th>操作</th></tr>";
      content.querySelector("tbody").innerHTML = result.items
        .map((r) => {
          const d = r.data,
            p =
              r.pricing?.status === "incomplete"
                ? {}
                : r.pricing?.results || {},
            v = {
              ...d,
              sourceUrl: d.sourceUrl,
              selectionRationale: d.selectionRationale,
              operatingStrategy: d.operatingStrategy,
              operationRate:
                [
                  "custom_aione_coupon",
                  "custom_aione_points",
                  "custom_aione_ads",
                  "custom_aione_other",
                ]
                  .reduce((n, k) => n + Number(d[k] || 0), 0)
                  .toFixed(2) + "%",
              totalCost:
                r.pricing?.status === "estimated" &&
                Number(d.custom_实际售价) > 0
                  ? yen(
                      [
                        "custom_到日本仓成本",
                        "custom_日本配送日本",
                        "custom_平台交易成本",
                        "custom_销售运营成本",
                      ].reduce((n, k) => n + Number(p[k] || 0), 0),
                    )
                  : "待计算",
              erpStatus:
                {
                  queued: "等待同步",
                  processing: "处理中",
                  succeeded: "已接收",
                  failed: "失败",
                  conflict: "参数冲突",
                }[r.erpStatus] || "未提交",
              image: `<span data-thumb="${esc(r.id)}">—</span>`,
              cost: d.custom_单个采购价 ?? "—",
              suggestion: yen(p.custom_目标毛利率达标售价),
              price: yen(d.custom_实际售价),
              profit:
                Number(d.custom_实际售价) > 0
                  ? yen(p.custom_运营后毛利润)
                  : "待核算",
              margin:
                Number(d.custom_实际售价) > 0 && p.custom_运营后毛利率 != null
                  ? Number(p.custom_运营后毛利率).toFixed(2) + "%"
                  : "待核算",
              selectionNo: r.selectionNo,
              sourcePlatform:
                r.sourcePlatform === "aione-selection"
                  ? "自主选品"
                  : r.sourcePlatform === "image"
                    ? "图片选品"
                    : r.sourcePlatform,
              selector: r.selectorName || "人员档案待关联",
              owner: r.ownerName || "人员档案待关联",
              createdAt: r.createdAt.slice(0, 10),
              status:
                r.status === "submitted"
                  ? "已提交ERP"
                  : r.status === "confirmed"
                    ? "已确认选品"
                    : "草稿",
            };
          return `<tr><td><input data-select="${esc(r.id)}" type="checkbox"></td>${columns.map((k) => `<td data-column="${k}">${k === "image" ? v[k] : ["item_code", "selectionNo"].includes(k) ? `<a class="sw-code-link" href="#/product-home?view=entry&id=${encodeURIComponent(r.id)}">${esc(k === "selectionNo" ? r.selectionNo : d.item_code || "待生成")}</a>` : ["sourceUrl", "selectionRationale", "operatingStrategy"].includes(k) ? `<button class="sw-cell-detail" title="${esc(v[k] || "")}" data-open="${esc(r.id)}">${esc(String(v[k] || "—").slice(0, 35))}</button>` : esc(String(v[k] ?? "—").slice(0, 60))}</td>`).join("")}<td><button data-open="${esc(r.id)}">打开</button></td></tr>`;
        })
        .join("");
      renderSemanticIcons(content);
      content
        .querySelector("table")
        .style.setProperty(
          "--sw-image-column",
          content
            .querySelector('th[data-column="image"]')
            .getBoundingClientRect().width + "px",
        );
      content.querySelectorAll("[data-sort-column]").forEach((button) =>
        on(
          button,
          "click",
          guarded(async () => {
            const sort = button.dataset.sortColumn;
            Object.assign(filters, nextTableSort(filters, sort));
            content.querySelector("[data-sort]").value = sort;
            offset = 0;
            await load();
          }),
        ),
      );
      on(content.querySelector("[data-all]"), "change", (e) => {
        content.querySelectorAll("[data-select]").forEach((c) => {
          c.checked = e.target.checked;
          const r = result.items.find((r) => r.id === c.dataset.select);
          if (c.checked) selected.set(r.id, r.version);
          else selected.delete(r.id);
        });
      });
      content.querySelectorAll("[data-select]").forEach((c) =>
        on(c, "change", () => {
          const r = result.items.find((r) => r.id === c.dataset.select);
          if (c.checked) selected.set(r.id, r.version);
          else selected.delete(r.id);
        }),
      );
      content
        .querySelectorAll("[data-open]")
        .forEach((b) =>
          on(b, "click", () => navigate("entry", b.dataset.open)),
        );
      content.querySelectorAll("[data-col]").forEach((el) =>
        on(
          el,
          "pointerup",
          guarded(async () => {
            boot.preferences.widths ||= {};
            boot.preferences.widths[el.dataset.col] =
              el.getBoundingClientRect().width;
            await api("/preferences", "PUT", boot.preferences);
            content
              .querySelector("table")
              ?.style.setProperty(
                "--sw-image-column",
                content
                  .querySelector('th[data-column="image"]')
                  .getBoundingClientRect().width + "px",
              );
          }),
        ),
      );
      for (const el of content.querySelectorAll("[data-thumb]")) {
        if (currentLoad !== loadSequence || signal.aborted) return;
        try {
          const record = await api(
            "/records/" + encodeURIComponent(el.dataset.thumb),
          );
          if (record.assets[0]) {
            const url = await imageUrl(
              record.id,
              record.assets[0].id,
              "thumbnail",
            );
            el.innerHTML = `<button class="sw-thumb"><img src="${url}" alt="商品主图"></button>`;
            on(el.querySelector("button"), "click", () => {
              const dialog = document.createElement("dialog");
              dialog.className = "sw-image-dialog";
              dialog.innerHTML = `<button>关闭</button><img src="${url}" alt="主图预览">`;
              host.append(dialog);
              dialog.querySelector("button").onclick = () => dialog.remove();
              dialog.showModal();
            });
          }
        } catch {
          el.textContent = "图片暂不可用";
        }
      }
    }
    on(
      content.querySelector("[data-query]"),
      "click",
      guarded(async () => {
        filters = {
          selector:content.querySelector("[data-selector]").value,
          owner:content.querySelector("[data-owner]").value,
          q: content.querySelector("[data-search]").value,
          status: content.querySelector("[data-filter-status]").value,
          category: content.querySelector("[data-category]").value,
          sort: content.querySelector("[data-sort]").value || filters.sort,
          direction: filters.direction || "desc",
          archived: content.querySelector("[data-archived]").checked,
        };
        for (const k of ["from", "to"])
          if (content.querySelector("[data-" + k + "]").value)
            filters[k] = content.querySelector("[data-" + k + "]").value;
        const margin = content.querySelector("[data-margin]").value;
        if (margin !== "") filters.minMargin = margin;
        offset = 0;
        await load();
      }),
    );
    on(content.querySelector("[data-new]"), "click", () => navigate("entry"));
    on(
      content.querySelector("[data-prev]"),
      "click",
      guarded(async () => {
        offset = Math.max(0, offset - 25);
        await load();
      }),
    );
    on(
      content.querySelector("[data-next]"),
      "click",
      guarded(async () => {
        if (offset + 25 < result.total) offset += 25;
        await load();
      }),
    );
    content.querySelectorAll("[data-export]").forEach((b) =>
      on(
        b,
        "click",
        guarded(() =>
          download(
            "/export?" + qs() + "&format=" + b.dataset.export,
            "selections." + b.dataset.export,
          ),
        ),
      ),
    );
    content.querySelectorAll("[data-action]").forEach((b) =>
      on(
        b,
        "click",
        guarded(async () => {
          const items = [...selected].map(([id, version]) => ({ id, version }));
          if (!items.length) throw Error("请先选择记录");
          let patch;
          if (b.dataset.action === "edit") {
            const dialog = document.createElement("dialog");
            dialog.className = "sw";
            dialog.innerHTML =
              "<h2>批量编辑</h2><select data-key>" +
              boot.fields
                .filter((f) => f.id !== "item_code")
                .map((f) => `<option value="${f.id}">${esc(f.label)}</option>`)
                .join("") +
              "</select><div data-value></div><button data-confirm>保存</button><button data-cancel>取消</button>";
            host.append(dialog);
            const key = dialog.querySelector("[data-key]"),
              render = () =>
                (dialog.querySelector("[data-value]").innerHTML = fieldInput(
                  boot.fields.find((f) => f.id === key.value),
                  "",
                ));
            key.onchange = render;
            render();
            dialog.querySelector("[data-cancel]").onclick = () =>
              dialog.remove();
            dialog.querySelector("[data-confirm]").onclick = guarded(
              async () => {
                const input = dialog.querySelector("[data-field]");
                await api("/batch", "POST", {
                  action: "edit",
                  items,
                  patch: { [key.value]: input.value },
                });
                dialog.remove();
                await load();
              },
            );
            dialog.showModal();
            return;
          }
          if (
            b.dataset.action === "delete" &&
            !confirm("永久删除所选已归档草稿？")
          )
            return;
          await api("/batch", "POST", { action: b.dataset.action, items });
          await load();
          report("操作已完成");
        }),
      ),
    );
    on(content.querySelector("[data-columns]"), "click", async () => {
      const { openColumnEditor } = await import("./selection-column-editor.js");
      openColumnEditor(
        host,
        names,
        columns,
        async (keys) => {
          columns = keys;
          boot.preferences.columns = keys;
          await api("/preferences", "PUT", boot.preferences);
          await load();
        },
        report,
      );
    });
    on(content.querySelector("[data-import]"), "click", () =>
      content.querySelector("[data-import-file]").click(),
    );
    on(
      content.querySelector("[data-import-file]"),
      "change",
      guarded(async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const body = { filename: file.name, base64: await file64(file) },
          preview = await api("/import", "POST", body);
        if (preview.errors.length)
          throw Error(
            preview.errors
              .map((x) => "第" + x.line + "行：" + x.error)
              .join("\n"),
          );
        if (
          !confirm(
            "校验通过，将创建 " + preview.items.length + " 条草稿，是否导入？",
          )
        )
          return;
        await api("/import", "POST", { ...body, commit: true });
        await load();
      }),
    );
    await load();
  }
  try {
    if (view === "layout") await layoutEditor();
    else if (view === "list") await list();
    else if (view === "sync") {
      if (!boot.identity.admin) throw Error("需要管理员权限");
      const result = await api("/sync");
      const labels = {
        queued: "等待同步",
        processing: "处理中",
        succeeded: "接收成功",
        failed: "处理失败",
        conflict: "参数冲突",
      };
      content.innerHTML =
        '<p>当前为隔离测试接收。成功表示8081已收件并通过原生成本重算，不代表正式建档或上架。</p><div class="sw-table-wrap"><table><thead><tr><th>选品记录</th><th>状态</th><th>尝试次数</th><th>处理结果</th><th>更新时间</th></tr></thead><tbody>' +
        result.jobs
          .map(
            (j) =>
              `<tr><td><button data-sync-open="${esc(j.selection_id)}">查看选品</button></td><td>${esc(labels[j.status] || j.status)}</td><td>${esc(j.attempts)}</td><td>${esc(j.result?.message || "等待本地ERP连接器处理")}</td><td>${esc(j.updated_at)}</td></tr>`,
          )
          .join("") +
        "</tbody></table></div>";
      content
        .querySelectorAll("[data-sync-open]")
        .forEach((b) =>
          on(b, "click", () => navigate("entry", b.dataset.syncOpen)),
        );
    } else await entry();
  } catch (e) {
    report(e);
  }
}
