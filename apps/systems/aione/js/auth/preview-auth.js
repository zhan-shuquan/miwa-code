/* ========================================
   AIONE Preview Auth｜内測認証
   Google Identity Services + AIONE内測メンバー照合のみを使用する。
   ローカル手動ID切替は設けず、開発時も実際のGoogle認証経路を確認する。
======================================== */

import { authConfig } from "../config/auth-config.js?v=20260821-v1.0.9-header-sidebar";
import { findPreviewIdentity, findPreviewIdentityByEmail } from "../config/preview-identities.js?v=20260821-v1.0.9-header-sidebar";
import { recordPreviewActivity } from "./preview-activity.js?v=20260821-v1.0.9-header-sidebar";

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
  const response = await fetch(resolveAppAsset("components/auth/preview-login.html"), { cache: "no-store" });
  if (!response.ok) throw new Error("preview-auth-view-load-failed");
  const host = document.createElement("div");
  host.id = "aione-preview-auth-host";
  host.innerHTML = await response.text();
  document.body.appendChild(host);
  return host;
}

function writeSession(identity, authSource, profile = {}) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    subjectId: identity.subjectId,
    authSource,
    authenticatedEmail: profile.email || identity.email,
    googleSub: profile.sub || null,
    googlePicture: profile.picture || null,
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
      if (session.authSource !== "google") {
        clearSession();
        return null;
      }
      const identity = findPreviewIdentity(session.subjectId);
      return identity ? { identity, session } : null;
    } catch {
      clearSession();
    }
  }

  sessionStorage.removeItem(LEGACY_SESSION_KEY);
  return null;
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
      email: authSession.authenticatedEmail || identity.email,
      primaryWorkIdentity: identity.primaryWorkIdentity,
      positionGrade: identity.positionGrade || null,
      primaryResponsibility: assignment.primaryResponsibility || null,
      primaryProject:
        assignment.primaryProject ||
        (assignment.store && assignment.store !== "全部" ? assignment.store : null),
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
    recordPreviewActivity(identity, "session.logout.google", {
      authenticatedEmail: session.authenticatedEmail || identity.email,
      reason
    });
  }

  clearSession();
  delete window.AIONEPreviewIdentity;
  delete window.AIONEPreviewAuthSession;
  delete window.AIONEPreviewPermissionContext;
  delete window.AIONEPreviewActivity;

  try {
    if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect();
  } catch (error) {
    console.warn("AIONE Google logout cleanup skipped", error);
  }

  // Remove the hash so logout always returns to the Preview login entry.
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.location.replace(cleanUrl);
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
    recordPreviewActivity(existing.identity, "session.resume", {
      authSource: "google",
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
        googleSub: payload.sub || null,
        googlePicture: payload.picture || null,
        loginAt: new Date().toISOString()
      };
      host.remove();
      recordPreviewActivity(identity, "session.login.google", {
        authenticatedEmail: payload.email,
        googleSub: payload.sub || null
      });
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
