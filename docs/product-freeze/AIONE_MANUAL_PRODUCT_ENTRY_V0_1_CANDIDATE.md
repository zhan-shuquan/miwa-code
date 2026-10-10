# AIONE 在线单品录入 Product Freeze V0.1（候选）

状态：**VALIDATING / 待员工实物表核对后锁定**  
项目：美和AIONE一体化工作平台（AIONE）  
日期：2026-10-10  
依据：02|AIONE系统 V3.0、Repo 当前实现、2026-10-10 真实 RMS / WPS 测试。

## 1. 产品定位与范围

- **AIONE Product / SKU / ProductAsset** 是唯一长期商品事实源。WPS 是过渡录入及批量导入工具，不再建设第二套永久商品数据库。
- 第一条真实业务闭环：**人工/导入建立商品草稿 → SKU和素材 → GPT辅助生成日本站文案 → 人工确认 → 发布前核验 → Rakuten ItemAPI / InventoryAPI → 回写RMS实测结果**。
- 试点：**zjl238**。仅以真实文件、员工确认资料和RMS真实响应为验收依据。不能从示例图或旧商品推导材质、规格、售价、实际库存、品牌或配送ID。
- 当前阶段不创建新的商品之家导航、第二套图片存储或额外RMS录入表。复用现有商品中心/共享页面类型、ProductAsset/GCS、渠道映射。

## 2. 前台最小输入 / 自动能力

**仅让员工录入业务不能可靠推导的事实；草稿可部分填写，发布前必须补足必要信息。**

| 组别 | 员工输入（候选字段） | 不重复要求填写 |
| --- | --- | --- |
| 商品身份 | 本地货号（例如 zjl238）、中文商品名称、必要时选品牌及实际店铺 | AIONE内部 Product ID、平台固定 Rakuten |
| 采购与物流 | 实际采购价、实际重量、物流方式（海运日本发／空运日本发／空运直发）、已确认发货包装尺寸和包装物 | 固定成本参数、运费/税率/店铺RMS技术ID |
| SKU | SKU实际规格（最多3层）、人工确认的上架SKU、售价与可信可售数量来源 | SKU内部主键、排序序号、业务货号继承 |
| 乐天文案 | 楽天商品名、キャッチコピー、PC用商品説明文、スマートフォン用商品説明文、PC用販売説明文（GPT可辅助，员工核对） | 同一事实不用反复填写；图片URL由系统生成 |
| 素材 | 实际九张正式上架图、白底图、对应的SKU图；原图/最终图来源需明确 | R-Cabinet ID、图片URL、API payload |
| 上架控制 | **自动上架：是／否**，默认**否**；需实际选择店铺时只选择一次 | Genre/必填属性/库存等自动检查的结果行 |

说明：
1. 三个 RMS 商品说明文**独立存储和映射**，不能误合并成一个 API 字段。允许由一份商品事实生成建议稿，但必须分别审核、分别校验 HTML/字数/展示规则。
2. 商品品牌、店铺、分類、JAN 及制造商信息优先引用正式对象或供应商真实资料；没有证据不能编造。只有自动确定不了的分类属性才提示人工补充。
3. 商品素材不得因为 WPS/页面视图不同而复制第二份 Product 或 ProductAsset。
4. 物流选项、包装物、包装成本及 SKU 命名沿用业务已确认共享参数；不得将过时 WPS 列坐标当作 CURRENT。
5. **已售/仓库实存**与**API测试库存**严格区分。禁止把昨天示例的1000件当作实际库存。
6. **12个SKU以上不得自动上架**；不等于已有的商品主档对象不能保存更多潜在规格。

## 3. 关键状态与责任

商品草稿：draft → data-review → publish-ready → publishing → published / publish-failed。状态名称暂为建议，需映射现有 Product / ChannelListing 的正式生命周期；未经 Schema 核验不引入第二套状态表。

