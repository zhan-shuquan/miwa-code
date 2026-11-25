import { aioneApi, getAioneApiBaseUrl } from "../services/aione-api-client.js";
const BASE = "/api/v1/selection-workspace";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const yen = (v) =>
  v == null ? "待核算" : "¥" + Number(v).toLocaleString("ja-JP");
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
  const controller = new AbortController(),
    signal = controller.signal,
    urls = [];
  disposer = () => {
    controller.abort();
    urls.forEach(URL.revokeObjectURL);
  };
  const on = (el, event, fn) => el?.addEventListener(event, fn, { signal });
  const report = (e) => {
    const box = host.querySelector("[data-message]");
    if (box) {
      box.textContent = e.message || String(e);
      box.hidden = false;
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
  host.innerHTML = `<section class="sw ${view === "entry" ? "sw-entry" : ""}"><header class="sw-heading"><div><small>商品之家 · 美和跨境选品</small><h1>${view === "list" ? "选品一览" : view === "layout" ? "表单布局设置" : view === "sync" ? "ERP同步状态" : "选品录入"}</h1></div><nav><button data-nav="entry">选品录入</button><button data-nav="list">选品一览</button>${boot.identity.admin ? '<button data-nav="layout">布局设置</button><button data-nav="sync">同步状态</button>' : ""}${window.AIONE_SELECTION_PREVIEW ? '<a href="/preview">切换测试身份</a>' : ""}</nav></header><div class="sw-status"><span>${esc(boot.identity.name)}</span><span>${boot.connection.online ? "ERP已连接" : "ERP离线 / 使用最近同步参数"}</span><span>参数时间 ${esc(boot.parameters.capturedAt?.slice(0, 19))}</span></div><p class="sw-warning">历史参数待验证 · 预计利润仅供选品参考</p><p data-message role="status" hidden></p><div data-content></div></section>`;
  host.querySelectorAll("[data-nav]").forEach((b) =>
    on(b, "click", () => {
      if (["layout", "sync"].includes(b.dataset.nav))
        location.hash = "#/settings?section=selection-" + b.dataset.nav;
      else navigate(b.dataset.nav);
    }),
  );
  const content = host.querySelector("[data-content]");
  const imageUrl = async (id, asset) => {
    const response = await fetch(
      getAioneApiBaseUrl() +
        BASE +
        `/records/${encodeURIComponent(id)}/assets/${asset}`,
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
  function fieldInput(f, value, attribute = "data-field") {
    const id = esc(f.id),
      val = value ?? "";
    if (f.type === "textarea")
      return (
        "<textarea " +
        attribute +
        '="' +
        id +
        '" rows="3">' +
        esc(val) +
        "</textarea>"
      );
    if (f.type === "select")
      return `<select ${attribute}="${id}"><option value="">请选择</option>${f.options.map((v) => `<option ${v === val ? "selected" : ""} value="${esc(v)}">${esc(v)}</option>`).join("")}</select>`;
    return `<input ${attribute}="${id}" type="${f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}" ${f.type === "number" ? 'min="0" step="any"' : ""} value="${esc(val)}">`;
  }
  async function layoutEditor() {
    if (!boot.identity.admin) throw Error("布局设置需要管理员权限");
    let layout = structuredClone(boot.layout),
      drag;
    const render = () => {
      content.innerHTML = `<p>拖动字段行调整顺序。位置与宽度不会改变ERP字段、计算规则或必填校验。</p><div class="sw-toolbar"><label>左侧比例 <input data-ratio type="number" min="40" max="75" value="${layout.ratio}"> %</label><button data-layout-save>保存默认布局</button><button data-layout-reset>恢复默认</button><button data-layout-preview>预览布局</button></div><div class="sw-layout-list">${layout.fields
        .map((l, i) => {
          const f = boot.fields.find((f) => f.id === l.id);
          return `<div draggable="true" data-layout-row="${i}"><span>☰ ${esc(f.label)}</span><select data-group="${i}">${layout.groups.map((g) => `<option value="${g.id}" ${g.id === l.group ? "selected" : ""}>${esc(g.label)}</option>`).join("")}</select><select data-width="${i}">${[3, 4, 6, 8, 12].map((w) => `<option ${w === l.width ? "selected" : ""}>${w}</option>`).join("")}</select><label>跨行<input type="number" min="1" max="6" data-row-span="${i}" value="${l.rowSpan || 1}"></label><label><input type="checkbox" data-hidden="${i}" ${l.hidden ? "checked" : ""}>隐藏</label><button data-up="${i}" aria-label="上移">↑</button><button data-down="${i}" aria-label="下移">↓</button></div>`;
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
      });
    };
    render();
  }
  function formMarkup(layout, data, region = "main") {
    return layout.groups
      .filter((g) => (g.region || "main") === region)
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
          esc(g.label) +
          '</summary><div class="sw-grid">' +
          fields
            .map((l) => {
              const f = boot.fields.find((f) => f.id === l.id);
              const style =
                "grid-column:span " +
                l.width +
                ";grid-row:span " +
                (l.rowSpan || 1);
              if (f.type === "computed")
                return (
                  '<div class="sw-cost-row ' +
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
                  esc(f.label) +
                  '</span><b data-cost="' +
                  esc(f.id.slice(7)) +
                  '">待计算</b></div>'
                );
              if (f.type === "links")
                return (
                  '<section class="sw-field" style="' +
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
                  '</strong><div class="sw-drop" data-market-drop tabindex="0">拖拽 / 粘贴市场截图 · 与商品素材分开保存<label>添加市场附件<input type="file" data-market-upload multiple accept="image/png,image/jpeg,image/webp,.pdf,.xlsx,.docx,.txt,.csv"></label></div><div class="sw-market-assets" data-market-assets></div></section>'
                );
              if (f.type === "images")
                return (
                  '<section class="sw-media-field" style="' +
                  style +
                  '"><strong>商品图片</strong><div class="sw-images" data-images></div><div class="sw-drop" tabindex="0">拖拽 / 粘贴图片<label>添加图片<input data-upload type="file" accept="image/png,image/jpeg,image/webp" multiple></label></div></section>'
                );
              return (
                '<div class="sw-field" style="' +
                style +
                '"><label><span>' +
                esc(f.label) +
                "</span>" +
                fieldInput(f, data[f.id]) +
                "</label>" +
                (f.id === "sourceUrl"
                  ? '<div class="sw-url-actions"><a data-purchase-open target="_blank" rel="noopener noreferrer">打开采购页面 ↗</a><button type="button" data-read-source>读取资料</button></div>'
                  : "") +
                "</div>"
              );
            })
            .join("") +
          "</div>" +
          (g.id === "operations"
            ? '<div class="sw-toolbar"><span data-operation-rate>综合运营费率 0%</span><button data-reset-rates>恢复0%</button><button data-ai="运营建议">AI运营建议 · 未启用</button></div>'
            : "") +
          (g.id === "market"
            ? '<div class="sw-toolbar"><button data-ai="市场分析">AI市场分析 · 未启用</button><button data-ai="选品依据">AI选品依据 · 未启用</button></div>'
            : "") +
          (g.id === "strategy"
            ? '<button data-ai="运营策略">AI运营策略 · 未启用</button>'
            : "") +
          (g.id === "source"
            ? '<div class="sw-toolbar"><button data-identify-source>按ERP规则识别简称与分类</button><button data-import-source>导入现有资料表</button><input data-source-file type="file" accept=".xlsx" hidden><span data-source-status role="status"></span></div>'
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
    data.skus ||= [];
    let pricing = record?.pricing,
      timer,
      sequence = 0;
    content.innerHTML = `<div class="sw-actions"><span data-save-state>${record ? "版本 " + record.version : "新草稿"}</span><button data-save class="sw-primary">保存草稿</button><button data-confirm-selection>确认选品</button><button data-back-list>返回选品一览</button></div>${formMarkup(boot.layout, data, "top")}<div class="sw-split" style="--sw-left:${boot.layout.ratio}%"><div>${formMarkup(boot.layout, data)}<details class="sw-card"><summary>来源与供应商</summary><label>供应商资料<input data-extra="supplier" value="${esc(data.supplier)}"></label></details><details class="sw-card"><summary>第二阶段 · SKU与ERP资料完善</summary><div class="sw-toolbar" data-stage-two-actions><button data-submit>提交ERP（资料完整后）</button></div><p>每行填写：SKU编号、规格、独立采购价、售价、重量。空白价格继承商品。</p><div data-skus></div><button data-add-sku>新增SKU</button></details><details class="sw-card"><summary>修改记录 / ERP处理状态</summary><div data-history>${(record?.events || []).map((e) => `<p>${esc(e.created_at)} · ${esc(e.actor_id)} · ${esc(e.action)}</p>`).join("") || "尚无修改记录"}${(record?.jobs || []).map((j) => `<p>ERP任务：${esc(j.status)} ${esc(j.result?.message || "")} ${j.status === "failed" ? `<button data-retry="${j.id}">重试</button>` : ""}</p>`).join("")}</div></details></div><aside class="sw-profit sw-card"><h2>成本与预计利润</h2>${formMarkup(boot.layout, data, "aside")}<div data-profit></div><small>同源ERP规则 · 人工确认库存类型 · 未验证参数不作正式利润依据</small></aside></div>`;
    const conclusion = document.createElement("section");
    conclusion.className = "sw-card sw-conclusion";
    conclusion.innerHTML =
      '<h2>04 选品结论</h2><p data-conclusion-status>保存草稿或确认选品，确认后继续第二阶段资料完善。</p><div class="sw-toolbar"><button data-conclusion-save class="sw-primary">保存草稿</button><button data-conclusion-confirm>确认选品</button><button data-conclusion-list>返回选品一览</button><button data-ai="综合选品分析">AI综合分析 · 未启用</button></div>';
    content.append(conclusion);
    if (record?.status === "confirmed")
      conclusion.querySelector("[data-conclusion-status]").textContent =
        "已确认选品 · 待第二阶段资料完善；未提交ERP";
    if (record?.status === "submitted")
      conclusion.querySelector("[data-conclusion-status]").textContent =
        "已提交ERP，请查看处理记录；不代表已正式上架。";
    on(conclusion.querySelector("[data-conclusion-save]"), "click", () =>
      content.querySelector("[data-save]").click(),
    );
    on(conclusion.querySelector("[data-conclusion-confirm]"), "click", () =>
      content.querySelector("[data-confirm-selection]").click(),
    );
    on(conclusion.querySelector("[data-conclusion-list]"), "click", () =>
      navigate("list"),
    );
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
            : r["custom_" + key];
        const available =
          ready &&
          value != null &&
          (!priceDependent.has(key) || Number(data.custom_实际售价) > 0);
        el.textContent = !available
          ? "待计算"
          : key.endsWith("率")
            ? Number(value).toFixed(2) + "%"
            : yen(value);
        el.classList.toggle("sw-loss", available && Number(value) < 0);
      });
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
        const key = input.dataset.field || input.dataset.extra;
        data[key] =
          input.type === "number"
            ? input.value === ""
              ? ""
              : Number(input.value)
            : input.value;
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
    });
    updatePurchaseLink();
    function skuRows() {
      const box = content.querySelector("[data-skus]");
      box.innerHTML = data.skus
        .map(
          (s, i) =>
            `<div class="sw-sku">${["code", "spec", "cost", "price", "weight"].map((k, n) => `<input aria-label="${["SKU编号", "规格", "采购价", "售价", "重量"][n]}" placeholder="${["SKU编号", "规格", "采购价", "售价", "重量"][n]}" data-sku="${i}" data-key="${k}" type="${n > 1 ? "number" : "text"}" value="${esc(s[k])}">`).join("")}<button data-sku-delete="${i}">删除</button></div>`,
        )
        .join("");
      box
        .querySelectorAll("[data-sku]")
        .forEach((e) =>
          on(
            e,
            "input",
            () => (data.skus[Number(e.dataset.sku)][e.dataset.key] = e.value),
          ),
        );
      box.querySelectorAll("[data-sku-delete]").forEach((e) =>
        on(e, "click", () => {
          data.skus.splice(Number(e.dataset.skuDelete), 1);
          skuRows();
        }),
      );
    }
    skuRows();
    on(content.querySelector("[data-add-sku]"), "click", () => {
      data.skus.push({ code: "", spec: "" });
      skuRows();
    });
    const skuActions = document.createElement("div");
    skuActions.className = "sw-toolbar";
    skuActions.innerHTML =
      '<button data-import-sku>导入ERP/1688 SKU表</button><button data-price-skus>按SKU独立试算</button><input type="file" data-sku-file accept=".xlsx" hidden><div data-sku-results></div>';
    content.querySelector("[data-skus]").after(skuActions);
    on(skuActions.querySelector("[data-import-sku]"), "click", () =>
      skuActions.querySelector("[data-sku-file]").click(),
    );
    on(
      skuActions.querySelector("[data-sku-file]"),
      "change",
      guarded(async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const result = await api("/sku-file", "POST", {
          base64: await file64(file),
        });
        data.skus = result.skus;
        skuRows();
        report("SKU已载入，请核对后保存草稿。");
      }),
    );
    on(
      skuActions.querySelector("[data-price-skus]"),
      "click",
      guarded(async () => {
        const result = await api("/sku-pricing", "POST", data);
        skuActions.querySelector("[data-sku-results]").innerHTML = result.items
          .map(
            (s) =>
              `<p>${esc(s.code)}：${s.pricing.status === "incomplete" ? esc(s.pricing.message) : "预计运营后利润 " + yen(s.pricing.results.custom_运营后毛利润) + "（待验证）"}</p>`,
          )
          .join("");
      }),
    );
    const save = async () => {
      data.referenceLinks = (data.referenceLinks || []).filter((v) =>
        String(v).trim(),
      );
      record = await api(
        record ? "/records/" + encodeURIComponent(record.id) : "/records",
        record ? "PATCH" : "POST",
        { data, version: record?.version },
      );
      data = structuredClone(record.data);
      pricing = record.pricing;
      calculationError = "";
      report(
        record.status === "confirmed"
          ? "资料已保存，选品确认状态保留。"
          : "草稿已保存。",
      );
      conclusion.querySelector("[data-conclusion-status]").textContent =
        record.status === "confirmed"
          ? "已确认选品 · 待第二阶段资料完善"
          : "草稿 · 确认选品不等于提交ERP";
      content.querySelector("[data-save-state]").textContent =
        "已保存 · 版本 " + record.version;
      history.replaceState(
        null,
        "",
        "#/product-home?view=entry&id=" + encodeURIComponent(record.id),
      );
      drawProfit();
      return record;
    };
    on(content.querySelector("[data-back-list]"), "click", () =>
      navigate("list"),
    );
    on(
      content.querySelector("[data-confirm-selection]"),
      "click",
      guarded(async () => {
        await save();
        const result = await api("/batch", "POST", {
          action: "confirm",
          items: [{ id: record.id, version: record.version }],
        });
        record = { ...record, ...result.items[0] };
        content.querySelector("[data-save-state]").textContent =
          "已确认选品 · 待第二阶段资料完善";
        conclusion.querySelector("[data-conclusion-status]").textContent =
          "已确认选品 · 待第二阶段资料完善；未提交ERP";
        report("已确认选品；未提交ERP、未上架。可以继续完善第二阶段资料。");
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
    function renderReferences() {
      const box = content.querySelector("[data-reference-links]");
      if (!box) return;
      box.innerHTML = data.referenceLinks
        .map(
          (url, i) =>
            '<div class="sw-reference"><input type="url" aria-label="参考链接 ' +
            (i + 1) +
            '" data-reference="' +
            i +
            '" value="' +
            esc(url) +
            '"><a data-reference-open="' +
            i +
            '" target="_blank" rel="noopener noreferrer">打开 ↗</a><button data-reference-remove="' +
            i +
            '">删除</button></div>',
        )
        .join("");
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
      box.querySelectorAll("[data-reference-remove]").forEach((b) =>
        on(b, "click", () => {
          data.referenceLinks.splice(Number(b.dataset.referenceRemove), 1);
          renderReferences();
        }),
      );
    }
    renderReferences();
    on(content.querySelector("[data-add-reference]"), "click", () => {
      data.referenceLinks.push("");
      renderReferences();
    });
    on(
      content.querySelector("[data-read-source]"),
      "click",
      guarded(async () => {
        const result = await api("/source-check", "POST", {
          sourceUrl: data.sourceUrl,
          excludeId: record?.id,
        });
        const box = content.querySelector("[data-source-status]");
        box.textContent =
          (result.duplicates.length
            ? "已有 " + result.duplicates.length + " 条本人可见重复选品。 "
            : "链接有效；当前可见范围未发现重复。 ") + result.reading.message;
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
    const identifyButton = document.createElement("button");
    identifyButton.textContent = "按ERP规则识别分类与简称";
    const sourceIdentify = content.querySelector("[data-identify-source]");
    if (!sourceIdentify)
      content.querySelector(".sw-actions").append(identifyButton);
    on(
      sourceIdentify || identifyButton,
      "click",
      guarded(async () => {
        const title = data.custom_商品长标题中文;
        if (!title)
          throw Error(
            "现有ERP识别依据商品标题，不会自动抓取采购网页。请粘贴商品长标题或导入现有资料后再识别。",
          );
        const suggestion = await api("/identify", "POST", { title });
        if (!data.item_group && suggestion.category) {
          data.item_group = suggestion.category;
          const f = content.querySelector('[data-field="item_group"]');
          if (f) f.value = suggestion.category;
        }
        if (!data.item_name && suggestion.shortName?.name) {
          data.item_name = suggestion.shortName.name;
          const f = content.querySelector('[data-field="item_name"]');
          if (f) f.value = data.item_name;
        }
        report(
          suggestion.shortName?.review
            ? suggestion.shortName.reason
            : "已使用ERP现有规则填入空白分类与简称；已有人工值保持不变。",
        );
      }),
    );
    const packageButton = document.createElement("button");
    packageButton.textContent = "下载ERP资料包";
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
        report("已提交ERP同步队列。确认选品不代表已经上架。");
      }),
    );
    content.querySelectorAll("[data-retry]").forEach((b) =>
      on(
        b,
        "click",
        guarded(async () => {
          await api("/jobs/" + b.dataset.retry + "/retry", "POST", {});
          report("已重新排队");
        }),
      ),
    );
    async function images() {
      if (!record) return;
      const fresh = await api("/records/" + encodeURIComponent(record.id));
      record.assets = fresh.assets;
      const box = content.querySelector("[data-images]");
      if (!box) return;
      box.innerHTML = "";
      for (const [i, a] of record.assets.entries()) {
        const url = await imageUrl(record.id, a.id);
        if (signal.aborted) return;
        const wrap = document.createElement("div");
        wrap.innerHTML = `<button class="sw-image-open"><img src="${url}" alt="${esc(a.filename)}"></button><small>${i === 0 ? "主图" : esc(a.filename)}</small><button data-main>设为主图</button><button data-left>←</button><button data-right>→</button><button data-remove>删除</button>`;
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
    const upload = async (files) => {
      if (!record) await save();
      for (const file of files) {
        if (file.size > 2000000) throw Error("单张图片不能超过2MB");
        await api(
          "/records/" + encodeURIComponent(record.id) + "/assets",
          "POST",
          { filename: file.name, base64: await file64(file) },
        );
      }
      await images();
    };
    on(
      content.querySelector("[data-upload]"),
      "change",
      guarded((e) => upload(e.target.files)),
    );
    const drop = content.querySelector(".sw-media-field .sw-drop");
    on(drop, "dragover", (e) => e.preventDefault());
    on(
      drop,
      "drop",
      guarded(async (e) => {
        e.preventDefault();
        await upload(e.dataTransfer.files);
      }),
    );
    on(
      drop,
      "paste",
      guarded(async (e) => {
        const files = [...e.clipboardData.items]
          .filter((i) => i.kind === "file")
          .map((i) => i.getAsFile());
        if (files.length) {
          e.preventDefault();
          await upload(files);
        }
      }),
    );
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
      if (!record) await save();
      for (const file of files) {
        if (file.size > 2000000) throw Error("单个市场附件限2MB");
        await api(
          "/records/" + encodeURIComponent(record.id) + "/assets",
          "POST",
          { kind: "market", filename: file.name, base64: await file64(file) },
        );
      }
      await marketAssets();
    };
    on(
      content.querySelector("[data-market-upload]"),
      "change",
      guarded((e) => uploadMarket(e.target.files)),
    );
    const marketDrop = content.querySelector("[data-market-drop]");
    on(marketDrop, "dragover", (e) => e.preventDefault());
    on(
      marketDrop,
      "drop",
      guarded(async (e) => {
        e.preventDefault();
        await uploadMarket(e.dataTransfer.files);
      }),
    );
    on(
      marketDrop,
      "paste",
      guarded(async (e) => {
        const files = [...e.clipboardData.items]
          .filter((i) => i.kind === "file")
          .map((i) => i.getAsFile());
        if (files.length) {
          e.preventDefault();
          await uploadMarket(files);
        }
      }),
    );
    await marketAssets();
    drawProfit();
    recalc();
    await images();
  }
  async function list() {
    let selected = new Map(),
      offset = 0,
      filters = {},
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
    const names = {
      image: "商品图片",
      item_code: "商品货号",
      item_name: "商品名称",
      item_group: "分类",
      custom_库存类型: "库存类型",
      cost: "采购价(CNY)",
      suggestion: "建议售价",
      price: "实际售价",
      profit: "预计利润",
      margin: "预计毛利率",
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
    content.innerHTML = `<div class="sw-toolbar"><input data-search placeholder="搜索货号、商品名称"><select data-filter-status><option value="">全部状态</option><option value="draft">草稿</option><option value="confirmed">已确认选品</option><option value="submitted">已提交ERP</option></select><select data-category><option value="">全部分类</option>${boot.fields
      .find((f) => f.id === "item_group")
      .options.map((x) => `<option>${esc(x)}</option>`)
      .join(
        "",
      )}</select><input data-from type="date" aria-label="开始日期"><input data-to type="date" aria-label="结束日期"><input data-margin type="number" placeholder="最低利润率"><select data-sort><option value="createdAt">时间</option><option value="profit">利润</option><option value="margin">利润率</option></select><label><input data-archived type="checkbox">已归档</label><button data-query>查询</button></div><div class="sw-toolbar"><button data-new>新增</button>${["copy", "edit", "submit", "archive", "restore", ...(boot.identity.admin ? ["delete"] : [])].map((a, i) => `<button data-action="${a}">${{ copy: "复制", edit: "批量编辑", submit: "提交ERP", archive: "归档", restore: "恢复", delete: "删除" }[a]}</button>`).join("")}<button data-import>导入</button><button data-export="xlsx">导出Excel</button><button data-export="csv">导出CSV</button><button data-columns>显示配置</button><span data-count></span></div><div class="sw-table-wrap"><table><thead></thead><tbody></tbody></table></div><div class="sw-toolbar"><button data-prev>上一页</button><span data-page></span><button data-next>下一页</button></div><input data-import-file type="file" accept=".xlsx,.csv" hidden>`;
    const qs = () =>
      new URLSearchParams({ ...filters, offset, limit: 25 }).toString();
    async function load() {
      result = await api("/records?" + qs());
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
              `<th style="width:${Number(boot.preferences.widths?.[k]) || 140}px"><div class="sw-col" data-col="${k}">${names[k]}</div></th>`,
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
              owner: r.owner,
              createdAt: r.createdAt.slice(0, 10),
              status:
                r.status === "submitted"
                  ? "已提交ERP"
                  : r.status === "confirmed"
                    ? "已确认选品"
                    : "草稿",
            };
          return `<tr><td><input data-select="${esc(r.id)}" type="checkbox"></td>${columns.map((k) => `<td>${k === "image" ? v[k] : ["sourceUrl", "selectionRationale", "operatingStrategy"].includes(k) ? `<button class="sw-cell-detail" title="${esc(v[k] || "")}" data-open="${esc(r.id)}">${esc(String(v[k] || "—").slice(0, 35))}</button>` : esc(String(v[k] ?? "—").slice(0, 60))}</td>`).join("")}<td><button data-open="${esc(r.id)}">打开</button></td></tr>`;
        })
        .join("");
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
          }),
        ),
      );
      for (const el of content.querySelectorAll("[data-thumb]")) {
        try {
          const record = await api(
            "/records/" + encodeURIComponent(el.dataset.thumb),
          );
          if (record.assets[0]) {
            const url = await imageUrl(record.id, record.assets[0].id);
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
          q: content.querySelector("[data-search]").value,
          status: content.querySelector("[data-filter-status]").value,
          category: content.querySelector("[data-category]").value,
          sort: content.querySelector("[data-sort]").value,
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
