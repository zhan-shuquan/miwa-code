# AIONE Product Freeze Drafts Deprecated Register

状态：Governance Register
日期：2026-08-31

## 1. 目的
本文件明确AIONE 12之家Product Freeze旧Draft的治理状态，避免Draft、Review、Overrides、RC长期并存造成第二套正式定义。

## 2. 当前唯一RC事实源
`docs/product-freeze/AIONE_12_HOME_PRODUCT_FREEZE_V1.0_RC.md`

在用户确认CURRENT V1.0之前，上述文件是Repo中唯一RC事实源。

## 3. 降级为历史工作稿的文件
以下文件从本登记生效后仅作为历史工作稿、Review输入和变更追溯证据，不再承担当前正式Product/Architecture定义：

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
以下文件继续保留作为RC形成过程的治理证据，但不是最终事实源：

- 00_AIONE_12_HOME_FINAL_REVIEW_OVERRIDES_V1.0_RC_CANDIDATE.md
- 00_AIONE_12_HOME_DOCUMENT_CONSISTENCY_CHECK_V1.0_RC_CANDIDATE.md

## 5. 使用规则
- 新的Product/Architecture判断优先读取唯一RC事实源。
- Technical Design不得直接以旧Draft作为输入；若旧Draft与RC冲突，以RC为准。
- Implementation Truth必须通过main代码/Schema/API实际审计获得，不得由RC反推。
- 用户确认CURRENT后，应将RC文件升级为CURRENT命名/状态，并继续保留本登记作为历史治理记录。

## 6. main边界
本治理发生在`docs/aione-platform-foundation-v1-draft`分支；main未因本次Product Freeze治理自动修改。
