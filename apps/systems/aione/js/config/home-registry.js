/* ========================================
   AIONE Home Registry｜12之家唯一事实源
   规则：普通之家 = 概览(唯一) + 中心(按需) + 管理(按需)。
   工作之家是用户专属工作空间，允许使用专属 Personal Work Home 母版。

   Governance CURRENT｜2026-09-05
   已基本锁定：美和之家、事业之家、工作之家、商品之家。
   其余之家保留12之家一级入口，但二级目录/中心仍处于随“美和跨境”真实业务闭环逐步验证阶段；
   当前临时页面、临时目录或已有代码不得自动视为正式CURRENT定义。
======================================== */

const center = (id, label, options = {}) => Object.freeze({
  id,
  label,
  route: options.route || null,
  icon: options.icon || "",
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
  status: options.status || "active",
  governance: options.governance || "validating"
});

export const HOME_PAGE_MODEL = Object.freeze({
  standard: Object.freeze({
    template: "standard-home",
    structure: Object.freeze(["overview", "centers", "management"]),
    rules: Object.freeze({ overview: "unique", centers: "optional-many", management: "optional-unique", centerNavigation: "sidebar", centerSubNavigation: "horizontal-tabs" })
  }),
  personalWork: Object.freeze({
    template: "personal-work-home",
    structure: Object.freeze(["overview", "personal-workspace"]),
    rules: Object.freeze({ userScoped: true, crossPlatformCollection: true, crossPlatformLearning: true, crossPlatformFollowing: true })
  })
});

/* Product Home CURRENT｜2026-09-08
 * Product Truth: Google Sheet 1YE4F_OEU7sPaWJt15Cn2h0lOo9TywgbowiJ7UKPLjLU.
 * 之家级横向入口 = 概览｜学习手册｜资料一览；Sidebar = 16个业务中心；
 * 中心内横向导航 = center.tabs。此处是运行时唯一导航定义。
 */
export const PRODUCT_HOME_CENTERS = Object.freeze([
  center("selection-center", "选品中心", { route: "product-home?center=selection-center", icon: "search", tabs: ["概览", "选品一览", "选品方法"], status: "active" }),
  center("product-center", "商品中心", { route: "product-home?center=product-center", icon: "product", tabs: ["概览", "商品一览", "SKU一览", "SKU生成器"], status: "active" }),
  center("profit-center", "利润中心", { route: "product-home?center=profit-center", icon: "analysis", tabs: ["利润一览", "利润分析"], status: "active" }),
  center("design-center", "设计中心", { route: "product-home?center=design-center", icon: "file", tabs: ["概览", "设计一览", "AI批量出图", "图片管理", "设计模板", "模板映射"], status: "validating" }),
  center("publish-center", "发布中心", { route: "product-home?center=publish-center", icon: "publishing", tabs: ["概览", "发布一览", "商品发布", "分类发布", "图片发布", "商品删除", "导入任务", "发布批次", "发布任务", "错误追踪", "发布模板", "发布映射"], status: "validating" }),
  center("category-center", "分类中心", { route: "product-home?center=category-center", icon: "category", tabs: ["概览", "分类一览", "分类树", "店铺分类", "分类映射", "分类全景"], status: "active" }),
  center("brand-center", "品牌中心", { route: "product-home?center=brand-center", icon: "brand", tabs: ["概览", "品牌一览", "品牌注册"], status: "validating" }),
  center("attribute-center", "属性中心", { route: "product-home?center=attribute-center", icon: "settings", tabs: ["概览", "属性一览", "属性模板"], status: "validating" }),
  center("specification-center", "规格中心", { route: "product-home?center=specification-center", icon: "apps", tabs: ["概览", "规格一览", "规格模板"], status: "validating" }),
  center("coding-center", "编码中心", { route: "product-home?center=coding-center", icon: "database", tabs: ["概览", "编码一览", "JAN编码", "商品二维码", "海关编码"], status: "validating" }),
  center("sampling-center", "测样中心", { route: "product-home?center=sampling-center", icon: "standard", tabs: ["概览", "测样一览", "测样模板"], status: "validating" }),
  center("procurement-center", "采购中心", { route: "product-home?center=procurement-center", icon: "store", tabs: ["概览", "采购需求", "采购一览", "采购流水"], status: "validating" }),
  center("inventory-center", "库存中心", { route: "product-home?center=inventory-center", icon: "database", tabs: ["概览", "库存一览", "库存流水", "库存规则"], status: "validating" }),
  center("order-center", "订单中心", { route: "product-home?center=order-center", icon: "orders", tabs: ["概览", "订单一览"], status: "active" }),
  center("operations-center", "运营中心", { route: "product-home?center=operations-center", icon: "analysis", tabs: ["概览", "运营一览", "定价策略"], status: "validating" }),
  center("service-center", "客服中心", { route: "product-home?center=service-center", icon: "customer", tabs: ["概览", "问题一览"], status: "validating" })
]);

