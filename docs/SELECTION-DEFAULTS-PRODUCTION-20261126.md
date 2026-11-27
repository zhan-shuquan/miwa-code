# 默认值正式部署与真实选品验收 — 2026-11-26

## 已部署
- AIONE代码 b599b06dc3288f2f67a2e4ed91726757c61ab2fd（默认值修复）。未包含工作区未提交的建档原型。
- Cloud Build 407b0af9-52ee-4be4-80d2-2ba712e7a6d6 SUCCESS。
- Cloud Run aione-backend-current-00285-pag：100%流量，候选/数据库健康检查通过。
- Vercel dpl_Jk92vWqiupdseGS85ZSFn9hRCRH4：READY，正式域名 aione.miwa-happyhouse.com。
- ERP迁移 miwa_ai.selection_entry_defaults.20261126 已执行；代码提交9d09276；现有Item未修改。
- 正式出站连接已固定至connector-release-b599b06，任务Running，单个node进程。

## 正式浏览器验收
真实会员86000。新增未保存表单：国内运费0、数量1、单位个（Nos）、空运大件（普货）、原装、A4信封、3cm厚、乐天、运营费率0；未制造测试商品。
真实选品 xp261126001：简称披肩毯保存；采购价14.5、净重400、售价2280、60cm纸箱及60cm尺寸刷新保留；原始选品人86000。
正式货号zsq109已由8081分配并回传AIONE。再次确认后ERP仍仅一条对应预留记录。
成本1357JPY、利润923JPY、毛利率40.48%；明细与汇总一致，历史试算待验证标识保留。
成本函数SHA256 fba8e4ffffea36faea0b0476f7df246ee850fd125fcd1136bf62fe9b2183d391，未修改。

## 未完成/阻塞
ERP Item zsq109不存在；Item总数仍216。用户确认多规格但真实规格尚待补充。原生Item模板要求attributes，不以虚构SKU或单规格绕过。
正式多规格建档、建档成功回传、重复建档防重及ERP整机重启恢复不能宣称已验收。当前完成的是正式货号分配/回传及同步任务版本切换恢复。
采购自动读取仍受现有1688接口配置限制；本商品简称是用户确认值，不宣称自动识别成功。
未启用未完成建档原型，未触发自动美工、上架、发布或外部邮件。

## 备份与回滚
正式ERP货号生成后的完整备份：D:\MIWA-ERP\dev-secrets\miwa-erp-8081-production\20261126-defaults-post-number，源20261126_165120（数据库、公开/私有文件、站点配置）。
上一版本ERP备份：20261126-defaults-intake（16:24，已隔离恢复验证）。最新备份已完整复制并计算哈希，未另做完整恢复。
代码回滚：Cloud Run切回00281-meb；Vercel回滚dpl_D7JVt9eYiutuovtemJtEdvrioUuL；同步任务使用connector-task-before-b599b06.xml/connector-release-58cc1f9。
回滚以代码/任务配置为先，禁止数据库覆盖回滚导致新增真实资料或货号丢失。默认值元数据若需回退，应从迁移前备份提取对应字段设置逐项恢复。
8080未操作。
