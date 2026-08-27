# V1.9.37 Validation｜工作之家结构收口

## 自动验证

已执行并通过：

- `tests/verify-work-home-v1.9.37.mjs` PASS
- `tests/verify-route-integrity-v1.3.mjs` PASS（133 个内部Route引用检查）
- `tests/verify-digital-publication-v1.9.31.5.mjs` PASS
- `tests/verify-work-execution-loop-v1.9.30.mjs` PASS
- `tests/verify-work-attention-v1.9.30.2.mjs` PASS
- `tests/verify-miwa-ai-architecture-proposal-execution-v1.9.29.mjs` PASS
- V1.9.37 变更 JS `node --check` PASS

## 静态结构检查

1. `work-team` 已注册 Route，并位于 Sidebar 事业工作之后。
2. 今日工作 / 全部工作 / 事业工作 / 团队工作职责副标题存在。
3. 桌面 Header、移动 Header、移动底部导航的“工作之家”均默认进入 `#/work-today`。
4. 出版母版 `publicationPage()` 支持 `manualSection`，工作手册章节具备稳定锚点。
5. 今日 / 全部 / 事业 / 团队 / 关注 / 等待 / 异常 / 验收 / 记录均存在手册深链映射。
6. 显示方式为列表按钮 + 卡片列数下拉；下拉包含 2 / 3 / 4 / 6，旧独立列数按钮已移除。
7. 卡片列数与视图使用 localStorage 保存个人最近选择；container query 负责窄Main自适应降列。
8. 团队工作先汇总人员，再钻取成员工作；成员工作继续使用 `browserRowsHtml()`，不产生第二套 Work Item Browser。
9. 工作记录不再保留旧“人员工作汇总”主入口，只读取完成 / 取消 / 归档历史事实。
10. Backend capabilities 仍为 V1.9.36，未新增 0061 数据库迁移；本版不需要数据库迁移或Cloud Run Backend重部署。

## 浏览器人工验收

部署前端后建议按以下顺序一次验收完成：

1. Header 点击“工作之家”进入今日工作。
2. Sidebar 新增团队工作，顺序在事业工作之后。
3. 今日 / 全部 / 事业 / 团队页面副标题表达职责清楚。
4. 各页面点击“查看工作手册”直接定位到对应章节主标题，而不是封面。
5. 团队工作：当前 / 本周 / 本月 / 本年切换正常；点击成员后出现其真实 Work Item。
6. 成员 Work Item 仍可打开同一详情并执行已有点赞、关注和工作操作。
7. 工作记录只显示历史事实；不再出现人员汇总主切换。
8. 显示控制为“列表 + 卡片2/3/4/6列下拉 + 刷新”；刷新不单独掉行。
9. 修改卡片列数 / 列表模式后刷新页面，最近选择保持；Main变窄时卡片自动降列。
10. 回归一条真实工作：开始执行 → 添加证据 → 提交 → 待验收 → 确认，确保V1.9.36既有闭环无回归。
