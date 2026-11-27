# 选品编号与商品溯源 V2

状态：已确认产品规则；工程验收中（2026-11-27）。取代V1对新增选品的xp规则，历史编号永久保留。

- 新编号：ERP原始选品员工前缀 + 东京创建日期YYMMDD + 001–999个人日流水。
- 前缀缺失时拒绝新增，提示管理员补齐。禁止推测或使用测试前缀。
- 原始来源用ERP Employee ID关联；会员号用于登录业务标识，姓名/前缀不充当稳定外键。
- 编号分配历史独立保存，不随选品删除、放弃、分配或转交而删除。
- 同一员工/日期及前缀/日期事务锁防并发冲突；选品UUID保证重试复用。
- 新增入口统一调用selection-number-service；历史选品无编号不在启动时擅自补号。
- Drive后台导入必须明确指定已核实的AIONE_IMPORT_MEMBER_ID；缺失时不创建无来源选品。不从目录名称推测员工。
- 正式商品货号与SKU算法不变；已有xp记录不改号。

## 字段与路径

|含义|AIONE|ERP|
|---|---|---|
|选品UUID|product_opportunities.id|Item.custom_miwa_selection_id（复用）|
|选品编号|selection_no|Item.custom_miwa_selection_no|
|选品日期|selection_date|Item.custom_miwa_selection_date|
|原始员工|selector_employee_id|Item.custom_miwa_selector_employee → Employee|
|当前负责人|owner_employee_id|Item.custom_miwa_owner_employee → Employee|
|登录会员关联|created_by_person_id / owner_person_id|Employee.custom_miwa_member_id（复用）|
|正式货号|workspace.data.item_code|Item.item_code（复用）|
|SKU归属|ERP建档回执|Item.variant_of（复用）|
|平台SKU映射|不新建|MIWA Platform SKU.item（复用）|

平台订单→已有平台SKU映射→ERP Item SKU→variant_of主商品→custom_miwa_selection_id及原始Employee。
不新增订单接口、绩效计算或权限系统。

## 发布与回退要求

先数据库备份、增量迁移0204及ERP增量字段，再候选后端和前端验收后切换。新字段与分配账本保留，回退代码不得覆盖数据库或删除期间新业务。正式发布和实际浏览器结果另记验收记录。
