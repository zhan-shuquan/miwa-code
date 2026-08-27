# V1.9.36 Validation

自动验证重点：

- `verify-work-home-v1.9.36.mjs` PASS
- Work Home V1.9.29.1 / V1.9.32 / V1.9.33 核心闭环与结构回归 PASS
- Work execution loop V1.9.30 PASS
- Header Work attention V1.9.30.2 PASS
- Route integrity V1.3 PASS
- Backend `npm run check` PASS
- 前端 `miwa-work-home.js` Node syntax check PASS

人工验收重点：

1. 今日工作/全部工作/事业工作/等待中/异常处理/待验收的工作卡视觉保持同一组件。
2. 卡片列数只有2/3/4，默认3；Main较窄时自动降为2或1列，不再出现6列窄卡。
3. 刷新按钮始终与视图工具在同一工具组，不单独换行。
4. 全部工作出现一级时间筛选；自定义时显示日期输入。
5. 更多筛选数量、重置行为正确；重置不丢当前事业等入口默认条件。
6. 工作记录 → 工作明细复用统一Work Item Browser；人员汇总继续保持人员卡片/列表。
7. money_events存在时显示金额摘要；work_sessions存在时显示已记录操作时间。
8. 运行数据库迁移0060后，点赞成功、刷新保持、取消成功、点赞数同步；我的关注 → 点赞记录可读取真实点赞项。
9. 关注仍可成功写入、刷新保持、取消成功；关注不改变负责人或执行权限。
