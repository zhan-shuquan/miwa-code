/* ========================================
   AIONE Preview Auth｜内測認証
   現在：Google Identity Services + AIONE内測メンバー照合。
   localhostのみ手動ID切替を開発フォールバックとして残す。
======================================== */

import { authConfig } from "../config/auth-config.js";
import { PREVIEW_IDENTITIES, findPreviewIdentity, findPreviewIdentityByEmail } from "../config/preview-identities.js";
import { recordPreviewActivity } from "./preview-activity.js";

const SESSION_KEY = "aione.preview.session.v3";
const LEGACY_SESSION_KEY = "aione.preview.subject";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isLocalFallbackAllowed() {
  return authConfig.localFallbackHosts.includes(window.location.hostname);
}

function decodeJwtPayload(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("google-id-token-invalid");
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}

function validateGooglePayload(payload) {
  if (!payload?.email) throw new Error("google-email-missing");
  if (payload.aud !== authConfig.googleClientId) throw new Error("google-client-id-mismatch");
  if (payload.exp && Number(payload.exp) * 1000 <= Date.now()) throw new Error("google-id-token-expired");
  if (payload.email_verified === false) throw new Error("google-email-not-verified");
}

async function loadAuthView() {
  const response = await fetch("./components/auth/preview-login.html", { cache: "no-store" });
  if (!response.ok) throw new Error("preview-auth-view-load-failed");
  const host = document.createElement("div");
  host.id = "aione-preview-auth-host";
  host.innerHTML = await response.text();
  document.body.appendChild(host);
  return host;
}

function renderAccounts(host, onSelect) {
  const fallback = host.querySelector("#aioneLocalIdentityFallback");
  const container = host.querySelector("#aionePreviewAccounts");
  if (!fallback || !container || !isLocalFallbackAllowed()) return;

  fallback.hidden = false;
  container.innerHTML = PREVIEW_IDENTITIES.map((identity) => `
    <button
      class="aione-preview-auth__account${identity.subjectType === "admin" ? " is-admin" : ""}"
      type="button"
      data-preview-subject="${escapeHtml(identity.subjectId)}"
    >
      <strong>${escapeHtml(identity.displayName)}</strong>
      <span>${escapeHtml(identity.primaryWorkIdentity)}</span>
      <small>${escapeHtml(identity.email)}</small>
    </button>
  `).join("");

  container.querySelectorAll("[data-preview-subject]").forEach((button) => {
    button.addEventListener("click", () => onSelect(button.dataset.previewSubject));
  });
}

function writeSession(identity, authSource, profile = {}) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    subjectId: identity.subjectId,
    authSource,
    authenticatedEmail: profile.email || identity.email,
    googleSub: profile.sub || null,
    loginAt: new Date().toISOString()
  }));
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
}

function readSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (raw) {
    try {
      const session = JSON.parse(raw);
      const identity = findPreviewIdentity(session.subjectId);
      return identity ? { identity, session } : null;
    } catch {
      clearSession();
    }
  }

  const legacySubjectId = sessionStorage.getItem(LEGACY_SESSION_KEY);
  const legacyIdentity = legacySubjectId ? findPreviewIdentity(legacySubjectId) : null;
  return legacyIdentity ? { identity: legacyIdentity, session: { authSource: "local", authenticatedEmail: legacyIdentity.email } } : null;
}

function toHeaderConfig(identity) {
  return {
    user: {
      employeeId: identity.subjectType === "person" ? identity.subjectId : null,
      adminIdentityId: identity.subjectType === "admin" ? identity.subjectId : null,
      subjectType: identity.subjectType,
      displayName: identity.displayName,
      initial: identity.initial,
      primaryWorkIdentity: identity.primaryWorkIdentity,
      positionGrade: identity.positionGrade || null,
      locationName: identity.locationName,
      timeZone: identity.timeZone,
      profileRoute: identity.subjectType === "person" ? "employee-profile" : "platform-admin"
    },
    permissions: [...identity.permissions]
  };
}

