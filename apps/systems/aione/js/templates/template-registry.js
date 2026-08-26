/* ========================================
   Template Registry｜AIONE二级页面组合母版注册表
   空母版永远只有一份；Recipe只描述标准组件组合，不复制HTML。
======================================== */

export const TEMPLATE_RECIPES = Object.freeze({
  "standard-business": Object.freeze({
    id: "standard-business",
    label: "标准业务母版",
    base: "level2-empty-base",
    modules: Object.freeze([
      "page-header",
      "type-or-scope-rail",
      "flow",
      "core-metrics",
      "universal-workspace",
      "auxiliary-rail",
      "miwa-nine-elements"
    ]),
    required: Object.freeze(["page-header", "universal-workspace", "miwa-nine-elements"])
  }),
  "corporate-publication": Object.freeze({
    id: "corporate-publication",
    label: "企业数字出版母版",
    base: "level2-empty-base",
    modules: Object.freeze([
      "corporate-cover",
      "corporate-section",
      "publication-actions",
      "contextual-aside"
    ]),
    required: Object.freeze(["corporate-section"])
  }),
  content: Object.freeze({
    id: "content",
    label: "内容母版",
    base: "level2-empty-base",
    modules: Object.freeze([
      "page-header",
      "content-category-rail",
      "core-metrics",
      "universal-workspace",
      "related-content-rail",
      "miwa-nine-elements"
    ]),
    required: Object.freeze(["page-header", "universal-workspace", "miwa-nine-elements"])
  })
});

export function getTemplateRecipe(id) {
  return TEMPLATE_RECIPES[id] || null;
}
