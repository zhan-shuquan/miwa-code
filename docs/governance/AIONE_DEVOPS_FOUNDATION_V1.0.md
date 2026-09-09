# AIONE DevOps Foundation V1.0

状态：VALIDATING
日期：2026-09-09
适用项目：美和AIONE一体化工作平台

## 1. 目标

将 AIONE 日常运维从“人工复制 Cloud Shell 命令”升级为受控自动化：

```text
Repo Truth
→ CI Check
→ Manual/Controlled Cloud Build Trigger
→ Cloud Run Service / Cloud Run Job
→ Verification
→ Cloud Logging / Audit
```

Cloud Shell 从日常操作台降级为故障排查与一次性 bootstrap 工具。

## 2. CURRENT Runtime Truth

本方案继承现有 CURRENT Runtime Baseline，不创建第二套运行定义：

```text
GitHub main
→ Vercel Frontend / same-origin API Bridge
→ Cloud Run aione-backend-current
→ Cloud SQL aione-pg-dev
```

现有 `infra/gcp/cloud-shell/*` 继续保留，作为 bootstrap / break-glass / troubleshooting 工具；不再作为长期日常主入口。

## 3. V1 操作入口

### AIONE Verify CURRENT

定义：`infra/gcp/cloudbuild/verify-current.yaml`

职责：
- 读取 CURRENT Cloud Run service metadata
- 确认 service / revision / image / runtime service account
- 执行现有 `aione-db-preflight` Cloud Run Job
- 失败即阻断

### AIONE DB Migrate

定义：`infra/gcp/cloudbuild/db-migrate.yaml`

职责：
- 必须显式传入 `_CONFIRM=MIGRATE_AIONE`
- 执行现有 `aione-db-migrate` Cloud Run Job
- Migration 完成后自动执行 `aione-db-preflight`
- Migration 与普通 Backend deployment 分离

### AIONE Deploy Backend

定义：`infra/gcp/cloudbuild/deploy-current-backend.yaml`

职责：
- 用当前源码构建 immutable commit image
- 推送 Artifact Registry
- 用同一 image 更新 `aione-db-preflight`
- 先执行 read-only DB preflight
- preflight PASS 后部署 `aione-backend-current`
- 保持 Cloud Run private (`--no-allow-unauthenticated`)
- 输出最终 revision / image / service URL

## 4. 已存在能力继续复用

Backend 已存在正式入口：

```text
npm run check
npm run db:preflight
npm run db:preflight:strict
npm run db:migrate
npm run db:smoke:p0
```

Cloud Build 不重复实现数据库业务逻辑，只负责 orchestration。

已有 GitHub Actions：

```text
AIONE Backend Check
AIONE DB Preflight Manual
```

继续承担代码级 CI / controlled database evidence；Cloud Build 负责 Google Cloud runtime orchestration。

## 5. 部署与 Migration 分离原则

禁止默认采用：

```text
Push main
→ 自动 Migration
→ 自动 Production DB write
```

CURRENT 采用：

```text
普通代码发布
→ Deploy Backend

需要 schema 变化时
→ DB Migrate（显式确认）
→ Verify CURRENT
→ Deploy Backend（如需要）
```

Migration 必须保持 additive / backward-compatible 优先。

## 6. 权限原则

Cloud Build 应使用专用 deploy service account，不依赖个人账号。

目标最小权限按实际命令逐项授予，至少涉及：
- Artifact Registry push
- Cloud Run service deploy / job deploy / job execute
- Cloud SQL instance describe / connection metadata
- runtime service account `actAs`
- Secret Manager secret binding metadata（不把 secret 值写进 Repo）
- Cloud Logging write/read as required

正式权限绑定必须在首次 bootstrap 时验证后锁定；不得长期授予 Owner/Editor 作为便利方案。

## 7. V1 暂不做

本版不建设复杂 AIONE 运维中心 UI，不自动执行 destructive database operations，不自动删除 legacy resources，不改变 CURRENT frontend/Vercel topology。

Authenticated employee E2E smoke test 仍属于后续增强；V1 先固化 deterministic runtime metadata + DB preflight + controlled deployment。

## 8. 下一步

一次性 bootstrap：

```text
1. 创建/确认 Cloud Build deploy service account
2. 授予最小 IAM
3. 创建三个 Cloud Build manual triggers
4. 分别试运行 Verify CURRENT / DB Migrate(dry control) / Deploy Backend
5. 验证 Cloud Logging 与失败阻断
6. 通过 Review 后 merge main
```

完成后日常目标：

```text
代码：Branch → Preview → Merge main
Frontend：Vercel 自动发布
Backend：点一次 AIONE Deploy Backend
DB：只有需要时点一次 AIONE DB Migrate
检查：点一次 AIONE Verify CURRENT
```
