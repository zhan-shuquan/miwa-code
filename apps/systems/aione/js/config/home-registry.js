/* ========================================
   AIONE Home Registry｜12之家唯一事实源
   规则：普通之家 = 概览(唯一) + 中心(按需) + 管理(唯一)。
   工作之家是用户专属工作空间，允许使用专属 Personal Work Home 母版。
======================================== */

const center = (id, label, options = {}) => Object.freeze({
  id,
  label,
  tabs: Object.freeze([...(options.tabs || [])]),
  defaultView: options.defaultView || "list",
  status: options.status || "planned"
});

const home = (id, label, options = {}) => Object.freeze({
  id,
  label,
  template: options.template || "standard-home",
  overview: Object.freeze({ unique: true, enabled: options.overview !== false }),
  centers: Object.freeze([...(options.centers || [])]),
  management: Object.freeze({ unique: true, enabled: options.management !== false }),
  personalCapabilities: Object.freeze([...(options.personalCapabilities || [])]),
  status: options.status || "active"
});

export const HOME_PAGE_MODEL = Object.freeze({
  standard: Object.freeze({
    template: "standard-home",
    structure: Object.freeze(["overview", "centers", "management"]),
    rules: Object.freeze({
      overview: "unique",
      centers: "optional-many",
      management: "unique",
      centerNavigation: "sidebar-tree",
      centerSubNavigation: "horizontal-tabs"
    })
  }),
  personalWork: Object.freeze({
    template: "personal-work-home",
    structure: Object.freeze(["overview", "personal-workspace"]),
    rules: Object.freeze({
      userScoped: true,
      crossPlatformCollection: true,
      crossPlatformLearning: true,
      crossPlatformFollowing: true
    })
  })
});

export const SHARED_HOME_CENTERS = Object.freeze([
  center("shared-file-center", "文件中心", {
    tabs: ["全部", "文档", "PDF", "演示文稿", "压缩文件", "其他文件"],
    defaultView: "list"
  }),
  center("shared-image-center", "图片中心", {
    tabs: ["全部", "商品图片", "场景图片", "模特图片", "品牌图片", "企业图片", "宣传图片", "素材图片"],
    defaultView: "grid"
  }),
  center("shared-icon-center", "图标中心", {
    tabs: ["全部", "系统图标", "业务图标", "状态图标", "品牌图标", "商品图标"],
    defaultView: "grid"
  }),
  center("shared-table-center", "表格中心", {
    tabs: ["全部", "业务表格", "导入表格", "导出表格", "数据表格", "报表", "计算表"],
    defaultView: "table"
  }),
  center("shared-brand-asset-center", "品牌资产中心", {
    tabs: ["全部", "Logo", "商标", "品牌视觉", "品牌字体", "品牌色", "包装资产", "品牌资料包"],
    defaultView: "grid"
  }),
  center("shared-data-center", "数据中心", {
    tabs: ["全部", "数据集", "数据文件", "数据接口", "数据源", "报表数据", "外部数据"],
    defaultView: "table"
  }),
  center("shared-code-center", "代码中心", {
    tabs: ["全部", "项目代码", "组件", "模板代码", "脚本", "Skill", "Agent", "自动化"],
    defaultView: "list"
  }),
  center("shared-application-center", "应用中心", {
    tabs: ["全部", "内部系统", "外部平台", "办公应用", "电商平台", "物流应用", "AI应用", "开发工具"],
    defaultView: "grid"
  }),
  center("shared-template-center", "模板中心", {
    tabs: ["全部", "文档模板", "表格模板", "PPT模板", "图片模板", "设计模板", "邮件模板", "AI提示模板", "业务模板"],
    defaultView: "grid"
  })
]);

export const HOME_REGISTRY = Object.freeze({
  company: home("company", "美和之家"),
  "business-home": home("business-home", "事业之家"),
  work: home("work", "工作之家", {
    template: "personal-work-home",
    management: false,
    personalCapabilities: [
      "我的工作",
      "我安排的",
      "我的关注",
      "我的收藏",
      "我的学习",
      "我的建议",
      "我的创新",
      "我的总结"
    ]
  }),
  "talent-home": home("talent-home", "人才之家"),
  "ai-home": home("ai-home", "AI之家"),
  "product-home": home("product-home", "商品之家"),
  "relations-home": home("relations-home", "往来之家"),
  "channel-home": home("channel-home", "渠道之家"),
  "finance-home": home("finance-home", "财务之家"),
  analysis: home("analysis", "分析之家"),
  "knowledge-home": home("knowledge-home", "知识之家"),
  "shared-home": home("shared-home", "共享之家", {
    centers: SHARED_HOME_CENTERS
  })
});

export const HOME_IDS = Object.freeze(Object.keys(HOME_REGISTRY));

export function getHomeDefinition(homeId) {
  return HOME_REGISTRY[homeId] || null;
}

export function isHomeRoute(routeId) {
  return Boolean(HOME_REGISTRY[routeId]);
}
