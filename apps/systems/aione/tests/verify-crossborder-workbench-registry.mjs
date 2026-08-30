import assert from "node:assert/strict";
import { BUSINESS_SPACES } from "../js/config/business-navigation.js";
import { ROUTE_REGISTRY, WORKBENCH_ROUTES } from "../js/config/route-registry.js";

const EXPECTED = Object.freeze([
  ["selection", "选品工作台"],
  ["sampling", "测样工作台"],
  ["procurement", "采购工作台"],
  ["design", "设计工作台"],
  ["publishing", "上架工作台"],
  ["operations", "运营工作台"],
  ["orders", "订单工作台"],
  ["inventory", "库存工作台"],
  ["service", "客服工作台"]
]);

const navigationWorkbenches = BUSINESS_SPACES.crossborder.workbenches.map(({ id, label }) => [id, label]);
const routeWorkbenches = WORKBENCH_ROUTES.map((id) => [id, ROUTE_REGISTRY[id]?.label]);

assert.deepEqual(
  navigationWorkbenches,
  EXPECTED,
  "美和跨境工作台导航必须严格保持当前锁定的9工作台定义。"
);

assert.deepEqual(
  routeWorkbenches,
  EXPECTED,
  "Route Registry 的工作台定义必须与业务导航的9工作台定义完全一致。"
);

for (const [id, label] of EXPECTED) {
  assert.equal(ROUTE_REGISTRY[id]?.kind, "workbench", `${label} (${id}) 必须保持 workbench 类型。`);
}

const deprecatedLabels = [
  "视觉设计工作台",
  "上架发布工作台",
  "运营推广工作台",
  "订单与库存工作台",
  "客服与售后工作台"
];

for (const route of Object.values(ROUTE_REGISTRY)) {
  assert.ok(!deprecatedLabels.includes(route.label), `发现已废止工作台名称：${route.label}`);
}

console.log("PASS: AIONE crossborder workbench registry is locked to the canonical nine-workbench baseline.");
