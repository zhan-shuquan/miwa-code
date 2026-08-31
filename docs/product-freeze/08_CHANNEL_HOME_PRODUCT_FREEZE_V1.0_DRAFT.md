# 08｜渠道之家 Product Freeze V1.0 Draft

状态：Draft / 待冻结
适用：美和AIONE一体化工作平台（AIONE）

## 1. 定位
渠道之家是AIONE统一的经营渠道管理域，负责承载“通过哪里经营、以什么渠道模式经营、有哪些店铺/平台/线下/批发/直播/加盟/代理渠道，以及这些渠道如何配置、连接、运营”的Channel及其子类型对象。

渠道之家不复制商品、客户、订单、财务等业务事实。它维护渠道身份、渠道类型、渠道配置和渠道关系，实际业务数据由对应Domain提供并通过Reference进入渠道视图。

## 2. 目录与层级
- 08_00_概览
- 08_01_店铺中心
- 08_02_平台中心
- 08_03_批发中心
- 08_04_线下中心
- 08_05_直播中心
- 08_06_加盟中心
- 08_07_代理中心
- 08_90_渠道资料管理

原则：各中心代表稳定的经营渠道/经营模式，不因单个店铺、平台账号或合作方而新增Page Type。

## 3. 核心业务对象
- Channel：统一渠道主对象
- Store：具体店铺/站点/账号经营单元
- Platform：平台主体及平台级规则
- WholesaleChannel：批发渠道配置
- OfflineChannel：线下直营/自营经营渠道
- LiveChannel：直播渠道
- FranchiseChannel：加盟渠道
- AgencyChannel：代理渠道
- ChannelAccount：外部账号/店铺账号
- ChannelMapping：商品、订单、客户等对象的渠道映射
- ChannelPolicy：渠道政策与约束

原则：Channel是统一基础对象，子类型通过type / subtype + 扩展Schema表达，不建立七套完全不同的底层对象模型。

## 4. 店铺与平台边界
Platform表示乐天、Amazon、Wix等平台级能力、规则和集成边界。
Store表示在某个平台或独立站上的具体经营店铺/站点/账号。

例如：楽天 = Platform；幸せ屋 / PrimeLife / Global Dimensions = Store。

同一Platform可关联多个Store。Store必须引用Platform或独立站类型，不复制平台规则。

## 5. 各渠道类型边界
- 店铺：具体运营单元，可线上也可独立站。
- 平台：承载平台规则、API、类目、费用、政策等平台级配置。
- 批发：面向批发客户/渠道的销售模式与合作配置。
- 线下：美和直接运营或控制的实体销售/体验渠道。
- 直播：直播平台/账号及直播经营配置。
- 加盟：加盟体系、加盟商关系与授权经营配置。
- 代理：代理商/区域代理及授权销售配置。

同一个Counterparty可以参与批发、加盟、代理等关系，但主体仍来自往来之家；渠道之家只保存渠道关系与配置。

## 6. 唯一事实源
渠道身份、渠道类型、平台/店铺关系、渠道账号、映射、政策、集成状态由渠道之家维护。

不重复维护：
- Product / SKU / Inventory → 商品之家
- 客户/合作单位主体 → 往来之家
- 工作执行 → 工作之家
- 财务事实 → 财务之家
- 经营分析 → 分析之家

## 7. Page Type映射
- 08_00_概览 → PT-01 Overview Page
- 各渠道中心列表 → PT-02 Object List Page
- 单个Channel / Store / Platform → PT-03 Object Workspace
- 渠道开通/上线流程需要阶段推进时 → PT-04 Workflow Page
- 渠道经营分析 → PT-05 Analytics Dashboard或分析之家
- 渠道规则/参数配置 → PT-06 Configuration Page
- API/账号/同步/映射 → PT-08 Integration Page
- 渠道资料管理 → PT-02 Object List + File & Asset

## 8. View / Scope
Scope建议：我的渠道、事业、全部、平台、店铺、批发、线下、直播、加盟、代理、启用、停用、异常、待配置。

单个Channel建议View：概览｜基础资料｜账号/店铺｜商品映射｜政策｜集成｜经营数据｜文件｜历史。

## 9. 默认字段
Channel：id/code、name、type、subtype、status、owner、business_scope、counterparty_ref、platform_ref、region、currency、timezone、policy_refs、integration_refs、tags、created_at、updated_at、version。

Store：id/code、channel_id、platform_id、name、external_store_id、status、domain/url_ref、account_ref、locale、currency、timezone、listing_config_ref。

敏感凭据不得进入普通字段，统一交由Secret Manager / Integration能力管理。

