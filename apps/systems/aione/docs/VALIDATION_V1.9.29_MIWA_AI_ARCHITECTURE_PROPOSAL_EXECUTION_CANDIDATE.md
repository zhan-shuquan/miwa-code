# V1.9.29 验证说明｜AI总架构命名 + 分析到Proposal执行

## A. 命名验证

1. 搜索 `美和集团AI经营总架构`：首项必须是AIONE经营总架构内容页。
2. 搜索 `美和集团AI执行总架构`：首项必须是执行总架构PPTX。
3. 搜索历史名称 `美和集团现代企业军团总架构`：仍必须命中同一执行总架构资产。
4. 执行总架构Google Drive原件名必须为 `00_美和集团AI执行总架构_V0.1.pptx`。
5. 经营总架构新版原件未找到前必须保持“新版原件待绑定”。

## B. Proposal执行验证

在 `美和集团AI经营总架构` 页面：

1. 输入 `形成优化清单`，预期生成1–7条编号、单一、可执行、可验证的优化项。
2. 接着输入 `把第1、3、5项安排下去`。
3. 预期出现3张独立Proposal卡片，而不是一个合并任务。
4. 每张卡片必须显示“确认执行”，未确认前不得写入正式工作事项。
5. 逐项确认后，到工作之家验证出现对应工作事项。
6. 工作事项应继承来源：`company-management-architecture` / `美和集团AI经营总架构`，并保留AI Proposal ID等审计元数据。

## C. 回归验证

- 企业资料精准检索继续有效。
- Shared Drive查看/安全下载继续有效。
- 普通经营分析不会因为出现“经营架构”而误判成资料搜索。
- Cloud Run仍为private，AIONE用户身份校验继续生效。

## D. 自动测试

运行：

```bash
node apps/systems/aione/tests/verify-miwa-ai-architecture-proposal-execution-v1.9.29.mjs
node apps/systems/aione/tests/verify-miwa-ai-context-capabilities-v1.9.28.mjs
node apps/systems/aione/tests/verify-miwa-ai-corporate-retrieval-v1.9.27.mjs
node apps/systems/aione/tests/verify-shared-drive-secure-download-v1.9.26.mjs
node apps/systems/aione/tests/verify-miwa-google-drive-binding-v1.9.25.mjs
node apps/systems/aione/tests/verify-route-integrity-v1.3.mjs
```
