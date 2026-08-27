# VALIDATION V1.9.33｜工作之家 V2.0 结构升级 Candidate

日期：2026-08-27

## 自动验证结果

通过：

- `node tests/verify-route-integrity-v1.3.mjs`
- `node tests/verify-digital-publication-v1.9.31.5.mjs`
- `node tests/verify-work-home-v1.9.32.mjs`
- `node tests/verify-work-home-v1.9.33.mjs`
- `node tests/verify-work-execution-loop-v1.9.30.mjs`
- `node tests/verify-work-attention-v1.9.30.2.mjs`
- `cd backend && npm run check`

## V1.9.33 专项检查

1. 工作概览真实调用统一数字出版母版，而非自定义“出版物风格”卡片页面。
2. Sidebar 增加“全部工作 / 我的关注 / 事业工作”并按事业树形组织。
3. `我的工作` 继续作为兼容路由，但不作为正式 Sidebar 入口。
4. 全部工作具备卡片/列表、搜索、关系/状态/优先级/事业筛选、团队/项目扩展筛选和排序。
5. 关注复用 `work_item_participants(observer)`，没有新增重复关注事实表。
6. 关注不会自动进入 Header 待办或今日工作，符合“透明 ≠ 推送”。
7. 公司内部公开读取与执行权限分离；敏感事项仍限制读取。
8. 美和AI从跨境/批发业务页面新建工作时写入事业元数据。
9. V1.9.30 执行证据/结果/验收/AI复盘闭环保持通过。
10. V1.9.30.2 Header 工作提醒同步保持通过。

## 人工验收建议

覆盖到 `D:\miwa\code\` 后重点查看：

1. 工作之家 → 工作概览：是否与美和之家/事业之家出版物母版视觉一致；
2. Sidebar：事业工作是否可展开，且只把事业作为主要工作边界；
3. 全部工作：卡片/列表切换是否直观；
4. 搜索和筛选：是否比上一版大卡片长列表更容易找到工作；
5. 关注：关注任一工作后，是否进入“我的关注”；取消关注后是否消失；
6. 关注其他事业工作后，是否仍不会自动变成“今日工作”；
7. 公司公开工作只能查看时，工作详情是否明确显示“无执行权限”；
8. 既有自己的工作是否仍可开始、加证据、提交完成和验收。

当前状态：**Candidate / 验证中**。真实页面体验确认后再决定删减哪些筛选、事业入口或工作卡字段。
