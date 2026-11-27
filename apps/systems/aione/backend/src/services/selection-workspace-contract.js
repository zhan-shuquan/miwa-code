import { specifications } from './selection-specifications.js';
// Stable mappings are contracts, not editable layout or duplicated business options.
export const BINDINGS = {
  item_code: ["basic", "text"],
  custom_miwa_selection_notes: ["basic", "textarea"],
  item_name: ["basic", "text"],
  item_group: ["basic", "select"],
  brand: ["basic", "select"],
  custom_商品长标题中文: ["basic", "text"],
  custom_主要材质1: ["basic", "text"],
  custom_库存类型: ["basic", "select"],
  custom_单个采购价: ["purchase", "number"],
  custom_单个净重g: ["purchase", "number"],
  custom_套装数量: ["purchase", "number"],
  stock_uom: ["purchase", "text"],
  custom_国际物流方式: ["logistics", "select"],
  custom_中国包装方式: ["logistics", "select"],
  custom_日本包装物: ["logistics", "select"],
  custom_日本发货尺寸: ["logistics", "select"],
  custom_中国国内运费: ["logistics", "number"],
  custom_实际售价: ["pricing", "number"],
  custom_aione_coupon: ["operations", "number"],
  custom_aione_points: ["operations", "number"],
  custom_aione_ads: ["operations", "number"],
  custom_aione_other: ["operations", "number"],
};
export const GROUPS = [
  { id: "sales", label: "销售方案", icon: "store", region: "aside" },
  { id: "source", label: "采购来源", region: "main", hidden: true },
  { id: "basic", label: "商品信息", icon: "product", region: "main" },
  { id: "specifications", label: "商品规格", icon: "product", region: "main" },
  { id: "market", label: "市场调研与选品依据", icon: "search", region: "main" },
  { id: "purchase", label: "选品决策", region: "main" },
  { id: "logistics", label: "物流与包装", icon: "supplier", region: "main" },
  { id: "operations", label: "运营设置", icon: "settings", region: "main" },
  { id: "strategy", label: "运营策略", region: "main" },
  { id: "cost", label: "成本自动核算", icon: "calculator", region: "aside" },
  { id: "pricing", label: "智能定价", icon: "tag", region: "aside" },
  { id: "profit", label: "利润分析", icon: "profit", region: "aside" },
  {
    id: "details",
    label: "其他商品属性（第二阶段）",
    region: "main",
    collapsed: true,
  },
];
export function fail(message, status = 400) {
  const e = new Error(message);
  e.statusCode = status;
  throw e;
}
export function parameterFacts(snapshot) {
  const normalize = (v) =>
    Array.isArray(v)
      ? v.map(normalize)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, normalize(v[k])]),
          )
        : v;
  return JSON.stringify(
    normalize({
      settings: snapshot.settings,
      entryDefaults: snapshot.entryDefaults,
      fields: snapshot.fields,
      exchange: snapshot.exchange,
      categories: snapshot.categories,
      brands: snapshot.brands,
      itemAttributes: snapshot.itemAttributes,
      platforms: snapshot.platforms,
      platformPolicies: snapshot.platformPolicies,
      uoms: snapshot.uoms,
      priceLists: snapshot.priceLists,
      rule: snapshot.rules.sha256,
      identification: snapshot.identification?.sha256,
    }),
  );
}
export function fieldsFor(snapshot) {
  return Object.entries(BINDINGS)
    .map(([id, [group, type]]) => {
      const f = snapshot.fields.find((f) => f.id === id);
      if (!f) return null;
      let options =
        type === "select"
          ? String(f.options || "")
              .split("\n")
              .filter(Boolean)
          : [];
      if (id === "item_group")
        options = snapshot.categories
          .filter((c) => !c.is_group)
          .map((c) => c.name);
      if (id === "brand") options = snapshot.brands;
      if (id === "stock_uom" && snapshot.uoms?.length) {
        type = "select";
        options = snapshot.uoms;
      }
      if (id === "custom_主要材质1" && f.type === "Select") {
        type = "text";
        options = String(f.options || "")
          .split("\n")
          .filter(Boolean);
      }
      return {
        id,
        label:
          id === "item_code"
            ? "正式商品货号"
            : id === "item_name"
              ? "商品简称（中文）"
              : f.label,
        type,
        group,
        options,
        optionLabels: id === "stock_uom" ? { Nos: "个" } : undefined,
        readOnly: [
          "custom_库存类型",
          "item_group",
          "brand",
        ].includes(id),
        required: CONFIRM_FIELDS.includes(id),
        display: undefined,
        costKey: {
          custom_aione_coupon: "operation:0",
          custom_aione_points: "operation:1",
          custom_aione_ads: "operation:2",
          custom_aione_other: "operation:3",
          custom_国际物流方式: "国际物流成本",
          custom_中国包装方式: "中国包装成本",
          custom_日本包装物: "日本包装成本",
          custom_日本发货尺寸: "日本配送费",
        }[id],
        default: ["custom_实际售价", "custom_库存类型"].includes(id)
          ? undefined
          : f.default,
      };
    })
    .filter(Boolean)
    .concat([
      {
        id: "salesPlatform",
        label: "销售平台",
        type: "select",
        group: "sales",
        options: snapshot.platforms || [],
        default:
          (snapshot.platforms?.includes(snapshot.entryDefaults?.salesPlatform) ? snapshot.entryDefaults.salesPlatform : undefined) ||
          (snapshot.platforms?.length === 1 ? snapshot.platforms[0] : undefined),
        optionLabels: { Rakuten: "乐天" },
      },
      {
        id: "marketReferencePrice",
        label: "市场参考售价（JPY）",
        type: "number",
        group: "market",
        options: [],
      },
      {
        id: "sourceUrl",
        label: "采购URL",
        type: "url",
        group: "source",
        options: [],
      },
      {
        id: "images",
        label: "商品图片",
        type: "images",
        group: "basic",
        options: [],
        presentationOnly: true,
      },
      {
        id: "referenceLinks",
        label: "选品参考链接",
        type: "links",
        group: "market",
        options: [],
      },
      {
        id: "specifications", label: "商品规格", type: "specifications", group: "specifications", presentationOnly: true, options: [],
      },
      {
        id: "marketAttachments",
        label: "市场头部数据与分析附件",
        type: "market",
        group: "market",
        options: [],
        presentationOnly: true,
      },
      {
        id: "selectionRationale",
        label: "选品依据",
        type: "textarea",
        placeholder:
          "市场需求：\n\n竞争优势：\n\n目标消费人群：\n\n商品差异化：\n\n选择这款商品的理由：",
        group: "market",
        options: [],
      },
      {
        id: "operatingStrategy",
        label: "运营策略",
        type: "textarea",
        group: "strategy",
        options: [],
      },
      ...[
        ["到日本仓成本", "到日本仓成本", "cost"],
        ["breakdown:purchase_jpy", "商品采购成本", "cost"],
        ["breakdown:cn_domestic", "中国国内运费", "cost"],
        ["国际物流成本", "国际物流成本", "cost"],
        ["中国包装成本", "中国包装成本", "cost"],
        ["breakdown:duty", "预估关税", "cost"],
        ["日本配送日本", "日本配送成本", "cost"],
        ["日本包装成本", "日本包装成本", "cost"],
        ["日本配送费", "日本配送费", "cost"],
        ["平台交易成本", "平台交易成本", "cost"],
        ["销售运营成本", "销售运营成本", "cost"],
        ["totalCost", "预计销售总成本", "cost"],
        ["目标毛利率达标售价", "目标毛利率达标售价", "pricing"],
        ["未运营保本售价", "未运营保本售价", "pricing"],
        ["运营后保本售价", "运营后保本售价", "pricing"],
        ["未运营毛利润", "未运营毛利润", "profit"],
        ["未运营毛利率", "未运营毛利率", "profit"],
        ["运营后毛利润", "运营后预计毛利润", "profit"],
        ["运营后毛利率", "运营后预计毛利率", "profit"],
      ].map(([key, label, group]) => ({
        id: "result:" + key,
        label,
        type: "computed",
        group,
        options: [],
        presentationOnly: true,
      })),
    ]);
}
export function defaultLayout(fields) {
  // Configuration seed only; custom layouts remain administrator-owned.
  const order = [
    "sourceUrl",
    "custom_商品长标题中文",
    "referenceLinks",
    "marketAttachments",
    "selectionRationale",
    "marketReferencePrice",
    "images",
    "item_code",
    "custom_主要材质1",
    "custom_单个采购价",
    "custom_单个净重g",
    "custom_中国国内运费",
    "custom_套装数量",
    "stock_uom",
    "item_name",
    "custom_库存类型",
    "item_group",
    "brand",
    "custom_miwa_selection_notes",
    "custom_国际物流方式",
    "custom_中国包装方式",
    "custom_日本包装物",
    "custom_日本发货尺寸",
    "custom_aione_coupon",
    "custom_aione_points",
    "custom_aione_ads",
    "custom_aione_other",
    "operatingStrategy",
    "salesPlatform",
    "result:目标毛利率达标售价",
    "custom_实际售价",
  ];
  const groupFor = (f) =>
    ["sourceUrl", "custom_商品长标题中文"].includes(f.id)
      ? "basic"
      : f.id === "custom_中国国内运费" || f.group === "purchase"
        ? "basic"
        : f.id === "operatingStrategy"
          ? "operations"
          : f.group;
  const placements = {
    custom_miwa_selection_notes: [12, 1, 1],
    images: [4, 1, 3],
    item_code: [4, 5, 1],
    custom_主要材质1: [4, 9, 1],
    item_name: [3, 1, 1],
    custom_库存类型: [3, 4, 1],
    item_group: [3, 7, 1],
    brand: [3, 10, 1],
    custom_套装数量: [2, 9, 1],
    stock_uom: [2, 11, 1],
    custom_单个采购价: [4, 5, 1],
    custom_单个净重g: [4, 9, 1],
    custom_中国国内运费: [4, 5, 1],
  };
  return {
    version: 40,
    ratio: 72,
    groups: structuredClone(GROUPS),
    fields: [...fields]
      .sort(
        (a, b) =>
          (order.indexOf(a.id) < 0 ? 999 : order.indexOf(a.id)) -
          (order.indexOf(b.id) < 0 ? 999 : order.indexOf(b.id)),
      )
      .map((f) => {
        const group = groupFor(f),
          placement = placements[f.id];
        const paired =
          ["result:未运营保本售价", "result:运营后保本售价"].includes(f.id) ||
          group === "profit";
        return {
          id: f.id,
          group,
          width:
            (["sourceUrl", "custom_商品长标题中文"].includes(f.id) ? 12 : 0) ||
            placement?.[0] ||
            (paired
              ? 6
              : ["basic"].includes(group)
                ? 4
                : ["operations", "logistics"].includes(group) &&
                    f.type !== "textarea"
                  ? 3
                  : 12),
          columnStart: placement?.[1] || null,
          rowSpan: placement?.[2] || 1,
          rows:
            f.id === "selectionRationale"
              ? 9
              : f.id === "operatingStrategy"
                ? 4
                : undefined,
          display: ["sourceUrl", "custom_商品长标题中文"].includes(f.id)
            ? "inline"
            : "stacked",
          hidden: f.id === "marketReferencePrice",
        };
      }),
  };
}

