/* ========================================
   Field Registry｜AIONE统一字段注册中心 V1
   一份字段语义，多处调用：页面、导入导出、AI、帮助、审计、未来数据库。
======================================== */
import { normalizeFieldDefinition, cloneFieldSchema, FIELD_SCHEMA_VERSION } from "../fields/field-standard.js";

const ROUTE_NAMESPACE = Object.freeze({
  "customer-home":"customer",
  "supplier-home":"supplier",
  "store-home":"store",
  "application-home":"application",
  "expense-home":"expense",
  "income-home":"income",
  "cash-expense":"cash_expense",
  "talent-home":"talent",
  "category-home":"category",
  "product-home":"product",
  "ai-home":"ai_capability",
  "ai-office":"ai_office",
  "shared-home":"shared_resource",
  work:"work",
  analysis:"analysis",
  company:"content",
  "knowledge-home":"content",
  selection:"selection_opportunity"
});

const KEY_DEFAULTS = Object.freeze({
  name:{dataType:"text",nineElement:"object",source:"manual",automation:"assisted",captureTiming:"对象建档时",db:{indexCandidate:true}},
  title:{dataType:"text",nineElement:"information",source:"manual",automation:"assisted",captureTiming:"内容建档时",db:{indexCandidate:true}},
  type:{dataType:"enum",nineElement:"information",source:"manual",automation:"assisted",captureTiming:"对象建档/分类时",db:{indexCandidate:true}},
  state:{dataType:"status",nineElement:"result",source:"mixed",automation:"mixed",captureTiming:"状态发生变化时",db:{indexCandidate:true}},
  status:{dataType:"status",nineElement:"result",source:"mixed",automation:"mixed",captureTiming:"状态发生变化时",db:{indexCandidate:true}},
  owner:{dataType:"person_ref",nineElement:"people",source:"manual",automation:"assisted",captureTiming:"责任确认时",db:{indexCandidate:true}},
  creator:{dataType:"person_ref",nineElement:"people",source:"system",automation:"automatic",captureTiming:"创建时",db:{indexCandidate:true}},
  payer:{dataType:"person_ref",nineElement:"people",source:"manual",automation:"assisted",captureTiming:"支付事实发生时",db:{indexCandidate:true}},
  role:{dataType:"text",nineElement:"people",source:"inherited",automation:"assisted",captureTiming:"任职关系生效时",db:{indexCandidate:true}},
  responsibility:{dataType:"long_text",nineElement:"matter",source:"manual",automation:"assisted",captureTiming:"岗位责任确认时"},
  result:{dataType:"long_text",nineElement:"result",source:"mixed",automation:"assisted",captureTiming:"形成阶段/最终结果时"},
  amount:{dataType:"money",nineElement:"money",source:"mixed",automation:"mixed",captureTiming:"金额事实发生时",unit:"JPY",currency:"JPY",db:{indexCandidate:true}},
  cost:{dataType:"money",nineElement:"money",source:"mixed",automation:"mixed",captureTiming:"成本事实形成时",unit:"JPY",currency:"JPY"},
  date:{dataType:"date",nineElement:"time",source:"mixed",automation:"mixed",captureTiming:"业务发生时",db:{indexCandidate:true}},
  dueDate:{dataType:"datetime",nineElement:"time",source:"manual",automation:"assisted",captureTiming:"工作截止时间确认时",db:{indexCandidate:true}},
  joinDate:{dataType:"date",nineElement:"time",source:"manual",automation:"assisted",captureTiming:"加入/任职确认时",db:{indexCandidate:true}},
  lastContact:{dataType:"datetime",nineElement:"time",source:"system",automation:"automatic",captureTiming:"联系事件发生时",db:{indexCandidate:true}},
  lastChange:{dataType:"datetime",nineElement:"time",source:"system",automation:"automatic",captureTiming:"变更发生时",db:{indexCandidate:true}},
  timeEvidence:{dataType:"duration",nineElement:"time",source:"calculated",automation:"derived",captureTiming:"工作证据产生后",unit:"seconds"},
  moneyStatus:{dataType:"status",nineElement:"money",source:"system",automation:"derived",captureTiming:"工作事项建立/金额事实变化时"},
  platform:{dataType:"text",nineElement:"platform",source:"inherited",automation:"assisted",captureTiming:"业务平台确认时",db:{indexCandidate:true}},
  workbench:{dataType:"object_ref",nineElement:"platform",source:"inherited",automation:"automatic",captureTiming:"工作事项建立时"},
  business:{dataType:"object_ref",nineElement:"platform",source:"inherited",automation:"assisted",captureTiming:"业务归属确认时",db:{indexCandidate:true}},
  relatedBusiness:{dataType:"object_ref",nineElement:"platform",source:"inherited",automation:"assisted",captureTiming:"应用与业务建立关联时"},
  businessObject:{dataType:"object_ref",nineElement:"object",source:"inherited",automation:"automatic",captureTiming:"工作事项建立时"},
  customer:{dataType:"object_ref",nineElement:"people",source:"inherited",automation:"assisted",captureTiming:"收入归属确认时"},
  counterparty:{dataType:"object_ref",nineElement:"people",source:"manual",automation:"assisted",captureTiming:"交易对象确认时"},
  category:{dataType:"object_ref",nineElement:"object",source:"inherited",automation:"assisted",captureTiming:"商品分类确认时",db:{indexCandidate:true}},
  brand:{dataType:"object_ref",nineElement:"object",source:"inherited",automation:"assisted",captureTiming:"品牌归属确认时"},
  sku:{dataType:"text",nineElement:"object",source:"manual",automation:"assisted",captureTiming:"SKU建立时",db:{indexCandidate:true}},
  opportunity:{dataType:"object_ref",nineElement:"matter",source:"inherited",automation:"automatic",captureTiming:"商机建立/关联时"},
  nextAction:{dataType:"long_text",nineElement:"matter",source:"mixed",automation:"assisted",captureTiming:"跟进判断后"},
  priority:{dataType:"enum",nineElement:"matter",source:"manual",automation:"assisted",captureTiming:"工作事项建立/调整时",db:{indexCandidate:true}},
  summary:{dataType:"long_text",nineElement:"information",source:"mixed",automation:"assisted",captureTiming:"对象/工作整理时",ui:{input:"textarea",rows:3,span:"full"}},
  evidence:{dataType:"file_ref",nineElement:"information",source:"mixed",automation:"assisted",captureTiming:"证据产生时"},
  source:{dataType:"text",nineElement:"information",source:"system",automation:"derived",captureTiming:"数据进入系统时"},
  url:{dataType:"url",nineElement:"information",source:"manual",automation:"assisted",captureTiming:"入口/来源确认时"},
  phone:{dataType:"phone",nineElement:"information",source:"manual",automation:"assisted",captureTiming:"联系方式确认时"},
  address:{dataType:"long_text",nineElement:"information",source:"manual",automation:"assisted",captureTiming:"地址确认时"},
  postalCode:{dataType:"text",nineElement:"information",source:"manual",automation:"assisted",captureTiming:"地址确认时"},
  region:{dataType:"text",nineElement:"information",source:"manual",automation:"assisted",captureTiming:"客户建档时"},
  recipient:{dataType:"text",nineElement:"people",source:"manual",automation:"assisted",captureTiming:"收件信息确认时"},
  purpose:{dataType:"long_text",nineElement:"goal",source:"manual",automation:"assisted",captureTiming:"应用建档时"},
  scope:{dataType:"long_text",nineElement:"goal",source:"manual",automation:"assisted",captureTiming:"适用/责任范围确认时"},
  version:{dataType:"text",nineElement:"information",source:"system",automation:"mixed",captureTiming:"版本形成时"},
  location:{dataType:"text",nineElement:"platform",source:"manual",automation:"assisted",captureTiming:"位置/工作地点确认时"},
  level:{dataType:"text",nineElement:"information",source:"manual",automation:"assisted",captureTiming:"层级确认时"},
  grade:{dataType:"text",nineElement:"people",source:"manual",automation:"assisted",captureTiming:"职级确认/变更时"},
  accountStatus:{dataType:"status",nineElement:"result",source:"mixed",automation:"assisted",captureTiming:"账号状态变化时"},
  connectionStatus:{dataType:"status",nineElement:"platform",source:"api",automation:"automatic",captureTiming:"连接状态变化时"}
});

