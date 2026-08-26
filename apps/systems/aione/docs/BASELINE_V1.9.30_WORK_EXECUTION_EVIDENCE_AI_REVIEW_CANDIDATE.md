# AIONE V1.9.30｜工作执行・证据・结果・AI复盘闭环 Candidate

## 目标

在V1.9.29.1已恢复的「工作之家」基础上，把已确认工作继续跑到真实执行结果：

`待处理 → 进行中 → 执行证据 → 提交结果 → 完成/待确认 → 美和AI复盘 → 下一轮优化`

本版本不新增复杂审批，不改变Header/Sidebar基础架构，不新增数据库表。继续复用既有 `work_items / work_evidence / result_facts / business_events`。

## 关键规则

1. 工作ID是执行事实主线；状态、证据、结果、AI复盘都围绕同一工作ID展开。
2. 只有负责人可开始执行、添加执行记录、提交结果。
3. 工作必须先进入 `in_progress`，再允许提交完成结果。
4. 负责人和创建者为同一人时，提交结果后可直接完成；不同人员时进入 `waiting`，由创建者确认完成。
5. 执行说明和证据写入 `work_evidence`；结果写入 `result_facts`；关键状态变化写入 `business_events`。
6. 美和AI读取的是当前工作详情、证据和结果，不把聊天内容当正式证据。
7. 美和AI可以复盘和提出下一轮建议，但新的正式工作仍遵循 Proposal + Human Confirm。

## 员工操作

- 工作之家 → 打开工作
- 开始执行
- 按需添加执行记录 / 证据链接
- 提交执行结果
- 如需复核，由创建者确认完成
- 点击「让美和AI复盘」

## 当前证据形态

V1支持：执行说明、结果说明、证据链接/文件地址。文件本体继续由AIONE正式文件体系/Google Shared Drive管理；本版本不重复建设文件上传系统。

## AI复盘留痕

用户明确发起“复盘工作结果”时，美和AI输出以 `evidence_type=ai_review` 记录到当前 work_item 的 `work_evidence`，payload标记 `aiGenerated=true` 和对应 AI execution id。该记录是AI分析留痕，不自动改变工作完成状态，也不替代人类负责人最终判断。
