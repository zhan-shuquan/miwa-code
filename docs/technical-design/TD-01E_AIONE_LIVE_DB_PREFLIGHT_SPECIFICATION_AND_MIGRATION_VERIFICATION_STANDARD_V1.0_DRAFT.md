# TD-01E｜AIONE Live DB Preflight Specification & Migration Verification Standard V1.0 Draft

状态：Draft / Preflight & Verification Standard
日期：2026-08-31
对照：AIONE 12之家 Product Freeze V1.0 CURRENT + TD-01/01A/01B/01C/01D

## 1. 目标
在任何0080/0090等真实DDL进入开发分支前，先检查真实Cloud SQL当前Schema与数据质量，形成可重复、可审计、可判定Go/No-Go的Preflight标准。

Repo中的historical migration只代表“应该执行过什么”，不能代替真实数据库事实。Live DB Preflight输出才是实施前的Implementation Truth输入。

## 2. 当前preflight.js能力审查
现有脚本已经能够：
- 列出public表
- 检查people/external_identities/product_opportunities/activity_logs存在性
- 检查stage tables存在性
- 读取people与product_opportunities列结构
- 读取schema_migrations
- 输出部分row count与warning

结论：可保留作为基础，但覆盖不足。它还没有检查完整columns、PK/FK/unique/check/index、null distribution、重复键、孤儿引用、真实status值、数据分布和关键mapping风险。因此不能直接作为M1/M2 Migration Go/No-Go依据。

## 3. Preflight执行环境
必须明确：environment（dev/staging/prod）、database、schema、commit SHA、application version、checked_at、executed_by、read_only_mode。

生产Preflight默认只读，不执行DDL/DML。所有检查SQL必须是SELECT或系统catalog查询。

## 4. Schema Inventory
至少采集：
- table/view名称
- table type
- row estimate与精确row count（核心表）
- columns：name/type/udt/nullable/default/generated/identity
- primary key
- foreign keys与ON DELETE/UPDATE
- unique constraints
- check constraints
- indexes：columns/expression/unique/partial
- views依赖
- triggers
- extensions

重点表：people、external_identities、organizations、businesses、positions、assignments、work_items、work_item_participants、work_sessions、work_evidence、result_facts、money_events、business_events、knowledge_routes、ai_talents、ai_offices、ai_assignments、ai_executions、work_seeds、work_proposals、product_opportunities、activity_logs、object_registry、object_relations、object_reactions。

## 5. Data Profiling
核心字段至少检查：
- NULL count/rate
- distinct count
- min/max时间
- status/type实际值及数量
- 重复业务key
- 空字符串/仅空格
- 非法日期区间
- JSONB类型/关键键分布
- source_system分布
- archived_at/status冲突
- record_version异常

禁止只依据CHECK constraint推断真实数据状态；必须查询实际distinct values。

## 6. Referential Integrity
即使数据库没有物理FK，也要做logical orphan检查：
- assignments.person_id → people.id
- assignments.position_id → positions.id
- work_items.business_id → businesses.id
- work_items.owner_assignment_id → assignments.id
- work_item_participants.work_item_id → work_items.id
- work_sessions/work_evidence/result_facts/work_proposals关联
- ai_offices.ai_secretary_talent_id → ai_talents.id
- ai_assignments → ai_talents/ai_offices/positions
- typed refs：related_object_type/id与object_registry可解析率

输出：source_count / matched_count / orphan_count / orphan_samples。

## 7. M1专项Preflight
### UserIdentity
检查external_identities实际列、provider/subject唯一性、person mapping覆盖率、重复身份、空provider/subject、同一provider+subject指向多个person。

### LegalEntity
识别organizations中company类候选数量，但只作为候选；同时收集公司注册号/税号/国家等现有来源。禁止自动认定所有company节点为LegalEntity。

### Location
扫描稳定地点来源：仓库、办公室、店铺、固定收发点。输出重复地址候选与跨Domain重复率；一次性客户地址不进入Location候选。

## 8. M2专项Preflight
### Project
搜索现有Project语义来源、route/config/metadata/工作关联。禁止从普通WorkItem自动推断所有Project。

### DecisionRecord
搜索BusinessDecision/Decision/重要决策等现有结构和知识资料引用，确认是否存在可backfill记录。

