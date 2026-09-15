import { aioneApi } from "../services/aione-api-client.js";

const BUTTON_MARK = "data-selection-intake-entry";
const DIALOG_MARK = "data-selection-intake-gate0a";
const SUCCESS_KEY = "aione.selection-intake.success";

const roleOf = (file) => {
  const value = `${file.webkitRelativePath || ""}/${file.name || ""}`.toLowerCase();
  if (/(^|[\\/_-])sku([\\/_-]|\.)/.test(value)) return "SKU图";
  if (value.includes("详情")) return "详情图";
  if (value.includes("白底")) return "白底图";
  if (value.includes("主图")) return "主图";
  if (value.includes("实拍")) return "实拍图";
  return "其他";
};

function manifestFromFiles(fileList) {
  const files = [...(fileList || [])].map((file) => ({
    name: file.name,
    relativePath: file.webkitRelativePath || file.name,
    size: file.size,
    lastModified: file.lastModified,
    role: roleOf(file)
  }));
  const roleCounts = files.reduce((out, file) => {
    out[file.role] = (out[file.role] || 0) + 1;
    return out;
  }, {});
  return {
    folderName: files[0]?.relativePath?.split("/")?.[0] || "",
    files,
    roleCounts,
    hasOriginalHero: Boolean(roleCounts["主图"])
  };
}

function text(row, key) { return String(row?.[key] ?? "").trim(); }
function tags(row) { return text(row, "标签").split(/[,，、]/).map((x) => x.trim()).filter(Boolean); }

function rowsToRecords(rows) {
  return rows.filter((row) => Object.values(row || {}).some((v) => String(v ?? "").trim())).map((row) => ({
    title: text(row, "商品标题") || text(row, "商品名称"),
    sourceRef: text(row, "商品ID"),
    sourceUrl: text(row, "商品链接") || text(row, "采购来源链接") || text(row, "采购来源网址"),
    sourceCoverImageUrl: text(row, "图片地址") || text(row, "选品代表图链接"),
    sourcePrice: text(row, "商品价格"),
    sourceAddedAt: text(row, "加入时间"),
    sourcePlatform: text(row, "平台") || "1688",
    sourceSupplierName: text(row, "店铺名称"),
    sourceGroup: text(row, "所属分组"),
    sourceTags: tags(row),
    sourceNote: text(row, "备注"),
    sourceWeightG: /^\d+(?:\.\d+)?$/.test(text(row, "备注")) ? text(row, "备注") : null,
    sourceCurrency: "CNY"
  }));
}

async function parseExcel(file) {
  if (!window.XLSX) throw new Error("Excel解析组件未加载，请刷新页面重试。");
  const workbook = window.XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("Excel没有可读取工作表。");
  const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const records = rowsToRecords(rows);
  if (!records.length) throw new Error("Excel中没有可导入数据。");
  const invalid = records.filter((record) => !record.title || (!record.sourceRef && !record.sourceUrl));
  if (invalid.length) throw new Error(`有 ${invalid.length} 条记录缺少商品标题或商品ID/链接。`);
  return records;
}

function showSuccessToast(message) {
  const old = document.querySelector("[data-selection-intake-toast]");
  if (old) old.remove();
  const toast = document.createElement("div");
  toast.setAttribute("data-selection-intake-toast", "true");
  toast.textContent = message;
  toast.style.cssText = "position:fixed;right:24px;bottom:24px;z-index:10000;max-width:min(520px,calc(100vw - 48px));padding:12px 16px;border-radius:12px;background:#176b4d;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.18);font-weight:650;line-height:1.5";
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 5000);
}

function restoreSuccessToast() {
  try {
    const raw = window.sessionStorage.getItem(SUCCESS_KEY);
    if (!raw) return;
    window.sessionStorage.removeItem(SUCCESS_KEY);
    const payload = JSON.parse(raw);
    const created = Number(payload?.createdCount || 0);
    const updated = Number(payload?.updatedCount || 0);
    const ids = Array.isArray(payload?.ids) ? payload.ids.filter(Boolean) : [];
    const suffix = ids.length === 1 ? `｜编号 ${ids[0]}` : ids.length > 1 ? `｜${ids.length} 条记录已处理` : "";
    showSuccessToast(`导入完成：新增 ${created}，更新 ${updated}${suffix}`);
  } catch {
    window.sessionStorage.removeItem(SUCCESS_KEY);
  }
}

