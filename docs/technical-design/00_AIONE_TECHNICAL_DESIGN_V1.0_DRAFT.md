# 00｜AIONE Technical Design V1.0 Draft

状态：Draft / Technical Design启动
日期：2026-08-31
适用：美和AIONE一体化工作平台（AIONE）

## 目标
把CURRENT Product Truth / Architecture Truth转换成可实施Contract，解决main中“旧架构 + 新平台能力 + 真实业务实现”并存的问题。

不采用Big Bang Rewrite，采用Migration模式：CURRENT Contract → 新Platform能力 → Adapter兼容旧实现 → Domain逐步迁移 → Deprecated旧路径 → Guardrail禁止回流 → 删除旧代码。

## 工作包
1. TD-01 Object Model & Domain Contract
2. TD-02 Page Type & Frontend Architecture Contract
3. TD-03 Permission Engine Contract
4. TD-04 API & Application Layer Contract
5. TD-05 Integration & Source of Truth Contract
6. TD-06 File & Asset Contract
7. TD-07 AI Gateway Contract
8. TD-08 Search / Notification / Workflow / Automation Contract
9. TD-09 Analytics Contract
10. TD-10 Migration & Compatibility Plan
11. TD-11 Architecture Guardrails & CI/CD

## P0顺序
TD-01 Object Model → TD-03 Permission → TD-04 API → TD-05 Integration/SoT → TD-11 Guardrails。

## 彻底解决混合过渡状态的验收
- 12之家只有一个CURRENT IA Registry事实源
- CURRENT Object Model成为DB/API唯一Contract
- PT-01～PT-08成为唯一Page Type Registry
- Platform Capability全部统一接口
- Permission Engine覆盖所有写操作与敏感读取
- Source of Truth Contract覆盖外部系统共享事实
- Guardrail自动阻止Deprecated Name / Route / Token / Duplicate Component / Contract漂移
- main开启Branch Protection并要求CI
- 旧兼容层有明确删除计划并最终删除
- CURRENT架构至少完成一条真实业务端到端验证并复用到第二个Domain

下一步：TD-01｜AIONE Object Model & Domain Contract V1.0 Draft。
