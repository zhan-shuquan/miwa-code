# TD-01D｜AIONE Physical Schema & Migration Plan V1.0 Draft

状态：Draft / Physical Schema & Migration Plan
日期：2026-08-31
对照：AIONE 12之家 Product Freeze V1.0 CURRENT + TD-01/01A/01B/01C

## 1. 目标
针对M1/M2第一批对象设计目标物理Schema、索引、FK策略、migration编号、backfill、rollback与验证标准。本阶段仍然只做Technical Design，不修改main数据库。

## 2. Migration编号建议
当前main已有0001～0070。建议预留：
0080_identity_reference_foundation.sql
0090_platform_governance_objects.sql
0100_talent_relation_split.sql
0110_work_contract_migration.sql
后续按Domain继续递增。最终编号在实施分支创建时以main最新migration序列为准，避免冲突。

## 3. 第一批目标表
### legal_entities
建议字段：id TEXT PK, code TEXT UNIQUE, legal_name TEXT NOT NULL, display_name TEXT, entity_type TEXT, country_code CHAR(2), registration_number TEXT, tax_id TEXT, status TEXT, valid_from TIMESTAMPTZ, valid_to TIMESTAMPTZ, metadata JSONB, created_at, updated_at, record_version, source_system, archived_at。
索引：status；country_code；registration_number唯一性按国家规则决定。
关系：Organization不通过FK强绑定单一LegalEntity，使用legal_entity_organization_relations或typed relation表达。

### locations
字段：id, code, name, location_type, address_json/address_ref, latitude, longitude, timezone, country_code, region, owner_scope_json, status, valid_from, valid_to, external_refs JSONB, created_at, updated_at, record_version, source_system, archived_at。
索引：location_type/status；country/region；必要时GIS后续扩展，不在V1首批引入PostGIS。

### user_identities
若现有external_identities结构足够则优先ALTER/EVOLVE，不新建第二表。逻辑字段：id, provider, subject, person_id, email, status, verified_at, metadata, created_at, updated_at。唯一约束(provider, subject)。

### projects
字段：id, code UNIQUE, name, description, owner_object_type, owner_object_id, business_id nullable, organization_id nullable, status, start_at, due_at, completed_at, metadata, created_at/by, updated_at/by, record_version, source_system, archived_at。
索引：business/status；owner；due_at；active partial index。

### decision_records
字段：id, title, decision_type, source_object_type/id, business_id, owner_object_type/id, context_summary, decision_result, reasoning_summary, status, effective_at, review_at, supersedes_decision_id FK self, evidence_refs JSONB initially, created_at/by, updated_at/by, record_version, archived_at。
索引：source object；business/status；effective_at；supersedes。

### proposals
字段：id, proposal_type, actor_type, actor_ref, source_object_type/id, target_refs JSONB, action_type, payload JSONB, rationale, risk_level, permission_context JSONB, confirmation_policy, governance_status, expires_at, reviewed_by_ref, reviewed_at, execution_ref, result_ref, error_ref, created_at, updated_at, record_version, archived_at。
重要：执行状态建议从Proposal治理状态中分离。Proposal只表达建议治理；真正execution status由ExecutionRecord/Trace表达。旧work_proposals状态在backfill时映射。
索引：governance_status/created_at；source object；actor；expires_at；risk_level。

### capability_definitions
字段：id, code UNIQUE, name, category, description, level_model_ref, evidence_policy_ref, status, version, metadata, created_at, updated_at, archived_at。
索引：category/status。

### employment_relations
字段：id, person_id, legal_entity_id nullable, organization_id nullable, relation_type, status, effective_from, effective_to, primary_flag, metadata, created_at/by, updated_at/by, record_version, archived_at。
索引：person/status；organization/status；effective period。

### position_assignments
字段：id, person_id, position_id, employment_relation_id nullable, organization_id nullable, business_id nullable, assignment_type, status, is_primary, responsibility_summary, business_scope JSONB, effective_from, effective_to, ended_reason, metadata, created_at/by, updated_at/by, record_version, archived_at。
索引：person/status；position/status；business/status；effective period。

## 4. FK策略
- 强事实关系用真实FK，例如position_assignments.position_id → positions.id。
- 跨Domain高耦合风险关系优先typed reference或nullable FK，避免迁移期互相阻塞。
- 外部系统ID不建FK到本地Domain表。
- 删除策略默认RESTRICT或SET NULL；核心事实禁止CASCADE误删历史。
- Event/Audit表对业务对象使用logical typed reference，不要求全部物理FK。

