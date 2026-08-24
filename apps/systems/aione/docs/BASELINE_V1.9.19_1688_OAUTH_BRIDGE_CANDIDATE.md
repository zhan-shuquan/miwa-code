# AIONE V1.9.19｜1688 OAuth授权桥接候选基线

状态：验证中（Candidate）  
日期：2026-08-24

## 1. 本版目标

补齐V1.9.18真实测试已经确认的唯一缺口：

`AppKey / AppSecret已连接 → 1688账号OAuth授权 → Backend换取Access Token / Refresh Token → 商品详情API → AIONE自动回填`

前台员工仍然不选择模型、AI岗位或技术连接器；只有在当前Backend尚未获得1688账号授权时，选品页面的“读取并自动填充”按钮才临时切换为“授权1688”。

## 2. OAuth接口

Backend新增：

- `GET /api/v1/integrations/1688/oauth/start`
- `GET /api/v1/integrations/1688/oauth/callback`

授权入口使用1688 OAuth授权地址；Callback默认：

`http://127.0.0.1:8080/api/v1/integrations/1688/oauth/callback`

该地址必须与1688开放平台应用后台允许的回调/Redirect URI一致。

## 3. 安全边界

- AppSecret不进入授权URL。
- OAuth `state`使用随机值并在Backend内存校验，防止伪造Callback。
- Authorization Code仅在Backend交换Token。
- Access Token / Refresh Token不返回前端，不写业务页面，不写仓库。
- Candidate本地验证阶段Token仅缓存在当前Backend进程内；关闭Backend后需重新授权。
- 正式部署阶段应迁移到Google Secret Manager或等效秘密管理服务，不把Refresh Token保存在代码仓库。

## 4. 使用流程

1. 启动`START_MIWA_AI_REAL_MODEL.cmd`并输入OpenAI Key、1688 AppKey、AppSecret。
2. 选品页面粘贴1688商品链接，点击“读取并自动填充”。
3. 若账号尚未授权，按钮自动变为“授权1688”。
4. 点击“授权1688”，浏览器打开1688登录/授权页。
5. 授权完成后Callback把Authorization Code交换为Token，并通知AIONE。
6. 返回商品机会页面，再点击“1688已授权｜点击读取”。
7. Backend读取真实商品资料并自动回填确定性字段。

## 5. 当前验证状态

已通过：

- AppKey/AppSecret真实连接判断
- OAuth URL构建与AppSecret不泄露检查
- 随机state与Callback状态校验结构
- Authorization Code换Token结构
- Session Refresh Token复用结构
- 选品页面按需出现“授权1688”
- 23项AIONE回归测试
- Backend Node语法检查

仍需真实验证：

- 1688开放平台应用是否已允许本地Callback URI
- 真实1688采购账号授权
- 首次真实Access Token / Refresh Token返回
- `alibaba.cross.productInfo`当前应用权限
- 商品字段与真实页面一致性

## 6. 收口原则

OAuth属于连接层，不应成为员工日常操作流程。首次授权完成后，正常工作路径仍应恢复为：

`粘贴1688链接 → 读取并自动填充 → 美和AI分析`

如果后续需要频繁由员工手动授权，说明授权持久化和后台Token刷新仍未完成，不能把这种复杂度长期留给业务人员。
