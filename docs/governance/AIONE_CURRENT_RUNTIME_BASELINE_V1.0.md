# AIONE CURRENT Runtime Baseline V1.0

状态：CURRENT / GOVERNANCE
日期：2026-09-08
适用项目：美和AIONE一体化工作平台

## 1. 唯一正式技术基线

AIONE 当前唯一正式技术基线如下：

```text
GitHub main
→ Vercel Frontend / same-origin API Bridge
→ Cloud Run aione-backend-current
→ Cloud SQL aione-pg-dev
```

任何新开发、数据库迁移、API 调整、AI/自动化接入均必须基于此链路继续。

## 2. Code Truth

```text
Repository: zhan-shuquan/miwa-code
Branch: main
```

main 是唯一稳定代码事实源。

已废止的 Sidebar / Aside / 旧 Shell、旧页面实验代码、旧对象模型和旧 API 定义不得重新回流到 CURRENT。

## 3. Frontend / Hosting Truth

Vercel Project：

```text
miwa-aione-test
```

GitHub Integration：

```text
zhan-shuquan/miwa-code
main push -> Vercel production deployment
```

截至 2026-09-08，以下两个入口均已返回当前 main 的新版 Shell：

```text
https://aione.miwa-happyhouse.com/
https://aione-test.miwa-happyhouse.com/
```

两者当前 HTML 均表现为：

```text
Header host
Main host
Footer host
sidebar-host hidden
aside-host hidden
```

因此旧正式域名中的旧左右栏工程已经不再作为 CURRENT 运行事实。

## 4. Frontend API Binding Truth

浏览器不得再根据 `aione-test` host 特判直连 dev Backend。

CURRENT 前端统一使用 same-origin：

```text
/api/*
```

Vercel `api/aione-bridge.js` 负责：

```text
Browser Google ID token
→ Vercel /api bridge
→ Google WIF
→ private Cloud Run
```

Cloud Run 保持 `--no-allow-unauthenticated`。

CURRENT Bridge Backend 已锁定为：

```text
https://aione-backend-current-jjlnxogxta-an.a.run.app
```

旧 `AIONE_BACKEND_URL` Vercel 环境变量不再作为 Backend 路由唯一事实源，避免旧环境值把前端静默带回 dev/legacy Backend。

## 5. Backend Truth

CURRENT Cloud Run Service：

```text
aione-backend-current
```

首个正式 CURRENT Revision：

```text
aione-backend-current-00001-krt
```

部署镜像基于 main commit：

```text
4784b0d2e8d6ea0aa4ca14fd045d196651f099ef
```

部署验证已通过：

```text
/health -> ok=true
database -> connected
latestMigration -> 0091
```

未携带有效 AIONE Google 用户 token 时，`/api/v1/me` 正确返回 401。这证明请求已穿过 Vercel Bridge 和 Cloud Run IAM 并到达 CURRENT Backend 的用户认证层。

## 6. Database Truth

CURRENT Cloud SQL：

```text
aione-pg-dev
```

虽然实例名包含 `dev`，治理意义上它已锁定为 CURRENT 正式数据库基线。

当前最新迁移：

```text
0091 product assets and channel image mapping
```

Legacy Cloud SQL：

```text
aione-postgres
```

仅作为历史数据来源保留，不参与新开发，不允许新业务继续写入形成第二套事实。

## 7. Legacy / Deprecated

以下内容不再拥有 CURRENT 定义权：

```text
aione-backend-v190
旧 v1.9.40 runtime
旧 aione-postgres schema
旧 Sidebar / Aside / Shell
旧 recovery 页面
旧 Mock 编号和状态
旧 API / 前端直连 dev Backend 逻辑
```

历史数据是否迁移，必须按对象逐项判断；禁止整库盲迁。

## 8. Deployment Rule

正式开发固定采用：

```text
Product Freeze
→ Technical Design
→ Branch
→ Vercel Preview
→ Review / Validation
→ Fast-forward or reviewed merge to main
→ Vercel Production auto-deploy
→ CURRENT Backend / Database validation
```

main 不作为实验区。

## 9. Runtime Gate

截至 2026-09-08：

```text
CURRENT Code Baseline            = PASS
CURRENT Frontend Deployment      = PASS
CURRENT Frontend API Binding     = PASS
CURRENT Cloud Run Backend        = PASS
CURRENT Cloud SQL Connectivity   = PASS
CURRENT DB Migration Baseline    = PASS (0091)
Cloud Run IAM Gate               = PASS
Browser Google User E2E          = PENDING USER SESSION VALIDATION
Legacy Runtime Definition Power  = REVOKED
```

Browser Google User E2E 只用于确认真实员工登录态，不再影响 CURRENT 工程基线的判断。

## 10. 下一建设阶段

完成本 Runtime Baseline 后，不再重复审计“main 是谁 / Backend 是谁 / Database 是谁”。只有部署拓扑发生正式变更时才更新本文件。

下一正式建设阶段：

```text
商品之家 Product Freeze V1.0
→ 商品之家 Technical Design
→ 商品之家正式 Branch 开发
```