function merge(base = {}, override = {}) {
  const result = { ...base, ...override };
  if (base.db || override.db) result.db = { ...(base.db || {}), ...(override.db || {}) };
  if (base.ui || override.ui) result.ui = { ...(base.ui || {}), ...(override.ui || {}) };
  if (base.permission || override.permission) result.permission = { ...(base.permission || {}), ...(override.permission || {}) };
  if (base.routes || override.routes) result.routes = { ...(base.routes || {}), ...(override.routes || {}) };
  if (base.validation || override.validation) result.validation = { ...(base.validation || {}), ...(override.validation || {}) };
  return result;
}
function ns(routeId) { return ROUTE_NAMESPACE[routeId] || String(routeId || "object").replace(/-home$/," ").trim().replaceAll("-","_"); }
function f(routeId, key, label, override = {}) {
  const base = KEY_DEFAULTS[key] || {};
  return normalizeFieldDefinition(merge(base, { ...override, key, label, fieldCode:override.fieldCode || `${ns(routeId)}.${override.code || key}` }), { objectName:override.objectName || ns(routeId) });
}
function sys(routeId, key, label, override = {}) {
  const systemDefaults = { source:"system", automation:"automatic", history:"changes", permission:{read:"internal_open",write:"system_only",sensitivity:"normal"}, nineElement:key.includes("At")?"time":key.includes("By")?"people":"information" };
  return f(routeId, key, label, merge(systemDefaults, override));
}