export function validateLayout(layout, fields) {
  if (
    !layout ||
    !Number.isInteger(layout.ratio) ||
    layout.ratio < 40 ||
    layout.ratio > 75
  )
    fail("左右布局比例应为40至75");
  if (
    !Array.isArray(layout.groups) ||
    layout.groups.length !== GROUPS.length ||
    new Set(layout.groups.map((g) => g.id)).size !== GROUPS.length ||
    GROUPS.some((g) => !layout.groups.some((v) => v.id === g.id))
  )
    fail("布局分组不完整");
  if (!Array.isArray(layout.fields) || layout.fields.length !== fields.length)
    fail("布局字段不完整");
  for (const g of layout.groups)
    if (g.region && !["top", "main", "aside"].includes(g.region))
      fail("布局区域无效");
  const ids = new Set();
  for (const f of layout.fields) {
    if (
      f.rows != null &&
      (!Number.isInteger(f.rows) || f.rows < 1 || f.rows > 30)
    )
      fail("文本高度应为1至30行");
    if (
      f.columnStart != null &&
      (!Number.isInteger(f.columnStart) ||
        f.columnStart < 1 ||
        f.columnStart + f.width > 13)
    )
      fail("字段起始列无效");
    if (f.display && !["inline", "stacked"].includes(f.display))
      fail("字段显示方式无效");
    if (
      (f.rowSpan !== undefined &&
        (!Number.isInteger(f.rowSpan) || f.rowSpan < 1 || f.rowSpan > 6)) ||
      ids.has(f.id) ||
      !fields.some((x) => x.id === f.id) ||
      !GROUPS.some((g) => g.id === f.group) ||
      ![2, 3, 4, 6, 8, 12].includes(f.width)
    )
      fail("布局包含未知或重复字段");
    ids.add(f.id);
  }
  return layout;
}
export function validateData(input, snapshot, { submit = false, existingData = {} } = {}) {
  input = applyDefaults(input, snapshot);
  const fields = fieldsFor(snapshot),
    data = {};
  for (const f of fields) {
    if (f.presentationOnly || f.id === "referenceLinks") continue;
    const value =
      f.id === "custom_库存类型" ? stockFor(input, snapshot) : input[f.id];
    if (value == null || value === "") continue;
    if (f.type === "number") {
      if (
        typeof value === "boolean" ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0
      )
        fail(f.label + "应为非负数");
      data[f.id] = Number(value);
    } else {
      data[f.id] = String(value)
        .trim()
        .slice(0, f.type === "textarea" ? 20000 : 2000);
      if (f.type === "select" && !f.options.includes(data[f.id]) &&
          !(f.id === 'salesPlatform' && data[f.id] === existingData.salesPlatform))
        fail(f.label + "不属于ERP有效选项");
    }
  }
  for (const id of Object.keys(BINDINGS).filter((k) =>
    k.startsWith("custom_aione_"),
  )) {
    data[id] ??= 0;
    if (data[id] >= 100) fail("运营费率必须小于100%");
  }
  if (
    data.custom_套装数量 != null &&
    (!Number.isInteger(data.custom_套装数量) || data.custom_套装数量 < 1)
  )
    fail("套装数量必须为正整数");
  // Exact rule verified in the running ERP miwa_ai.autodesign.core.code.
  if (data.item_code && !/^[A-Za-z0-9_-]{1,12}$/.test(data.item_code))
    fail("货号请使用1–12位英文、数字、下划线或横线（ERP现有规则）");
  data.sourceUrl = String(input.sourceUrl || "")
    .trim()
    .slice(0, 2000);
  if (data.sourceUrl) {
    let url;
    try {
      url = new URL(data.sourceUrl);
    } catch {
      fail("商品链接无效");
    }
    if (!["https:", "http:"].includes(url.protocol))
      fail("商品链接必须是HTTP地址");
  }
  if (
    input.referenceLinks !== undefined &&
    !Array.isArray(input.referenceLinks)
  )
    fail("参考链接格式无效");
  if ((input.referenceLinks || []).length > 30) fail("参考链接最多30条");
  if (input.referencePrices != null && !Array.isArray(input.referencePrices))
    fail("参考售价格式无效");
  const legacyLinks = input.referenceLinks?.length
    ? input.referenceLinks
    : input.marketReferencePrice != null
      ? [""]
      : [];
  const references = legacyLinks
    .map((value, index) => ({
      url: String(value).trim(),
      price: Array.isArray(input.referencePrices)
        ? input.referencePrices[index]
        : index === 0
          ? input.marketReferencePrice
          : null,
    }))
    .filter((r) => r.url || (r.price != null && r.price !== ""));
  data.referenceLinks = references.map(({ url }) => {
    if (!url) return "";
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      fail("参考链接无效");
    }
    if (!["https:", "http:"].includes(parsed.protocol))
      fail("参考链接必须使用HTTP或HTTPS");
    return parsed.href;
  });
  data.referencePrices = references.map(({ price }) => {
    if (price == null || price === "") return null;
    if (!Number.isFinite(Number(price)) || Number(price) < 0)
      fail("市场参考售价无效");
    return Number(price);
  });
  data.shortNameManual =
    input.shortNameManual === true ||
    (input.shortNameManual == null && !!input.item_name);
  data.marketReferencePrice = data.referencePrices[0] ?? null;
  data.supplier = String(input.supplier || "").slice(0, 1000);
  if (input.specificationAttributes || input.skuSourceFiles || input.has_variants != null) Object.assign(data, specifications(input, snapshot, submit));
  else {
  data.skus = Array.isArray(input.skus)
    ? input.skus.slice(0, 500).map((s) => {
        if (!s.code || !String(s.code).match(/^[a-zA-Z0-9_-]{1,100}$/))
          fail("SKU编号无效");
        const v = {
          code: String(s.code),
          spec: String(s.spec || "").slice(0, 500),
        };
        for (const k of ["cost", "price", "weight"]) {
          if (s[k] != null && s[k] !== "") {
            if (!Number.isFinite(Number(s[k])) || Number(s[k]) < 0)
              fail("SKU数值无效");
            v[k] = Number(s[k]);
          }
        }
        return v;
      })
    : [];
  if (new Set(data.skus.map((s) => s.code)).size !== data.skus.length)
    fail("SKU编号重复");
  }

  if (submit) {
    for (const k of [
      "item_code",
      "item_name",
      "custom_库存类型",
      "custom_单个采购价",
      "custom_单个净重g",
      "custom_国际物流方式",
    ])
      if (data[k] == null || data[k] === "")
        fail("提交前请补充：" + (fields.find((f) => f.id === k)?.label || k));

    const mode = snapshot.settings.logistics.find(
      (r) => r.enabled && r.method === data.custom_国际物流方式,
    );
    if (!mode) fail("所选物流尚无有效费率");
    if (mode.fulfillment !== data.custom_库存类型)
      fail("库存类型与ERP物流关联结果不一致，请刷新物流参数");
  }
  return data;
}

