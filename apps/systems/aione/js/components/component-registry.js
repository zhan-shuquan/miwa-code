/* AIONE Component Registry｜标准组件唯一清单 */
export const COMPONENT_REGISTRY=Object.freeze({
  pageHeader:{id:"page-header",requiredBy:["standard-business","content"]},
  workspacePage:{id:"aione-workspace-page",foundation:true,visualPolicy:"neutral-first"},
  overviewPage:{id:"aione-overview-page",foundation:true,visualPolicy:"neutral-first"},
  aioneTabs:{id:"aione-tabs",foundation:true,usage:"同一对象／同一页面结构的类型、来源、互动视图切换"},
  aioneCard:{id:"aione-card",foundation:true},
  aioneButton:{id:"aione-button",foundation:true},
  aioneStatus:{id:"aione-status",foundation:true},
  aioneKpi:{id:"aione-kpi",foundation:true},
  horizontalRail:{id:"horizontal-rail"},
  typeRail:{id:"type-rail"},
  flow:{id:"flow"},
  coreMetrics:{id:"core-metrics"},
  universalWorkspace:{id:"universal-workspace",requiredBy:["standard-business","content"]},
  objectPresenter:{id:"object-presenter"},
  miwaNineElements:{id:"miwa-nine-elements",requiredBy:["standard-business","content"],fixedOrder:["目标","人","物","事","平台","时间","钱","信息","结果"]},
  contextualAside:{id:"contextual-aside",platform:true}
});
export function getComponentDefinition(id){return Object.values(COMPONENT_REGISTRY).find((item)=>item.id===id)||null}
