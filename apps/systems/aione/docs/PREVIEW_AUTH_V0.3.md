# V1.18.5补充｜退出登录闭环（2026-08-19）

Header用户身份卡点击后显示用户菜单，包含“个人工作身份”和“退出登录”。退出动作必须清除AIONE Preview sessionStorage、当前身份/权限上下文，并调用Google Identity Services的disableAutoSelect，随后返回AIONE内测登录入口。退出不撤销Google账户授权，仅结束AIONE当前会话，便于同一设备切换其他内测成员账号。

# AIONE Preview Auth V0.3｜Google登录接入

状态：验证中  
日期：2026-08-19

## 当前目标

AIONE内测阶段采用“全开放、强归属、重记录、后收权”。Google登录当前主要解决：

1. 确认当前使用者是谁；
2. 按登录邮箱匹配AIONE成员身份；
3. 将任务、页面访问、业务动作、结果、AI使用与后续考核数据归属到正确person_id；
4. 当前不按岗位、店铺隐藏01—08业务工作台。

## Google Identity Services

- Client ID：公开前端识别符，可保存在前端配置中。
- Client Secret：不得进入前端代码、GitHub仓库或浏览器资源。
- 正式来源：`https://aione.miwa-happyhouse.com`
- 本地来源：`http://127.0.0.1:5500`
- 当前Google OAuth发布状态：测试。

## 登录流程

Google账号 → Google Identity Services → ID token → 浏览器回调 → 读取email → AIONE内测成员表匹配 → subject/person_id → 进入完整AIONE → 工作与结果归属本人。

## 当前验证边界

当前版本在浏览器端完成ID token字段检查与成员白名单匹配，用于美和内部Preview验证。正式生产阶段应增加服务端ID token签名、issuer、audience、expiry等完整验证，并将会话与活动日志迁移到服务端/数据库。

## 本地开发备用身份

手动身份卡仅在 `127.0.0.1` / `localhost` 显示。公网正式内测域名不显示手动身份切换入口，避免破坏工作归属真实性。
