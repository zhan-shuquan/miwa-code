# AIONE Product Asset Intake V1｜Product Freeze

状态：CURRENT FREEZE
日期：2026-09-10
适用项目：美和AIONE一体化工作平台

## 1. 本阶段目标

把已经通过选品并形成正式 Product 的 1688 原始素材，从 Google Drive 提交区自动接管为 AIONE 正式商品素材。

V1 只解决一件事：

```text
1688 ZIP Source Evidence
-> AIONE临时解包
-> 文件识别与校验
-> GCS SOURCE资产
-> Cloud SQL ProductAsset记录
-> Product关联
```

本阶段不生成AI销售图、不做乐天R-Cabinet发布、不计算最终成本、不设计前端页面。

## 2. 唯一真实验收对象

V1 首个真实验收对象固定为：

- source platform: `1688`
- source ref: `855305580969`
- formal Product code: `MH0000002`
- Product 生命周期：`draft`
- ProductOpportunity 生命周期：`converted`

不得为素材处理创建第二个 Product 或第二个 ProductOpportunity。

## 3. 来源与存储职责

### Google Drive

角色：提交入口 / 原始运输 / Source Evidence。

CURRENT Inbox：

`共享云盘 / 美和集团（全球） / 06_商品之家 / 06_01_选品中心 / 01_1688选品提交`

V1 从 ProductOpportunity `metadata.sourceMaterialZip` 解析唯一 ZIP 证据，不要求员工重新命名、解压或整理目录。

### GCS

角色：AIONE 正式机器可读商品资产存储。

V1 必须通过统一环境变量 `AIONE_PRODUCT_ASSET_BUCKET` 指向唯一 CURRENT 商品资产 Bucket。物理 Bucket 在部署前由基础设施流程创建并验证，不允许代码硬编码另一个 Bucket 名称。

对象路径规则：

```text
source/1688/{sourceRef}/{sha256}/{relativePath}
```

原文件名保留在 metadata 中；GCS object key 负责稳定寻址，不依赖中文文件名作为业务主键。

### Cloud SQL

角色：资产事实、关系、状态与审计。

不把图片/视频二进制存入数据库。

## 4. ZIP处理规则

ZIP 是运输容器，不是正式商品目录。

处理顺序：

1. 通过 ProductOpportunity 找到 `sourceMaterialZip`。
2. 从 Drive 按 fileId 下载 ZIP。
3. 计算 ZIP SHA-256。
4. 在 Cloud Run Job 临时目录解包。
5. 防止 Zip Slip：所有 entry 必须落在临时根目录内。
6. 拒绝符号链接、绝对路径、父级越界路径。
7. 对每个文件计算 SHA-256、大小、MIME、相对路径。
8. 识别官方助手目录角色。
9. 上传 GCS SOURCE 层。
10. 写入/更新 ProductAsset 记录。
11. 验证完成后删除本地临时文件。

不得把临时解包目录作为长期存储。

## 5. 1688官方助手目录映射

CURRENT 已确认目录：

```text
sku图片 -> source_sku_image
主图    -> source_main_image
视频    -> source_video
详情    -> source_detail_image
```

未知目录或根目录散落文件不直接丢弃，统一记录为：

```text
source_other
```

并保留原始相对路径，后续人工/AI可重新分类。

## 6. Asset层级

AIONE 商品素材长期统一三层：

```text
SOURCE    原始来源资产
DERIVED   确定性处理/AI加工资产
PUBLISHED 实际渠道发布资产
```

本 V1 只写 `SOURCE`。

SOURCE 资产不可被后续设计图覆盖；后续加工必须生成新的 Asset 关系。

## 7. ProductAsset V1字段契约

沿用 CURRENT `product_assets` 对象，不创建第二套 MediaAsset 表。

V1 至少写入/维护：

- `product_id`
- `asset_no`
- `asset_type`: image / video / other
- `asset_role`: source_main_image / source_sku_image / source_detail_image / source_video / source_other
- `source_provider`: `1688`
- `source_ref`: `855305580969`
- `source_url`: 原始1688商品URL或空，不用Drive URL冒充商品URL
- `original_name`
- `canonical_name`
- `mime_type`
- `lifecycle_status`: `formalized`
- `metadata.layer`: `SOURCE`
- `metadata.driveFileId`
- `metadata.sourceZipName`
- `metadata.sourceZipSha256`
- `metadata.relativePath`
- `metadata.fileSha256`
- `metadata.byteSize`
- `metadata.gcsBucket`
- `metadata.gcsObject`

