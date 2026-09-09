# AIONE CURRENT Runtime Baseline V1.1

状态：CURRENT / GOVERNANCE
生效日期：2026-09-09
适用项目：美和AIONE一体化工作平台

## 唯一 CURRENT

```text
Repository     zhan-shuquan/miwa-code
Code Branch    main
Domain         https://aione.miwa-happyhouse.com
Frontend       Vercel production
API Binding    same-origin /api/*
Cloud Run      aione-backend-current
Cloud SQL      aione-postgres
Database       aione
Runtime SA     aione-runtime@miwa-aione.iam.gserviceaccount.com
DB Baseline    data-code/current/0001_aione_current_baseline.sql
```

以上为 AIONE 唯一正式技术事实。任何代码、自动化、文档或聊天结论不得创建第二套 CURRENT。

## 数据库原则

AIONE 从 2026-09-09 起采用新的 V1 clean baseline：

```text
0001_aione_current_baseline.sql
→ 0002
→ 0003
→ ...
```

旧 0069/0070/0071/0072、旧 0091 链及其他历史 migration 不再作为 CURRENT 迁移链。

## Frontend / API

正式入口只有：

```text
https://aione.miwa-happyhouse.com
```

浏览器统一通过 same-origin `/api/*` 访问后端。Vercel bridge 只允许绑定唯一 CURRENT Backend：`aione-backend-current`。

`aione-test.miwa-happyhouse.com`、Preview 环境和 Preview 专属路由不再拥有 CURRENT 定义权。

## Runtime

唯一 CURRENT Cloud Run Service：

```text
aione-backend-current
```

唯一 CURRENT Cloud SQL：

```text
aione-postgres
Database: aione
Runtime user: aione_app
```

## Deprecated / Cleanup

以下名称一律视为历史或临时资源，不允许参与新开发：

```text
aione-backend
aione-backend-dev
aione-backend-pgdev-check
aione-backend-v190
aione-pg-dev
旧 v1.9.x runtime
旧 Preview runtime
旧数据库 migration chain
```

验证 CURRENT 完成后应从 Google Cloud 清理不再需要的历史 Service / Job / Cloud SQL，避免再次形成多基线。

## 开发与运维方式

当前阶段坚持简单、一体化：

```text
main Push
→ CI / Build
→ Deploy aione-backend-current
→ 必要时执行 Cloud Run Job
→ Verify CURRENT
```

Cloud Shell 只作为 bootstrap、break-glass 和故障排查入口。重复技术动作必须进入 Repo Script / Cloud Build / Cloud Run Job / Cloud Scheduler / AIONE 系统管理能力。

临时分支如确有必要：创建 → 验证 → 合并 main → 立即删除，不长期保留。

## 当前 P0 业务主线

```text
1688 Excel
→ 自动解析
→ AI筛选
→ 选品一览
→ Product
→ SKU
→ AI设计
→ Product Asset
→ Listing
→ 乐天上架
```

第二阶段：

```text
运营 → 订单 → 采购 → 补货/库存 → 客服
```

自动化为默认路径；人工页面主要承担查看、纠正、确认与异常处理。

## Governance Gate

只有本文件定义的这一套 Runtime 可以被称为 CURRENT。拓扑发生正式变化时，必须先更新本文件，再更新自动化与代码；禁止先创建第二套运行定义后再补文档。
