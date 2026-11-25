// Stable mappings are contracts, not editable layout or duplicated business options.
export const BINDINGS = {
  item_code: ["basic", "text"],
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
  { id: "source", label: "01 采购来源", region: "top" },
  { id: "market", label: "02 市场参考与选品依据", region: "top" },
  { id: "basic", label: "03 商品信息与选品决策", region: "main" },
  { id: "purchase", label: "选品决策", region: "main" },
  { id: "logistics", label: "物流与包装", region: "main" },
  { id: "operations", label: "运营设置", region: "main" },
  { id: "strategy", label: "运营策略", region: "main" },
  { id: "cost", label: "成本自动核算", region: "aside" },
  { id: "pricing", label: "智能定价", region: "aside" },
  { id: "profit", label: "利润分析", region: "aside" },
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
      fields: snapshot.fields,
      exchange: snapshot.exchange,
      categories: snapshot.categories,
      brands: snapshot.brands,
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
      return {
        id,
        label: f.label,
        type,
        group,
        options,
        default: id.startsWith("custom_aione_") ? 0 : f.default,
      };
    })
    .filter(Boolean)
    .concat([
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
        ["日本配送日本", "日本配送成本", "cost"],
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
  const order = [
    "sourceUrl",
    "custom_商品长标题中文",
    "referenceLinks",
    "marketAttachments",
    "selectionRationale",
    "images",
    "item_code",
    "item_name",
    "item_group",
    "custom_库存类型",
    "custom_单个采购价",
    "custom_单个净重g",
    "custom_国际物流方式",
    "custom_中国包装方式",
    "custom_日本包装物",
    "custom_日本发货尺寸",
    "custom_aione_coupon",
    "custom_aione_points",
    "custom_aione_ads",
    "custom_aione_other",
    "operatingStrategy",
    "custom_实际售价",
  ];
  const groupFor = (f) =>
    f.id === "custom_商品长标题中文"
      ? "source"
      : [
            "brand",
            "custom_主要材质1",
            "custom_套装数量",
            "stock_uom",
            "custom_中国国内运费",
          ].includes(f.id)
        ? "details"
        : f.id === "custom_库存类型"
          ? "purchase"
          : f.group;
  return {
    ratio: 60,
    version: 35,
    groups: structuredClone(GROUPS),
    fields: [...fields]
      .sort(
        (a, b) =>
          (order.indexOf(a.id) < 0 ? 999 : order.indexOf(a.id)) -
          (order.indexOf(b.id) < 0 ? 999 : order.indexOf(b.id)),
      )
      .map((f) => {
        const group = groupFor(f);
        return {
          id: f.id,
          group,
          width: [
            "source",
            "market",
            "strategy",
            "pricing",
            "cost",
            "profit",
          ].includes(group)
            ? 12
            : group === "basic"
              ? f.id === "images"
                ? 4
                : 8
              : group === "purchase"
                ? 4
                : 6,
          rowSpan: f.id === "images" ? 3 : 1,
          hidden: false,
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
      (f.rowSpan !== undefined &&
        (!Number.isInteger(f.rowSpan) || f.rowSpan < 1 || f.rowSpan > 6)) ||
      ids.has(f.id) ||
      !fields.some((x) => x.id === f.id) ||
      !GROUPS.some((g) => g.id === f.group) ||
      ![3, 4, 6, 8, 12].includes(f.width)
    )
      fail("布局包含未知或重复字段");
    ids.add(f.id);
  }
  return layout;
}
export function validateData(input, snapshot, { submit = false } = {}) {
  const fields = fieldsFor(snapshot),
    data = {};
  for (const f of fields) {
    if (f.presentationOnly || f.id === "referenceLinks") continue;
    const value = input[f.id];
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
      if (f.type === "select" && !f.options.includes(data[f.id]))
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
  data.referenceLinks = (input.referenceLinks || []).map((v) => {
    const value = String(v).trim();
    let u;
    try {
      u = new URL(value);
    } catch {
      fail("参考链接无效");
    }
    if (!["https:", "http:"].includes(u.protocol))
      fail("参考链接必须使用HTTP或HTTPS");
    return u.href;
  });
  data.supplier = String(input.supplier || "").slice(0, 1000);
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
    if (!data.skus.length) fail("提交前请完善SKU明细");
    const mode = snapshot.settings.logistics.find(
      (r) => r.enabled && r.method === data.custom_国际物流方式,
    );
    if (!mode) fail("所选物流尚无有效费率");
    if (mode.fulfillment !== data.custom_库存类型)
      fail("库存类型与ERP物流规则不一致，请人工确认选择");
  }
  return data;
}
