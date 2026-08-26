/* ========================================
   MIWA Business Home Content｜事业之家正式内容索引 V1.9.31
   事业之家负责集团事业认知、事业版图、经营状态与进入路径。
   具体业务执行仍进入对应事业与工作台；未启动事业不提前建设业务系统。
======================================== */

const child = (id, label, route, subtitle, options = {}) => Object.freeze({
  id, label, route, subtitle, icon: options.icon || "", status: options.status || "已预设"
});

const group = (id, label, route, icon, subtitle, children = []) => Object.freeze({
  id, label, route, icon, subtitle, children: Object.freeze(children)
});

export const MIWA_BUSINESS_NAVIGATION = Object.freeze([
  Object.freeze({ id:"business-overview", label:"事业概览", route:"business-home", icon:"apps", children:[] }),
  group("business-portfolio", "集团事业", "business-portfolio", "shared", "集团当前与未来事业版图", [
    child("business-crossborder", "美和跨境", "business-crossborder", "当前核心经营事业。"),
    child("business-wholesale", "美和批发", "business-wholesale", "第二核心现实业务。"),
    child("business-procurement-agency", "美和采购代理", "business-procurement-agency", "已有真实业务基础，待重新开发。"),
    child("business-logistics", "美和物流", "business-logistics", "事业方向已存在，具体经营模式待正式确认。"),
    child("business-study-abroad", "美和留学", "business-study-abroad", "事业方向已存在，具体经营模式待正式确认。"),
    child("business-real-estate", "美和不动产", "business-real-estate", "事业方向已存在，具体经营模式待正式确认。"),
    child("business-consulting", "美和商务咨询", "business-consulting", "事业方向已存在，具体经营模式待正式确认。"),
    child("business-brand", "美和品牌", "business-brand", "事业方向已存在，具体经营模式待正式确认。")
  ]),
  group("business-management", "事业管理", "business-management", "analysis", "明确事业为什么存在、谁负责、处于什么阶段", [
    child("business-positioning", "事业定位", "business-positioning", "统一事业存在理由、客户价值与经营边界。"),
    child("business-owners", "事业负责人", "business-owners", "明确每个事业的人类最终负责人。"),
    child("business-stages", "事业阶段", "business-stages", "区分正式经营、重新开发、培育与未来规划。"),
    child("business-goals", "事业目标", "business-goals", "承载经过确认的真实经营目标。"),
    child("business-relations", "事业关系", "business-relations", "明确事业独立经营与集团能力共享关系。")
  ]),
  group("business-development", "事业发展", "business-development", "lifecycle", "看清事业当前状态与未来演进", [
    child("business-existing", "现有事业", "business-existing", "当前已有真实经营或历史业务基础的事业。"),
    child("business-incubating", "培育事业", "business-incubating", "已有方向但尚未进入完整经营闭环的事业。"),
    child("business-future", "未来事业", "business-future", "只保留正式确认的未来方向，不提前虚构业务。"),
    child("business-milestones", "事业里程碑", "business-milestones", "记录真正改变事业阶段的重要节点。")
  ]),
  group("business-connections", "经营连接", "business-connections", "external", "从事业认知进入真实经营与资料", [
    child("business-enter", "进入事业", "business-enter", "进入已配置AIONE业务空间的事业。"),
    child("business-data", "经营数据", "business-data", "连接分析之家与经营驾驶舱。"),
    child("business-work", "工作事项", "business-work", "连接工作之家查看事业相关工作。"),
    child("business-assets", "相关资料", "business-assets", "连接美和之家与知识资料。")
  ])
]);

export const MIWA_BUSINESS_HOME_SUBTITLE = "美和集团各事业的统一认知、进入、经营状态与发展管理入口。";

const business = (id, route, name, stage, tagline, description, options = {}) => Object.freeze({
  id, route, name, stage, tagline, description,
  category: options.category || "incubating",
  status: options.status || stage,
  spaceId: options.spaceId || null,
  systemReady: Boolean(options.spaceId),
  flow: Object.freeze(options.flow || []),
  facts: Object.freeze(options.facts || []),
  future: options.future || "具体经营模式、系统与启动时间以正式经营判断为准。"
});

