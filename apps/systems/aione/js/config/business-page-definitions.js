import { EXTRA_BUSINESS_PAGE_DEFINITIONS } from "./business-page-definitions-extra.js";
import { systemConfig } from "./system-config.js";
import { MIWA_NINE_ELEMENTS } from "./miwa-nine-elements.js";
import { getFieldSchema, getSystemFieldSchema } from "./field-registry.js";

/* ========================================
   AIONE Business Page Definitions｜美和二级业务页面配置
   结构由统一母版负责；此文件只描述真实业务差异。
======================================== */




function makeStoreSeedObjects() {
  const items = Array.isArray(systemConfig.header?.sharedResources?.items)
    ? systemConfig.header.sharedResources.items.filter((item) => item.quickGroup === "stores")
    : [];
  return items.map((item) => ({
    id: `STORE-${item.id}`, name: item.name, type: "跨境电商店铺", platform: "楽天",
    owner: item.owner || "待确认", state: item.status === "active" ? "正常运营" : "待确认", accountStatus: "待确认",
    connectionStatus: "待确认", url: item.url || "", lastChange: "待确认"
  }));
}

function makeApplicationSeedObjects() {
  const items = Array.isArray(systemConfig.header?.sharedResources?.items)
    ? systemConfig.header.sharedResources.items.filter((item) => ["应用", "工具", "服务"].includes(item.productForm))
    : [];
  return items.map((item) => ({
    id: `APP-${item.id}`, name: item.name, type: item.productForm === "工具" ? "其他应用" : item.productForm === "服务" ? "采购/购物平台" : "业务系统",
    purpose: item.subtitle || "快捷入口", owner: item.owner || "待确认", state: item.status === "active" ? "在用" : "待确认",
    accountStatus: "待确认", connectionStatus: item.origin === "外部" ? "外部" : "内部", relatedBusiness: item.quickGroup || "集团共用", cost: 0,
    url: item.url || (item.route ? `#/${item.route}` : "")
  }));
}

const commonObjectToolbar = Object.freeze({
  search: true,
  filter: true,
  import: true,
  export: true,
  card: true,
  list: true
});

