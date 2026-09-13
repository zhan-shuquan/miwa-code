/* ========================================
   AIONE Universal Sidebar Registry｜CURRENT
   Header = 12之家切换
   Sidebar = 当前之家目录（章）
   Horizontal navigation = 当前目录章节 / View
======================================== */

import { ROUTE_REGISTRY } from "./route-registry.js";
import { HOME_REGISTRY } from "./home-registry.js";
import { MIWA_COMPANY_NAVIGATION } from "../data/miwa-company-content.js";
import { MIWA_BUSINESS_NAVIGATION, MIWA_BUSINESSES } from "../data/miwa-business-home-content.js";

const PLATFORM_CONTEXT_META = Object.freeze({
  company: { icon: "knowledge", type: "content" },
  work: { icon: "work", type: "content" },
  calendar: { icon: "calendar", type: "content" },
  "business-home": { icon: "apps", type: "content" },
  "channel-home": { icon: "store", type: "content" },
  "finance-home": { icon: "income", type: "content" },
  "relations-home": { icon: "customer", type: "content" },
  "product-home": { icon: "product", type: "content" },
  "category-home": { icon: "category", type: "content" },
  "talent-home": { icon: "talent", type: "content" },
  "ai-home": { icon: "ai", type: "content" },
  "ai-office": { icon: "ai", type: "content" },
  analysis: { icon: "analysis", type: "content" },
  "knowledge-home": { icon: "knowledge", type: "content" },
  "shared-home": { icon: "apps", type: "content" },
  "application-home": { icon: "apps", type: "tools" },
  notifications: { icon: "notification", type: "system" },
  settings: { icon: "settings", type: "system" },
  "platform-admin": { icon: "settings", type: "system" },
  "employee-profile": { icon: "people", type: "system" }
});

const TYPE_LABELS = Object.freeze({ content:"当前空间", tools:"当前空间", system:"当前系统" });

function getParentRoute(routeId){ return ROUTE_REGISTRY[routeId]?.parent || null; }

function resolvePlatformRoot(routeId){
  if(routeId === "category-home") return "product-home";
  if(routeId === "selection" || String(routeId).startsWith("selection-")) return "work";
  if(PLATFORM_CONTEXT_META[routeId]) return routeId;
  let cursor=routeId; const visited=new Set();
  while(cursor && !visited.has(cursor)){
    visited.add(cursor);
    const parent=getParentRoute(cursor);
    if(!parent) break;
    if(PLATFORM_CONTEXT_META[parent]) return parent;
    cursor=parent;
  }
  return routeId;
}

function childrenFor(parentId){
  return Object.values(ROUTE_REGISTRY).filter((route)=>route.parent===parentId&&route.nav!==false).map((route)=>({id:route.id,label:route.label,route:route.id,icon:""}));
}

function buildWorkItems(){
  const preferredBusinessIds=["crossborder","wholesale","study-abroad"];
  const businessChildren=preferredBusinessIds.map((id)=>MIWA_BUSINESSES.find((item)=>item.id===id)).filter(Boolean).map((item)=>({id:`work-business-${item.id}`,label:item.name,route:`work-business-${item.id}`,subtitle:`按${item.name}快速查看工作进展。`}));
  businessChildren.push({id:"work-business-more",label:"更多事业",route:"work-business-more",subtitle:"查看其他事业工作，仍然读取同一份Work Item。"});
  const myWorkChildren=[
    {id:"work-selection",label:"选品",route:"selection",subtitle:"商品机会、我的选品与选品推进。"}
  ];
  return [
    {id:"work-home",label:"工作概览",route:"work",icon:"work",children:[]},
    {id:"work-mine",label:"我的工作",route:"work-mine",icon:"work",children:myWorkChildren},
    {id:"work-assigned",label:"我安排的",route:"work-assigned",icon:"work",children:[]},
    {id:"work-batch",label:"批量安排工作",route:"work-batch",icon:"file",children:[]},
    {id:"work-following",label:"我的关注",route:"work-following",icon:"notification",children:[],sectionGapBefore:true},
    {id:"work-favorites",label:"我的收藏",route:"work?view=favorites",icon:"brand",children:[]},
    {id:"work-learning",label:"我的学习",route:"work?view=learning",icon:"knowledge",children:[]},
    {id:"work-suggestions",label:"我的建议",route:"work-suggestions",icon:"file",children:[]},
    {id:"work-innovations",label:"我的创新",route:"work-innovations",icon:"brand",children:[]},
    {id:"work-summaries",label:"我的总结",route:"work-summaries",icon:"knowledge",children:[]},
    {id:"work-all",label:"全部工作",route:"work-all",icon:"apps",children:[],sectionGapBefore:true},
    {id:"work-business-group",label:"事业工作",route:"work-business-crossborder",icon:"apps",children:businessChildren},
    {id:"work-team",label:"团队工作",route:"work-team",icon:"people",children:[]},
    {id:"work-records",label:"工作记录",route:"work-records",icon:"knowledge",children:[],sectionGapBefore:true}
  ];
}

