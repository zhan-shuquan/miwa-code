# AIONE 系统布局恢复包（仅房子）

## 目的
只恢复并验证系统公共布局，不合并任何选品 Main 页面或商品机会卡片。

## 恢复来源
本包的公共组件与布局样式直接取自恢复资料中的 `web1.zip`：
- components/global/desktop-header.html
- components/global/sidebar.html
- components/global/aside.html
- components/global/footer.html
- components/global/mobile-*.html
- css/tokens.css
- css/base.css
- css/layout.css
- css/components.css
- css/responsive.css

`web1.zip` 是恢复资料中 Header 完整度最高的一套：已包含管理驾驶舱、AI创新中心、商品中心、今日工作、全局搜索、帮助中心、通知、设置、用户，以及第二行四化准则。

## 本包没有做的事情
- 不合并 01 选品工作台页面
- 不合并商品机会卡片
- 不合并九要素/业务关键要素业务内容
- 不修改公共组件设计

## 验证方式
用 VS Code + Live Server 打开 `index.html`。
先只判断“房子”是否正确：Header / Sidebar / Main / Aside / Footer，以及手机端公共布局。
