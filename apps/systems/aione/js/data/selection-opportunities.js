/* ========================================
   Selection Opportunity Data｜選品機会データ
   一覧・カード・集計は同一データソースを参照する。
   sourceUrl 为真实采购来源链接；未核实时保持为空，不得猜测。
======================================== */

export const selectionOpportunities = [
  {name:'男士吸汗速干短袜',id:'XP20260811000001',type:'常规选品',stage:'opportunity',stageName:'商品机会',owner:'张美和',platforms:['楽天'],time:'2026/08/11 10:20',cost:0,info:'资料收集中',rule:'基础资料已创建',ai:'建议继续完成资料录入',elements:'9/9',result:'待形成',source:'1688'},
  {name:'夏季轻量折叠防晒帽',id:'XP20260811000002',type:'直发选品',stage:'data',stageName:'数据录入',owner:'选品人员A',platforms:['楽天'],time:'2026/08/10 15:25',cost:0,info:'待补供应商信息',rule:'基础规则正常',ai:'优先补齐供应商资料',elements:'8/9',result:'待形成',source:'1688'},
  {name:'三段式磁吸手机环支架',id:'XP20260811000003',type:'常规选品',stage:'pricing',stageName:'智能定价',owner:'张美和',platforms:['楽天','Amazon'],time:'2026/08/10 17:05',cost:2380,info:'定价建议生成中',rule:'定价条件通过',ai:'可按需测样辅助判断',elements:'9/9',result:'待形成',source:'1688'},
  {name:'UV冷感防晒袖套',id:'XP20260811000004',type:'常规选品',stage:'decision',stageName:'上架判断',owner:'张美和',platforms:['楽天'],time:'2026/08/10 19:10',cost:1560,info:'样品测试中',rule:'样品资料完整',ai:'关注冷感与尺码反馈',elements:'9/9',result:'待形成',source:'1688'},
  {name:'轻量折叠购物袋',id:'XP20260811000005',type:'产品开发',stage:'decision',stageName:'上架判断',owner:'选品人员A',platforms:['楽天','Amazon'],time:'2026/08/09 14:30',cost:3200,info:'判断资料齐全',rule:'关键条件满足',ai:'建议上架',elements:'9/9',result:'上架',source:'供应商'},
  {name:'夹式半导体冷感便携风扇',id:'XP20260811000006',type:'直发选品',stage:'decision',stageName:'上架判断',owner:'林选品',platforms:['楽天','Amazon'],time:'2026/08/09 16:10',cost:1840,info:'成本存在缺口',rule:'成本条件不满足',ai:'建议不上架',elements:'9/9',result:'不上架',source:'1688'},
  {name:'女士透气防晒面罩',id:'XP20260811000007',type:'常规选品',stage:'cost',stageName:'成本试算',owner:'张美和',platforms:['楽天'],time:'2026/08/09 11:40',cost:980,info:'成本资料核对中',rule:'采购资料已齐',ai:'建议完成费用核算',elements:'9/9',result:'待形成',source:'1688'},
  {name:'便携折叠遮阳伞',id:'XP20260811000008',type:'常规选品',stage:'data',stageName:'数据录入',owner:'选品人员A',platforms:['楽天','Amazon'],time:'2026/08/08 18:05',cost:0,info:'图片资料补充中',rule:'来源链接有效',ai:'建议补齐规格资料',elements:'8/9',result:'待形成',source:'1688'},
  {name:'夏季冰感颈部围巾',id:'XP20260811000009',type:'直发选品',stage:'opportunity',stageName:'商品机会',owner:'林选品',platforms:['楽天'],time:'2026/08/08 14:20',cost:0,info:'机会资料已建立',rule:'基础资料已创建',ai:'建议进入数据录入',elements:'9/9',result:'待形成',source:'1688'},
  {name:'桌面迷你循环风扇',id:'XP20260811000010',type:'常规选品',stage:'decision',stageName:'上架判断',owner:'张美和',platforms:['楽天','Amazon'],time:'2026/08/08 10:30',cost:1280,info:'噪音测试中',rule:'样品已到达',ai:'建议补充续航记录',elements:'9/9',result:'待形成',source:'1688'},
  {name:'轻量防水收纳袋',id:'XP20260811000011',type:'产品开发',stage:'pricing',stageName:'智能定价',owner:'选品人员A',platforms:['楽天'],time:'2026/08/07 17:15',cost:760,info:'价格区间确认中',rule:'成本数据完整',ai:'建议比较目标毛利',elements:'9/9',result:'待形成',source:'供应商'},
  {name:'可调节运动遮阳帽',id:'XP20260811000012',type:'常规选品',stage:'cost',stageName:'成本试算',owner:'林选品',platforms:['楽天','Amazon'],time:'2026/08/07 13:45',cost:1020,info:'物流费用待确认',rule:'商品资料完整',ai:'建议确认到岸成本',elements:'9/9',result:'待形成',source:'1688'}
];
