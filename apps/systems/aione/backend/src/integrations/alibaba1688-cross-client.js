import crypto from "node:crypto";
import { extract1688OfferId, normalize1688Product } from "./alibaba1688-client.js";

const API_BASE = "https://gw.open.1688.com/openapi";
const API_VERSION = "1";
const API_NAMESPACE = "com.alibaba.fenxiao";
const API_NAME = "cross.productInfo.get";
const API_DESCRIPTOR = `${API_NAMESPACE}:${API_NAME}-${API_VERSION}`;

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    const error = new Error(`${name} is not configured.`);
    error.statusCode = 503;
    error.code = "alibaba_1688_not_configured";
    error.missing = [name];
    throw error;
  }
  return value;
}

function signRequest({ appKey, appSecret, accessToken, params }) {
  const apiInfo = `param2/${API_VERSION}/${API_NAMESPACE}/${API_NAME}/${appKey}`;
  const signedParams = {
    access_token: accessToken,
    ...Object.fromEntries(
      Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
    )
  };
  const factors = Object.entries(signedParams)
    .map(([key, value]) => `${key}${String(value)}`)
    .sort();
  const signatureInput = `${apiInfo}${factors.join("")}`;
  const signature = crypto
    .createHmac("sha1", appSecret)
    .update(signatureInput, "utf8")
    .digest("hex")
    .toUpperCase();
  const url = `${API_BASE}/${apiInfo}?_aop_signature=${signature}`;
  return { url, body: signedParams };
}

function remoteError(payload) {
  const success = payload?.success;
  const code = payload?.errorCode || payload?.error_code || payload?.code;
  const message = payload?.errorMsg || payload?.errorMessage || payload?.message;
  if (success === false || (code && String(code) !== "0" && String(code).toLowerCase() !== "success")) {
    return { code: String(code || "unknown"), message: String(message || "1688 API returned an error") };
  }
  return null;
}

export function get1688CrossProductRuntimeStatus() {
  const missing = [];
  if (!String(process.env.ALIBABA_1688_APP_KEY || "").trim()) missing.push("ALIBABA_1688_APP_KEY");
  if (!String(process.env.ALIBABA_1688_APP_SECRET || "").trim()) missing.push("ALIBABA_1688_APP_SECRET");
  if (!String(process.env.ALIBABA_1688_ACCESS_TOKEN || "").trim()) missing.push("ALIBABA_1688_ACCESS_TOKEN");
  return {
    api: API_DESCRIPTOR,
    ready: missing.length === 0,
    missing
  };
}

export async function fetch1688CrossProductByUrl(sourceUrl) {
  const offerId = extract1688OfferId(sourceUrl);
  if (!offerId) {
    const error = new Error("No 1688 offer id found in source URL");
    error.statusCode = 400;
    error.code = "invalid_1688_product_url";
    throw error;
  }

  const appKey = requiredEnv("ALIBABA_1688_APP_KEY");
  const appSecret = requiredEnv("ALIBABA_1688_APP_SECRET");
  const accessToken = requiredEnv("ALIBABA_1688_ACCESS_TOKEN");

  const signed = signRequest({
    appKey,
    appSecret,
    accessToken,
    params: {
      offerId,
      offerUrl: sourceUrl
    }
  });

  const response = await fetch(signed.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Accept: "application/json"
    },
    body: new URLSearchParams(signed.body),
    signal: AbortSignal.timeout(20_000)
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (_) {
    payload = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(`1688 API HTTP ${response.status}`);
    error.statusCode = 502;
    error.code = "alibaba_1688_http_error";
    error.remoteStatus = response.status;
    error.remote = payload;
    throw error;
  }

  const detected = remoteError(payload);
  if (detected) {
    const error = new Error(detected.message);
    error.statusCode = 502;
    error.code = "alibaba_1688_api_error";
    error.remoteCode = detected.code;
    error.remote = payload;
    throw error;
  }

  return {
    ok: true,
    offerId,
    api: API_DESCRIPTOR,
    product: normalize1688Product(payload, offerId, sourceUrl),
    rawProductInfoAvailable: Boolean(payload?.productInfo)
  };
}
