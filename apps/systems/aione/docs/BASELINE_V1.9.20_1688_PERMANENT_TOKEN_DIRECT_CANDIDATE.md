# AIONE V1.9.20｜1688永久Token直连候选基线

## 结论

真实1688开放平台截图确认当前应用为企业自用、多用户授权模式；已确认主账号可直接取得永久有效 Access Token。正常AIONE业务链路不再要求员工执行OAuth授权。

## 正式候选链路

1688 AppKey + AppSecret + 已授权 Access Token（Backend only） → 1688 Open Platform 商品详情 API → AIONE Source Facts → 选品字段 → 美和AI。

## 安全规则

- AppSecret 与 Access Token 仅进入Backend进程内存；启动器使用隐藏输入。
- 不写入前端、ZIP明文配置或浏览器LocalStorage。
- 正式Cloud Run部署时迁移至Google Secret Manager。

## 前台原则

员工仅执行：粘贴1688商品链接 → 读取并自动填充 → 美和AI分析。
AI人才、岗位、模型、Token、OAuth均不作为日常业务选择项。

## 状态

候选验证中。需要用真实AppKey/AppSecret/永久Access Token完成第一次商品详情API响应后再锁定。
