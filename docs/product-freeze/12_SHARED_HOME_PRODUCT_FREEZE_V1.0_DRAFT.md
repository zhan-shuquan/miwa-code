# 12｜共享之家 Product Freeze V1.0 Draft

状态：Draft / 待冻结
适用：美和AIONE一体化工作平台（AIONE）

## 1. 定位
共享之家是AIONE统一的跨业务共享资源、系统资产、工具资产、代码资产、媒体资产、品牌资源、办公资源、ERP入口与集成资源管理域。

共享之家解决的是“全公司共同使用什么”，不是业务事实源，也不是所有东西都可以往里放的杂物间。

原则：能被多个之家复用、具有稳定共享价值的系统、工具、代码、素材、品牌资产、办公资源、集成资源，才进入共享之家。

## 2. 目录与层级
- 12_00_概览
- 12_01_系统中心
- 12_02_工具中心
- 12_03_代码中心
- 12_04_图片中心
- 12_05_图标中心
- 12_06_视频中心
- 12_07_品牌资源中心
- 12_08_办公资源中心
- 12_09_ERP中心
- 12_10_集成中心
- 12_90_共享资料管理

原则：中心按稳定资源类型和共享能力组织，不为单一页面、单一业务或单一临时文件新建长期中心。

## 3. 核心业务对象
- SharedResource：统一共享资源基础对象
- SystemResource：共享系统/平台资源
- ToolResource：共享工具资源
- CodeResource：代码仓库/代码资产引用
- ImageAsset：图片资产
- IconAsset：图标资产
- VideoAsset：视频资产
- BrandAsset：品牌资源
- OfficeResource：办公资源
- ERPResource / ERPConnection：ERP入口或ERP能力引用
- IntegrationResource：集成资源
- ResourceVersion：共享资源版本
- ResourceRelation：共享资源与业务对象/系统能力的关系

原则：优先采用SharedResource统一底座 + type-specific schema，不建立十套完全割裂的资源模型。

## 4. 唯一事实源边界
共享之家可以拥有：共享资源身份、分类、状态、权限、版本、使用范围、引用关系、说明与索引。

共享之家不拥有：
- 公司/组织事实 → 美和之家
- 事业事实 → 事业之家
- 工作事实 → 工作之家
- 人员事实 → 人才之家
- AI资产与AI绩效 → AI之家
- 商品/SKU/库存 → 商品之家
- 客户/供应商等主体 → 往来之家
- 渠道经营事实 → 渠道之家
- 财务事实 → 财务之家
- 分析指标/结果 → 分析之家
- 正式知识 → 知识之家

共享之家只提供跨域复用资源和引用。

## 5. 系统中心
系统中心管理全公司共享使用的系统与平台入口，例如Google Workspace、AIONE、Robot-in、物流系统、外部ERP等。

SystemResource至少包含：系统名称、类型、用途、负责人、使用范围、入口、状态、认证方式引用、集成状态、文档引用、版本/供应商信息。

系统中心不保存密码、API Key、Secret明文；敏感凭据统一使用Secret Manager或受控Credential能力。

## 6. 工具中心
工具中心管理可被多个业务域复用的软件、SaaS、桌面工具、浏览器工具、设计工具、AI工具等。

ToolResource重点管理：用途、适用人群、入口、费用类型、权限、负责人、使用规范、替代工具、状态。

不得把“某一个业务流程中的业务对象”误当成工具资源。

## 7. 代码中心
代码中心只作为代码资产的业务索引、说明和治理入口。

GitHub Repo仍然是代码唯一技术事实源。

代码中心可保存：repository_ref、branch/tag/ref、用途、负责人、系统归属、运行环境、发布状态、技术文档引用、依赖关系。

不得把GitHub代码复制到AIONE数据库形成第二套代码事实源。

## 8. 图片 / 图标 / 视频中心
图片、图标、视频属于统一Asset体系中的不同资源类型。

应支持：资源ID、文件引用、版权/来源、适用范围、品牌、用途、尺寸/格式、状态、版本、标签、关联商品/渠道/项目等。

同一资产不要因不同页面重复上传；通过Reference复用。

## 9. 品牌资源中心
品牌资源包括Logo、VI、品牌色、字体使用规范、包装规范、标准图形、品牌模板等。

品牌资源中心保存正式品牌资产与版本；品牌制度、标准和方法说明可引用知识之家对应KnowledgeItem。

品牌Token如颜色、字体、间距等若属于AIONE Design System，则Repo / Design Token标准仍是技术事实源；共享之家提供业务可见索引与使用入口。

## 10. 办公资源中心
办公资源管理跨部门共享使用的办公模板、表格、常用文件、公共表单、常用链接、会议资源等。

正式制度/标准/SOP不应只存在办公资源中心，应进入知识之家；办公资源中心可以引用其输出版本。

## 11. ERP中心
ERP中心是企业ERP相关能力、系统入口、数据映射和集成状态的管理入口，不代表AIONE必须自建一套传统ERP。

如Robot-in、会计系统、仓储系统或未来ERP承担正式事实源，应通过Integration明确Source of Truth边界。

ERP中心不得形成第二套订单、库存、财务、客户主数据。

## 12. 集成中心
集成中心管理AIONE与外部系统之间的Connector、API、Webhook、认证、同步任务、数据映射、错误状态和运行情况。