## 10. 默认操作
创建、查看、编辑、启用、停用、绑定平台、绑定往来主体、绑定账号、配置商品映射、配置政策、测试连接、同步、查看日志、归档、删除、恢复、查看历史。

外部账号授权、批量同步、配置变更必须有权限与Audit。

## 11. 批量操作
支持：当前页全选、全部选择筛选结果、批量负责人、批量状态、批量标签、批量导入、批量导出、批量同步、批量归档、批量删除、批量恢复。

批量同步需要显示成功/失败明细并支持重试，不能只返回一个总成功状态。

## 12. 状态
Channel建议：DRAFT、CONFIGURING、ACTIVE、PAUSED、ERROR、ARCHIVED、DEPRECATED、DELETED。

Integration/Store可拥有独立状态，不用Channel主状态代替全部连接状态。

## 13. 权限
至少支持Role、Scope、Object、Field、Action Permission。

重点保护：账号信息、API凭据、结算/费用配置、渠道政策、批量同步、外部发布、停用/删除渠道。

不同事业可共用同一Platform，但Store与经营数据按事业/角色隔离。

## 14. 商品与上架关系
商品主数据与SKU在商品之家；渠道之家维护渠道身份与配置。

Listing对象可在商品之家上架中心作为商品侧主入口，但必须引用Channel / Store，并通过统一ChannelMapping / Integration Contract实现，不得在渠道之家复制商品主数据。

最终对象归属在12之家横向Review时进一步校验，但原则上只能存在一个CURRENT Listing模型。

## 15. 集成
优先通过正式API / Connector与外部平台连接；只有成熟API无法覆盖时才考虑Computer Use。

所有外部集成应有：connection_status、credential_ref、mapping_version、last_sync_at、sync_direction、error_state、retry_policy、log_ref。

凭据统一进入Secret Manager，不存页面或Repo明文。

## 16. AI与自动化
AI适合：渠道资料摘要、平台规则理解、映射建议、异常原因分析、运营机会建议、渠道组合建议。

确定性能力优先：账号状态同步、字段映射、类目映射、发布校验、定时同步、失败重试、Webhook处理。

所有AI调用统一经过AIONE AI Gateway。

## 17. 渠道闭环
Channel建立 → 账号/Store配置 → 商品/Listing映射 → 发布/运营 → 订单/客户/库存/财务产生真实事实 → 分析之家汇总 → 渠道优化。

## 18. 资料管理
渠道合同、平台政策、账号资料、商谈记录、门店照片、名片、渠道手册等使用统一File & Asset能力，并关联Channel / Store / Counterparty。

不得因不同页面重复保存同一资料。

## 19. 异常治理
必须处理：同一Store重复建档、Platform与Store混淆、账号凭据明文、同一商品映射多套模型、同步失败无日志、外部ID冲突、渠道主体与往来主体重复建档、店铺停用但同步仍执行、Platform规则被复制到每个Store、Listing归属冲突。

## 20. 验收标准
1. Channel为统一基础对象，各渠道类型通过type/subtype扩展。
2. Platform与Store边界明确，保持Platform 1:N Store。
3. 批发/加盟/代理等参与主体引用往来之家，不重复建档。
4. 商品与SKU仍归商品之家，渠道只维护渠道关系/映射。
5. 账号凭据统一进入Secret Manager。
6. 外部集成复用Integration能力，有日志、错误和重试。
7. 批量同步可查看逐项结果。
8. 渠道分析读取真实业务事实，不建立第二套销售数据。
9. AI用于理解/建议，确定性同步与映射由API/规则/自动化完成。
10. 当前文档定义Product/Architecture Truth，不自动声明main已实现。

## 21. 当前冻结判断
当前建议状态：Draft / 待横向Review。待12之家完成后统一Review，再决定是否升为CURRENT V1.0。

## 22. 横向Review回写｜2026-08-31
本节优先于前文中与跨之家归属冲突的Draft描述。
- Channel / Platform / Store主对象继续归08；Product / SKU / Listing归06。08不得复制商品主数据，06不得复制渠道主档。
- 商品上架Listing与平台Publication Layer明确为不同概念。
- 外部账号、认证、Secret、Connector、Webhook、同步任务等技术实现统一进入Platform Integration Service / Adapter；08只保留业务配置、引用和运行状态视图。
- Store引用Platform形成1:N关系，平台资料不在每个Store重复维护。
- 渠道经营分析归10语义层；08仅提供来源事实和业务上下文。
- 公共文件、权限、评论、历史、Audit、Search统一复用平台能力。
- 本文仍为Draft，待第二轮一致性检查通过后再升级RC。
