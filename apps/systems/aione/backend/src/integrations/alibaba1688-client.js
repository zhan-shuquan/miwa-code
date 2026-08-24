import crypto from "node:crypto";

const DEFAULT_API_BASE = "https://gw.open.1688.com/openapi";
const DEFAULT_PRODUCT_API = "com.alibaba.product:alibaba.cross.productInfo-1";
const DEFAULT_TOKEN_URL = "https://gw.open.1688.com/openapi/param2/1/system.oauth2/getToken";
const DEFAULT_AUTHORIZE_URL = "https://auth.1688.com/oauth/authorize";
const DEFAULT_REDIRECT_URI = "http://127.0.0.1:8080/api/v1/integrations/1688/oauth/callback";

let tokenCache = null;

function valueAt(object, path) {
  return String(path || "").split(".").reduce((value, key) => {
    if (value == null || typeof value !== "object") return undefined;
    return value[key];
  }, object);
}

function firstDefined(object, paths) {
  for (const path of paths) {
    const value = valueAt(object, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function toStringValue(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function toNumberValue(value) {
  const raw = toStringValue(value);
  if (!raw) return null;
  const match = raw.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function uniqueStrings(values) {
  const out = [];
  const seen = new Set();
  for (const value of values || []) {
    const text = toStringValue(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function collectImages(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    const values = [];
    for (const item of value) {
      if (typeof item === "string") values.push(item);
      else if (item && typeof item === "object") {
        values.push(item.url, item.imageUrl, item.imageURL, item.fullPathImageURI, item.thumbnail);
      }
    }
    return uniqueStrings(values);
  }
  if (typeof value === "string") {
    if (value.includes(",")) return uniqueStrings(value.split(","));
    return uniqueStrings([value]);
  }
  if (typeof value === "object") {
    return uniqueStrings([
      value.url,
      value.imageUrl,
      value.imageURL,
      value.mainImage,
      ...(Array.isArray(value.images) ? collectImages(value.images) : []),
      ...(Array.isArray(value.imageUrls) ? collectImages(value.imageUrls) : [])
    ]);
  }
  return [];
}

function normalizePriceRanges(product) {
  const candidate = firstDefined(product, [
    "saleInfo.priceRanges",
    "saleInfo.priceRangeList",
    "tradeInfo.priceRanges",
    "priceRanges",
    "priceRangeList",
    "wholesalePriceList"
  ]);
  const ranges = Array.isArray(candidate) ? candidate : [];
  const normalized = ranges.map((item) => ({
    startQuantity: toNumberValue(item?.startQuantity ?? item?.beginAmount ?? item?.minQuantity ?? item?.amount),
    endQuantity: toNumberValue(item?.endQuantity ?? item?.maxQuantity),
    price: toNumberValue(item?.price ?? item?.priceValue ?? item?.unitPrice)
  })).filter((item) => item.price !== null);
  normalized.sort((a, b) => (a.startQuantity ?? Number.MAX_SAFE_INTEGER) - (b.startQuantity ?? Number.MAX_SAFE_INTEGER));
  return normalized;
}

function normalizeSkuList(product) {
  const candidate = firstDefined(product, [
    "skuInfos",
    "skuList",
    "saleInfo.skuInfos",
    "saleInfo.skuList",
    "productSkuInfos"
  ]);
  if (!Array.isArray(candidate)) return [];
  return candidate.slice(0, 200).map((item) => ({
    skuId: toStringValue(item?.skuId ?? item?.skuID ?? item?.id),
    spec: toStringValue(item?.spec ?? item?.specName ?? item?.attributes ?? item?.specAttrs),
    price: toNumberValue(item?.price ?? item?.salePrice ?? item?.unitPrice),
    stock: toNumberValue(item?.stock ?? item?.amountOnSale ?? item?.canBookCount)
  }));
}

function normalizeAttributes(product) {
  const candidate = firstDefined(product, [
    "attributes",
    "attributeList",
    "productAttributeList",
    "productAttributes",
    "productAttribute"
  ]);
  if (Array.isArray(candidate)) {
    return candidate.slice(0, 100).map((item) => ({
      name: toStringValue(item?.name ?? item?.attributeName ?? item?.attrName ?? item?.key),
      value: toStringValue(item?.value ?? item?.attributeValue ?? item?.attrValue ?? item?.val)
    })).filter((item) => item.name || item.value);
  }
  if (candidate && typeof candidate === "object") {
    return Object.entries(candidate).slice(0, 100).map(([name, value]) => ({
      name: toStringValue(name),
      value: toStringValue(value) ?? (Array.isArray(value) ? uniqueStrings(value).join(" / ") : null)
    })).filter((item) => item.name || item.value);
  }
  return [];
}

function normalizeSupplier(product) {
  const source = firstDefined(product, ["supplierInfo", "sellerInfo", "companyInfo", "seller", "supplier"]);
  if (!source || typeof source !== "object") {
    return {
      name: toStringValue(firstDefined(product, ["supplierName", "sellerName", "companyName"])),
      memberId: toStringValue(firstDefined(product, ["supplierMemberId", "sellerMemberId", "memberId"]))
    };
  }
  return {
    name: toStringValue(source.companyName ?? source.name ?? source.sellerName ?? source.supplierName),
    memberId: toStringValue(source.memberId ?? source.memberID ?? source.sellerMemberId),
    shopUrl: toStringValue(source.shopUrl ?? source.homepageUrl ?? source.url)
  };
}

function findProductObject(payload) {
  const candidates = [
    payload?.result?.productInfo,
    payload?.result?.product,
    payload?.result?.item,
    payload?.result,
    payload?.productInfo,
    payload?.product,
    payload?.item,
    payload?.data?.productInfo,
    payload?.data?.product,
    payload?.data?.item,
    payload?.data
  ];
  return candidates.find((value) => value && typeof value === "object" && !Array.isArray(value)) || payload || {};
}

export function extract1688OfferId(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  if (/^\d{6,20}$/.test(raw)) return raw;

  const decoded = (() => {
    try { return decodeURIComponent(raw); } catch (_) { return raw; }
  })();

  const patterns = [
    /\/offer\/(\d{6,20})\.html/i,
    /[?&](?:offerId|offer_id|productId|product_id|itemId|item_id)=(\d{6,20})/i,
    /\b(\d{10,20})\b/
  ];
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function parseApiDescriptor(descriptor = DEFAULT_PRODUCT_API) {
  const raw = String(descriptor || "").trim();
  const colon = raw.indexOf(":");
  const dash = raw.lastIndexOf("-");
  if (colon <= 0 || dash <= colon + 1) throw new Error("Invalid 1688 API descriptor");
  const namespace = raw.slice(0, colon);
  const apiName = raw.slice(colon + 1, dash);
  const version = raw.slice(dash + 1);
  if (!namespace || !apiName || !version) throw new Error("Invalid 1688 API descriptor");
  return { namespace, apiName, version, descriptor: raw };
}

export function buildSigned1688Request({ apiBase = DEFAULT_API_BASE, appKey, appSecret, accessToken, descriptor = DEFAULT_PRODUCT_API, params = {} }) {
  if (!appKey || !appSecret) throw new Error("1688 app key/secret required");
  if (!accessToken) throw new Error("1688 access token required");
  const parsed = parseApiDescriptor(descriptor);
  const relative = `param2/${parsed.version}/${parsed.namespace}/${parsed.apiName}/`;
  const apiInfo = `${relative}${appKey}`;
  const businessParams = Object.fromEntries(Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== "").map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)]));
  const signedParams = { access_token: accessToken, ...businessParams };
  const factors = Object.entries(signedParams).map(([key, value]) => `${key}${value}`).sort();
  const signatureInput = `${apiInfo}${factors.join("")}`;
  const signature = crypto.createHmac("sha1", appSecret).update(signatureInput, "utf8").digest("hex").toUpperCase();
  const url = `${String(apiBase || DEFAULT_API_BASE).replace(/\/$/, "")}/${apiInfo}?_aop_signature=${signature}`;
  return { url, body: signedParams, signature, signatureInput, apiInfo, descriptor: parsed.descriptor };
}

function getConfig() {
  return {
    appKey: String(process.env.ALIBABA_1688_APP_KEY || "").trim(),
    appSecret: String(process.env.ALIBABA_1688_APP_SECRET || "").trim(),
    accessToken: String(process.env.ALIBABA_1688_ACCESS_TOKEN || "").trim(),
    refreshToken: String(process.env.ALIBABA_1688_REFRESH_TOKEN || "").trim(),
    tokenMode: String(process.env.ALIBABA_1688_TOKEN_MODE || "auto").trim().toLowerCase(),
    apiBase: String(process.env.ALIBABA_1688_API_BASE || DEFAULT_API_BASE).trim(),
    tokenUrl: String(process.env.ALIBABA_1688_TOKEN_URL || DEFAULT_TOKEN_URL).trim(),
    productApi: String(process.env.ALIBABA_1688_PRODUCT_API || DEFAULT_PRODUCT_API).trim(),
    authorizeUrl: String(process.env.ALIBABA_1688_AUTHORIZE_URL || DEFAULT_AUTHORIZE_URL).trim(),
    redirectUri: String(process.env.ALIBABA_1688_REDIRECT_URI || DEFAULT_REDIRECT_URI).trim()
  };
}

export function get1688RuntimeStatus() {
  const config = getConfig();
  const missing = [];
  if (!config.appKey) missing.push("ALIBABA_1688_APP_KEY");
  if (!config.appSecret) missing.push("ALIBABA_1688_APP_SECRET");
  if (!config.accessToken && config.tokenMode === "static") missing.push("ALIBABA_1688_ACCESS_TOKEN");
  const tokenAvailable = Boolean(config.accessToken || config.refreshToken || tokenCache?.accessToken);
  return {
    configured: missing.length === 0,
    ready: missing.length === 0 && tokenAvailable,
    authorized: Boolean(config.accessToken || config.refreshToken || tokenCache?.accessToken || tokenCache?.refreshToken),
    missing,
    tokenMode: config.accessToken ? "static_access_token" : config.refreshToken ? "refresh_token" : tokenCache?.refreshToken ? "oauth_session" : config.tokenMode,
    tokenCached: Boolean(tokenCache?.accessToken),
    refreshTokenCached: Boolean(tokenCache?.refreshToken),
    resourceOwner: tokenCache?.resourceOwner || null,
    memberId: tokenCache?.memberId || null,
    redirectUri: config.redirectUri,
    productApi: config.productApi,
    apiBase: config.apiBase
  };
}

function tokenEndpoint(config) {
  const base = String(config.tokenUrl || DEFAULT_TOKEN_URL).replace(/\/$/, "");
  return base.endsWith(`/${config.appKey}`) ? base : `${base}/${encodeURIComponent(config.appKey)}`;
}

function cacheAccessToken(payload, now = Date.now()) {
  const accessToken = payload?.access_token || payload?.accessToken;
  if (!accessToken) return null;
  const expiresIn = Number(payload?.expires_in || payload?.expiresIn || 36000);
  tokenCache = {
    accessToken: String(accessToken),
    expiresAt: now + Math.max(300, Number.isFinite(expiresIn) ? expiresIn : 36000) * 1000,
    refreshToken: payload?.refresh_token || payload?.refreshToken || tokenCache?.refreshToken || null,
    resourceOwner: payload?.resource_owner || payload?.resourceOwner || tokenCache?.resourceOwner || null,
    memberId: payload?.memberId || payload?.member_id || tokenCache?.memberId || null
  };
  return tokenCache.accessToken;
}

async function requestToken(config, values, failureCode) {
  const response = await fetch(tokenEndpoint(config), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "Accept": "application/json" },
    body: new URLSearchParams(values),
    signal: AbortSignal.timeout(15_000)
  });
  const text = await response.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch (_) { payload = { raw: text }; }
  const accessToken = cacheAccessToken(payload);
  if (!response.ok || !accessToken) {
    const error = new Error(payload?.error_description || payload?.error_message || payload?.message || "1688 token request failed");
    error.statusCode = 502;
    error.code = failureCode;
    error.remoteCode = payload?.error || payload?.error_code || payload?.code || null;
    error.remote = payload;
    throw error;
  }
  return accessToken;
}

async function requestRefreshToken(config, refreshToken = config.refreshToken) {
  return requestToken(config, {
    grant_type: "refresh_token",
    client_id: config.appKey,
    client_secret: config.appSecret,
    refresh_token: refreshToken
  }, "alibaba_1688_refresh_failed");
}

export function build1688AuthorizationUrl({ state, redirectUri } = {}) {
  const config = getConfig();
  if (!config.appKey || !config.appSecret) {
    const error = new Error("1688 app key/secret required before OAuth authorization");
    error.statusCode = 503;
    error.code = "alibaba_1688_not_configured";
    error.missing = [!config.appKey ? "ALIBABA_1688_APP_KEY" : null, !config.appSecret ? "ALIBABA_1688_APP_SECRET" : null].filter(Boolean);
    throw error;
  }
  const target = String(redirectUri || config.redirectUri || DEFAULT_REDIRECT_URI).trim();
  const url = new URL(config.authorizeUrl || DEFAULT_AUTHORIZE_URL);
  url.searchParams.set("client_id", config.appKey);
  url.searchParams.set("site", "1688");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", target);
  if (state) url.searchParams.set("state", String(state));
  return { url: url.toString(), redirectUri: target };
}

export async function exchange1688AuthorizationCode({ code, redirectUri } = {}) {
  const config = getConfig();
  if (!config.appKey || !config.appSecret) {
    const error = new Error("1688 app key/secret required before OAuth token exchange");
    error.statusCode = 503;
    error.code = "alibaba_1688_not_configured";
    error.missing = [!config.appKey ? "ALIBABA_1688_APP_KEY" : null, !config.appSecret ? "ALIBABA_1688_APP_SECRET" : null].filter(Boolean);
    throw error;
  }
  const authorizationCode = String(code || "").trim();
  if (!authorizationCode) {
    const error = new Error("1688 OAuth authorization code is required");
    error.statusCode = 400;
    error.code = "alibaba_1688_oauth_code_required";
    throw error;
  }
  const target = String(redirectUri || config.redirectUri || DEFAULT_REDIRECT_URI).trim();
  await requestToken(config, {
    grant_type: "authorization_code",
    need_refresh_token: "true",
    client_id: config.appKey,
    client_secret: config.appSecret,
    redirect_uri: target,
    code: authorizationCode
  }, "alibaba_1688_oauth_exchange_failed");
  return {
    authorized: Boolean(tokenCache?.accessToken),
    refreshTokenCached: Boolean(tokenCache?.refreshToken),
    resourceOwner: tokenCache?.resourceOwner || null,
    memberId: tokenCache?.memberId || null,
    redirectUri: target
  };
}

async function requestClientCredentialsToken(config) {
  return requestToken(config, {
    grant_type: "client_credentials",
    client_id: config.appKey,
    client_secret: config.appSecret
  }, "alibaba_1688_token_failed");
}

async function resolveAccessToken(config) {
  if (config.accessToken) return config.accessToken;
  if (config.tokenMode === "static") {
    const error = new Error("1688 permanent access token is not configured");
    error.statusCode = 503;
    error.code = "alibaba_1688_access_token_required";
    throw error;
  }
  if (tokenCache?.accessToken && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.accessToken;
  if (config.refreshToken) return requestRefreshToken(config, config.refreshToken);
  if (tokenCache?.refreshToken) return requestRefreshToken(config, tokenCache.refreshToken);
  if (config.tokenMode === "auto" || config.tokenMode === "client_credentials") {
    try {
      return await requestClientCredentialsToken(config);
    } catch (cause) {
      if (config.tokenMode === "client_credentials") throw cause;
      const error = new Error("1688 application requires account authorization before product APIs can be called");
      error.statusCode = 503;
      error.code = "alibaba_1688_authorization_required";
      error.remoteCode = cause?.remoteCode || null;
      error.cause = cause;
      throw error;
    }
  }
  const error = new Error("1688 access token is not configured");
  error.statusCode = 503;
  error.code = "alibaba_1688_access_token_required";
  throw error;
}

function normalizeWeight(product) {
  const explicit = [
    ["unitWeight", "unitWeightUnit"],
    ["weight", "weightUnit"],
    ["shippingInfo.unitWeight", "shippingInfo.weightUnit"],
    ["logisticsInfo.unitWeight", "logisticsInfo.weightUnit"]
  ];
  for (const [valuePath, unitPath] of explicit) {
    const value = toNumberValue(valueAt(product, valuePath));
    const unit = toStringValue(valueAt(product, unitPath));
    if (value === null || !unit) continue;
    const normalizedUnit = unit.toLowerCase();
    if (["g", "gram", "grams", "\u514b"].includes(normalizedUnit)) return { valueGrams: value, sourceUnit: unit, sourceValue: value };
    if (["kg", "kilogram", "kilograms", "\u5343\u514b", "\u516c\u65a4"].includes(normalizedUnit)) return { valueGrams: value * 1000, sourceUnit: unit, sourceValue: value };
    return { valueGrams: null, sourceUnit: unit, sourceValue: value };
  }
  return { valueGrams: null, sourceUnit: null, sourceValue: null };
}

export function normalize1688Product(payload, offerId, sourceUrl = null) {
  const product = findProductObject(payload);
  const imageCandidates = [
    firstDefined(product, ["mainImage", "mainImageUrl", "imageUrl", "imageURL", "picUrl"]),
    ...collectImages(firstDefined(product, ["image.images", "image.imageUrls", "images", "imageUrls", "mainImages", "productImage.images", "productImage.imageUrls"]))
  ];
  const images = uniqueStrings(imageCandidates);
  const priceRanges = normalizePriceRanges(product);
  const directPrice = toNumberValue(firstDefined(product, ["price", "unitPrice", "salePrice", "referencePrice", "saleInfo.price", "saleInfo.unitPrice"]));
  const firstTier = priceRanges[0] || null;
  const moq = toNumberValue(firstDefined(product, ["minOrderQuantity", "moq", "saleInfo.minOrderQuantity", "saleInfo.minOrder", "saleInfo.amountOnSale"])) ?? firstTier?.startQuantity ?? null;
  const weight = normalizeWeight(product);
  const skuList = normalizeSkuList(product);
  const supplier = normalizeSupplier(product);
  const attributes = normalizeAttributes(product);
  const title = toStringValue(firstDefined(product, ["subject", "title", "productTitle", "name", "productName"]));
  const unit = toStringValue(firstDefined(product, ["unit", "productUnit", "saleInfo.unit", "saleInfo.unitName"]));
  const categoryName = toStringValue(firstDefined(product, ["categoryName", "category.name", "categoryInfo.name"]));
  const categoryId = toStringValue(firstDefined(product, ["categoryID", "categoryId", "category.id", "categoryInfo.id"]));
  const productId = toStringValue(firstDefined(product, ["productId", "productID", "offerId", "offerID", "id"])) || String(offerId);

  return {
    source: "1688_open_platform",
    sourceUrl,
    offerId: String(offerId),
    productId,
    title,
    mainImage: images[0] || null,
    images,
    currency: "CNY",
    purchasePrice: directPrice ?? firstTier?.price ?? null,
    purchasePriceBasis: directPrice !== null ? "direct_price" : firstTier ? "first_price_tier" : null,
    minOrderQuantity: moq,
    unit,
    category: { id: categoryId, name: categoryName },
    supplier,
    attributes,
    attributeCount: attributes.length,
    weight,
    priceRanges,
    skus: skuList,
    skuCount: skuList.length,
    fetchedAt: new Date().toISOString(),
    factsAvailable: {
      title: Boolean(title),
      image: Boolean(images.length),
      purchasePrice: (directPrice ?? firstTier?.price ?? null) !== null,
      minOrderQuantity: moq !== null,
      supplier: Boolean(supplier?.name),
      attributes: attributes.length > 0,
      weightGrams: weight.valueGrams !== null,
      skus: skuList.length > 0
    }
  };
}

function detectRemoteError(payload) {
  const errorCode = payload?.errorCode || payload?.error_code || payload?.code;
  const errorMessage = payload?.errorMessage || payload?.error_message || payload?.message || payload?.exception;
  const success = payload?.success ?? payload?.result?.success;
  if ((success === false) || (errorCode && String(errorCode) !== "0" && String(errorCode).toLowerCase() !== "success")) {
    return { code: toStringValue(errorCode), message: toStringValue(errorMessage) || "1688 API returned an error" };
  }
  return null;
}

export async function fetch1688ProductByUrl(sourceUrl) {
  const offerId = extract1688OfferId(sourceUrl);
  if (!offerId) {
    const error = new Error("No 1688 offer id found in source URL");
    error.statusCode = 400;
    error.code = "invalid_1688_product_url";
    throw error;
  }

  const config = getConfig();
  const missing = [];
  if (!config.appKey) missing.push("ALIBABA_1688_APP_KEY");
  if (!config.appSecret) missing.push("ALIBABA_1688_APP_SECRET");
  if (missing.length) {
    const error = new Error(`1688 backend is not configured: ${missing.join(", ")}`);
    error.statusCode = 503;
    error.code = "alibaba_1688_not_configured";
    error.missing = missing;
    throw error;
  }

  const accessToken = await resolveAccessToken(config);
  const signed = buildSigned1688Request({
    apiBase: config.apiBase,
    appKey: config.appKey,
    appSecret: config.appSecret,
    accessToken,
    descriptor: config.productApi,
    params: { productId: offerId }
  });

  const response = await fetch(signed.url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "Accept": "application/json" },
    body: new URLSearchParams(signed.body),
    signal: AbortSignal.timeout(20_000)
  });
  const text = await response.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch (_) { payload = { raw: text }; }

  if (!response.ok) {
    const error = new Error(`1688 API HTTP ${response.status}`);
    error.statusCode = 502;
    error.code = "alibaba_1688_http_error";
    error.remoteStatus = response.status;
    error.remote = payload;
    throw error;
  }
  const remoteError = detectRemoteError(payload);
  if (remoteError) {
    const error = new Error(remoteError.message);
    error.statusCode = 502;
    error.code = "alibaba_1688_api_error";
    error.remoteCode = remoteError.code;
    error.remote = payload;
    throw error;
  }

  return {
    ok: true,
    offerId,
    api: config.productApi,
    product: normalize1688Product(payload, offerId, sourceUrl)
  };
}