const SCHEMAS = Object.freeze({
  "customer-home": Object.freeze([
    f("customer-home","name","客户名称",{required:true,primary:true,definition:"客户的正式名称或主要识别名称。",importAliases:["客户名称","客户名"]}),
    f("customer-home","type","客户类型",{required:true,dictionary:true,dictionaryKey:"customerTypes",definition:"客户在美和业务体系中的分类。",importAliases:["客户类型"]}),
    f("customer-home","region","国家/地区"), f("customer-home","owner","负责人"), f("customer-home","state","当前状态"),
    f("customer-home","lastContact","最近联系"), f("customer-home","amount","累计交易",{definition:"与该客户关联并已确认的累计交易金额；最终口径由业务与财务规则锁定。"}),
    f("customer-home","opportunity","当前商机"), f("customer-home","nextAction","下一步"), f("customer-home","recipient","收件人"),
    f("customer-home","postalCode","邮编"), f("customer-home","address","地址/面单资料"), f("customer-home","phone","联系电话")
  ]),
  "supplier-home": Object.freeze([
    f("supplier-home","name","供应商名称",{required:true,primary:true,definition:"供应商的正式名称或主要识别名称。"}),
    f("supplier-home","type","供应商类型",{required:true,dictionary:true,dictionaryKey:"supplierTypes"}),
    f("supplier-home","region","国家/地区"), f("supplier-home","owner","负责人"), f("supplier-home","state","合作状态"),
    f("supplier-home","contact","联系人"), f("supplier-home","phone","联系电话"), f("supplier-home","scope","供应范围"),
    f("supplier-home","leadTime","交期"), f("supplier-home","quality","质量表现"), f("supplier-home","cost","成本/报价"),
    f("supplier-home","result","合作结果/评价")
  ]),
  "store-home": Object.freeze([
    f("store-home","name","店铺名称",{required:true,primary:true}), f("store-home","type","店铺类型",{required:true,dictionary:true,dictionaryKey:"storeTypes"}),
    f("store-home","platform","平台"), f("store-home","owner","负责人"), f("store-home","state","经营状态"),
    f("store-home","accountStatus","账号状态"), f("store-home","connectionStatus","连接状态"), f("store-home","url","店铺入口"), f("store-home","lastChange","最近变更")
  ]),
  "application-home": Object.freeze([
    f("application-home","name","应用名称",{required:true,primary:true}), f("application-home","type","应用类型",{required:true,dictionary:true,dictionaryKey:"applicationTypes"}),
    f("application-home","purpose","主要用途"), f("application-home","owner","负责人"), f("application-home","state","当前状态"),
    f("application-home","accountStatus","账号状态"), f("application-home","connectionStatus","连接/API"), f("application-home","relatedBusiness","关联业务"),
    f("application-home","cost","费用"), f("application-home","url","应用入口")
  ]),
  "expense-home": Object.freeze([
    f("expense-home","name","支出事项",{required:true,primary:true,nineElement:"matter"}), f("expense-home","type","支出类型",{required:true,dictionary:true,dictionaryKey:"expenseTypes"}),
    f("expense-home","amount","金额",{required:true}), f("expense-home","date","发生时间"), f("expense-home","business","事业/项目"),
    f("expense-home","counterparty","支付对象"), f("expense-home","owner","负责人"), f("expense-home","source","数据来源"),
    f("expense-home","state","确认状态"), f("expense-home","evidence","凭证/证据")
  ]),
  "income-home": Object.freeze([
    f("income-home","name","收入事项",{required:true,primary:true,nineElement:"matter"}), f("income-home","type","收入类型",{required:true,dictionary:true,dictionaryKey:"incomeTypes"}),
    f("income-home","amount","金额",{required:true}), f("income-home","date","发生时间"), f("income-home","business","事业/项目"),
    f("income-home","customer","客户/平台"), f("income-home","owner","负责人"), f("income-home","source","数据来源"), f("income-home","state","确认状态")
  ]),
  "cash-expense": Object.freeze([
    f("cash-expense","name","支出事项",{required:true,primary:true,nineElement:"matter"}), f("cash-expense","type","数据来源",{required:true,dictionary:true,dictionaryKey:"cashExpenseSources"}),
    f("cash-expense","amount","金额",{required:true}), f("cash-expense","date","发生时间"), f("cash-expense","business","事业/项目"),
    f("cash-expense","payer","支付人"), f("cash-expense","counterparty","支付对象"), f("cash-expense","state","确认状态"), f("cash-expense","evidence","凭证")
  ]),
  work: Object.freeze([
    f("work","name","工作事项",{required:true,primary:true,nineElement:"matter"}), f("work","type","工作类型",{required:true,dictionary:true,dictionaryKey:"workTypes"}),
    f("work","owner","负责人"), f("work","creator","创建人"), f("work","state","状态"), f("work","priority","优先级",{dictionary:true,dictionaryKey:"workPriorities"}),
    f("work","dueDate","截止时间"), f("work","workbench","关联工作台"), f("work","businessObject","关联业务对象"),
    f("work","timeEvidence","有效工作时间",{definition:"后台工作证据层计算的有效工作时间；不是简单页面停留时间。"}),
    f("work","moneyStatus","钱",{definition:"该工作是否涉及金额事实：有金额 / 待确认 / 不涉及。",dictionary:true,dictionaryKey:"moneyFactStatus"}),
    f("work","result","结果"), f("work","summary","说明")
  ]),
  analysis: Object.freeze([
    f("analysis","name","分析名称",{required:true,primary:true,nineElement:"matter"}), f("analysis","type","分析类型",{required:true,dictionary:true,dictionaryKey:"analysisTypes"}),
    f("analysis","owner","负责人"), f("analysis","state","状态"), f("analysis","result","分析结果")
  ]),
  "talent-home": Object.freeze([
    f("talent-home","name","姓名",{required:true,primary:true,nineElement:"people",definition:"人才对象的正式姓名；person_id为未来数据库稳定身份键。"}),
    f("talent-home","type","人才类型",{required:true,dictionary:true,dictionaryKey:"talentTypes"}), f("talent-home","role","岗位/角色"),
    f("talent-home","owner","直属负责人"), f("talent-home","state","当前状态"), f("talent-home","grade","职级"),
    f("talent-home","location","工作地点"), f("talent-home","joinDate","加入时间"), f("talent-home","responsibility","主要职责"), f("talent-home","result","当前结果/贡献")
  ]),
  "category-home": Object.freeze([
    f("category-home","name","分类名称",{required:true,primary:true}), f("category-home","type","分类类型",{required:true,dictionary:true,dictionaryKey:"categoryTypes"}),
    f("category-home","level","层级"), f("category-home","owner","负责人"), f("category-home","state","状态"), f("category-home","scope","适用范围"), f("category-home","result","经营结果")
  ]),
  "product-home": Object.freeze([
    f("product-home","name","商品名称",{required:true,primary:true}), f("product-home","type","商品类型",{required:true,dictionary:true,dictionaryKey:"productTypes"}),
    f("product-home","category","分类"), f("product-home","brand","品牌"), f("product-home","sku","SKU/规格"), f("product-home","owner","负责人"), f("product-home","state","状态"), f("product-home","result","经营结果")
  ]),
  "ai-office": Object.freeze([
    f("ai-office","name","AI办公室名称",{required:true,primary:true,nineElement:"platform"}), f("ai-office","type","AI办公室类型",{required:true,dictionary:true,dictionaryKey:"aiOfficeTypes"}),
    f("ai-office","humanOwnerRole","人类最终负责人岗位",{dataType:"text",nineElement:"people",source:"inherited",automation:"automatic"}),
    f("ai-office","aiSecretary","AI秘书",{dataType:"object_ref",nineElement:"people",source:"system",automation:"automatic"}),
    f("ai-office","scope","责任域",{nineElement:"goal"}), f("ai-office","state","验证状态"),
    f("ai-office","aiPositions","预设AI岗位",{dataType:"long_text",nineElement:"people",source:"system",automation:"assisted"}),
    f("ai-office","result","当前验证结果")
  ]),
  "ai-home": Object.freeze([
    f("ai-home","name","能力名称",{required:true,primary:true,nineElement:"object"}), f("ai-home","type","AI能力类型",{required:true,dictionary:true,dictionaryKey:"aiCapabilityTypes"}),
    f("ai-home","owner","人类负责人"), f("ai-home","scope","责任域"), f("ai-home","state","验证状态"), f("ai-home","version","版本"), f("ai-home","evidence","真实证据"), f("ai-home","result","业务结果")
  ]),
  "shared-home": Object.freeze([
    f("shared-home","name","入口名称",{required:true,primary:true}),
    f("shared-home","type","产品形态",{required:true,dictionary:true,dictionaryKey:"sharedResourceTypes",definition:"应用、工具、知识、代码、数据、模板、连接、服务或其他；产品形态不是资源归属。"}),
    f("shared-home","origin","来源属性",{definition:"内部或外部仅作为后台管理属性，不强制在前台快捷页展示。"}),
    f("shared-home","owner","负责人"), f("shared-home","state","状态"),
    f("shared-home","location","正式来源/位置"), f("shared-home","url","打开入口"),
    f("shared-home","usageFrequency","使用频率"), f("shared-home","quickAccess","Header快捷入口"),
    f("shared-home","headerHidden","Header隐藏",{definition:"入口仍保留在统一注册数据中，但可从Header第2行隐藏。"}),
    f("shared-home","quickGroup","快捷分组",{definition:"仅用于Header第2行自动排序与分隔，不在前台显示分组标题。"}),
    f("shared-home","result","用途/结果")
  ]),
  content: Object.freeze([
    f("company","title","标题",{required:true,primary:true,fieldCode:"content.title",definition:"正式内容对象的标题。",importAliases:["标题"]}),
    f("company","type","类型",{required:true,dictionary:true,fieldCode:"content.type",dictionaryKey:"dynamicContentTypes",importAliases:["类型"]}),
    f("company","status","状态",{dataType:"status",fieldCode:"content.status",dictionary:true,dictionaryKey:"contentLifecycle",importAliases:["状态"]}),
    f("company","version","版本",{fieldCode:"content.version",importAliases:["版本"]}), f("company","owner","负责人",{fieldCode:"content.owner",importAliases:["负责人"]}),
    f("company","summary","摘要",{fieldCode:"content.summary",importAliases:["摘要"],ui:{input:"textarea",rows:3,span:"full"}}),
    f("company","linkType","链接类型",{fieldCode:"content.link_type",dataType:"enum",nineElement:"information",dictionary:true,dictionaryKey:"contentLinkTypes",importAliases:["链接类型"]}),
    f("company","url","外部链接",{fieldCode:"content.url",importAliases:["链接","外部链接"]}),
    f("company","body","正文 / 草稿",{fieldCode:"content.body",dataType:"long_text",nineElement:"information",source:"manual",automation:"assisted",ui:{input:"textarea",rows:8,span:"full"}})
  ]),
  selection: Object.freeze([
    f("selection","id","商品机会ID",{fieldCode:"selection_opportunity.id",dataType:"text",nineElement:"object",source:"system",automation:"automatic",primary:true,db:{uniqueCandidate:true,indexCandidate:true}}),
    f("selection","name","商品名称",{required:true,fieldCode:"selection_opportunity.product_name",importAliases:["商品名称"],storageKey:"selection-record-name"}),
    f("selection","type","选品类型",{required:true,fieldCode:"selection_opportunity.selection_type",dictionary:true,dictionaryKey:"selectionTypes"}),
    f("selection","owner","选品负责人",{fieldCode:"selection_opportunity.owner_person",nineElement:"people"}),
    f("selection","stageName","当前事项",{fieldCode:"selection_opportunity.current_stage",dataType:"status",nineElement:"matter",source:"system",automation:"derived",db:{indexCandidate:true}}),
    f("selection","platforms","销售平台",{fieldCode:"selection_opportunity.sales_platforms",dataType:"multi_enum",nineElement:"platform",source:"manual",automation:"assisted"}),
    f("selection","time","选品时间",{fieldCode:"selection_opportunity.selected_at",dataType:"datetime",nineElement:"time",source:"system",automation:"automatic",db:{indexCandidate:true}}),
    f("selection","cost","投入成本",{fieldCode:"selection_opportunity.investment_cost",definition:"当前商品机会在选品/验证阶段已经发生并可归属的投入成本。"}),
    f("selection","info","信息状态",{fieldCode:"selection_opportunity.information_status",dataType:"long_text",nineElement:"information",source:"system",automation:"mixed"}),
    f("selection","result","结果",{fieldCode:"selection_opportunity.decision_result",dataType:"status",nineElement:"result",source:"mixed",automation:"mixed",db:{indexCandidate:true}}),
    f("selection","rule","判断依据",{fieldCode:"selection_opportunity.decision_reason",dataType:"long_text",nineElement:"information",source:"mixed",automation:"assisted"}),
    f("selection","source","采购来源",{fieldCode:"selection_opportunity.source_platform",nineElement:"information",source:"system",automation:"derived"}),
    f("selection","sourceUrl","采购来源链接",{fieldCode:"selection_opportunity.source_url",dataType:"url",nineElement:"information",source:"manual",automation:"assisted",importAliases:["采购来源链接","采购来源网址"],storageKey:"selection-record-source"}),
    f("selection","representativeImage","选品代表图",{fieldCode:"selection_opportunity.representative_image",dataType:"image_ref",nineElement:"object",source:"manual",automation:"assisted",importAliases:["选品代表图链接"]}),
    f("selection","elements","美和9要素完整度",{fieldCode:"selection_opportunity.nine_elements_status",dataType:"status",nineElement:"information",source:"system",automation:"derived"}),
    f("selection","purchaseUnitPrice","采购单价",{fieldCode:"selection_opportunity.purchase_unit_price",dataType:"money",nineElement:"money",currency:null,unit:null,source:"manual",automation:"assisted",storageKey:"pricing-purchase-unit",importAliases:["采购单价"]}),
    f("selection","purchaseCurrency","采购币种",{fieldCode:"selection_opportunity.purchase_currency",dataType:"enum",nineElement:"money",source:"manual",automation:"assisted",storageKey:"pricing-currency",importAliases:["采购币种"]}),
    f("selection","unitsPerSale","销售套装数量",{fieldCode:"selection_opportunity.units_per_sale",dataType:"number",nineElement:"object",source:"manual",automation:"assisted",storageKey:"pricing-units-per-sale",importAliases:["销售套装数量"]}),
    f("selection","quantityUnit","数量单位",{fieldCode:"selection_opportunity.quantity_unit",dataType:"text",nineElement:"object",source:"manual",automation:"assisted",storageKey:"pricing-quantity-unit",importAliases:["数量单位"]}),
    f("selection","unitGrossWeightG","单个预估毛重(g)",{fieldCode:"selection_opportunity.unit_gross_weight_g",dataType:"number",nineElement:"object",unit:"g",source:"manual",automation:"assisted",storageKey:"pricing-unit-weight",importAliases:["单个预估毛重_g"]}),
    f("selection","shipLengthCm","销售套装发货长(cm)",{fieldCode:"selection_opportunity.shipping_length_cm",dataType:"number",nineElement:"object",unit:"cm",source:"manual",automation:"assisted",storageKey:"pricing-shipping-length",importAliases:["销售套装发货长_cm"]}),
    f("selection","shipWidthCm","销售套装发货宽(cm)",{fieldCode:"selection_opportunity.shipping_width_cm",dataType:"number",nineElement:"object",unit:"cm",source:"manual",automation:"assisted",storageKey:"pricing-shipping-width",importAliases:["销售套装发货宽_cm"]}),
    f("selection","shipHeightCm","销售套装发货厚(cm)",{fieldCode:"selection_opportunity.shipping_height_cm",dataType:"number",nineElement:"object",unit:"cm",source:"manual",automation:"assisted",storageKey:"pricing-shipping-height",importAliases:["销售套装发货厚_cm"]}),
    f("selection","deliveryTier","确认配送档位",{fieldCode:"selection_opportunity.confirmed_delivery_tier",dataType:"enum",nineElement:"platform",source:"manual",automation:"assisted",storageKey:"selection-confirmed-delivery-tier"})
  ])
});

