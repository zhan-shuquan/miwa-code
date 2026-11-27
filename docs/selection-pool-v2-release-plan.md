# 选品池V2发布与回滚准备

2026-11-28，日本时间。仅准备，尚未合并、发布或执行ERP初始化。

## 发布门槛

1. 真实1688原表批量验收通过：标题、图片、ID、URL、参考价格、全公司查重、编号、选品人、成果记录、批量认领分配。无图片或价格必须明确待补充原因；不允许静默丢行。
2. 在正式数据库已有授权连接中运行 `node scripts/preflight-selection-pool-v2.mjs`。仅查询information_schema，事务READ ONLY并回滚，不读取商品资料。不通过即停止，不自动迁移或修改权限。
3. 重新fetch main并复核差异；仅发布V2提交。工作区其他认证改动、临时脚本不得进入构建包。使用审核后的提交生成干净Git归档，不能直接上传当前脏工作区。
4. 记录当时实际Cloud Run revision/image、Vercel deployment、连接器路径/文件哈希、ERP渠道主数据是否存在；完成Cloud SQL与ERP备份，记录备份ID和恢复方法。旧备份不代替发布时备份。
5. ERP渠道新增前核对站点与8081容器映射，执行setup-erp-selection-channels.py仅新增不存在的渠道；保留已有记录，不修改员工角色。站点名检查不能代替端口/容器核对。
6. 发布连接器快照扩展，确认20个渠道进入AIONE；随后发布后端和前端同一审核提交。不得变更同步配置或8080。
7. 86000验证正式页面、市场与货源两种流程、任务衔接、实际执行人、日本日期、移动布局及后续录入兼容性。既有zsq117只读核验，不重新建档。保存截图与版本证据。

## V2回滚基线（发布前须重新只读核实）

- Git稳定main：58e0385986d1f0f6f643d2559bd611bfa1a9bb6d；Tag aione-stable-20261128。
- 已记录Cloud Run：aione-backend-current-00313-quw。
- 已记录Vercel：dpl_CzFFLo1zSkrZvf3baFW2eqjVNw6k。
- 已记录连接器：connector-release-dba5997；发布前保留原运行目录及任务参数。

旧 `scripts/rollback-launch-20261128.ps1` 属于上一轮发布回滚，指向00311-qav与更早前端；不能直接作为V2回滚脚本。

确认本次发布前实际基线仍与上述一致后，代码回滚命令为：

```powershell
gcloud run services update-traffic aione-backend-current --project=miwa-aione --region=asia-northeast1 --to-revisions=aione-backend-current-00313-quw=100
vercel rollback dpl_CzFFLo1zSkrZvf3baFW2eqjVNw6k --scope info-64613987s-projects
```

若发布前基线有变化，必须替换为本次备份记录中的实际目标，不能执行过期命令。连接器仅恢复本次替换的代码文件并验证哈希，不重置计划任务、账号或同步配置。

回滚保留新增渠道、业务记录、附件及工作成果；不恢复旧数据库覆盖新业务，不删除商品文件，不撤销员工权限。回滚后检查健康接口、选择池读操作及连接器同步；有异常保留日志并停止进一步写入。
