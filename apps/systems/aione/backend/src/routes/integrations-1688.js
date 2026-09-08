import crypto from "node:crypto";
import { Router } from "express";
import {
  build1688AuthorizationUrl,
  exchange1688AuthorizationCode,
  extract1688OfferId,
  fetch1688ProductByUrl,
  get1688RuntimeStatus
} from "../integrations/alibaba1688-client.js";
import {
  fetch1688CrossProductByUrl,
  get1688CrossProductRuntimeStatus
} from "../integrations/alibaba1688-cross-client.js";

const router = Router();
const oauthStates = new Map();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function cleanupOAuthStates(now = Date.now()) {
  for (const [state, entry] of oauthStates.entries()) {
    if (!entry || entry.expiresAt <= now) oauthStates.delete(state);
  }
}

function oauthHtml({ ok, title, message, detail = "" }) {
  const safe = (value) => String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
  const accent = ok ? "#176B4D" : "#C83A32";
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(title)}</title><style>body{margin:0;background:#F7F7F3;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#17352B}.card{max-width:640px;margin:10vh auto;background:#fff;border:1px solid #DCE7E1;border-radius:18px;padding:32px;box-shadow:0 12px 35px rgba(13,73,55,.08)}.mark{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:${accent};color:#fff;font-weight:800;margin-bottom:18px}h1{font-size:24px;margin:0 0 12px}p{line-height:1.7;margin:8px 0}.detail{font-size:13px;color:#5D7069;background:#F4F8F6;border-radius:10px;padding:12px;margin-top:18px}</style></head><body><main class="card"><div class="mark">${ok ? "OK" : "!"}</div><h1>${safe(title)}</h1><p>${safe(message)}</p>${detail ? `<div class="detail">${safe(detail)}</div>` : ""}<p>此窗口可以关闭，然后返回 AIONE。</p></main><script>if(window.opener){try{window.opener.postMessage({type:"aione:1688-oauth",ok:${ok ? "true" : "false"}},"*");}catch(e){}}</script></body></html>`;
}

router.get("/status", (req, res) => {
  res.json({
    ok: true,
    integration: "1688",
    legacy: get1688RuntimeStatus(),
    crossProduct: get1688CrossProductRuntimeStatus()
  });
});

router.get("/oauth/start", (req, res, next) => {
  try {
    cleanupOAuthStates();
    const state = crypto.randomBytes(24).toString("hex");
    const requestedRedirectUri = String(req.query?.redirect_uri || "").trim() || undefined;
    const authorization = build1688AuthorizationUrl({ state, redirectUri: requestedRedirectUri });
    oauthStates.set(state, {
      redirectUri: authorization.redirectUri,
      expiresAt: Date.now() + OAUTH_STATE_TTL_MS
    });
    if (String(req.query?.response || "").toLowerCase() === "json") {
      res.json({ ok: true, authorizeUrl: authorization.url });
      return;
    }
    res.redirect(302, authorization.url);
  } catch (error) {
    next(error);
  }
});

router.get("/oauth/callback", async (req, res) => {
  cleanupOAuthStates();
  const state = String(req.query?.state || "").trim();
  const code = String(req.query?.code || "").trim();
  const providerError = String(req.query?.error || req.query?.error_description || "").trim();
  const entry = state ? oauthStates.get(state) : null;

  if (providerError) {
    if (state) oauthStates.delete(state);
    res.status(400).type("html").send(oauthHtml({
      ok: false,
      title: "1688 授权未完成",
      message: "1688 返回了授权失败或取消结果。",
      detail: providerError
    }));
    return;
  }
  if (!state || !entry) {
    res.status(400).type("html").send(oauthHtml({
      ok: false,
      title: "1688 授权状态已失效",
      message: "请回到 AIONE，再点击一次“授权1688”。"
    }));
    return;
  }
  if (!code) {
    oauthStates.delete(state);
    res.status(400).type("html").send(oauthHtml({
      ok: false,
      title: "1688 未返回授权码",
      message: "请重新发起授权；如果仍失败，请检查开放平台应用的回调地址配置。"
    }));
    return;
  }

  try {
    const result = await exchange1688AuthorizationCode({ code, redirectUri: entry.redirectUri });
    oauthStates.delete(state);
    res.type("html").send(oauthHtml({
      ok: true,
      title: "1688 授权成功",
      message: "AIONE 已获得本次 1688 账号授权。现在返回商品机会页面，再点击“读取并自动填充”。",
      detail: result.memberId ? `已授权成员：${result.memberId}` : "Access Token 已安全保存在当前 Backend 会话内。"
    }));
  } catch (error) {
    oauthStates.delete(state);
    res.status(502).type("html").send(oauthHtml({
      ok: false,
      title: "1688 授权码换取 Token 失败",
      message: "AppKey / AppSecret 已加载，但 OAuth Token 交换没有成功。",
      detail: `${error.code || "oauth_exchange_failed"}${error.remoteCode ? ` / ${error.remoteCode}` : ""}: ${error.message || "unknown error"}`
    }));
  }
});

router.post("/product-by-url", async (req, res, next) => {
  try {
    const url = String(req.body?.url || "").trim();
    if (!url) {
      const error = new Error("1688 source URL is required");
      error.statusCode = 400;
      error.code = "source_url_required";
      throw error;
    }
    const offerId = extract1688OfferId(url);
    if (!offerId) {
      const error = new Error("No 1688 offer id found in source URL");
      error.statusCode = 400;
      error.code = "invalid_1688_product_url";
      throw error;
    }
    const result = await fetch1688ProductByUrl(url);
    res.json({
      ...result,
      opportunityId: req.body?.opportunityId ? String(req.body.opportunityId) : null
    });
  } catch (error) {
    next(error);
  }
});

router.post("/cross-product-by-url", async (req, res, next) => {
  try {
    const url = String(req.body?.url || "").trim();
    if (!url) {
      const error = new Error("1688 source URL is required");
      error.statusCode = 400;
      error.code = "source_url_required";
      throw error;
    }
    const result = await fetch1688CrossProductByUrl(url);
    res.json({
      ...result,
      opportunityId: req.body?.opportunityId ? String(req.body.opportunityId) : null
    });
  } catch (error) {
    next(error);
  }
});

export default router;