### Proposal
重点检查work_proposals：状态实际值、approved_work_id覆盖率、seed关联率、payload完整度、重复proposal、过期逻辑。并检查AI Secretary是否还有独立proposal存储路径。

### CapabilityDefinition
采样positions.capability_requirements、ai_talents.capability_profile等，形成candidate vocabulary与重复/同义词报告，不自动写正式Definition。

## 9. Migration Verification标准
每个migration完成后必须生成Verification Report：
1 schema diff是否符合设计
2 source row count
3 target row count
4 mapping coverage
5 unmapped/conflict count
6 orphan count
7 unknown status count
8 timestamp/actor/version保真率
9 sample comparison
10 Adapter old/new read equivalence
11 idempotency rerun结果
12 performance regression检查

## 10. Mapping Coverage阈值
P0身份/核心关系：100%或所有未映射项有显式accepted exception。
Proposal/Assignment等迁移：目标≥99.9%，剩余必须进入conflict queue且不允许静默丢失。
非核心candidate normalization如CapabilityDefinition可低于100%，但不能阻塞原业务数据读取。

## 11. Risk Level
BLOCKER：主键冲突、不可解释数据丢失、同一事实双主、核心orphan、身份映射歧义、未知状态无法映射。
HIGH：大量NULL/重复、历史actor/timestamp无法保真、核心Adapter不等价。
MEDIUM：索引不足、少量可解释脏数据、非核心字段不一致。
LOW：命名、metadata整理、可延后性能优化。

## 12. Go / No-Go
GO：无BLOCKER；HIGH均有明确处理方案并进入migration脚本/exception registry；核心mapping coverage满足阈值；rollback/read compatibility可用；migration可幂等。
CONDITIONAL GO：只有非关键HIGH/MEDIUM且有owner、deadline、accepted risk。
NO-GO：任何未解决BLOCKER；生产Schema与设计关键假设不符；无法确认people/external identity主键；存在大规模孤儿或重复主键；backfill不可逆且无兼容读路径。

## 13. Preflight输出格式
建议JSON + Markdown摘要双输出。
JSON用于CI/自动比较；Markdown进入Repo作为审计证据。
最少字段：run_id, environment, database, commit_sha, checked_at, schema_inventory, table_profiles, relation_checks, status_profiles, migration_assumptions, risks, blockers, go_no_go, exceptions。

## 14. Exception Registry
任何无法立即修复的数据异常必须显式记录：exception_id, table/object, key, issue, risk_level, accepted_by, reason, remediation_owner, due_date, status。
禁止通过脚本静默skip不记录。

## 15. 安全规则
- Preflight绝不输出密码、token、connection string、PII明文样本。
- sample应优先输出ID/统计；个人信息字段只输出计数或hash。
- 生产连接使用Secret Manager/受控环境变量。
- 日志不得记录access token或完整第三方payload中的敏感字段。

## 16. CI接入方向
未来PR中若包含data-code/migrations或schema contract变更，CI至少运行：
- SQL静态检查
- migration命名/顺序检查
- temporary DB migrate-from-zero
- migrate rerun idempotency
- schema verification
- contract/deprecated-name checks
Live production preflight不在普通PR自动执行，需受控部署流程触发。

## 17. 对现有preflight.js的升级建议
保留现有脚本作为入口，但拆成：
- schema-inventory
- data-profile
- relation-check
- migration-assumption-check
- report-renderer
不要继续把所有逻辑堆在一个脚本。

第一阶段可先扩展输出，不修改生产数据。

## 18. TD-01 Go/No-Go Gate
在以下条件满足前，不创建真正的0080/0090 migration SQL：
- TD-01E Review通过
- Live DB Preflight实际执行一次
- Preflight结果存入Repo
- 所有BLOCKER=0
- TD-03 Permission Contract至少完成关键写权限方向
- TD-04 API Contract至少明确新对象读写边界

原因：数据库Schema不能脱离权限/API Contract单独锁死。

## 19. 当前结论
现有preflight机制可复用，但只能视为V0基础探针。CURRENT迁移必须升级为结构、数据、关系、状态、风险和验证一体化Preflight，才能安全进入真实DDL。

## 20. 下一步
TD-01F｜Preflight Implementation Design & Read-Only Query Pack：把本标准转换成具体模块设计与只读SQL Query Pack；随后实际对Live DB执行M0 Preflight，再决定TD-01是否进入RC以及是否允许编写0080/0090。
