# SKU清单精简验收 — 2026-11-27

实施分支：feat/sku-list-simplification-20261127。业务代码：d3117ff；参考图片输入列宽修正：868825b。

## 当前规则

- 新导入、人工新增的SKU默认销售；清单仅显示有效销售行。
- 删除行和批量删除使用已有selected=false机制，保留后台原始资料；历史排除行和重复导入不会恢复销售。
- 不再显示逐行销售/确认、批量确认/取消销售、逐行原始资料。只保留属性数和有效SKU数。
- 顺序为选择、参考图片、动态ERP属性、采购价、净重、1688 SKU ID、ERP SKU、删除。
- 1688 SKU ID及人工图片网址使用现有字段保存；数量特殊覆盖保留。
- 顶部确认选品调用服务端统一校验并保存confirmed兼容原ERP建档契约。缺字、缺失属性、重复组合、重复供应商SKU ID仍阻断确认。
- SKU未填采购价/重量沿用商品值，区间原价不被自动选取；本次使用管理员已保存和确认的商品采购价。

## 验收证据

- 单元/解析：test-selection-specifications.mjs、test-selection-sku-file.mjs通过。
- 隔离普通员工86991：xlsx/xls/csv解析、保存回读通过；其他员工读写返回404，旧版本保存409。
- test-sku-unified-confirmation.mjs：统一确认、已排除行保留、重试通过。隔离无正式ERP写入。
- 实际浏览器：编辑1688 SKU ID、全选/清除、批量删除、保存、刷新、重复导入保持删除状态、顶部统一确认通过。
- 正式浏览器86000管理员操作86001负责的已授权zsq115记录，保留原选品人与负责人。
- xp261127014原版本3，导入真实1688 CSV两行并保存至版本4；确认及提交后版本8。
- 真实颜色白黑、米咖，两个供应商图片均加载成功（1200px）；采购价6.8元、净重100g继承；用户确认简称针织手套、售价1000日元。
- ERP原生Item只读核查：zsq115及zsq115_c01、zsq115_c02存在；供应商ID分别6135217234383、6135217234384；两条SKU采购价6.8、净重100。
- 正式建档任务6856fa91-a85d-4e40-91fc-3fe5deae07a0 succeeded，stage=item_created，skuCount=2，published/paidAI/emailSent均false。
- AIONE实际页面显示建档成功、两条正式SKU及中文规格名称。
- 删除验收仅在隔离记录完成，未删除zsq115真实销售规格。未修改历史商品及SKU。

## 发布及回滚

- 后端构建6ce39f2c-e25c-4b71-a1ee-d4458cc81adf SUCCESS。
- Cloud Run aione-backend-current-00307-sas，镜像sku-simple-d3117ff，健康检查database=connected；100%流量。
- Vercel生产dpl_443CqbV9HG6ZCXSr5hVuUXymTvW9完成业务发布；最终dpl_F6NsZ7GGsj2p4tctnJccrZyuaBv9仅补充参考图片输入列宽，正式域名aione.miwa-happyhouse.com。
- 前端回滚dpl_CRAPM7QcpT7rNFarc65hz8PkYvZz；后端回滚00305-jeq。无需数据库结构迁移，回滚代码不回滚新增业务数据。
- CloudSQL备份1795773290450 SUCCESSFUL，description=sku-simple-before-d3117ff。
- ERP完整备份sites/miwa-dev.localhost/private/backups/20261127_185935-miwa-dev_localhost-*（数据库、公私文件、站点配置）。不要使用整库恢复覆盖发布后新增业务数据。

## 未覆盖及待核实

- 普通员工完整操作在隔离环境完成；正式验收会话为86000管理员，不冒充86001本人操作。
- ERP现有简称规则未识别此商品；用户确认针织手套后人工保存，本轮没有改动识别规则。
- 白黑/米咖未被现有ERP属性值词库自动匹配，按真实表格人工关联Colour；不是伪称自动识别通过。
- 两个SKU日文规格名称仍待核实，不在本轮精简范围内。
- 成本参数仍保留待业务验证标识，公式未修改。

截图：.local/sku-simple-isolated.jpg、.local/sku-simple-zsq115-success.jpg。
