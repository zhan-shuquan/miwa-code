/* ========================================
   AIONE Preview Auth｜内测认证
   Google Identity Services remains the login UX.
   Canonical identity authority is Backend -> people/external_identities.
   preview-identities.js is transitional UI metadata only (grade/assignment),
   not the authorization or person-id source.
======================================== */

import { authConfig } from "../config/auth-config.js?v=20260821-v1.0.9-header-sidebar";
import { findPreviewIdentity, findPreviewIdentityByEmail } from "../config/preview-identities.js?v=20260821-v1.0.9-header-sidebar";
import { recordPreviewActivity } from "./preview-activity.js?v=20260821-v1.0.9-header-sidebar";
import { aioneApi } from "../services/aione-api-client.js";

const SESSION_KEY = "aione.preview.session.v3";
const LEGACY_SESSION_KEY = "aione.preview.subject";
const resolveAppAsset = (path) => new URL(`../../${path}`, import.meta.url).href;

function decodeJwtPayload(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("google-id-token-invalid");
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function validateGooglePayload(payload) {
  if (!payload?.email) throw new Error("google-email-missing");
  if (payload.aud !== authConfig.googleClientId) throw new Error("google-client-id-mismatch");
  if (payload.exp && Number(payload.exp) * 1000 <= Date.now()) throw new Error("google-id-token-expired");
  if (payload.email_verified === false) throw new Error("google-email-not-verified");
}

async function loadAuthView() {
  const response = await fetch(resolveAppAsset("components/auth/preview-login.html"), { cache: "no-store" });
  if (!response.ok) throw new Error("preview-auth-view-load-failed");
  const host = document.createElement("div");
  host.id = "aione-preview-auth-host";
  host.innerHTML = await response.text();
  document.body.appendChild(host);
  return host;
}

function defaultPreviewUi(canonical) {
  const email = canonical.primaryEmail || canonical.authenticatedEmail || "";
  const displayName = canonical.displayName || email || "AIONE用户";
  return Object.freeze({
    subjectType: canonical.subjectType || "person",
    subjectId: canonical.personId || canonical.subjectId,
    email,
    displayName,
    initial: displayName.slice(0, 1),
    primaryWorkIdentity: "",
    positionGrade: "",
    locationName: "",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo",
    permissions: Object.freeze(["preview.all"]),
    scopes: Object.freeze({ businessSpaces:Object.freeze(["all"]), stores:Object.freeze(["all"]), dataLevel:"preview-all", decisionLevel:"preview-all" }),
    workAssignment: Object.freeze({})
  });
}

function mergeCanonicalIdentity(canonical, payload = {}) {
  const previewUi =
    findPreviewIdentity(canonical.personId || canonical.subjectId) ||
    findPreviewIdentityByEmail(canonical.primaryEmail || canonical.authenticatedEmail || payload.email) ||
    defaultPreviewUi(canonical);

  return Object.freeze({
    ...previewUi,
    subjectType: canonical.subjectType || previewUi.subjectType,
    subjectId: canonical.personId || canonical.subjectId || previewUi.subjectId,
    email: canonical.primaryEmail || canonical.authenticatedEmail || previewUi.email,
    displayName: canonical.displayName || previewUi.displayName,
    canonicalIdentitySource: canonical.identitySource || "unknown"
  });
}

async function resolveCanonicalIdentity(googleCredential, payload = {}) {
  const canonical = await aioneApi("/api/v1/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${String(googleCredential || "").trim()}` }
  });
  if (!canonical?.subjectId) throw new Error("canonical-current-user-missing");
  return mergeCanonicalIdentity(canonical, payload);
}

function writeSession(identity, authSource, profile = {}, googleCredential = "") {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    subjectId: identity.subjectId,
    authSource,
    authenticatedEmail: profile.email || identity.email,
    googleSub: profile.sub || null,
    googlePicture: profile.picture || null,
    googleCredential: String(googleCredential || ""),
    googleExpiresAt: profile.exp ? Number(profile.exp) * 1000 : 0,
    loginAt: new Date().toISOString()
  }));
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
}

function publicAuthSession(session = {}) {
  return {
    authSource: session.authSource || "google",
    authenticatedEmail: session.authenticatedEmail || null,
    googleSub: session.googleSub || null,
    googlePicture: session.googlePicture || null,
    googleExpiresAt: Number(session.googleExpiresAt || 0),
    loginAt: session.loginAt || null
  };
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
}

function readStoredSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    return null;
  }
  try {
    const session = JSON.parse(raw);
    if (session.authSource !== "google" || !session.googleCredential) throw new Error("google-session-invalid");
    const payload = decodeJwtPayload(session.googleCredential);
    validateGooglePayload(payload);
    session.googleExpiresAt = Number(payload.exp || 0) * 1000;
    return { session, payload };
  } catch (_) {
    clearSession();
    return null;
  }
}

function toHeaderConfig(identity) {
  const assignment = identity.workAssignment || {};
  const authSession = window.AIONEPreviewAuthSession || {};
  return {
    user: {
      employeeId: identity.subjectType === "person" ? identity.subjectId : null,
      adminIdentityId: identity.subjectType === "admin" ? identity.subjectId : null,
      subjectType: identity.subjectType,
      displayName: identity.displayName,
      initial: identity.initial,
      avatarUrl: authSession.googlePicture || null,
      email: identity.email || authSession.authenticatedEmail,
      primaryWorkIdentity: identity.primaryWorkIdentity,
      positionGrade: identity.positionGrade || null,
      primaryResponsibility: assignment.primaryResponsibility || null,
      primaryProject: assignment.primaryProject || (assignment.store && assignment.store !== "全部" ? assignment.store : null),
      legalEntity: assignment.businessUnit || null,
      locationName: identity.locationName,
      timeZone: identity.timeZone,
      profileRoute: identity.subjectType === "person" ? "employee-profile" : "platform-admin"
    },
    permissionMode: "open"
  };
}

