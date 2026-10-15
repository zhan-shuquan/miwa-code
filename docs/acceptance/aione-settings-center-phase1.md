# 设置中心第一阶段（待联调验收）

入口：共享之家 → 设置中心（#/shared-settings）。12之家的侧栏“设置”均打开同一中心。商品资料的“维护包装与物流设置”以对话框打开同一编辑器，保留商品编辑状态。

## 已实现

- 复用 Cloud SQL `aione_shared_parameters` 与历史表，不增加第二套参数库；沿用 canonical identity + 参数维护人员白名单写权限。
- 中国包装、日本包装物、物流方式可新增、修改成本、排序、启停、设置唯一默认项；去除物流必须恰为八种的限制。
- 商品编辑的包装与物流下拉从当前共享目录读取；新增物流使用现有按kg或首重续重公式。
- 汇率、关税、利润目标、取整、平台费率使用同一份现有参数，提供集中编辑。
- Excel .xlsx 导出、空白导入模板、导入内容预览、应用到草稿、变更原因、版本校验和生效事件。
- 后端在删除时检查当前商品资料引用；已引用项阻止删除，未引用项可删除，并支持草稿中撤销最近删除。已有物流名称仍禁止直接改名。停用后新选择隐藏，已有选择仍保留，可继续核算。
- 原全局设置编辑器同步生效版本；存在旧草稿时阻止覆盖。

## 本阶段边界与待办

- 未上线，未使用生产数据库做写入验证。已完成纯计算、schema、事务分支、HTTP 权限和 DOM 流程测试；使用本地嵌入式 PostgreSQL 验证真实 SQL、商品保存与 Excel/WPS 既有回归。新增 GitHub 临时 PostgreSQL 验证独立连接的并发删除与保存。已完成 Chromium 联合本地 API、嵌入式 PostgreSQL 的默认项、新包装保存、商品输入保留及桌面/移动尺寸检查；已加载中文字体检查桌面与移动布局；线上完整外壳仍需视觉验收。
- 设置资料改为 Excel .xlsx 模板、导入及导出；预览展示表格和具体错误行，存在错误时不可应用。尚未接入完整变更历史浏览。
- 分类、品牌、规格、单位、店铺、尺寸分档等其他下拉尚未迁移，不能认定所有下拉已经可维护。
- 当前数据中的包装名称、物流名称就是业务引用值，所以已有名称暂时锁定。后续改名需要迁移为稳定ID并处理旧商品引用。删除检查覆盖当前商品表中 manualEntry 及直接 metadata 的对应字段，包含停用和历史商品；外部系统、未保存表格及浏览器草稿不在引用计数内，保存时仍会校验当前有效目录。
- 财务/渠道等设置仍按领域标注归属，尚未增加按领域分别授权；当前沿用既有统一维护白名单。
- 已有商品的成本分析仍按当前参数重新计算；本改动不写回历史订单，也不构成历史核算快照功能。
- 仓库原有 backend/package-lock.json 与 package.json 不同步，`npm ci` 失败；本次未改依赖与锁文件。验证时使用 `npm install --no-package-lock --ignore-scripts`。

## 验收步骤

1. 只读账号能查看目录，写接口返回权限错误。
2. 维护账号新增日本包装物、填成本和排序，填原因并保存；商品下拉立刻可选，利润分析包装成本匹配。
3. 调整该成本并保存，再次核算使用新成本。
4. 停用后新商品不再提供此选项；原来已选择的商品保持选项。
5. 新增按kg与首重续重物流方式，核算对照现有公式。
6. 两个窗口从同版本编辑，后保存的收到409，草稿可导出且不覆盖先保存的版本。
7. 模板导入预览、取消、应用并保存；错误格式、负数成本和重复编号不应用。
8. 商品未保存时打开维护窗口，保存设置并关闭，商品各字段保持。
9. 查询实际数据库历史表，确认每次生效都包含维护人、版本与变更原因。
10. 设置默认项，新商品自动带入，已有商品不变；默认项必须启用且每个目录只有一个。
11. 删除未引用项成功，删除已引用项返回409且版本不变；删除草稿可撤销。
12. 两个独立连接并发执行选用某包装保存商品与删除该包装，只允许一方成功。

## 自动检查

```bash
node apps/systems/aione/backend/scripts/test-shared-parameters-contract.js
node apps/systems/aione/backend/scripts/test-settings-center.js
node apps/systems/aione/js/config/product-shared-cost-engine.test.js
node apps/systems/aione/js/config/product-pricing-math.test.js
```

DOM 交互测试使用隔离测试依赖，不修改应用依赖：

```bash
npm install --prefix /tmp/aione-ui-tests --no-package-lock --ignore-scripts jsdom
AIONE_JSDOM_MODULE=/tmp/aione-ui-tests/node_modules/jsdom/lib/api.js node apps/systems/aione/backend/scripts/test-settings-center-ui.js
```


新增数据库集成测试（只允许 `AIONE_ENV=controlled-ci` 的临时数据库；与现有 CURRENT 基线、0103、0110 初始化配套）：

```bash
node apps/systems/aione/backend/scripts/test-settings-center-db.js
```

2026-10-15 补充修复：移除商品格式规范化中包装方式四选一的旧校验，改在商品写入事务中校验有效目录；用共享参数行锁与删除事务协调。文本和数字字段失焦后延迟重绘并恢复焦点，防止销毁下一输入控件。


2026-10-15 Excel 修正：包装模板列为名称、单套成本（明确CNY/JPY）、排序、状态、默认项；物流模板增加固定编号、履约方式、计费方式及首重/续重/每kg费用。保留分类标识防止导错模板，拒绝公式；上传限制2MB、500条，按实际Excel行号报错，有错误禁止应用。导出包含当前目录草稿。模板和预览接口不写入业务资料。尚未更新的后端与真正的只读权限分别提示，不能把“按钮被禁用”当成新增功能已验收。

```bash
node apps/systems/aione/backend/scripts/test-settings-catalog-workbook.js
```
