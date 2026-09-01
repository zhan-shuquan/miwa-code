# AIONE 美和跨境 Navigation Freeze

Status: VALIDATING
Date: 2026-09-01
Scope: 美和跨境 Desktop Sidebar business navigation only
Depends on: AIONE Sidebar V2.0 Shell stable behavior

## 1. Product Truth

美和跨境 Sidebar only expresses the current business navigation inside the current business context.

Header already owns the current business context `美和跨境`, so Desktop Sidebar MUST NOT repeat the business name.

Sidebar navigation labels should use the shortest precise business term. Redundant suffixes such as `工作台` are removed from first-level business labels.

## 2. Locked First-Level Navigation Names

The following first-level names are LOCKED:

1. 选品
2. 测样
3. 采购
4. 设计
5. 上架
6. 运营
7. 订单
8. 库存
9. 客服

Mapping from current implementation:

- 选品工作台 -> 选品
- 测样工作台 -> 测样
- 采购工作台 -> 采购
- 设计工作台 -> 设计
- 上架工作台 -> 上架
- 运营工作台 -> 运营
- 订单工作台 -> 订单
- 库存工作台 -> 库存
- 客服工作台 -> 客服

## 3. Hierarchy Rule

First level = business work area.
Second level = stable business object/view inside that work area.

Sidebar must not contain process steps, transient status, instructions, dashboards duplicated from Main, or action buttons that belong inside a page.

At most one first-level group should normally be expanded at a time.

## 4. Current Second-Level Implementation Snapshot

The following is the CURRENT implementation snapshot from `business-navigation.js`. It is recorded for audit and is NOT automatically Product-Frozen merely because it exists in code.

### 选品

- 全部选品 -> `selection/all`
- 我的选品 -> `selection/mine`
- AI的选品 -> `selection/ai`
- 我的互动 -> `selection/following`

### 测样

- 测样概览 -> `sampling-overview`
- 测样任务 -> `sampling-tasks`
- 待测样商品 -> `sampling-queue`
- 样品管理 -> `sampling-samples`
- 测样报告 -> `sampling-reports`
- 测样记录 -> `sampling-records`

### 采购

- 采购概览 -> `procurement-overview`
- 采购需求 -> `procurement-needs`
- 采购订单 -> `procurement-orders`
- 供应商 -> `procurement-suppliers`
- 采购记录 -> `procurement-records`

### 设计

- 设计概览 -> `design-overview`
- 设计任务 -> `design-tasks`
- 商品素材 -> `design-materials`
- 设计资产 -> `design-assets`
- 设计记录 -> `design-records`

### 上架

- 上架概览 -> `publishing-overview`
- 上架任务 -> `publishing-tasks`
- 商品资料 -> `publishing-products`
- 发布记录 -> `publishing-records`

### 运营

- 运营概览 -> `operations-overview`
- 运营商品 -> `operations-products`
- 运营任务 -> `operations-tasks`
- 活动与推广 -> `operations-campaigns`
- 运营记录 -> `operations-records`

### 订单

- 订单概览 -> `orders-overview`
- 订单列表 -> `orders-list`
- 订单异常 -> `orders-exceptions`
- 订单记录 -> `orders-records`

### 库存

- 库存概览 -> `inventory-overview`
- 库存列表 -> `inventory-list`
- 入出库管理 -> `inventory-movements`
- 盘点管理 -> `inventory-counts`
- 库存记录 -> `inventory-records`

### 客服

- 客服概览 -> `service-overview`
- 客服工单 -> `service-tickets`
- 退换与售后 -> `service-after-sales`
- 客户反馈 -> `service-feedback`
- 客服记录 -> `service-records`

## 5. Important Finding: 直发选品

`直发选品` is NOT present in the current `business-navigation.js` snapshot as a second-level Sidebar entry.

Therefore the earlier symptom “直发选品下级页面打不开” must NOT be treated as a Sidebar animation defect by default.

It requires a separate Route/Product Truth audit to determine whether:

- `直发选品` should be a second-level navigation view under 选品;
- it is a filter/view of the same 商品机会/选品 object;
- it already has a route but is missing from navigation;
- or the route/page has not actually been implemented.

No new `直发选品` route should be invented until this is resolved.

## 6. Route Safety Rule

Navigation rename must not change route IDs or hashes.

For the first implementation, only visible first-level labels change. Existing route contracts remain unchanged.

A separate route audit must verify every current child route before Navigation changes enter main.

## 7. Naming Governance

First-level names above are Product-Frozen.

Second-level names remain `CURRENT implementation / pending individual validation` unless already separately locked by prior Product Freeze.

Do not rename second-level items opportunistically in the same commit merely for visual consistency.

## 8. Implementation Boundary

The Navigation implementation PR may:

- change first-level display labels through the canonical Route/Navigation source
- remove redundant Desktop business-name repetition if not already handled by shared Sidebar logic
- preserve current tree/accordion behavior

It may NOT:

- change Sidebar Shell state behavior
- change route IDs
- add new routes
- add `直发选品` without Route/Product Freeze
- change Main page implementations
- connect 1688 API

## 9. Acceptance Criteria

- Desktop Sidebar shows exactly the nine locked first-level names
- no `工作台` suffix remains on those nine entries
- Header remains the single visible owner of `美和跨境` business context
- existing second-level links still resolve to exactly the same routes
- current-route highlight and accordion ownership remain correct
- Mobile navigation is reviewed separately before inheriting the same label change
- no business page gains a second navigation definition

## 10. Next Sequence

1. Finish Sidebar Shell V2.0 Preview validation
2. Audit current route reachability, especially Selection children
3. Implement locked first-level naming in a separate branch
4. Preview
5. Merge stable naming to main
6. Product-Freeze `直发选品` route/view
7. Then proceed to 1688 API integration
