# VALIDATION V1.9.34｜工作之家 V2.0 场景减法与工作记录升级 Candidate

日期：2026-08-27

## 自动验证结果

已通过：

- `node tests/verify-work-home-v1.9.29.1.mjs`
- `node tests/verify-work-home-v1.9.32.mjs`
- `node tests/verify-work-home-v1.9.33.mjs`
- `node tests/verify-work-home-v1.9.34.mjs`
- `node tests/verify-work-execution-loop-v1.9.30.mjs`
- `node tests/verify-work-attention-v1.9.30.2.mjs`
- `node tests/verify-digital-publication-v1.9.31.5.mjs`
- `node tests/verify-miwa-ai-architecture-proposal-execution-v1.9.29.mjs`
- `npm --prefix backend run check`

## V1.9.34 专项检查

1. 今日工作与我的关注使用同一轻量工作事项一览骨架。
2. 我的关注不再机械显示全部工作的KPI和全套筛选。
3. 全部工作继续保留完整 Work Browser。
4. 《美和工作手册》补齐 PART 02，严格按照 Sidebar 顺序说明页面用途和操作。
5. 工作手册具备三步演示、模拟组件和直接入口。
6. 帮助中心只聚合工作手册，不复制第二份正文。
7. 工作记录支持本周 / 本月 / 本年与人员汇总 / 工作明细。
8. 人员汇总支持头像、工作总数、负责、参与、闭环、事业、项目、流程。
9. `observer` 关注关系不会计入员工工作贡献。
10. 新增 `/api/v1/work-home/people-summary` 事实接口，明确不返回绩效评分。
11. 新增 `/api/v1/work-home/capabilities` 用于辨认实际运行Backend版本。
12. 原工作执行、证据、验收、AI复盘、Header提醒和数字出版物回归继续通过。

## Windows / 线上人工验收

覆盖后必须重点验证：

1. **Backend真实版本**：调用 `/api/v1/work-home/capabilities` 应返回 `workHomeVersion = V1.9.34`、`following = true`。
2. **关注真实闭环**：全部工作 → 关注一项 → 刷新 → 仍为已关注 → 我的关注出现 → 取消关注 → 消失。
3. **我的关注减法**：页面只保留轻量工作事项一览，不出现与目的无关的全套KPI/筛选。
4. **今日工作一致性**：与我的关注共用相同工作事项卡片/列表和详情操作。
5. **工作概览**：手册应能翻到今日工作、全部工作、我的关注、事业工作、等待与阻塞、待验收、工作记录逐页指南。
6. **工作记录**：切换本周 / 本月 / 本年；人员汇总与工作明细切换；点击人员后只查看其具体工作事实。
7. **头像**：当前人员/已登记成员存在头像时正常显示，无头像时回退首字占位。
8. **原执行闭环**：本人工作仍可开始、记录证据、提交结果、验收和AI复盘。

## 已知边界

- 人员工作汇总当前以 Work Item 最近活动/完成时间作为第一版时间归属；后续可升级为事件级贡献时间统计。
- 人员汇总是事实层，不等同绩效考核；本版没有绩效分数、排名、奖金或晋升判断。
- 关注重要变化的独立动态订阅流尚未建立；本版先确保关注关系真实持久化和可查询。

当前状态：**Candidate / 验证中**。
