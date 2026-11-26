> 2026-11-26 后续指令变更（候选验证中，未部署）：导航调整为商品信息、商品规格、市场调研、样品测试。以下早前发布记录中的三标签布局属于历史实现，不再作为目标设计。

## 本轮候选修改与待验收

- 规格区移到独立全宽标签，继续使用同一草稿数据对象及动态布局分组。
- 移除前端 Colour/Size 固定名称推断；属性选项继续来自 ERP 快照。
- 有效规格统计仅计入已确认且字段无缺字的行；显示待确认数量。
- SKU 主表收紧为图片、动态属性、采购价、重量、确认及 ERP 编号；供应商资料收纳到详情。
- 原始 CSV 更新展示差异并要求确认；已保存人工修正保留。
- 行确认从已核实属性生成确认规格文本，禁止缺字属性确认。

验证：Node 语法检查及现有 CSV/规格服务 12 项断言通过；尚未完成浏览器、ERP 数据读取优先级、新属性隔离测试及正式部署验收。不得据此认定本轮完成。

仍需完成：动态分段映射及主数据值建议、停用属性历史关联、实际商品尺寸字段核对、自动美工/旧扫描正式 SKU 优先保护、乐天缺失映射提示、完整回归。当前正式记录不变；zsq109 不重新编号。8 个缺字颜色仍待员工确认。浏览器正在等待用户完成 Google 登录并交还控制。

# 商品规格与ERP建档：当前范围（2026-11-26）

商品信息、市场调研、样品测试共用选品记录。规格在动态布局specifications区块，样品仅预留入口。
原始CSV及解析资料存于既有选品JSON草稿，不另建商品/SKU主数据表；ERP原生Item与Item Attribute为正式源。
映射：has_variants、variant_based_on、attributes.attribute/attribute_value。ERP现有Colour、Size、Set、Type；固定属性保留fixedSpecifications，ERP固定规格只读字段。采购差异cost/weight/quantity分别映射custom_单个采购价/custom_单个净重g/custom_套装数量；空值继承商品，0不作为缺失值。
供应商SKU ID独立于正式SKU编号；原始名称、价格、库存、图片URL仅供参考。原始CSV与确认JSON使用ERP原生File附在母商品，库存不写仓库台账。
ERP quick_variants.create新增可选combinations参数，只生成明确组合，原入口未传参数保持原行为。编号与唯一性继续调用ERPNext原生工具。
正式建档锁定selection_id并核对已有MIWA Item Code Reservation，禁止重分配主货号；重复请求读取已建档Item；完整事务失败回滚商品创建，独立预留号保留。
正式结果必须返回item_created、匹配主货号/选品ID，AIONE才更新submitted；禁止以测试回执冒充。
原始CSV为Shift-JIS且部分中文字节已丢失。12条全部计划销售由用户确认；80×135cm、常规款、400g已确认。缺字颜色待用户修正，禁止正式建档含问号的确认名称。
不修改成本函数，不触发美工、上架、邮件；miwa_automation_internal沿用现有副作用保护。

隔离验证：CSV解析/校验12项；V39回归74项；选品池49项；ERP两条非笛卡尔组合仅生成2 SKU，重复提交返回原编号，采购价重量继承通过。公共离线回归通过（本机缺bs4的4条在既有隔离容器通过）。实际浏览器上传真实CSV，人工修正保存刷新通过。正式部署及真实建档结果另记。

## 正式发布状态（2026-11-26 18:22 JST）
- AIONE提交908410ecd8c18231f74f355a218156065ea74660。
- Cloud Build 28275e6f-30df-4edf-8005-19b096ccf5d9 SUCCESS。
- Cloud Run aione-backend-current-00287-xig 100%，AIONE_FORMAL_ITEM_INTAKE=1，健康/数据库通过。
- Vercel dpl_Gecwh4yVXbJo8EV5eDGMqZyQZv45 READY，正式域名已绑定。
- ERP提交9a00a9f+d90d8ef，仅部署quick_variants.py及selection_product_intake.py，安装4个必要原始供应商关联/固定规格字段。
- 正式同步任务固定connector-release-908410e，任务Running。此次进行连接器重启，未进行ERP整机重启。
- 数据库及文件备份：D:\MIWA-ERP\dev-secrets\miwa-erp-8081-production\20261126-specifications（源20261126_181520）；已复制、校验哈希。
- 回滚：Cloud Run切00285-pag；Vercel回退dpl_Jk92vWqiupdseGS85ZSFn9hRCRH4；恢复connector-task-before-908410e.xml；ERP按specifications-d90d8ef.json及specifications-9a00a9f.json备份逐文件回滚。保留新增数据，不覆盖数据库；新增字段可保留停用入口。

## 未完成的真实业务验收
正式zsq109仍仅预留货号，尚无Item，现有Item总数216；成本脚本哈希仍fba8e4ffffea36faea0b0476f7df246ee850fd125fcd1136bf62fe9b2183d391。
真实CSV只在隔离预览解析/保存，尚未写入正式xp261126001。正式登录会话过期，Google账号选择窗口交互停滞，需要恢复真实86000登录后继续上传。
CSV共12条，用户确认全部销售；共同Size=80×135cm、Type=常规款、重量400g。8个颜色名称缺字，待用户核实；不猜测、不创建缺字SKU。
真实主商品及12子SKU建档、结果回传、防重及重启后的完整业务验收未完成，不以隔离记录或模拟回执代替。

## 四标签规格编辑器正式发布（2026-11-26）

- 前端提交：9e74f1704ab60e93a0b531df18db73be23a43c9b。
- Vercel部署：dpl_3ZFpPgqyxDUXduft9WTydqGF16mV，READY，现有正式域名。
- 仅发布selection-workspace.js、selection-specifications.js、selection-workspace.css三个前端文件；暂停的员工登录候选未发布。ERP及Cloud Run保持原版本。
- 回滚：恢复前端部署dpl_Gecwh4yVXbJo8EV5eDGMqZyQZv45；不得回滚数据库，以保留新增规格草稿。
- 实际浏览器：隔离草稿编辑、四标签切换、保存刷新恢复通过；缺字属性确认被阻止。
- 正式86000登录，xp261126001版本13；导入真实12行CSV，Colour映射第1段，Size固定80×135cm，Type固定常规款。全部待员工最终确认。zsq109不变，采购14.5、净重400保持。
- 正式刷新后12行及固定规格保留，8个含问号颜色已标记无效，图片可显示。截图：项目工作区zsq109-specifications-live.jpg。
- 下一步：员工修正并确认第2、4、7、8、9、10、11、12行颜色，再验收正式SKU建档与数据回传。未触发付费生图或上架。
- 自动美工/历史扫描的正式SKU优先保护、动态扩展及乐天映射验收尚未完成，不因本轮编辑页面发布而认定已验收。
