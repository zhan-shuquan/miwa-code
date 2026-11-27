# 2026-11-27 SKU统一编号验收

## 正式结果

- ERP 8081：zyl017 保留主货号，黑色 zyl017_c01，深灰色 zyl017_c02。与本地 PNG 图片颜色逐一核实。
- zsq109：12 条 SKU 依据已有确认顺序及图片序号改为 zsq109_c01–c12。未改变供应商 SKU ID、实际规格、采购资料及主货号。
- 改号前扫描全部原生 Item Link 引用及相关 MIWA/库存/订单/采购/平台文本字段；两款旧 SKU 只存在编号预留记录，未发现业务单据或已发布平台关联。
- 使用 Frappe 原生 rename_doc，保留改号审计和旧编号预留。没有删除重建商品。
- 新 SKU 使用父商品事务锁、持久序列和历史预留检查；原生规格匹配处理重复组合。内部属性缩写不再决定正式 SKU 编号。

## 实际验证

- 占金玲 Google 账号成功登录正式 AIONE；xp261127001 商品规格页显示新编号及黑色/ブラック、深灰色/ダークグレー，2 条均已确认。
- 正式 AIONE 已收到 zyl017 2 条与 zsq109 12 条当前 ERP SKU。重复快照后版本保持 13/28；bootstrap 参数配置不包含 SKU 全量数据。
- 对两款商品各重复调用现有 ERP receive 安全重试分支，均返回 reused=true，编号及数量不变。
- 事务回滚测试：首次 c01/c02、停用后新增 c03、人工规格名称修改不改号；新增普通 ERP 属性及多维组合通过，属性顺序变更后重复创建数量为 0。无测试 Item 留存。
- 上架 collect 只读入口返回正确正式编号、结构化颜色及 zyl017_c01.png / zyl017_c02.png。
- 实际美工 material_context 只读入口返回 zyl017 2 SKU/2参考图、zsq109 12 SKU/12参考图，issues=[]。读取现有ERP确认附件；未生成任务、下载图片或调用模型。
- 17 组共享导入离线回归通过；4 项新增SKU资料关联测试、14项原美工资料修复测试及12项AIONE规格断言通过。
- 旧 test-selection-workspace.mjs 完整脚本在隔离8765库遇到固定测试图片重复校验409，未将该脚本计为通过；没有为此改动正式业务校验。

## 部署

- ERP代码提交：2eda680、0693665、a75b083、3f29986（独立分支，未推远端）。hooks仅提交本轮增量，保留其他未提交改动。
- AIONE提交：a9bf910。未发布工作区中无关认证改动。
- Cloud Run：aione-backend-current-00299-ley，100%正式流量；候选健康检查数据库 connected。
- Vercel：dpl_5JxX1aaLwCu7MDYWFAMnNyrf8eG4，production READY，现有正式域名不变。
- 出站连接器仍使用原唯一计划任务，仅更新快照读取脚本；ERP不开放公网端口。

## 待核实

zsq109 12 个日文规格名称没有现有确认翻译，保留“日文规格待核实”。管理员可在ERP对应SKU → 商品规格 → SKU规格名称（日文）中补充；不会改变正式编号。未执行真实平台发布或付费美工，因此本轮验收范围为数据来源关联及只读取数。

## 备份及回滚

私有目录：D:\MIWA-ERP\dev-secrets\miwa-erp-dev\deployments\sku-identity-20261127

site-backup保存完整数据库、站点配置、公私文件及两款商品改号前JSON。数据库gzip完整读取、两个tar目录校验通过；本轮未进行另一套数据库恢复演练。

- 后端可切回 aione-backend-current-00297-hes，前端可回滚 dpl_HJnQRCShFUDaDWDwD3vW3iXaDrSg。
- 回滚后端前先恢复 export-snapshot.before.py，避免旧后端接收新增skuMaster字段。
- ERP代码按 confirmed-source.json、flow-source.json、source-map.json、deploy.json 的逆序使用既有部署工具 --rollback；hooks只移除本轮SKU钩子，不覆盖其他变更。新增显示字段可保留，避免删除数据。
- 若需撤销改号，先停止相关提交并检查新增业务引用，再按备份映射使用ERP原生rename_doc反向更名；不得直接恢复整库覆盖后来业务数据。旧/新编号预留均保留，防止重用。

未操作8080，未修改成本函数，未触发付费AI、商品发布或邮件。
