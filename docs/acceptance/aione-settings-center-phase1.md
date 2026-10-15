# 设置中心第一阶段（待联调验收）

入口：共享之家 → 设置中心（#/shared-settings）。12之家的侧栏“设置”均打开同一中心。商品资料的“维护包装与物流设置”以对话框打开同一编辑器，保留商品编辑状态。

## 已实现

- 复用 Cloud SQL `aione_shared_parameters` 与历史表，不增加第二套参数库；沿用 canonical identity + 参数维护人员白名单写权限。
- 中国包装、日本包装物、物流方式可新增、修改成本、排序、启停；去除物流必须恰为八种的限制。
- 商品编辑的包装与物流下拉从当前共享目录读取；新增物流使用现有按kg或首重续重公式。
- 汇率、关税、利润目标、取整、平台费率使用同一份现有参数，提供集中编辑。
- JSON 导出、导入模板、导入内容预览、应用到草稿、变更原因、版本校验和生效事件。
- 后端禁止直接删除已存在的目录编号或改名。停用后新选择隐藏，已有选择仍保留，可继续核算。
- 原全局设置编辑器同步生效版本；存在旧草稿时阻止覆盖。

## 本阶段边界与待办

- 未上线，未使用生产数据库做写入验证。当前测试覆盖纯计算、schema、事务分支；数据库事务测试使用可控替身。另通过 DOM 交互测试验证实际商品编辑器与设置对话框、只读控制、冲突后保留草稿和新商品不选停用项；未完成浏览器视觉检查。
- 本期 JSON 导入导出，不是 Excel。尚未接入默认选项、完整变更历史浏览、引用检查及未引用项彻底删除。
- 分类、品牌、规格、单位、店铺、尺寸分档等其他下拉尚未迁移，不能认定所有下拉已经可维护。
- 当前数据中的包装名称、物流名称就是业务引用值，所以已有名称暂时锁定。后续改名需要迁移为稳定ID并处理旧商品引用。
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
