// Business-approved bootstrap defaults (2026-10-14); live truth is Cloud SQL, not this module.
export const INITIAL_PARAMETERS = {
  version: 'AIONE-PARAM-20260822-02', updatedBy: '系统建议值', updatedAt: '2026-08-22T13:43:00+09:00',
  platform: { defaultLanguage: 'zh-CN', timeZone: 'Asia/Tokyo', pageSize: 12 },
  governance: { inheritanceEnabled: true, defaultScope: 'group' },
  permissions: { mode: 'open', defaultDataScope: 'group', allowCreate: true, allowImport: true, allowExport: true, auditSensitiveExport: true },
  dictionaries: {
    customerTypes: ['批发客户','电商客户','美和留学客户','物流客户','不动产客户','商务咨询客户'],
    supplierTypes: ['商品供应商','服务供应商','物流供应商','其他供应商'],
    applicationTypes: ['业务系统','物流应用','办公协作','云盘/文件','采购/购物平台','邮箱/通讯','其他应用'],
    storeTypes: ['跨境电商店铺','实体/线下店铺','其他事业店铺'],
    expenseTypes: ['固定支出','经营支出','采购成本','物流费用','人员费用','应用费用','广告费用','现金支出'],
    incomeTypes: ['电商销售收入','批发收入','服务收入','其他收入'],
    cashExpenseSources: ['Money软件导入','Excel/CSV导入','手工补录'],
    talentTypes: ['正式员工','兼职/时薪','其他内部协作'],
    categoryTypes: ['有形商品分类','无形业务分类','其他分类'],
    productTypes: ['有形商品','无形商品/服务','其他商品'],
    aiCapabilityTypes: ['AI人才','Skill','Agent','Connector','传统自动化/API','Computer Use'],
    sharedResourceTypes: ['应用','工具','知识','代码','数据','模板','连接','服务','其他'],
    miwaContentTypes: ['企业介绍','美和精神','美和准则','美和传承','发展历程','集团事业','组织与品牌','企业资料'],
    knowledgeContentTypes: ['帮助中心','方法论','标准','制度','SOP','业务知识','培训资料','案例/研究','系统/AI知识'],
    notificationTypes: ['重要通知','会议通知','制度/规则通知','业务通知','系统通知']
  },
  business: { priorityTypeCount: 3, overviewActionEnabled: true, createActionEnabled: true, requireMiwaNineElements: true },
  finance: { defaultCurrency: 'JPY', moneyFactRequired: true, autoAggregateExpense: true, autoAggregateIncome: true },
  assets: { checkStoreLinks: true, checkApplicationLinks: true, accountCompletenessReminder: true },
  io: { allowCsv: true, allowExcel: true, duplicateCheck: true, keepSourceId: true },
  notifications: { autoNotifyOnCreate: true, defaultScope: '相关人员', importantRequiresAck: true },
  ai: { pageAssistantEnabled: true, autoClassify: true, autoFillConfidence: 85, humanConfirmHighRisk: true },
  audit: { versionHistory: true, changeReasonRequired: true, lockedRuleProtection: true },
  common: {
    cnyToJpyRate: 25, internationalFreightRate: 20, packageCostPerSaleSetJPY: 50, importMiscRate: 10,
    returnLossRate: 3, settlementFeeRate: 0, consumptionTaxRate: 10, costSafetyBufferRate: 1,
    directShippingFirstWeightGram: 500, directShippingFirstWeightFeeCNY: 35,
    directShippingAdditionalWeightUnitGram: 500, directShippingAdditionalWeightFeeCNY: 7
  },
  shop: { platformFeeRate: 10, advertisingRate: 0, couponRate: 0, pointRate: 0, otherOperatingCostJPY: 0, pricingScenario: 'normal' },
  delivery: {
    THIN_3CM: { name: '3cm薄型', fee: 200, enabled: true, sortOrder: 1 }, SIZE_60: { name: '60サイズ', fee: 500, enabled: true, sortOrder: 2 },
    SIZE_80: { name: '80サイズ', fee: 600, enabled: true, sortOrder: 3 }, SIZE_100: { name: '100サイズ', fee: 700, enabled: true, sortOrder: 4 },
    SIZE_120: { name: '120サイズ', fee: 800, enabled: true, sortOrder: 5 }
  },
  pricing: {
    minimumGrossMarginRate: 50, targetContributionProfitJPY: 500, targetContributionMarginRate: 30,
    directSelectionMinimumProfitJPY: 500, officialRetailMarkupRate: 50, officialRetailHighMarkupRate: 100,
    minimumCampaignContributionMarginRate: 15, normalDisposalLossRate: 30, maximumDisposalLossRate: 50,
    selectionPassScore: 70, priceRoundingUnit: 0, priceEndingRule: 80
  }
,commerce:{
  "logistics": {
    "air_direct_normal": {
      "name": "空运直发（普货）",
      "fulfillment": "direct",
      "billing": "step",
      "firstWeightG": 500,
      "firstFeeCny": 35,
      "additionalWeightG": 500,
      "additionalFeeCny": 7
    },
    "air_direct_special": {
      "name": "空运直发（特殊）",
      "fulfillment": "direct",
      "billing": "step",
      "firstWeightG": 500,
      "firstFeeCny": 45,
      "additionalWeightG": 500,
      "additionalFeeCny": 15
    },
    "air_small_normal": {
      "name": "空运小件（普货）",
      "fulfillment": "warehouse",
      "billing": "step",
      "firstWeightG": 500,
      "firstFeeCny": 35,
      "additionalWeightG": 500,
      "additionalFeeCny": 7
    },
    "air_small_special": {
      "name": "空运小件（特殊）",
      "fulfillment": "warehouse",
      "billing": "step",
      "firstWeightG": 500,
      "firstFeeCny": 45,
      "additionalWeightG": 500,
      "additionalFeeCny": 15
    },
    "air_large_normal": {
      "name": "空运大件（普货）",
      "fulfillment": "warehouse",
      "billing": "kg",
      "perKgCny": 20
    },
    "air_large_special": {
      "name": "空运大件（特殊）",
      "fulfillment": "warehouse",
      "billing": "kg",
      "perKgCny": 25
    },
    "sea_large_normal": {
      "name": "海运大件（普货）",
      "fulfillment": "warehouse",
      "billing": "kg",
      "perKgCny": 10
    },
    "sea_large_special": {
      "name": "海运大件（特殊）",
      "fulfillment": "warehouse",
      "billing": "kg",
      "perKgCny": 12
    }
  },
  "chinaPackagingCny": {
    "原装": 0,
    "真空包装": 2,
    "重新包装": 1
  },
  "japanPackagingJpy": {
    "无": 0,
    "A4信封": 11,
    "A4缓冲信封": 30,
    "小缓冲信封": 9,
    "小信封": 4,
    "3cm纸盒": 30,
    "60cm纸箱": 30,
    "80cm纸箱": 40,
    "100cm纸箱": 85,
    "120cm纸箱": 0
  },
  "tariffRatePct": 10,
  "productMarginTargetPct": 40,
  "operatingMarginTargetPct": 20,
  "priceRoundUnitJpy": 100,
  "priceTailJpy": 80
}
};
