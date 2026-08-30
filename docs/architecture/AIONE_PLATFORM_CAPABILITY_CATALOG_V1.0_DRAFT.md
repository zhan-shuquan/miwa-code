# AIONE Platform Capability清单 V1.0 RC

状态：Release Candidate / 待冻结

## 核心原则
之家消费平台能力，不拥有平台能力。多个之家共同需要的能力必须平台化，禁止重复开发。

## 核心能力
1. Authentication
2. Authorization
3. User / Identity
4. Search
5. File & Asset
6. Recycle Bin
7. Interaction（Comment / Mention / Like / Favorite / Follow）
8. Notification
9. Task
10. Workflow
11. Import
12. Export
13. Publication
14. History / Audit
15. Version
16. Integration
17. Automation
18. AI
19. Analytics
20. Observability

## 关键架构原则
- 登录优先使用成熟身份能力；AIONE维护 Person/User 与 External Identity 映射。
- 权限必须有 AIONE 自有 Permission Engine，至少支持 Role / Scope / Object / Field / Action。
- Search 分确定性搜索与AI语义搜索，不能所有搜索都交给AI。
- File & Asset 统一管理上传、下载、预览、版本、移动、分享、归档、删除、恢复。
- Recycle Bin 统一软删除；永久删除属于高风险操作。
- Interaction 绑定 Object，不创建 ProductComment / TalentComment 等重复体系。
- 所有需要人处理的任务最终进入工作之家 WorkItem 唯一事实源。
- Workflow Engine 提供执行框架，业务流程规则属于 Domain。
- Import / Export 使用统一引擎；页面只配置模板、字段、权限。
- Publication 统一提供 Web / Print / A4 / PDF / Download / Share。
- History 面向用户；Audit 面向系统治理与追责。
- Integration Service 统一管理 Credential / Auth / Mapping / Sync / Webhook / Retry / Error / Log。
- 确定性流程优先 Rule / Function / Scheduler / Webhook / Cloud Tasks，AI只处理需要理解与判断的问题。
- 所有AI调用统一经过 AIONE AI Gateway，统一模型、上下文、权限、Trace、Cost、Proposal与人工确认。
- Analytics 统一 Metric Definition / Calculation / Dataset / Aggregation / Dashboard / Drilldown；分析之家不复制业务事实。
- Observability 统一 Application Log / Error Log / Integration Log / AI Trace / Performance / Uptime / Alert / Cost / Usage。

## Reuse / Adopt / Integrate / Build 决策顺序
1. Reuse：AIONE现有能力能否解决？
2. Adopt / Buy：成熟外部能力能否直接使用？
3. Integrate：是否可通过薄适配层解决？
4. Build：前三者都不适合时才自研。

## 优先级
### P0
Authentication, Authorization, User / Identity, File & Asset, Search, Task, History/Audit, AI Gateway, Observability基础能力（Logging / Monitoring / Error / Uptime）。

### P1
Interaction, Notification, Workflow, Import, Export, Recycle Bin, Integration, Publication, Version。

### P2
Automation增强、Analytics规模化、Observability高级能力（成本分析、容量趋势、深度告警治理等）。

## Security / Data Governance / Resilience 横向Guardrail
以下能力不是新增业务页面，而是平台/技术底座的强制治理项：
- Backup
- Restore
- Disaster Recovery
- Data Retention
- Data Classification
- Sensitive Data Handling
- Privacy
- Recovery Test
- Secret Management
- Access Review

这些内容必须在 Technical Design 中明确责任、保留周期、恢复目标、测试方式和审计要求，尤其适用于人才、财务、客户、供应商、AI Trace等敏感数据。

## 开发治理
任何之家提出新功能时，先判断：如果多个之家需要，则升级为 Platform Capability；只有明确业务专属能力才进入 Domain。
