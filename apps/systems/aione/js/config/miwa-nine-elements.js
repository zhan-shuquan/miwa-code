/* ========================================
   MIWA 9 Elements｜美和9要素统一定义
   固定顺序不可由页面改变；解释与分析顺序可以按管理重点灵活调整。
======================================== */
export const MIWA_NINE_ELEMENTS = Object.freeze([
  { key: "goal", label: "目标", question: "为什么做、要达到什么？" },
  { key: "people", label: "人", question: "谁负责、谁执行、涉及谁？" },
  { key: "object", label: "物", question: "管理什么业务对象或资源？" },
  { key: "matter", label: "事", question: "具体做什么、经过什么流程？" },
  { key: "platform", label: "平台", question: "在哪里完成、依赖什么系统、事业或渠道？" },
  { key: "time", label: "时间", question: "什么时候开始、截止、周期和时效？" },
  { key: "money", label: "钱", question: "是否涉及金额；有、待确认或不涉及？" },
  { key: "information", label: "信息", question: "依据什么数据、资料、规则和证据？" },
  { key: "result", label: "结果", question: "最终产生什么结果和状态迁移？" }
]);

export const MIWA_NINE_ELEMENT_KEYS = Object.freeze(MIWA_NINE_ELEMENTS.map((item) => item.key));
export const MIWA_NINE_ELEMENT_LABELS = Object.freeze(Object.fromEntries(MIWA_NINE_ELEMENTS.map((item) => [item.key, item.label])));
