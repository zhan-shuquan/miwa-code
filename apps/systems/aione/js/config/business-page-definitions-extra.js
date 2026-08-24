import { systemConfig } from "./system-config.js";
import { toAIOfficeObjects } from "./ai-office-registry.js";

function makeSharedSeedObjects() {
  const items = Array.isArray(systemConfig.header?.sharedResources?.items)
    ? systemConfig.header.sharedResources.items.filter((item) => item.quickAccess === true)
    : [];
  return items.map((item) => ({
    id: `SHARED-${String(item.id || item.name || "RESOURCE").toUpperCase()}`,
    name: item.name || "未命名资源",
    type: item.productForm || "其他",
    origin: item.origin || "待确认",
    owner: item.owner || "待确认",
    state: item.status === "active" ? "在用" : item.status === "planned" ? "待建设" : "待确认",
    location: item.route ? `AIONE｜#/${item.route}` : item.url || "待确认",
    url: item.url || (item.route ? `#/${item.route}` : ""),
    usageFrequency: item.quickAccess === true ? "高频/快捷" : "按需",
    quickAccess: item.quickAccess === true ? "是" : "否",
    headerHidden: item.headerHidden === true || item.hidden === true ? "是" : "否",
    quickGroup: item.quickGroup || "",
    result: item.subtitle || "共享使用"
  }));
}