function routeSchemaKey(routeId) {
  if (routeId === "company" || routeId === "knowledge-home") return "content";
  return routeId;
}
export function getFieldSchema(routeId) {
  return cloneFieldSchema(SCHEMAS[routeSchemaKey(routeId)] || []);
}
export function getFieldByKey(routeId, key) {
  return getFieldSchema(routeId).find((field) => field.key === key) || null;
}
export function getFieldByCode(fieldCode) {
  for (const schema of Object.values(SCHEMAS)) {
    const field = schema.find((item) => item.fieldCode === fieldCode);
    if (field) return JSON.parse(JSON.stringify(field));
  }
  return null;
}
export function getSystemFieldSchema(routeId) {
  const namespace = ns(routeId);
  const fields = [
    sys(routeId,"createdAt","创建时间",{fieldCode:`${namespace}.created_at`,dataType:"datetime",nineElement:"time"}),
    sys(routeId,"updatedAt","更新时间",{fieldCode:`${namespace}.updated_at`,dataType:"datetime",nineElement:"time",db:{indexCandidate:true}}),
    sys(routeId,"createdBy","创建人",{fieldCode:`${namespace}.created_by`,dataType:"person_ref",nineElement:"people",db:{indexCandidate:true}}),
    sys(routeId,"updatedBy","更新人",{fieldCode:`${namespace}.updated_by`,dataType:"person_ref",nineElement:"people"}),
    sys(routeId,"recordVersion","记录版本",{fieldCode:`${namespace}.record_version`,dataType:"integer",nineElement:"information",db:{nullable:false}}),
    sys(routeId,"sourceSystem","来源系统",{fieldCode:`${namespace}.source_system`,dataType:"text",nineElement:"platform",db:{indexCandidate:true}}),
    sys(routeId,"archivedAt","归档时间",{fieldCode:`${namespace}.archived_at`,dataType:"datetime",nineElement:"time"})
  ];
  if (routeId !== "selection") fields.unshift(sys(routeId,"id","记录ID",{fieldCode:`${namespace}.id`,dataType:"text",nineElement:"object",db:{nullable:false,uniqueCandidate:true,indexCandidate:true}}));
  return fields;
}
export function getSelectionRecordInputSchema() {
  const keys = ["name","sourceUrl","purchaseUnitPrice","purchaseCurrency","unitsPerSale","quantityUnit","unitGrossWeightG","shipLengthCm","shipWidthCm","shipHeightCm","deliveryTier","representativeImage"];
  return getFieldSchema("selection").filter((field) => keys.includes(field.key));
}
export function getFieldCatalogSnapshot() {
  const schemas = {};
  Object.keys(ROUTE_NAMESPACE).forEach((routeId) => { schemas[routeId] = { businessFields:getFieldSchema(routeId), systemFields:getSystemFieldSchema(routeId) }; });
  return { schemaVersion:FIELD_SCHEMA_VERSION, generatedAt:new Date().toISOString(), principle:"一份字段语义，多处调用；默认内部开放读取，敏感字段例外。", schemas };
}
export const FIELD_REGISTRY_SCHEMA_KEYS = Object.freeze(Object.keys(SCHEMAS));
