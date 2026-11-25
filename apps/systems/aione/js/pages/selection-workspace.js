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
  host.innerHTML = `<section class="sw"><header class="sw-heading"><div><small>商品之家 · 美和跨境选品</small><h1>${view === "list" ? "选品一览" : view === "layout" ? "表单布局设置" : view === "sync" ? "ERP同步状态" : "选品录入"}</h1></div><nav><button data-nav="entry">选品录入</button><button data-nav="list">选品一览</button>${boot.identity.admin ? '<button data-nav="layout">布局设置</button><button data-nav="sync">同步状态</button>' : ""}${window.AIONE_SELECTION_PREVIEW ? '<a href="/preview">切换测试身份</a>' : ""}</nav></header><div class="sw-status"><span>${esc(boot.identity.name)}</span><span>${boot.connection.online ? "ERP已连接" : "ERP离线 / 使用最近同步参数"}</span><span>参数时间 ${esc(boot.parameters.capturedAt?.slice(0, 19))}</span></div><p class="sw-warning">历史试算参数 · 待业务验证。以下均为选品预计利润，不作为正式经营利润依据。</p><p data-message role="status" hidden></p><div data-content></div></section>`;
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
    if (f.type === "select")
      return `<select ${attribute}="${id}"><option value="">请选择</option>${f.options.map((v) => `<option ${v === val ? "selected" : ""} value="${esc(v)}">${esc(v)}</option>`).join("")}</select>`;
    return `<input ${attribute}="${id}" type="${f.type === "number" ? "number" : "text"}" ${f.type === "number" ? 'min="0" step="any"' : ""} value="${esc(val)}">`;
  }
  async function layoutEditor() {
    if (!boot.identity.admin) throw Error("布局设置需要管理员权限");
    let layout = structuredClone(boot.layout),
      drag;
    const render = () => {
      content.innerHTML = `<p>拖动字段行调整顺序。位置与宽度不会改变ERP字段、计算规则或必填校验。</p><div class="sw-toolbar"><label>左侧比例 <input data-ratio type="number" min="40" max="75" value="${layout.ratio}"> %</label><button data-layout-save>保存默认布局</button><button data-layout-reset>恢复默认</button><button data-layout-preview>预览布局</button></div><div class="sw-layout-list">${layout.fields
        .map((l, i) => {
          const f = boot.fields.find((f) => f.id === l.id);
          return `<div draggable="true" data-layout-row="${i}"><span>☰ ${esc(f.label)}</span><select data-group="${i}">${layout.groups.map((g) => `<option value="${g.id}" ${g.id === l.group ? "selected" : ""}>${esc(g.label)}</option>`).join("")}</select><select data-width="${i}">${[3, 4, 6, 8, 12].map((w) => `<option ${w === l.width ? "selected" : ""}>${w}</option>`).join("")}</select><label><input type="checkbox" data-hidden="${i}" ${l.hidden ? "checked" : ""}>隐藏</label><button data-up="${i}" aria-label="上移">↑</button><button data-down="${i}" aria-label="下移">↓</button></div>`;
        })
        .join(
          "",
        )}</div><h3>区块顺序与折叠</h3>${layout.groups.map((g, i) => `<div class="sw-toolbar"><span>${esc(g.label)}</span><label><input type="checkbox" data-collapse="${i}" ${g.collapsed ? "checked" : ""}>默认折叠</label><button data-group-up="${i}">上移</button></div>`).join("")}<div data-layout-preview-area></div>`;
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
          formMarkup(layout, {});
      });
    };
    render();
  }
  function formMarkup(layout, data) {
    return layout.groups
      .map(
        (g) =>
          `<details class="sw-card" ${g.collapsed ? "" : "open"}><summary>${esc(g.label)}</summary><div class="sw-grid">${layout.fields
            .filter((l) => l.group === g.id && !l.hidden)
            .map((l) => {
              const f = boot.fields.find((f) => f.id === l.id);
              return `<label style="grid-column:span ${l.width}"><span>${esc(f.label)}</span>${fieldInput(f, data[f.id])}</label>`;
            })
            .join("")}</div></details>`,
      )
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
    content.innerHTML = `<div class="sw-actions"><span data-save-state>${record ? "版本 " + record.version : "新草稿"}</span><button data-save class="sw-primary">保存草稿</button><button data-submit>确认并提交ERP</button></div><div class="sw-split" style="--sw-left:${boot.layout.ratio}%"><div><section class="sw-card"><h2>商品图片</h2><div class="sw-drop" tabindex="0">拖拽图片到此处，或点击此区域后粘贴图片<label>选择图片<input data-upload type="file" accept="image/png,image/jpeg,image/webp" multiple></label></div><div class="sw-images" data-images></div></section>${formMarkup(boot.layout, data)}<details class="sw-card"><summary>来源与供应商</summary><label>1688 / 商品链接<input data-extra="sourceUrl" value="${esc(data.sourceUrl)}" type="url"></label><label>供应商资料<input data-extra="supplier" value="${esc(data.supplier)}"></label></details><details class="sw-card"><summary>SKU明细与其他资料</summary><p>每行填写：SKU编号、规格、独立采购价、售价、重量。空白价格继承商品。</p><div data-skus></div><button data-add-sku>新增SKU</button></details><details class="sw-card"><summary>修改记录 / ERP处理状态</summary><div data-history>${(record?.events || []).map((e) => `<p>${esc(e.created_at)} · ${esc(e.actor_id)} · ${esc(e.action)}</p>`).join("") || "尚无修改记录"}${(record?.jobs || []).map((j) => `<p>ERP任务：${esc(j.status)} ${esc(j.result?.message || "")} ${j.status === "failed" ? `<button data-retry="${j.id}">重试</button>` : ""}</p>`).join("")}</div></details></div><aside class="sw-profit sw-card"><h2>成本与预计利润</h2><div data-profit></div><small>同源ERP规则 · 人工确认库存类型 · 未验证参数不作正式利润依据</small></aside></div>`;
    const drawProfit = () => {
      const p = content.querySelector("[data-profit]");
      if (!pricing) {
        p.innerHTML = "<p>填写采购价、重量与物流后试算。</p>";
        return;
      }
      if (pricing.status === "incomplete") {
        p.innerHTML = '<p class="sw-warning">' + esc(pricing.message) + "</p>";
        return;
      }
      const r = pricing.results;
      p.innerHTML = `<p class="sw-warning">预计值 · 待验证</p><div class="sw-metric"><span>建议售价</span><strong>${yen(r.custom_目标毛利率达标售价)}</strong></div><div class="sw-metric"><span>实际售价</span><strong>${yen(data.custom_实际售价)}</strong></div><div class="sw-metric"><span>运营后预计利润</span><strong>${Number(data.custom_实际售价) > 0 ? yen(r.custom_运营后毛利润) : "待填写售价"}</strong><span>${Number(data.custom_实际售价) > 0 ? Number(r.custom_运营后毛利率 || 0).toFixed(2) + "%" : ""}</span></div>${["到日本仓成本", "日本配送日本", "平台交易成本", "销售运营成本", "未运营保本售价", "运营后保本售价", "未运营毛利润"].map((k) => `<div class="sw-cost-row"><span>${k === "日本配送日本" ? "日本配送成本" : k}</span><b>${yen(r["custom_" + k])}</b></div>`).join("")}<div class="sw-cost-row"><span>预计销售总成本</span><b>${Number(data.custom_实际售价) > 0 ? yen(Number(r.custom_到日本仓成本) + Number(r.custom_日本配送日本) + Number(r.custom_平台交易成本) + Number(r.custom_销售运营成本)) : "待填写售价"}</b></div><small>${esc(pricing.message)}</small>`;
    };
    const recalc = () => {
      clearTimeout(timer);
      const seq = ++sequence;
      timer = setTimeout(
        guarded(async () => {
          const result = await api("/calculate", "POST", data);
          if (seq === sequence && !signal.aborted) {
            pricing = result;
            drawProfit();
          }
        }),
        350,
      );
    };
    on(signal, "abort", () => clearTimeout(timer));
    content.querySelectorAll("[data-field],[data-extra]").forEach((input) =>
      on(input, "input", () => {
        const key = input.dataset.field || input.dataset.extra;
        data[key] =
          input.type === "number"
            ? input.value === ""
              ? ""
              : Number(input.value)
            : input.value;
        recalc();
      }),
    );
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
      record = await api(
        record ? "/records/" + encodeURIComponent(record.id) : "/records",
        record ? "PATCH" : "POST",
        { data, version: record?.version },
      );
      data = structuredClone(record.data);
      pricing = record.pricing;
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
    on(content.querySelector("[data-save]"), "click", guarded(save));
    const identifyButton = document.createElement("button");
    identifyButton.textContent = "按ERP规则识别分类与简称";
    content.querySelector(".sw-actions").append(identifyButton);
    on(
      identifyButton,
      "click",
      guarded(async () => {
        const title = data.custom_商品长标题中文;
        if (!title) throw Error("请先填写商品长标题");
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
    content.querySelector(".sw-actions").append(packageButton);
    on(
      packageButton,
      "click",
      guarded(async () => {
        if (!record || (record.status === "draft" && !record.archived))
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
    const drop = content.querySelector(".sw-drop");
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
      status: "ERP状态",
    };
    content.innerHTML = `<div class="sw-toolbar"><input data-search placeholder="搜索货号、商品名称"><select data-filter-status><option value="">全部状态</option><option value="draft">草稿</option><option value="submitted">已提交ERP</option></select><select data-category><option value="">全部分类</option>${boot.fields
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
                r.status === "submitted" ? "已提交（查看处理详情）" : "草稿",
            };
          return `<tr><td><input data-select="${esc(r.id)}" type="checkbox"></td>${columns.map((k) => `<td>${k === "image" ? v[k] : esc(v[k] ?? "—")}</td>`).join("")}<td><button data-open="${esc(r.id)}">打开</button></td></tr>`;
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
