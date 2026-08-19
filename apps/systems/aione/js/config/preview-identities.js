/* ========================================
   AIONE Preview Identities｜AIONE内测身份
   内测原则：全开放、强归属、重记录、后收权。
   所有内测成员可查看与体验全部AIONE内测业务平台；
   身份的主要作用是把工作、任务、结果与贡献归属到正确的人。
======================================== */

const PREVIEW_ALL_PERMISSIONS = Object.freeze([
  "analysis.view",
  "product-center.view",
  "ai-center.view",
  "platform-center.view",
  "settings.manage",
  "preview.all"
]);

function person({
  subjectId,
  email,
  displayName,
  initial,
  primaryWorkIdentity,
  positionGrade = "",
  locationName,
  timeZone,
  workAssignment
}) {
  return Object.freeze({
    subjectType: "person",
    subjectId,
    email,
    displayName,
    initial,
    primaryWorkIdentity,
    positionGrade,
    locationName,
    timeZone,
    permissions: Object.freeze([...PREVIEW_ALL_PERMISSIONS]),
    scopes: Object.freeze({
      businessSpaces: Object.freeze(["all"]),
      stores: Object.freeze(["all"]),
      dataLevel: "preview-all",
      decisionLevel: "preview-all"
    }),
    workAssignment: Object.freeze(workAssignment)
  });
}

export const PREVIEW_IDENTITIES = Object.freeze([
  person({
    subjectId: "86000",
    email: "mcpu2024@gmail.com",
    displayName: "占树全",
    initial: "占",
    primaryWorkIdentity: "系统开发者 / 经营者 / 管理者",
    positionGrade: "P9",
    locationName: "东京",
    timeZone: "Asia/Tokyo",
    workAssignment: {
      primaryResponsibility: "AIONE平台建设 / 集团经营与管理",
      businessUnit: "集团经营",
      store: "全部",
      evaluationFocus: "平台建设、经营决策、管理结果"
    }
  }),
  person({
    subjectId: "86001",
    email: "15105034553l@gmail.com",
    displayName: "占金玲",
    initial: "占",
    primaryWorkIdentity: "中国经营管理",
    locationName: "福建",
    timeZone: "Asia/Shanghai",
    workAssignment: {
      primaryResponsibility: "中国公司经营管理 / 跨境电商协调",
      businessUnit: "美和中国 / 跨境电商",
      store: "全部",
      evaluationFocus: "经营管理、协调、任务与结果"
    }
  }),
  person({
    subjectId: "86002",
    email: "ccemilla0829@gmail.com",
    displayName: "梁统剑",
    initial: "梁",
    primaryWorkIdentity: "1号店「幸せ屋」运营",
    locationName: "福建",
    timeZone: "Asia/Shanghai",
    workAssignment: {
      primaryResponsibility: "1号店「幸せ屋」运营",
      businessUnit: "跨境电商",
      store: "幸せ屋",
      evaluationFocus: "店铺运营任务、完成量、经营结果"
    }
  }),
  person({
    subjectId: "86003",
    email: "foreverfish26@gmail.com",
    displayName: "于硕",
    initial: "于",
    primaryWorkIdentity: "跨境物流",
    locationName: "东京",
    timeZone: "Asia/Tokyo",
    workAssignment: {
      primaryResponsibility: "跨境物流 / 出货协同",
      businessUnit: "跨境电商",
      store: "全部",
      evaluationFocus: "物流任务、异常处理、时效与结果"
    }
  }),
  person({
    subjectId: "86004",
    email: "lby13606017336@gmail.com",
    displayName: "刘冰燕",
    initial: "刘",
    primaryWorkIdentity: "视觉设计",
    locationName: "福建",
    timeZone: "Asia/Shanghai",
    workAssignment: {
      primaryResponsibility: "视觉设计",
      businessUnit: "跨境电商",
      store: "全部",
      evaluationFocus: "设计任务、完成量、质量与协作"
    }
  }),
  person({
    subjectId: "86005",
    email: "yamadakiyohara@gmail.com",
    displayName: "陈永航",
    initial: "陈",
    primaryWorkIdentity: "2号店「PrimeLife」运营",
    locationName: "福建",
    timeZone: "Asia/Shanghai",
    workAssignment: {
      primaryResponsibility: "2号店「PrimeLife」运营",
      businessUnit: "跨境电商",
      store: "PrimeLife",
      evaluationFocus: "店铺运营任务、完成量、经营结果"
    }
  }),
  person({
    subjectId: "86018",
    email: "sly1252@gmail.com",
    displayName: "单利影",
    initial: "单",
    primaryWorkIdentity: "集团经营 / 日本经营管理",
    locationName: "东京",
    timeZone: "Asia/Tokyo",
    workAssignment: {
      primaryResponsibility: "集团经营 / 日本经营管理",
      businessUnit: "美和日本",
      store: "全部",
      evaluationFocus: "经营管理、任务、决策与结果"
    }
  }),
  Object.freeze({
    subjectType: "admin",
    subjectId: "ADM-CORP-001",
    email: "info@miwa-happyhouse.com",
    displayName: "美和公司管理账户",
    initial: "美",
    primaryWorkIdentity: "平台管理",
    positionGrade: "",
    locationName: "东京",
    timeZone: "Asia/Tokyo",
    permissions: Object.freeze([...PREVIEW_ALL_PERMISSIONS, "admin.platform"]),
    scopes: Object.freeze({
      businessSpaces: Object.freeze(["all"]),
      stores: Object.freeze(["all"]),
      dataLevel: "preview-all",
      decisionLevel: "preview-all"
    }),
    workAssignment: Object.freeze({
      primaryResponsibility: "平台管理与预演支持",
      businessUnit: "AIONE平台",
      store: "全部",
      evaluationFocus: "平台管理（不作为个人绩效主体）"
    })
  })
]);

export function findPreviewIdentity(subjectId) {
  return PREVIEW_IDENTITIES.find((item) => item.subjectId === subjectId) || null;
}

export function findPreviewIdentityByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;
  return PREVIEW_IDENTITIES.find((item) => item.email.toLowerCase() === normalizedEmail) || null;
}
