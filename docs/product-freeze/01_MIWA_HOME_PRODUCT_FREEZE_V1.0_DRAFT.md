# 01｜美和之家 Product Freeze V1.0 Draft

状态：Draft / 待冻结
适用：美和AIONE一体化工作平台（AIONE）

## 1. 定位
美和之家是AIONE的企业根，用于承载“美和是谁、为什么存在、如何治理、如何发展”的集团级正式事实与治理信息。

它不是工作流系统、商品系统、财务系统或知识仓库的替代品；其职责是提供公司级身份、治理、架构、战略和方法论根节点，并引用其他之家中的业务事实。

## 2. 目录与层级
- 01_00_概览
- 01_01_集团理念
- 01_02_集团架构
- 01_03_集团组织
- 01_04_发展规划
- 01_05_集团治理
- 01_06_经营战略
- 01_07_经营方法
- 01_08_法务合规
- 01_09_公共关系
- 01_10_风险管理
- 01_90_集团资料管理

集团架构三级：
- 01_02_01_集团总体架构
- 01_02_02_法人架构
- 01_02_03_事业架构
- 01_02_04_管理架构
- 01_02_05_集团关系

法人架构下：
- 01_02_02_01_美和商会株式会社
- 01_02_02_02_武夷山市美和电子商务有限公司

## 3. 主要业务对象
- Organization：集团/公司/组织节点
- LegalEntity：法人主体
- GovernanceRecord：集团治理规则与治理事项
- StrategyRecord：集团级战略
- DevelopmentPlan：中长期发展规划
- Methodology：集团经营方法与方法论
- RiskRecord：集团级风险记录
- ComplianceRecord：法务与合规记录

原则：不因页面不同重复创建同一组织或法人对象。

## 4. 唯一事实源
美和之家负责：集团身份与集团级定位、集团与法人架构、集团治理、集团级发展规划与经营战略、集团经营方法论。

不负责重复维护：
- 事业经营事实 → 事业之家
- 工作执行事实 → 工作之家
- 人员事实 → 人才之家
- 商品/库存事实 → 商品之家
- 往来主体事实 → 往来之家
- 财务事实 → 财务之家
- 分析指标事实 → 分析之家
- 正式知识条目 → 知识之家

美和之家通过 Reference / View / Scope 调用上述事实。

## 5. Page Type映射
- 01_00_概览 → PT-01 Overview Page
- 集团理念 / 经营方法 / 法务合规等正式内容 → PT-07 Knowledge Page为主
- 集团架构 / 集团组织 → PT-07 Knowledge Page + 结构化Organization视图；必要时嵌入组织关系图组件
- 发展规划 / 经营战略 → PT-07 Knowledge Page + 时间轴/目标块
- 风险管理 → PT-02 Object List + PT-03 Object Workspace（当风险记录成为稳定对象时）
- 集团资料管理 → PT-02 Object List，底层调用统一File & Asset能力

原则：不为美和之家单独创造新的Page Type。

## 6. View / Scope
推荐Scope：集团、法人、事业引用、当前组织、当前有效/历史。

推荐View：在线阅读、结构图、时间线、列表、Publication / Print / PDF。

## 7. 默认字段
Organization / LegalEntity基础字段：id/code、name、type、status、parent_id、legal_name、jurisdiction、owner/responsible_person、effective_from/effective_to、description、tags、related_objects、attachments、version、created_at/updated_at。

正式治理/战略/方法记录增加：title、category、summary、content_reference、effective_date、review_date、approval_status、version_status。

页面不因展示需要自行复制字段。

## 8. 默认操作
高频操作直接显示：查看、搜索、分享、下载、打印。

低频操作进入More / Context Menu：编辑、复制、移动、归档、删除、版本历史、权限。

所有操作遵守AIONE Progressive Disclosure CURRENT标准。

## 9. 批量操作
适用于对象列表/资料管理：当前页全选、全部选择当前筛选结果、全部取消、批量标签、批量负责人、批量导出、批量归档、批量删除、批量恢复。

集团理念、正式战略等Publication型正式内容不强行提供无意义的批量业务操作。

## 10. 状态
建议统一状态模型：DRAFT、VALIDATING、CURRENT、ARCHIVED、DEPRECATED、DELETED。

显示名称通过i18n资源层转换，业务逻辑不得依赖中文标签。

## 11. 权限
至少支持 Role / Scope / Object Permission / Field Permission / Action Permission。

高风险内容如法人信息、治理、法务、风险、正式战略，应支持更严格Scope与Action Permission。永久删除、权限变更、正式发布必须进入Audit。

## 12. 流程
美和之家不建设通用Workflow Engine。如集团治理事项、风险处置、战略评审需要流程，则调用平台Workflow能力；流程结果回写对应对象状态与历史。

建议最小状态推进：草稿 → 验证中 → 正式CURRENT → 归档/废止。

## 13. AI与自动化
AI适合：集团资料摘要、战略/治理内容检索、多文档对比、风险提示、方法论关联、正式资料生成辅助。

确定性能力优先：到期复审提醒、版本状态检查、必填字段校验、权限检查、Publication生成。

所有AI调用统一经过AIONE AI Gateway；AI生成不自动等于正式批准。

## 14. 资料与Publication
概览、集团架构、经营战略、经营方法等应支持Publication Layer：Web View、Print View、A4、PDF、Download、Share。

集团资料管理使用统一File & Asset能力，不复制第二套文件系统。

## 15. 异常与治理
必须处理：同一法人重复创建、CURRENT定义并存多份、旧名称残留、页面局部维护第二套集团架构、正式内容无版本状态、删除正式治理记录但无Audit、多语言复制出第二套业务对象。

发现上述问题优先从 Object / Knowledge / Version / Permission / Architecture 层修复，而非页面打补丁。

## 16. 验收标准
1. 目录和层级唯一且无旧名称并存。
2. 集团/法人对象不因页面重复建模。
3. 所有页面能映射到既有Page Type。
4. 资料、评论、权限、历史、Publication调用平台统一能力。
5. 集团级事实与事业/工作/人才/商品/财务等事实边界清楚。
6. CURRENT正式定义只有一套，旧定义可进入Deprecated管理。
7. 中文为当前默认显示，但机器identity与显示标签分离。
8. 关键发布、权限、删除操作可审计。
9. 不新增美和之家专属基础组件来替代Shared Component。
10. 当前文档仅定义Product/Architecture Truth，不自动声明main已实现。

## 17. 当前冻结判断
当前建议状态：Draft / 待Review。
在总架构Product Freeze阶段确认无冲突后，可升级为CURRENT V1.0。

## 18. 横向Review回写｜2026-08-31
本节优先于前文中与跨之家归属冲突的Draft描述。
- 01美和之家继续拥有Organization / LegalEntity及集团治理、战略等公司级事实。
- Department / Position等组织结构定义归01；04人才之家只维护Person与组织/岗位之间的任职关系、历史与投影。
- Brand、Counterparty与LegalEntity保持独立对象，仅通过稳定Reference关联，不合并事实源。
- 公共字段、权限、附件、评论、历史、Audit、Search等统一复用Platform Object Foundation与Platform Capability。
- 本文仍为Draft，待第二轮一致性检查通过后再升级RC。