function renderSessionBadge(identity, session = {}) {
  document.querySelector(".aione-preview-session")?.remove();
  const isGoogle = session.authSource === "google";
  const badge = document.createElement("div");
  badge.className = "aione-preview-session";
  badge.innerHTML = `<span>内测｜<strong>${escapeHtml(identity.displayName)}</strong> · 全平台开放</span><button type="button">${isGoogle ? "退出登录" : "切换身份"}</button>`;
  badge.querySelector("button")?.addEventListener("click", () => {
    recordPreviewActivity(identity, isGoogle ? "session.logout.google" : "session.switch", {
      authenticatedEmail: session.authenticatedEmail || identity.email
    });
    clearSession();
    if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect();
    window.location.reload();
  });
  document.body.appendChild(badge);
}

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
      callback: (response) => {
        try {
          const payload = decodeJwtPayload(response?.credential);
          validateGooglePayload(payload);
          const identity = findPreviewIdentityByEmail(payload.email);
          if (!identity) {
            setGoogleStatus(host, `此Google账号尚未加入AIONE内测名单：${payload.email}`, "error");
            return;
          }
          setGoogleStatus(host, `登录成功：${identity.displayName}`, "success");
          onAuthenticated(identity, payload);
        } catch (error) {
          console.error(error);
          setGoogleStatus(host, "Google登录验证失败，请重试或联系AIONE管理员。", "error");
        }
      },
      auto_select: false,
      cancel_on_tap_outside: false
    });

    buttonHost.innerHTML = "";
    const width = Math.max(240, Math.min(560, Math.floor(buttonHost.getBoundingClientRect().width || 560)));
    window.google.accounts.id.renderButton(buttonHost, {
      ...authConfig.googleButton,
      width
    });
    setGoogleStatus(host, "请使用已加入内测名单的Google账号登录。", "neutral");
  } catch (error) {
    console.error(error);
    setGoogleStatus(host, "Google登录组件加载失败，请刷新页面后重试。", "error");
  }
}

export async function resolvePreviewIdentity() {
  const existing = readSession();
  if (existing) {
    window.AIONEPreviewIdentity = existing.identity;
    window.AIONEPreviewAuthSession = existing.session;
    renderSessionBadge(existing.identity, existing.session);
    recordPreviewActivity(existing.identity, "session.resume", {
      authSource: existing.session.authSource || "local",
      authenticatedEmail: existing.session.authenticatedEmail || existing.identity.email
    });
    return existing.identity;
  }

  const host = await loadAuthView();
  return new Promise((resolve) => {
    initGoogleSignIn(host, (identity, payload) => {
      writeSession(identity, "google", payload);
      window.AIONEPreviewIdentity = identity;
      window.AIONEPreviewAuthSession = {
        authSource: "google",
        authenticatedEmail: payload.email,
        googleSub: payload.sub || null
      };
      host.remove();
      renderSessionBadge(identity, window.AIONEPreviewAuthSession);
      recordPreviewActivity(identity, "session.login.google", {
        authenticatedEmail: payload.email,
        googleSub: payload.sub || null
      });
      resolve(identity);
    });

    renderAccounts(host, (subjectId) => {
      const identity = findPreviewIdentity(subjectId);
      if (!identity) return;
      writeSession(identity, "local", { email: identity.email });
      window.AIONEPreviewIdentity = identity;
      window.AIONEPreviewAuthSession = { authSource: "local", authenticatedEmail: identity.email };
      host.remove();
      renderSessionBadge(identity, window.AIONEPreviewAuthSession);
      recordPreviewActivity(identity, "session.login.local", { authenticatedEmail: identity.email });
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
    authenticatedEmail: authSession.authenticatedEmail || identity.email,
    subjectType: identity.subjectType,
    subjectId: identity.subjectId,
    permissions: Object.freeze([...identity.permissions]),
    scopes: identity.scopes,
    workAssignment: identity.workAssignment
  });
}
