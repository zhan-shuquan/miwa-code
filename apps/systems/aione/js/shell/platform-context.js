/* ========================================
   AIONE Platform Context｜平台上下文单一来源
   Phase 1 contract:
   公司 -> 事业 -> 人 -> 工作 -> 时间 -> 业务执行
   Header负责建立上下文；Sidebar/Aside在后续阶段按上下文生成内容。
======================================== */

import { BUSINESS_SPACES, getBusinessSpaceForRoute } from "../config/business-navigation.js";

const STORAGE_KEY = "aione.currentBusinessSpace";
const EVENT_NAME = "aione:platform-context-change";

export const PLATFORM_CONTEXT_SEQUENCE = Object.freeze([
  Object.freeze({ id: "company", label: "公司", owner: "header" }),
  Object.freeze({ id: "business", label: "事业", owner: "header" }),
  Object.freeze({ id: "person", label: "人", owner: "header" }),
  Object.freeze({ id: "work", label: "工作", owner: "header" }),
  Object.freeze({ id: "time", label: "时间", owner: "header" }),
  Object.freeze({ id: "execution", label: "业务执行", owner: "sidebar" })
]);

function getRouteId(hash = window.location.hash) {
  return String(hash || "").replace(/^#\/?/, "").split(/[/?]/)[0] || "work";
}

function readStoredBusinessSpaceId() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return BUSINESS_SPACES[saved] ? saved : null;
  } catch {
    return null;
  }
}

function writeStoredBusinessSpaceId(spaceId) {
  try { window.localStorage.setItem(STORAGE_KEY, spaceId); } catch { /* no-op */ }
}

function resolveBusinessSpaceId(hash = window.location.hash) {
  const routeSpace = getBusinessSpaceForRoute(getRouteId(hash));
  return routeSpace?.id || readStoredBusinessSpaceId() || Object.keys(BUSINESS_SPACES)[0] || "crossborder";
}

let currentBusinessSpaceId = resolveBusinessSpaceId();

export function getBusinessSpaceOptions() {
  return Object.values(BUSINESS_SPACES).map((space) => ({
    id: space.id,
    label: space.label,
    shortLabel: space.shortLabel || space.label,
    defaultRoute: space.defaultRoute
  }));
}

export function getCurrentBusinessSpaceId() {
  return currentBusinessSpaceId;
}

export function getCurrentBusinessSpace() {
  return BUSINESS_SPACES[currentBusinessSpaceId] || BUSINESS_SPACES[Object.keys(BUSINESS_SPACES)[0]] || null;
}

export function getPlatformContextSnapshot() {
  const business = getCurrentBusinessSpace();
  return Object.freeze({
    routeId: getRouteId(),
    businessSpaceId: business?.id || null,
    businessLabel: business?.label || "待确认事业",
    businessShortLabel: business?.shortLabel || business?.label || "事业",
    sequence: PLATFORM_CONTEXT_SEQUENCE
  });
}

function dispatchContextChange(reason = "sync") {
  const detail = { ...getPlatformContextSnapshot(), reason };
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
  return detail;
}

export function setCurrentBusinessSpace(spaceId, options = {}) {
  const space = BUSINESS_SPACES[spaceId];
  if (!space) return false;

  const changed = currentBusinessSpaceId !== space.id;
  currentBusinessSpaceId = space.id;
  writeStoredBusinessSpaceId(space.id);

  if (changed || options.forceEvent) dispatchContextChange(options.reason || "business-change");

  if (options.navigate === true) {
    const targetRoute = options.route || space.defaultRoute;
    if (targetRoute) window.location.hash = `#/${targetRoute}`;
  }

  return true;
}

export function syncPlatformContextFromRoute(options = {}) {
  const routeSpace = getBusinessSpaceForRoute(getRouteId());
  if (routeSpace) {
    return setCurrentBusinessSpace(routeSpace.id, {
      reason: options.reason || "route-sync",
      forceEvent: options.forceEvent === true
    });
  }

  if (options.forceEvent === true) dispatchContextChange(options.reason || "route-sync");
  return false;
}

export function subscribePlatformContext(listener) {
  if (typeof listener !== "function") return () => {};
  const wrapped = (event) => listener(event.detail);
  window.addEventListener(EVENT_NAME, wrapped);
  return () => window.removeEventListener(EVENT_NAME, wrapped);
}

export function initPlatformContext() {
  syncPlatformContextFromRoute({ reason: "startup", forceEvent: true });

  window.AIONEPlatformContext = Object.freeze({
    sequence: PLATFORM_CONTEXT_SEQUENCE,
    getSnapshot: getPlatformContextSnapshot,
    getBusinessSpace: getCurrentBusinessSpace,
    getBusinessSpaces: getBusinessSpaceOptions,
    setBusinessSpace: setCurrentBusinessSpace,
    syncFromRoute: syncPlatformContextFromRoute
  });

  return getPlatformContextSnapshot();
}
