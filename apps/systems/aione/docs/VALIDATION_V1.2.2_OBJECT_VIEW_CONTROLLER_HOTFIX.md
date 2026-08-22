# AIONE V1.2.2｜对象视图组件热修复验证

- `object-view-controller.js` 语法检查通过。
- `business-page-template.js` 与 `selection-workbench.js` 均显式调用唯一 Object View Controller。
- 通用业务页面卡片/列表 hidden 防护已加入。
- 选品商品机会卡片/列表显示防护已加入。
- Global Shell、V1.2二级体系、业务母版、测样专项回归测试通过。
- 当前执行环境 Chromium 无法正常访问本地 HTTP 页面，因此自动视觉浏览器验收未作为“已通过”声明；Windows + Live Server 首次打开仍需人工视觉确认。
