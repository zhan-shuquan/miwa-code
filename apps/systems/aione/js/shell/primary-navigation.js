/* AIONE Universal Sidebar｜CURRENT 2026-09-08 */
import { getCurrentBusinessSpaceId, syncPlatformContextFromRoute } from "./platform-context.js";
import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260824-v1.9.5-sidebar-aside-lock-candidate";
import { resolveSidebarContext } from "../config/sidebar-registry.js";

function routeId(){return String(location.hash||"").replace(/^#\/?/,"").split(/[/?]/)[0]||"selection";}
function hashBody(){return String(location.hash||"").replace(/^#\/?/,"");}
function href(route=""){return String(route).startsWith("#/")?route:`#/${route}`;}
function active(route=""){
  const value=String(route);
  if(value.includes("?")){
    const [targetPath,targetQuery]=value.split("?");const [currentPath,currentQuery=""]=hashBody().split("?");
    if(targetPath!==currentPath)return false;const expected=new URLSearchParams(targetQuery),actual=new URLSearchParams(currentQuery);
    return [...expected].every(([key,item])=>actual.get(key)===item);
  }
  return value.split("?")[0]===routeId();
}
function icon(name,className="sidebar-icon"){
  const node=document.createElement("span");node.className=`${className} miwa-semantic-icon`;node.dataset.icon=name||"apps";return node;
}
function linkFor(entry,className="sidebar-flat-link"){
  const link=document.createElement("a");link.className=className;link.href=href(entry.route);link.dataset.navRoute=entry.route;
  if(entry.sectionGapBefore)link.classList.add("has-section-gap");
  if(className==="sidebar-child-link")link.textContent=entry.label;else link.append(icon(entry.icon||"apps",className==="drawer-link"?"drawer-link__icon":"sidebar-icon"),Object.assign(document.createElement("span"),{textContent:entry.label}));
  if(active(entry.route))link.setAttribute("aria-current","page");return link;
}
function groupFor(entry){
  const group=document.createElement("div");group.className="sidebar-tree-group";
  const row=document.createElement("div");row.className="sidebar-tree-row";
  const toggle=document.createElement("button");toggle.type="button";toggle.className="sidebar-tree-toggle";toggle.dataset.sidebarTreeToggle=entry.id;toggle.setAttribute("aria-label",`展开或收起${entry.label}`);toggle.append(icon("chevronDown","sidebar-tree-toggle__icon"));
  row.append(toggle,linkFor(entry,"sidebar-tree-link"));group.append(row);
  const children=document.createElement("div");children.className="sidebar-tree-children";
  children.append(...entry.children.map(child=>linkFor(child,"sidebar-child-link")));group.append(children);
  const open=active(entry.route)||entry.children.some(child=>active(child.route));group.classList.toggle("is-expanded",open);children.hidden=!open;toggle.setAttribute("aria-expanded",String(open));return group;
}
function setExpanded(group,open){group.classList.toggle("is-expanded",open);group.querySelector(".sidebar-tree-children").hidden=!open;group.querySelector("[data-sidebar-tree-toggle]").setAttribute("aria-expanded",String(open));}
function renderQuickActions(context){
  const section=document.getElementById("sidebar-quick-actions"),host=document.getElementById("sidebar-quick-actions-list");if(!section||!host)return;
  const actions=(context.quickActions||[]).slice(0,3);section.hidden=!actions.length;host.replaceChildren(...actions.map(action=>{
    const node=action.route?document.createElement("a"):document.createElement("button");node.className="sidebar-quick-action";
    if(action.route)node.href=href(action.route);else{node.type="button";node.dataset.sidebarQuickAction=action.event||action.id;}
    node.append(icon(action.icon||"apps","sidebar-quick-action__icon"),Object.assign(document.createElement("span"),{textContent:action.label}));return node;
  }));
}
function renderSidebar(){
  const context=resolveSidebarContext(routeId(),hashBody(),getCurrentBusinessSpaceId());
  const shell=document.getElementById("sidebar-host");const host=document.getElementById("sidebar-navigation-tree");if(!shell||!host)return;
  shell.hidden=false;shell.style.removeProperty("display");
  const title=document.getElementById("sidebar-context-title");const kicker=document.getElementById("sidebar-context-kicker");const head=document.querySelector(".sidebar-context-head");
  if(head)head.hidden=false;if(title)title.textContent=context.title||"当前空间";if(kicker)kicker.textContent=context.kicker||"当前空间";
  const contextIcon=document.getElementById("sidebar-context-icon");if(contextIcon)contextIcon.dataset.icon=context.icon||"apps";
  host.replaceChildren(...context.items.map(item=>item.children?.length?groupFor(item):linkFor(item)));
  document.getElementById("sidebar-primary-action")?.setAttribute("hidden","");
  renderQuickActions(context);
  renderSemanticIcons(document);
}
function renderMobile(){
  const context=resolveSidebarContext(routeId(),hashBody(),getCurrentBusinessSpaceId());const host=document.getElementById("mobile-workbench-navigation-list");if(!host)return;
  const legacySwitcher=document.getElementById("mobile-drawer-business-switcher");if(legacySwitcher)legacySwitcher.hidden=true;
  const title=document.getElementById("mobile-business-title");if(title)title.textContent=context.title||"导航";
  const items=context.items.flatMap(item=>[item,...(item.children||[])]);host.replaceChildren(...items.map(item=>linkFor(item,"drawer-link")));renderSemanticIcons(document);
}
function bind(){
  const sidebar=document.querySelector("[data-universal-sidebar]");if(sidebar&&sidebar.dataset.bound!=="true"){
    sidebar.dataset.bound="true";sidebar.addEventListener("click",event=>{const toggle=event.target.closest("[data-sidebar-tree-toggle]");if(!toggle)return;event.preventDefault();const group=toggle.closest(".sidebar-tree-group");setExpanded(group,!group.classList.contains("is-expanded"));});
    sidebar.addEventListener("click",event=>{const quick=event.target.closest("[data-sidebar-quick-action]");if(!quick)return;const mainHost=document.getElementById("app-main-host");mainHost?.dispatchEvent(new CustomEvent("aione:sidebar-quick-action",{detail:{action:quick.dataset.sidebarQuickAction,route:routeId()}}));});
  }
  const drawer=document.getElementById("mobile-drawer"),backdrop=document.getElementById("drawer-backdrop");
  const close=()=>{drawer?.classList.remove("open");backdrop?.classList.remove("open");};
  document.getElementById("mobile-workbench-menu")?.addEventListener("click",()=>{drawer?.classList.add("open");backdrop?.classList.add("open");});
  document.getElementById("drawer-close")?.addEventListener("click",close);backdrop?.addEventListener("click",close);drawer?.addEventListener("click",e=>{if(e.target.closest("a"))close();});
}
function render(){renderSidebar();renderMobile();document.documentElement.dataset.sidebarArchitecture="home-registry-current-20260908";}
export function initPrimaryNavigation(){render();bind();window.addEventListener("aione:platform-context-change",render);window.addEventListener("hashchange",()=>{syncPlatformContextFromRoute({reason:"sidebar-route"});render();});return true;}
