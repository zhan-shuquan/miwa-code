# AIONE统一业务事件契约 V1

**状态：验证中**

事件最小结构：

- `id`
- `event_type`
- `object_type`
- `object_id`
- `actor_kind`: human / ai / system / automation
- `actor_person_id`
- `actor_ai_ref`
- `correlation_id`
- `causation_id`
- `happened_at`
- `payload`
- `source_system`

原则：

1. 页面操作、AI执行、API自动化最终都落成统一事件，不建立三套日志语言。
2. 事件只记录已经发生的事实；业务对象当前状态仍由正式业务表承载。
3. 事件可驱动通知、工作证据、AI审计和后续自动化，但V1.7不在数据库里硬编码所有下游行为。
4. 重大写操作后端应同时产生业务事件；用户可见报告由工作证据/结果事实汇总，不直接拿原始事件日志冒充成果。