function ensureDialog() {
  let dialog = document.getElementById("selection-intake-gate0a-dialog");
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.id = "selection-intake-gate0a-dialog";
  dialog.setAttribute(DIALOG_MARK, "true");
  dialog.innerHTML = `
    <form method="dialog" class="selection-intake-g0a">
      <header><div><small>Gate 0A</small><h2>导入选品</h2><p>1688 Excel → 本地素材识别 → 真实商品机会。当前步骤不会创建正式商品。</p></div><button value="cancel" aria-label="关闭">×</button></header>
      <label>选品方式<select data-intake-type><option value="直发选品">直发选品</option><option value="常规选品">常规选品</option></select></label>
      <label>1688 Excel<input data-intake-excel type="file" accept=".xlsx" required></label>
      <label>本地产品素材文件夹<input data-intake-folder type="file" webkitdirectory directory multiple></label>
      <div data-intake-summary class="selection-intake-g0a__summary">尚未读取素材。没有原始主图不会阻断导入。</div>
      <div data-intake-result class="selection-intake-g0a__result" hidden></div>
      <footer><button value="cancel">取消</button><button type="button" data-intake-submit>校验并创建商品机会</button></footer>
    </form>`;
  document.body.appendChild(dialog);
  if (!document.getElementById("selection-intake-g0a-style")) {
    const style = document.createElement("style");
    style.id = "selection-intake-g0a-style";
    style.textContent = `#selection-intake-gate0a-dialog{border:0;border-radius:18px;padding:0;max-width:720px;width:min(92vw,720px);box-shadow:0 20px 70px rgba(0,0,0,.2)}#selection-intake-gate0a-dialog::backdrop{background:rgba(20,30,25,.28)}.selection-intake-g0a{padding:24px;display:grid;gap:16px}.selection-intake-g0a header{display:flex;justify-content:space-between;gap:20px}.selection-intake-g0a h2{margin:2px 0 6px}.selection-intake-g0a header p{margin:0;color:#627069}.selection-intake-g0a label{display:grid;gap:7px;font-weight:650}.selection-intake-g0a input,.selection-intake-g0a select{padding:11px;border:1px solid #d9e2dd;border-radius:10px;background:#fff}.selection-intake-g0a__summary,.selection-intake-g0a__result{padding:12px 14px;border-radius:12px;background:#f4f8f6;line-height:1.6}.selection-intake-g0a__result.is-error{background:#fff0ef;color:#9b2c25}.selection-intake-g0a footer{display:flex;justify-content:flex-end;gap:10px}.selection-intake-g0a button{border:1px solid #d3ddd7;border-radius:10px;padding:10px 14px;background:#fff;cursor:pointer}.selection-intake-g0a [data-intake-submit]{background:#176b4d;color:#fff;border-color:#176b4d}`;
    document.head.appendChild(style);
  }
  const folder = dialog.querySelector("[data-intake-folder]");
  const summary = dialog.querySelector("[data-intake-summary]");
  folder.addEventListener("change", () => {
    const manifest = manifestFromFiles(folder.files);
    const counts = Object.entries(manifest.roleCounts).map(([k, v]) => `${k} ${v}`).join("｜") || "无文件";
    summary.textContent = `素材 ${manifest.files.length} 个｜${counts}｜原始主图：${manifest.hasOriginalHero ? "有" : "无（不阻断）"}`;
  });
  dialog.querySelector("[data-intake-submit]").addEventListener("click", async () => {
    const excel = dialog.querySelector("[data-intake-excel]").files?.[0];
    const type = dialog.querySelector("[data-intake-type]").value;
    const resultNode = dialog.querySelector("[data-intake-result]");
    const submit = dialog.querySelector("[data-intake-submit]");
    if (!excel) {
      resultNode.hidden = false;
      resultNode.className = "selection-intake-g0a__result is-error";
      resultNode.textContent = "请先选择1688 Excel。";
      return;
    }
    submit.disabled = true;
    submit.textContent = "处理中…";
    try {
      const records = await parseExcel(excel);
      const materialManifest = manifestFromFiles(folder.files);
      const result = await aioneApi("/api/v1/selection-intake", {
        method: "POST",
        body: JSON.stringify({ selectionType: type, records, materialManifest, intakeFile: { name: excel.name, size: excel.size } })
      });
      const ids = (result.verification?.persisted || []).map((item) => item.selection_no || item.id).filter(Boolean);
      window.dispatchEvent(new CustomEvent("aione:selection-intake-completed", { detail: result }));
      window.sessionStorage.setItem(SUCCESS_KEY, JSON.stringify({
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        ids
      }));
      dialog.close();
      window.location.reload();
    } catch (error) {
      resultNode.hidden = false;
      resultNode.className = "selection-intake-g0a__result is-error";
      resultNode.textContent = error.message || "导入失败。";
    } finally {
      submit.disabled = false;
      submit.textContent = "校验并创建商品机会";
    }
  });
  return dialog;
}

function findSelectionSearch() {
  return [...document.querySelectorAll("input")].find((input) => String(input.placeholder || "").includes("Selection Code"));
}

function isSelectionListPage() {
  const hash = decodeURIComponent(window.location.hash || "");
  if (hash.includes("center=selection-center") && hash.includes("view=1")) return true;
  const hasTitle = [...document.querySelectorAll("h1,h2,h3")].some((node) => node.textContent?.trim() === "选品中心");
  return hasTitle && Boolean(findSelectionSearch());
}

function mountEntry() {
  if (!isSelectionListPage()) return;
  if (document.querySelector(`[${BUTTON_MARK}]`)) return;

  const searchInput = findSelectionSearch();
  if (!searchInput) return;
  const saveView = [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "保存视图");
  const host = saveView?.parentElement || searchInput.parentElement?.parentElement || searchInput.parentElement;
  if (!host) return;

  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute(BUTTON_MARK, "true");
  button.textContent = "＋ 导入选品";
  if (saveView?.className) button.className = saveView.className;
  button.style.marginLeft = "8px";
  button.style.borderColor = "#176b4d";
  button.style.background = "#176b4d";
  button.style.color = "#fff";
  button.addEventListener("click", () => ensureDialog().showModal());

  if (saveView && saveView.parentElement === host) host.insertBefore(button, saveView);
  else host.appendChild(button);
}

const observer = new MutationObserver(() => mountEntry());
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("hashchange", () => requestAnimationFrame(mountEntry));
window.addEventListener("popstate", () => requestAnimationFrame(mountEntry));
requestAnimationFrame(() => {
  mountEntry();
  restoreSuccessToast();
});
