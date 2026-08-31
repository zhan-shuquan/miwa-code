# TD-01F｜AIONE Preflight Implementation Design & Read-Only Query Pack V1.0 Draft

状态：Draft / Preflight Implementation Design
日期：2026-08-31
对照：AIONE 12之家 Product Freeze V1.0 CURRENT + TD-01/01A/01B/01C/01D/01E

## 1. 目标
把TD-01E定义的Preflight标准转换成可实现模块与只读SQL Query Pack，为实际M0 Live DB Preflight做准备。

本文件仍不修改生产数据库，也不创建0080/0090 migration SQL。

## 2. 实现结构
建议将现有单文件preflight.js演进为：
- preflight/index.js：入口与run_id/context
- preflight/schema-inventory.js：表、列、约束、索引、trigger、extension
- preflight/data-profile.js：NULL/distinct/status/time/json分布
- preflight/relation-check.js：物理FK与logical orphan
- preflight/migration-assumption-check.js：M1/M2专项假设验证
- preflight/risk-evaluator.js：BLOCKER/HIGH/MEDIUM/LOW + Go/No-Go
- preflight/report-renderer.js：JSON + Markdown

现有preflight.js保留为兼容入口，内部调用新模块，避免改变现有运维调用方式。

## 3. Read-Only Query Pack原则
所有生产Preflight SQL必须只读，只允许：SELECT、WITH、information_schema、pg_catalog、pg_indexes、pg_constraint、pg_trigger、pg_extension等系统查询。

禁止：INSERT/UPDATE/DELETE/ALTER/CREATE/DROP/TRUNCATE、临时修复SQL、自动数据清洗。

## 4. Query Pack A｜Database Context
采集：current_database(), current_schema(), current_user, server_version, timezone, transaction_read_only, now()。

额外记录应用commit SHA与environment，但不输出DATABASE_URL或Secret。

## 5. Query Pack B｜Table Inventory
查询public下全部base table/view/materialized view、owner、estimated rows、size。

核心表另执行COUNT(*)精确计数。大表若未来超过阈值，可允许estimate+抽样，但M0阶段核心表优先精确。

## 6. Query Pack C｜Column Inventory
基于information_schema.columns采集：table_name, ordinal_position, column_name, data_type, udt_name, is_nullable, column_default, identity/generation信息。

输出所有核心表，不再只读取people/product_opportunities。

## 7. Query Pack D｜Constraints
从pg_constraint / information_schema采集：PK、FK、UNIQUE、CHECK、deferrable、validated、ON UPDATE/DELETE。

必须特别标记：代码逻辑依赖但数据库没有FK的logical relation。

## 8. Query Pack E｜Indexes
读取pg_indexes及pg_index，输出：index name、table、unique、valid、ready、partial predicate、index expression/columns。

检查重复/近重复索引候选，但Preflight只报告，不自动删除。

## 9. Query Pack F｜Triggers & Extensions
列出非internal trigger及enabled状态；列出extension与version。

目的：避免migration遗漏自动写逻辑或依赖扩展。

## 10. Query Pack G｜Generic Data Profile
对核心表按安全白名单字段执行：
- total_count
- null_count
- distinct_count
- blank_count（text）
- min/max（time/number）
- top values（status/type/source_system，限制Top N）

不得动态拼接任意用户输入表名；表/字段必须来自内部白名单或经过identifier quoting。

## 11. Query Pack H｜Status Profile
重点收集：work_items、assignments、work_proposals、ai_talents、ai_assignments、ai_executions、money_events、product_opportunities等实际status/type distinct values与count。

未知值与TD-01映射表比较，输出UNKNOWN_STATUS风险。

## 12. Query Pack I｜Identity Integrity
external_identities检查：
- provider/subject NULL
- provider+subject重复
- 同provider+subject映射多个person
- person_id orphan
- 同person多身份分布
- verified/email现状（仅统计，不输出完整个人信息）

people检查主键类型、重复业务标识候选与状态分布。

## 13. Query Pack J｜Assignment Integrity
assignments：
- person orphan
- position orphan
- organization/business orphan
- effective_from > effective_to
- 同person同时多个primary候选
- assignment_type/status分布
- WorkItem.owner_assignment_id引用覆盖率

输出EmploymentRelation/PositionAssignment backfill的候选分组统计。

## 14. Query Pack K｜Proposal Integrity
work_proposals：
- status分布
- seed orphan
- approved_work_id orphan
- approved_work_id NULL/非NULL按status交叉分布
- expired_at逻辑异常
- 重复proposal候选（source/seed/action/payload hash）
- payload关键字段完整率

