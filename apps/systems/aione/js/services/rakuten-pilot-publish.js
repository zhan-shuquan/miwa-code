// zjl238 first-item live pilot: reuse AIONE product assets and the existing Rakuten endpoints.
// No RMS credentials are handled by the browser; aioneApi supplies the signed-in actor.
export const RAKUTEN_PILOT = Object.freeze({
  localCode: "zjl238",
  shopRef: "永井GD",
  containerCode: "rkc001",
  imageCount: 12,
  skuCount: 2,
  packVersion: "v1"
});

const encode = value => encodeURIComponent(String(value));
const apiRoot = "/api/v1";
const body = value => ({ method: "POST", body: JSON.stringify(value) });

export function isRakutenPilotProduct(product) {
  return Boolean(product?.id && product.localCode === RAKUTEN_PILOT.localCode
    && product.targetShopRef === RAKUTEN_PILOT.shopRef);
}

function requirePilot(product) {
  if (!isRakutenPilotProduct(product)) {
    throw new Error("首轮操作仅允许已保存的 zjl238（永井GD），请核对商品与目标店铺。");
  }
}

async function verifyPersistedProduct(api, product) {
  requirePilot(product);
  const result = await api(`${apiRoot}/product-entry/${encode(product.id)}`);
  const persisted = result?.product;
  if (!isRakutenPilotProduct(persisted) || String(persisted.id) !== String(product.id)) {
    throw new Error("当前页面与数据库的货号或店铺不一致。请先保存并重新打开 zjl238。");
  }
  return persisted;
}

export async function ensureRakutenPilotFolder(api, product) {
  await verifyPersistedProduct(api, product);
  const target = { shopRef: RAKUTEN_PILOT.shopRef, containerCode: RAKUTEN_PILOT.containerCode };
  const boot = await api(`${apiRoot}/integrations/rakuten/cabinet/containers/bootstrap`, body(target));
  if (boot?.ok !== true || boot.shopRef !== target.shopRef
      || boot.containerCode !== target.containerCode || boot.active !== true) {
    throw new Error("R-Cabinet 容器初始化结果未核实，停止后续写入。");
  }
  const ensured = await api(`${apiRoot}/integrations/rakuten/cabinet/folders/ensure`, body(target));
  const folderId = Number(ensured?.folder?.folderId);
  const recordedId = Number(ensured?.container?.metadata?.rakutenFolderId);
  if (ensured?.ok !== true || ensured.shopRef !== target.shopRef
      || ensured.containerCode !== target.containerCode
      || !Number.isSafeInteger(folderId) || folderId <= 0 || folderId !== recordedId) {
    throw new Error("R-Cabinet 文件夹未能确认到真实 folderId，请只读核查后重试。");
  }
  return { folderId, created: Boolean(ensured.created), containerCode: target.containerCode };
}

function validatePlan(ready, dry, product) {
  if (ready?.shopRef !== RAKUTEN_PILOT.shopRef
      || ready?.product?.id !== product.id
      || ready?.container?.containerCode !== RAKUTEN_PILOT.containerCode
      || !(Number(ready?.container?.rakutenFolderId) > 0)) {
    throw new Error("R-Cabinet 目标店铺、商品或文件夹未确认；禁止发布图片。");
  }
  if (ready.proposalValidation?.readyForPublish !== true
      || (ready.proposalValidation?.blocking || []).length) {
    throw new Error("图片发布预检未通过：" + (ready.proposalValidation?.blocking || ["unknown"]).join("、"));
  }
  const proposal = ready.proposal;
  if (!Array.isArray(proposal) || proposal.length !== RAKUTEN_PILOT.imageCount
      || new Set(proposal.map(item => item.assetId)).size !== RAKUTEN_PILOT.imageCount
      || proposal.filter(item => item.sourceRole === "source_sku_image").length !== RAKUTEN_PILOT.skuCount
      || !proposal.some(item => item.sourceRole === "source_main_image")
      || proposal.some(item => !item.assetId || !item.canonicalName
        || !["main_images", "sku_or_variation_images", "detail_images"].includes(item.slotFamily))) {
    throw new Error("zjl238 必须有12张互不重复的有效图片（含主图和两张SKU图），当前不符合发布条件。");
  }
  if (dry?.manageNumber !== RAKUTEN_PILOT.localCode || dry.shopRef !== RAKUTEN_PILOT.shopRef
      || dry.remoteStatus !== 404 || dry.remoteExists !== false
      || dry.skuCount !== RAKUTEN_PILOT.skuCount || dry.imageCount !== RAKUTEN_PILOT.imageCount
      || dry.cabinet?.containerCode !== RAKUTEN_PILOT.containerCode || dry.cabinet?.folderConfigured !== true) {
    throw new Error("商品远端不存在(404)、SKU数量或图片文件夹状态未得到最新核实；禁止发布。");
  }
  return proposal.map(item => ({
    assetId: item.assetId, slotFamily: item.slotFamily,
    slotOrder: item.slotOrder, canonicalName: item.canonicalName
  }));
}

