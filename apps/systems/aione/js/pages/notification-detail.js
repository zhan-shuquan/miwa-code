import { getNotifications, markNotificationRead } from "../data/notification-store.js";
import { renderMiwaNineElements } from "../components/miwa-nine-elements.js";

const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const fmt = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : new Intl.DateTimeFormat("zh-CN", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false }).format(d);
};

function getHashParams() {
  const hash = String(window.location.hash || "");
  const index = hash.indexOf("?");
  return new URLSearchParams(index >= 0 ? hash.slice(index + 1) : "");
}

function statusText(item) {
  if (item.acknowledgedAt) return "已确认";
  if (item.readAt) return item.requiresAck ? "已阅读 · 待确认" : "已阅读";
  return "未读";
}

export function initNotificationDetailPage() {
  const root = document.getElementById("notification-detail");
  if (!root) return;
  const id = getHashParams().get("id");
  let item = getNotifications().find((row) => String(row.id) === String(id));
  const title = document.getElementById("notification-detail-title");
  const description = document.getElementById("notification-detail-description");
  const content = document.getElementById("notification-detail-content");
  const meta = document.getElementById("notification-detail-meta");
  const status = document.getElementById("notification-detail-status");
  const actionRow = document.getElementById("notification-detail-action-row");
  const actions = document.getElementById("notification-detail-actions");

  if (!item) {
    title.textContent = "通知不存在或已失效";
    description.textContent = "请返回通知中心重新选择通知。";
    content.innerHTML = '<div class="miwa-object-empty"><strong>未找到通知</strong><p>当前链接没有对应的通知对象。</p></div>';
    meta.innerHTML = "";
    actionRow.innerHTML = '<a class="miwa-level2-head__button is-primary" href="#/notifications">返回通知中心</a>';
    status.textContent = "不可用";
    return;
  }

  if (!item.readAt) item = markNotificationRead(item.id, false) || item;

  const render = () => {
    title.textContent = item.title || "通知详情";
    description.textContent = `${item.label || "通知"}｜${item.scope || "相关人员"}`;
    status.textContent = statusText(item);
    status.classList.toggle("is-locked", Boolean(item.acknowledgedAt));
    content.innerHTML = `<div class="notification-detail__body">${esc(item.summary || "暂无正文").replace(/\n/g, "<br>")}</div>`;
    const rows = [
      ["通知类型", item.label || "通知"],
      ["发布主体", item.source || "AIONE"],
      ["适用对象", item.scope || "相关人员"],
      ["发布时间", fmt(item.createdAt)],
      ["截止 / 会议时间", fmt(item.dueAt)],
      ["确认要求", item.requiresAck ? "需要明确确认" : "只需阅读"],
      ["阅读时间", fmt(item.readAt)],
      ["确认时间", fmt(item.acknowledgedAt)]
    ];
    meta.innerHTML = rows.map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("");
    actionRow.innerHTML = item.requiresAck && !item.acknowledgedAt
      ? '<button type="button" class="miwa-level2-head__button is-primary" id="notification-detail-ack">我已知悉</button><span>确认后，AI秘书可以把该通知从“待确认”中移除。</span>'
      : `<span>${item.acknowledgedAt ? "这条通知已经完成确认。" : "这条通知已记录为已阅读，无需额外确认。"}</span>`;
    actions.innerHTML = '<a class="miwa-level2-head__button" href="#/notifications">返回通知中心</a>';
    document.getElementById("notification-detail-ack")?.addEventListener("click", () => {
      item = markNotificationRead(item.id, true) || item;
      render();
    });
  };

  renderMiwaNineElements(root.querySelector("[data-miwa-nine-elements]"), { context:"通知管理" });
  window.dispatchEvent(new CustomEvent("aione:page-aside-context", { detail:{ state:"standard", kicker:"当前通知", title:"通知详情", text:"只保留与当前通知直接相关的行动要求、截止时间和确认状态。" } }));
  render();
}
