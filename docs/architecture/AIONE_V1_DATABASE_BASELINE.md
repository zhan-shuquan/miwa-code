# AIONE V1 数据库基线｜CURRENT Candidate

状态：CURRENT Candidate / 待首次真实闭环验证
日期：2026-09-09
适用：美和AIONE一体化工作平台

## 1. 建设原则

AIONE V1 数据库从干净业务基线重新开始，不继承旧选品工作台、旧商品机会表、旧业务数据和旧 Migration 历史。

保留并继续使用：Cloud SQL 实例、Cloud Run、Secret Manager、Google 登录、Google Drive、OpenAI API、乐天既有 API/图片 API 等已经验证成功的外部集成能力。

数据库设计必须遵循：12之家 -> 中心 -> 业务对象 -> 字段/关系 -> 数据库实现。页面/View 不得反向制造第二套业务对象。

## 2. 第一条真实业务闭环

1688 Excel -> 自动解析 -> AI筛选 -> 选品一览 -> 选品通过 -> Product -> SKU -> AI设计 -> Product Asset -> Listing -> 乐天上架

前台统一使用“选品”业务语言；机器对象使用 ProductOpportunity 表达“尚未成为正式 Product 的候选商品”。

## 3. 首批对象归属

### 03 工作之家
- WorkItem：真实工作事项。

### 04 人才之家
- Person：公司人员。
- PersonExternalLocation：人员与 Google Drive 等外部工作位置的绑定。

### 06 商品之家
- 选品中心：ProductOpportunity、SelectionImport。
- 商品中心：Product。
- SKU中心：SKU。
- 分类中心：Category。
- 品牌中心：Brand。
- 属性中心：AttributeDefinition；第一阶段 SKU 具体属性值允许以受控 JSONB 存储，待真实业务验证后再拆独立值表。
- 资料管理/AI设计产出：ProductAsset。
- 上架中心：Listing。

### 07 往来之家
- Counterparty 暂不进入第一批强制表。1688供应商原始资料先保存在选品来源快照；当供应商进入真实采购/合作关系时，再进入往来之家统一 Counterparty 主档。

### 08 渠道之家
- Platform：外部平台，例如楽天。
- Store：美和在平台上的具体店铺实例，例如永井GD。

## 4. 第一批正式表

1. people
2. person_external_locations
3. work_items
4. selection_imports
5. product_opportunities
6. categories
7. brands
8. attribute_definitions
9. products
10. product_skus
11. product_assets
12. platforms
13. stores
14. listings

第一阶段不因页面需要额外复制表。我的选品、已通过、已淘汰、待判断等均为 product_opportunities 的 View / Scope。

## 5. 关键对象边界

- ProductOpportunity != Product：通过选品后才创建 Product，并保留 source_opportunity_id 追溯。
- Product 1:N SKU；SKU 不因店铺不同重复创建。
- Listing 归商品之家，上架时引用渠道之家的 Platform / Store。
- Platform = 外部经营平台；Store = 美和具体店铺/账号实例；一个 Platform 可有多个 Store。
- AI设计是商品资料生成能力，不建立第二套商品主数据；生成结果进入 ProductAsset。
- 外部 API 凭据不进入业务表，继续由 Secret Manager / Integration Service 管理。

## 6. 数据重置边界

允许删除并重建 Cloud SQL 中业务数据库 `aione` 的业务内容，因为当前无必须保留的正式业务数据；基础表格原始数据由用户本地/Google Drive保留。

不得删除：
- PostgreSQL 系统数据库 `postgres`
- Cloud SQL 实例 `aione-postgres`
- Secret Manager secrets
- OpenAI / Rakuten / Google 已验证集成凭据
- Cloud Run / Google Drive 外部资源

## 7. Migration 治理

新基线从 `0001_aione_current_baseline.sql` 开始。
旧 `data-code/migrations` 视为 Legacy/Deprecated，不再用于新数据库重建；验证完成后再决定物理删除或移动归档。

从 V1 基线开始，数据库 Migration 编号必须唯一、连续可追踪，Repo 为唯一技术事实源。
