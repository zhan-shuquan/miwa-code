# V1.9.30.1｜Google Drive → AIONE Registry 自动同步候选基线

## 目的
解决“文件已经进入美和集团共享云盘，但美和AI仍只知道AIONE旧索引、找不到刚上传原件”的最后一公里问题。

## 第一阶段正式范围
只自动同步已确认目录：

`美和之家 → 03_经营与战略 → 经营架构`

Google Drive Folder ID：`1IqqUAdkQL8-xfZz_chY4eT2wBqw37J8h`

先以窄范围真实验证，再逐步扩展到企业资料、品牌规范、公开资料等目录；不对整个共享云盘无规则扫描。

## 数据责任
- Google Drive：正式文件本体与 File ID 的唯一来源。
- AIONE `knowledge_routes`：保存可检索的资料注册信息、业务Route、版本说明、别名、下载入口与同步状态。
- 美和AI：先读AIONE Registry，再交付查看/下载入口；不得凭模型记忆猜文件。
- 文件名无法证明正式版本号时，状态必须保持“正式版本号待确认”，不得自动冒充V1.0。

## 自动链路
`指定Drive目录 → Runtime SA列出文件 → 文件名/类型规则识别 → knowledge_routes Upsert → AIONE资料检索 → 美和AI资料卡 → 查看原件/安全下载`

默认5分钟TTL；首次查询或TTL到期时自动同步。管理员/负责人可通过受保护的 `/api/v1/drive-assets/sync` 强制同步。

## 本次已覆盖的真实文件
- `00_美和集团AI经营总架构_战略版_2026-08-26.png`
- `01_美和集团AI经营总架构_阶段性总结_2026-08-13.docx`

其中战略版图片识别为 `IMAGE`，可响应“图片、PNG、链接、原件”等检索语义。
