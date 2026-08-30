import assert from "node:assert/strict";
import { ROUTE_REGISTRY } from "../js/config/route-registry.js";

const EXPECTED_HOMES = Object.freeze([
  ["company", "美和之家"],
  ["business-home", "事业之家"],
  ["work", "工作之家"],
  ["talent-home", "人才之家"],
  ["ai-home", "AI之家"],
  ["product-home", "商品之家"],
  ["relations-home", "往来之家"],
  ["channel-home", "渠道之家"],
  ["finance-home", "财务之家"],
  ["analysis", "分析之家"],
  ["knowledge-home", "知识之家"]
]);

for (const [id, label] of EXPECTED_HOMES) {
  const route = ROUTE_REGISTRY[id];
  assert.ok(route, `missing home route: ${id}`);
  assert.equal(route.label, label, `${id} must remain ${label}`);
  assert.equal(route.kind, "platform", `${id} must remain a platform route`);
}

assert.equal(EXPECTED_HOMES.length, 11, "AIONE must keep exactly 11 canonical homes");

assert.equal(ROUTE_REGISTRY["customer-home"]?.label, "客户中心");
assert.equal(ROUTE_REGISTRY["customer-home"]?.parent, "relations-home");
assert.equal(ROUTE_REGISTRY["supplier-home"]?.label, "供应商中心");
assert.equal(ROUTE_REGISTRY["supplier-home"]?.parent, "relations-home");
assert.equal(ROUTE_REGISTRY["category-home"]?.label, "分类中心");
assert.equal(ROUTE_REGISTRY["category-home"]?.parent, "product-home");

assert.ok(!ROUTE_REGISTRY["shared-home"], "deprecated shared-home route must not return");
assert.equal(ROUTE_REGISTRY["shared-resources"]?.label, "共享资源");

const FORBIDDEN_HOME_LABELS = new Set([
  "客户之家",
  "供应商之家",
  "分类之家",
  "共享之家",
  "店铺之家",
  "分析中心",
  "今日工作"
]);

for (const route of Object.values(ROUTE_REGISTRY)) {
  assert.ok(!FORBIDDEN_HOME_LABELS.has(route.label), `deprecated label returned: ${route.label}`);
}

console.log("PASS: latest AIONE 11-home architecture is locked and deprecated home definitions are blocked.");
