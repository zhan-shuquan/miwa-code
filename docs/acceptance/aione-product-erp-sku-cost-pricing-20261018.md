# 商品中心 ERP V1 SKU成本与定价验收记录

状态：VALIDATING；不得视为完整ERP交付或生产验收。

## 代码与依赖
- 接续 #209，开发分支 `feat/product-center-erp-unified-20261017`。
- 实施提交 `92c3856f58fc81e08514b7c4f362d6db83261190`：统一有效SKU解析、成本单位、独立模式、Excel往返、最低SKU利润投影和旧后端保存保护。
- #206 HEAD `bb8a71e8f0b1870159be42b4b621d40d1817514c` 仍为Draft，尚未合并。字段注册/目录/动态Excel集成继续依赖该分支，不新增第二套引擎。
- 只读合并预检发现3处文本冲突：商品录入页面、ItemAPI预检、商品录入CI。未执行分支合并。

## 已取得证据
- 提交 `92c3856` 的11项GitHub工作流全部成功；商品录入工作流 run `39104176508`、job `117606408751`。
- 日志确认：CURRENT SQL基线、WPS/Excel往返、CRUD、乐天预检回归通过。新增数据库测试确认SKU成本/价格保存读取、索引投影、两种模式切换、覆盖值保留和持久SKU ID不变。测试只写CI独立PostgreSQL，不写生产。
- 同提交Vercel状态success，deployment `5Wcdn2UqBsJvAHEj9gL52Pux8x9A`。构建成功不代表后端代码已部署。
- 本地有效SKU契约测试、八种物流、整数保本价、ItemAPI2各SKU售价、旧V2.5预检及首发SKU权限回归通过；后端启动依赖图导入通过。
- 补充真实编辑组件的DOM测试：空白继承、零值成本、两个开关独立保留、规格重排、保存载荷重排、旧后端禁止保存通过。商品默认重量缺失时仍能选择已称重SKU进行利润分析。DOM测试使用模拟API，不等于远端浏览器/数据库验收。

## Preview未通过项
- 浏览器实际访问分支Preview，目前停在AIONE Google登录页，未进入商品业务页面。
- 尚未完成同版本后端部署、真实浏览器新增/保存/重读、多SKU利润与上架只读预检的联合验收。新增 `/sku-contract` 版本保护要求前后端配套，旧后端会明确阻止保存。
- 未执行Cloud SQL生产迁移、RMS写入、main合并或生产发布。#209保持Draft。

## 16:14 后续现场证据与部署准备

- 用户已补齐Google授权来源并成功登录，截图确认商品列表读取11条、新建表单可打开。
- 空表单点击保存后提示未取得新版SKU成本定价契约，未创建商品。代码核查确认原#209 API桥接仍固定指向CURRENT后端，不能把Vercel前端构建成功等同于SKU后端已经部署。
- 复用#206的同一CURRENT私有候选部署模式及`backend-preview-target.js`，增加#209的独立环境变量`AIONE_PRODUCT_PREVIEW_BACKEND_URL`。只有#209分支的preview环境可使用该变量，地址必须属于同一服务的candidate标签，标签SHA须匹配当前前端提交；生产继续固定CURRENT，IAM令牌audience仍使用服务基础URL。
- 增加`RUN_PR209_PREVIEW_ONCE.sh`，在执行Cloud Build前核查完整提交SHA与分支HEAD一致；preview模式不运行迁移、不切正式流量，并只读校验候选健康。候选仍共享现有数据库，不是隔离测试库。
- 本地通过路由来源限制、错误地址拒绝、提交不匹配拒绝、实际桥接模拟、preview不切流量与只读健康脚本测试。尚未执行GCP部署；当前执行环境没有gcloud，需要在已登录的Cloud Shell执行已审查脚本，再配置Vercel该分支专用变量并重新部署前端。
