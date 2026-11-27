# 选品编号与商品溯源验收｜2026-11-27

## 发布结果

- AIONE代码：853dd0a，分支feat/selection-origin-numbering-20261127。
- ERP代码：f4385ed，分支feat/selection-provenance-20261127。
- Cloud Run：aione-backend-current-00305-jeq，100%流量；候选带认证健康检查成功，数据库已连接，迁移0204。
- Vercel：dpl_CRAPM7QcpT7rNFarc65hz8PkYvZz，READY，aione.miwa-happyhouse.com别名已核对。
- ERP正式入口：http://localhost:8081；未操作8080。
- 现有员工登录、桌面通知的未提交代码未纳入本次发布。

## 验收证据

|检查|结果|
|---|---|
|东京午夜日期切换|通过：14:59:59Z仍当日，15:00Z次日|
|同一员工20路并发|通过，编号唯一|
|同请求8次重试|通过，返回原编号|
|删除后编号不复用|隔离数据库通过，分配历史保留|
|不同员工独立流水|隔离API通过，qmt与qbt分别累计|
|缺少前缀|隔离测试拒绝新增，提示ERP补齐；用户已确认此规则|
|原始员工与负责人分离|分配后原始FIXTURE-86990不变，负责人FIXTURE-86991|
|并发新增请求幂等|选品池、直接新增均返回同一记录|
|普通员工权限隔离|未授权研究员工读取返回404|
|浏览器保存、刷新|普通员工隔离页面qmt261127004保存后版本3，来源与负责人保持|
|选品池回归|49项通过|
|ERP公共建档离线回归|现有ERP镜像无网络、仓库只读，17组全部通过；本机Python缺依赖未用作通过依据|
|ERP来源校验|内存候选校验通过，稳定Employee ID不符及来源冲突拒绝|
|正式SKU溯源|zyl017_c01→zyl017→xp261127001→HR-EMP-00004／86001；zsq109_c01→zsq109→xp261126001→HR-EMP-00001／86000|
|历史商品保护|14条SKU修改前后完整数据SHA256相同：a20c4ff6988ae4fd389ad3d7d3bc5fc35fe6b4e02aad841d4330351705874230|
|正式浏览器|86000 Google登录后读取xp261127001，显示原始选品人与负责人占金玲86001、zyl017、建档成功2个SKU、ERP已连接|
|ERP原生页面|zyl017详细信息显示选品编号、日期及两个Employee链接；原商品价格等字段保持|

未在正式数据库创建虚假选品、商品、SKU或销售订单。新增规则的写入、并发、分配在隔离环境验收；正式环境采用已有真实记录只读核验。
正式建档入口的重复调用被自动审批拦截（可能产生写入），未执行。改用只读trace核验；不宣称本轮已完成正式重复建档调用测试。

## 历史缺项

xp260908001、xp260909001、xp260915001原始选品人为空，保留原值，不按现负责人推测。其余已能根据ERP缓存核实的历史选品关联稳定Employee ID，未改编号。
现有平台映射继续使用MIWA Platform SKU.item→Item.variant_of。未创建或同步销售订单，真实订单接入不在本轮范围。

## 备份与回退

- Cloud SQL备份1795771324340：SUCCESSFUL，selection-origin-before-20261127。
- ERP完整数据库/文件备份：sites/miwa-dev.localhost/private/backups/20261127_182356-miwa-dev_localhost-*。
- ERP文件计划：D:\MIWA-ERP\dev-secrets\miwa-erp-dev\deployments\selection-origin-20261127.json；对应.backup目录保留原运行文件。
- 后端上版：aione-backend-current-00303-xok。
- 前端上版：dpl_55oEYs1JhvBgPDFGNuv5tuK7wWtp。
- 如需回退，暂停新增选品，恢复上述前后端版本并按ERP部署计划回退相关代码；保留增量字段、编号分配历史和期间新增业务数据，不恢复旧数据库覆盖新数据。已补充的真实溯源不删除。

## 截图

- .local/origin-assigned-preview.jpg：隔离普通员工分配与刷新。
- .local/origin-aione-formal.jpg：正式AIONE历史记录。
- .local/origin-erp-zyl017.jpg：正式ERP原生商品来源字段。

字段规范见docs/product/selection/aione-selection-numbering-standard-v2.md。
