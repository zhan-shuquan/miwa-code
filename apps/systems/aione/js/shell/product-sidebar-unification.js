import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260902-product-sidebar-v1";

const ITEMS = Object.freeze([
  { label:"概览", icon:"product", route:"product-home" },
  { label:"分类中心", icon:"category", route:"category-home" },
  { label:"品牌中心", icon:"brand", route:"product-home?center=brand-center" },
  { label:"商品中心", icon:"product", route:"product-home?center=product-center" },
  { label:"属性中心", icon:"settings", route:"product-home?center=attribute-center" },
  { label:"规格中心", icon:"apps", route:"product-home?center=specification-center" },
  { label:"库存中心", icon:"database", route:"product-home?center=inventory-center" },
  { label:"资料中心", icon:"file", route:"product-home?center=asset-center" },
  { label:"模板中心", icon:"standard", route:"product-home?center=template-center", gap:true },
  { label:"发布中心", icon:"publishing", route:"product-home?center=publish-center" }
]);

function hashValue() {
  return String(window.location.hash || "").replace(/^#\/?/, "");
}

function isProductRoute() {
  const value = hashValue();
  return value === "product-home" || value.startsWith("product-home?") || value === "category-home" || value.startsWith("category-home?");
}

function active(route) {
  return hashValue() === route;
}

function icon(name) {
  return `<span class="sidebar-icon miwa-semantic-icon" data-icon="${name}"></span>`;
}

function readRecent() {
  try {
    const value = JSON.parse(localStorage.getItem("aione.product.recent.v1") || "[]");
    if (Array.isArray(value)) return value.slice(0, 3);
  } catch {}
  return ["男袜", "女袜", "SOCKONE"].slice(0, 3);
}

function render() {
  if (!isProductRoute()) return;
  const sidebar = document.querySelector(".desktop-sidebar");
  const host = document.getElementById("sidebar-navigation-tree");
  if (!sidebar || !host) return;

  document.querySelector(".sidebar-context-head")?.setAttribute("hidden", "");
  const quick = document.getElementById("sidebar-quick-actions");
  if (quick) quick.hidden = true;
  const primary = document.getElementById("sidebar-primary-action");
  if (primary) primary.hidden = true;

  host.innerHTML = ITEMS.map((item) => `<a class="sidebar-flat-link product-sidebar-link ${item.gap ? "has-section-gap" : ""}" href="#/${item.route}" ${active(item.route) ? 'aria-current="page"' : ""}>${icon(item.icon)}<span>${item.label}</span></a>`).join("");

  let recent = sidebar.querySelector("[data-product-sidebar-recent]");
  if (!recent) {
    recent = document.createElement("section");
    recent.className = "product-sidebar-recent";
    recent.dataset.productSidebarRecent = "true";
    const controls = sidebar.querySelector(".sidebar-shell-controls");
    if (controls) sidebar.insertBefore(recent, controls);
    else sidebar.append(recent);
  }
  const recentItems = readRecent();
  recent.hidden = recentItems.length === 0;
  recent.innerHTML = recentItems.length ? `<div class="product-sidebar-recent__label">最近查看</div>${recentItems.map((name) => `<button type="button" title="${name}"><span>•</span><b>${name}</b></button>`).join("")}` : "";

  renderSemanticIcons(sidebar);
}

window.addEventListener("hashchange", () => window.setTimeout(render, 0));
window.addEventListener("aione:category-preview-rendered", render);
window.addEventListener("DOMContentLoaded", render);
window.setTimeout(render, 700);