export const EXTRA_BUSINESS_PAGE_DEFINITIONS = Object.freeze({
  work:{routeId:"work",title:"工作之家",icon:"工",description:"统一承载当前登录人的工作事项、协同任务、投入时间、工作证据与结果；同一工作事实只记录一次，日报、周报、月报等后续由系统自动生成。",overviewLabel:"工作概览",createLabel:"新建工作",objectName:"工作",objectPlural:"工作事项",typeDictionaryKey:"workTypes",typeDescriptions:{"我的工作":"当前登录用户负责的工作；默认优先关注，但不阻断查看其他成员工作。","我布置的":"当前登录用户创建并交给其他成员的工作。","其他工作":"内部共享可见的其他工作事实；敏感数据另行关闭。","建议与创新":"先记录、再讨论、再决定是否进入验证和正式工作。"},flow:{status:"validating",label:"验证中",steps:["形成工作","明确负责人","执行","校验/异常","完成","结果沉淀"]},metrics:[{label:"我的工作",type:"我的工作"},{label:"我布置的",type:"我布置的"},{label:"待处理",state:"待处理"},{label:"进行中",state:"进行中"},{label:"已完成",state:"已完成"},{label:"有效工作时间",value:"待后台统计"}],fieldSchemaId: "work",cardFields:["owner","priority","dueDate","timeEvidence","moneyStatus","result"],listFields:["name","type","owner","state","priority","dueDate","timeEvidence","moneyStatus","result"],sortOptions:[{value:"default",label:"默认排序"},{value:"due-asc",label:"截止时间 最近",field:"dueDate",direction:"asc",type:"date"},{value:"updated-desc",label:"最近更新",field:"updatedAt",direction:"desc",type:"date"},{value:"state-asc",label:"状态",field:"state",direction:"asc"},{value:"owner-asc",label:"负责人",field:"owner",direction:"asc"}],allowImport:false,views:["card","list"],auxiliary:[{title:"自动工作报告",text:"日报、周报、月报、季度报、年报后续直接读取同一份工作证据，不要求员工重复整理。"},{title:"时间与结果",text:"有效工作时间、事项数量和结果由后台工作证据层逐步自动统计，不以页面停留时间代替真实工作。"},{title:"人才数据共享",text:"工作证据通过person_id回流人才之家，用于能力、贡献、调岗与成长分析。",route:"talent-home"}],ai:{title:"AI秘书｜工作之家",text:"当前只提供上下文接口；后续AI秘书通过AIONE Tool Layer直接创建、分配、推进和总结工作。"},seedObjects:[]},
  analysis:{routeId:"analysis",title:"分析之家",icon:"析",description:"按当前用户、事业与管理范围组合真实数据进行分析；分析类型与图表组件按实际业务逐步增加。",overviewLabel:"分析概览",createLabel:"新建分析",objectName:"分析",objectPlural:"分析视图",typeDictionaryKey:"analysisTypes",typeDescriptions:{"经营分析":"围绕收入、支出、利润和经营结果。","业务分析":"围绕事业、店铺、商品、客户等业务对象。","人员与效率":"围绕工作、时间、结果与自动化贡献。"},flow:{status:"validating",label:"验证中",steps:["选择范围","读取事实","统一口径","分析","发现异常/机会","形成判断","进入工作/决策"]},metrics:[{label:"分析类型",value:"按需增加"},{label:"数据来源",value:"真实数据"},{label:"当前用户范围",value:"自动识别"},{label:"异常/机会",value:"待接入"}],fieldSchemaId: "analysis",cardFields:["owner","result"],listFields:["name","type","owner","state","result"],views:["card","list"],allowImport:false,auxiliary:[{title:"图表组件",text:"柱状图、折线图、饼图等进入Component Registry后由同一Workspace按需调用；本轮不提前堆内容。"}],ai:{title:"AI秘书｜分析之家",text:"后续按当前用户范围调用真实数据、知识与分析组件，并把需要行动的结果送入工作之家。"},seedObjects:[]},
  "talent-home": {
    routeId:"talent-home", title:"人才之家", icon:"才",
    description:"统一管理美和集团内部人才与人事档案、岗位责任、权限、成长、变更与交接；外部People关系发现由独立People系统负责。",
    overviewLabel:"人才概览", createLabel:"新建人才档案", objectName:"人才", objectPlural:"人才档案", typeDictionaryKey:"talentTypes",
    typeDescriptions:{"正式员工":"正式进入美和组织体系的员工。","兼职/时薪":"按兼职、时薪或阶段性内部岗位参与工作的成员。","其他内部协作":"已进入内部责任体系但需进一步确认身份类型的协作成员。"},
    flow:{status:"validating",label:"验证中",steps:["人才建档","岗位与责任","账号与权限","任务与工作","成长与贡献","变更/交接","离职/归档"]},
    metrics:[{label:"人才总数",source:"objects"},{label:"在岗",state:"在岗"},{label:"待完善档案",state:"待完善"},{label:"权限待确认",state:"权限待确认"},{label:"本月变更",value:"按真实数据"}],
    fieldSchemaId: "talent-home",
    cardFields:["role","owner","grade","joinDate","result"], listFields:["name","type","role","owner","state","grade","joinDate","result"],
    auxiliary:[
      {title:"档案完整性",text:"提示缺少岗位、责任、账号、权限或必要人事资料的内部人才。"},
      {title:"成长与贡献",text:"真实工作、标准建设、业务结果与AI协作贡献逐步形成可追溯履历。"},
      {title:"PPC｜人",text:"客户之家与人才之家都属于PPC“人”的对象体系；方法论说明统一进入知识之家。",route:"knowledge-home"}
    ],
    ai:{title:"AI秘书｜人才辅助",text:"可协助整理人才档案、责任变化、工作履历与待确认资料；关键人事判断由负责人承担。"}, seedObjects:[]
  },
  "supplier-home": {
    routeId:"supplier-home", title:"供应商之家", icon:"供",
    description:"统一管理美和集团长期合作供应商主档、联系人、供应范围、报价/成本、交期、质量、合同与合作表现；采购工作台负责采购流程，供应商之家负责供应商这个长期对象。",
    overviewLabel:"供应商概览", createLabel:"新建供应商", objectName:"供应商", objectPlural:"供应商资料", typeDictionaryKey:"supplierTypes",
    typeDescriptions:{"商品供应商":"提供商品、原材料或包装等有形资源的供应商。","服务供应商":"提供设计、系统、顾问等服务的供应商。","物流供应商":"提供运输、仓储、面单、配送等物流服务的供应商。","其他供应商":"真实业务出现后按规则补充。"},
    flow:{status:"validating",label:"验证中",steps:["供应商建档","联系人/供应范围","报价与条件","采购合作","交期/质量记录","合作评价","变更/归档"]},
    metrics:[{label:"供应商总数",source:"objects"},{label:"合作中",state:"合作中"},{label:"待验证",state:"待验证"},{label:"交期异常",state:"交期异常"},{label:"质量异常",state:"质量异常"}],
    fieldSchemaId:"supplier-home", cardFields:["type","owner","scope","leadTime","quality","result"], listFields:["name","type","region","owner","state","scope","leadTime","quality","cost","result"],
    auxiliary:[{title:"采购工作台",text:"采购工作台处理询价、下单、到货与异常；供应商资料只维护一份并被采购流程引用。",route:"procurement"},{title:"商品之家",text:"商品可关联一个或多个供应商，并保留真实供应关系和历史。",route:"product-home"},{title:"ERP",text:"应付、成本、付款等资源事实由ERP/财务能力关联，不在供应商之家重复记账。",route:"erp-home"}],
    ai:{title:"AI秘书｜供应商辅助",text:"可协助整理报价、交期、质量与合作记录，识别集中采购和供应风险；关键供应商判断由负责人承担。"}, seedObjects:[]
  },
  "category-home": {
    routeId:"category-home",title:"分类之家",icon:"分",description:"统一管理美和经营分类的定义、层级、责任、关联商品和长期经营状态。",overviewLabel:"分类概览",createLabel:"新建分类",objectName:"分类",objectPlural:"分类资料",typeDictionaryKey:"categoryTypes",
    typeDescriptions:{"有形商品分类":"面向有形商品经营的分类体系。","无形业务分类":"面向留学、咨询等无形业务的真实产品/服务分类。","其他分类":"未来真实业务出现后按规则增加。"},
    flow:{status:"validating",label:"验证中",steps:["建立分类","定义层级/范围","分配责任","关联商品/业务","经营观察","优化/调整","废止/归档"]},
    metrics:[{label:"分类总数",source:"objects"},{label:"重点分类",state:"重点"},{label:"责任已明确",state:"责任已明确"},{label:"待确认",state:"待确认"},{label:"本月新增",value:"按真实数据"}],
    fieldSchemaId: "category-home",
    cardFields:["level","owner","scope","result"],listFields:["name","type","level","owner","state","scope","result"],
    auxiliary:[{title:"深耕责任",text:"重点分类需要明确负责人、目标和生效区间。"},{title:"分类机会",text:"趋势、需求和选品线索按分类归集，避免分类无限扩张。"}],ai:{title:"AI秘书｜分类辅助",text:"可协助检查分类命名、重复、层级关系与责任完整性。"},seedObjects:[]
  },
  "product-home": {
    routeId:"product-home",title:"商品之家",icon:"商",description:"统一管理商品主档、分类、品牌、SKU、店铺映射、资料和生命周期；业务工作台围绕同一商品对象执行。",overviewLabel:"商品概览",createLabel:"新建商品",objectName:"商品",objectPlural:"商品资料",typeDictionaryKey:"productTypes",
    typeDescriptions:{"有形商品":"有库存、物流、规格与SKU等实体属性的商品。","无形商品/服务":"留学、咨询等按真实服务结构管理，不机械套用有形商品规则。","其他商品":"未来真实业务出现后按需增加。"},
    flow:{status:"validating",label:"验证中",steps:["商品建档","分类/品牌","规格/SKU","店铺映射","经营使用","生命周期管理","归档/淘汰"]},
    metrics:[{label:"商品总数",source:"objects"},{label:"在用商品",state:"在用"},{label:"待完善",state:"待完善"},{label:"店铺已映射",state:"已映射"},{label:"本月新增",value:"按真实数据"}],
    fieldSchemaId: "product-home",
    cardFields:["category","brand","sku","owner","result"],listFields:["name","type","category","brand","sku","owner","state","result"],
    auxiliary:[{title:"店铺映射",text:"一个标准商品对应各店铺商品编号、销售链接和状态。"},{title:"资料资产",text:"主图、详情、说明、PDF等资料统一关联商品对象。"}],ai:{title:"AI秘书｜商品辅助",text:"可协助补全商品主数据、检查重复商品和跨店铺映射。"},seedObjects:[]
  },
  "ai-office": {
    routeId:"ai-office",title:"AI办公室",icon:"办",description:"统一承载岗位AI办公室、AI秘书调度、AI工作、待确认动作与真实执行证据；AI之家负责能力资产，AI办公室负责组织和使用。",overviewLabel:"AI办公室概览",createLabel:"预设AI办公室",objectName:"岗位AI办公室",objectPlural:"岗位AI办公室",typeDictionaryKey:"aiOfficeTypes",
    typeDescriptions:{"管理岗位AI办公室":"面向集团经营、事业负责人和重大管理责任的岗位AI办公室。","业务岗位AI办公室":"面向运营、采购、设计、客服等稳定责任域的岗位AI办公室。"},
    flow:{status:"validating",label:"验证中",steps:["人类负责人提出目标","AI秘书受领","读取上下文/9要素","调度AI人才与工具","执行/等待确认","结果与证据回写","复盘优化"]},
    metrics:[{label:"预设办公室",value:"7"},{label:"首个验证办公室",value:"会长兼董事长"},{label:"AI秘书",value:"1个统一最高AI调度层"},{label:"写入原则",value:"人类确认"}],
    fieldSchemaId:"ai-office",cardFields:["humanOwnerRole","aiSecretary","scope","aiPositions","result"],listFields:["name","type","humanOwnerRole","aiSecretary","state","scope","result"],views:["card","list"],allowImport:false,
    auxiliary:[{title:"AI之家｜能力供给",text:"AI人才、Skill、Agent、Connector、Tool/API等由AI之家统一管理，一份能力多办公室调用。",route:"ai-home"},{title:"首个真实验证",text:"会长兼董事长AI办公室由当前负责人亲自验证：身份、上下文、数据、知识、调度、执行、确认、证据与结果。"},{title:"人类最终责任",text:"AI秘书是办公室最高AI长官，但重大经营、人事、资金、制度等最终责任归对应人类岗位负责人。"}],
    ai:{title:"AI秘书｜岗位AI办公室",text:"你正在AI办公室主战场。美和AI已从左右边栏独立，复杂AI任务在AI工作区与AI办公室中持续处理。"},seedObjects:toAIOfficeObjects()
  },
  "ai-home": {
    routeId:"ai-home",title:"AI之家",icon:"AI",description:"统一管理美和集团AI人才、Skill、Agent、Connector、自动化能力、真实任务证据和治理边界。",overviewLabel:"AI概览",createLabel:"新建AI能力",objectName:"AI能力",objectPlural:"AI能力资料",typeDictionaryKey:"aiCapabilityTypes",
    typeDescriptions:{"AI人才":"围绕稳定责任域长期成长的AI角色。","Skill":"稳定方法、标准、判断逻辑和输出规范的知识能力。","Agent":"围绕明确目标连续判断、执行和跟进的多步骤能力。","Connector":"稳定读取或写入外部系统数据的连接能力。","传统自动化/API":"高频、确定性强的数据同步与系统操作。","Computer Use":"无稳定API时通过GUI执行重复操作。"},
    flow:{status:"validating",label:"验证中",steps:["能力建档","责任域/边界","真实任务","验证证据","能力升级","授权执行","治理/停用"]},
    metrics:[{label:"AI能力总数",source:"objects"},{label:"验证中",state:"验证中"},{label:"已验证",state:"已验证"},{label:"运行中",state:"运行中"},{label:"待治理",state:"待治理"}],
    fieldSchemaId: "ai-home",
    cardFields:["owner","scope","version","evidence","result"],listFields:["name","type","owner","scope","state","version","evidence","result"],
    auxiliary:[{title:"进入AI办公室",text:"AI之家负责能力资产；岗位AI办公室负责组织和使用，AI秘书负责统一调度。",route:"ai-office"},{title:"真实任务证据",text:"AI能力必须通过真实任务、质量、修正和业务结果逐步形成信用。"},{title:"治理边界",text:"高风险、关键规则与最终经营责任始终保留人类负责人。"}],ai:{title:"AI秘书｜AI之家辅助",text:"可协助登记能力、整理真实履历、发现可Skill化或自动化的成熟流程。"},seedObjects:[]
  },
  "shared-home": {
    routeId:"shared-home",title:"快捷入口",icon:"捷",description:"集中查看、说明和维护AIONE快捷入口。Header第2行只展示已启用且未隐藏的高频入口；底层资源定义、内外属性、权限和链接由统一注册数据驱动。",overviewLabel:"快捷概览",createLabel:"添加入口",objectName:"快捷入口",objectPlural:"快捷入口",typeDictionaryKey:"sharedResourceTypes",
    typeDescriptions:{"应用":"可独立完成一类持续性工作的系统。","工具":"完成较单一或辅助操作的工具。","知识":"可被员工、AI和业务页面调用的正式知识。","代码":"组件、脚本、Skill、Agent、自动化及代码资产。","数据":"可共享的数据集、主数据或数据入口。","模板":"文档、表格、页面、业务等可复用模板。","连接":"API、Connector及受控系统连接。","服务":"采购平台、外部服务及其他可调用服务。","其他":"无法归入现有产品形态的真实入口。"},
    flow:{status:"locked",label:"头部基线已锁定",steps:["入口登记","产品形态","路由/链接","权限/负责人","Header快捷展示","说明/操作指南","变更/停用"]},
    metrics:[{label:"快捷入口",source:"objects"},{label:"Header显示",value:"按配置"},{label:"已隐藏",value:"按配置"},{label:"待确认",state:"待确认"},{label:"最近变更",value:"待接入"}],
    fieldSchemaId:"shared-home",cardFields:["type","owner","usageFrequency","quickAccess","headerHidden"],listFields:["name","type","owner","state","usageFrequency","quickAccess","headerHidden","location","result"],
    auxiliary:[{title:"Header第2行",text:"只保留真正需要一步到达的入口；分组由后台字段自动排序，前台只用细分隔符表达。"},{title:"横向浏览",text:"宽度不足时自动出现左右浏览控件；不换行、不挤压Header其他层。"},{title:"更多",text:"Header只显示高频入口；其他已登记入口在此查看说明、调整隐藏状态并打开。"}],
    ai:{title:"AI秘书｜快捷入口辅助",text:"可协助检查链接、重复入口、权限、使用频率，并建议哪些应固定在Header第2行。"},seedObjects:makeSharedSeedObjects()
  }
});
