import { getActiveSystemParameters } from "../shell/system-settings.js";
import { initSelectionWorkbenchCurrent } from "./selection-workbench-current.js";

export function getObjectPolicies() {
  const params = getActiveSystemParameters?.() || {};
  return {
    createAllowed: params.permissions?.allowCreate !== false,
    importAllowed: params.permissions?.allowImport !== false && (params.io?.allowCsv !== false || params.io?.allowExcel !== false),
    exportAllowed: params.permissions?.allowExport !== false
  };
}

export function openSelectionRecordDetail({ id, type = "", mode = "edit" } = {}) {
  const recordId = String(id || "").trim();
  if (!recordId || mode === "create") return false;
  const routeParams = new URLSearchParams();
  routeParams.set("mode", "edit");
  if (type) routeParams.set("selection_type", type);
  const target = new URL("./index.html", window.location.href);
  target.search = "";
  const query = routeParams.toString();
  target.hash = `/selection/opportunity/${encodeURIComponent(recordId)}${query ? `?${query}` : ""}`;
  window.location.href = target.href;
  return true;
}

// CURRENT：创建/导入入口由 canonical Selection renderer 直接控制；
// 不再导出 Preview localStorage workspace、MutationObserver overlay 或浏览器内正式数据写入能力。
export async function initSelectionWorkbench() {
  return initSelectionWorkbenchCurrent();
}
