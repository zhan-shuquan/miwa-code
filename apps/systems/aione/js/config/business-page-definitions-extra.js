import { systemConfig } from "./system-config.js";

function makeSharedSeedObjects() {
  const githubUrl = "https://github.com/";
  const driveUrl = "https://drive.google.com/";
  return [
    { id:"SHARED-FILES", name:"文件资产", type:"文件资产", owner:"待确认", state:"在用", location:"Google Drive", url:driveUrl, result:"统一外链管理" },
    { id:"SHARED-ACCOUNTS", name:"账号资产", type:"账号资产", owner:"待确认", state:"在用", location:"AIONE账号资产", url:"", result:"统一登记" },
    { id:"SHARED-LOGO", name:"美和图标与Logo素材", type:"共用素材", owner:"待确认", state:"在用", location:"Google Drive", url:driveUrl, result:"集团共用" },
    { id:"SHARED-IMAGES", name:"美和图片素材", type:"共用素材", owner:"待确认", state:"待整理", location:"Google Drive", url:driveUrl, result:"集团共用" },
    { id:"SHARED-VIDEOS", name:"美和视频素材", type:"共用素材", owner:"待确认", state:"待整理", location:"Google Drive", url:driveUrl, result:"集团共用" },
    { id:"SHARED-CODE", name:"美和代码资产 / GitHub", type:"代码资产", owner:"待确认", state:"在用", location:"GitHub", url:githubUrl, result:"正式代码版本管理" }
  ];
}