IntegrationResource至少包含：source_system、target_system、integration_type、owner、status、auth_ref、mapping_ref、schedule/trigger、last_sync_at、error_state、version。

技术实现应进入统一Integration Service / Adapter层，不允许页面自行写一套外部连接逻辑。

## 13. 与AI之家能力中心边界
AI之家能力中心负责Skill、Connector、Agent、Computer Use、自动化、API、规则函数、模型能力在AI工作中的能力语义、分配、训练、绩效和费用。

共享之家集成中心负责企业级外部系统连接与共享集成资源。

同一个Connector实现原则上只有一个技术事实源；AI之家引用其AI能力语义，共享之家提供企业级资源/集成索引，不复制实现。

最终对象归属在12之家横向Review时统一冻结。

## 14. Page Type映射
- 12_00_概览 → PT-01 Overview Page
- 各资源中心列表 → PT-02 Object List Page
- 单个SharedResource → PT-03 Object Workspace
- 集成开通/迁移等流程 → PT-04 Workflow Page（确有阶段推进时）
- 资源使用分析 → PT-05 Analytics Dashboard或分析之家
- 资源配置/分类 → PT-06 Configuration Page
- 集成中心 → PT-08 Integration Page
- 共享资料管理 → PT-02 Object List + File & Asset

## 15. View / Scope
Scope建议：全部、我的常用、事业、部门、资源类型、状态、负责人、内部/外部、免费/付费、集成状态、最近使用、最近更新。

单个资源建议View：概览｜用途｜权限｜配置/连接｜关联对象｜文件｜版本｜使用情况｜历史。

## 16. 默认字段
SharedResource至少包含：id/code、name、type、status、description、owner、business_scope、access_scope、provider、entry_ref/url_ref、file_ref、repository_ref、integration_ref、cost_type、version、tags、created_at、updated_at。

敏感Credential只保存引用，不保存明文。

## 17. 状态
建议共享资源状态：DRAFT、VALIDATING、ACTIVE、PAUSED、DEPRECATED、ARCHIVED、DELETED。

Integration连接状态独立管理：CONNECTED、DEGRADED、FAILED、DISCONNECTED。

资源业务状态与连接技术状态不得混用。

## 18. 权限
至少支持Role、Scope、Object、Field、Action Permission。

重点保护：管理员系统入口、外部账号、代码仓库、API配置、凭据引用、付费资源、内部品牌源文件、敏感办公文件。

共享不等于所有人都可见；共享资源必须有明确的Access Scope。

## 19. 搜索与快捷调用
共享之家接入统一Search，支持按类型、用途、负责人、平台、品牌、标签和关联业务对象检索。

用户可Pin/收藏常用资源形成个人快捷入口，但不得复制SharedResource对象。

## 20. AI与自动化
AI适合：资源摘要、分类、标签、重复资源检测、工具推荐、集成异常解释、资产检索、品牌资源匹配。

确定性能力优先：连接检测、状态同步、权限校验、Secret引用、版本检查、重复URL/Repo检测、Deprecated检查。

所有AI调用统一经过AIONE AI Gateway。

## 21. 共享资源闭环
资源提出 → 去重/评估 → 建立SharedResource → 权限/负责人/版本明确 → 投入使用 → 记录使用与问题 → 优化/替换 → Deprecated/Archive。

共享之家重点是减少重复采购、重复开发、重复上传和重复维护。

## 22. 外部成熟能力优先
Google、GitHub及成熟SaaS已经解决的问题，优先采用、集成或引用，不重复开发低质量替代品。

AIONE只建设美和特有的业务对象、业务规则、统一体验、权限语义、AI治理和跨系统关系。

## 23. 资料管理
共享资料管理负责共享资源相关的说明文件、手册、合同、授权材料、采购资料、配置资料和历史附件。

它不是第二套共享资源中心；所有资料必须关联具体SharedResource或正式KnowledgeItem。

## 24. 异常治理
必须处理：共享之家变成杂物间、同一工具/系统重复建档、GitHub代码复制进数据库、Secret明文存储、集成逻辑散落页面、同一图片/图标重复上传、品牌资源多份CURRENT、ERP重复业务事实、Connector在AI之家和共享之家两套实现、已废弃资源仍被调用、共享权限过宽。

## 25. 验收标准
1. SharedResource形成统一共享资源底座。
2. 共享之家不拥有其他业务域正式事实。
3. GitHub仍是代码唯一技术事实源。
4. Secret不得明文存储在共享资源对象或普通文件中。
5. 系统/工具/代码/媒体/品牌/办公/ERP/集成边界清晰。
6. 同一共享资产只保存一份，通过Reference复用。
7. ERP中心不复制订单、库存、财务、客户等业务事实。
8. Integration统一进入Integration Service / Adapter层。
9. 与AI之家Connector边界在横向Review中收口为单一技术事实源。
10. 当前文档定义Product/Architecture Truth，不自动声明main已实现。

## 26. 当前冻结判断
当前建议状态：Draft / 待横向Review。12之家第一轮Product Freeze Draft至此齐备，下一阶段进入跨之家横向Review、对象归属冲突清理、唯一事实源收口，再决定哪些文档升级为CURRENT V1.0。
