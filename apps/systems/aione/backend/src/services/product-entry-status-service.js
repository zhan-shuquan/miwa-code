// Product-entry status is a read-only projection of existing Product, ProductAsset and Listing facts.
// It never authorizes publishing and never treats autoPublish as evidence.
const present = value => String(value ?? "").trim().length > 0;
const positive = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) && Number(value) > 0;
const validSpecs = value => Array.isArray(value) && value.some(spec =>
  present(spec?.name) && Array.isArray(spec.values) && spec.values.some(present)
);
const checks = Object.freeze([
  ["basic", "基本商品资料", p => present(p.localCode) && present(p.nameZh)],
  ["sku", "SKU规格", p => validSpecs(p.specs)],
  ["price", "售价", p => positive(p.salePriceJpy)],
  ["rakuten", "乐天分类与文案", p => present(p.rakutenGenreId) && present(p.rakutenTitle)],
  ["descriptions", "三份独立说明文", p => present(p.pcDescription) && present(p.spDescription) && present(p.salesDescription)]
]);

export function evaluateProductEntryReadiness(product, hasImage = null) {
  if (!product || product.readOnly) {
    return { code: "unverified", label: "待核实", complete: false, completed: null, total: 6, checks: [], note: "既有商品未录入此表单，不能按空白字段判断为未准备。" };
  }
  const items = checks.map(([key,label,test]) => ({key,label,status: test(product) ? "complete" : "missing"}));
  items.push({ key: "images", label: "商品图片", status: hasImage === null ? "unknown" : hasImage ? "complete" : "missing" });
  const completed = items.filter(x => x.status === "complete").length;
  const unresolved = items.some(x => x.status === "unknown");
  const complete = completed === items.length && !unresolved;
  return {
    code: complete ? "pending_platform_validation" : unresolved ? "needs_verification" : "incomplete",
    label: complete ? "待平台校验" : unresolved ? "待核实图片" : "资料待完善",
    complete, completed, total: items.length, checks: items,
    note: "仅表示资料填写进度；尚未完成平台规则校验，不代表可以自动上架。"
  };
}

const publishedStatuses = new Set(["active", "published", "online", "live"]);
const text = value => String(value ?? "").trim();

export function safeListingUrl(input) {
  const value = text(input);
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname ? url.href : "";
  } catch { return ""; }
}

export function evaluateProductPublicationStatus(rows, {sourceAvailable = true} = {}) {
  if (!sourceAvailable) {
    return {code:"unverified", label:"待核实", publishedCount:0, recordCount:0, items:[], links:[], note:"平台发布记录暂不可读取。"};
  }
  const listings = (Array.isArray(rows) ? rows : []).map(row => {
    const channel = text(row.channel) || "未知平台";
    const shopRef = text(row.shop_ref) || "未知店铺";
    const status = text(row.status || row.lifecycle_status).toLowerCase();
    const externalId = text(row.external_listing_id || row.external_item_id);
    const publishedAt = row.published_at || row.last_published_at || null;
    const published = publishedStatuses.has(status) && Boolean(externalId && publishedAt);
    return {
      channel, shopRef, status, externalId, publishedAt: publishedAt || null,
      published, url: published ? safeListingUrl(row.listing_url) : ""
    };
  });
  // No AIONE record does not prove the product was never listed outside AIONE.
  if (!listings.length) {
    return {code:"unverified", label:"待核实", publishedCount:0, recordCount:0, items:[], links:[], note:"AIONE暂无平台上架记录，不能据此断定外部平台未上架。"};
  }
  const published = listings.filter(item => item.published);
  const label = published.length === 0 ? "未上架" : published.length === listings.length ? "已上架" : "部分上架";
  const code = published.length === 0 ? "not_published" : published.length === listings.length ? "published" : "partially_published";
  return {
    code, label, publishedCount:published.length, recordCount:listings.length,
    items:listings, links: published.filter(item => item.url).map(item=>({
      channel:item.channel, shopRef:item.shopRef, externalId:item.externalId, url:item.url
    })),
    note:"仅统计AIONE中有成功状态、平台商品编号及发布时间的渠道记录；不根据资料完成率或自动上架旧字段推断。"
  };
}