function buildRegistryHomeItems(rootId){
  const definition=HOME_REGISTRY[rootId];
  if(!definition||definition.template==="personal-work-home") return null;
  const items=[];
  if(definition.overview?.enabled) items.push({id:`${rootId}-overview`,label:"概览",route:rootId,icon:PLATFORM_CONTEXT_META[rootId]?.icon||"apps",children:[]});
  definition.centers.forEach((item)=>items.push({id:item.id,label:item.label,route:item.route||`${rootId}?center=${encodeURIComponent(item.id)}`,icon:item.icon||"",children:[],sectionGapBefore:Boolean(item.sectionGapBefore)}));
  if(definition.management?.enabled) items.push({id:`${rootId}-management`,label:"管理",route:`${rootId}?view=management`,icon:"settings",children:[],sectionGapBefore:true});
  return items;
}

function buildPlatformItems(rootId){
  const root=ROUTE_REGISTRY[rootId];
  if(!root&&!HOME_REGISTRY[rootId]) return [];
  if(rootId==="company") return MIWA_COMPANY_NAVIGATION;
  if(rootId==="business-home") return MIWA_BUSINESS_NAVIGATION;
  if(rootId==="work") return buildWorkItems();
  const registryItems=buildRegistryHomeItems(rootId);
  if(registryItems&&HOME_REGISTRY[rootId]?.centers?.length) return registryItems;
  const children=childrenFor(rootId).map((item)=>rootId==="finance-home"&&item.id==="expense-home"?{...item,children:childrenFor(item.id)}:item);
  const homeLabel=children.length?"概览":(root?.label||HOME_REGISTRY[rootId]?.label||"概览");
  return [{id:`${rootId}-home`,label:homeLabel,route:rootId,icon:PLATFORM_CONTEXT_META[rootId]?.icon||"apps",children:[]},...children];
}

export function resolveSidebarContext(routeId){
  const rootId=resolvePlatformRoot(routeId);
  const root=ROUTE_REGISTRY[rootId]||ROUTE_REGISTRY[routeId];
  const homeDefinition=HOME_REGISTRY[rootId];
  const meta=PLATFORM_CONTEXT_META[rootId]||{icon:"apps",type:"content"};
  const publicationActions=(rootId==="company"||rootId==="business-home"||(rootId==="work"&&routeId==="work"))?[{id:"publication-print",label:"打印",icon:"file",event:"aione:publication:print"},{id:"publication-pdf",label:"导出PDF",icon:"file",event:"aione:publication:pdf"}]:[];
  return {type:meta.type,kicker:rootId==="work"?"我的工作空间":(TYPE_LABELS[meta.type]||"当前空间"),title:homeDefinition?.label||root?.label||"当前空间",icon:meta.icon,items:buildPlatformItems(rootId),activeWorkbenchId:routeId==="selection"?"work-mine":null,primaryAction:null,quickActions:publicationActions};
}
