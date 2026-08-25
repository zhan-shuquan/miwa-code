# AIONE V1.9.21｜子域名安全 API Bridge

## 已定位的问题

生产子域名 `https://aione.miwa-happyhouse.com` 能正常加载静态前端，但浏览器的同源请求 `GET /api/v1/ai-secretary/status` 在 Vercel 直接返回 404。Backend 本身已经定义 `/api/v1/ai-secretary/status`，缺口是 Vercel 与私有 Cloud Run 之间的生产连接。

## V1.9.21 目标结构

`Browser -> Vercel /api -> private Cloud Run -> AIONE Backend -> AI provider`

认证拆成两层：

1. **用户身份**：Google Identity Services 的 ID Token 由浏览器放入 `Authorization`；AIONE Backend 使用 Google Auth Library 服务端校验，并把已批准邮箱映射到 AIONE person id。
2. **服务身份**：Vercel Function 使用 Vercel OIDC 与 Google Workload Identity Federation 换取短期身份；Team/Global 两种 issuer 均由 Bridge 自动识别，再为专用 Invoker Service Account 生成 Cloud Run ID Token，放入 `X-Serverless-Authorization`。Cloud Run 继续保持 `--no-allow-unauthenticated`。

因此不会把 Cloud Run 改成公开服务，也不需要在 Vercel 保存 Google Service Account JSON Key。

## 新增文件

- `api/aione-bridge.js`：Vercel 同源 API Bridge。
- `vercel.json`：把 `/api/*` 路由到 Bridge，并屏蔽生产站点对 backend/docs/tests/tools/recovery 源文件路径的直接访问。
- `package.json`：Vercel Function 依赖。
- `backend/src/http/google-auth.js`：Google ID Token 服务端验证。
- `backend/src/auth/google-preview-identity-registry.js`：当前内测用户的服务端归属映射；后续应迁移到 `public.external_identities`。
- `infra/gcp/cloud-shell/07_SETUP_VERCEL_OIDC_BRIDGE.sh`：一次性配置 WIF、专用 Invoker SA 与 Cloud Run Invoker 权限。

## Vercel Production 环境变量

由 `07_SETUP_VERCEL_OIDC_BRIDGE.sh` 自动输出：

- `AIONE_BACKEND_URL`
- `GCP_PROJECT_NUMBER`
- `GCP_SERVICE_ACCOUNT_EMAIL`
- `GCP_WORKLOAD_IDENTITY_POOL_ID`
- `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID`（provider base id；Bridge 自动选择 `-team` / `-global`）

这些都是标识/地址，不是长期私钥。

## 执行顺序

1. 已有 Cloud SQL / Artifact Registry 环境时，Cloud Shell 直接执行 `RUN_C_SUBDOMAIN_BRIDGE.sh`（不会执行数据库迁移）。
2. 脚本会构建 V1.9.21 Backend、私有部署 Cloud Run，并执行 `07_SETUP_VERCEL_OIDC_BRIDGE.sh`。
3. 把脚本输出的 5 个值填入 Vercel Project 的 Production Environment Variables。
4. 推送 V1.9.21 到 `main`，等待 Vercel Production READY。
5. 重新登录 AIONE（旧 session 不含 Google Credential，会自动要求重新登录）。
6. F12 Network 验证 `/api/v1/ai-secretary/status` 从 404 变成 200。

## 安全说明

- Google Client ID 是公开标识，不是秘密。
- Google Client Secret、Service Account JSON Key 不进入前端或 Git。
- 浏览器的 `x-aione-person-id` 在 production 仍不作为身份凭证；Backend 只接受服务端验证后的 Google 身份映射。
- Google ID Token 仅存当前浏览器 tab 的 `sessionStorage`，并按 Token 到期时间失效；后续正式开放阶段可升级为服务端 Session / Identity Platform。
- 1688 OAuth callback 仅保留兼容；当前企业自用永久 Token 主路径不依赖它。