- 草稿可保存不完整的业务事实；不因此获得自动上架权。
- 员工确认 **自动上架=是** 只代表授权参加后续发布队列；必须通过分类必填属性、商品真实性、实际RMS店铺、商品图片、价格/库存、API完整性等校验。
- 缺少资料时阻断**该商品**的发布并给出可读错误，不阻断其他商品的草稿导入。
- 首次外部发布、已有商品修改、库存同步是**三种不同操作**，不得用同一 UPSERT 无条件覆盖远端。
- 已创建商品与本地货号必须幂等映射；失败重试先 GET 真实RMS状态。任何结果只有接口/回读证据才标记成功。
- 继续保留 WPS 「08 自动检查」的原下拉**是/否**；后续 WPS→AIONE 映射须由一个版本化 Contract 控制。

## 4. 唯一身份映射

| 业务事实 | 用途 |
| --- | --- |
| AIONE Product ID / Product Code | AIONE唯一内部身份，由后端分配，不能用本地货号直接取代 |
| 本地货号，如 zjl238 | 公司业务货号，作为导入匹配与渠道商品管理编号的候选（需真实店铺检验） |
| AIONE SKU ID / SKU Code | 内部SKU身份及Product归属 |
| Rakuten itemNumber / merchantDefinedSkuId | 乐天渠道标识，由适配器映射，不得污染AIONE主键 |
| ProductAsset ID | 唯一素材事实及溯源，R-Cabinet只保存渠道发布身份 |

## 5. WPS与在线录入遵守相同契约

- 字段具有**稳定 FieldKey**、显示名称、数据类型、校验与来源；Excel单元格坐标不是主契约。
- 在线表单、WPS导入、未来1688来源都进入同一个 Application Service，再映射为 Product / SKU / ProductAsset。
- WPS和在线表单的自动上架开关语义一致，默认为否。
- 对重复货号、有冲突的SKU和改版过的商品采取阻断/显式核对，不自动覆盖既有记录。

## 6. 当前已知缺口 / 正式锁定前的阻断项

1. data-code/current/0001_aione_current_baseline.sql 中的 products 和 product_skus 与 apps/systems/aione/backend/src/services/product-lifecycle-service.js 当前期待的字段不一致。例如CURRENT SQL使用 name_ja/status/metadata，旧服务依赖 name/lifecycle_status/product_data/archived_at；Product SKU也类似。**必须对CURRENT生产数据库做只读 Schema preflight，并明确唯一 CURRENT 路线；不得沿用旧迁移链补丁。**
2. 当前商品之家商品表单部分按钮/输入处于禁用或占位状态，尚未形成员工可直接录入和保存的端到端入口。
3. AIONE目前验收的是单件ProductAsset → R-Cabinet渠道图片发布链，**不等于已接通整个ItemAPI+InventoryAPI商品上架链**。
4. 当前手头无确定的最终WPS完整版本及zjl238采购/包装/SKU/全部图片资料，因此**本文是Product Freeze候选，不是正式锁定**。

## 7. 本轮验收门槛（不得冒称完成）

- [ ] 人工提供当前WPS单品表，映射到FieldKey（不依赖硬编码单元格）。
- [ ] CURRENT生产Schema只读比对通过；API合同与对象模型一致。
- [ ] zjl238在线保存并回读同一Product/SKU，无重复，品牌/价格/重量/配送为已核实事实。
- [ ] 商品素材安全归档到AIONE canonical ProductAsset/GCS并回读。
- [ ] 三个RMS说明文字段分别预览、审核、通过真实API规则校验。
- [ ] 自动上架关闭时仅草稿入库；打开时通过全部校验才允许发布。
- [ ] 永井RMS完成实测ItemAPI、库存写入/回读、发布结果审计。
- [ ] Branch Type Check / Contract Check / Build / Preview及业务验收通过，Review后才可Merge main。

LOCK前必须取得负责人对本候选的确认，更新状态为CURRENT后再扩展其他商品/店铺。
