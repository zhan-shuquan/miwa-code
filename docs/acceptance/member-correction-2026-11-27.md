# Employee member correction — implementation checkpoint

Scope: preserve ERP Employee and provider subjects; correct an administrator-reviewed member number through the existing outbound employee connector. No product/SKU/code/cost changes.

Observed 2026-11-27: HR-EMP-00009 has member 86007, prefix lb, personal_email lanbin8899@gmail.com, Active, no AIONE role profile. ERP member-reference column scan found only this Employee row; 86006 was unused. Formal AIONE people had neither member and no matching primary email. Full textual cloud scan found only one asset payload match, requiring exclusion of binary/image content before concluding reference checks.

Current code has a direct-edit protection error but no corresponding administrator correction implementation. Do not bypass it with SQL or an unchecked document flag.

Implementation contract: administrator requests a check from Employee; ERP records immutable old/new/reason/operator and checks local conflicts. Existing outbound connector obtains cloud conflict/reference report. Administrator approves the checked proposal. Cloud rechecks under transaction, records idempotent result and acknowledgement; ERP applies through its audited workflow only after matching acknowledgement. A crash must resume the same request, never create a second identity. Unsupported historical references must fail closed with an explicit report rather than be silently rewritten.

Rollback is a reviewed reverse correction against current references, not restoration of an old database over new business data. Existing Google login associations and permissions are preserved; correction is not an authorization grant.

## 正式结果

2026-11-27 14:12:09（日本时间）完成。ERP审计记录 `8971gtsdo7` 状态Completed，AIONE回执Applied。

- HR-EMP-00009原档案保留，会员号纠正为86006。
- 姓名蓝斌、邮箱lanbin8899@gmail.com、前缀lb、公司和原有角色配置保留。
- 正式AIONE人员86006为active，邮箱有效关联86006，员工缓存为HR-EMP-00009/lb；86007不再是有效登录身份。
- Employee逐字段比较，仅会员号、modified、modified_by变化。
- 全部229条Item的name/item_code/variant_of与变更前一致，zsq109仍为12个SKU。
- 两端正式纠错检查未发现业务引用。初查资产文本中的数字匹配未作为身份关联；正式检查排除图片二进制，检查实际文本及JSON身份值。
- 没有给蓝斌增加业务权限，其原AIONE业务角色配置为空。管理员可另行按已有流程授权。

## 管理员操作

ERP 8081 → HR Setup → 员工 → 打开员工 → 顶部 **会员号纠错**。

1. 先保存或放弃表单未保存修改。
2. 核对姓名、原会员号，填写正确会员号及纠错原因。
3. 点击“检查ERP及AIONE关联”，生成Checking审计记录。
4. 等待既有出站同步，点击“刷新执行结果”。Checked表示检查通过。
5. 核对报告，点击“管理员确认执行”。Approved表示等待执行；Completed及Applied回执共同出现才表示完成。
6. 回到Employee刷新核对，由员工使用原Google账号登录验收。

员工页“会员号纠错记录”可查询历史。仅具有Employee写权限的System Manager可操作。首次部署后旧页面若提示新路由未找到，刷新ERP页面载入新DocType缓存。

本次记录：`http://localhost:8081/desk/build/miwa-member-correction/8971gtsdo7`。

## 验收及限制

15项隔离PostgreSQL检查通过：身份及权限保留、旧身份停用、幂等回执、冲突阻断、历史引用保护、取消后重新检查。9项现有权限同步回归通过。ERP真实回滚事务验证：直接改会员号仍拒绝，Guest纠错拒绝。实际浏览器已验证创建申请、两端报告和Completed结果。

正式后台已记录86006的Google认证成功：last_authenticated_at=2026-11-27T05:42:12.300265Z（日本时间14:42:12），external identity状态active。86000仍active，员工快照于05:42:58.627Z持续更新。本人页面显示、退出及重新登录体验尚待用户反馈，不将后台认证成功扩大为全部界面验收通过。

当前自动纠错支持无AIONE业务历史引用的登记错误，及ERP现有货号预留会员关联（绝不修改货号）。其他历史引用会Blocked并列出表、字段和数量，必须专项审核；不宣称支持任意复杂历史身份自动迁移。已批准或已执行的申请不能直接取消。检查后取消须同步释放云端预留。

## 版本与备份

ERP提交8ce604b、036c393；AIONE提交b571be3、a5c3228。首次正式纠错后端为aione-backend-current-00291-him，构建23a37ab6-9832-40d0-a244-15427cfcc4fc成功。前版00289-vas保留。

最终收尾版本：aione-backend-current-00293-les，100%正式流量；构建b563f1ea-39ec-4c39-b1bf-71eb55eaec33成功。候选健康检查ok=true、database=connected，迁移版本0203保持不变。2026-11-27T05:45:10.811Z人员同步正常，纠错回执仍Applied；86000原assign/manage/collect/manageGrants权限保持，86006没有被额外授予业务权限。ERP取消回执导出/确认在完整回滚事务中验证通过，无测试记录残留。

ERP完整备份20261127_140217（数据库、站点配置、公有及私有文件）已复制并生成SHA256清单：
`D:\MIWA-ERP\dev-secrets\miwa-erp-8081-production\20261127-member-correction`。
站点private/backups另有`20261127-member-correction-before.json`，保存Employee及商品编号快照。私有备份不得入Git。

Cloud SQL备份1795755786084为SUCCESSFUL。Cloud Run原配置保存在Cloud Shell `/home/info/member-correction-20261127-backup/cloud-run-before.json`。

Windows原任务XML已备份；仅将连接器版本路径换为connector-release-b571be3，保留原账号、权限、计划和安全限制。

## 异常回滚

先暂停出站连接器，核对ERP请求和AIONE回执。若云端已Applied、ERP未完成，优先恢复匹配回执处理，不重复申请或删除身份。

代码回退：Cloud Run流量可退至00289-vas；连接器动作路径退至connector-release-908410e；ERP用上述私有目录中的deploy-existing备份回退受影响文件。保留审计结构、已纠正会员号及新增业务数据。

代码回退不会恢复错误会员号。如果确需反向纠错，应审核当前两端身份及新业务引用后进行定点补偿；现有入口会阻断保留身份或复杂历史冲突。不得用旧数据库整库覆盖正式业务。完整备份用于隔离恢复核对和灾难恢复。
