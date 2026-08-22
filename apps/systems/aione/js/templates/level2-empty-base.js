/* ========================================
   Level-2 Empty Base｜AIONE唯一二级空母版
   只负责稳定挂载位与平台级上下文，不包含任何业务、内容、流程或对象代码。
======================================== */

const LEVEL2_BASE_URL = "./layouts/level2-empty-base.html";
let cachedTemplate = "";

async function getTemplate() {
  if (cachedTemplate) return cachedTemplate;
  const response = await fetch(LEVEL2_BASE_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`二级空母版读取失败: ${LEVEL2_BASE_URL}`);
  cachedTemplate = await response.text();
  return cachedTemplate;
}

export async function mountLevel2EmptyBase(host, options = {}) {
  if (!host) throw new Error("二级空母版缺少挂载容器");
  host.innerHTML = await getTemplate();

  const root = host.querySelector("[data-level2-base]");
  if (!root) throw new Error("二级空母版结构无效: data-level2-base 缺失");

  const mountedAt = new Date().toISOString();
  root.dataset.routeId = options.routeId || "";
  root.dataset.templateRecipe = options.recipeId || "";
  root.dataset.pageKind = options.pageKind || "";
  root.dataset.workEvidenceScope = options.evidenceScope || options.routeId || "";
  root.dataset.mountedAt = mountedAt;

  const slot = (name) => host.querySelector(`[data-level2-slot="${name}"]`);
  const api = Object.freeze({
    host,
    root,
    pageHeader: slot("page-header"),
    main: slot("main"),
    nineElements: slot("nine-elements"),
    portal: slot("portal"),
    context: Object.freeze({
      routeId: options.routeId || "",
      recipeId: options.recipeId || "",
      pageKind: options.pageKind || "",
      evidenceScope: options.evidenceScope || options.routeId || "",
      mountedAt
    })
  });

  window.dispatchEvent(new CustomEvent("aione:level2-mounted", { detail: api.context }));
  return api;
}
