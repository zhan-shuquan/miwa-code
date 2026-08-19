/* ========================================
   MIWA System Config｜美和システム設定
   実データ接続後は値だけを差し替え、各コンポーネントを直接変更しない。
======================================== */

export const systemConfig = Object.freeze({
  components: [
    ["mobile-topbar-host", "./components/shell/header/mobile-topbar.html"],
    ["mobile-info-host", "./components/shell/header/mobile-info.html"],
    ["desktop-header-host", "./components/shell/header/desktop-header.html"],
    ["sidebar-host", "./components/shell/primary-navigation/sidebar.html"],
    ["selection-main-host", "./pages/selection-workbench/home.html"],
    ["aside-host", "./components/shell/aside/aside.html"],
    ["desktop-footer-host", "./components/shell/footer/footer.html"],
    ["mobile-bottom-host", "./components/shell/primary-navigation/mobile-bottom.html"],
    ["mobile-drawer-host", "./components/shell/primary-navigation/mobile-drawer.html"],
    ["global-settings-host", "./components/shell/settings/global-settings.html"]
  ],

  header: {
    brand: {
      logoSrc: "./assets/brand/miwa-commerce-logo.png",
      systemShortName: "AIONE",
      systemFormalName: "一体化工作平台"
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
      locationName: "东京",
      latitude: 35.6762,
      longitude: 139.6503,
      timeZone: "Asia/Tokyo"
    },

    permissions: [
      "analysis.view",
      "product-center.view",
      "ai-center.view"
    ],

    workCount: 0,
    notificationCount: 3,
    searchRoute: "search",
    spiritReferenceRoute: "principles",

    weather: {
      enabled: true,
      provider: "open-meteo",
      refreshMinutes: 15
    },

    /* モバイル既存情報帯との互換用。正式企業通知はnoticeに実データを入れる。 */
    enterprise: {
      tag: "日本团队",
      type: "weather",
      text: null,
      timeZone: "Asia/Tokyo",
      /* 正式通知がない場合も能力確認のため空状態を表示する。 */
      showNoticeSlotWhenEmpty: true,
      emptyNoticeLabel: "重要通知",
      emptyNoticeText: "暂无重要通知",
      notice: null
    },

    /* 433説明はHeader構造から分離し、設定データとして管理する。 */
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

    /* ERP入口は配置と権限の議論完了まで表示しない */
    reservedInterfaces: {
      erp: {
        enabled: false,
        route: "erp",
        permission: "erp.access",
        placement: "pending"
      }
    }
  },

  aside: {
    title: "上下文辅助",
    content: "当前只验证 Aside 的区域职责与独立代码边界，具体业务内容将在页面接入后按上下文生成。"
  },

  footer: {
    status: "结构验证",
    environment: "CANDIDATE",
    version: "v0.1"
  }
});
