# AIONE Current Tests

本目录只保留当前 AIONE 基线仍有价值的验证脚本。

## 当前原则

- `main` 只验证当前业务规则、当前架构和当前运行能力。
- 已废止页面、旧UI规则、旧版本迁移过程和历史兼容层不再保留专门测试。
- `tests/legacy/` 已删除；历史追溯统一交给 Git。
- 仍然保护真实 API、数据库、Cloud Runtime、AI Layer、Header、Sidebar、对象模型、字段标准和业务闭环等当前能力。
- 文件名中仍带 `v1.x` 的测试，如果验证的是当前有效能力，暂时保留；后续逐步改为稳定能力名称，而不是为了去版本号直接删除有效测试。

## 9 工作台基线保护

运行：

```bash
node tests/verify-crossborder-workbench-registry.mjs
```

该测试锁定美和跨境当前 9 工作台：

1. 选品工作台
2. 测样工作台
3. 采购工作台
4. 设计工作台
5. 上架工作台
6. 运营工作台
7. 订单工作台
8. 库存工作台
9. 客服工作台

同时检查：

- `business-navigation.js` 与 `route-registry.js` 的工作台 ID / 名称一致；
- 9 个入口保持 `workbench` 类型；
- 已废止名称不得重新进入 Route Registry：
  - 视觉设计工作台
  - 上架发布工作台
  - 运营推广工作台
  - 订单与库存工作台
  - 客服与售后工作台

## 当前仍应保留的能力测试

以下类型只要仍保护真实运行能力，就不因版本号较旧而直接删除：

- 1688 OAuth / API Bridge
- Cloud Data Runtime
- Database / Backend
- Field Registry / 字段标准
- Route Integrity
- Global Header / Sidebar / Aside
- 美和AI Layer / AI Backend / Tool Layer
- 当前业务之家、内容出版与电子资料能力
- 当前对象模型、工作事项和业务闭环

清理判断标准不是“文件老不老”，而是：**它验证的能力现在还存在不存在。**

如果验证的是已废止实现，删除；如果验证的是当前能力，保留并逐步改成长期稳定命名。