export const SHARED_HOME_CENTERS = Object.freeze([
  center("shared-file-center", "文件中心", { tabs: ["全部", "文档", "PDF", "演示文稿", "压缩文件", "其他文件"], defaultView: "list" }),
  center("shared-image-center", "图片中心", { tabs: ["全部", "商品图片", "场景图片", "模特图片", "品牌图片", "企业图片", "宣传图片", "素材图片"], defaultView: "grid" }),
  center("shared-icon-center", "图标中心", { tabs: ["全部", "系统图标", "业务图标", "状态图标", "品牌图标", "商品图标"], defaultView: "grid" }),
  center("shared-table-center", "表格中心", { tabs: ["全部", "业务表格", "导入表格", "导出表格", "数据表格", "报表", "计算表"], defaultView: "table" }),
  center("shared-brand-asset-center", "品牌资产中心", { tabs: ["全部", "Logo", "商标", "品牌视觉", "品牌字体", "品牌色", "包装资产", "品牌资料包"], defaultView: "grid" }),
  center("shared-data-center", "数据中心", { tabs: ["全部", "数据集", "数据文件", "数据接口", "数据源", "报表数据", "外部数据"], defaultView: "table" }),
  center("shared-code-center", "代码中心", { tabs: ["全部", "项目代码", "组件", "模板代码", "脚本", "Skill", "Agent", "自动化"], defaultView: "list" }),
  center("shared-application-center", "应用中心", { tabs: ["全部", "内部系统", "外部平台", "办公应用", "电商平台", "物流应用", "AI应用", "开发工具"], defaultView: "grid" }),
  center("shared-template-center", "模板中心", { tabs: ["全部", "文档模板", "表格模板", "PPT模板", "图片模板", "设计模板", "邮件模板", "AI提示模板", "业务模板"], defaultView: "grid" })
]);

export const HOME_REGISTRY = Object.freeze({
  company: home("company", "美和之家", { governance: "locked" }),
  "business-home": home("business-home", "事业之家", { governance: "locked" }),
  work: home("work", "工作之家", {
    template: "personal-work-home",
    management: false,
    personalCapabilities: ["我的工作", "我的安排", "我的互动", "我的学习", "我的建议", "我的创新", "我的总结", "全部工作", "工作记录"],
    governance: "locked"
  }),
  "talent-home": home("talent-home", "人才之家", { governance: "validating" }),
  "ai-home": home("ai-home", "AI之家", { governance: "validating" }),
  "product-home": home("product-home", "商品之家", { centers: PRODUCT_HOME_CENTERS, management: false, governance: "locked" }),
  "relations-home": home("relations-home", "往来之家", { governance: "validating" }),
  "channel-home": home("channel-home", "渠道之家", { governance: "validating" }),
  "finance-home": home("finance-home", "财务之家", { governance: "validating" }),
  analysis: home("analysis", "分析之家", { governance: "validating" }),
  "knowledge-home": home("knowledge-home", "知识之家", { governance: "validating" }),
  "shared-home": home("shared-home", "共享之家", { centers: SHARED_HOME_CENTERS, governance: "validating" })
});

export const HOME_IDS = Object.freeze(Object.keys(HOME_REGISTRY));
export const LOCKED_HOME_IDS = Object.freeze(HOME_IDS.filter((id) => HOME_REGISTRY[id]?.governance === "locked"));
export const VALIDATING_HOME_IDS = Object.freeze(HOME_IDS.filter((id) => HOME_REGISTRY[id]?.governance === "validating"));

export function getHomeDefinition(homeId) { return HOME_REGISTRY[homeId] || null; }
export function getHomeGovernanceState(homeId) { return HOME_REGISTRY[homeId]?.governance || null; }
export function isHomeLocked(homeId) { return getHomeGovernanceState(homeId) === "locked"; }
export function isHomeRoute(routeId) { return Boolean(HOME_REGISTRY[routeId]); }
