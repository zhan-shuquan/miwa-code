import assert from "node:assert/strict";
import {
  HOME_IDS,
  HOME_PAGE_MODEL,
  HOME_REGISTRY,
  SHARED_HOME_CENTERS
} from "../js/config/home-registry.js";

const expectedHomes = [
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
  ["knowledge-home", "知识之家"],
  ["shared-home", "共享之家"]
];

assert.equal(HOME_IDS.length, 12, "AIONE must keep exactly 12 first-level homes");
assert.deepEqual(
  HOME_IDS,
  expectedHomes.map(([id]) => id),
  "12-home order or identity drifted"
);

for (const [id, label] of expectedHomes) {
  assert.ok(HOME_REGISTRY[id], `missing home: ${id}`);
  assert.equal(HOME_REGISTRY[id].label, label, `wrong label for ${id}`);
}

for (const [id, definition] of Object.entries(HOME_REGISTRY)) {
  assert.equal(definition.overview.unique, true, `${id} overview must remain unique`);
  if (id !== "work") {
    assert.equal(definition.management.unique, true, `${id} management must remain unique`);
    assert.equal(definition.management.enabled, true, `${id} management must remain enabled`);
    assert.equal(definition.template, "standard-home", `${id} must use standard home template`);
  }
}

assert.equal(HOME_REGISTRY.work.template, "personal-work-home", "工作之家 must use the personal work template");
assert.equal(HOME_REGISTRY.work.management.enabled, false, "工作之家 must not be forced into standard home management");
assert.deepEqual(
  HOME_REGISTRY.work.personalCapabilities,
  ["我的工作", "我安排的", "我的关注", "我的收藏", "我的学习", "我的建议", "我的创新", "我的总结"],
  "工作之家 personal capabilities drifted"
);

assert.equal(HOME_PAGE_MODEL.standard.rules.overview, "unique");
assert.equal(HOME_PAGE_MODEL.standard.rules.centers, "optional-many");
assert.equal(HOME_PAGE_MODEL.standard.rules.management, "unique");
assert.equal(HOME_PAGE_MODEL.standard.rules.centerNavigation, "sidebar-tree");
assert.equal(HOME_PAGE_MODEL.standard.rules.centerSubNavigation, "horizontal-tabs");

assert.equal(SHARED_HOME_CENTERS.length, 9, "共享之家 currently locks nine centers");
assert.deepEqual(
  SHARED_HOME_CENTERS.map((item) => item.label),
  ["文件中心", "图片中心", "图标中心", "表格中心", "品牌资产中心", "数据中心", "代码中心", "应用中心", "模板中心"],
  "共享之家 center architecture drifted"
);

const forbiddenFirstLevelLabels = ["客户之家", "供应商之家", "分类之家", "店铺之家", "共享资源", "分析中心", "今日工作"];
const firstLevelLabels = new Set(Object.values(HOME_REGISTRY).map((item) => item.label));
for (const label of forbiddenFirstLevelLabels) {
  assert.equal(firstLevelLabels.has(label), false, `deprecated first-level home returned: ${label}`);
}

console.log("AIONE 12-home registry verified.");
