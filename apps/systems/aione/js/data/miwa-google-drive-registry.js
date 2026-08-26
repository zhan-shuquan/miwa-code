/* ========================================
   MIWA Google Drive Registry｜美和之家 Drive 镜像目录 V1.9.25
   目标：AIONE目录 = Google Drive目录；页面、资料原件与未来美和AI共用同一File ID索引。
======================================== */

const driveViewUrl = (fileId) => `https://drive.google.com/open?id=${encodeURIComponent(fileId)}`;

export const MIWA_DRIVE_FOLDERS = Object.freeze({
  groupAssetsRoot: Object.freeze({ id:"1g9lVAs_yuZmGrtX8JMj_9twQW86e8E0O", name:"美和集团资产库｜MIWA Group Assets" }),
  companyHomeRoot: Object.freeze({ id:"1frlFd1Q_pN_cysX-WDbmlzmPc_NfyodC", name:"美和之家｜AIONE内容源" }),
  overview: Object.freeze({ id:"1J5r13Ldv5QSp2xy7jDiplGktcS69nbeI", name:"00_美和概览" }),
  introduction: Object.freeze({ id:"1AkK-ylMzCFMcUDH_5DUmJnDCBWuIrPj2", name:"01_集团介绍" }),
  philosophy: Object.freeze({ id:"1BYngefyai-8R-wLsWHoCs3QSJLSZISdA", name:"02_理念与文化" }),
  strategy: Object.freeze({ id:"1_T1066BhJStYkxe_VlIyoG1ab_uR53y9", name:"03_经营与战略" }),
  businessGlobal: Object.freeze({ id:"1nc_iAUmvXs8d3rNPJLGlMx8F6ijpU32h", name:"04_事业与全球" }),
  governance: Object.freeze({ id:"1fLuJjh_qCnIldbBQ6XDNqxCip2_2fdTD", name:"05_组织与治理" }),
  brandValue: Object.freeze({ id:"1JKlhDN4U3D2tXausQcE7ih0BPNVPpr-7", name:"06_品牌与价值" }),
  development: Object.freeze({ id:"1Bx3M9TDK4poUbYXv-upaC-7VScfkO-Pf", name:"07_发展与动态" }),
  assets: Object.freeze({ id:"15zRYJqedh75GkLB8rkMifwzfibz0iRkG", name:"08_企业资料" }),
  external: Object.freeze({ id:"1-njbhV1Eck6i3D1u03itjxrV4LXXNUQJ", name:"09_外部连接" }),

  companyPositioning: Object.freeze({ id:"1fhjwUqM0kS5kqbAr4xllLWUJ3hLuVtwO", name:"集团定位" }),
  companySummary: Object.freeze({ id:"1r0YMZUegF9R4CLXxKlbi0qphTHDQK9s-", name:"集团简介" }),
  companyProfile: Object.freeze({ id:"1AOSwIVse33VmyKQxJ4Yn_0G-ta-7sjRr", name:"会社概要" }),
  companyOrganization: Object.freeze({ id:"1vqLZJDVyyjVRbdiZUxOr9VGjS282x4GY", name:"集团组织" }),

  companySpirit: Object.freeze({ id:"1Te_2GGdagC5Eaj3hfe-56Xykr8HRahGn", name:"美和灵魂" }),
  companyPrinciples: Object.freeze({ id:"1oz6yVzFTkrG7C4k9_ACgmOvXFKb4ppbb", name:"美和准则" }),
  companyHeritage: Object.freeze({ id:"1E0w_fNEysz2tqJH21_ovf76UtwHpjt8B", name:"美和传承" }),

  managementArchitecture: Object.freeze({ id:"1IqqUAdkQL8-xfZz_chY4eT2wBqw37J8h", name:"经营架构" }),
  developmentStrategy: Object.freeze({ id:"1kDCOs1w5-hLCmSxgcvWMNTXniwYuwxok", name:"发展战略" }),
  developmentPlan: Object.freeze({ id:"1WihUfV8LiQ3wUGVDCI3PuNqDEm-z_Uay", name:"发展规划" }),

  businessMap: Object.freeze({ id:"1Wuyioycq1AtNuiwQixpDVv4cafxMS0Hi", name:"事业版图" }),
  globalLayout: Object.freeze({ id:"1SgFbN_l7Ppfv9DGqEqOW2UltOPAHbFw9", name:"全球布局" }),
  companyLocations: Object.freeze({ id:"1JR4KYNZ_7tFo5cPdnEI0WOLF4iYiIAzE", name:"公司与据点" }),

  governanceStructure: Object.freeze({ id:"1PgCZ5LhDUNd5N5gKIFSIflkdWSiLo545", name:"治理架构" }),
  leadership: Object.freeze({ id:"14z5LVgdcwnzQHi-S8Sqym01zfqXIiGlE", name:"经营团队" }),
  compliance: Object.freeze({ id:"1-_Dp7hxbuWTX7FDzVqz6CQEsbIuSSAPA", name:"合规原则" }),

  brandSystem: Object.freeze({ id:"1tXuTZjuegfMGbNgQMd_GZFfjXBZAf_qU", name:"品牌体系" }),
  companyImage: Object.freeze({ id:"1TcdSby2Pqe-Xu__-ZkjCtq8Rgt8ga1SV", name:"企业形象" }),
  responsibility: Object.freeze({ id:"1DCxonh8cmhqNOq5gAMp8RQA3YLEOafSl", name:"社会责任" }),

  history: Object.freeze({ id:"1HC3jwj_nZoR6QG66FL9K9GJ6riCj88a9", name:"发展历程" }),
  milestones: Object.freeze({ id:"1kTfFh1j4Y5Ye50mdI6rX0Nt3O052YF7k", name:"重要里程碑" }),
  groupUpdates: Object.freeze({ id:"1Zv5y0tq0n41cQ-ouuJNLbrXztHJxpfwg", name:"集团动态" }),

  companyDocuments: Object.freeze({ id:"1qYeXFsIgHc-kKCEkS6lZV_yZAUK8u4in", name:"公司资料" }),
  groupCoreAssets: Object.freeze({ id:"19na53zaVPoZSQcKYLDaVxkfbIxiX51Ty", name:"集团核心资料" }),
  brandGuidelines: Object.freeze({ id:"1a-pct0GVU9A_-kVtJOaKa6EwekEbXVYO", name:"品牌规范" }),
  publicAssets: Object.freeze({ id:"1NRGrNsjPcMpVpCaMAsz8SCnwlHyy-4hH", name:"公开资料" })
});

