# AIONE V1.7.0｜核心数据与后端基础候选基线

**阶段：第6阶段｜标准对象关系模型 → PostgreSQL Schema → Backend API**  
**状态：CANDIDATE / 尚未对线上Cloud SQL执行迁移**

## 本轮完成

1. 建立机器可读核心对象模型 `aione-core-object-model.v1.json`。
2. 明确 `people` 继续作为唯一Person主数据，不重复建立人才表。
3. 建立 Organization / Business / Position / Assignment 四层组织与任职骨架。
4. 岗位与编制正式分离；Position支持human/ai，AI岗位可不启用人力编制。
5. 建立 Object Registry / Object Relation，用于跨业务关系，不替代专业业务表。
6. 建立 Work Item / Work Session / Work Evidence，让工作之家和人才之家共享真实工作证据。
7. 建立 Money Event / Result Fact，统一时间、钱、事、结果的数据入口。
8. 建立 Business Event，统一人工、系统、自动化、未来AI执行的事件语言。
9. 建立 Knowledge Route，承接V1.6字段到知识/规则/帮助精准路由。
10. 建立 AI Execution 最小底座，为岗位AI办公室/AI秘书下一阶段准备执行审计。
11. 新增PostgreSQL增量迁移脚本与migration runner / preflight。
12. 后端升级为 `/api/v1` 模块化核心API；保留 `/api/product-opportunities` Legacy入口。
13. 新增人员时间汇总与工作证据汇总API。
14. 修复原无效 `backend/package.json`，补齐可执行脚本和Cloud SQL/TCP连接配置。
15. 建立OpenAPI、事件契约、字段到数据库映射与查询样例。

## 明确没有做

- 没有对线上Cloud SQL执行迁移（当前运行环境没有正式数据库凭据）。
- 没有直接把前端localStorage工作数据强行迁入数据库。
- 没有重写选品 `product_opportunities` 正式业务表。
- 没有开始第7阶段GPT/AI秘书Tool调用。
- 没有一次性建设完整ERP/HR专业Schema。

## 下一关

必须先在有Cloud SQL访问能力的正式开发环境执行：

`db:preflight → 人工确认 → db:migrate → API smoke test`

通过后，再逐步把工作之家、人才之家等页面数据源从本地预演切换为正式API。