// Empty means missing; zero and every previously saved nonempty value are retained.
export function applyDefaults(input, snapshot) {
  const data = { ...input };
  for (const field of fieldsFor(snapshot)) {
    if ((data[field.id] == null || data[field.id] === "") &&
        field.default != null && field.default !== "" && !field.readOnly)
      data[field.id] = field.default;
  }
  return data;
}

export const CONFIRM_FIELDS = [
  "custom_单个采购价",
  "custom_单个净重g",
  "custom_国际物流方式",
  "custom_实际售价",
];
export function stockFor(data, snapshot) {
  const modes = snapshot.settings.logistics.filter(
    (r) => r.enabled && r.method === data.custom_国际物流方式,
  );
  const values = [...new Set(modes.map((r) => r.fulfillment).filter(Boolean))];
  return values.length === 1 ? values[0] : "";
}
export function confirmationIssues(data, snapshot) {
  const fields = fieldsFor(snapshot);
  const issues = CONFIRM_FIELDS.filter(
    (k) =>
      data[k] == null ||
      data[k] === "" ||
      (["custom_单个净重g", "custom_实际售价"].includes(k) &&
        Number(data[k]) <= 0),
  ).map((field) => ({
    field,
    message: "请填写有效的" + fields.find((f) => f.id === field).label,
  }));
  if (!stockFor(data, snapshot))
    issues.push({
      field: "custom_国际物流方式",
      message: "国际物流方式尚无有效库存类型关联，请选择有效物流方式",
    });
  return issues;
}
