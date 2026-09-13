function snapshotMode() {
  return new URLSearchParams(window.location.search).get("snapshot") === "1";
}

function contentUrl(assetId) {
  const id = String(assetId || "").trim();
  return id ? `/api/v1/product-assets/${encodeURIComponent(id)}/content` : "";
}

function optionLabel(select) {
  return String(select?.selectedOptions?.[0]?.textContent || "").trim();
}

function renderImage(target, select, { contain = true, empty = "请选择商品素材" } = {}) {
  if (!target || !select) return;
  const assetId = String(select.value || "").trim();
  if (!assetId || snapshotMode()) return;

  const image = document.createElement("img");
  image.src = contentUrl(assetId);
  image.alt = optionLabel(select) || "ProductAsset";
  image.loading = "eager";
  image.decoding = "async";
  image.style.width = "100%";
  image.style.height = "100%";
  image.style.objectFit = contain ? "contain" : "cover";
  image.style.display = "block";
  image.style.borderRadius = "inherit";
  image.addEventListener("error", () => {
    target.textContent = `${optionLabel(select) || empty} · 图片读取失败`;
    target.dataset.assetPreviewState = "error";
  }, { once: true });
  image.addEventListener("load", () => {
    target.dataset.assetPreviewState = "ready";
  }, { once: true });

  target.replaceChildren(image);
  target.dataset.assetPreviewState = "loading";
}

function binding(formName, targetName, options = {}) {
  return {
    select: document.querySelector(`[data-form="${formName}"] select[name="sourceAssetId"]`),
    target: document.querySelector(`[data-ui="${targetName}"]`),
    options
  };
}

function bindings() {
  return [
    binding("sku-design", "sku-preview-source", { contain: true, empty: "请选择 SKU 素材" }),
    binding("white-bg-design", "white-bg-source", { contain: true, empty: "请选择白底商品素材" }),
    binding("model-design", "model-source", { contain: true, empty: "请选择商品锚点素材" }),
    binding("material-design", "material-source", { contain: false, empty: "请选择细节 / 材质素材" }),
    binding("size-design", "size-source", { contain: true, empty: "请选择平铺 / 商品素材" }),
    binding("spec-design", "spec-source", { contain: true, empty: "请选择商品素材" }),
    binding("detail-design", "detail-source", { contain: false, empty: "请选择真实细节素材" })
  ].filter((item) => item.select && item.target);
}

function refresh(bindingItem) {
  window.requestAnimationFrame(() => renderImage(bindingItem.target, bindingItem.select, bindingItem.options));
}

export function initDesignCenterLiveAssetPreviewV1() {
  if (snapshotMode()) return;
  for (const bindingItem of bindings()) {
    refresh(bindingItem);
    bindingItem.select.addEventListener("change", () => refresh(bindingItem));
  }
}
