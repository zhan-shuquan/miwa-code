# 美和代码结构说明

```text
MIWA_AIONE_CODE_STRUCTURE_CANDIDATE_v0.1/
├─ index.html                         # 当前预览入口
├─ assets/
│  └─ brand/                         # 美和正式品牌资产
├─ components/
│  └─ shell/
│     ├─ header/                     # Header HTML
│     ├─ primary-navigation/         # Sidebar／移动导航 HTML
│     ├─ aside/                      # Aside HTML
│     └─ footer/                     # Footer HTML
├─ css/
│  ├─ miwa-system.css                # 公共 CSS 总入口
│  ├─ foundation/                    # Token 与基础样式
│  ├─ shell/                         # 四个公共结构及整体布局
│  ├─ components/                    # 跨页面通用小组件
│  └─ pages/                         # 页面专属样式
├─ js/
│  ├─ miwa-system.js                 # 公共 JS 总入口
│  ├─ config/                        # 系统配置与组件清单
│  ├─ core/                          # 通用加载机制
│  └─ shell/                         # 公共结构的动态逻辑
├─ pages/
│  └─ selection-workbench/           # 选品工作台正式接入口
├─ modules/
│  └─ selection-record/              # 选品记录正式接入口
├─ docs/                             # 结构、迁移和变更说明
└─ recovery/                         # 原始恢复证据，不参与正式加载
```

## 职责边界

| 代码区 | 正式职责 | 不允许承载 |
|---|---|---|
| `foundation/` | 品牌 Token、浏览器基础样式 | 页面业务布局 |
| `shell/` | Header、主导航、Aside、Footer、全局位置关系 | 选品卡片、选品表单等业务模块 |
| `components/` | 跨页面复用的小型 UI 组件 | 单一页面完整业务 |
| `pages/` | 一级页面及其 Main 内容 | 修改公共 Shell 职责 |
| `modules/` | 可被页面调用的独立业务模块 | 重复建立全局框架 |
| `recovery/` | 恢复证据与旧代码追溯 | 正式运行加载 |

## 四个公共结构

CSS 已按全局公共组件独立管理：

1. `css/shell/header.css`
2. `css/shell/primary-navigation.css`
3. `css/shell/aside.css`
4. `css/shell/footer.css`

`css/shell/layout.css` 只管理这几个区域之间的位置和响应式骨架，不承载任何具体组件视觉。

Main 不作为公共组件，它按一级页面独立进入 `pages/`。
