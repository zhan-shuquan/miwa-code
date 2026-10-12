// AIONE 日本末端配送费率：根据 2026-10-12 确认的 jp_delivery_* 共享参数快照。
// 在接通集中参数服务之前，只在此模块维护金额，禁止商品页面自行写死价格。
// 单位：JPY/单（含包裹配送，不含日本包装物成本）。
export const JAPAN_DELIVERY_TARIFF = Object.freeze({
  "3cm厚": Object.freeze({ key: "jp_delivery_3cm", carrier: "ネコポス", amountJpy: 200 }),
  "60cm": Object.freeze({ key: "jp_delivery_60", carrier: "佐川急便", amountJpy: 500 }),
  "80cm": Object.freeze({ key: "jp_delivery_80", carrier: "佐川急便", amountJpy: 600 }),
  "100cm": Object.freeze({ key: "jp_delivery_100", carrier: "佐川急便", amountJpy: 700 }),
  "120cm": Object.freeze({ key: "jp_delivery_120", carrier: "佐川急便", amountJpy: 800 })
});

export function quoteJapanDelivery(sizeClass) {
  const tier = String(sizeClass ?? "").trim();
  const tariff = Object.hasOwn(JAPAN_DELIVERY_TARIFF, tier) ? JAPAN_DELIVERY_TARIFF[tier] : null;
  if (!tariff) {
    return { status: "unconfigured", sizeClass: tier, carrier: null, amountJpy: null,
      key: null, reason: "发货尺寸尚未匹配已确认的日本配送运费档位" };
  }
  return { status: "priced", sizeClass: tier, carrier: tariff.carrier,
    amountJpy: tariff.amountJpy, key: tariff.key,
    reason: "依据已确认的 jp_delivery_* 共享参数费率" };
}
