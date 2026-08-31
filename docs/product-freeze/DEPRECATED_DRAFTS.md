# AIONE Product Freeze Drafts Deprecated Register

状态：Governance Register
日期：2026-08-31

## 1. 目的
本文件明确AIONE 12之家Product Freeze旧Draft、Review证据与旧RC的治理状态，避免Draft、Review、Overrides、RC、CURRENT长期并存造成第二套正式定义。

## 2. 当前唯一CURRENT事实源
`docs/product-freeze/AIONE_12_HOME_PRODUCT_FREEZE_V1.0_CURRENT.md`

自2026-08-31用户明确确认后，上述文件成为Repo中AIONE 12之家Product Freeze V1.0唯一CURRENT事实源。

## 3. 降级为历史工作稿的文件
以下文件仅作为历史工作稿、Review输入和变更追溯证据，不再承担当前正式Product/Architecture定义：

- 01_MIWA_HOME_PRODUCT_FREEZE_V1.0_DRAFT.md
- 02_BUSINESS_HOME_PRODUCT_FREEZE_V1.0_DRAFT.md
- 03_WORK_HOME_PRODUCT_FREEZE_V1.0_DRAFT.md
- 04_TALENT_HOME_PRODUCT_FREEZE_V1.0_DRAFT.md
- 05_AI_HOME_PRODUCT_FREEZE_V1.0_DRAFT.md
- 06_PRODUCT_HOME_PRODUCT_FREEZE_V1.0_DRAFT.md
- 07_COUNTERPARTY_HOME_PRODUCT_FREEZE_V1.0_DRAFT.md
- 08_CHANNEL_HOME_PRODUCT_FREEZE_V1.0_DRAFT.md
- 09_FINANCE_HOME_PRODUCT_FREEZE_V1.0_DRAFT.md
- 10_ANALYTICS_HOME_PRODUCT_FREEZE_V1.0_DRAFT.md
- 11_KNOWLEDGE_HOME_PRODUCT_FREEZE_V1.0_DRAFT.md
- 12_SHARED_HOME_PRODUCT_FREEZE_V1.0_DRAFT.md
- 00_AIONE_12_HOME_HORIZONTAL_REVIEW_V1.0_DRAFT.md

## 4. Review证据文件
以下文件继续保留作为CURRENT形成过程的治理证据，但不是最终事实源：

- 00_AIONE_12_HOME_FINAL_REVIEW_OVERRIDES_V1.0_RC_CANDIDATE.md
- 00_AIONE_12_HOME_DOCUMENT_CONSISTENCY_CHECK_V1.0_RC_CANDIDATE.md

## 5. 已被CURRENT取代的RC文件
`docs/product-freeze/AIONE_12_HOME_PRODUCT_FREEZE_V1.0_RC.md`

该文件已完成历史使命，现作为CURRENT形成前的RC快照保留，不再作为当前开发输入。

## 6. 使用规则
- 新的Product/Architecture判断只以唯一CURRENT事实源为正式基准。
- Technical Design不得直接以旧Draft、Review证据或旧RC作为正式输入；若与CURRENT冲突，以CURRENT为准。
- Implementation Truth必须通过main代码、Schema、API与运行配置实际审计获得，不得由CURRENT反推。
- 后续变更必须采用版本化治理；不得直接修改历史Draft来改变CURRENT事实。

## 7. main边界
本治理目前发生在`docs/aione-platform-foundation-v1-draft`分支；main未因Product Freeze升级CURRENT而自动修改。

只有经过后续Review、PR和明确合并，CURRENT文档才进入main稳定基线。
