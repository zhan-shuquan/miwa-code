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
  { id: "basic", label: "选品基本信息" },
  { id: "purchase", label: "采购信息" },
  { id: "logistics", label: "物流与包装" },
  { id: "pricing", label: "售价" },
  { id: "operations", label: "运营设置", collapsed: true },
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
    .filter(Boolean);
}
export function defaultLayout(fields) {
  return {
    ratio: 60,
    groups: GROUPS,
    fields: fields.map((f) => ({
      id: f.id,
      group: f.group,
      width: 6,
      hidden: false,
    })),
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
    new Set(layout.groups.map((g) => g.id)).size !== GROUPS.length ||
    GROUPS.some((g) => !layout.groups.some((v) => v.id === g.id))
  )
    fail("布局分组不完整");
  if (!Array.isArray(layout.fields) || layout.fields.length !== fields.length)
    fail("布局字段不完整");
  const ids = new Set();
  for (const f of layout.fields) {
    if (
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
      data[f.id] = String(value).trim().slice(0, 2000);
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
  if (data.item_code && !/^[a-zA-Z0-9_-]{1,80}$/.test(data.item_code))
    fail("货号含不支持的字符");
  data.sourceUrl = String(input.sourceUrl || "").slice(0, 2000);
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