V1 `canonical_name` 保持 CURRENT ProductAsset 命名能力；SOURCE原始文件身份以 hash + relativePath + sourceRef 识别，不依赖 asset_no 去重。

## 8. 去重与幂等

同一个来源文件的稳定身份：

```text
source_provider + source_ref + sourceZipSha256 + relativePath + fileSha256
```

重复运行必须：

- 不重复上传相同 GCS 对象；
- 不产生重复 ProductAsset；
- 不改变已有 Product ID；
- 不改变 ProductOpportunity 生命周期；
- 不覆盖 DERIVED / PUBLISHED 资产；
- 可补齐缺失 metadata，但不得用空值覆盖已有事实。

## 9. 图片与视频最低校验

V1 在正式登记前至少检查：

- 文件非空；
- MIME/扩展名基本一致；
- 文件大小可读取；
- SHA-256 可计算；
- 图片可解析基本宽高时记录宽高；
- 视频至少识别为视频类型；
- 不允许目录 entry 被登记成 Asset。

V1 不因图片审美质量阻断 SOURCE 入库。SOURCE 层负责保存事实，质量判断留给 DERIVED 生产阶段。

## 10. 错误与事务边界

单个 ZIP 对一个 Product 的 formalization 是一次逻辑批次。

- Drive 下载失败：整个批次失败，不写“完成”。
- ZIP 不可解析或存在路径攻击：整个批次失败。
- GCS 上传失败：批次失败，保留可审计错误；已经存在的相同 hash 对象可复用。
- DB 登记失败：批次失败；下一次允许幂等重试。
- 部分未知目录：不失败，进入 `source_other`。

不得为了让验收通过而直接手工修改 ProductAsset 数据。

## 11. 执行形态

V1 采用确定性 Cloud Run Job，不使用 Agent。

建议正式 Job：

```text
AIONE Product Asset Intake Job
```

Job 从 CURRENT backend immutable image 运行，连接唯一 CURRENT Cloud SQL，并使用 runtime service account 读取 Drive、写入指定 GCS Bucket。

不得创建第二套 backend service 或第二套数据库。

## 12. 审计事件

至少记录：

```text
product.source_assets_formalized
```

payload 至少包含：

- productId
- productCode
- sourcePlatform
- sourceRef
- sourceZipSha256
- assetCount
- imageCount
- videoCount
- otherCount

重复无变化执行可记录 reused 结果，但不得产生重复业务对象。

## 13. V1验收标准

只有以下全部成立才可判定 Product Asset Intake Backend Closure V1 PASS：

1. `MH0000002` 仍是唯一正式 Product。
2. 读取的 ZIP 必须来自 `855305580969` 的真实 Drive evidence。
3. ZIP SHA-256 被记录。
4. 官方四类目录能够被识别。
5. 至少一个真实 SOURCE 文件进入 GCS。
6. 每个入库 Asset 能追溯到 ZIP、相对路径与文件 hash。
7. Cloud SQL ProductAsset 与 `MH0000002` 正确关联。
8. GCS object 存在且大小与记录一致。
9. 重复执行不增加重复 Asset 数量。
10. ProductOpportunity 保持 `converted`，Product 保持 `draft`。
11. 不创建第二套运行基线。
12. 自动验收输出明确 PASS marker。

## 14. 明确不在V1范围

- AI生成主图/详情图
- 抠图、白底、裁切、压缩优化
- Category Image Recipe生产
- SKU真实变体建模
- Approved Copy
- 乐天R-Cabinet上传
- 渠道发布
- 最终成本与售价
- 前端素材管理页面

这些能力必须在 SOURCE 素材底座通过真实验收后再继续。

## 15. 工程结论

本 Product Freeze 将“素材正式化”定义为平台级 Asset 能力，而不是某个页面的图片上传功能。

实现顺序锁定为：

```text
Product Freeze
-> GCS CURRENT storage contract
-> deterministic intake service
-> Cloud Run Job
-> real 1688 ZIP acceptance
-> idempotency acceptance
-> merge main / LOCK
```

任何实现不得绕过 `ProductOpportunity -> Product -> ProductAsset` 的统一对象关系。
