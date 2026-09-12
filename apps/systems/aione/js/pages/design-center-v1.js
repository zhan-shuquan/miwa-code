import { aioneApi } from "../services/aione-api-client.js";

const SLOT_COUNT = 4;
let state = { workbench: null };

function root() { return document.querySelector("[data-design-center-root]"); }
function $ui(name) { return root()?.querySelector(`[data-ui="${name}"]`); }
function $form(name) { return root()?.querySelector(`[data-form="${name}"]`); }
function text(value) { return String(value ?? "").trim(); }
function escapeHtml(value) { return text(value).replace(/[&<>'"]/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch])); }

function showMessage(message, isError = false) {
  const node = $ui("message");
  if (!node) return;
  node.hidden = !message;
  node.textContent = message || "";
  node.classList.toggle("is-error", Boolean(isError));
}

function getQueryProduct() {
  return new URLSearchParams(window.location.search).get("product") || "MH0000002";
}

function readPath(object, path) {
  if (!path) return undefined;
  return String(path).split(".").reduce((value, key) => {
    if (value == null) return undefined;
    if (Array.isArray(value) && /^\d+$/.test(key)) return value[Number(key)];
    if (typeof value !== "object") return undefined;
    return value[key];
  }, object || {});
}

function displayValue(value) {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(" / ");
  if (typeof value === "object") return "";
  return String(value);
}

function resolveLocalBinding(binding = {}) {
  const productData = state.workbench?.product?.productData || {};
  const fact = displayValue(readPath(productData, binding.sourceFactPath));
  const body = fact || text(binding.textOverride);
  return body ? `${text(binding.prefix)}${body}${text(binding.suffix)}` : "";
}

function topLevelFactPaths(value, prefix = "", depth = 0) {
  if (!value || typeof value !== "object" || depth > 2) return [];
  const paths = [];
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(child)) {
      paths.push(path);
      child.slice(0, 5).forEach((item, index) => {
        if (item == null || typeof item !== "object") paths.push(`${path}.${index}`);
      });
    } else if (child && typeof child === "object") {
      paths.push(...topLevelFactPaths(child, path, depth + 1));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

function renderProductSummary() {
  const host = $ui("product-summary");
  const product = state.workbench?.product;
  if (!host || !product) return;
  const data = product.productData || {};
  const preferred = ["setCount","supportedSize","season","targetGender","lengthType","approvedPrimaryValue"];
  const chips = preferred.filter((key) => data[key] !== undefined && data[key] !== null && data[key] !== "").map((key) => `<span class="dc-fact-chip">${escapeHtml(key)} · ${escapeHtml(displayValue(data[key]))}</span>`).join("");
  host.innerHTML = `<div class="dc-product-summary__row"><div class="dc-product-summary__identity"><strong>${escapeHtml(product.productCode || product.id)} · ${escapeHtml(product.name)}</strong><span>${escapeHtml(product.categoryName || product.categoryCode || "分类待确认")} · ${escapeHtml(product.lifecycleStatus)}</span></div><div class="dc-fact-chips">${chips || '<span class="dc-fact-chip">Product Truth 待补</span>'}</div></div>`;
}

function materialCard(title, count, detail, stateName) {
  const cls = stateName === "ready" ? "is-ready" : stateName === "warning" ? "is-warning" : "";
  return `<div class="dc-material ${cls}"><b>${escapeHtml(title)}</b><span>${escapeHtml(detail)}</span><em>${count} 张</em></div>`;
}

function renderMaterials() {
  const materials = state.workbench?.materials;
  const host = $ui("material-grid");
  if (!materials || !host) return;
  const c = materials.counts || {};
  host.innerHTML = [
    materialCard("SKU图", c.sku || 0, "确认真实颜色、花型、套数和SKU关系", c.sku ? "ready" : "warning"),
    materialCard("白底图", c.whiteBackgroundCandidates || 0, "仍存放在02_产品图；用于主体、主图与抠图", c.whiteBackgroundCandidates ? "ready" : "warning"),
    materialCard("细节图", c.detailCandidates || 0, "用于卖点、结构和真实性校验", c.detailCandidates ? "ready" : ""),
    materialCard("实拍图", c.real || 0, "没有不阻断；模特/场景可由AI补视觉", c.real ? "ready" : "")
  ].join("");
  const status = $ui("material-status");
  if (status) {
    status.textContent = c.sku && c.whiteBackgroundCandidates ? "关键素材已识别" : "需要确认关键素材";
    status.classList.toggle("dc-status--ready", Boolean(c.sku && c.whiteBackgroundCandidates));
  }
}

function emptySlot() {
  return { type:"custom", sourceFactPath:"", textOverride:"", prefix:"", suffix:"", iconCode:"", visible:true };
}

function normalizeSlots(slots) {
  const list = Array.isArray(slots) ? slots.slice(0, SLOT_COUNT) : [];
  while (list.length < SLOT_COUNT) list.push(emptySlot());
  return list.map((slot) => ({ ...emptySlot(), ...(slot || {}) }));
}

function slotEditor(slot, index) {
  return `<div class="dc-slot-row" data-slot-index="${index}">
    <div class="dc-slot-number">${index + 1}</div>
    <label>类型<select data-slot-field="type">
      ${["feature","setCount","size","material","style","custom"].map((value) => `<option value="${value}" ${slot.type === value ? "selected" : ""}>${value}</option>`).join("")}
    </select></label>
    <label>Product Truth 路径<input data-slot-field="sourceFactPath" list="product-fact-paths" value="${escapeHtml(slot.sourceFactPath)}" placeholder="supportedSize"></label>
    <label>显示文案<input data-slot-field="textOverride" value="${escapeHtml(slot.textOverride)}" placeholder="无事实绑定时使用"></label>
    <label class="dc-slot-prefix">前缀<input data-slot-field="prefix" value="${escapeHtml(slot.prefix)}"></label>
    <label class="dc-slot-suffix">后缀<input data-slot-field="suffix" value="${escapeHtml(slot.suffix)}"></label>
    <label class="dc-slot-visible"><input data-slot-field="visible" type="checkbox" ${slot.visible !== false ? "checked" : ""}>显示</label>
  </div>`;
}

function collectSlots() {
  return [...(root()?.querySelectorAll("[data-slot-index]") || [])].map((row) => {
    const field = (name) => row.querySelector(`[data-slot-field="${name}"]`);
    return {
      type: field("type")?.value || "custom",
      sourceFactPath: text(field("sourceFactPath")?.value),
      textOverride: text(field("textOverride")?.value),
      prefix: text(field("prefix")?.value),
      suffix: text(field("suffix")?.value),
      iconCode: "",
      visible: Boolean(field("visible")?.checked)
    };
  });
}

function collectTagForm() {
  const form = $form("tag-card");
  return {
    templatePresetId: "dip_miwa_product_tag_card_v1",
    brandNameEn: text(form?.elements.brandNameEn?.value),
    brandSublineEn: text(form?.elements.brandSublineEn?.value),
    brandSloganJa: text(form?.elements.brandSloganJa?.value),
    colorTheme: form?.elements.colorTheme?.value || "neutral",
    slots: collectSlots(),
    usageScopes: [form?.elements.useHero?.checked ? "hero" : "", form?.elements.usePackaging?.checked ? "packaging" : ""].filter(Boolean),
    lifecycleStatus: "draft"
  };
}

function tagPreviewMarkup(tag) {
  const slots = normalizeSlots(tag.slots);
  return `<div class="product-tag-card" data-theme="${escapeHtml(tag.colorTheme || "neutral")}">
    <div class="product-tag-card__brand">${escapeHtml(tag.brandNameEn || "BRAND")}</div>
    <div class="product-tag-card__subline">${escapeHtml(tag.brandSublineEn || "Product Line")}</div>
    <div class="product-tag-card__slots">${slots.map((slot) => {
      const resolved = resolveLocalBinding(slot);
      return `<div class="product-tag-card__slot ${resolved ? "" : "is-empty"}">${escapeHtml(resolved || "—")}</div>`;
    }).join("")}</div>
    <div class="product-tag-card__slogan">${escapeHtml(tag.brandSloganJa || "ブランドメッセージ")}</div>
  </div>`;
}

function refreshTagPreview() {
  const tag = collectTagForm();
  const host = $ui("tag-preview");
  const heroHost = $ui("hero-tag-preview");
  if (host) host.outerHTML = tagPreviewMarkup(tag).replace('<div class="product-tag-card"', '<div class="product-tag-card" data-ui="tag-preview"');
  if (heroHost) heroHost.innerHTML = tagPreviewMarkup(tag);
}

function populateTagForm() {
  const form = $form("tag-card");
  const card = state.workbench?.tagCard || {};
  if (!form) return;
  form.elements.brandNameEn.value = card.brand_name_en || "";
  form.elements.brandSublineEn.value = card.brand_subline_en || "";
  form.elements.brandSloganJa.value = card.brand_slogan_ja || "";
  form.elements.colorTheme.value = card.color_theme || "neutral";
  const scopes = Array.isArray(card.usage_scopes) ? card.usage_scopes : ["hero","packaging"];
  form.elements.useHero.checked = scopes.includes("hero");
  form.elements.usePackaging.checked = scopes.includes("packaging");
  const slots = normalizeSlots(card.slots);
  const host = $ui("slot-editors");
  if (host) host.innerHTML = slots.map(slotEditor).join("");
  refreshTagPreview();
}

function renderFactPaths() {
  const host = $ui("fact-paths");
  const paths = topLevelFactPaths(state.workbench?.product?.productData || {}).sort();
  if (host) host.innerHTML = paths.map((path) => `<option value="${escapeHtml(path)}"></option>`).join("");
}

function presetOptions(kind, selectedId = "") {
  return (state.workbench?.instructionPresets || []).filter((preset) => preset.instruction_kind === kind).map((preset) => `<option value="${escapeHtml(preset.id)}" ${preset.id === selectedId ? "selected" : ""}>${escapeHtml(preset.name)}</option>`).join("");
}

function renderHeroAssets() {
  const form = $form("hero-spec");
  const materials = state.workbench?.materials || {};
  const spec = state.workbench?.heroSpec || {};
  const modelSelect = $ui("model-presets");
  const displaySelect = $ui("display-presets");
  if (modelSelect) modelSelect.innerHTML = `<option value="">请选择</option>${presetOptions("model_generation", spec.model_preset_id || "")}`;
  if (displaySelect) displaySelect.innerHTML = `<option value="">请选择</option>${presetOptions("product_display", spec.product_display_preset_id || "")}`;

  const white = Array.isArray(materials.whiteBackground) ? materials.whiteBackground : [];
  const products = Array.isArray(materials.product) ? materials.product : [];
  const candidates = white.length ? white : products;
  const productSelect = $ui("product-display-assets");
  if (productSelect) {
    productSelect.innerHTML = `<option value="">${white.length ? "请选择白底商品素材" : "白底未识别：请从产品图人工选择"}</option>` + candidates.map((asset) => `<option value="${escapeHtml(asset.id)}" ${asset.id === spec.product_display_asset_id ? "selected" : ""}>${escapeHtml(asset.original_name || asset.canonical_name || asset.id)}</option>`).join("");
  }

  const skuHost = $ui("sku-assets");
  const selectedSku = new Set(Array.isArray(spec.sku_asset_ids) && spec.sku_asset_ids.length ? spec.sku_asset_ids : (materials.sku || []).map((asset) => asset.id));
  if (skuHost) {
    skuHost.innerHTML = `<div class="dc-sku-list">${(materials.sku || []).map((asset) => `<label class="dc-sku-item"><input type="checkbox" value="${escapeHtml(asset.id)}" ${selectedSku.has(asset.id) ? "checked" : ""}>${escapeHtml(asset.original_name || asset.canonical_name || asset.id)}</label>`).join("") || '<span class="dc-empty">CURRENT 素材中尚未识别 SKU 图</span>'}</div>`;
  }

  if (form) {
    form.elements.productDisplayMode.value = spec.product_display_mode || "flat_lay";
    form.elements.primarySourceFactPath.value = spec.primary_selling_point_binding?.sourceFactPath || "";
    form.elements.primaryTextOverride.value = spec.primary_selling_point_binding?.textOverride || "";
    form.elements.secondarySourceFactPath.value = spec.secondary_selling_point_binding?.sourceFactPath || "";
    form.elements.secondaryTextOverride.value = spec.secondary_selling_point_binding?.textOverride || "";
  }
  refreshHeroPreview();
}

function collectHeroForm() {
  const form = $form("hero-spec");
  const skuAssetIds = [...(root()?.querySelectorAll('[data-ui="sku-assets"] input[type="checkbox"]:checked') || [])].map((input) => input.value);
  return {
    tagCardId: state.workbench?.tagCard?.id || null,
    layoutPresetId: "dip_unified_hero_square_layout_v1",
    modelPresetId: form?.elements.modelPresetId?.value || null,
    productDisplayPresetId: form?.elements.productDisplayPresetId?.value || null,
    productDisplayAssetId: form?.elements.productDisplayAssetId?.value || null,
    modelAssetId: state.workbench?.heroSpec?.model_asset_id || null,
    skuAssetIds,
    productDisplayMode: form?.elements.productDisplayMode?.value || "flat_lay",
    primarySellingPointBinding: {
      sourceFactPath: text(form?.elements.primarySourceFactPath?.value),
      textOverride: text(form?.elements.primaryTextOverride?.value), prefix:"", suffix:""
    },
    secondarySellingPointBinding: {
      sourceFactPath: text(form?.elements.secondarySourceFactPath?.value),
      textOverride: text(form?.elements.secondaryTextOverride?.value), prefix:"", suffix:""
    },
    lifecycleStatus: "draft"
  };
}

function refreshHeroPreview() {
  const form = $form("hero-spec");
  if (!form) return;
  const primary = resolveLocalBinding({ sourceFactPath:form.elements.primarySourceFactPath.value, textOverride:form.elements.primaryTextOverride.value });
  const secondary = resolveLocalBinding({ sourceFactPath:form.elements.secondarySourceFactPath.value, textOverride:form.elements.secondaryTextOverride.value });
  const p = root()?.querySelector('[data-preview="primary"]');
  const s = root()?.querySelector('[data-preview="secondary"]');
  if (p) p.textContent = primary || "最强卖点";
  if (s) s.textContent = secondary || "第二卖点";
  const display = $ui("hero-product-display");
  if (display) {
    const selected = form.elements.productDisplayAssetId?.selectedOptions?.[0];
    display.textContent = selected?.value ? selected.textContent : "SKU / 白底商品展示";
  }
  updateHeroReadiness();
}

function updateHeroReadiness() {
  const status = $ui("hero-readiness");
  if (!status) return;
  const form = $form("hero-spec");
  const hasTag = Boolean(state.workbench?.tagCard?.id);
  const skuCount = root()?.querySelectorAll('[data-ui="sku-assets"] input[type="checkbox"]:checked').length || 0;
  const hasProduct = Boolean(form?.elements.productDisplayAssetId?.value);
  const hasModelPreset = Boolean(form?.elements.modelPresetId?.value);
  const ready = hasTag && skuCount > 0 && hasProduct && hasModelPreset;
  status.textContent = ready ? "主图规范可创建任务" : "请补齐关键输入";
  status.classList.toggle("dc-status--ready", ready);
}

function renderPresets() {
  const host = $ui("preset-list");
  if (!host) return;
  host.innerHTML = (state.workbench?.instructionPresets || []).map((preset) => `<div class="dc-preset"><b>${escapeHtml(preset.name)}</b><code>${escapeHtml(preset.preset_code)}</code><p>${escapeHtml(preset.instruction_kind)}${preset.category_scope ? ` · ${escapeHtml(preset.category_scope)}` : " · 通用"}</p></div>`).join("") || '<div class="dc-empty">暂无可用指令预设</div>';
}

async function loadWorkbench(productRef) {
  showMessage("正在读取 CURRENT 商品事实和已确认素材…");
  try {
    const payload = await aioneApi(`/api/v1/design-center/workbench?product=${encodeURIComponent(productRef)}`);
    state.workbench = payload.workbench;
    renderProductSummary();
    renderMaterials();
    renderFactPaths();
    populateTagForm();
    renderHeroAssets();
    renderPresets();
    showMessage(`已读取 ${state.workbench.product.productCode || productRef}。标签卡和主图使用同一 CURRENT Product Truth。`);
  } catch (error) {
    state.workbench = null;
    showMessage(error.message || "设计中心读取失败。", true);
  }
}

async function saveTagCard(event) {
  event.preventDefault();
  if (!state.workbench?.product?.id) return;
  try {
    const result = await aioneApi(`/api/v1/products/${encodeURIComponent(state.workbench.product.id)}/design/tag-card`, {
      method:"PATCH", body:JSON.stringify(collectTagForm())
    });
    state.workbench.tagCard = result.tagCard;
    populateTagForm();
    updateHeroReadiness();
    showMessage("商品标签卡已保存。主图与未来包装都引用这一套结构。 ");
  } catch (error) { showMessage(error.message || "标签卡保存失败。", true); }
}

async function saveHeroSpec(event) {
  event.preventDefault();
  if (!state.workbench?.product?.id) return;
  try {
    const result = await aioneApi(`/api/v1/products/${encodeURIComponent(state.workbench.product.id)}/design/hero-spec`, {
      method:"PATCH", body:JSON.stringify(collectHeroForm())
    });
    state.workbench.heroSpec = result.heroSpec;
    renderHeroAssets();
    showMessage("1:1 主图规范已保存。商品标签卡、SKU、白底商品图和两级卖点已进入同一个 Hero Spec。 ");
  } catch (error) { showMessage(error.message || "主图规范保存失败。", true); }
}

async function createHeroTask() {
  const product = state.workbench?.product;
  if (!product?.id) return;
  const spec = collectHeroForm();
  if (!state.workbench.tagCard?.id) return showMessage("请先保存商品标签卡。", true);
  const inputAssetIds = [...new Set([...(spec.skuAssetIds || []), spec.productDisplayAssetId].filter(Boolean))];
  if (!inputAssetIds.length) return showMessage("主图任务至少需要一个 CURRENT 商品素材。", true);
  try {
    const payload = await aioneApi(`/api/v1/products/${encodeURIComponent(product.id)}/design/tasks`, {
      method:"POST",
      body:JSON.stringify({
        templateId:"dtpl_unified_product_hero_square_v1",
        taskType:"compose_product_hero",
        inputAssetIds,
        inputFactSnapshot:product.productData || {},
        instructionSnapshot:{ heroSpec:spec, tagCard:collectTagForm(), contract:"AIONE Unified Hero Five Slot V1" }
      })
    });
    showMessage(`主图设计任务已创建：${payload.task?.id || "已复用现有任务"}。当前先停在草稿，不会绕过审核直接生图。`);
  } catch (error) { showMessage(error.message || "主图设计任务创建失败。", true); }
}

function bindEvents() {
  const r = root();
  if (!r) return;
  r.querySelector('[data-action="load-product"]')?.addEventListener("click", () => loadWorkbench(text(r.querySelector("#design-product-ref")?.value)));
  r.querySelector("#design-product-ref")?.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); loadWorkbench(text(event.currentTarget.value)); } });
  $form("tag-card")?.addEventListener("submit", saveTagCard);
  $form("hero-spec")?.addEventListener("submit", saveHeroSpec);
  r.querySelector('[data-action="create-hero-task"]')?.addEventListener("click", createHeroTask);
  r.addEventListener("input", (event) => {
    if (event.target.closest('[data-form="tag-card"]')) refreshTagPreview();
    if (event.target.closest('[data-form="hero-spec"]')) refreshHeroPreview();
  });
  r.addEventListener("change", (event) => {
    if (event.target.closest('[data-form="tag-card"]')) refreshTagPreview();
    if (event.target.closest('[data-form="hero-spec"]') || event.target.closest('[data-ui="sku-assets"]')) refreshHeroPreview();
  });
}

export async function initDesignCenter() {
  const r = root();
  if (!r || r.dataset.initialized === "true") return;
  r.dataset.initialized = "true";
  bindEvents();
  const productRef = getQueryProduct();
  const input = r.querySelector("#design-product-ref");
  if (input) input.value = productRef;
  await loadWorkbench(productRef);
}
