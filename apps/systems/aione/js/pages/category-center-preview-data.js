export const ROUTE_ID = "category-home";

export const PRODUCT_SIDEBAR_ITEMS = Object.freeze([
  { label: "分类中心", icon: "category", href: "#/category-home", current: true },
  { label: "品牌中心", icon: "brand", href: "#/product-home?center=brand-center" },
  { label: "商品中心", icon: "product", href: "#/product-home?center=product-center" },
  { label: "属性中心", icon: "settings", href: "#/product-home?center=attribute-center" },
  { label: "规格中心", icon: "apps", href: "#/product-home?center=specification-center" },
  { label: "库存中心", icon: "database", href: "#/product-home?center=inventory-center" },
  { label: "资料中心", icon: "file", href: "#/product-home?center=asset-center" }
]);

function leaf(id, name, icon = "•", tone = "stone") {
  return { id, name, icon, tone, children: [] };
}
function leafSet(prefix, names) {
  return names.map((name, index) => leaf(`${prefix}${String(index + 1).padStart(2, "0")}`, name, "•", index % 2 ? "stone" : "mint"));
}
function storeLeafSet(prefix, names) {
  return names.map((name, index) => leaf(`${prefix}-${index + 1}`, name, index === names.length - 1 ? "✨" : "🧦", index % 2 ? "orange" : "blue"));
}
function simpleChildren(prefix, names, icon) {
  return names.map((name, index) => ({
    id: `${prefix}${String(index + 1).padStart(2, "0")}`,
    name,
    icon,
    tone: ["blue", "mint", "violet", "orange", "rose", "cyan", "stone"][index % 7],
    children: leafSet(`${prefix}${String(index + 1).padStart(2, "0")}`, ["代表分类A", "代表分类B", "其他"])
  }));
}

export const SYSTEM_TREE = [
  {
    id: "01", name: "服装服饰", icon: "👕", tone: "blue",
    children: [
      { id: "0101", name: "女装", icon: "👩", tone: "rose", children: leafSet("0101", ["上装", "裙装", "裤装", "外套", "内衣", "家居服", "其他女装"]) },
      { id: "0102", name: "男装", icon: "👨", tone: "blue", children: leafSet("0102", ["上装", "裤装", "外套", "内衣", "家居服", "其他男装"]) },
      { id: "0103", name: "童装", icon: "🧒", tone: "orange", children: leafSet("0103", ["上装", "裤装", "裙装", "外套", "内衣", "家居服", "其他童装"]) },
      { id: "0104", name: "女袜", icon: "🧦", tone: "rose", children: leafSet("0104", ["日常袜", "短袜", "中筒袜", "长筒袜", "保暖袜", "运动袜", "五指袜", "船袜", "其他女袜"]) },
      { id: "0105", name: "男袜", icon: "🧦", tone: "blue", children: [
        leaf("010501", "商务袜", "🧦", "graphite"),
        leaf("010502", "休闲袜", "🧦", "stone"),
        leaf("010503", "运动袜", "🧦", "blue"),
        leaf("010504", "五指袜", "🧦", "violet"),
        leaf("010505", "船袜", "🧦", "mint"),
        leaf("010506", "保暖袜", "🧦", "orange"),
        leaf("010507", "长筒袜", "🧦", "graphite"),
        leaf("010599", "其他男袜", "…", "stone")
      ] },
      { id: "0106", name: "童袜", icon: "🧦", tone: "orange", children: leafSet("0106", ["日常袜", "短袜", "中筒袜", "保暖袜", "运动袜", "五指袜", "其他童袜"]) },
      { id: "0107", name: "其他服装", icon: "👚", tone: "stone", children: leafSet("0107", ["其他服装"]) }
    ]
  },
  { id: "02", name: "鞋靴", icon: "👟", tone: "mint", children: simpleChildren("02", ["女鞋", "男鞋", "童鞋", "运动鞋", "靴子", "拖鞋", "其他鞋靴"], "👟") },
  { id: "03", name: "箱包", icon: "👜", tone: "violet", children: simpleChildren("03", ["女包", "男包", "双肩包", "旅行箱", "功能包", "其他箱包"], "👜") },
  { id: "04", name: "帽饰配件", icon: "👒", tone: "orange", children: simpleChildren("04", ["女帽", "男帽", "童帽", "围巾", "手套", "腰带", "其他配件"], "👒") },
  { id: "05", name: "家居生活", icon: "🏠", tone: "cyan", children: simpleChildren("05", ["收纳整理", "清洁用品", "卫浴用品", "床上用品", "家居装饰", "其他家居"], "🏠") },
  { id: "06", name: "厨房餐饮", icon: "🍲", tone: "orange", children: simpleChildren("06", ["厨具", "餐具", "杯壶", "保鲜收纳", "厨房小物", "其他厨房"], "🍲") },
  { id: "07", name: "健康护理", icon: "❤️", tone: "rose", children: simpleChildren("07", ["健康用品", "护理用品", "防护用品", "按摩放松", "其他健康"], "❤️") },
  { id: "08", name: "美容个护", icon: "🧴", tone: "violet", children: simpleChildren("08", ["美容工具", "美发用品", "身体护理", "口腔护理", "其他个护"], "🧴") },
  { id: "09", name: "数码电器", icon: "📷", tone: "blue", children: simpleChildren("09", ["数码配件", "小家电", "照明", "充电设备", "其他电器"], "📷") },
  { id: "10", name: "户外旅行", icon: "⛺", tone: "mint", children: simpleChildren("10", ["旅行用品", "户外装备", "雨具", "防晒用品", "其他户外"], "⛺") },
  { id: "11", name: "宠物用品", icon: "🐾", tone: "sand", children: simpleChildren("11", ["宠物服饰", "宠物玩具", "宠物清洁", "宠物出行", "其他宠物"], "🐾") },
  { id: "12", name: "文具礼品", icon: "🎁", tone: "rose", children: simpleChildren("12", ["文具", "办公用品", "礼品", "包装用品", "其他文具礼品"], "🎁") }
];

