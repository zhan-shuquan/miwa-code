import { mountLevel2EmptyBase } from "../templates/level2-empty-base.js";
import { getTemplateRecipe } from "../templates/template-registry.js";
import { createUniversalWorkspace } from "../components/universal-workspace.js";
import { renderObjectList } from "../components/object-presenter.js";
import { aioneApi } from "../services/aione-api-client.js";
import {
  SELECTION_SORT_OPTIONS,
  loadSelectionItems,
  getSelectionOwners,
  filterSelectionItems,
  selectionSourceLabel,
  selectionMoney,
  selectionResultLabel
} from "../data/selection-workbench-adapter.js";

const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));

function roleOf(file) {
  const value = `${file.webkitRelativePath || ""}/${file.name || ""}`.toLowerCase();
  if (/(^|[\\/_-])sku([\\/_-]|\.)/.test(value)) return "SKU图";
  if (value.includes("详情")) return "详情图";
  if (value.includes("白底")) return "白底图";
  if (value.includes("主图")) return "主图";
  if (value.includes("实拍")) return "实拍图";
  return "其他";
}

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
function tags(row) { return text(row, "标签").split(/[,，、]/).map((item) => item.trim()).filter(Boolean); }

function rowsToRecords(rows) {
  return rows.filter((row) => Object.values(row || {}).some((value) => String(value ?? "").trim())).map((row) => ({
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
  const records = rowsToRecords(window.XLSX.utils.sheet_to_json(sheet, { defval: "" }));
  if (!records.length) throw new Error("Excel中没有可导入数据。");
  const invalid = records.filter((record) => !record.title || (!record.sourceRef && !record.sourceUrl));
  if (invalid.length) throw new Error(`有 ${invalid.length} 条记录缺少商品标题或商品ID/链接。`);
  return records;
}

function createIntakeDialog(root, onCompleted) {
  const dialog = document.createElement("dialog");
  dialog.className = "selection-batch-dialog";
  dialog.innerHTML = `
    <form method="dialog" class="selection-batch-dialog__body" data-selection-current-intake>
      <div class="selection-batch-dialog__head">
        <div><small>Selection Intake · CURRENT</small><h2>导入选品</h2><p>1688 Excel + 本地商品素材 → 真实 Selection。此步骤不会创建 Product 或 SKU。</p></div>
        <button class="selection-batch-dialog__close" value="cancel" aria-label="关闭">×</button>
      </div>
      <label>选品方式<select data-intake-type><option value="直发选品">直发选品</option><option value="常规选品">常规选品</option></select></label>
      <label>1688 Excel<input data-intake-excel type="file" accept=".xlsx" required></label>
      <label>本地产品素材文件夹<input data-intake-folder type="file" webkitdirectory directory multiple></label>
      <div class="selection-batch-validation" data-intake-summary>尚未读取素材。没有原始主图不会阻断 Selection 创建。</div>
      <div class="selection-batch-validation is-error" data-intake-error hidden></div>
      <footer class="selection-batch-dialog__foot"><p>唯一写入目标：product_opportunities。</p><div><button value="cancel">取消</button><button type="button" class="selection-batch-action-button" data-intake-submit>校验并创建 Selection</button></div></footer>
    </form>`;
  root.appendChild(dialog);

  const folder = dialog.querySelector("[data-intake-folder]");
  const summary = dialog.querySelector("[data-intake-summary]");
  const errorNode = dialog.querySelector("[data-intake-error]");
  folder?.addEventListener("change", () => {
    const manifest = manifestFromFiles(folder.files);
    const counts = Object.entries(manifest.roleCounts).map(([key, value]) => `${key} ${value}`).join("｜") || "无文件";
    summary.textContent = `素材 ${manifest.files.length} 个｜${counts}｜原始主图：${manifest.hasOriginalHero ? "有" : "无（不阻断）"}`;
  });

  dialog.querySelector("[data-intake-submit]")?.addEventListener("click", async () => {
    const excel = dialog.querySelector("[data-intake-excel]")?.files?.[0];
    const selectionType = dialog.querySelector("[data-intake-type]")?.value || "直发选品";
    const submit = dialog.querySelector("[data-intake-submit]");
    if (!excel) {
      errorNode.hidden = false;
      errorNode.textContent = "请先选择1688 Excel。";
      return;
    }
    errorNode.hidden = true;
    submit.disabled = true;
    submit.textContent = "处理中…";
    try {
      const records = await parseExcel(excel);
      const materialManifest = manifestFromFiles(folder?.files);
      const result = await aioneApi("/api/v1/selection-intake", {
        method: "POST",
        body: JSON.stringify({ selectionType, records, materialManifest, intakeFile: { name: excel.name, size: excel.size } })
      });
      dialog.close();
      await onCompleted?.(result);
    } catch (error) {
      errorNode.hidden = false;
      errorNode.textContent = error?.message || "导入失败，请重试。";
    } finally {
      submit.disabled = false;
      submit.textContent = "校验并创建 Selection";
    }
  });

  return dialog;
}

function productHtml(item) {
  const image = item?.representativeImage?.url
    ? `<img src="${esc(item.representativeImage.url)}" alt="" loading="lazy">`
    : `<span>${esc(String(item.name || "商").slice(0, 1))}</span>`;
  const source = item?.sourceUrl
    ? `<a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(selectionSourceLabel(item))} ↗</a>`
    : `<em>${esc(selectionSourceLabel(item))}</em>`;
  return `<div class="miwa-selection-list-product"><span class="miwa-selection-list-thumb">${image}</span><span><strong>${esc(item.name)}</strong><small>${esc(item.selectionNo || item.id)} · ${esc(item.type)} · ${source}</small></span></div>`;
}

export async function initSelectionWorkbenchCurrent() {
  const entry = document.getElementById("miwa-selection-template-entry");
  if (!entry) return false;
  if (!getTemplateRecipe("standard-business")) throw new Error("标准业务母版Recipe未注册");

  const base = await mountLevel2EmptyBase(entry, {
    routeId: "selection",
    recipeId: "standard-business",
    pageKind: "business",
    evidenceScope: "selection-workbench-current"
  });

  let items = [];
  let intakeDialog = null;
  const workspace = createUniversalWorkspace(base.main, {
    pageId: "selection-opportunity-list-current",
    title: "商品机会一览",
    description: "唯一正式 Selection 工作区。数据来自 AIONE API / product_opportunities，不使用浏览器 Preview 数据。",
    searchPlaceholder: "搜索商品 / Selection Code / 来源",
    filters: [
      { key: "type", label: "选品方式", allLabel: "全部选品方式", options: ["直发选品", "常规选品"] },
      { key: "status", label: "状态", allLabel: "全部状态", options: [
        { value: "pending", label: "待判断" },
        { value: "selected", label: "已通过" },
        { value: "rejected", label: "已淘汰" },
        { value: "converted", label: "已转商品" }
      ] },
      { key: "owner", label: "负责人", allLabel: "全部负责人", options: [] },
      { key: "time", label: "时间范围", allLabel: "全部时间", options: [
        { value: "today", label: "今天" },
        { value: "7d", label: "近7天" },
        { value: "month", label: "本月" }
      ] }
    ],
    sortOptions: SELECTION_SORT_OPTIONS,
    views: ["list"],
    defaultView: "list",
    allowImport: true,
    allowExport: false,
    pageSize: 12,
    onImportRequest: () => {
      if (!intakeDialog) intakeDialog = createIntakeDialog(base.root, refresh);
      if (!intakeDialog.open) intakeDialog.showModal();
    },
    onStateChange: () => renderObjects()
  });

  function renderObjects() {
    const allRows = workspace.sortItems(filterSelectionItems(items, workspace.getState(), ""));
    if (!allRows.length) {
      workspace.setCount(0);
      if (items.length) workspace.showNoResults();
      else workspace.showEmpty("暂无商品机会", "当前真实 Selection 数据为空，可通过“导入”创建第一条商品机会。");
      return;
    }
    workspace.hideState();
    const page = workspace.paginateItems(allRows);
    if (workspace.nodes.range) workspace.nodes.range.textContent = `当前显示 ${page.start}–${page.end} / ${page.total} 项`;
    const table = workspace.getTableNodes("list");
    renderObjectList(table.head, table.body, page.rows, {
      fields: [
        { label: "商品机会", renderHtml: productHtml, className: "miwa-selection-list-primary" },
        { label: "Selection Code", value: (item) => item.selectionNo || item.id },
        { label: "状态", value: (item) => selectionResultLabel(item) },
        { label: "负责人", value: (item) => item.owner },
        { label: "投入成本", value: (item) => selectionMoney(item.cost) },
        { label: "正式商品", value: (item) => item.convertedProductCode || "—" },
        { label: "时间", value: (item) => item.time }
      ],
      actions: []
    });
  }

  async function refresh(result = null) {
    workspace.showLoading("正在读取真实 Selection 数据…");
    try {
      items = await loadSelectionItems();
      workspace.setFilterOptions("owner", getSelectionOwners(items), workspace.getState().filters.owner || "");
      renderObjects();
      if (result) {
        const created = Number(result.createdCount || 0);
        const updated = Number(result.updatedCount || 0);
        window.dispatchEvent(new CustomEvent("aione:page-aside-context", { detail: {
          state: "light",
          kicker: "导入完成",
          title: `Selection 新增 ${created} / 更新 ${updated}`,
          text: "已重新从真实 API 读取列表；当前步骤没有创建 Product 或 SKU。"
        } }));
      }
    } catch (error) {
      workspace.showError(`Selection 读取失败：${error?.message || "请刷新重试"}`);
    }
  }

  await refresh();
  window.dispatchEvent(new CustomEvent("aione:page-aside-context", { detail: {
    state: "light",
    kicker: "当前工作台",
    title: "选品工作台",
    text: "唯一正式 Selection 数据源：product_opportunities。导入只创建/更新商品机会，不创建 Product 或 SKU。"
  } }));
  return true;
}
