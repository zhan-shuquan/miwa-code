# V1.9.30 验证说明｜工作执行・证据・结果・AI复盘

## 自动验证

- Backend Node语法检查
- V1.9.30工作执行专项静态验证
- V1.9.29.1工作之家恢复回归
- V1.9.29 Proposal执行回归
- V1.9.28上下文分析回归
- V1.9.27企业资料检索回归
- V1.9.26 Shared Drive安全下载回归
- V1.9.25 Drive绑定回归
- Route完整性验证

## 生产验收

使用一条真实已确认工作：

1. 工作之家只显示已确认正式工作。
2. 点击「打开」进入工作执行详情。
3. 点击「开始执行」：`pending → in_progress`。
4. 添加一条执行记录，可选填Google Drive/AIONE证据地址。
5. 填写执行结果并「提交结果」。
6. 同一创建者/负责人任务应进入 `completed`；不同人员任务应进入 `waiting`，待创建者确认。
7. 详情中能看到 `work_evidence` 与 `result_facts` 对应记录。
8. 点击「让美和AI复盘」，AI应读取当前工作目标、证据和结果，回答完成度、遗留问题、可沉淀资产和下一轮建议。
9. AI复盘不得自动创建下一工作；写入仍需Proposal + Human Confirm。

## AI复盘留痕

用户明确发起“复盘工作结果”时，美和AI输出以 `evidence_type=ai_review` 记录到当前 work_item 的 `work_evidence`，payload标记 `aiGenerated=true` 和对应 AI execution id。该记录是AI分析留痕，不自动改变工作完成状态，也不替代人类负责人最终判断。