export const BUSINESS_PAGE_DEFINITIONS = Object.freeze({
  "customer-home": {
    routeId: "customer-home",
    title: "客户中心",
    icon: "客",
    description: "作为往来之家下的客户中心，统一管理客户资料、分类、关系、商机、交易与持续维护。",
    overviewLabel: "客户概览",
    createLabel: "新建客户",
    objectName: "客户",
    objectPlural: "客户资料",
    typeDictionaryKey: "customerTypes",
    typeDescriptions: {
      "批发客户": "面向日本批发、企业采购与长期交易关系的客户。",
      "电商客户": "来自店铺、平台及售后服务场景的客户。",
      "美和留学客户": "留学咨询、申请与后续服务相关客户。",
      "物流客户": "物流服务、仓配及相关合作客户。",
      "不动产客户": "租赁、买卖、管理与投资顾问相关客户。",
      "商务咨询客户": "经营、系统、AI与知识服务相关客户。"
    },
    flow: {
      status: "locked",
      label: "已确认流程",
      steps: ["发现客户", "建立客户资料", "客户分类", "建立联系", "形成商机", "商谈/报价", "成交/未成交", "交易履约", "持续维护", "复购/沉睡/流失"]
    },
    metrics: [
      { key: "total", label: "客户总数", source: "objects" },
      { key: "potential", label: "潜在客户", state: "潜在客户" },
      { key: "negotiating", label: "商谈中", state: "商谈中" },
      { key: "active", label: "活跃客户", state: "活跃客户" },
      { key: "followup", label: "待跟进", state: "待跟进" },
      { key: "amount", label: "累计交易", sum: "amount", format: "money" }
    ],
    toolbar: commonObjectToolbar,
    fieldSchemaId: "customer-home",
    cardFields: ["region", "owner", "lastContact", "amount", "opportunity", "nextAction"],
    listFields: ["name", "type", "region", "owner", "state", "lastContact", "amount", "nextAction"],
    specialActions: [
      { key: "customer-a4", label: "A4客户档案", kind: "print-a4" },
      { key: "shipping-label", label: "面单资料", kind: "export-label" }
    ],
    auxiliary: [
      { title: "待跟进客户", text: "用于提示超过跟进期限、重要商机或近期需要联系的客户。" },
      { title: "地址与面单", text: "客户地址一次维护，可用于订单、物流、面单与A4客户档案。" },
      { title: "客户档案PDF", text: "单个客户可按统一A4规格导出正式客户资料。" }
    ],
    ai: {
      title: "AI秘书｜客户辅助",
      text: "可协助整理客户资料、识别待跟进事项、形成客户摘要并检查档案完整性。"
    },
    seedObjects: []
  },

  "store-home": {
    routeId: "store-home",
    title: "店铺中心",
    icon: "店",
    description: "作为渠道之家下的店铺中心，统一管理美和各店铺的资料、账号、平台连接、经营状态与常用入口。",
    overviewLabel: "店铺概览",
    createLabel: "新建店铺",
    objectName: "店铺",
    objectPlural: "店铺资料",
    typeDictionaryKey: "storeTypes",
    typeDescriptions: {
      "跨境电商店铺": "当前实际运营的跨境电商店铺。",
      "实体/线下店铺": "线下门店及实体经营渠道，按真实业务启用。",
      "其他事业店铺": "未来事业出现真实店铺对象时按需增加。"
    },
    flow: {
      status: "validating",
      label: "验证中",
      steps: ["店铺建档", "账号与权限", "平台连接", "运营配置", "日常运营", "异常/变更", "停用/归档"]
    },
    metrics: [
      { key: "total", label: "店铺总数", source: "objects" },
      { key: "active", label: "正常运营", state: "正常运营" },
      { key: "exceptions", label: "待处理异常", state: "异常" },
      { key: "account", label: "账号待确认", state: "账号待确认" },
      { key: "connection", label: "连接异常", state: "连接异常" },
      { key: "changes", label: "本月变更", value: "待真实数据" }
    ],
    toolbar: commonObjectToolbar,
    fieldSchemaId: "store-home",
    cardFields: ["platform", "owner", "accountStatus", "connectionStatus", "lastChange"],
    listFields: ["name", "type", "platform", "owner", "state", "accountStatus", "connectionStatus", "lastChange"],
    auxiliary: [
      { title: "账号与权限提醒", text: "缺失账号、负责人变化或权限待确认时集中提示。" },
      { title: "平台连接状态", text: "订单、库存、发布等连接状态只在有价值时显示。" },
      { title: "店铺变更记录", text: "名称、负责人、平台、账号和经营状态变化自动形成记录。" }
    ],
    ai: {
      title: "AI秘书｜店铺辅助",
      text: "可协助维护店铺档案、检查账号与链接完整性、汇总异常和变更。"
    },
    seedObjects: makeStoreSeedObjects()
  },

  "application-home": {
    routeId: "application-home",
    title: "应用资源",
    icon: "应",
    description: "统一管理美和使用的软件、系统、平台、数字工具及其账号、权限、连接、费用和业务关联。",
    overviewLabel: "应用概览",
    createLabel: "新建应用",
    objectName: "应用",
    objectPlural: "应用资料",
    typeDictionaryKey: "applicationTypes",
    typeDescriptions: {
      "业务系统": "订单、库存、发布、ERP等正式业务执行系统。",
      "物流应用": "面单、配送、物流执行及相关账号权限。",
      "办公协作": "AI、文档、协作与日常办公应用。",
      "云盘/文件": "Google Drive等云端文件与资料管理应用。",
      "采购/购物平台": "采购、购物及外部交易平台。",
      "邮箱/通讯": "邮箱、通讯与外部联系应用。",
      "其他应用": "未来财务、人事、设计、AI服务等应用。"
    },
    flow: {
      status: "validating",
      label: "验证中",
      steps: ["应用建档", "账号与权限", "接入与配置", "正常使用", "维护与变更", "异常处理", "停用/归档"]
    },
    metrics: [
      { key: "total", label: "应用总数", source: "objects" },
      { key: "active", label: "正常使用", state: "在用" },
      { key: "account", label: "账号待确认", state: "账号待确认" },
      { key: "permission", label: "权限异常", state: "权限异常" },
      { key: "connection", label: "连接异常", state: "连接异常" },
      { key: "cost", label: "费用待确认", state: "费用待确认" }
    ],
    toolbar: commonObjectToolbar,
    fieldSchemaId: "application-home",
    cardFields: ["purpose", "owner", "accountStatus", "connectionStatus", "cost", "relatedBusiness"],
    listFields: ["name", "type", "purpose", "owner", "state", "accountStatus", "connectionStatus", "cost"],
    auxiliary: [
      { title: "账号与权限提醒", text: "共享账号风险、权限过期、人员离职后权限未收回等集中提示。" },
      { title: "连接/API状态", text: "Connector、API及其他数据连接异常集中显示。" },
      { title: "费用与合同提醒", text: "订阅续费、合同到期和长期不用但仍付费的应用集中检查。" }
    ],
    ai: {
      title: "AI秘书｜应用辅助",
      text: "可协助维护应用档案、检查账号权限与链接、识别重复订阅并整理应用变更。"
    },
    seedObjects: makeApplicationSeedObjects()
  },

  "expense-home": {
    routeId: "expense-home",
    title: "支出中心",
    icon: "支",
    description: "作为财务之家下的支出中心，统一汇总美和集团所有可统计支出；业务产生的数据自动归集，没有来源的数据再补录。",
    overviewLabel: "支出概览",
    createLabel: "新建支出",
    objectName: "支出",
    objectPlural: "支出记录",
    typeDictionaryKey: "expenseTypes",
    typeDescriptions: {
      "固定支出": "房租、水电、宽带等周期性集团经营支出。",
      "经营支出": "日常经营产生、但不属于专项成本的支出。",
      "采购成本": "采购工作台及供应链产生的采购支出。",
      "物流费用": "物流、配送、面单等相关费用。",
      "人员费用": "工资、外包、人事相关支出。",
      "应用费用": "软件订阅、系统和数字服务费用。",
      "广告费用": "广告、推广和营销投入。",
      "现金支出": "现金、Money软件或其他离线来源汇入的支出。"
    },
    flow: {
      status: "validating",
      label: "验证中",
      steps: ["业务发生", "自动/导入/手工记录", "美和9要素补全", "分类归属", "凭证/证据", "确认", "统一汇总", "AI分析"]
    },
    metrics: [
      { key: "month", label: "本月支出", sum: "amount", format: "money" },
      { key: "fixed", label: "固定支出", type: "固定支出", sum: "amount", format: "money" },
      { key: "business", label: "经营支出", type: "经营支出", sum: "amount", format: "money" },
      { key: "cash", label: "现金支出", type: "现金支出", sum: "amount", format: "money" },
      { key: "pending", label: "待确认", state: "待确认" },
      { key: "abnormal", label: "异常支出", state: "异常" }
    ],
    toolbar: commonObjectToolbar,
    fieldSchemaId: "expense-home",
    cardFields: ["amount", "date", "business", "counterparty", "owner", "source"],
    listFields: ["name", "type", "amount", "date", "business", "counterparty", "owner", "state"],
    auxiliary: [
      { title: "异常增长", text: "AI按历史基线识别突增、重复或异常支出。" },
      { title: "待归属支出", text: "没有事业、对象或业务来源的支出进入待确认。" },
      { title: "现金支出入口", text: "可从Money软件、Excel/CSV导入，也保留少量手工补录。", route: "cash-expense" }
    ],
    ai: {
      title: "AI财务参谋｜支出辅助",
      text: "可协助分类、核对、发现漏项与异常，并解释本月支出变化；人工重点处理异常和经营判断。"
    },
    seedObjects: []
  },

  "income-home": {
    routeId: "income-home",
    title: "收入中心",
    icon: "收",
    description: "作为财务之家下的收入中心，统一汇总各事业真实业务产生的收入事实；已有业务数据不重复录入。",
    overviewLabel: "收入概览",
    createLabel: "新建收入记录",
    objectName: "收入",
    objectPlural: "收入记录",
    typeDictionaryKey: "incomeTypes",
    typeDescriptions: {
      "电商销售收入": "由订单与店铺经营事实产生。",
      "批发收入": "由客户、商谈、报价与批发订单产生。",
      "服务收入": "留学、物流、咨询等服务业务产生。",
      "其他收入": "按未来真实事业与收入来源扩展。"
    },
    flow: {
      status: "validating",
      label: "待真实业务验证",
      steps: ["业务发生", "形成收入事实", "业务归属", "收款核对", "确认", "统一汇总", "AI分析"]
    },
    metrics: [
      { key: "total", label: "本月收入", sum: "amount", format: "money" },
      { key: "ecommerce", label: "电商收入", type: "电商销售收入", sum: "amount", format: "money" },
      { key: "wholesale", label: "批发收入", type: "批发收入", sum: "amount", format: "money" },
      { key: "service", label: "服务收入", type: "服务收入", sum: "amount", format: "money" },
      { key: "pending", label: "待确认", state: "待确认" },
      { key: "unmatched", label: "待核对收款", state: "待核对" }
    ],
    toolbar: commonObjectToolbar,
    fieldSchemaId: "income-home",
    cardFields: ["amount", "date", "business", "customer", "owner", "source"],
    listFields: ["name", "type", "amount", "date", "business", "customer", "owner", "state"],
    auxiliary: [
      { title: "收款核对", text: "业务收入事实与平台、银行或支付数据互查。" },
      { title: "待归属收入", text: "找不到业务来源或归属的信息进入待确认。" },
      { title: "经营贡献", text: "后续可与支出、商品、客户和事业共同形成经营分析。" }
    ],
    ai: {
      title: "AI财务参谋｜收入辅助",
      text: "可协助归类收入来源、核对业务与收款差异并形成经营解释。"
    },
    seedObjects: []
  },

  "cash-expense": {
    routeId: "cash-expense",
    title: "现金支出",
    icon: "现",
    description: "统一承接现金、Money软件、Excel/CSV等离线支出数据，避免重复录入。",
    overviewLabel: "现金支出概览",
    createLabel: "手工补录",
    objectName: "现金支出",
    objectPlural: "现金支出记录",
    typeDictionaryKey: "cashExpenseSources",
    typeDescriptions: {
      "Money软件导入": "优先直接使用软件导出数据，不重复录入。",
      "Excel/CSV导入": "每月表格批量导入并统一校验。",
      "手工补录": "仅用于没有其他数据来源的少量现金支出。"
    },
    flow: {
      status: "validating",
      label: "验证中",
      steps: ["取得数据", "导入/手工补录", "AI识别分类", "美和9要素补全", "人工确认异常", "汇入支出中心"]
    },
    metrics: [
      { key: "total", label: "本月现金支出", sum: "amount", format: "money" },
      { key: "money", label: "Money导入", type: "Money软件导入" },
      { key: "file", label: "表格导入", type: "Excel/CSV导入" },
      { key: "manual", label: "手工补录", type: "手工补录" },
      { key: "pending", label: "待确认", state: "待确认" },
      { key: "abnormal", label: "异常", state: "异常" }
    ],
    toolbar: commonObjectToolbar,
    fieldSchemaId: "cash-expense",
    cardFields: ["amount", "date", "business", "payer", "counterparty", "evidence"],
    listFields: ["name", "type", "amount", "date", "business", "payer", "counterparty", "state"],
    auxiliary: [
      { title: "导入优先", text: "Money软件或已有表格能提供的数据不重新录入。" },
      { title: "AI分类", text: "AI先根据摘要、对象和历史记录给出分类建议，人只确认异常。" },
      { title: "统一归集", text: "确认后的现金支出自动进入支出中心，不形成第二本账。", route: "expense-home" }
    ],
    ai: {
      title: "AI财务参谋｜现金支出",
      text: "可协助识别导入字段、分类支出、补齐9要素并发现重复或异常记录。"
    },
    seedObjects: []
  }
});

export function getBusinessPageDefinition(routeId) {
  const raw = BUSINESS_PAGE_DEFINITIONS[routeId] || EXTRA_BUSINESS_PAGE_DEFINITIONS[routeId] || null;
  if (!raw) return null;
  const fieldSchemaId = raw.fieldSchemaId || routeId;
  return {
    ...raw,
    fieldSchemaId,
    fields: getFieldSchema(fieldSchemaId),
    systemFields: getSystemFieldSchema(fieldSchemaId)
  };
}
