# V1.9.31.2｜AIONE内容展示型页面母版 Candidate

## 本轮目标

把事业之家已经验证有效的“战略书页”提升为平台级可复用母版，不再为后续每个内容页重复设计。

## 变更

- 新增 `miwa-publication-master.css` / `miwa-publication-master.js`。
- Sidebar继续固定232px，不改变平台导航规范。
- 内容型Aside：light 260px / standard 292px；Main适当收紧外部padding，以保证横向A4书页面积。
- 内容页统一A4 landscape阅读比例，内容必要时允许增长。
- 新增事业之家顶部 `打印 / 导出PDF` 工具栏。
- 打印/PDF时隐藏Global Shell和交互控件，只输出书页。
- 手机端加强 `pan-y` 和 overflow恢复，保证上下滑动。
- 内容页面视觉色收敛为美和绿 + 美和红，移除蓝/金/棕色书页强调线。
- 路由切换时默认恢复application模式，防止内容页Shell设置污染业务执行页。

## 不变

- Header结构不变。
- Sidebar目录和232px固定宽度不变。
- 事业之家已确认内容、事业边界和路由不变。
- 工作之家、订单、采购、库存等执行型页面不套用出版母版。
- Backend无变更，不需重新部署Cloud Run。