export async function previewRakutenPilotPack(api, product) {
  await verifyPersistedProduct(api, product);
  const query = `?shopRef=${encode(RAKUTEN_PILOT.shopRef)}&containerCode=${encode(RAKUTEN_PILOT.containerCode)}`;
  const ready = await api(`${apiRoot}/product-assets/products/${encode(product.id)}/rakuten-pack${query}`);
  const dry = await api(`${apiRoot}/integrations/rakuten/products/${encode(RAKUTEN_PILOT.localCode)}/first-item-dry-run`);
  const assignments = validatePlan(ready, dry, product);
  return { assignments, folderId: Number(ready.container.rakutenFolderId), dryRun: dry };
}

export async function publishRakutenPilotPack(api, product, confirmedPlan) {
  requirePilot(product);
  const approved = confirmedPlan?.assignments;
  if (!Array.isArray(approved) || approved.length !== RAKUTEN_PILOT.imageCount) {
    throw new Error("缺少已确认的12张图片发布清单。");
  }
  // Recheck after the browser confirmation: reject changed assets/slots or remote item creation.
  const fresh = await previewRakutenPilotPack(api, product);
  const shape = list => JSON.stringify(list.map(x => [x.assetId, x.slotFamily, x.slotOrder, x.canonicalName]));
  if (fresh.folderId !== confirmedPlan.folderId || shape(fresh.assignments) !== shape(approved)) {
    throw new Error("图片清单或目标文件夹已变化，请重新检查并确认，不会执行上传。");
  }
  const result = await api(
    `${apiRoot}/integrations/rakuten/products/${encode(product.id)}/cabinet/publish-canonical`,
    body({
      shopRef: RAKUTEN_PILOT.shopRef,
      containerCode: RAKUTEN_PILOT.containerCode,
      packVersion: RAKUTEN_PILOT.packVersion,
      assignments: approved.map(({ assetId, slotFamily, slotOrder }) => ({ assetId, slotFamily, slotOrder }))
    })
  );
  if (result?.ok !== true || result.shopRef !== RAKUTEN_PILOT.shopRef
      || result.containerCode !== RAKUTEN_PILOT.containerCode
      || !Array.isArray(result.results) || result.results.length !== RAKUTEN_PILOT.imageCount
      || result.results.some(item => !item.externalAssetId)) {
    throw new Error("图片提交的回执不完整；可能存在部分成功，请先只读核查映射，不要盲目重试。");
  }
  const dry = await api(`${apiRoot}/integrations/rakuten/products/${encode(RAKUTEN_PILOT.localCode)}/first-item-dry-run`);
  if (dry.mappedImageCount !== RAKUTEN_PILOT.imageCount || dry.skuCount !== RAKUTEN_PILOT.skuCount
      || dry.blocking?.some(reason => [
        "rakuten_cabinet_container_missing", "rakuten_cabinet_folder_not_resolved",
        "main_cabinet_image_not_published", "sku_cabinet_image_not_published"
      ].includes(reason))) {
    throw new Error("RMS图片发布返回成功，但AIONE映射或SKU图片复核未全部通过，请检查诊断结果。");
  }
  return { result, dryRun: dry };
}
