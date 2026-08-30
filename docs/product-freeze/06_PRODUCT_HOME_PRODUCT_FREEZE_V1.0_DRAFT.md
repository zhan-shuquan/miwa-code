# 06｜商品之家 Product Freeze V1.0 Draft

状态：Draft / 待冻结
适用：美和AIONE一体化工作平台（AIONE）

## 1. 定位
商品之家是AIONE统一的商品主数据与库存事实源，负责承载“卖什么、有哪些SKU、库存在哪里、有哪些分类/品牌/属性、如何上架”的核心商品对象与关系。

商品之家不等于选品工作台、采购工作台或渠道系统。各业务流程可引用Product / SKU / Inventory等对象，但不得复制第二套商品主数据。

## 2. 目录与层级
- 06_00_概览
- 06_01_商品中心
- 06_02_SKU中心
- 06_03_库存中心
- 06_04_分类中心
- 06_05_品牌中心
- 06_06_属性中心
- 06_07_上架中心
- 06_90_商品资料管理

原则：取消独立规格中心，规格统一归入属性中心管理；导航上Product与SKU可以并列，但数据关系必须保持Product 1:N SKU。

## 3. 核心业务对象
- Product：商品主对象
- SKU：可交易/库存最小单元
- InventoryRecord：库存事实记录
- InventoryLocation：库存地点
- Category：分类对象
- Brand：品牌对象
- AttributeDefinition / AttributeValue：属性定义与属性值
- Listing：渠道/店铺上架记录
- ProductAsset：商品图片、视频、说明书等资料引用

## 4. 唯一事实源
商品、SKU、库存、分类、品牌、属性、上架映射的正式事实统一由商品之家维护。

不重复维护：
- 供应商主体 → 往来之家
- 采购工作 → 工作之家/对应业务流程
- 销售渠道主体 → 渠道之家
- 财务成本/付款事实 → 财务之家
- 销售分析 → 分析之家

其他之家通过Reference / View / Scope使用商品事实。

## 5. Product与SKU关系
Product = 面向业务与用户理解的商品主对象。
SKU = 具体可售、可库存、可计价、可履约的变体。

规则：
- 一个Product可有多个SKU。
- SKU必须归属一个Product。
- SKU不因不同渠道重复创建；渠道差异通过Listing表达。
- 颜色、尺寸、材质等变体通过属性定义，不通过页面硬编码字段。

## 6. 库存模型
库存事实至少包含：sku_id、location_id、on_hand、available、reserved、in_transit、damaged/blocked、safety_stock、updated_at。

库存中心以SKU为核心维度，不建立第二套“商品库存”对象。

可计算字段如可售库存、缺货、低库存、库存天数等由系统计算，不要求人工重复录入。

## 7. 分类 / 品牌 / 属性
分类、品牌、属性都是独立可复用对象，不嵌死在商品页面中。

属性中心统一管理：颜色、尺寸、材质、季节、适用人群、风格、功能、规格等稳定属性定义。

属性应支持：数据类型、单位、可选值、是否必填、适用分类、是否可作为SKU变体、是否可搜索/筛选、是否参与AI理解。

## 8. 上架中心
上架中心负责Product/SKU到渠道/店铺的发布关系和字段映射，不复制商品主数据。

Listing至少包含：product_id、sku_id、channel_id/store_id、external_listing_id、listing_status、publish_fields、mapping_version、last_sync_at、error_state。

平台字段差异、标题模板、类目映射、图片规则等通过配置管理。

## 9. Page Type映射
- 06_00_概览 → PT-01 Overview Page
- 商品/SKU/库存/品牌/属性/上架列表 → PT-02 Object List Page
- 单个Product / SKU → PT-03 Object Workspace
- 上架流程需要阶段推进时 → PT-04 Workflow Page
- 商品/库存分析 → PT-05 Analytics Dashboard或分析之家
- 分类/属性/品牌配置 → PT-06 Configuration Page
- 外部渠道字段映射/同步 → PT-08 Integration Page
- 商品资料管理 → PT-02 Object List + File & Asset

