# 最终技术收口记录（重启验收前）

## Git与部署审计

合并申请：https://github.com/zhan-shuquan/miwa-code/pull/210 。合并前main为fbddca9188fa71471056337a743ff47b28520146，候选e8386a93eb325d3e3a4d69c8495605d7e22f52e5。显式获取main后，main-only为0，开发分支59个提交，160个变更文件；没有删除文件。保留完整提交历史，禁止squash、force push或覆盖其他工作区改动。

累计变更覆盖此前已上线的选品工作区、员工关联投影、选品编号、SKU导入/身份、ERP8081连接器、文件落地及云端复制。共享入口变更已核对；现有美工/商品合同由原CI回归验证。未提交的canonical-google-identity.js、google-auth.js和ERP通知相关文件属于独立工作，未纳入候选。普通员工权限实际验收仍是独立任务。

正式前端dpl_89MBnwZq8pfwAAH9YJdUNqrzqf7v对应06e9ae9；正式后端00313-quw对应dba5997，镜像655fcd2b565cd3fa5555365c5f0cdbb2dd77f2dbcc3eff33c78de20363f73683，100%流量。e8386a9相对06e9ae9只改测试和文档，生产执行代码相同。连接器发布目录257个文件与干净候选比对，仅两个测试脚本不同，生产文件全部一致。ERP运行文件SHA256为bf8a8c366f42568198f79ffef3b4bfcd112290ef1876e6ce81317d799161d0ca，与b2c0f2b中的发布文件一致。

## 回归

旧test-selection-files依赖可变用户Excel，缺少SKU上传filename并使用过时employee身份。现改用内存生成的当前字段夹具、explicit filename及employeeA；12项通过，未修改用户模板。

干净Git导出候选npm check和19组专项回归全部通过，涵盖owner策略、员工授权投影、默认值、单/多属性、SKU格式、最终优化逻辑/API、模板、识别、隔离保存、工作区、SKU确认、来源关系、图片导入、队列持久重试、连接器目标及代理头、文件存储、真实Windows文件锁恢复。

ERP共享建档离线回归全部通过。PR候选10个GitHub Actions工作流全部success，包括Backend Check（镜像构建与受控DB迁移预检）、Product Entry Contract、CURRENT Baseline Guard以及7个现有美工/材质/模板合同工作流。没有执行付费生成、真实上架或采购。

00:42 JST复核：zsq117既有建档reused=true、5条SKU，前后商品摘要相同、Item总数244。Drive check为9 matching、0 differences。WPS云端下载副本的既有证据见本日十项验收报告；本次重启后需再次检查，不能用旧证据替代新重启。

## 备份与回滚

工作区output/aione-pre-main-closeout-20261128.bundle为完整Git历史备份，git bundle verify通过，包含候选和合并前main。未提交独立改动另存工作区tmp/technical-closeout/uncommitted-auth.patch，并保留原工作区。

部署前Cloud SQL备份1795792495241和ERP数据库20261128_001203-miwa-dev_localhost-database.sql.gz保留。私有配置、数据库备份和ERP单文件备份仍在原受保护位置，不进入Git。

执行入口：scripts/rollback-launch-20261128.ps1。默认仅验证/打印计划，显式-Apply才回退代码。ERP默认检查已实际通过：备份和运行SHA一致；实际回退沿用既有deploy-existing.py的容器ID、挂载路径、前后哈希检查并HUP目标后端。不会恢复数据库或删除辅助信息字段。

PowerShell示例：`./scripts/rollback-launch-20261128.ps1 -Component ERP`，异常时经过确认范围后加`-Apply`。Backend组件需在已授权gcloud环境运行，切换到00311-qav；Frontend组件需已有Vercel CLI登录，切换到dpl_5PL4Ycpp4myu8jJY6hZzx5p8B1wN。也可使用Vercel插件request_rollback：projectId=prj_BBXaLAg8MljsIZ14HKzNtV978uEL、teamId=team_exAPBBstnEtQvvKSwwMWq3RT、deploymentId同上。CLI依据：https://vercel.com/docs/cli/rollback 。如果账户套餐不允许指定历史版本，停止，不升级付费套餐。

回滚后必须重新检查正式页面、8081 ping、86000连接、zsq117及云端哈希。禁止git reset覆盖主线、禁止自动恢复旧数据库覆盖新业务、禁止修改8080或员工权限。回滚入口经过静态/备份校验，未为了演示而实际降级生产。

## 尚待完成

本记录落盘时：PR合并、稳定Tag、合并后版本确认、服务重启和本次整机重启后的自动恢复仍待完成。最终状态应以后续收口报告为准。
