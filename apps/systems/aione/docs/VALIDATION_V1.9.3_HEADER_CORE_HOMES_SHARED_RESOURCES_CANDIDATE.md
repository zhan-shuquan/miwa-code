# VALIDATION V1.9.3｜Header核心之家 + 共享资源快捷层 Candidate

日期：2026-08-24

## 验证结论

**自动化验证通过。** 本版本已完成Header结构、共享资源注册表、供应商之家、路由、字段标准与既有主线回归验证。

## 本版专项验证

运行：

```bash
node tests/verify-global-header-context-v1.9.3.mjs
```

已验证：

1. H1顺序保持“公司 → 事业 → 用户 → 工作 → 时间”。
2. H1核心之家顺序为：人才之家 → AI之家；客户之家 → 供应商之家；分类之家 → 商品之家；分析之家 → 知识之家。
3. Header不再显示“共享之家 / 店铺之家 / 应用之家”。
4. H2只读取统一`sharedResources`注册表，高频资源自动排序分组，前台仅通过分隔符区分。
5. `quickAccess`决定资源是否允许进入快捷层；`headerHidden`允许资源继续登记但隐藏Header入口。
6. ERP登记为“内部 + 应用 + 高频快捷”；HR登记为“内部 + 应用”，本版默认Header隐藏。
7. 供应商之家已具备路由、标准页面定义和字段Schema。
8. “共享资源”页面统一承载应用、工具、知识、代码、数据、模板、连接、服务、其他产品形态。
9. 内部/外部只作为资源属性，不拆成两套资源体系。
10. V1.1帮助知识与代码规则一致。

## 主线回归

以下当前测试均通过：

- `verify-ai-office-secretary-v1.8.mjs`
- `verify-cloud-data-runtime-v1.9.mjs`
- `verify-database-backend-v1.7.mjs`
- `verify-field-standardization-v1.6.mjs`
- `verify-global-header-context-v1.9.3.mjs`
- `verify-level2-foundation-v1.4.mjs`
- `verify-route-integrity-v1.3.mjs`
- `verify-sampling-dashboard.mjs`
- `verify-selection-legacy-migration-v1.5.mjs`

路由完整性结果：**103个内部路由引用通过；Global Shell单一来源通过。**

## 语法检查

本轮修改的JavaScript文件已执行`node --check`，通过。

## 人工视觉验收边界

本执行环境的Headless Chromium预览未稳定产出可确认截图，因此本记录不把浏览器截图冒充正式视觉验收。请在Windows + Live Server中重点确认：

- 1920px及常用桌面宽度下H1是否保持舒适密度；
- H2自动分隔符是否清晰但不过度抢眼；
- “全部资源”入口是否易发现；
- 移动端H1/H2折叠与滚动体验；
- `headerHidden`切换后Header是否即时符合预期。

## 当前边界

本版只更新Header与共享资源相关基础架构，不提前实施Sidebar第2阶段动态生成机制。
