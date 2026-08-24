# AIONE V1.9.18｜1688采购来源API桥接候选基线

状态：验证中（Candidate）  
日期：2026-08-24

## 1. 本版目标

把选品工作台的首个真实外部商品数据连接跑通：

`粘贴1688商品链接 → AIONE识别offerId → Backend调用1688 Open Platform → 返回真实商品事实 → 自动回填确定字段 → 美和AI直接读取同一份来源事实进行分析`

本版不把网页抓取、AI猜测或示例数据当作正式商品事实。

## 2. 业务与技术边界

- 员工入口仍然只有选品页面和“美和AI”，不要求选择AI人才、AI岗位、Skill、模型或Provider。
- 1688 AppKey、AppSecret、Access Token、Refresh Token只能存在于Backend运行环境；不得写入前端、仓库或业务记录。
- 来源API能确定的字段才自动回填；无法稳定取得的重量、包装尺寸、运费等继续标记待确认。
- API原始商品标题可以作为来源事实保存；AIONE标准商品名称仍由标准化规则/AI转换，不直接用长标题覆盖内部命名规范。
- 当前Candidate先以浏览器本地来源事实缓存验证闭环；正式数据库持久化在验证API字段稳定后再收口。

## 3. 首版接口

Backend：

- `GET /api/v1/integrations/1688/status`
- `POST /api/v1/integrations/1688/product-by-url`

请求示例：

```json
{
  "url": "https://detail.1688.com/offer/826154588274.html",
  "opportunityId": "XP20260824000001"
}
```

业务商品详情接口默认描述符：

`com.alibaba.product:alibaba.cross.productInfo-1`

参数：`productId=<offerId>`。

## 4. 认证策略

Backend按以下顺序取得授权：

1. 已注入的 `ALIBABA_1688_ACCESS_TOKEN`
2. 已注入的 `ALIBABA_1688_REFRESH_TOKEN` 自动换取Access Token
3. `ALIBABA_1688_TOKEN_MODE=auto` 时尝试当前应用是否支持client_credentials
4. 若应用必须绑定1688账号，则明确返回 `alibaba_1688_authorization_required`，进入下一阶段OAuth账号授权，不伪造数据

Windows本地验证器允许临时输入AppKey/AppSecret，AppSecret隐藏输入且不写文件。

## 5. 自动回填原则

首版候选可读取/尝试回填：

- 1688 offerId / productId
- 来源商品标题
- 主图及图片列表
- 人民币采购价格/阶梯价格
- 最小起订量
- 采购单位
- 类目
- 供应商
- SKU信息
- 明确带单位的重量（仅在API明确提供单位时换算为克）

如果某字段当前AIONE已经有人类录入值，API默认不覆盖；减少自动化覆盖人工确认结果的风险。

## 6. 美和AI上下文

成功读取后，来源商品事实写入当前商品机会的Source Facts。美和AI Context Router自动把它加入当前业务上下文，因此“分析商品机会 / 检查利润与风险 / 判断是否需要测样 / 生成选品摘要”可以直接使用真实来源数据。

同时增加来源URL一致性校验：用户更换1688链接后，旧链接缓存的商品事实不会继续注入AI上下文。

## 7. 验证标准

V1.9.18只有满足以下条件才可从Candidate升级：

- 真实AppKey/AppSecret授权成功
- 至少一个真实1688商品链接取得真实API响应
- 商品ID、标题、图片、价格/起订量等核心字段映射与1688页面事实一致
- 无法取得的数据保持待确认，不被AI补造
- 美和AI能够读取同一商品的Source Facts并形成具体分析
- 不泄露任何AppSecret、Token或其他凭据

