import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
export const fingerprint = (value) =>
  createHash("sha256").update(value).digest("hex");
const tracking =
  /^(utm_.+|spm|spm_id_from|share_token|shareId|share_id|fbclid|gclid|igsh|igshid|_t|_r)$/i;
export function sourceIdentity(raw) {
  const u = new URL(String(raw).trim());
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
    throw Error("只支持有效HTTP/HTTPS来源链接");
  u.hash = "";
  u.hostname = u.hostname.toLowerCase();
  const ali = /(^|\.)1688\.com$/.test(u.hostname);
  const offer = ali
    ? u.pathname.match(/\/offer\/(\d+)/)?.[1] ||
      u.searchParams.get("offerId") ||
      u.searchParams.get("offerid")
    : null;
  if (offer && /^\d+$/.test(offer))
    return {
      url: `https://detail.1688.com/offer/${offer}.html`,
      platform: "1688",
      platformId: offer,
      key: "1688:" + offer,
      kind: "purchase",
    };
  for (const key of [...u.searchParams.keys()])
    if (tracking.test(key)) u.searchParams.delete(key);
  u.searchParams.sort();
  const instagram = /(^|\.)instagram\.com$/.test(u.hostname),
    tiktok = /(^|\.)tiktok\.com$/.test(u.hostname),
    xiaohongshu = /(^|\.)(xiaohongshu\.com|xhslink\.com)$/.test(u.hostname),
    douyin = /(^|\.)douyin\.com$/.test(u.hostname);
  const platform = ali
    ? "1688"
    : instagram
      ? "Instagram"
      : tiktok
        ? "TikTok"
        : xiaohongshu ? "小红书" : douyin ? "抖音" : u.hostname;
  const platformId = instagram
    ? u.pathname.match(/\/(?:p|reel|tv)\/([^/]+)/)?.[1]
    : tiktok
      ? u.pathname.match(/\/video\/(\d+)/)?.[1]
      : null;
  return {
    url: u.href,
    platform,
    platformId,
    key: platformId
      ? platform.toLowerCase() + ":" + platformId
      : "url:" + fingerprint(u.href),
    kind: instagram || tiktok || xiaohongshu || douyin ? "market" : ali ? "purchase" : "reference",
    sns: instagram || tiktok || xiaohongshu || douyin,
  };
}
export function parseShareText(raw) {
  if (typeof raw !== "string" || raw.length > 200000)
    throw Error("分享内容过长");
  // Join only URL-internal continuation segments, never remove arbitrary word breaks.
  const normalized = raw
    .replace(/https?\s*:\s*\/\s*\//gi, (m) => m.replace(/\s/g, ""))
    .replace(/(https?:\/\/[^\s]+)\r?\n[ \t]*(?=[?&=][^\s])/g, "$1")
    .replace(
      /(https?:\/\/(?:detail\.)?1688\.com\/offer\/\d*)\r?\n[ \t]*(?=\d)/g,
      "$1",
    );
  const matches = [...normalized.matchAll(/https?:\/\/[^\s<>"「」【】]+/gi)];
  const rows = [];
  let previousEnd = 0;
  for (let n = 0; n < matches.length; n++) {
    const m = matches[n],
      url = m[0].replace(/[，。；！、）)\]}]+$/g, "");
    const before = normalized.slice(previousEnd, m.index).trim();
    const next = matches[n + 1]?.index ?? normalized.length;
    // Only use preceding text for this link; never take the next product's title.
    const title =
      before
        .split(/\r?\n/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(-1)[0] || "";
    const original = normalized
      .slice(previousEnd, m.index + m[0].length)
      .trim();
    try {
      rows.push({
        title: title.slice(0, 1000),
        source: sourceIdentity(url),
        rawShare: original,
        sourceOffset: m.index,
      });
    } catch (e) {
      rows.push({ error: e.message, rawShare: original });
    }
    previousEnd = m.index + m[0].length;
    if (n === matches.length - 1 && next > previousEnd)
      rows.at(-1).rawShare += "\n" + normalized.slice(previousEnd).trim();
  }
  if (!rows.length && raw.trim())
    rows.push({
      title: "",
      rawShare: raw.trim(),
      source: null,
      recognition: "待解析分享口令",
    });
  if (rows.length > 500) throw Error("单次最多500条商品机会");
  return rows;
}
const aliases = {
  title: ["商品标题", "商品名称", "标题"],
  url: ["商品链接", "来源链接", "链接", "采购链接", "宝贝链接"],
  platformId: ["商品ID", "商品id", "offerId", "宝贝ID"],
  image: ["图片地址", "商品图片", "图片URL", "主图链接"],
  referencePrice: ["加入时价格（人民币）", "商品价格", "加入时价格", "价格", "参考采购价格"],
  monthlySales: ["月销量", "月销售量"],
  platform: ["平台", "来源平台"],
  supplier: ["店铺名称", "供应商"],
  sourceAddedAt: ["加入时间", "原始加入时间"],
  group: ["所属分组", "分组"],
  tags: ["标签"],
  note: ["备注"],
};
const text = (v) =>
  v == null
    ? ""
    : typeof v === "object"
      ? String(v.text ?? v.hyperlink ?? v.richText?.map((t) => t.text).join("") ?? v.result ?? "")
      : String(v);
export async function parseIntakeWorkbook(bytes, filename, mapping = {}) {
  const book = new ExcelJS.Workbook();
  if (/\.csv$/i.test(filename)) {
    const { Readable } = await import("node:stream");
    await book.csv.read(Readable.from(bytes));
  } else if (/\.xlsx$/i.test(filename)) await book.xlsx.load(bytes);
  else throw Error("请选择原始xlsx或csv文件");
  const sheet = book.worksheets[0];
  if (!sheet) throw Error("导入文件没有工作表");
  if (sheet.rowCount > 10000) throw Error("导入文件超过10000行");
  let header = 1;
  for (let n = 1; n <= Math.min(sheet.rowCount, 20); n++)
    if (
      sheet
        .getRow(n)
        .values.some(
          (v) =>
            aliases.title.includes(String(text(v)).trim()) || aliases.url.includes(String(text(v)).trim()),
        )
    ) {
      header = n;
      break;
    }
  const headers = sheet.getRow(header).values.map(v => String(text(v)).trim()),
    indices = {};
  for (const [key, names] of Object.entries(aliases))
    indices[key] = headers.findIndex((h) =>
      mapping[key] ? h === mapping[key] : names.includes(h),
    );
  if (indices.title < 0 && indices.url < 0)
    throw Error("未识别标题或商品链接列，请配置字段映射");
  const embedded = new Map();
  for (const img of sheet.getImages()) {
    const row = Number(img.range.tl.nativeRow) + 1,
      media = book.getImage(img.imageId);
    if (media?.buffer) {
      const list = embedded.get(row) || [];
      list.push({
        filename: `embedded-${img.imageId}.${media.extension}`,
        base64: Buffer.from(media.buffer).toString("base64"),
      });
      embedded.set(row, list);
    }
  }
  const rows = [];
  for (let n = header + 1; n <= sheet.rowCount; n++) {
    const row = sheet.getRow(n),
      get = (k) => (indices[k] > 0 ? row.getCell(indices[k]).value : null);
    if (!row.hasValues && !embedded.has(n)) continue;
    try {
      // Excel hyperlinks often display a product title rather than the target URL.
      const urlCell = get("url"),
        rawUrl = String(urlCell?.hyperlink || text(urlCell)).trim(),
        platformId = text(get("platformId")).trim(),
        platform = text(get("platform")).trim(),
        inferredUrl = !rawUrl && /^\d+$/.test(platformId) && /^(1688|阿里巴巴|1688阿里巴巴)$/i.test(platform)
          ? `https://detail.1688.com/offer/${platformId}.html` : rawUrl,
        source = inferredUrl ? sourceIdentity(inferredUrl) : null;
      const rawPrice = text(get("referencePrice")).replace(/[,￥¥\s]/g, "");
      const validPrice = rawPrice !== "" && Number.isFinite(Number(rawPrice)) && Number(rawPrice) >= 0;
      rows.push({
        line: n,
        title: text(get("title")),
        source,
        rawShare: text(get("note")),
        referencePrice: validPrice ? Number(rawPrice) : null,
        ...(rawPrice && !validPrice ? { warning: "参考采购价格不是单一有效金额，原值已保留，待补充" } : {}),
        sourceFacts: Object.fromEntries(
          [
            "platformId",
            "monthlySales",
            "platform",
            "supplier",
            "sourceAddedAt",
            "group",
            "tags",
            "note",
            "image",
            "referencePrice",
          ].map((k) => [
            k,
            get(k) instanceof Date ? get(k).toISOString() : text(get(k)),
          ]),
        ),
        images: embedded.get(n) || [],
      });
    } catch (e) {
      rows.push({ line: n, error: e.message });
    }
  }
  return { headers, fields: Object.keys(aliases), mapping: indices, rows };
}
