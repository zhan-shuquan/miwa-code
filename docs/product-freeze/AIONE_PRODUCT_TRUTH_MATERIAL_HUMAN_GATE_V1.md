# AIONE Product Truth & Material Human Gate V1

Status: CURRENT Product Freeze
Date: 2026-09-11
Applies to: 美和AIONE一体化工作平台 product selection -> design -> listing flow

## Locked principles

- 人工定义商品，AI完成商品化。
- AI可以辅助判断，但不得越过商品事实确认。
- 商品最终销售SKU与有效SOURCE素材必须由人工确认。
- Google Drive从人工确认好的素材开始作为AIONE系统输入。
- AIONE不重复开发1688图片下载能力，也不保存人工淘汰的原始图片。
- 人工完成素材确认后，系统才能进入AI商品分析、AI设计、上架资料生成等自动化。

## Human / System boundary

Human work before AIONE automation:
1. 人工选品。
2. 使用1688官方一键下载。
3. 人工确认最终销售SKU/组合。
4. 人工筛选可作为商品事实依据的有效图片。
5. 上传Google Drive标准素材目录。
6. 点击“素材确认 / 开始AI设计”。

System work after Human Gate:
1. SOURCE素材接入与技术校验。
2. 商品事实提取；无法证明的事实标记待人工补充。
3. SKU/颜色理解、卖点分析、日本市场定位。
4. 乐天关键词/商品名、详情页结构、15图方案与Prompt。
5. AI图片生成、版本管理、DERIVED/FINAL资产管理。
6. 渠道上架资料生成。
7. 人工最终验收后发布。

## Google Drive input contract

Each Product accepts only the following business folders as curated input:

- `01_SKU图` - required. Visual evidence for the final confirmed sales SKU / combination.
- `02_产品图` - required. Human-curated supplier product material including main, white-background, color, detail, construction, material and benefit evidence. No further manual sub-classification is required.
- `03_实拍图` - optional. MIWA-owned real photography; may be empty for a new Product.

Original file names should be retained where practical. AI may use filename + visual content for semantic understanding. Humans are not required to rename every file.

## Product / SKU truth

- `product_skus` represents MIWA sales SKUs, not a copy of supplier SKUs.
- Supplier SKUs remain SOURCE facts.
- Creating draft SKU records does not mean the final sales SKU set has been confirmed.
- A confirmed material snapshot must include the exact current MIWA sales SKU snapshot.

## Human Gate

Backend object: `product_material_confirmations`.

Persistent status is intentionally minimal:
- `pending`
- `confirmed`
- `invalidated`

A confirmed snapshot binds:
- Product
- final sales SKU snapshot
- curated SOURCE ProductAsset IDs
- snapshot hash
- confirming Person and timestamp

If SKU or confirmed SOURCE material changes after confirmation, the confirmation must be invalidated and a new version confirmed before creating new production DesignTasks.

## AI readiness rule

Production AI design is allowed only when all conditions are true:

- at least one active MIWA sales SKU is included in the human-confirmed SKU snapshot;
- at least one confirmed `01_SKU图` SOURCE asset exists;
- at least one confirmed `02_产品图` SOURCE asset exists;
- all confirmed assets belong to the Product and are canonical SOURCE assets;
- the current `product_material_confirmation` status is `confirmed`.

`03_实拍图` is optional and never blocks a new Product from starting AI design.

## Facts rule

For size, material, quantity, color, function, weight, origin, certifications and similar product facts:
- confirmed evidence -> `confirmedFacts`;
- AI interpretation with evidence but not human-confirmed -> `inferredFacts`;
- insufficient evidence -> `missingFacts` / 待人工补充.

AI must not invent missing facts.

## Existing capabilities retained

Keep and reuse:
- ProductOpportunity
- Product
- ProductSKU
- ProductAsset
- Google Drive integration
- GCS
- SOURCE / DERIVED / FINAL asset layering
- DesignTemplate
- DesignTask
- AI Gateway / provider
- AI Execution
- provenance
- final human review

Do not rebuild the existing DesignTask -> AI -> DERIVED -> final human review chain.

## Deprecated CURRENT assumptions

The following assumptions are no longer CURRENT business truth:
- 1688 raw ZIP as the primary AIONE product-material input;
- AIONE automatically deciding final usable product material from supplier raw folders;
- supplier `主图 / sku图片 / 详情 / 视频` folder structure as the long-term product material contract;
- `SOURCE exists` being sufficient for AI design readiness;
- draft `skuCount` being equivalent to human-confirmed final sales SKU.

Legacy code may remain temporarily for historical compatibility, but must not remain the CURRENT forward workflow.