export const MIWA_BUSINESSES = Object.freeze([
  business(
    "crossborder", "business-crossborder", "美和跨境", "正式经营", "当前核心经营事业",
    "以日本电商真实经营为主战场，围绕商品、供应链、渠道、运营、订单、库存与客户服务形成持续经营闭环。",
    {
      category:"current", status:"核心经营", spaceId:"crossborder",
      flow:["选品","测样","采购","设计","上架","运营","订单","库存","客服"],
      facts:["AIONE当前第一真实业务实验场","跨境电商真实业务优先","九个工作台按业务流程持续跑通"]
    }
  ),
  business(
    "wholesale", "business-wholesale", "美和批发", "正式经营", "第二核心现实业务",
    "面向日本批发客户，以真实商品、商谈、受注、出荷、请款入金与客户跟进形成完整批发经营闭环。",
    {
      category:"current", status:"核心经营", spaceId:"wholesale",
      flow:["商品企画・選定","見積・商談","受注管理","出荷管理","請求・入金管理","顧客対応"],
      facts:["当前真实业务","线下批发经验与客户基础","后续持续接入AIONE真实执行"]
    }
  ),
  business(
    "procurement-agency", "business-procurement-agency", "美和采购代理", "重新开发", "已有真实业务基础｜待重新开发",
    "面向日本客户的一站式中国采购、验货、集货与跨境交付服务。根据客户需求在1688/阿里巴巴等中国供应链完成寻源、报价、采购、验货、发货与结算。",
    {
      category:"restart", status:"既有业务基础",
      flow:["客户需求","商品寻源","供应商确认/比价","报价与委托确认","收款","采购","到货与验货","集货与国际发货","交付与结算","售后与复购"],
      facts:["过去已有较多真实客户","主要服务本土日本客户的中国采购需求","当前AIONE只做事业介绍，不马上建设采购代理系统"],
      future:"待AIONE稳定运行、时间与经营价值允许后，再作为独立项目建设面向客户的网站/客户门户与内部执行系统；对外系统与AIONE通过数据/API连接。"
    }
  ),
  business("logistics", "business-logistics", "美和物流", "培育/待启动", "长期事业方向", "美和集团长期事业方向之一。", { facts:["事业方向已确认","具体经营模式、负责人、目标与启动时间待正式确认"] }),
  business("study-abroad", "business-study-abroad", "美和留学", "培育/待启动", "长期事业方向", "美和集团长期事业方向之一。", { facts:["事业方向已确认","具体经营模式、负责人、目标与启动时间待正式确认"] }),
  business("real-estate", "business-real-estate", "美和不动产", "培育/待启动", "长期事业方向", "美和集团长期事业方向之一。", { facts:["事业方向已确认","具体经营模式、负责人、目标与启动时间待正式确认"] }),
  business("consulting", "business-consulting", "美和商务咨询", "培育/待启动", "长期事业方向", "美和集团长期事业方向之一。", { facts:["事业方向已确认","具体经营模式、负责人、目标与启动时间待正式确认"] }),
  business("brand", "business-brand", "美和品牌", "培育/待启动", "长期事业方向", "美和集团长期事业方向之一。", { facts:["事业方向已确认","具体经营模式、负责人、目标与启动时间待正式确认"] })
]);

export const MIWA_BUSINESS_BY_ROUTE = Object.freeze(Object.fromEntries(MIWA_BUSINESSES.map((item) => [item.route, item])));

const page = (title, eyebrow, subtitle, kind, options = {}) => Object.freeze({ title, eyebrow, subtitle, kind, ...options });

