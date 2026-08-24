# AIONE V1.9.2｜知识之家帮助中心与导航逻辑验证记录

日期：2026-08-24

## 自动验证

运行：

```bash
node tests/verify-global-header-context-v1.9.2.mjs
node tests/verify-route-integrity-v1.3.mjs
node tests/verify-level2-foundation-v1.4.mjs
node tests/verify-selection-legacy-migration-v1.5.mjs
node tests/verify-field-standardization-v1.6.mjs
node tests/verify-database-backend-v1.7.mjs
node tests/verify-ai-office-secretary-v1.8.mjs
node tests/verify-cloud-data-runtime-v1.9.mjs
node tests/verify-sampling-dashboard.mjs
```

## V1.9.2专项检查

- Header上下文顺序继续为公司→事业→人→工作→时间。
- 共享之家顺序加入知识之家：分类→商品→AI→分析→知识→共享。
- route registry不再存在help-home正式路由。
- Desktop / Mobile / Footer帮助入口均指向`#/knowledge-home?type=帮助中心`。
- 知识之家正式分类包含“帮助中心”。
- 正式导航逻辑文档存在稳定ID `KNOW-AIONE-NAV-CONTEXT-V1`。
- 内容页支持type查询参数筛选。
- 内容页支持正文阅读器。
- 已有本地知识数据时，缺失的正式seed知识仍会自动补入。

## 尚需Windows人工视觉验收

- Header新增知识之家后的第一行宽度与间距。
- 帮助中心过滤后的实际卡片排版。
- 长篇知识正文阅读器的滚动与字体可读性。

Sidebar第2阶段未在本轮实施，不属于本轮验收范围。
