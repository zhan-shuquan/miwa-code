# AIONE V1.18.5｜完整工程基线

状态：已验证 / 当前开发基线  
日期：2026-08-19

## 基线结论

本目录由当前真实 AIONE 工程完整收口形成，不再依赖 V1.18.3、V1.18.4、V1.18.5 等零散补丁继续开发。

已验证的 Google Preview 登录闭环：

Google 登录 → 邮箱识别 → AIONE 成员映射 → Header 身份显示 → 刷新保持 → 退出登录 → 再次登录。

86000 占树全的正确 Preview 登录邮箱为：`mcpu2014@gmail.com`。

## 后续开发规则

1. 后续任何 V1.18.6、V1.19.0 及更高版本，均以本完整工程为唯一开发起点。
2. 补丁只作为变更过程和历史记录，不再作为长期开发基线。
3. 每完成一个重要业务闭环或关键能力验证，应重新收口新的完整工程基线。
4. GitHub `miwa-code/main` 继续作为正式代码资产主仓库；完整 ZIP 用于恢复、交接和阶段快照。
5. Header、Sidebar、Aside、Footer 及已锁定公共组件继续按冻结区原则保护，除非正式变更明确允许修改。

## 本次完整性检查

- 工程文件总数：73（不含本基线说明和校验清单）
- Google Preview 登录代码存在并通过 JavaScript 语法检查。
- Header 退出登录入口存在。
- `disableAutoSelect()` 退出清理存在。
- 旧邮箱 `mcpu2024@gmail.com` 在当前工程中未检出。
- 正确邮箱 `mcpu2014@gmail.com` 已存在于 Preview 身份映射。

## 关键认证文件

- `js/auth/preview-auth.js`
- `js/config/auth-config.js`
- `js/config/preview-identities.js`
- `components/auth/preview-login.html`
- `components/shell/header/desktop-header.html`
- `js/shell/header.js`
- `css/components/preview-auth.css`
- `docs/PREVIEW_AUTH_V0.3.md`