export const STORE_TAXONOMIES = Object.freeze({
  primelife: {
    label: "PrimeLife", sync: "Rakuten RMS",
    roots: [
      { id: "P01", name: "靴下", icon: "🧦", tone: "blue", children: simpleChildren("P01", ["メンズ", "レディース", "防寒", "お買い得セット"], "🧦") },
      { id: "P02", name: "生活雑貨", icon: "🏠", tone: "cyan", children: simpleChildren("P02", ["収納", "キッチン", "おでかけ", "季節用品"], "🏠") }
    ]
  },
  happyhouse: {
    label: "幸せ屋", sync: "Rakuten RMS",
    roots: [
      { id: "H01", name: "おすすめ", icon: "⭐", tone: "orange", children: simpleChildren("H01", ["新商品", "季節のおすすめ", "ギフト", "ランキング"], "⭐") },
      { id: "H02", name: "ファッション", icon: "👕", tone: "blue", children: simpleChildren("H02", ["ソックス", "帽子", "バッグ", "小物"], "👕") }
    ]
  },
  global: {
    label: "Global Dimensions", sync: "Rakuten RMS",
    roots: [
      { id: "G01", name: "メンズ", icon: "👨", tone: "blue", children: [
        { id: "G0101", name: "メンズソックス", icon: "🧦", tone: "blue", children: storeLeafSet("G0101", ["ビジネス", "カジュアル", "スポーツ", "あったか", "5足セット", "新着"]) },
        { id: "G0102", name: "帽子", icon: "🧢", tone: "violet", children: storeLeafSet("G0102", ["キャップ", "ハット", "ニット帽", "UV対策"]) }
      ] },
      { id: "G02", name: "レディース", icon: "👩", tone: "rose", children: simpleChildren("G02", ["ソックス", "帽子", "バッグ", "ファッション小物"], "🛍️") },
      { id: "G03", name: "季節特集", icon: "✨", tone: "orange", children: simpleChildren("G03", ["秋冬あったか", "UV対策", "雨の日", "ギフト"], "✨") }
    ]
  }
});

export function findNode(nodes, id) {
  return (nodes || []).find((node) => node.id === id) || null;
}
