/* AI Office Registry｜Backend V1 */
export const AI_OFFICES = Object.freeze({
  chairman: Object.freeze({ code:"chairman", name:"会长兼董事长AI办公室", humanOwnerRole:"会长兼董事长", status:"validating", scope:"集团经营、AIONE建设、人才、资金、重大项目与关键决策" }),
  "cross-border-lead": Object.freeze({ code:"cross-border-lead", name:"跨境负责人AI办公室", humanOwnerRole:"跨境负责人", status:"preset", scope:"跨境电商经营与业务闭环" }),
  "wholesale-lead": Object.freeze({ code:"wholesale-lead", name:"批发负责人AI办公室", humanOwnerRole:"批发负责人", status:"preset", scope:"日本批发经营与业务闭环" }),
  operations: Object.freeze({ code:"operations", name:"运营岗位AI办公室", humanOwnerRole:"运营岗位负责人", status:"preset", scope:"店铺、商品、广告、活动与经营结果" }),
  procurement: Object.freeze({ code:"procurement", name:"采购岗位AI办公室", humanOwnerRole:"采购岗位负责人", status:"preset", scope:"供应商、采购、成本、交期与库存关联" }),
  design: Object.freeze({ code:"design", name:"设计岗位AI办公室", humanOwnerRole:"设计岗位负责人", status:"preset", scope:"视觉设计、素材、质量与交付" }),
  service: Object.freeze({ code:"service", name:"客服岗位AI办公室", humanOwnerRole:"客服岗位负责人", status:"preset", scope:"客户咨询、售后、异常与服务质量" })
});
export function getAIOffice(code) { return AI_OFFICES[code] || AI_OFFICES.chairman; }
