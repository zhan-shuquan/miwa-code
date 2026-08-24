/* ========================================
   AIONE Route Registry｜全平台内部入口唯一清单
   入口名称与地址在这里锁定；页面内容可以按业务优先顺序逐步补充。
======================================== */

const route = (id, label, kind, options = {}) => Object.freeze({
  id,
  label,
  kind,
  status: options.status || "reserved",
  page: options.page || null,
  title: options.title || label,
  parent: options.parent || null
});

export const ROUTE_REGISTRY = Object.freeze({
  company: route("company", "美和之家", "platform", { status: "active", page: "./pages/content-home/template.html" }),
  work: route("work", "工作之家", "platform", { status: "active", page: "./pages/business-home/template.html" }),
  calendar: route("calendar", "美和日历", "platform", {
    status: "active",
    page: "./pages/calendar/home.html"
  }),
  "category-home": route("category-home", "分类之家", "platform", { status: "active", page: "./pages/business-home/template.html" }),
  "product-home": route("product-home", "商品之家", "platform", { status: "active", page: "./pages/business-home/template.html" }),
  "customer-home": route("customer-home", "客户之家", "platform", { status: "active", page: "./pages/business-home/template.html" }),
  "supplier-home": route("supplier-home", "供应商之家", "platform", { status: "active", page: "./pages/business-home/template.html" }),
  "talent-home": route("talent-home", "人才之家", "platform", { status: "active", page: "./pages/business-home/template.html" }),
  "income-home": route("income-home", "收入之家", "platform", { status: "active", page: "./pages/business-home/template.html" }),
  "expense-home": route("expense-home", "支出之家", "platform", { status: "active", page: "./pages/business-home/template.html" }),
  "cash-expense": route("cash-expense", "现金支出", "platform", { status: "active", page: "./pages/business-home/template.html", parent: "expense-home" }),
  "application-home": route("application-home", "应用资源", "platform", { status: "active", page: "./pages/business-home/template.html", parent: "shared-home" }),
  "ai-home": route("ai-home", "AI之家", "platform", { status: "active", page: "./pages/business-home/template.html" }),
  "ai-office": route("ai-office", "AI办公室", "platform", { status: "active", page: "./pages/business-home/template.html" }),
  analysis: route("analysis", "分析之家", "platform", { status: "active", page: "./pages/business-home/template.html" }),
  "shared-home": route("shared-home", "快捷入口", "platform", { status: "active", page: "./pages/business-home/template.html" }),
  "store-home": route("store-home", "店铺之家", "platform", { status: "active", page: "./pages/business-home/template.html" }),
  search: route("search", "全局搜索", "platform"),
  notifications: route("notifications", "通知中心", "platform", { status: "active", page: "./pages/notifications/home.html" }),
  "notification-detail": route("notification-detail", "通知详情", "platform", { status: "active", page: "./pages/notifications/detail.html", parent: "notifications" }),
  settings: route("settings", "设置", "platform"),
  principles: route("principles", "美和方法论", "platform", { parent: "knowledge-home" }),
  "employee-profile": route("employee-profile", "个人资料", "platform"),
  "platform-admin": route("platform-admin", "平台管理账户", "platform"),

  /* 分類之家：定義、責任、機会と経営結果を一つの分類軸で接続する。 */
  "category-directory": route("category-directory", "分类目录", "platform", { parent: "category-home" }),
  "category-focus": route("category-focus", "深耕分类", "platform", { parent: "category-home" }),
  "category-responsibility": route("category-responsibility", "分类责任", "platform", { parent: "category-home" }),
  "category-opportunities": route("category-opportunities", "分类机会", "platform", { parent: "category-home" }),
  "category-performance": route("category-performance", "分类经营", "platform", { parent: "category-home" }),
  "category-standards": route("category-standards", "分类标准", "platform", { parent: "category-home" }),

  /* 商品之家：商品主データを基点に店舖・SKU・資産・利益を接続する。 */
  "product-directory": route("product-directory", "商品档案", "platform", { parent: "product-home" }),
  "product-master-data": route("product-master-data", "商品主数据", "platform", { parent: "product-home" }),
  "product-store-map": route("product-store-map", "店铺商品映射", "platform", { parent: "product-home" }),
  "product-lifecycle": route("product-lifecycle", "商品生命周期", "platform", { parent: "product-home" }),
  "product-assets": route("product-assets", "商品资料", "platform", { parent: "product-home" }),
  "product-profit": route("product-profit", "商品经营核算", "platform", { parent: "product-home" }),

  /* AI之家：AI人材、能力、実行、証拠とガバナンスを分離して管理する。 */
  "ai-talents": route("ai-talents", "AI人才", "platform", { parent: "ai-home" }),
  "ai-capabilities": route("ai-capabilities", "AI能力", "platform", { parent: "ai-home" }),
  "ai-agents": route("ai-agents", "Agent与自动化", "platform", { parent: "ai-home" }),
  "ai-evidence": route("ai-evidence", "成长与履历", "platform", { parent: "ai-home" }),
  "ai-innovation": route("ai-innovation", "AI创新", "platform", { parent: "ai-home" }),
  "ai-governance": route("ai-governance", "AI治理", "platform", { parent: "ai-home" }),

  /* 分析センター：事実と証拠を多軸で確認し、判断材料を形成する。 */
  "analysis-overview": route("analysis-overview", "经营总览", "platform", { parent: "analysis" }),
  "analysis-profit": route("analysis-profit", "利润分析", "platform", { parent: "analysis" }),
  "analysis-store": route("analysis-store", "店铺分析", "platform", { parent: "analysis" }),
  "analysis-product": route("analysis-product", "商品分析", "platform", { parent: "analysis" }),
  "analysis-people": route("analysis-people", "人员贡献", "platform", { parent: "analysis" }),
  "analysis-efficiency": route("analysis-efficiency", "效率与自动化", "platform", { parent: "analysis" }),
  "analysis-quality": route("analysis-quality", "质量与风险", "platform", { parent: "analysis" }),

  /* 共有之家：能力入口と資産目録を同じ家で発見できるようにする。 */
  "standard-home": route("standard-home", "标准", "platform", { parent: "knowledge-home" }),
  "brand-home": route("brand-home", "品牌资产", "platform", { parent: "shared-home" }),
  "data-home": route("data-home", "数据资产", "platform", { parent: "shared-home" }),
  "knowledge-home": route("knowledge-home", "知识之家", "platform", { status: "active", page: "./pages/content-home/template.html" }),
  "code-assets": route("code-assets", "代码资产", "platform", { parent: "shared-home" }),
  "document-assets": route("document-assets", "文件与资料资产", "platform", { parent: "shared-home" }),
  "software-home": route("software-home", "软件与账号", "platform", { parent: "application-home" }),
  "erp-home": route("erp-home", "ERP", "platform", { parent: "shared-home" }),
  "finance-home": route("finance-home", "财务", "platform", { parent: "shared-home" }),
  "people-home": route("people-home", "人事资料", "platform", { parent: "talent-home" }),
  "identity-home": route("identity-home", "身份与权限", "platform", { parent: "shared-home" }),
  "contract-home": route("contract-home", "合同与法务", "platform", { parent: "shared-home" }),

  selection: route("selection", "选品工作台", "workbench", {
    status: "active",
    page: "./pages/selection-workbench/home.html"
  }),
  "selection-opportunities": route("selection-opportunities", "商品机会", "workbench", { parent: "selection" }),
  "selection-ai-talent": route("selection-ai-talent", "AI选品人才", "workbench", { parent: "selection" }),
  "selection-records": route("selection-records", "选品记录", "workbench", { parent: "selection" }),

  sampling: route("sampling", "测样工作台", "workbench", {
    status: "active",
    page: "./pages/sampling-workbench/home.html"
  }),
  "sampling-overview": route("sampling-overview", "测样概览", "workbench", {
    status: "active",
    page: "./pages/sampling-workbench/overview.html",
    parent: "sampling"
  }),
  "sampling-tasks": route("sampling-tasks", "测样任务", "workbench", {
    status: "active",
    page: "./pages/sampling-workbench/tasks.html",
    parent: "sampling"
  }),
  "sampling-queue": route("sampling-queue", "待测样商品", "workbench", {
    status: "active",
    page: "./pages/sampling-workbench/queue.html",
    parent: "sampling"
  }),
  "sampling-samples": route("sampling-samples", "样品管理", "workbench", { parent: "sampling" }),
  "sampling-reports": route("sampling-reports", "测样报告", "workbench", { parent: "sampling" }),
  "sampling-records": route("sampling-records", "测样记录", "workbench", { parent: "sampling" }),

  procurement: route("procurement", "采购工作台", "workbench"),
  "procurement-overview": route("procurement-overview", "采购概览", "workbench", { parent: "procurement" }),
  "procurement-needs": route("procurement-needs", "采购需求", "workbench", { parent: "procurement" }),
  "procurement-orders": route("procurement-orders", "采购订单", "workbench", { parent: "procurement" }),
  "procurement-suppliers": route("procurement-suppliers", "供应商", "workbench", { parent: "procurement" }),
  "procurement-records": route("procurement-records", "采购记录", "workbench", { parent: "procurement" }),

  design: route("design", "设计工作台", "workbench"),
  "design-overview": route("design-overview", "设计概览", "workbench", { parent: "design" }),
  "design-tasks": route("design-tasks", "设计任务", "workbench", { parent: "design" }),
  "design-materials": route("design-materials", "商品素材", "workbench", { parent: "design" }),
  "design-assets": route("design-assets", "设计资产", "workbench", { parent: "design" }),
  "design-records": route("design-records", "设计记录", "workbench", { parent: "design" }),

  publishing: route("publishing", "上架工作台", "workbench"),
  "publishing-overview": route("publishing-overview", "上架概览", "workbench", { parent: "publishing" }),
  "publishing-tasks": route("publishing-tasks", "上架任务", "workbench", { parent: "publishing" }),
  "publishing-products": route("publishing-products", "商品资料", "workbench", { parent: "publishing" }),
  "publishing-records": route("publishing-records", "发布记录", "workbench", { parent: "publishing" }),

  operations: route("operations", "运营工作台", "workbench"),
  "operations-overview": route("operations-overview", "运营概览", "workbench", { parent: "operations" }),
  "operations-products": route("operations-products", "运营商品", "workbench", { parent: "operations" }),
  "operations-tasks": route("operations-tasks", "运营任务", "workbench", { parent: "operations" }),
  "operations-campaigns": route("operations-campaigns", "活动与推广", "workbench", { parent: "operations" }),
  "operations-records": route("operations-records", "运营记录", "workbench", { parent: "operations" }),

  orders: route("orders", "订单工作台", "workbench"),
  "orders-overview": route("orders-overview", "订单概览", "workbench", { parent: "orders" }),
  "orders-list": route("orders-list", "订单列表", "workbench", { parent: "orders" }),
  "orders-exceptions": route("orders-exceptions", "订单异常", "workbench", { parent: "orders" }),
  "orders-records": route("orders-records", "订单记录", "workbench", { parent: "orders" }),

  inventory: route("inventory", "库存工作台", "workbench"),
  "inventory-overview": route("inventory-overview", "库存概览", "workbench", { parent: "inventory" }),
  "inventory-list": route("inventory-list", "库存列表", "workbench", { parent: "inventory" }),
  "inventory-movements": route("inventory-movements", "入出库管理", "workbench", { parent: "inventory" }),
  "inventory-counts": route("inventory-counts", "盘点管理", "workbench", { parent: "inventory" }),
  "inventory-records": route("inventory-records", "库存记录", "workbench", { parent: "inventory" }),

  service: route("service", "客服工作台", "workbench"),
  "service-overview": route("service-overview", "客服概览", "workbench", { parent: "service" }),
  "service-tickets": route("service-tickets", "客服工单", "workbench", { parent: "service" }),
  "service-after-sales": route("service-after-sales", "退换与售后", "workbench", { parent: "service" }),
  "service-feedback": route("service-feedback", "客户反馈", "workbench", { parent: "service" }),
  "service-records": route("service-records", "客服记录", "workbench", { parent: "service" }),

  "wholesale-products": route("wholesale-products", "商品企画・選定", "workbench"),
  "wholesale-products-overview": route("wholesale-products-overview", "商品概览", "workbench", { parent: "wholesale-products" }),
  "wholesale-products-candidates": route("wholesale-products-candidates", "商品候補", "workbench", { parent: "wholesale-products" }),
  "wholesale-products-catalog": route("wholesale-products-catalog", "卸売商品", "workbench", { parent: "wholesale-products" }),
  "wholesale-products-terms": route("wholesale-products-terms", "卸価格・仕入条件", "workbench", { parent: "wholesale-products" }),
  "wholesale-products-records": route("wholesale-products-records", "商品記録", "workbench", { parent: "wholesale-products" }),

  "wholesale-sales": route("wholesale-sales", "見積・商談", "workbench"),
  "wholesale-sales-overview": route("wholesale-sales-overview", "商談概览", "workbench", { parent: "wholesale-sales" }),
  "wholesale-sales-customers": route("wholesale-sales-customers", "得意先", "workbench", { parent: "wholesale-sales" }),
  "wholesale-sales-deals": route("wholesale-sales-deals", "商談案件", "workbench", { parent: "wholesale-sales" }),
  "wholesale-sales-quotes": route("wholesale-sales-quotes", "見積管理", "workbench", { parent: "wholesale-sales" }),
  "wholesale-sales-records": route("wholesale-sales-records", "商談記録", "workbench", { parent: "wholesale-sales" }),

  "wholesale-orders": route("wholesale-orders", "受注管理", "workbench"),
  "wholesale-orders-overview": route("wholesale-orders-overview", "受注概览", "workbench", { parent: "wholesale-orders" }),
  "wholesale-orders-list": route("wholesale-orders-list", "受注一覧", "workbench", { parent: "wholesale-orders" }),
  "wholesale-orders-records": route("wholesale-orders-records", "受注記録", "workbench", { parent: "wholesale-orders" }),

  "wholesale-shipping": route("wholesale-shipping", "出荷管理", "workbench"),
  "wholesale-shipping-overview": route("wholesale-shipping-overview", "出荷概览", "workbench", { parent: "wholesale-shipping" }),
  "wholesale-shipping-list": route("wholesale-shipping-list", "出荷一覧", "workbench", { parent: "wholesale-shipping" }),
  "wholesale-shipping-instructions": route("wholesale-shipping-instructions", "出荷指示", "workbench", { parent: "wholesale-shipping" }),
  "wholesale-shipping-records": route("wholesale-shipping-records", "出荷記録", "workbench", { parent: "wholesale-shipping" }),

  "wholesale-billing": route("wholesale-billing", "請求・入金管理", "workbench"),
  "wholesale-billing-overview": route("wholesale-billing-overview", "請求概览", "workbench", { parent: "wholesale-billing" }),
  "wholesale-billing-invoices": route("wholesale-billing-invoices", "請求管理", "workbench", { parent: "wholesale-billing" }),
  "wholesale-billing-receivables": route("wholesale-billing-receivables", "売掛金", "workbench", { parent: "wholesale-billing" }),
  "wholesale-billing-payments": route("wholesale-billing-payments", "入金管理", "workbench", { parent: "wholesale-billing" }),
  "wholesale-billing-records": route("wholesale-billing-records", "請求・入金記録", "workbench", { parent: "wholesale-billing" }),

  "wholesale-service": route("wholesale-service", "顧客対応", "workbench"),
  "wholesale-service-overview": route("wholesale-service-overview", "顧客対応概览", "workbench", { parent: "wholesale-service" }),
  "wholesale-service-cases": route("wholesale-service-cases", "対応案件", "workbench", { parent: "wholesale-service" }),
  "wholesale-service-returns": route("wholesale-service-returns", "返品・クレーム", "workbench", { parent: "wholesale-service" }),
  "wholesale-service-followup": route("wholesale-service-followup", "顧客フォロー", "workbench", { parent: "wholesale-service" }),
  "wholesale-service-records": route("wholesale-service-records", "対応記録", "workbench", { parent: "wholesale-service" })
});

export const WORKBENCH_ROUTES = Object.freeze([
  "selection",
  "sampling",
  "procurement",
  "design",
  "publishing",
  "operations",
  "orders",
  "inventory",
  "service"
]);

export function getRouteId(hash = window.location.hash) {
  const normalized = String(hash || "").replace(/^#\/?/, "");
  return normalized.split(/[/?]/)[0] || "selection";
}

export function getRouteDefinition(hash = window.location.hash) {
  return ROUTE_REGISTRY[getRouteId(hash)] || ROUTE_REGISTRY.selection;
}
