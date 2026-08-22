/* ========================================
   MIWA System Config｜美和システム設定
   実データ接続後は値だけを差し替え、各コンポーネントを直接変更しない。
======================================== */

export const SYSTEM_ASSET_VERSION = "20260822-v1.0.28-global-shell-single-source";
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
    commonEntries: {
      stores: {
        label: "跨境店铺",
        moreMode: "route",
        moreRoute: "store-home",
        items: [
          { id: "rakuten-1", name: "幸せ屋", subtitle: "", mark: "幸", color: "#176B4D", url: "https://glogin.rms.rakuten.co.jp/", status: "active" },
          { id: "rakuten-2", name: "PrimeLife", subtitle: "", mark: "P", color: "#176B4D", url: "https://glogin.rms.rakuten.co.jp/", status: "active" },
          { id: "rakuten-3", name: "永井GD", subtitle: "", mark: "GD", color: "#176B4D", url: "https://glogin.rms.rakuten.co.jp/", status: "active" }
        ],
        developmentNote: "店铺入口按真实业务持续增加；预设平台不代表已经开店。",
        recentChanges: [
          { date: "2026-08-21", title: "集团店铺总览入口升级", detail: "更多店铺由轻量弹层升级为正式总览页，便于员工集中进入并持续了解集团渠道发展。" }
        ],
        moreSections: [
          {
            id: "rakuten",
            label: "楽天市場",
            hint: "现有店铺",
            items: [
              { id: "rakuten-1-more", name: "幸せ屋", subtitle: "1号店", mark: "幸", color: "#176B4D", url: "https://glogin.rms.rakuten.co.jp/", status: "active" },
              { id: "rakuten-2-more", name: "PrimeLife", subtitle: "2号店", mark: "P", color: "#176B4D", url: "https://glogin.rms.rakuten.co.jp/", status: "active" },
              { id: "rakuten-3-more", name: "永井GD", subtitle: "3号店", mark: "GD", color: "#176B4D", url: "https://glogin.rms.rakuten.co.jp/", status: "active" }
            ]
          },
          { id: "amazon-store", label: "Amazon", hint: "按业务增加", items: [] },
          { id: "temu-store", label: "TEMU", hint: "按业务增加", items: [] },
          { id: "qoo10-store", label: "Qoo10", hint: "按业务增加", items: [] },
          { id: "tiktok-store", label: "TikTok Shop", hint: "按业务增加", items: [] }
        ]
      },
      logistics: {
        label: "订单与面单",
        items: [
          { id: "robot-in", name: "Robot-in", subtitle: "订单", mark: "R", color: "#176B4D", url: "https://sso.cloud-robot.co/login/", status: "active" },
          { id: "sagawa", name: "佐川", subtitle: "面单", mark: "佐", color: "#176B4D", url: "https://www.e-service.sagawa-exp.co.jp/portal/do/login/show?fr=bs", status: "active" },
          { id: "yamato", name: "黑猫", subtitle: "面单", mark: "黒", color: "#176B4D", url: "https://newb2web.kuronekoyamato.co.jp/", status: "active" },
          { id: "fukuyama", name: "福山", subtitle: "面单·日暮里", mark: "福", color: "#176B4D", url: "https://wwwisx.fukutsu.co.jp/iSTARX/?timeout=true", status: "active" }
        ]
      },
      office: {
        label: "办公",
        items: [
          { id: "gpt", name: "GPT", subtitle: "办公", mark: "AI", color: "#176B4D", url: "https://chatgpt.com/", status: "active" },
          { id: "wps", name: "WPS", subtitle: "办公", mark: "W", color: "#176B4D", url: "https://www.kdocs.cn/latest", status: "active" },
          { id: "feishu", name: "飞书", subtitle: "办公", mark: "飞", color: "#176B4D", url: null, status: "active" }
        ]
      },
      shopping: {
        label: "购物",
        items: [
          { id: "amazon", name: "亚马逊", subtitle: "购物", mark: "A", color: "#176B4D", url: "https://www.amazon.co.jp/", status: "active" },
          { id: "rakuten-shopping", name: "乐天", subtitle: "购物", mark: "楽", color: "#176B4D", url: "https://www.rakuten.co.jp/", status: "active" },
          { id: "hako-one", name: "箱ワン", subtitle: "购物", mark: "箱", color: "#176B4D", url: "https://www.notosiki.co.jp/mypage/login", status: "active" }
        ]
      },
      mail: {
        label: "邮箱",
        items: [
          { id: "gmail", name: "Gmail", subtitle: "邮箱", mark: "G", color: "#176B4D", url: "https://mail.google.com/mail/u/0/#inbox", status: "active" }
        ]
      },
      tools: {
        label: "更多工具",
        moreMode: "panel",
        moreSections: [
          {
            id: "tool-logistics",
            label: "订单・物流",
            hint: "高频业务工具",
            items: [
              { id: "tool-robot", name: "Robot-in", subtitle: "订单", mark: "R", color: "#176B4D", url: "https://sso.cloud-robot.co/login/", status: "active" },
              { id: "tool-sagawa", name: "佐川", subtitle: "面单", mark: "佐", color: "#176B4D", url: "https://www.e-service.sagawa-exp.co.jp/portal/do/login/show?fr=bs", status: "active" },
              { id: "tool-yamato", name: "黑猫", subtitle: "面单", mark: "黒", color: "#176B4D", url: "https://newb2web.kuronekoyamato.co.jp/", status: "active" },
              { id: "tool-fukuyama", name: "福山", subtitle: "日暮里", mark: "福", color: "#176B4D", url: "https://wwwisx.fukutsu.co.jp/iSTARX/?timeout=true", status: "active" },
              { id: "tool-japanpost", name: "日本邮政", subtitle: "物流", mark: "郵", color: "#176B4D", url: "https://btoolbox.post.japanpost.jp/portal/PT/PTPT/PTPT0001.do?op=init", status: "active" }
            ]
          },
          {
            id: "tool-office",
            label: "办公・AI",
            hint: "集团共用",
            items: [
              { id: "tool-gpt", name: "GPT", subtitle: "办公", mark: "AI", color: "#176B4D", url: "https://chatgpt.com/", status: "active" },
              { id: "tool-wps", name: "WPS", subtitle: "办公", mark: "W", color: "#176B4D", url: "https://www.kdocs.cn/latest", status: "active" },
              { id: "tool-feishu", name: "飞书", subtitle: "办公", mark: "飞", color: "#176B4D", url: null, status: "active" },
              { id: "tool-sique", name: "思雀AI", subtitle: "生图", mark: "思", color: "#176B4D", url: "https://ai.sique.com/", status: "active" },
              { id: "tool-biiino", name: "biiino", subtitle: "上架", mark: "b", color: "#176B4D", url: "https://home.biiino.com/login", status: "active" },
              { id: "tool-stepcoupon", name: "Step Coupon", subtitle: "运营", mark: "S", color: "#176B4D", url: "https://step-coupon.com/login.html", status: "active" }
            ]
          },
          {
            id: "tool-shopping",
            label: "购物・采购",
            hint: "公司采购",
            items: [
              { id: "tool-amazon", name: "亚马逊", subtitle: "购物", mark: "A", color: "#176B4D", url: "https://www.amazon.co.jp/", status: "active" },
              { id: "tool-rakuten", name: "乐天", subtitle: "购物", mark: "楽", color: "#176B4D", url: "https://www.rakuten.co.jp/", status: "active" },
              { id: "tool-hako", name: "箱ワン", subtitle: "包装采购", mark: "箱", color: "#176B4D", url: "https://www.notosiki.co.jp/mypage/login", status: "active" }
            ]
          },
          {
            id: "tool-mail",
            label: "邮箱・Google",
            hint: "集团账号",
            items: [
              { id: "tool-gmail-info", name: "Gmail", subtitle: "info", mark: "G", color: "#176B4D", url: "https://mail.google.com/mail/u/0/#inbox", status: "active" },
              { id: "tool-gmail-support", name: "Gmail", subtitle: "support", mark: "G", color: "#176B4D", url: "https://mail.google.com/mail/u/0/#inbox", status: "active" }
            ]
          },
          {
            id: "tool-business",
            label: "公共・财务",
            hint: "按需使用",
            items: [
              { id: "tool-gs1", name: "GS1", subtitle: "合规", mark: "G", color: "#176B4D", url: "https://mygs1.gs1jp.org", status: "active" },
              { id: "tool-iwill", name: "i-WiLL", subtitle: "关税", mark: "i", color: "#176B4D", url: "https://webcsw.ocs.co.jp/csw/login/JPOCS", status: "active" },
              { id: "tool-moneytree", name: "Moneytree", subtitle: "财务", mark: "M", color: "#176B4D", url: "https://business.getmoneytree.com/", status: "active" },
              { id: "tool-billpay", name: "楽天BillPay", subtitle: "结算", mark: "楽", color: "#176B4D", url: "https://billpay.rakuten.co.jp/login", status: "active" }
            ]
          }
        ],
        items: [
          { id: "robot-in", name: "Robot-in", subtitle: "订单", mark: "R", color: "#176B4D", url: "https://sso.cloud-robot.co/login/", status: "active" },
          { id: "sagawa", name: "佐川", subtitle: "面单", mark: "佐", color: "#176B4D", url: "https://www.e-service.sagawa-exp.co.jp/portal/do/login/show?fr=bs", status: "active" },
          { id: "yamato", name: "黑猫", subtitle: "面单", mark: "黒", color: "#176B4D", url: "https://newb2web.kuronekoyamato.co.jp/", status: "active" },
          { id: "gpt", name: "GPT", subtitle: "办公", mark: "AI", color: "#176B4D", url: "https://chatgpt.com/", status: "active" },
          { id: "wps", name: "WPS", subtitle: "办公", mark: "W", color: "#176B4D", url: "https://www.kdocs.cn/latest", status: "active" }
        ]
      }
    },

    /* 現段階は全員に全ワークベンチを公開。将来必要時のみ restricted に切替える。 */
    permissionMode: "open",
    permissions: [],

    workCount: 0,
    notificationCount: 3,
    searchRoute: "search",
    spiritReferenceRoute: "principles",

    /* 今日印象恢复为轻量全局信息带；天气暂不启用，避免无必要外部请求。 */
    weather: {
      enabled: false,
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
    status: "Global Shell唯一源码 + 选品/测样闭环保全",
    environment: "INTERNAL TEST REBUILD",
    version: "v1.0.28-global-shell-single-source"
  }
});