## 5. Proposal迁移
旧表：work_proposals。
新表：proposals。
Backfill：每条旧work_proposals生成1条Platform Proposal，source_object_ref指向work_seed或Work context，action_type=CREATE_WORK_ITEM，payload保留标准化工作字段；approved_work_id写入result_ref/execution result relation。
状态映射：waiting_confirmation/needs_confirmation → PENDING_CONFIRMATION；approved → APPROVED；rejected → REJECTED；expired → EXPIRED。
执行完成与失败不写入Proposal治理状态，写Execution/Trace。
兼容期：旧API可通过Adapter读写新Proposal Contract；禁止长期DUAL_WRITE两张主表。
回滚：保留旧work_proposals不删，直到新读路径稳定一个发布周期。

## 6. Assignment拆分迁移
旧表assignments同时含Person↔Position与雇佣/组织关系。
Backfill：
1) 每个有效person+organization/legal context生成EmploymentRelation候选；
2) 每条assignment生成PositionAssignment，并通过employment_relation_id关联；
3) primary/concurrent/acting/rotation/temporary/project映射到PositionAssignment.assignment_type；
4) 原ID保留到legacy_ref或mapping表，避免历史WorkItem owner_assignment_id断链。
兼容策略：建立assignment_legacy_map或Adapter；WorkItem逐步引用position_assignment_id。

## 7. UserIdentity迁移
先Live Preflight现有external_identities字段。若(provider, subject, person_id)已满足，则只ALTER补status/verified_at/version等；GooglePreviewIdentityRegistry仅作为启动兼容配置，不继续作为正式身份事实源。

## 8. LegalEntity迁移
从organizations中org_type=company及现有公司资料生成候选LegalEntity，但不得自动把所有organization company一比一认定为法人。Backfill分两步：候选生成→人工/规则确认→建立关系。避免把内部管理公司节点误当注册法人。

## 9. Location迁移
首批不强制把所有地址文本转换成Location。只迁移稳定、重复使用、跨Domain需要引用的地点，如办公室、仓库、门店、固定收发货点。客户一次性地址继续可作为Address/ContactPoint数据，不必制造Location主档。

## 10. Project迁移
旧系统没有唯一Project主表。初期只从明确的经营项目/工作关联生成，不从普通WorkItem自动推断Project。项目ID必须稳定，WorkItem通过project_id或typed relation关联。

## 11. CapabilityDefinition迁移
从positions.capability_requirements、ai_talents.capability_profile及已有标准文档提取候选词表；先normalize并人工Review，不直接把所有自由文本自动生成正式CapabilityDefinition。

## 12. Index与性能原则
- 高频Scope字段建立组合索引：status + owner/business/person。
- created_at/due_at等时间线建立DESC索引或partial index。
- JSONB仅用于低稳定扩展字段；高频过滤/权限/状态字段必须独立列。
- 不在首轮过度索引；以真实query plan补充。

## 13. Audit与Version
可治理主对象统一record_version；写操作必须记录actor。重要状态变更同时写BusinessEvent/Audit Event。Migration backfill actor标记system/migration并保留source migration version。

## 14. Idempotency与Backfill
每个backfill脚本必须可重复运行：基于legacy mapping / deterministic key / ON CONFLICT。禁止依赖一次性人工执行顺序。每批迁移输出processed/skipped/conflict/error统计。

## 15. Rollback
数据库Migration优先forward-fix，不鼓励破坏性down migration。首轮migration只新增表/列/索引/Adapter，不删除旧列旧表。若应用回滚，旧路径仍可读；新表保留但停止写入。删除动作只在Compatibility Removal Wave执行。

## 16. Verification Gate
每个Migration必须验证：
- schema存在且约束正确
- row count与预期一致
- legacy→new mapping覆盖率
- orphan FK=0或在允许清单
- status mapping无未知值
- timestamp/actor保真
- sample payload逐条比对
- Adapter读结果与旧路径一致
- migration重复执行无副作用

## 17. Live DB Preflight必须先做
由于Repo SQL只代表迁移意图，正式DDL前必须读取真实Cloud SQL schema：information_schema columns、constraints、indexes、row counts、null distribution、enum/check实际值、重复键、孤儿引用。Preflight结果进入Repo事实文档，不依据旧SQL猜生产库。

## 18. 第一实施Branch建议
待TD-01进入RC且Permission/API Contract完成后，创建独立Branch，例如feat/aione-platform-contract-m1。首个PR只包含M1 foundation schema + preflight/backfill tooling，不同时迁移所有Domain。

## 19. 当前结论
AIONE已经具备从现有数据库平滑演进到CURRENT的技术路径。第一批物理Schema以新增/演进为主，不删除真实表；最复杂迁移点是assignments拆分与work_proposals平台化，但均可通过Adapter+Backfill安全处理。

## 20. 下一步
TD-01E｜Live DB Preflight Specification & Migration Verification Standard。先把生产/测试数据库需要检查的SQL、输出格式、风险等级和Go/No-Go标准定义清楚，然后才允许创建真正的0080/0090 migration SQL。
