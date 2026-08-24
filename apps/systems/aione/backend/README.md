# AIONE Backend V0.3｜第7阶段候选

## 定位

Backend继续承担AIONE正式业务对象、数据库和API边界；V1.8新增AI秘书编排入口。AI不直接连数据库，必须通过AIONE Tool/API，并且写动作当前需要人类确认。

## 安装与基础运行

```bash
npm install
npm run check
npm run db:preflight
npm run db:migrate
npm start
```

正式环境不要提交真实`.env`。Cloud Run + Cloud SQL可使用`INSTANCE_UNIX_SOCKET=/cloudsql/...`；本地开发可使用`DB_HOST/DB_PORT`或`DATABASE_URL`。

## AI秘书模式

### 1. Preview（默认，推荐先验证）

```env
AIONE_AI_MODE=preview
```

Preview不会调用模型，输出会明确标注“未调用模型”，用于验证：

- 当前岗位AI办公室
- 右侧AI秘书UI
- 工作/日程/通知上下文
- Proposal
- 人类确认链路

### 2. OpenAI真实模型

```env
AIONE_AI_MODE=openai
AIONE_AI_MODEL=gpt-5.6-sol
OPENAI_API_KEY=<通过环境变量/Secret注入，不得提交>
OPENAI_API_BASE=https://api.openai.com/v1
```

实现使用OpenAI Responses API Function Tools。模型可以读取AIONE上下文和调用安全Tool，但V1.8没有暴露直接写入工作事项的模型Tool；写入只能先Proposal，再由人确认。

## 本地Live Server

默认允许本地前端：

- `http://127.0.0.1:5500`
- `http://localhost:5500`

Backend默认可运行在`8080`。前端在localhost/127.0.0.1时会自动把API指向同主机的`8080`。

如果需要验证“确认后写入”，本地预演可显式设置：

```env
AIONE_ALLOW_PREVIEW_ACTOR=true
```

**生产环境必须关闭，并使用真实认证身份。**

## 安全默认值

- 写API默认要求已认证的`req.aioneIdentity.personId`。
- 内部预演只有显式`AIONE_ALLOW_PREVIEW_ACTOR=true`才读取`x-aione-person-id`。
- 无人员系统写入只有显式`AIONE_ALLOW_SYSTEM_WRITES=true`才允许。
- API Key、密码、Token、私钥不得提交仓库。
- AI重大或写入动作必须保留人类确认，除非未来有正式风险分级和锁定规则。

## API

- `/health`
- `/api/v1/*`
- `/api/v1/ai-secretary/status`
- `/api/v1/ai-secretary/execute`
- `/api/v1/ai-secretary/confirm`
- `/api/product-opportunities`（Legacy兼容）

详细契约：`../../../../contracts/api/aione-core-v1.openapi.yaml`。

## V1.9.13｜Model Provider Layer

美和AI业务编排通过 `src/ai/model-provider-registry.js` 选择模型，不再直接依赖某一家Provider。

- `AIONE_AI_MODE=preview`：确定性预演，用于链路和回归测试。
- `AIONE_AI_MODE=live`：启用真实模型。
- `AIONE_AI_PROVIDER=openai`：第一阶段真实Provider。
- `AIONE_AI_MODEL=gpt-5.6-sol`：可由Backend环境覆盖。
- `OPENAI_API_KEY`：只能存在于Backend运行环境；禁止进入前端和代码仓库。

本地Windows真实模型验证请使用仓库根目录 `START_MIWA_AI_REAL_MODEL.cmd`。生产Cloud Run必须使用Secret Manager注入Key。


## V1.9.18｜1688采购来源API

选品工作台首个真实外部来源接口：

- `GET /api/v1/integrations/1688/status`：检查后端1688配置状态，不返回秘密。
- `POST /api/v1/integrations/1688/product-by-url`：传入1688商品链接，Backend提取offerId并调用Open Platform商品详情。
- 默认业务接口：`com.alibaba.product:alibaba.cross.productInfo-1`。
- Backend支持静态Access Token、Refresh Token自动刷新，以及`auto`授权探测。需要账号OAuth时明确返回`alibaba_1688_authorization_required`。
- `ALIBABA_1688_APP_SECRET`、Access Token、Refresh Token禁止进入前端和版本库；生产环境必须迁入Secret Manager。
- API没有明确返回的重量、包装、运费等字段不得由代码或AI臆测。

本地测试继续使用根目录 `START_MIWA_AI_REAL_MODEL.cmd`；V1.9.18会额外询问可选的1688 AppKey/AppSecret，留空即可跳过1688测试。
