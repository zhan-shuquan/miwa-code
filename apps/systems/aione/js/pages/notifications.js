import {
  getNotifications,
  createNotification,
  markNotificationRead,
  syncNotificationHeader,
  importNotifications
} from "../data/notification-store.js";
import { renderMiwaNineElements } from "../components/miwa-nine-elements.js";
import { bindHorizontalRails } from "../components/horizontal-rail.js";
import { getActiveSystemParameters } from "../shell/system-settings.js";

const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[c]));

const fmt = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false
  }).format(d);
};

const FLOW = ["布置通知", "AI秘书整理", "确认对象/时间", "发布", "阅读/确认", "提醒", "归档"];

function parseCsv(text) {
  const lines = String(text || "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const parse = (line) => {
    const cells = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === "," && !quoted) { cells.push(cell); cell = ""; }
      else cell += ch;
    }
    cells.push(cell);
    return cells;
  };
  const headers = parse(lines.shift()).map((x) => x.trim());
  return lines.map((line) => {
    const cells = parse(line);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
  });
}

function downloadCsv(items) {
  const fields = [
    ["通知类型", "label"], ["标题", "title"], ["内容", "summary"], ["对象", "scope"], ["来源", "source"],
    ["重要程度", "level"], ["要求确认", "requiresAck"], ["发布时间", "createdAt"], ["截止/会议时间", "dueAt"],
    ["已读时间", "readAt"], ["确认时间", "acknowledgedAt"]
  ];
  const q = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const lines = [fields.map(([label]) => q(label)).join(",")];
  items.forEach((item) => lines.push(fields.map(([, key]) => q(item[key])).join(",")));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `AIONE_通知_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function statusText(item) {
  if (item.acknowledgedAt) return "已确认";
  if (item.readAt) return item.requiresAck ? "已阅读 · 待确认" : "已阅读";
  return "未读";
}

export function initNotificationsPage() {
  const root = document.getElementById("notification-center");
  const list = document.getElementById("notification-list");
  const summary = document.getElementById("notification-summary");
  if (!root || !list || !summary) return;

  const params = getActiveSystemParameters?.() || {};
  const types = params.dictionaries?.notificationTypes || ["重要通知", "会议通知", "制度/规则通知", "业务通知", "系统通知"];
  const state = { type: "", query: "", view: "card" };
  let toastTimer = null;

  const canCreate = params.permissions?.allowCreate !== false;
  const canImport = params.permissions?.allowImport !== false && (params.io?.allowCsv !== false || params.io?.allowExcel !== false);
  const canExport = params.permissions?.allowExport !== false;

  const toast = (text) => {
    const el = document.getElementById("notification-toast");
    if (!el) return;
    el.textContent = text;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2200);
  };

  const matches = (item) => {
    if (state.type && item.label !== state.type) return false;
    const q = state.query.trim().toLowerCase();
    return !q || [item.title, item.summary, item.scope, item.source, item.label].join(" ").toLowerCase().includes(q);
  };

  function renderTypes(items) {
    const rail = document.getElementById("notice-type-rail");
    rail.dataset.visible = String(Math.min(3, Math.max(1, types.length)));
    rail.innerHTML = types.map((type) => `
      <article class="notification-type-card${state.type === type ? " is-active" : ""}" data-notice-type="${esc(type)}">
        <header><strong>${esc(type)}</strong><b>${items.filter((x) => x.label === type).length}</b></header>
        <p>${type === "重要通知" ? "必须认真阅读；可要求明确确认。" : type === "会议通知" ? "公司内部会议、准备事项与时间安排。" : "统一纳入通知记录，按真实范围传达。"}</p>
      </article>
    `).join("");
    const filter = document.getElementById("notification-filter");
    filter.innerHTML = `<option value="">全部通知类型</option>${types.map((type) => `<option value="${esc(type)}">${esc(type)}</option>`).join("")}`;
    filter.value = state.type;
  }

  function renderFlow() {
    document.getElementById("notice-flow").innerHTML = FLOW.map((step, index) => `
      <span class="miwa-business-flow__step"><small>${String(index + 1).padStart(2, "0")}</small>${esc(step)}</span>
    `).join("");
  }

  function renderMetrics(items) {
    const today = new Date().toISOString().slice(0, 10);
    const data = [
      { label: "通知总数", value: items.length },
      { label: "今日重要", value: items.filter((x) => x.level === "important" && String(x.createdAt || "").slice(0, 10) === today).length },
      { label: "未读", value: items.filter((x) => !x.readAt).length },
      { label: "待确认", value: items.filter((x) => x.requiresAck && !x.acknowledgedAt).length },
      { label: "已确认", value: items.filter((x) => x.acknowledgedAt).length }
    ];
    summary.dataset.visible = String(Math.min(6, Math.max(1, data.length)));
    summary.innerHTML = data.map((m) => `<article class="miwa-core-metric"><span>${esc(m.label)}</span><strong>${esc(m.value)}</strong></article>`).join("");
  }

  function renderAux(items) {
    const pending = items.filter((x) => x.requiresAck && !x.acknowledgedAt).length;
    const unread = items.filter((x) => !x.readAt).length;
    const meetings = items.filter((x) => x.label === "会议通知" && !x.acknowledgedAt).length;
    const cards = [
      { title: "待确认通知", text: `当前 ${pending} 条需要明确确认。` },
      { title: "未读提醒", text: `当前 ${unread} 条未读，AI秘书可继续跟踪。` },
      { title: "会议准备", text: `当前 ${meetings} 条会议通知尚未完成确认/处理。` },
      { title: "AI秘书", text: "可根据GPT中的自然语言布置整理正式通知、建议对象与确认方式。" }
    ];
    const rail = document.getElementById("notice-aux-rail");
    rail.dataset.visible = String(Math.min(5, Math.max(1, cards.length)));
    rail.innerHTML = cards.map((c) => `<article class="miwa-auxiliary-card"><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></article>`).join("");
  }

  function detailUrl(item) {
    return `#/notification-detail?id=${encodeURIComponent(item.id)}`;
  }

  function renderItems(items) {
    const rows = items.filter(matches);
    document.getElementById("notification-count").textContent = String(rows.length);
    const wrap = document.getElementById("notification-list-wrap");
    const empty = document.getElementById("notification-empty");
    const head = document.getElementById("notification-table-head");
    const body = document.getElementById("notification-table-body");

    list.hidden = state.view !== "card";
    wrap.hidden = state.view !== "list";
    document.querySelectorAll("[data-notification-view]").forEach((b) => b.classList.toggle("is-active", b.dataset.notificationView === state.view));

    if (!rows.length) {
      empty.hidden = false;
      empty.innerHTML = '<strong>当前暂无通知</strong><p>可以手工新建，也可以由AI秘书整理后发布；普通业务事件可按系统参数自动进入。</p>';
      list.innerHTML = "";
      head.innerHTML = "";
      body.innerHTML = "";
      return;
    }

    empty.hidden = true;
    list.innerHTML = rows.map((item) => `
      <article class="notification-item${item.readAt ? " is-read" : ""}${item.level === "important" ? " is-important" : ""}">
        <header><div><span>${esc(item.label || "通知")}</span><h2><a href="${detailUrl(item)}">${esc(item.title)}</a></h2></div><time>${esc(fmt(item.createdAt))}</time></header>
        <p>${esc(item.summary || "")}</p>
        <div class="notification-item__meta"><span>来源：${esc(item.source || "AIONE")}</span><span>对象：${esc(item.scope || "相关人员")}</span>${item.dueAt ? `<span>时间：${esc(fmt(item.dueAt))}</span>` : ""}</div>
        <footer>
          <a class="notification-item__detail" href="${detailUrl(item)}">查看详情</a>
          ${!item.readAt ? `<button data-notice-read="${esc(item.id)}">标记已读</button>` : ""}
          ${item.requiresAck && !item.acknowledgedAt ? `<button class="primary" data-notice-ack="${esc(item.id)}">我已知悉</button>` : ""}
          <span class="spacer"></span><span>${esc(statusText(item))}</span>
        </footer>
      </article>
    `).join("");

    head.innerHTML = "<tr><th>标题</th><th>类型</th><th>对象</th><th>来源</th><th>发布时间</th><th>状态</th><th>操作</th></tr>";
    body.innerHTML = rows.map((item) => `
      <tr><td><a href="${detailUrl(item)}">${esc(item.title)}</a></td><td>${esc(item.label)}</td><td>${esc(item.scope)}</td><td>${esc(item.source)}</td><td>${esc(fmt(item.createdAt))}</td><td>${esc(statusText(item))}</td><td><a href="${detailUrl(item)}">详情</a>${!item.readAt ? `<button data-notice-read="${esc(item.id)}">已读</button>` : ""}${item.requiresAck && !item.acknowledgedAt ? `<button data-notice-ack="${esc(item.id)}">确认</button>` : ""}</td></tr>
    `).join("");
  }

  function render() {
    const items = getNotifications();
    renderTypes(items);
    renderFlow();
    renderMetrics(items);
    renderItems(items);
    renderAux(items);
    renderMiwaNineElements(root.querySelector("[data-miwa-nine-elements]"), { context: "通知管理" });
    bindHorizontalRails(root);
  }

  function openCreate() {
    if (!canCreate) { toast("新建通知已由系统参数权限关闭"); return; }
    const select = document.getElementById("notification-type-select");
    select.innerHTML = types.map((type) => `<option>${esc(type)}</option>`).join("");
    const form = document.getElementById("notification-create-form");
    if (form?.elements?.requiresAck) form.elements.requiresAck.value = String(params.notifications?.importantRequiresAck !== false);
    document.getElementById("notification-create-dialog")?.showModal();
  }

  const createButton = document.getElementById("notice-create");
  if (createButton) {
    createButton.disabled = !canCreate;
    createButton.title = canCreate ? "" : "新建已由系统参数权限关闭";
    createButton.addEventListener("click", openCreate);
  }

  document.querySelectorAll("[data-notice-dialog-close]").forEach((b) => b.addEventListener("click", () => document.getElementById("notification-create-dialog")?.close()));
  document.getElementById("notification-create-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const requiresAck = String(fd.get("requiresAck")) === "true";
    createNotification({
      title: fd.get("title"), label: fd.get("label"), summary: fd.get("summary"), scope: fd.get("scope"),
      source: fd.get("source") || "美和集团 AI办公室", level: fd.get("level") || "important", requiresAck, dueAt: fd.get("dueAt") || null
    });
    document.getElementById("notification-create-dialog")?.close();
    event.currentTarget.reset();
    toast("通知已发布");
    render();
  });

  root.addEventListener("click", (event) => {
    const type = event.target.closest("[data-notice-type]");
    if (type) { state.type = type.dataset.noticeType || ""; render(); return; }
    const view = event.target.closest("[data-notification-view]");
    if (view) { state.view = view.dataset.notificationView; render(); return; }
    const read = event.target.closest("[data-notice-read]");
    if (read) { markNotificationRead(read.dataset.noticeRead, false); render(); return; }
    const ack = event.target.closest("[data-notice-ack]");
    if (ack) { markNotificationRead(ack.dataset.noticeAck, true); render(); return; }
    if (event.target.closest("[data-notice-overview]")) window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.getElementById("notification-search")?.addEventListener("input", (event) => { state.query = event.target.value; render(); });
  document.getElementById("notification-filter")?.addEventListener("change", (event) => { state.type = event.target.value; render(); });

  const exportButton = document.getElementById("notification-export");
  const importButton = document.getElementById("notification-import");
  const importInput = document.getElementById("notification-import-file");
  if (exportButton) { exportButton.disabled = !canExport; exportButton.title = canExport ? "" : "导出已由系统参数权限关闭"; }
  if (importButton) { importButton.disabled = !canImport; importButton.title = canImport ? "" : "导入已由系统参数权限关闭"; }
  exportButton?.addEventListener("click", () => { if (canExport) downloadCsv(getNotifications().filter(matches)); });
  importButton?.addEventListener("click", () => { if (canImport) importInput?.click(); });
  importInput?.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      let rows = [];
      if (/\.csv$/i.test(file.name)) {
        if (params.io?.allowCsv === false) throw new Error("CSV导入已由系统参数关闭");
        rows = parseCsv(await file.text());
      } else if (/\.xlsx$/i.test(file.name)) {
        if (params.io?.allowExcel === false) throw new Error("Excel导入已由系统参数关闭");
        if (!window.XLSX) throw new Error("Excel解析组件未加载");
        const book = window.XLSX.read(await file.arrayBuffer(), { type: "array" });
        rows = window.XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: "" });
      } else throw new Error("仅支持CSV / XLSX文件");
      const mapped = rows.map((r) => ({
        label: r["通知类型"] || r.label || "业务通知", title: r["标题"] || r.title, summary: r["内容"] || r.summary,
        scope: r["对象"] || r.scope || "相关人员", source: r["来源"] || r.source || "导入", level: r["重要程度"] || r.level || "normal",
        requiresAck: String(r["要求确认"] ?? r.requiresAck).toLowerCase() === "true", dueAt: r["截止/会议时间"] || r.dueAt || null
      })).filter((x) => x.title);
      importNotifications(mapped);
      toast(`导入完成：${mapped.length} 条`);
      render();
    } catch (error) {
      toast(`导入失败：${error.message || error}`);
    } finally {
      importInput.value = "";
    }
  });

  const onNotificationsUpdated = () => {
    if (!document.getElementById("notification-center")) {
      window.removeEventListener("aione:notifications-updated", onNotificationsUpdated);
      return;
    }
    render();
  };

  syncNotificationHeader();
  window.addEventListener("aione:notifications-updated", onNotificationsUpdated);
  window.dispatchEvent(new CustomEvent("aione:page-aside-context", {
    detail: { title: "通知中心｜当前辅助", text: "可整理通知、建议发布范围与确认方式、追踪未读和待确认；关键发布由负责人确认。" }
  }));
  render();
}
