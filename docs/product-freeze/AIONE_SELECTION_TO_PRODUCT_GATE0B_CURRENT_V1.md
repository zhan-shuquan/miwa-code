# AIONE Selection → Product Gate 0B｜CURRENT Product Freeze V1

状态：VALIDATING / conversion blocked until SKU evidence is resolved  
日期：2026-09-17  
适用范围：美和AIONE一体化工作平台｜商品之家｜选品中心 → 商品中心

## 1. 已锁定 Product Truth

1. Selection / 商品机会是商品生命周期入口，不是 Product。
2. Gate 0A 导入只允许创建或更新 Selection，不创建 Product，也不创建 SKU。
3. Selection 通过后才能进入正式 Product 转换阶段。
4. Product / SKU 编码必须由系统生成，不允许前端硬编码。
5. 同一 Selection 重试转换不得生成第二个 Product；正式转换必须幂等。
6. 最终 Gate 0B 必须是一个原子业务操作：决策、Product 创建、真实 SKU 建立、Selection converted 状态、对象注册与事件记录要么全部成功，要么全部失败。
7. 前端不得使用 `select → convert` 两次独立请求冒充一个业务事务。
8. 前端不得传入固定 `skuCount: 1` 生成占位 SKU。

## 2. 当前实现证据

CURRENT Selection intake 当前能够稳定提供：

- Selection ID / Selection Code
- 商品标题
- 1688 sourceRef / sourceUrl
- 来源平台
- 代表图链接（如 Excel 有）
- 来源价格
- 供应商 / 分组 / 标签 / 备注
- 可选重量提示
- 选品方式（直发 / 常规）
- 本地素材 manifest：文件名、相对路径、文件大小、识别角色（SKU图 / 详情图 / 白底图 / 主图 / 实拍图 / 其他）

当前 intake **没有结构化保存供应商真实规格组合 / variant / source SKU ID / 颜色规格映射 / 尺码规格映射**。

因此：

> 素材目录里出现 5 张“SKU图”，只能证明存在 5 张被命名/识别为 SKU 图的图片，不能证明正式业务上存在 5 个可销售 SKU。

同理：

> 没有结构化规格证据时，系统不能推断 `skuCount`，也不能为了让链路继续而生成 1 个占位 SKU。

## 3. Gate 0B 当前阻断条件

在以下任一条件满足前，CURRENT 不提供真实“通过选品并创建 Product + SKU”按钮：

A. Selection 来源数据已经具有可验证的真实供应商 SKU / 规格组合；或  
B. AIONE 增加一个明确的“规格确认”步骤，由人工确认正式销售 SKU 事实。

在此之前，历史测试产生的 Product / SKU 只可作为验证证据，不自动升级为 CURRENT 产品规则。

## 4. 待冻结决策

需要在真实业务测试中确认最终采用哪一种长期方式：

### 路径 A｜来源规格自动继承

1688 / 供应商数据若能够稳定提供真实 variant / source SKU，则：

Selection → 人工通过 → 系统校验真实规格 → 原子创建 Product + genuine SKU(s) → Selection converted

适用于来源结构稳定、规格数据可信的场景。

### 路径 B｜AIONE 规格确认

若来源数据不能稳定提供真实 SKU，则：

Selection → 人工通过 → 规格确认 → 原子创建 Product + genuine SKU(s) → Selection converted

规格确认只补充“销售所需的真实规格事实”，不得演变成复杂审批流程。

## 5. 禁止方案

以下实现进入 Deprecated，不得重新进入 CURRENT：

- `POST /select` 成功后再单独 `POST /convert`
- 前端固定 `{ skuCount: 1 }`
- 根据 SKU 图片数量自动推断 SKU 数
- 根据颜色图数量自动推断 SKU 数
- 为了满足数据库关系而制造临时 SKU
- 用历史 `MH0000002`、`MH0000003` 或其他测试对象反推长期产品定义

## 6. Gate 0B 验收标准

只有同时满足以下条件才能解除 Gate 0B 阻断：

- 真实 SKU evidence 来源明确
- 一个业务事务完成 Selection → Product → SKU
- 失败能够完整 rollback
- retry 幂等，只返回同一 Product
- Selection list 能通过 canonical JOIN 返回真实 converted Product
- 成功响应返回 productId / productCode
- 前端成功后动态进入该 Product Workspace
- 无硬编码 Product Code / SKU Code / skuCount
- 自动化测试覆盖 success / retry / rollback / missing-SKU-evidence
- Preview 真实验收一次通过后才允许进入稳定基线

## 7. Governance

本文只冻结已经有证据支持的边界与禁止项。

“来源规格自动继承”还是“AIONE 规格确认”目前仍为 VALIDATING；在真实 1688 SKU 数据审计完成前，不擅自锁定其中一种为最终方案。