检查Repo/DB中是否存在第二套AI proposal持久化来源；若存在，标记POTENTIAL_DUAL_MASTER。

## 15. Query Pack L｜Work Integrity
work_items及参与/证据/session/result：
- business/owner assignment orphan
- participant orphan
- evidence/session/result work_item orphan
- active work item缺owner候选
- lifecycle/status时间矛盾
- owner_person_id与owner_assignment_id映射一致性（若两者存在）

## 16. Query Pack M｜AI Integrity
ai_talents / ai_offices / ai_assignments / ai_executions：
- office secretary talent orphan
- assignment talent/office/position orphan
- AI type/status实际分布
- execution状态实际分布
- capability_profile JSON形状分布
- execution与AIAsset生命周期混用风险

## 17. Query Pack N｜Product Opportunity & Event Integrity
product_opportunities：业务主键/URL/供应商/状态重复候选、activity relation覆盖率。

business_events vs activity_logs：按object/event/time窗口统计潜在重复写入，输出MERGE风险，不自动去重。

## 18. Query Pack O｜Typed Reference Integrity
对object_relations、object_registry、业务表中的type+id引用：
- type白名单
- registry可解析率
- missing target count
- unknown object_type
- duplicate relation候选

## 19. Query Pack P｜M1 Candidate Discovery
LegalEntity：organizations中的company候选只输出候选清单统计，不自动写入。

Location：仅识别稳定地点来源并生成normalized address hash候选统计，不输出完整个人地址。

UserIdentity：判断external_identities是EVOLVE还是需要新表的事实依据。

## 20. Query Pack Q｜M2 Candidate Discovery
Project：搜索明确project字段/route/metadata/relations，输出来源与数量。
Decision：搜索Decision/BusinessDecision/重要决策持久化来源。
Capability：提取positions/AI profile候选词，输出hash/normalized token统计，不自动生成CURRENT定义。

## 21. Report JSON Contract
建议：
{
  run_id, environment, database, commit_sha, checked_at,
  db_context, schema_inventory, constraints, indexes, triggers, extensions,
  table_profiles, status_profiles, relation_checks,
  m1_candidates, m2_candidates,
  assumptions, risks, blockers, exceptions, go_no_go
}

每个check统一结构：check_id, category, severity, status, metric, expected, actual, samples(masked), remediation_hint。

## 22. Markdown报告
人读摘要按：Executive Summary → Blockers → High Risks → Schema Facts → Data Facts → Relation Facts → M1/M2 Findings → Go/No-Go → Next Actions。

Markdown报告进入docs/audit/db-preflight/，JSON可进入同目录或CI artifact；禁止提交Secret/PII。

## 23. 风险评估自动化
risk-evaluator只根据明确规则打级别，不让AI自由判断生产数据库是否可迁。

例如：duplicate(provider,subject)>0 = BLOCKER；core orphan>0 = BLOCKER或HIGH（按对象）；unknown proposal status>0 = BLOCKER；非关键metadata NULL = LOW/MEDIUM。

AI可以后续辅助解释报告，但不能改变Go/No-Go确定性结果。

## 24. 实施分支建议
Preflight代码升级应单独Branch：feat/aione-db-preflight-v1。
首个PR只允许只读检查与报告，不包含DDL/DML。

通过Preview/测试数据库验证后，再在受控环境运行Live DB M0 Preflight。

## 25. 现有preflight.js兼容策略
当前脚本已经输出JSON，保留CLI入口与退出码语义。升级后：
- 默认输出summary JSON
- --full输出完整JSON
- --markdown <path>写Markdown
- --strict在BLOCKER时exit 2
- 连接/查询失败exit 1

具体CLI参数需在实现前核对当前package scripts，不在本Draft中假定已经存在。

## 26. 验证测试
至少：
- query模块单元测试（mock DB）
- temporary PostgreSQL集成测试
- missing table场景
- orphan/duplicate/unknown status fixture
- read-only transaction验证
- PII mask测试
- deterministic report snapshot

## 27. Live M0执行前条件
- 本TD-01F Review通过
- 只读Preflight实现PR通过测试
- 运行账号只有必要读取权限
- 生产执行窗口与负责人明确
- 输出目录与保密规则确认

## 28. 当前结论
Preflight已经从“一个探针脚本”设计为可维护的平台级数据库审计能力。它不仅服务本次迁移，未来每次重大Migration、发布前检查、灾备核验都可复用。

## 29. 下一步
下一步不应继续纸面增加TD-01G，而应开始实现只读Preflight代码。由于这会修改代码，应新建独立Branch，不修改main；实现完成后先对测试/可控数据库验证，再实际执行Live DB M0 Preflight。
