# AIONE V1.0.28｜Global Shell Single Source

日期：2026-08-22
状态：工程基线重整

## 本轮唯一目标
把已确认的AIONE最新全局架构真正落实为唯一代码源，停止页面级复制Header/Sidebar造成的结构和命名漂移。

## 唯一Shell
- Header：`components/shell/header/desktop-header.html`
- Sidebar：`components/shell/primary-navigation/sidebar.html`
- Aside：`components/shell/aside/aside.html`
- Footer：`components/shell/footer/footer.html`
- 根装载器：`index.html` + `js/miwa-system.js`

业务页面不得重新实现上述结构，只提供Main业务内容和必要的上下文配置。

## 本轮已删除
`pages/selection-workbench/record-detail/index.html` 中原有的独立Header、Sidebar、Aside、Footer、旧导航和重复全局CSS快照。该文件现在只承载商品机会/测样执行的业务内容。

## 路由
- 商品机会详情：`#/selection/opportunity/:id`
- 测样执行：`#/sampling/opportunity/:id`
- 旧详情直链：自动重定向到根AIONE Shell。

## 当前锁定名称
- 美和精神
- 今日印象
- 分类之家
- 商品之家
- AI之家
- 分析中心
- 共享之家
- 选品工作台 / 测样工作台 / 采购工作台 / 设计工作台 / 上架工作台 / 运营工作台 / 订单工作台 / 库存工作台 / 客服工作台

## 自动门禁
`tests/verify-global-shell.mjs` 已增加：
1. 业务页面禁止出现第二套 desktop Header / Sidebar / Footer host；
2. 商品机会详情禁止携带共享CSS快照；
3. 旧直链必须回到根Shell；
4. 废止名称重新出现时验证失败。
