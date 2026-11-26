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
