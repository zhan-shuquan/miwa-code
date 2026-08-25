import { getVercelOidcToken } from "@vercel/oidc";

const STS_URL = "https://sts.googleapis.com/v1/token";
const IAM_CREDENTIALS_BASE = "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts";
const ALLOWED_API_PATH = /^(?:v1(?:\/|$)|product-opportunities(?:\/|$))/;
const MAX_BODY_BYTES = 4 * 1024 * 1024;

let cachedRunIdToken = { token: "", expiresAt: 0 };

function requiredEnv() {
  const env = {
    backendUrl: String(process.env.AIONE_BACKEND_URL || "").replace(/\/$/, ""),
    projectNumber: String(process.env.GCP_PROJECT_NUMBER || "").trim(),
    serviceAccountEmail: String(process.env.GCP_SERVICE_ACCOUNT_EMAIL || "").trim(),
    poolId: String(process.env.GCP_WORKLOAD_IDENTITY_POOL_ID || "").trim(),
    providerId: String(process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID || "").trim()
  };
  const missing = Object.entries(env).filter(([, value]) => !value).map(([key]) => key);
  return { env, missing };
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch (_) {
    return {};
  }
}

function providerIdForVercelToken(env, token) {
  const payload = decodeJwtPayload(token);
  const issuer = String(payload.iss || "");
  const suffix = issuer === "https://oidc.vercel.com" ? "global" : "team";
  return `${env.providerId}-${suffix}`;
}

function gcpStsAudience(env, providerId) {
  return `//iam.googleapis.com/projects/${env.projectNumber}/locations/global/workloadIdentityPools/${env.poolId}/providers/${providerId}`;
}

function decodeJwtExpiry(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return 0;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const parsed = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    return Number(parsed.exp || 0) * 1000;
  } catch (_) {
    return 0;
  }
}

async function exchangeVercelOidcForFederatedToken(env) {
  const subjectToken = await getVercelOidcToken();
  if (!subjectToken) throw new Error("vercel_oidc_token_unavailable");
  const providerId = providerIdForVercelToken(env, subjectToken);
  const audience = gcpStsAudience(env, providerId);

  const response = await fetch(STS_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      audience,
      grantType: "urn:ietf:params:oauth:grant-type:token-exchange",
      requestedTokenType: "urn:ietf:params:oauth:token-type:access_token",
      scope: "https://www.googleapis.com/auth/cloud-platform",
      subjectTokenType: "urn:ietf:params:oauth:token-type:jwt",
      subjectToken
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    const claims = decodeJwtPayload(subjectToken);
    console.error("AIONE GCP STS exchange failed", {
      status: response.status,
      providerId,
      audience,
      oidcIssuer: claims.iss || "",
      oidcAudience: claims.aud || "",
      oidcSubject: claims.sub || "",
      gcpError: payload.error || "",
      gcpErrorDescription: payload.error_description || "",
    });
    const error = new Error("gcp_sts_exchange_failed");
    error.status = response.status;
    throw error;
  }
  return payload.access_token;
}

async function getCloudRunIdToken(env) {
  if (cachedRunIdToken.token && cachedRunIdToken.expiresAt > Date.now() + 120000) {
    return cachedRunIdToken.token;
  }

  const federatedToken = await exchangeVercelOidcForFederatedToken(env);
  const url = `${IAM_CREDENTIALS_BASE}/${encodeURIComponent(env.serviceAccountEmail)}:generateIdToken`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${federatedToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ audience: env.backendUrl, includeEmail: true })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.token) {
    const error = new Error("gcp_generate_id_token_failed");
    error.status = response.status;
    throw error;
  }

  cachedRunIdToken = {
    token: payload.token,
    expiresAt: decodeJwtExpiry(payload.token) || Date.now() + 45 * 60 * 1000
  };
  return cachedRunIdToken.token;
}

function enforceBodyLimit(value) {
  const size = Buffer.isBuffer(value) ? value.length : Buffer.byteLength(String(value));
  if (size > MAX_BODY_BYTES) {
    const error = new Error("request_body_too_large");
    error.status = 413;
    throw error;
  }
  return value;
}

async function readBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;

  // Vercel Node Functions expose a lazily parsed req.body. Prefer it when
  // available so JSON/form bodies are not lost after the platform parser runs.
  let parsedBody;
  try {
    parsedBody = req.body;
  } catch (error) {
    error.status = error.status || 400;
    throw error;
  }

  if (parsedBody !== undefined && parsedBody !== null) {
    if (Buffer.isBuffer(parsedBody)) return enforceBodyLimit(parsedBody);
    if (typeof parsedBody === "string") return enforceBodyLimit(parsedBody);
    return enforceBodyLimit(JSON.stringify(parsedBody));
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      const error = new Error("request_body_too_large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

function forwardHeaders(req, cloudRunToken) {
  const headers = new Headers();
  const copy = [
    "authorization",
    "content-type",
    "accept",
    "x-aione-source-system",
    "x-aione-person-id",
    "x-aione-assignment-id",
    "x-correlation-id"
  ];
  for (const key of copy) {
    const value = req.headers[key];
    if (typeof value === "string" && value) headers.set(key, value);
  }
  headers.set("x-serverless-authorization", `Bearer ${cloudRunToken}`);
  headers.set("x-aione-proxy", "vercel-wif-v1");
  return headers;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  try {
    const { env, missing } = requiredEnv();
    if (missing.length) {
      return sendJson(res, 503, { error: "aione_bridge_not_configured", missing });
    }

    const requestUrl = new URL(req.url || "/", "https://aione.miwa-happyhouse.com");
    const rawPath = String(requestUrl.searchParams.get("__aione_path") || "").replace(/^\/+/, "");
    requestUrl.searchParams.delete("__aione_path");
    if (!rawPath || !ALLOWED_API_PATH.test(rawPath) || rawPath.includes("..")) {
      return sendJson(res, 404, { error: "aione_bridge_path_not_allowed" });
    }

    const cloudRunToken = await getCloudRunIdToken(env);
    const body = await readBody(req);
    const query = requestUrl.searchParams.toString();
    const upstreamUrl = `${env.backendUrl}/api/${rawPath}${query ? `?${query}` : ""}`;
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: forwardHeaders(req, cloudRunToken),
      body,
      redirect: "manual"
    });

    res.statusCode = upstream.status;
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);
    res.setHeader("cache-control", "no-store");
    const correlationId = upstream.headers.get("x-correlation-id");
    if (correlationId) res.setHeader("x-correlation-id", correlationId);
    const location = upstream.headers.get("location");
    if (location) res.setHeader("location", location);
    const contentDisposition = upstream.headers.get("content-disposition");
    if (contentDisposition) res.setHeader("content-disposition", contentDisposition);
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error("AIONE Vercel bridge request failed", {
      name: error?.name || "Error",
      message: error?.message || "unknown",
      status: error?.status || null
    });
    return sendJson(res, Number(error?.status) || 502, { error: "aione_bridge_upstream_failed" });
  }
}
