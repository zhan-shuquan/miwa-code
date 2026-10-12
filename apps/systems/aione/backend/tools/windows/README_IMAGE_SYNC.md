# Windows 商品图片同步（受控试行，非后台服务）

状态：**CANDIDATE**。使用现有 AIONE `/api/v1/product-assets/products/:productId/local-image`，不调用乐天 API，不删除、修改或移动本地原图。

## 使用条件

- Windows PowerShell 5.1 或 PowerShell 7；商品文件夹名必须等于 AIONE 的 `localCode`（例如 `zjl238`）。
- 商品需已保存并取得**内部 Product ID**（不是货号）；支持 `prd_UUID` 或 UUID。
- 登录人员须具备 AIONE 已登记的 canonical Google 身份；后端仅在 `AIONE_REQUIRE_GOOGLE_AUTH=true`、`AIONE_LOCAL_IMAGE_SYNC_ENABLED=true` 且账户邮箱列在 `AIONE_LOCAL_IMAGE_SYNC_ALLOWED_EMAILS` 时允许写入。
- 后端 Cloud Run 的 IAM 和 GCS IAM 必须独立满足；配置项不代表真实权限已经打通。
- 上传时需要当前有效的 Google ID Token，供后端校验；**不得在 repo、配置文件、计划任务参数或脚本中保存密钥/Token**。Token 可能过期。本工具不提供自动刷新或 Windows 无人值守后台授权。
- `ApiBase` 只填批准的 HTTPS 后端域名，不包含 `/api/v1`。

## 预检（默认，完全无网络写入）

```powershell
.\SYNC_AIONE_PRODUCT_IMAGES.ps1 -Folder 'C:\Products\zjl238' -ProductId 'prd_00000000-0000-4000-8000-000000000000'
```

输出每张图片大小、SHA256、状态；`gift.*` 和旧命名忽略。不限制总图片 9/15 张，一次最多扫描 60 张。每张最大 2MB（遵循当前后端上限）。

## 经授权的单次上传

在**已授权的临时 PowerShell 会话**内安全提供有效 ID Token 至 `AIONE_GOOGLE_ID_TOKEN` 环境变量，再显式添加 `-Upload`：

```powershell
.\SYNC_AIONE_PRODUCT_IMAGES.ps1 -Folder 'C:\Products\zjl238' -ProductId '<AIONE_PRODUCT_ID>' -ApiBase 'https://<APPROVED_AIONE_BACKEND>' -Upload
Remove-Item Env:AIONE_GOOGLE_ID_TOKEN -ErrorAction SilentlyContinue
```

上传只进行单件单次扫描，服务器按相同图片位置和哈希去重；遇到同位置不同图返回 HTTP 409，员工需回到 AIONE 人工确认，脚本不会覆盖。云端是否全部完成以 AIONE 的独立只读 `/local-images/status` 校验为准（需经同样身份授权）。

## 明确的未实现边界

此脚本**不是** Windows 后台守护进程；不具备 OAuth 自动登录/令牌刷新，不具备设备无感常驻权限。页面保持打开时每30秒扫描的能力由 PR #153 提供，但须实际验证 Cloud Run 后端已部署及权限配置。

SKU 文件 `_c01` 等仅保存图片用途，**不自动认定为 SKU ID**；需先核对规格/颜色并人工绑定真实 SKU。此脚本不能触发 R-Cabinet、ItemAPI、InventoryAPI。