export const EXTRA_BUSINESS_PAGE_DEFINITIONS = Object.freeze({
  work:{routeId:"work",title:"工作之家",icon:"工",description:"统一承载当前登录人的工作事项、协同任务、投入时间、工作证据与结果；同一工作事实只记录一次，日报、周报、月报等后续由系统自动生成。",overviewLabel:"工作概览",createLabel:"新建工作",objectName:"工作",objectPlural:"工作事项",typeDictionaryKey:"workTypes",typeDescriptions:{"我的工作":"当前登录用户负责的工作；默认优先关注，但不阻断查看其他成员工作。","我布置的":"当前登录用户创建并交给其他成员的工作。","其他工作":"内部共享可见的其他工作事实；敏感数据另行关闭。","建议与创新":"先记录、再讨论、再决定是否进入验证和正式工作。"},flow:{status:"validating",label:"验证中",steps:["形成工作","明确负责人","执行","校验/异常","完成","结果沉淀"]},metrics:[{label:"我的工作",type:"我的工作"},{label:"我布置的",type:"我布置的"},{label:"待处理",state:"待处理"},{label:"进行中",state:"进行中"},{label:"已完成",state:"已完成"},{label:"有效工作时间",value:"待后台统计"}],fields:[{key:"name",label:"工作事项",required:true,primary:true},{key:"type",label:"工作类型",required:true,dictionary:true},{key:"owner",label:"负责人"},{key:"creator",label:"创建人"},{key:"state",label:"状态"},{key:"priority",label:"优先级"},{key:"dueDate",label:"截止时间",type:"date"},{key:"workbench",label:"关联工作台"},{key:"businessObject",label:"关联业务对象"},{key:"timeEvidence",label:"有效工作时间"},{key:"moneyStatus",label:"钱"},{key:"result",label:"结果"},{key:"summary",label:"说明"}],cardFields:["owner","priority","dueDate","timeEvidence","moneyStatus","result"],listFields:["name","type","owner","state","priority","dueDate","timeEvidence","moneyStatus","result"],sortOptions:[{value:"default",label:"默认排序"},{value:"due-asc",label:"截止时间 最近",field:"dueDate",direction:"asc",type:"date"},{value:"updated-desc",label:"最近更新",field:"updatedAt",direction:"desc",type:"date"},{value:"state-asc",label:"状态",field:"state",direction:"asc"},{value:"owner-asc",label:"负责人",field:"owner",direction:"asc"}],allowImport:false,views:["card","list"],auxiliary:[{title:"自动工作报告",text:"日报、周报、月报、季度报、年报后续直接读取同一份工作证据，不要求员工重复整理。"},{title:"时间与结果",text:"有效工作时间、事项数量和结果由后台工作证据层逐步自动统计，不以页面停留时间代替真实工作。"},{title:"人才数据共享",text:"工作证据通过person_id回流人才之家，用于能力、贡献、调岗与成长分析。",route:"talent-home"}],ai:{title:"AI秘书｜工作之家",text:"当前只提供上下文接口；后续AI秘书通过AIONE Tool Layer直接创建、分配、推进和总结工作。"},seedObjects:[]},
  analysis:{routeId:"analysis",title:"分析之家",icon:"析",description:"按当前用户、事业与管理范围组合真实数据进行分析；分析类型与图表组件按实际业务逐步增加。",overviewLabel:"分析概览",createLabel:"新建分析",objectName:"分析",objectPlural:"分析视图",typeDictionaryKey:"analysisTypes",typeDescriptions:{"经营分析":"围绕收入、支出、利润和经营结果。","业务分析":"围绕事业、店铺、商品、客户等业务对象。","人员与效率":"围绕工作、时间、结果与自动化贡献。"},flow:{status:"validating",label:"验证中",steps:["选择范围","读取事实","统一口径","分析","发现异常/机会","形成判断","进入工作/决策"]},metrics:[{label:"分析类型",value:"按需增加"},{label:"数据来源",value:"真实数据"},{label:"当前用户范围",value:"自动识别"},{label:"异常/机会",value:"待接入"}],fields:[{key:"name",label:"分析名称",required:true,primary:true},{key:"type",label:"分析类型",required:true,dictionary:true},{key:"owner",label:"负责人"},{key:"state",label:"状态"},{key:"result",label:"分析结果"}],cardFields:["owner","result"],listFields:["name","type","owner","state","result"],views:["card","list"],allowImport:false,auxiliary:[{title:"图表组件",text:"柱状图、折线图、饼图等进入Component Registry后由同一Workspace按需调用；本轮不提前堆内容。"}],ai:{title:"AI秘书｜分析之家",text:"后续按当前用户范围调用真实数据、知识与分析组件，并把需要行动的结果送入工作之家。"},seedObjects:[]},
  "talent-home": {
    routeId:"talent-home", title:"人才之家", icon:"才",
    description:"统一管理美和集团内部人才与人事档案、岗位责任、权限、成长、变更与交接；外部People关系发现由独立People系统负责。",
    overviewLabel:"人才概览", createLabel:"新建人才档案", objectName:"人才", objectPlural:"人才档案", typeDictionaryKey:"talentTypes",
    typeDescriptions:{"正式员工":"正式进入美和组织体系的员工。","兼职/时薪":"按兼职、时薪或阶段性内部岗位参与工作的成员。","其他内部协作":"已进入内部责任体系但需进一步确认身份类型的协作成员。"},
    flow:{status:"validating",label:"验证中",steps:["人才建档","岗位与责任","账号与权限","任务与工作","成长与贡献","变更/交接","离职/归档"]},
    metrics:[{label:"人才总数",source:"objects"},{label:"在岗",state:"在岗"},{label:"待完善档案",state:"待完善"},{label:"权限待确认",state:"权限待确认"},{label:"本月变更",value:"按真实数据"}],
    fields:[
      {key:"name",label:"姓名",required:true,primary:true},{key:"type",label:"人才类型",required:true,dictionary:true},{key:"role",label:"岗位/角色"},{key:"owner",label:"直属负责人"},{key:"state",label:"当前状态"},{key:"grade",label:"职级"},{key:"location",label:"工作地点"},{key:"joinDate",label:"加入时间",type:"date"},{key:"responsibility",label:"主要职责"},{key:"result",label:"当前结果/贡献"}
    ],
    cardFields:["role","owner","grade","joinDate","result"], listFields:["name","type","role","owner","state","grade","joinDate","result"],
    auxiliary:[
      {title:"档案完整性",text:"提示缺少岗位、责任、账号、权限或必要人事资料的内部人才。"},
      {title:"成长与贡献",text:"真实工作、标准建设、业务结果与AI协作贡献逐步形成可追溯履历。"},
      {title:"PPC｜人",text:"客户之家与人才之家都属于PPC“人”的对象体系；方法论说明统一进入知识之家。",route:"knowledge-home"}
    ],
    ai:{title:"AI秘书｜人才辅助",text:"可协助整理人才档案、责任变化、工作履历与待确认资料；关键人事判断由负责人承担。"}, seedObjects:[]
  },
  "category-home": {
    routeId:"category-home",title:"分类之家",icon:"分",description:"统一管理美和经营分类的定义、层级、责任、关联商品和长期经营状态。",overviewLabel:"分类概览",createLabel:"新建分类",objectName:"分类",objectPlural:"分类资料",typeDictionaryKey:"categoryTypes",
    typeDescriptions:{"有形商品分类":"面向有形商品经营的分类体系。","无形业务分类":"面向留学、咨询等无形业务的真实产品/服务分类。","其他分类":"未来真实业务出现后按规则增加。"},
    flow:{status:"validating",label:"验证中",steps:["建立分类","定义层级/范围","分配责任","关联商品/业务","经营观察","优化/调整","废止/归档"]},
    metrics:[{label:"分类总数",source:"objects"},{label:"重点分类",state:"重点"},{label:"责任已明确",state:"责任已明确"},{label:"待确认",state:"待确认"},{label:"本月新增",value:"按真实数据"}],
    fields:[{key:"name",label:"分类名称",required:true,primary:true},{key:"type",label:"分类类型",required:true,dictionary:true},{key:"level",label:"层级"},{key:"owner",label:"负责人"},{key:"state",label:"状态"},{key:"scope",label:"适用范围"},{key:"result",label:"经营结果"}],
    cardFields:["level","owner","scope","result"],listFields:["name","type","level","owner","state","scope","result"],
    auxiliary:[{title:"深耕责任",text:"重点分类需要明确负责人、目标和生效区间。"},{title:"分类机会",text:"趋势、需求和选品线索按分类归集，避免分类无限扩张。"}],ai:{title:"AI秘书｜分类辅助",text:"可协助检查分类命名、重复、层级关系与责任完整性。"},seedObjects:[]
  },
  "product-home": {
    routeId:"product-home",title:"商品之家",icon:"商",description:"统一管理商品主档、分类、品牌、SKU、店铺映射、资料和生命周期；业务工作台围绕同一商品对象执行。",overviewLabel:"商品概览",createLabel:"新建商品",objectName:"商品",objectPlural:"商品资料",typeDictionaryKey:"productTypes",
    typeDescriptions:{"有形商品":"有库存、物流、规格与SKU等实体属性的商品。","无形商品/服务":"留学、咨询等按真实服务结构管理，不机械套用有形商品规则。","其他商品":"未来真实业务出现后按需增加。"},
    flow:{status:"validating",label:"验证中",steps:["商品建档","分类/品牌","规格/SKU","店铺映射","经营使用","生命周期管理","归档/淘汰"]},
    metrics:[{label:"商品总数",source:"objects"},{label:"在用商品",state:"在用"},{label:"待完善",state:"待完善"},{label:"店铺已映射",state:"已映射"},{label:"本月新增",value:"按真实数据"}],
    fields:[{key:"name",label:"商品名称",required:true,primary:true},{key:"type",label:"商品类型",required:true,dictionary:true},{key:"category",label:"分类"},{key:"brand",label:"品牌"},{key:"sku",label:"SKU/规格"},{key:"owner",label:"负责人"},{key:"state",label:"状态"},{key:"result",label:"经营结果"}],
    cardFields:["category","brand","sku","owner","result"],listFields:["name","type","category","brand","sku","owner","state","result"],
    auxiliary:[{title:"店铺映射",text:"一个标准商品对应各店铺商品编号、销售链接和状态。"},{title:"资料资产",text:"主图、详情、说明、PDF等资料统一关联商品对象。"}],ai:{title:"AI秘书｜商品辅助",text:"可协助补全商品主数据、检查重复商品和跨店铺映射。"},seedObjects:[]
  },
  "ai-home": {
    routeId:"ai-home",title:"AI之家",icon:"AI",description:"统一管理美和集团AI人才、Skill、Agent、Connector、自动化能力、真实任务证据和治理边界。",overviewLabel:"AI概览",createLabel:"新建AI能力",objectName:"AI能力",objectPlural:"AI能力资料",typeDictionaryKey:"aiCapabilityTypes",
    typeDescriptions:{"AI人才":"围绕稳定责任域长期成长的AI角色。","Skill":"稳定方法、标准、判断逻辑和输出规范的知识能力。","Agent":"围绕明确目标连续判断、执行和跟进的多步骤能力。","Connector":"稳定读取或写入外部系统数据的连接能力。","传统自动化/API":"高频、确定性强的数据同步与系统操作。","Computer Use":"无稳定API时通过GUI执行重复操作。"},
    flow:{status:"validating",label:"验证中",steps:["能力建档","责任域/边界","真实任务","验证证据","能力升级","授权执行","治理/停用"]},
    metrics:[{label:"AI能力总数",source:"objects"},{label:"验证中",state:"验证中"},{label:"已验证",state:"已验证"},{label:"运行中",state:"运行中"},{label:"待治理",state:"待治理"}],
    fields:[{key:"name",label:"能力名称",required:true,primary:true},{key:"type",label:"AI能力类型",required:true,dictionary:true},{key:"owner",label:"人类负责人"},{key:"scope",label:"责任域"},{key:"state",label:"验证状态"},{key:"version",label:"版本"},{key:"evidence",label:"真实证据"},{key:"result",label:"业务结果"}],
    cardFields:["owner","scope","version","evidence","result"],listFields:["name","type","owner","scope","state","version","evidence","result"],
    auxiliary:[{title:"真实任务证据",text:"AI能力必须通过真实任务、质量、修正和业务结果逐步形成信用。"},{title:"治理边界",text:"高风险、关键规则与最终经营责任始终保留人类负责人。"}],ai:{title:"AI秘书｜AI之家辅助",text:"可协助登记能力、整理真实履历、发现可Skill化或自动化的成熟流程。"},seedObjects:[]
  },
  "shared-home": {
    routeId:"shared-home",title:"共享之家",icon:"共",description:"统一管理美和集团可共享使用的能力与客观资源；知识正文归知识之家，不因文件格式混入共享资产。",overviewLabel:"共享概览",createLabel:"新建共享资源",objectName:"共享资源",objectPlural:"共享资源",typeDictionaryKey:"sharedResourceTypes",
    typeDescriptions:{"文件资产":"Google Drive等正式文件与资料资产入口。","账号资产":"集团账号、身份与权限相关客观资产。","共用素材":"美和图标、Logo、图片、视频等集团共用素材。","共用模板":"表格、文档、业务模板等可复用资产。","共享工具":"集团共同使用的工具或能力入口。","公共资源":"跨事业公共使用的其他资源。","可复用能力":"可跨业务复用的组件、规则、自动化或服务能力。","代码资产":"正式代码与GitHub版本管理入口。"},
    flow:{status:"validating",label:"验证中",steps:["资源建档","分类归属","正式来源/地址","负责人/权限","共享使用","变更维护","归档/停用"]},
    metrics:[{label:"共享资源总数",source:"objects"},{label:"在用",state:"在用"},{label:"待整理",state:"待整理"},{label:"链接待确认",state:"链接待确认"},{label:"本月新增",value:"按真实数据"}],
    fields:[{key:"name",label:"资源名称",required:true,primary:true},{key:"type",label:"资源类型",required:true,dictionary:true},{key:"owner",label:"负责人"},{key:"state",label:"状态"},{key:"location",label:"正式来源/位置"},{key:"url",label:"打开入口",type:"url"},{key:"result",label:"用途/结果"}],
    cardFields:["owner","location","result"],listFields:["name","type","owner","state","location","result"],
    auxiliary:[{title:"Google Drive",text:"文件与资料继续以Google Drive为本体，AIONE管理目录、关系和入口。",url:"https://drive.google.com/"},{title:"GitHub代码资产",text:"正式代码以GitHub和代码主仓库为版本来源，AIONE保留统一打开入口。",url:"https://github.com/"},{title:"知识边界",text:"方法论、标准、制度、SOP等文字知识归知识之家统一管理。",route:"knowledge-home"}],ai:{title:"AI秘书｜共享资源辅助",text:"可协助整理资源目录、检查链接、识别重复资产并提示缺失负责人或权限。"},seedObjects:makeSharedSeedObjects()
  }
});
