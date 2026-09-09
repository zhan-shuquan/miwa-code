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
→ Authenticated Verification
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
- 使用 Cloud Run IAM identity token 调用 private `/health`
- `/health` 必须返回 `ok=true`
- 执行现有 `aione-db-preflight` Cloud Run Job
- 任一步失败即阻断

### AIONE DB Migrate

定义：`infra/gcp/cloudbuild/db-migrate.yaml`

职责：
- 默认 `_CONFIRM=DO_NOT_RUN`
- 只有显式传入 `_CONFIRM=MIGRATE_AIONE` 才执行
- 先执行 Backend syntax check
- 以当前 reviewed main commit 构建 immutable image `main-$SHORT_SHA`
- 将 `aione-db-migrate` 与 `aione-db-preflight` 同时绑定到该 commit image
- 执行 `aione-db-migrate`
- Migration 完成后自动执行同镜像的 `aione-db-preflight`
- Migration 与普通 Backend deployment 分离

禁止使用“旧 migration job 当前碰巧绑定的镜像”作为新 schema migration 的事实来源。

### AIONE Deploy Backend

定义：`infra/gcp/cloudbuild/deploy-current-backend.yaml`

职责：
- 用当前源码构建 immutable commit image
- 推送 Artifact Registry
- 用同一 image 更新 `aione-db-preflight`
- 先执行 read-only DB preflight
- preflight PASS 后部署 `aione-backend-current`
- 保持 Cloud Run private (`--no-allow-unauthenticated`)
- 部署后使用 IAM identity token 调用 `/health`
- `/health` 必须返回 `ok=true` 才标记 deployment PASS

## 4. 一次性 Bootstrap

定义：`infra/gcp/bootstrap/01_SETUP_DEVOPS_V1.sh`

职责：
- 只允许在 clean `main` 上执行
- 校验 Google Cloud project 必须为 `miwa-aione`
- 启用必要 Google Cloud APIs
- 创建专用 `aione-cloud-build-deployer` service account
- 为 deploy identity 授予受控的 Artifact Registry / Cloud Run / Cloud SQL metadata / Logging / Service Usage 权限
- 只允许 deploy identity `actAs` `aione-runtime`
- 继续由 `aione-runtime` 持有 Cloud SQL client 与指定 Secret accessor
- 创建 3 个只指向 main 的 manual Cloud Build triggers

Bootstrap 不把 secret value 写入 Repo，也不创建第二套 runtime identity。

## 5. 已存在能力继续复用

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
AIONE DevOps Check
```

`AIONE DevOps Check` 负责阻止：
- CURRENT 自动化中重新出现 legacy runtime 名称
- Production Backend 被改成公开匿名访问
- DB migration 默认确认值被改成自动执行
- authenticated `/health` gate 被删除
- bootstrap 失去 main-only 限制
- 疑似 secret value 被提交进 DevOps 文件

## 6. 部署与 Migration 分离原则

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

## 7. 权限原则

Cloud Build 使用专用 deploy service account，不依赖个人账号，也不复用业务 runtime service account。

职责分离：

```text
aione-cloud-build-deployer
→ 构建 / 发布 / Job 编排 / runtime metadata 验证

aione-runtime
→ 业务运行 / Cloud SQL connection / 指定 Secret 读取
```

不得为了方便长期授予 Owner/Editor。

## 8. Validation → Merge → Bootstrap 顺序

由于本 V1 的 Cloud Build 配置文件在 PR 分支中，而正式 Trigger 只允许指向 main，因此正确顺序必须是：

```text
1. PR 分支完成静态 CI / DevOps guardrail validation
2. 必要时从当前分支用 gcloud builds submit --config 做一次受控 Cloud Build 验证
3. Review PR
4. Merge main
5. 在 clean main 上只执行一次 01_SETUP_DEVOPS_V1.sh
6. 创建正式 main-only manual triggers
7. 运行 AIONE Verify CURRENT
8. 验证 authenticated /health + DB preflight + Cloud Logging
9. 正式启用 AIONE Deploy Backend
```

不得在 PR 尚未进入 main 时，提前创建一个假定 main 已存在配置文件的正式 Trigger。

## 9. GitHub main 保护现状

截至 2026-09-09，当前私有仓库未启用 GitHub Rulesets。实际读取 Rulesets API 返回当前账户方案需要升级 GitHub Pro 或将仓库公开。

因此 V1 暂时采用：
- PR + GitHub Actions checks
- main 作为人工治理稳定基线
- DevOps automation 自身 main-only gate

GitHub 账户能力允许后，应升级为平台级 required checks / branch protection，而不是长期依赖人工记忆。

## 10. V1 暂不做

本版不建设复杂 AIONE 运维中心 UI，不自动执行 destructive database operations，不自动删除 legacy resources，不改变 CURRENT frontend/Vercel topology。

Browser employee Google-user E2E 仍作为独立验证；Cloud Run runtime gate 已升级为 authenticated `/health`。

## 11. 完成后的日常操作

```text
代码：Branch → Preview → Review → Merge main
Frontend：Vercel 自动发布
Backend：点一次 AIONE Deploy Backend
DB：只有 schema 变化时点一次 AIONE DB Migrate
检查：点一次 AIONE Verify CURRENT
Cloud Shell：仅 bootstrap / troubleshooting / break-glass
```
