/* ========================================
   AIONE Business Navigation｜事业与业务导航配置
   Sidebar只展示稳定业务对象/入口；状态、步骤和操作下沉到页面内部。
======================================== */

const item = (id, label, route, options = {}) => Object.freeze({
  id,
  label,
  route,
  icon: options.icon || "apps",
  children: Object.freeze(options.children || []),
  quickActions: Object.freeze(options.quickActions || []),
  overviewRoute: options.overviewRoute || "",
  overviewLabel: options.overviewLabel || "概览"
});

const child = (id, label, route) => Object.freeze({ id, label, route });

export const BUSINESS_SPACES = Object.freeze({
  crossborder: Object.freeze({
    id: "crossborder",
    label: "美和跨境",
    shortLabel: "跨境",
    defaultRoute: "selection",
    workbenches: Object.freeze([
      item("selection", "选品工作台", "selection", { icon: "search", children: [
        child("selection-mine", "我的选品", "selection/mine"),
        child("selection-following", "我的互动", "selection/following"),
        child("selection-product-planning", "商品企划", "selection/product-development")
      ]}),
      item("sampling", "测样工作台", "sampling", { icon: "sampling", children: [
        child("sampling-overview", "测样概览", "sampling-overview"),
        child("sampling-tasks", "测样任务", "sampling-tasks"),
        child("sampling-queue", "待测样商品", "sampling-queue"),
        child("sampling-samples", "样品管理", "sampling-samples"),
        child("sampling-reports", "测样报告", "sampling-reports"),
        child("sampling-records", "测样记录", "sampling-records")
      ]}),
      item("procurement", "采购工作台", "procurement", { icon: "procurement", children: [
        child("procurement-overview", "采购概览", "procurement-overview"),
        child("procurement-needs", "采购需求", "procurement-needs"),
        child("procurement-orders", "采购订单", "procurement-orders"),
        child("procurement-suppliers", "供应商", "procurement-suppliers"),
        child("procurement-records", "采购记录", "procurement-records")
      ]}),
      item("design", "设计工作台", "design", { icon: "design", children: [
        child("design-overview", "设计概览", "design-overview"),
        child("design-tasks", "设计任务", "design-tasks"),
        child("design-materials", "商品素材", "design-materials"),
        child("design-assets", "设计资产", "design-assets"),
        child("design-records", "设计记录", "design-records")
      ]}),
      item("publishing", "上架工作台", "publishing", { icon: "publishing", children: [
        child("publishing-overview", "上架概览", "publishing-overview"),
        child("publishing-tasks", "上架任务", "publishing-tasks"),
        child("publishing-products", "商品资料", "publishing-products"),
        child("publishing-records", "发布记录", "publishing-records")
      ]}),
      item("operations", "运营工作台", "operations", { icon: "operations", children: [
        child("operations-overview", "运营概览", "operations-overview"),
        child("operations-products", "运营商品", "operations-products"),
        child("operations-tasks", "运营任务", "operations-tasks"),
        child("operations-campaigns", "活动与推广", "operations-campaigns"),
        child("operations-records", "运营记录", "operations-records")
      ]}),
      item("orders", "订单工作台", "orders", { icon: "orders", children: [
        child("orders-overview", "订单概览", "orders-overview"),
        child("orders-list", "订单列表", "orders-list"),
        child("orders-exceptions", "订单异常", "orders-exceptions"),
        child("orders-records", "订单记录", "orders-records")
      ]}),
      item("inventory", "库存工作台", "inventory", { icon: "procurement", children: [
        child("inventory-overview", "库存概览", "inventory-overview"),
        child("inventory-list", "库存列表", "inventory-list"),
        child("inventory-movements", "入出库管理", "inventory-movements"),
        child("inventory-counts", "盘点管理", "inventory-counts"),
        child("inventory-records", "库存记录", "inventory-records")
      ]}),
      item("service", "客服工作台", "service", { icon: "service", children: [
        child("service-overview", "客服概览", "service-overview"),
        child("service-tickets", "客服工单", "service-tickets"),
        child("service-after-sales", "退换与售后", "service-after-sales"),
        child("service-feedback", "客户反馈", "service-feedback"),
        child("service-records", "客服记录", "service-records")
      ]})
    ])
  }),

  wholesale: Object.freeze({
    id: "wholesale",
    label: "美和批发",
    shortLabel: "批发",
    defaultRoute: "wholesale-products",
    workbenches: Object.freeze([
      item("wholesale-products", "商品企画・選定", "wholesale-products", { icon: "search", children: [
        child("wholesale-products-overview", "商品概览", "wholesale-products-overview"),
        child("wholesale-products-candidates", "商品候補", "wholesale-products-candidates"),
        child("wholesale-products-catalog", "卸売商品", "wholesale-products-catalog"),
        child("wholesale-products-terms", "卸価格・仕入条件", "wholesale-products-terms"),
        child("wholesale-products-records", "商品記録", "wholesale-products-records")
      ]}),
      item("wholesale-sales", "見積・商談", "wholesale-sales", { icon: "operations", children: [
        child("wholesale-sales-overview", "商談概览", "wholesale-sales-overview"),
        child("wholesale-sales-customers", "得意先", "wholesale-sales-customers"),
        child("wholesale-sales-deals", "商談案件", "wholesale-sales-deals"),
        child("wholesale-sales-quotes", "見積管理", "wholesale-sales-quotes"),
        child("wholesale-sales-records", "商談記録", "wholesale-sales-records")
      ]}),
      item("wholesale-orders", "受注管理", "wholesale-orders", { icon: "orders", children: [
        child("wholesale-orders-overview", "受注概览", "wholesale-orders-overview"),
        child("wholesale-orders-list", "受注一覧", "wholesale-orders-list"),
        child("wholesale-orders-records", "受注記録", "wholesale-orders-records")
      ]}),
      item("wholesale-shipping", "出荷管理", "wholesale-shipping", { icon: "publishing", children: [
        child("wholesale-shipping-overview", "出荷概览", "wholesale-shipping-overview"),
        child("wholesale-shipping-list", "出荷一覧", "wholesale-shipping-list"),
        child("wholesale-shipping-instructions", "出荷指示", "wholesale-shipping-instructions"),
        child("wholesale-shipping-records", "出荷記録", "wholesale-shipping-records")
      ]}),
      item("wholesale-billing", "請求・入金管理", "wholesale-billing", { icon: "procurement", children: [
        child("wholesale-billing-overview", "請求概览", "wholesale-billing-overview"),
        child("wholesale-billing-invoices", "請求管理", "wholesale-billing-invoices"),
        child("wholesale-billing-receivables", "売掛金", "wholesale-billing-receivables"),
        child("wholesale-billing-payments", "入金管理", "wholesale-billing-payments"),
        child("wholesale-billing-records", "請求・入金記録", "wholesale-billing-records")
      ]}),
      item("wholesale-service", "顧客対応", "wholesale-service", { icon: "service", children: [
        child("wholesale-service-overview", "顧客対応概览", "wholesale-service-overview"),
        child("wholesale-service-cases", "対応案件", "wholesale-service-cases"),
        child("wholesale-service-returns", "返品・クレーム", "wholesale-service-returns"),
        child("wholesale-service-followup", "顧客フォロー", "wholesale-service-followup"),
        child("wholesale-service-records", "対応記録", "wholesale-service-records")
      ]})
    ])
  })
});

export const BUSINESS_SPACE_IDS = Object.freeze(Object.keys(BUSINESS_SPACES));

export function getBusinessSpaceForRoute(routeId) {
  for (const space of Object.values(BUSINESS_SPACES)) {
    for (const workbench of space.workbenches) {
      if (workbench.route === routeId || workbench.children.some((entry) => entry.route.split("/")[0] === routeId || entry.route === routeId)) {
        return space;
      }
    }
  }
  return null;
}

export function getWorkbenchForRoute(routeId) {
  for (const space of Object.values(BUSINESS_SPACES)) {
    for (const workbench of space.workbenches) {
      if (workbench.route === routeId || workbench.children.some((entry) => entry.route.split("/")[0] === routeId || entry.route === routeId)) {
        return workbench;
      }
    }
  }
  return null;
}
