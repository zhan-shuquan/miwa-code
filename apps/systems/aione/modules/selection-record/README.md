# 选品记录／选品录入模块接入口

当前状态：真实最新版代码尚待后续正式嫁接。

本轮为了验证 01 选品工作台的完整创建链路，增加：

- `pages/selection-workbench/record-preview.html`
- `css/pages/selection-record-preview.css`
- `js/pages/selection-record-preview.js`

它们只验证：

> 新建商品机会 → 选择选品类型 → 进入选品录入页面 → 自动带入选品类型 → 可返回工作台。

该预览页不是选品录入模块的最终锁定代码，不替代此前已经优化过的真实选品记录／录入页面。后续取得最新真实代码后，应以真实代码为唯一基线正式嫁接，并继续执行“单一数据源＋摘要投影”原则。
