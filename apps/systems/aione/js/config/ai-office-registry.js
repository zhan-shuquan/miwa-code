/* ========================================
   AI Office Registry｜岗位AI办公室注册表 V1
   一套办公室底座，多岗位Context；AI秘书是办公室最高AI调度层，最终责任归人类岗位负责人。
======================================== */

const office = (code, name, options = {}) => Object.freeze({
  code,
  name,
  type: options.type || "业务岗位AI办公室",
  humanOwnerRole: options.humanOwnerRole || "对应人类岗位负责人",
  aiSecretary: options.aiSecretary || "AI秘书",
  status: options.status || "预设",
  scope: options.scope || "待验证",
  primaryGoals: Object.freeze([...(options.primaryGoals || [])]),
  aiPositions: Object.freeze([...(options.aiPositions || [])]),
  allowedToolGroups: Object.freeze([...(options.allowedToolGroups || ["context", "knowledge", "work", "analysis"])])
});

export const AI_OFFICE_DEFINITIONS = Object.freeze([
  office("chairman", "会长兼董事长AI办公室", {
    type: "管理岗位AI办公室",
    humanOwnerRole: "会长兼董事长",
    status: "验证中",
    scope: "集团经营、AIONE建设、人才、资金、重大项目与关键决策",
    primaryGoals: ["识别当前最重要事项", "跨系统汇总事实", "提出有证据的经营判断", "经人确认后推进执行"],
    aiPositions: ["AI经营分析岗位", "AI财务分析岗位", "AI人才管理岗位", "AI项目管理岗位", "AI知识管理岗位", "AI风险检查岗位"]
  }),
  office("cross-border-lead", "跨境负责人AI办公室", {
    humanOwnerRole: "跨境负责人",
    scope: "跨境电商经营、店铺、商品、采购、库存、订单与售后",
    aiPositions: ["AI运营岗位", "AI选品岗位", "AI采购岗位", "AI库存分析岗位", "AI客服岗位"]
  }),
  office("wholesale-lead", "批发负责人AI办公室", {
    humanOwnerRole: "批发负责人",
    scope: "日本批发商品、客户、商谈、订单、出货、回款与经营结果",
    aiPositions: ["AI商品分析岗位", "AI客户分析岗位", "AI报价辅助岗位", "AI订单跟进岗位"]
  }),
  office("operations", "运营岗位AI办公室", {
    humanOwnerRole: "运营岗位负责人",
    scope: "店铺、商品、广告、活动、销量、客户反馈与经营结果",
    aiPositions: ["AI店铺分析岗位", "AI商品运营岗位", "AI广告分析岗位", "AI异常检查岗位"]
  }),
  office("procurement", "采购岗位AI办公室", {
    humanOwnerRole: "采购岗位负责人",
    scope: "供应商、采购、成本、交期、库存关联与采购异常",
    aiPositions: ["AI供应商分析岗位", "AI采购成本岗位", "AI交期跟踪岗位", "AI异常检查岗位"]
  }),
  office("design", "设计岗位AI办公室", {
    humanOwnerRole: "设计岗位负责人",
    scope: "视觉设计任务、素材、商品表达、质量检查与交付",
    aiPositions: ["AI设计辅助岗位", "AI素材整理岗位", "AI文案检查岗位"]
  }),
  office("service", "客服岗位AI办公室", {
    humanOwnerRole: "客服岗位负责人",
    scope: "客户咨询、售后、退换、异常、FAQ与服务质量",
    aiPositions: ["AI客服辅助岗位", "AI售后判断岗位", "AI知识检索岗位", "AI风险检查岗位"]
  })
]);

const OFFICE_BY_CODE = new Map(AI_OFFICE_DEFINITIONS.map((item) => [item.code, item]));

export function getAIOfficeByCode(code) {
  return OFFICE_BY_CODE.get(code) || OFFICE_BY_CODE.get("chairman");
}

export function resolveAIOfficeForIdentity(identity = {}) {
  if (identity.subjectId === "86000") return getAIOfficeByCode("chairman");
  const text = `${identity.primaryWorkIdentity || ""} ${identity.workAssignment?.primaryResponsibility || ""}`;
  if (/批发|卸売/.test(text)) return getAIOfficeByCode("wholesale-lead");
  if (/采购|仕入/.test(text)) return getAIOfficeByCode("procurement");
  if (/设计|视觉/.test(text)) return getAIOfficeByCode("design");
  if (/客服|售后/.test(text)) return getAIOfficeByCode("service");
  if (/运营|店/.test(text)) return getAIOfficeByCode("operations");
  if (/跨境|物流/.test(text)) return getAIOfficeByCode("cross-border-lead");
  return getAIOfficeByCode("chairman");
}

export function toAIOfficeObjects() {
  return AI_OFFICE_DEFINITIONS.map((item) => ({
    id: `AI-OFFICE-${item.code}`,
    name: item.name,
    type: item.type,
    humanOwnerRole: item.humanOwnerRole,
    aiSecretary: item.aiSecretary,
    scope: item.scope,
    state: item.status,
    aiPositions: item.aiPositions.join(" / "),
    result: item.status === "验证中" ? "由真实岗位负责人验证" : "等待真实岗位与业务验证"
  }));
}
