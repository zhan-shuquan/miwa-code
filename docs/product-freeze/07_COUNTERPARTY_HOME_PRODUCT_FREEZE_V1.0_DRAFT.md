# 07｜往来之家 Product Freeze V1.0 Draft

状态：Draft / 待冻结
适用：美和AIONE一体化工作平台（AIONE）

## 1. 定位
往来之家是AIONE统一的外部业务往来对象事实源，负责承载“和谁发生业务关系、以什么角色发生关系、有哪些联系人、合作条件与往来记录”的Counterparty / Organization对象。

原则：同一家公司、机构或个人，不因为同时是客户、供应商、物流商、服务商或合作单位而建立多份主档。角色变化通过Role表达，不复制主体。

## 2. 目录与层级
- 07_00_概览
- 07_01_客户中心
- 07_02_供应商中心
- 07_03_物流中心
- 07_04_服务商中心
- 07_05_合作单位中心
- 07_90_往来资料管理

服务商三级可包括：税务、会计、法律、劳务、行政、建筑、IT等稳定服务类型。

## 3. 核心业务对象
- Counterparty：统一往来主体对象
- Organization：企业/机构主体
- ContactPerson：联系人
- CounterpartyRole：客户、供应商、物流、服务商、合作单位等角色
- RelationshipRecord：合作关系记录
- CommercialTerm：合作条款/商务条件
- CreditProfile：信用/结算相关业务信息
- Address / ContactPoint：地址与联系方式

公共附件、评论、关注、历史、权限由平台能力提供。

## 4. 唯一事实源
企业/机构/个人的主体身份、统一联系方式、基础往来关系与角色，由往来之家维护。

不重复维护：
- 商品事实 → 商品之家
- 渠道主体/店铺经营事实 → 渠道之家
- 工作执行 → 工作之家
- 财务应收应付/付款事实 → 财务之家
- 分析结果 → 分析之家

## 5. 角色模型
同一Counterparty可同时拥有多个Role，例如：Supplier + LogisticsProvider，或Customer + Partner。

Role至少包含：role_type、status、effective_from、effective_to、business_scope、owner、role_specific_fields。

角色只表达业务关系，不复制主体名称、地址、法人信息等公共主数据。

## 6. Page Type映射
- 07_00_概览 → PT-01 Overview Page
- 客户/供应商/物流/服务商/合作单位列表 → PT-02 Object List Page
- 单个Counterparty → PT-03 Object Workspace
- 合作流程需要阶段推进时 → PT-04 Workflow Page
- 往来分析 → PT-05 Analytics Dashboard或分析之家
- 分类/规则配置 → PT-06 Configuration Page
- 外部系统同步 → PT-08 Integration Page
- 往来资料管理 → PT-02 Object List + File & Asset

## 7. View / Scope
Scope建议：我的往来、事业、团队、全部、客户、供应商、物流、服务商、合作单位、启用、停用、重点、风险、待跟进。

单个Counterparty建议横向View：概览｜角色｜联系人｜商务条件｜关联商品/渠道｜往来记录｜文件｜历史。

## 8. 默认字段
Counterparty：id/code、display_name、legal_name、entity_type、status、country/region、registration_ref、tax_ref、primary_contact_ref、address_refs、role_refs、owner、business_scope、tags、created_at、updated_at、version。

ContactPerson：id、counterparty_id、name、title、department、email、phone、preferred_contact_method、status。

敏感字段必须实施Field Permission。

## 9. 默认操作
创建、查看、编辑、添加/移除Role、添加联系人、更新商务条件、关联对象、上传文件、关注、收藏、归档、删除、恢复、查看历史。

低频操作进入More；高风险操作必须确认并Audit。

## 10. 批量操作
支持：当前页全选、全部选择筛选结果、批量角色、批量负责人、批量状态、批量标签、批量导入、批量导出、批量归档、批量删除、批量恢复。

批量导入统一经过Import Engine，并在写入前做重复主体识别与预览。

## 11. 状态
Counterparty建议：ACTIVE、INACTIVE、BLOCKED、ARCHIVED、DEPRECATED、DELETED。

Role可独立拥有ACTIVE、PAUSED、ENDED等状态，不用主体主状态替代角色生命周期。

## 12. 权限
至少支持Role、Scope、Object、Field、Action Permission。

重点保护：联系人隐私、税务/登记信息、信用资料、合同条件、结算条件、黑名单/风险信息。

不同事业可共享同一主体，但只能看到被授权的角色、字段和记录。

## 13. 客户/供应商等不是第二套对象
客户中心、供应商中心、物流中心、服务商中心、合作单位中心本质上是Counterparty按Role过滤的业务视图。

不得分别建立CustomerCompany、SupplierCompany、LogisticsCompany五套重复主体模型，除非确有独立的角色扩展子对象。

## 14. AI与自动化
AI适合：主体去重建议、公司资料摘要、联系人信息整理、合作风险提示、商务记录总结、关系网络分析、资料缺失提示。

确定性能力优先：统一编码、重复检测规则、角色校验、必填字段、到期提醒、权限过滤。

所有AI调用统一经过AIONE AI Gateway。

## 15. 往来闭环
主体建立 → 角色确认 → 联系人与商务条件 → 真实业务发生 → 工作/订单/商品/财务引用 → 往来记录积累 → 风险/价值分析 → 关系维护。

## 16. 资料管理
合同、报价、公司介绍、资质、证照、商谈记录、照片、名片等通过统一File & Asset管理，并关联Counterparty / Role。

不得因客户页、供应商页不同而重复保存同一资料。

## 17. 异常治理
必须处理：重复主体、同公司多角色被重复建档、法人名与显示名混淆、联系人重复、主体合并后的引用迁移、角色失效但业务仍调用、跨事业越权、敏感字段泄露、资料多份且CURRENT不明、外部系统ID冲突。

## 18. 验收标准
1. 同一外部主体只存在一个Counterparty / Organization主对象。
2. 客户、供应商、物流、服务商、合作单位通过Role表达。
3. 角色View不复制主体公共主数据。
4. 联系人、商务条件、信用等结构化且有权限边界。
5. 工作、商品、渠道、财务等通过Reference关联，不复制事实。
6. 批量导入具备重复主体识别。
7. 文件、评论、历史、权限、Audit复用平台能力。
8. AI仅辅助整理、识别和建议，不替代确定性主数据规则。
9. 同主体跨事业共享但受Scope / Field Permission控制。
10. 当前文档定义Product/Architecture Truth，不自动声明main已实现。

## 19. 当前冻结判断
当前建议状态：Draft / 待横向Review。待12之家完成后统一Review，再决定是否升为CURRENT V1.0。
