# V1.9.38 Validation｜工作之家 V2.0 最终收口

## 自动验证

已通过：

- `tests/verify-work-home-v1.9.38.mjs`
- `tests/verify-work-execution-loop-v1.9.30.mjs`
- `tests/verify-work-attention-v1.9.30.2.mjs`
- `tests/verify-miwa-ai-architecture-proposal-execution-v1.9.29.mjs`
- `tests/verify-route-integrity-v1.3.mjs`
- `tests/verify-digital-publication-v1.9.31.5.mjs`
- `tests/verify-selection-legacy-migration-v1.5.mjs`
- `tests/verify-sidebar-aside-lock-v1.9.5.mjs`
- V1.9.38相关JS `node --check`

说明：历史 `verify-global-header-context-v1.9.4.mjs` 与 `verify-business-home-v1.9.31*.mjs` 在未修改的V1.9.37基线上已经因后续导航/缓存演进失效，因此不将其作为V1.9.38回归失败；V1.9.38新增专项测试覆盖当前事业Header最终结构。

## 静态验证重点

1. Sidebar不再注册等待中 / 异常处理 / 待验收三个状态入口。
2. Sidebar存在“＋ 创建工作”高频动作，并打开美和AI创建上下文。
3. 当前事业组件存在于Header，旧Sidebar事业切换器已移除。
4. `businessHtml` 已在工作概览中定义，不再触发ReferenceError。
5. 全部工作工具栏按“搜索→关系→事业→成员→状态→优先级→时间→更多→排序→显示→刷新”组织。
6. 全部工作标题区有明显“今日工作”主入口。
7. 排序下拉包含5个正式排序项。
8. 默认12项/页并提供分页。
9. 全部工作提供状态快速筛选；KPI使用“异常”业务语言。
10. 今日工作候选不再因为“我创建了但由别人负责”就自动进入当前用户执行队列。
11. 工作页标题存在“工”主题字占位。
12. 美和工作9问在手册明确标记“验证中”。
13. 不新增0061，不要求Backend/Cloud SQL重新部署。

## 浏览器人工验收

见根目录：
`V1.9.38_WORK_HOME_V2_FINAL_CLOSURE_WINDOWS_GUIDE.txt`