export function logoutPreviewIdentity(reason = "user") {
  const identity = window.AIONEPreviewIdentity || null;
  const session = window.AIONEPreviewAuthSession || {};
  if (identity) {
    recordPreviewActivity(identity, "session.logout.google", { authenticatedEmail: session.authenticatedEmail || identity.email, reason });
  }
  clearSession();
  delete window.AIONEPreviewIdentity;
  delete window.AIONEPreviewAuthSession;
  delete window.AIONEPreviewPermissionContext;
  delete window.AIONEPreviewActivity;
  try { if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect(); } catch (error) { console.warn("AIONE Google logout cleanup skipped", error); }
  window.location.replace(`${window.location.pathname}${window.location.search}`);
}

window.addEventListener("aione:preview-logout-request", () => logoutPreviewIdentity("header-user-menu"));

function setGoogleStatus(host, message, tone = "neutral") {
  const status = host.querySelector("#aioneGoogleAuthStatus");
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-aione-google-identity="true"]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = authConfig.googleScriptUrl;
    script.async = true;
    script.defer = true;
    script.dataset.aioneGoogleIdentity = "true";
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", () => reject(new Error("google-identity-script-load-failed")), { once: true });
    document.head.appendChild(script);
  });
}

async function initGoogleSignIn(host, onAuthenticated) {
  const buttonHost = host.querySelector("#aioneGoogleSignInButton");
  if (!buttonHost) return;
  try {
    await loadGoogleIdentityScript();
    if (!window.google?.accounts?.id) throw new Error("google-identity-unavailable");
    window.google.accounts.id.initialize({
      client_id: authConfig.googleClientId,
      callback: async (response) => {
        try {
          const payload = decodeJwtPayload(response?.credential);
          validateGooglePayload(payload);
          setGoogleStatus(host, "正在确认AIONE人员身份…", "neutral");
          const identity = await resolveCanonicalIdentity(response.credential, payload);
          setGoogleStatus(host, `登录成功：${identity.displayName}`, "success");
          await onAuthenticated(identity, payload, response.credential);
        } catch (error) {
          console.error(error);
          if (error?.status === 403) setGoogleStatus(host, "此Google账号尚未登记为有效AIONE人员。", "error");
          else setGoogleStatus(host, "Google登录或AIONE身份确认失败，请重试。", "error");
        }
      },
      auto_select: false,
      cancel_on_tap_outside: false
    });
    buttonHost.innerHTML = "";
    const width = Math.max(240, Math.min(560, Math.floor(buttonHost.getBoundingClientRect().width || 560)));
    window.google.accounts.id.renderButton(buttonHost, { ...authConfig.googleButton, width });
    setGoogleStatus(host, "请使用已登记的Google账号登录。", "neutral");
  } catch (error) {
    console.error(error);
    setGoogleStatus(host, "Google登录组件加载失败，请刷新页面后重试。", "error");
  }
}

export async function resolvePreviewIdentity() {
  const existing = readStoredSession();
  if (existing) {
    try {
      const identity = await resolveCanonicalIdentity(existing.session.googleCredential, existing.payload);
      writeSession(identity, "google", existing.payload, existing.session.googleCredential);
      window.AIONEPreviewIdentity = identity;
      window.AIONEPreviewAuthSession = publicAuthSession({ ...existing.session, googleExpiresAt:Number(existing.payload.exp || 0) * 1000 });
      recordPreviewActivity(identity, "session.resume", { authSource:"google", authenticatedEmail:existing.payload.email, identitySource:identity.canonicalIdentitySource });
      return identity;
    } catch (error) {
      console.warn("Stored AIONE session no longer resolves to a canonical identity", error);
      clearSession();
    }
  }

  const host = await loadAuthView();
  return new Promise((resolve) => {
    initGoogleSignIn(host, async (identity, payload, googleCredential) => {
      writeSession(identity, "google", payload, googleCredential);
      window.AIONEPreviewIdentity = identity;
      window.AIONEPreviewAuthSession = publicAuthSession({
        authSource:"google",
        authenticatedEmail:payload.email,
        googleSub:payload.sub || null,
        googlePicture:payload.picture || null,
        googleExpiresAt:Number(payload.exp || 0) * 1000,
        loginAt:new Date().toISOString()
      });
      host.remove();
      recordPreviewActivity(identity, "session.login.google", { authenticatedEmail:payload.email, googleSub:payload.sub || null, identitySource:identity.canonicalIdentitySource });
      resolve(identity);
    });
  });
}

export function getPreviewHeaderConfig(identity) {
  return toHeaderConfig(identity);
}

export function getPreviewPermissionContext(identity) {
  const authSession = window.AIONEPreviewAuthSession || {};
  return Object.freeze({
    mode: "preview-all-open",
    authSource: authSession.authSource || "unknown",
    authenticatedEmail: identity.email || authSession.authenticatedEmail,
    subjectType: identity.subjectType,
    subjectId: identity.subjectId,
    permissions: Object.freeze([...(identity.permissions || [])]),
    scopes: identity.scopes || Object.freeze({}),
    workAssignment: identity.workAssignment || Object.freeze({}),
    identitySource: identity.canonicalIdentitySource || "unknown"
  });
}