## 10. View / Scope
Product Scope：全部、事业、品牌、分类、状态、负责人、来源等。
SKU Scope：商品、属性组合、库存状态、上架状态等。
Inventory Scope：仓库/地点、可售、缺货、低库存、在途、冻结等。
Listing Scope：渠道、店铺、状态、错误、待发布、已发布等。

View / Scope只改变呈现，不复制对象。

## 11. Product默认字段
id/code、name、status、brand_id、category_id、owner、business_scope、description、attribute_refs、default_image_ref、tags、created_at、updated_at、version。

SKU默认字段：id/code、product_id、sku_code、barcode、variant_attributes、status、cost_ref、weight、dimensions、inventory_summary、created_at、updated_at。

字段必须通过统一Schema/Contract维护，不允许Mock、前端、API、数据库长期各自演化。

## 12. 默认操作
创建、查看、编辑、复制、生成SKU、维护属性、上传资料、调整状态、关联品牌/分类、查看库存、发起上架、归档、删除、恢复、查看历史。

库存操作另支持入库、出库、调整、盘点、冻结/解冻等，但必须通过Domain/Service层和Audit处理，不允许页面直接改库存数字。

## 13. 批量操作
支持：当前页全选、全部选择筛选结果、全部取消、批量编辑、批量品牌/分类、批量属性、批量负责人、批量状态、批量导入、批量导出、批量上架、批量归档、批量删除、批量恢复。

批量导入使用统一Import Engine；导入后先校验、预览再写入。

## 14. 状态
Product建议：DRAFT、ACTIVE、PAUSED、ARCHIVED、DEPRECATED、DELETED。
SKU建议：ACTIVE、PAUSED、OUT_OF_STOCK、ARCHIVED、DELETED。
Listing建议：DRAFT、READY、PUBLISHING、PUBLISHED、FAILED、PAUSED、DELISTED。

状态必须由机器identity驱动，显示标签通过i18n转换。

## 15. 权限
至少支持Role、Scope、Object、Field、Action Permission。

高风险操作包括：库存调整、成本字段、永久删除、批量上架、外部渠道同步、价格/成本相关字段修改，必须单独授权并Audit。

## 16. AI与自动化
AI适合：商品资料补全、属性识别、图片/文本分类、标题/卖点草稿、上架字段建议、重复商品检测、异常库存提示。

确定性能力优先：SKU编码规则、库存计算、属性校验、类目映射规则、必填字段校验、上架状态同步。

所有AI调用统一经过AIONE AI Gateway。

## 17. 商品闭环
商品机会/企划 → Product建立 → SKU生成 → 属性完善 → 采购/入库 → Inventory形成 → Listing映射 → 渠道发布 → 销售结果 → 分析 → 优化。

其中采购、销售、财务、工作等事实仍由对应Domain维护，商品之家通过引用构成闭环。

## 18. 资料管理
商品图片、视频、说明书、检测报告、包装资料等使用统一File & Asset能力，并通过Product/SKU引用。

不得按页面复制多份同一商品资料；版本更新需要可追踪。

## 19. 异常治理
必须处理：重复Product、重复SKU、SKU无Product、属性定义重复、同一字段多套命名、库存负数/异常、库存直接被页面改写、渠道上架复制商品主数据、同一商品因店铺不同建多份、Listing映射版本失控、商品资料重复且无法判断CURRENT。

## 20. 验收标准
1. Product与SKU关系唯一且清晰，保持Product 1:N SKU。
2. SKU不因渠道不同重复建模，渠道差异通过Listing表达。
3. 库存事实以SKU+Location为核心，库存变更可审计。
4. 分类、品牌、属性为独立可复用对象。
5. 规格统一归入属性中心，不建立第二套规格体系。
6. 商品资料通过统一File & Asset能力管理。
7. 批量导入/导出/上架复用平台能力。
8. AI只负责辅助理解和生成，确定性规则由Domain/API/Rule处理。
9. 前端/API/DB/Mock遵守统一Contract。
10. 当前文档定义Product/Architecture Truth，不自动声明main已实现。

## 21. 当前冻结判断
当前建议状态：Draft / 待横向Review。待12之家完成后统一Review，再决定是否升为CURRENT V1.0。
