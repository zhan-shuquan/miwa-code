# V1.9.39｜工作之家真实运行验证清单

## 自动验证

在 `apps/systems/aione` 执行：

```powershell
node .\tests\verify-work-home-v1.9.39.mjs
```

预期：

`V1.9.39 Work Home real-use validation baseline passed.`

同时已验证：

- route integrity
- Sidebar / Aside既有职责锁定
- Work Attention实时提醒
- Work execution evidence + AI review闭环

## 人工浏览器验证

1. Header工作之家进入 `#/work-mine`。
2. Sidebar顺序与V1.9.39基线一致。
3. 我的工作三时间范围切换正常。
4. AI创建工作仍打开美和AI。
5. 我的 / 全部 / 事业 / 团队使用统一Work Item Browser。
6. KPI可点击过滤。
7. 列表明确显示开始时间和截止时间。
8. 工作记录使用事实字段；总结列没有真实数据时显示空态。
9. 我的总结没有真实总结时不伪造内容。
10. 点赞、关注、工作详情、执行、证据、提交、验收正常。

## 本版不作为验收失败的未开发能力

- Google Docs自动生成
- A4 PDF自动归档
- 总结推广渠道
- 跨对象关注
- 收藏
- 组织权限分派

这些属于已识别的后续能力，不应在Backend事实尚未建立时用前端假数据“完成”。
