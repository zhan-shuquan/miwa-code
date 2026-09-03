import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260903-product-sidebar-current";

/* 商品之家 CURRENT｜2026-09-03
 * 最新Sidebar只保留7个稳定中心。
 * 选品已回归工作之家；模板/发布等不再占当前一级中心目录。
 */
const ITEMS = Object.freeze([
  { label:"概览", icon:"product", route:"product-home" },
  { label:"分类中心", icon:"category", route:"category-home" },
  { label:"品牌中心", icon:"brand", route:"product-home?center=brand-center" },
  { label:"商品中心", icon:"product", route:"product-home?center=product-center" },
  { label:"属性中心", icon:"settings", route:"product-home?center=attribute-center" },
  { label:"规格中心", icon:"apps", route:"product-home?center=specification-center" },
  { label:"库存中心", icon:"database", route:"product-home?center=inventory-center" },
  { label:"资料中心", icon:"file", route:"product-home?center=asset-center" }
]);

function hashValue() { return String(window.location.hash || "").replace(/^#\/?/, ""); }
function isProductRoute() {
  const value = hashValue();
  return value === "product-home" || value.startsWith("product-home?") || value === "category-home" || value.startsWith("category-home?");
}
function active(route) { return hashValue() === route; }
function icon(name) { return `<span class="sidebar-icon miwa-semantic-icon" data-icon="${name}"></span>`; }
function clearProductSidebar(sidebar) {
  if (!sidebar) return;
  delete sidebar.dataset.productSidebarContext;
  const recent = sidebar.querySelector("[data-product-sidebar-recent]");
  if (recent) recent.remove();
}
function renderProductIdentity(sidebar) {
  const contextHead = sidebar.querySelector(".sidebar-context-head");
  const title = sidebar.querySelector("#sidebar-context-title");
  const kicker = sidebar.querySelector("#sidebar-context-kicker");
  const contextIcon = sidebar.querySelector("#sidebar-context-icon");
  sidebar.dataset.productSidebarContext = "true";
  if (contextHead) contextHead.hidden = false;
  if (title) { title.textContent = "商品之家"; title.hidden = false; }
  if (kicker) kicker.hidden = true;
  if (contextIcon) { contextIcon.hidden = false; contextIcon.dataset.icon = "product"; contextIcon.dataset.iconReady = "false"; }
}
function render() {
  const sidebar = document.querySelector(".desktop-sidebar");
  if (!sidebar) return;
  if (!isProductRoute()) { clearProductSidebar(sidebar); return; }
  const host = document.getElementById("sidebar-navigation-tree");
  if (!host) return;
  renderProductIdentity(sidebar);
  const quick = document.getElementById("sidebar-quick-actions");
  if (quick) quick.hidden = true;
  const primary = document.getElementById("sidebar-primary-action");
  if (primary) primary.hidden = true;
  host.innerHTML = ITEMS.map((item) => `<a class="sidebar-flat-link product-sidebar-link" href="#/${item.route}" ${active(item.route) ? 'aria-current="page"' : ""}>${icon(item.icon)}<span>${item.label}</span></a>`).join("");
  sidebar.querySelector("[data-product-sidebar-recent]")?.remove();
  renderSemanticIcons(sidebar);
}
window.addEventListener("hashchange", () => window.setTimeout(render, 0));
window.addEventListener("aione:category-preview-rendered", render);
window.addEventListener("DOMContentLoaded", render);
window.setTimeout(render, 700);
