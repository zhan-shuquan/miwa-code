/* ========================================
   AIONE Preview Auth｜内测身份模拟
   当前目标：身份识别 + 全平台开放 + 工作归属记录。
   正式Google登录后可替换认证方式，但person_id与工作归属结构继续沿用。
======================================== */

import { PREVIEW_IDENTITIES, findPreviewIdentity } from "../config/preview-identities.js";
import { recordPreviewActivity } from "./preview-activity.js";

const SESSION_KEY = "aione.preview.subject";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  const container = host.querySelector("#aionePreviewAccounts");
  if (!container) return;

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

function writeSession(subjectId) {
  sessionStorage.setItem(SESSION_KEY, subjectId);
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function readSession() {
  const subjectId = sessionStorage.getItem(SESSION_KEY);
  return subjectId ? findPreviewIdentity(subjectId) : null;
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

function renderSessionBadge(identity) {
  document.querySelector(".aione-preview-session")?.remove();
  const badge = document.createElement("div");
  badge.className = "aione-preview-session";
  badge.innerHTML = `<span>内测｜<strong>${escapeHtml(identity.displayName)}</strong> · 全平台开放</span><button type="button">切换身份</button>`;
  badge.querySelector("button")?.addEventListener("click", () => {
    recordPreviewActivity(identity, "session.switch");
    clearSession();
    window.location.reload();
  });
  document.body.appendChild(badge);
}

export async function resolvePreviewIdentity() {
  const existing = readSession();
  if (existing) {
    window.AIONEPreviewIdentity = existing;
    renderSessionBadge(existing);
    recordPreviewActivity(existing, "session.resume");
    return existing;
  }

  const host = await loadAuthView();
  return new Promise((resolve) => {
    renderAccounts(host, (subjectId) => {
      const identity = findPreviewIdentity(subjectId);
      if (!identity) return;
      writeSession(identity.subjectId);
      window.AIONEPreviewIdentity = identity;
      host.remove();
      renderSessionBadge(identity);
      recordPreviewActivity(identity, "session.login");
      resolve(identity);
    });
  });
}

export function getPreviewHeaderConfig(identity) {
  return toHeaderConfig(identity);
}

export function getPreviewPermissionContext(identity) {
  return Object.freeze({
    mode: "preview-all-open",
    subjectType: identity.subjectType,
    subjectId: identity.subjectId,
    permissions: Object.freeze([...identity.permissions]),
    scopes: identity.scopes,
    workAssignment: identity.workAssignment
  });
}
