/* ========================================
   MIWA System Config｜美和システム設定
   実データ接続後は値だけを差し替え、各コンポーネントを直接変更しない。
======================================== */

export const SYSTEM_ASSET_VERSION = "20260826-v1.9.27-ai-corporate-retrieval";
const versionedComponent = (path) => `${path}?v=${SYSTEM_ASSET_VERSION}`;

export const systemConfig = Object.freeze({
  components: [
    ["mobile-topbar-host", versionedComponent("./components/shell/header/mobile-topbar.html")],
    ["mobile-info-host", versionedComponent("./components/shell/header/mobile-info.html")],
    ["desktop-header-host", versionedComponent("./components/shell/header/desktop-header.html")],
    ["sidebar-host", versionedComponent("./components/shell/primary-navigation/sidebar.html")],
    ["selection-main-host", versionedComponent("./pages/selection-workbench/home.html")],
    ["aside-host", versionedComponent("./components/shell/aside/aside.html")],
    ["desktop-footer-host", versionedComponent("./components/shell/footer/footer.html")],
    ["mobile-bottom-host", versionedComponent("./components/shell/primary-navigation/mobile-bottom.html")],
    ["mobile-drawer-host", versionedComponent("./components/shell/primary-navigation/mobile-drawer.html")],
    ["miwa-ai-layer-host", versionedComponent("./components/shell/ai/miwa-ai-layer.html")],
    ["global-settings-host", versionedComponent("./components/shell/settings/global-settings.html")]
  ],

  header: {
    brand: {
      logoSrc: new URL("../../assets/brand/miwa-commerce-logo.png", import.meta.url).href,
      systemShortName: "AIONE",
      systemFormalName: "美和一体化工作平台",
      companyRoute: "company"
    },

    user: {
      employeeId: "PENDING",
      displayName: "占树全",
      initial: "占",
      primaryWorkIdentity: "经营管理",
      /* 職位等級：職位に紐づく比較的固定のP級 */
      positionGrade: "P9",
      /* 能力等級：経験と実績で変化する独立項目。ヘッダー外層には表示しない */
      capabilityLevel: null,
      avatarUrl: null,
      profileRoute: "employee-profile",
      primaryResponsibility: "集团经营与AIONE平台建设",
      primaryProject: "美和AIONE一体化工作平台",
      legalEntity: "美和商会株式会社",
      locationName: "东京",
      latitude: 35.6762,
      longitude: 139.6503,
      timeZone: "Asia/Tokyo"
    },

    /*
       共通入口は原則公開する。将来制限が必要な場合だけ権限設定から追加する。
       URL未確定項目はnullのまま保持し、偽リンクを作成しない。
    */
    sharedResources: {
      /*
         共享资源仅作为内部管理与注册概念，不作为Header前台页面名称。
         productForm定义产品形态；origin定义内部/外部属性；quickGroup只负责Header第2行自动分隔；
         quickAccess决定是否进入快捷层；headerHidden允许保留资源登记但隐藏Header入口。
      */
      allResourcesRoute: "shared-home",
      quickGroupOrder: ["core", "stores", "logistics", "office", "procurement", "mail"],
      items: [
        { id: "erp", name: "ERP", subtitle: "资源", mark: "E", color: "#176B4D", route: "erp-home", status: "active", productForm: "应用", origin: "内部", quickAccess: true, headerHidden: false, quickGroup: "core", sortOrder: 10, owner: "财务/系统负责人" },
        { id: "hr", name: "HR", subtitle: "人事", mark: "HR", color: "#176B4D", route: "people-home", status: "planned", productForm: "应用", origin: "内部", quickAccess: true, headerHidden: true, quickGroup: "core", sortOrder: 20, owner: "人事负责人" },

        { id: "rakuten-1", name: "幸せ屋", subtitle: "店铺", mark: "幸", color: "#176B4D", url: "https://glogin.rms.rakuten.co.jp/", status: "active", productForm: "应用", origin: "外部", quickAccess: true, headerHidden: false, quickGroup: "stores", sortOrder: 10, owner: "店铺负责人" },
        { id: "rakuten-2", name: "PrimeLife", subtitle: "店铺", mark: "P", color: "#176B4D", url: "https://glogin.rms.rakuten.co.jp/", status: "active", productForm: "应用", origin: "外部", quickAccess: true, headerHidden: false, quickGroup: "stores", sortOrder: 20, owner: "店铺负责人" },
        { id: "rakuten-3", name: "永井GD", subtitle: "店铺", mark: "GD", color: "#176B4D", url: "https://glogin.rms.rakuten.co.jp/", status: "active", productForm: "应用", origin: "外部", quickAccess: true, headerHidden: false, quickGroup: "stores", sortOrder: 30, owner: "店铺负责人" },

        { id: "robot-in", name: "Robot-in", subtitle: "订单", mark: "R", color: "#176B4D", url: "https://sso.cloud-robot.co/login/", status: "active", productForm: "应用", origin: "外部", quickAccess: true, headerHidden: false, quickGroup: "logistics", sortOrder: 10, owner: "订单/物流负责人" },
        { id: "sagawa", name: "佐川", subtitle: "面单", mark: "佐", color: "#176B4D", url: "https://www.e-service.sagawa-exp.co.jp/portal/do/login/show?fr=bs", status: "active", productForm: "工具", origin: "外部", quickAccess: true, headerHidden: false, quickGroup: "logistics", sortOrder: 20, owner: "物流负责人" },
        { id: "yamato", name: "黑猫", subtitle: "面单", mark: "黒", color: "#176B4D", url: "https://newb2web.kuronekoyamato.co.jp/", status: "active", productForm: "工具", origin: "外部", quickAccess: true, headerHidden: false, quickGroup: "logistics", sortOrder: 30, owner: "物流负责人" },
        { id: "fukuyama", name: "福山", subtitle: "日暮里", mark: "福", color: "#176B4D", url: "https://wwwisx.fukutsu.co.jp/iSTARX/?timeout=true", status: "active", productForm: "工具", origin: "外部", quickAccess: true, headerHidden: false, quickGroup: "logistics", sortOrder: 40, owner: "物流负责人" },

        { id: "gpt", name: "GPT", subtitle: "办公", mark: "AI", color: "#176B4D", url: "https://chatgpt.com/", status: "active", productForm: "应用", origin: "外部", quickAccess: true, headerHidden: false, quickGroup: "office", sortOrder: 10, owner: "系统负责人" },
        { id: "wps", name: "WPS", subtitle: "办公", mark: "W", color: "#176B4D", url: "https://www.kdocs.cn/latest", status: "active", productForm: "应用", origin: "外部", quickAccess: true, headerHidden: false, quickGroup: "office", sortOrder: 20, owner: "系统负责人" },
        { id: "feishu", name: "飞书", subtitle: "办公", mark: "飞", color: "#176B4D", url: null, status: "active", productForm: "应用", origin: "外部", quickAccess: true, headerHidden: false, quickGroup: "office", sortOrder: 30, owner: "系统负责人" },
        { id: "google-drive", name: "Google Drive", subtitle: "云盘", mark: "D", color: "#176B4D", url: "https://drive.google.com/", status: "active", productForm: "应用", origin: "外部", quickAccess: true, headerHidden: false, quickGroup: "office", sortOrder: 40, owner: "系统负责人" },

        { id: "amazon", name: "亚马逊", subtitle: "采购", mark: "A", color: "#176B4D", url: "https://www.amazon.co.jp/", status: "active", productForm: "服务", origin: "外部", quickAccess: true, headerHidden: false, quickGroup: "procurement", sortOrder: 10, owner: "采购负责人" },
        { id: "rakuten-shopping", name: "乐天", subtitle: "采购", mark: "楽", color: "#176B4D", url: "https://www.rakuten.co.jp/", status: "active", productForm: "服务", origin: "外部", quickAccess: true, headerHidden: false, quickGroup: "procurement", sortOrder: 20, owner: "采购负责人" },
        { id: "hako-one", name: "箱ワン", subtitle: "采购", mark: "箱", color: "#176B4D", url: "https://www.notosiki.co.jp/mypage/login", status: "active", productForm: "服务", origin: "外部", quickAccess: true, headerHidden: false, quickGroup: "procurement", sortOrder: 30, owner: "采购负责人" },

        { id: "gmail", name: "Gmail", subtitle: "邮箱", mark: "G", color: "#176B4D", url: "https://mail.google.com/mail/u/0/#inbox", status: "active", productForm: "应用", origin: "外部", quickAccess: true, headerHidden: false, quickGroup: "mail", sortOrder: 10, owner: "系统负责人" },

        { id: "aione-nav-standard", name: "AIONE导航规范", subtitle: "帮助中心", mark: "知", color: "#176B4D", route: "knowledge-home?type=帮助中心", status: "active", productForm: "知识", origin: "内部", quickAccess: false, headerHidden: true, quickGroup: "", sortOrder: 0, owner: "AIONE平台架构" },
        { id: "aione-code", name: "AIONE代码资产", subtitle: "GitHub", mark: "</>", color: "#176B4D", url: "https://github.com/", status: "active", productForm: "代码", origin: "内部", quickAccess: false, headerHidden: true, quickGroup: "", sortOrder: 0, owner: "系统负责人" }
      ]
    },

    /* 扩展之家只有在真实配置后才显示“更多”，不为空占位。 */
    moreHomes: [],

    spiritContent: {
      "miwa-spirit": {
        kicker: "美和精神",
        title: "美和精神",
        description: "美和精神，是美和在长期实践中形成并持续验证的共同做事精神。它以美和准则、美和灵魂和美和传承为根基，以一体化、标准化、流程化和自动化指导实践，并追求让经过验证的思想、方法、能力和成果具备普适性、开放性和共享性。",
        practice: "在AIONE中，美和精神通过统一架构、真实业务闭环、标准字段、流程设计、AI人才、自动化与可验证成果持续体现。"
      },
      "core-principles": {
        kicker: "4大核心准则",
        title: "核心准则",
        description: "一体化、标准化、流程化、自动化，是美和把业务做清楚、做稳定并逐步提高执行效率的核心实践准则。",
        practice: "当前AIONE的工作台、数据、规则、任务、AI与自动化建设均按照四化准则持续验证。"
      },
      integration: {
        kicker: "核心准则",
        title: "一体化",
        description: "尽量让同一业务对象、数据、规则和能力在统一体系内连接与复用，减少重复录入、重复维护和信息割裂。",
        practice: "商品机会、选品记录、卡片、报告等采用同一数据源，多处调用。"
      },
      standardization: {
        kicker: "核心准则",
        title: "标准化",
        description: "通过统一定义、字段、规则、结构与输出方式，让相同业务能够稳定、清楚地重复执行。",
        practice: "商品机会编号、工作台命名、卡片母版、字段说明和公共组件均逐步形成统一标准。"
      },
      process: {
        kicker: "核心准则",
        title: "流程化",
        description: "以业务目标与真实业务闭环为基础，把关键输入、执行、校验、异常、结果和状态迁移组织成清晰流程。",
        practice: "选品主流程按商品机会→数据录入→成本试算→智能定价→上架判断组织；测样作为按需验证能力独立调用。"
      },
      automation: {
        kicker: "核心准则",
        title: "自动化",
        description: "能由规则、函数、API、AI或自动化稳定完成的工作，应尽量减少人工重复操作，同时保留必要的人类责任。",
        practice: "测样报告、信息读取、成本计算、任务分配等正在逐步识别并验证自动化机会。"
      },
      foundations: {
        kicker: "3大基石",
        title: "三大基石",
        description: "美和准则、美和灵魂、美和传承共同构成长期经营与做事方式的根基，三者同为顶层基石，不构成流程排序。",
        practice: "系统和业务方法必须能解释其原则依据、精神内核以及是否值得长期延续。"
      },
      "miwa-principles": {
        kicker: "三大基石",
        title: "美和准则",
        description: "用于指导判断与实践的稳定原则，使不同业务和不同阶段仍能保持一致的基本方向。",
        practice: "系统设计优先真实、清晰、稳定、可验证、可维护、可扩展、可交接。"
      },
      "miwa-soul": {
        kicker: "三大基石",
        title: "美和灵魂",
        description: "代表美和长期形成的内在价值取向、做事初心与精神内核。",
        practice: "在系统中体现为对真实业务、人、长期价值、责任与持续改善的重视。"
      },
      "miwa-heritage": {
        kicker: "三大基石",
        title: "美和传承",
        description: "把经过长期实践验证、真正值得延续的精神、原则、方法、责任和成果继续保留下去。",
        practice: "通过知识、规则、代码、数据、Skill、AI人才履历与正式文档形成可交接资产。"
      },
      attributes: {
        kicker: "3大共同属性",
        title: "三大属性",
        description: "普适性、开放性、共享性用于描述美和形成的思想、方法、能力和成果应尽量具备的共同属性。",
        practice: "AIONE先在真实业务中验证，再判断哪些成果可以迁移、持续成长并在权限边界内共享。"
      },
      universality: {
        kicker: "三大属性",
        title: "普适性",
        description: "不是追求万能，而是在适用边界明确的前提下，从个案中寻找可以跨场景成立和迁移的规律。",
        practice: "AIONE验证有效的方法，未来可逐步判断是否适用于ERP、物流、留学等其他系统。"
      },
      openness: {
        kicker: "三大属性",
        title: "开放性",
        description: "核心原则保持稳定，但方法、知识、技术和实践结果允许根据新的事实与证据持续吸收、修正和扩展。",
        practice: "系统结构保持稳定骨架，同时允许模块、AI能力、知识与自动化持续演进。"
      },
      sharing: {
        kicker: "三大属性",
        title: "共享性",
        description: "经过验证形成的价值，不长期封闭在个人、系统或项目中，而是在正确权限和边界下成为可调用、可复用的共同资产。",
        practice: "公共组件、字段、规则、知识、Skill与AI人才能力逐步形成集团共享数字资源。"
      }
    },

    /* 高频资源的显示由sharedResources.items中的quickAccess/headerHidden统一控制。 */
    reservedInterfaces: {}
  },

  aside: {
    state: "light",
    kicker: "当前上下文",
    title: "当前页面",
    content: "只展示当前页面真正有价值的辅助信息；无有效内容时允许隐藏。"
  },

  footer: {
    status: "Global Shell + Smart Header + Universal Sidebar + Contextual Aside + Independent 美和AI Layer + Level-2 Base",
    environment: "INTERNAL TEST REBUILD",
    version: "v1.9.20-1688-permanent-token-direct"
  }
});