const CORE_ASSET_ROWS = Object.freeze({
  "army-architecture": ["1sRwEREfX3EZJFxUUMVyd51soLrfWebwa", "00_美和集团现代企业军团总架构_V0.1.pptx"],
  "army-overview": ["1qMz_tnXQCEWmcOXYxCYNFRLhw3akTePw", "01_美和集团现代企业军团总纲_V0.1.docx"],
  "army-staffing": ["17F5AlhA38QJxCc-rloI8u-bAdqEEIUqa", "02_美和集团现代企业军团编制总表_V0.1.xlsx"],
  "command-map": ["1uS9H84s5p4Ftz2VF75Dm5ewV8qR57WIs", "03_美和集团现代企业军团作战指挥关系图_V0.1.pdf"],
  "supplies-strategy": ["1zW5IxyejoD7OQdjxPmByG8fr17vHgb5r", "04_美和集团军需与战略粮草体系_V0.1.docx"],
  "battle-loop": ["119SN7ppUszT_MEI-zjKx8i1_QcGD_vOY", "05_美和集团现代企业军团标准作战流程与经营闭环_V0.1.pdf"],
  "ai-talent-army": ["1_uGM-2AXzJciSO9BnojGmEDalmuKj-bM", "06_美和集团AI人才军团体系_V0.1.docx"],
  "intel-decision": ["1ZVlRrlIPuPYpJE3N5fhaD3UMlEKdeUIE", "07_美和集团情报与决策体系_V0.1.docx"],
  "market-battle": ["1ziDO0amOuy6J1dEnGEdBb8x4wh39IgLA", "08_美和集团宣传与市场作战体系_V0.1.docx"],
  "digital-logistics": ["1n5XkW9SayIuDO0q1dU0zoqj9SN1_X8kS", "09_美和集团数字后勤与基础设施体系_V0.1.docx"]
});

export const MIWA_DRIVE_CORE_ASSETS = Object.freeze(Object.fromEntries(
  Object.entries(CORE_ASSET_ROWS).map(([key, [fileId, fileName]]) => [key, Object.freeze({
    key,
    storage:"google-drive",
    provider:"Google Drive",
    fileId,
    fileName,
    folderId:MIWA_DRIVE_FOLDERS.groupCoreAssets.id,
    folderName:MIWA_DRIVE_FOLDERS.groupCoreAssets.name,
    viewUrl:driveViewUrl(fileId),
    downloadPath:`/api/v1/drive-assets/${encodeURIComponent(key)}/download`,
    boundAt:"2026-08-26"
  })])
));

export function getMiwaDriveAssetBinding(assetId) {
  return MIWA_DRIVE_CORE_ASSETS[assetId] || null;
}

export function getMiwaDriveFolder(folderKey) {
  return MIWA_DRIVE_FOLDERS[folderKey] || null;
}