export const MIWA_BUSINESS_PAGES = Object.freeze({
  "business-home": page("事业之家", "MIWA GROUP BUSINESS", MIWA_BUSINESS_HOME_SUBTITLE, "overview"),
  "business-portfolio": page("集团事业", "BUSINESS PORTFOLIO", "以真实经营为基础，看清当前核心事业、既有业务基础与培育方向。", "portfolio"),
  ...Object.fromEntries(MIWA_BUSINESSES.map((item) => [item.route, page(item.name, "BUSINESS SPACE", item.tagline, "business-detail", { businessId:item.id })])),

  "business-management": page("事业管理", "BUSINESS GOVERNANCE", "先把事业定位、负责人、阶段、目标与关系讲清楚，再进入系统与执行。", "group", { groupId:"business-management" }),
  "business-positioning": page("事业定位", "POSITIONING", "统一回答每个事业为什么存在、服务谁、创造什么客户价值以及经营边界在哪里。", "principles", {
    principles:[
      ["客户价值优先","事业必须对应真实客户、真实需求与可验证价值，不因系统页面或组织想象而成立。"],
      ["经营闭环优先","明确收入/结果来源、业务流程、核心对象、责任与反馈闭环后，再决定系统形态。"],
      ["集团能力共享","事业承担经营结果，人才、AI、财务、知识、商品、供应商、客户等集团能力按需共享。"]
    ]
  }),
  "business-owners": page("事业负责人", "ACCOUNTABILITY", "事业必须有明确的人类最终负责人；AI可以分析和执行，但不能替代最终经营责任。", "principles", {
    principles:[
      ["最终责任有人承担","事业目标、关键规则、重大异常、风险判断、最终质量与经营结果必须有明确人类负责人。"],
      ["岗位不机械复制页面","工作台是业务流程空间，不等于组织部门，也不意味着每个页面必须配置一个岗位。"],
      ["具体任命以事实为准","当前页面只锁定责任原则；具体事业负责人、协同岗位与权限在真实任命后进入人才之家。"]
    ]
  }),
  "business-stages": page("事业阶段", "BUSINESS STAGE", "用统一阶段语言区分正在经营、既有基础待重启、培育与未来规划，避免把方向误当成现状。", "stages"),
  "business-goals": page("事业目标", "BUSINESS GOALS", "只承载经过正式确认的真实经营目标、责任人与结果指标，不使用示例数字冒充正式目标。", "principles", {
    principles:[
      ["目标必须可验证","目标需要明确指标、责任人、时间边界、数据来源与当前状态。"],
      ["目标进入经营闭环","集团战略 → 事业目标 → 工作事项 → 执行证据 → 经营结果 → 复盘与下一轮。"],
      ["没有事实就标记待确认","未正式确认的金额、增长目标、负责人和期限保持待确认，不由AI自行补全。"]
    ]
  }),
  "business-relations": page("事业关系", "BUSINESS RELATIONSHIPS", "事业独立经营，集团能力共享；共享的是长期能力与资源，不是把所有事业混成一个流程。", "relations"),

  "business-development": page("事业发展", "BUSINESS DEVELOPMENT", "以真实经营状态推进事业，不为了版图完整而过早建设组织和系统。", "group", { groupId:"business-development" }),
  "business-existing": page("现有事业", "EXISTING BUSINESS", "当前已经有真实经营或历史业务基础的事业。", "filtered", { filter:"existing" }),
  "business-incubating": page("培育事业", "INCUBATING BUSINESS", "已有方向但尚未形成完整经营闭环的事业。", "filtered", { filter:"incubating" }),
  "business-future": page("未来事业", "FUTURE BUSINESS", "只保留已确认方向，具体启动时点由未来经营判断决定。", "future"),
  "business-milestones": page("事业里程碑", "MILESTONES", "只记录真正改变事业阶段、经营模式或集团能力的重要节点。", "milestones"),

  "business-connections": page("经营连接", "BUSINESS CONNECTIONS", "从事业认知进入真实经营、数据、工作与资料。", "group", { groupId:"business-connections" }),
  "business-enter": page("进入事业", "ENTER BUSINESS", "只有已经配置AIONE业务空间的事业才提供直接进入按钮。", "enter"),
  "business-data": page("经营数据", "BUSINESS DATA", "事业经营数据统一进入分析之家与经营驾驶舱，不在事业之家重复维护。", "connections"),
  "business-work": page("工作事项", "WORK", "事业相关执行统一进入工作之家，事业之家只负责认知与连接。", "connections"),
  "business-assets": page("相关资料", "BUSINESS ASSETS", "正式集团与事业资料进入美和之家/知识之家与Google Drive资料体系。", "connections")
});

export function getBusinessGroup(groupId) {
  return MIWA_BUSINESS_NAVIGATION.find((item) => item.id === groupId) || null;
}
