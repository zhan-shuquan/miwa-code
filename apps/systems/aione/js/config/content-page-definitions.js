/* ========================================
   MIWA Content Page Definitions｜美和内容母版配置
   内容只保留一份正式对象，可在美和之家、知识之家、帮助、AI与未来出版渠道多处调用。
======================================== */

export const CONTENT_PAGE_DEFINITIONS = Object.freeze({
  company: {
    routeId: "company",
    title: "美和之家",
    icon: "美",
    description: "统一管理美和集团本身的企业认知、精神、准则、发展、事业、组织、品牌与正式企业内容。",
    overviewLabel: "美和概览",
    createLabel: "新建内容",
    objectName: "内容",
    objectPlural: "美和内容",
    typeTitle: "内容类型",
    typeDictionaryKey: "miwaContentTypes",
    types: ["企业介绍", "美和精神", "美和准则", "美和传承", "发展历程", "集团事业", "组织与品牌", "企业资料"],
    metrics: [
      { key: "total", label: "内容总数", source: "objects" },
      { key: "locked", label: "正式锁定", status: "正式锁定" },
      { key: "validating", label: "验证中", status: "验证中" },
      { key: "pending", label: "待整理", status: "待整理" },
      { key: "updated", label: "最近更新", value: "按真实数据" }
    ],
    seedObjects: [
      { id: "MIWA-CONTENT-INTRO", title: "美和集团介绍", type: "企业介绍", status: "待整理", version: "—", owner: "待确认", summary: "集团基本介绍、事业与定位的统一内容入口。", linkType: "internal", url: "" },
      { id: "MIWA-CONTENT-SPIRIT", title: "美和精神", type: "美和精神", status: "待整理", version: "—", owner: "待确认", summary: "美和长期经营与做事方式的精神内核。", linkType: "internal", url: "" },
      { id: "MIWA-CONTENT-PRINCIPLES", title: "美和准则", type: "美和准则", status: "待整理", version: "—", owner: "待确认", summary: "用于指导判断与实践的稳定原则。", linkType: "internal", url: "" },
      { id: "MIWA-CONTENT-HERITAGE", title: "美和传承", type: "美和传承", status: "待整理", version: "—", owner: "待确认", summary: "值得长期传承的精神、方法、责任与成果。", linkType: "internal", url: "" }
    ],
    related: [
      { title: "知识之家", text: "方法论、标准、制度、SOP等知识正文由知识之家统一管理。", route: "knowledge-home" },
      { title: "共享之家", text: "文件、账号、素材、代码等客观资产由共享之家统一管理。", route: "shared-home" }
    ],
    ai: { title: "AI秘书｜美和内容辅助", text: "可协助整理企业介绍、检查内容一致性、生成摘要，并把正式知识引用到正确位置。" }
  },
  "knowledge-home": {
    routeId: "knowledge-home",
    title: "知识之家",
    icon: "知",
    description: "统一新建、管理、维护、检索和版本化美和集团所有知识相关内容，并作为AI与未来出版的正式知识源。",
    overviewLabel: "知识概览",
    createLabel: "新建内容",
    objectName: "知识",
    objectPlural: "知识内容",
    typeTitle: "知识类型",
    typeDictionaryKey: "knowledgeContentTypes",
    types: ["方法论", "标准", "制度", "SOP", "业务知识", "培训资料", "案例/研究", "系统/AI知识"],
    metrics: [
      { key: "total", label: "知识总数", source: "objects" },
      { key: "locked", label: "正式锁定", status: "正式锁定" },
      { key: "validating", label: "验证中", status: "验证中" },
      { key: "pending", label: "待确认", status: "待确认" },
      { key: "updated", label: "最近更新", value: "按真实数据" }
    ],
    seedObjects: [
      { id: "KNOW-MIWA-METHODOLOGY", title: "美和方法论", type: "方法论", status: "验证中", version: "持续演进", owner: "待确认", summary: "指导美和经营、系统建设、AI应用、标准制定、组织与业务设计的最高方法论体系。", linkType: "internal", url: "" },
      { id: "KNOW-MIWA-9", title: "美和9要素", type: "方法论", status: "阶段性锁定", version: "V1", owner: "待确认", summary: "目标、人、物、事、平台、时间、钱、信息、结果；用于业务流程与各种管理的完整性检查。", linkType: "internal", url: "" },
      { id: "KNOW-PPC-PEOPLE", title: "PPC｜人的关系框架", type: "方法论", status: "待整理", version: "—", owner: "待确认", summary: "说明客户之家、人才之家与外部People关系系统在“人”这一上层概念中的关系与边界。", linkType: "internal", url: "" },
      { id: "KNOW-AIONE-TEMPLATES", title: "AIONE二级页面母版与组件体系", type: "系统/AI知识", status: "验证中", version: "V1.3候选", owner: "待确认", summary: "记录Global Shell、唯一Level-2 Empty Base、标准业务/内容Recipe、统一Workspace与高复用组件的设计原则。", linkType: "internal", url: "" }
    ],
    related: [
      { title: "美和之家", text: "企业身份与企业认知由美和之家管理，重要知识只引用不复制。", route: "company" },
      { title: "未来电子书", text: "内容对象保持结构化和版本化，出版时生成版本快照，不重复维护正文。" }
    ],
    ai: { title: "AI秘书｜知识辅助", text: "可协助新建草稿、分类、摘要、关联知识、检查版本冲突，并为培训、帮助、PDF或电子书准备输出。" }
  }
});

export function getContentPageDefinition(routeId) {
  return CONTENT_PAGE_DEFINITIONS[routeId] || null;
}
