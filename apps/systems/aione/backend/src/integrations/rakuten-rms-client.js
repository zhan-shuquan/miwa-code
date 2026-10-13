const RMS_BASE_URL = "https://api.rms.rakuten.co.jp/es/1.0";

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    const error = new Error(`${name} is not configured.`);
    error.statusCode = 503;
    error.code = "rakuten_credentials_not_configured";
    throw error;
  }
  return value;
}

function authorizationHeader() {
  const serviceSecret = requiredEnv("AIONE_RAKUTEN_SERVICE_SECRET");
  const licenseKey = requiredEnv("AIONE_RAKUTEN_LICENSE_KEY");
  const encoded = Buffer.from(`${serviceSecret}:${licenseKey}`, "utf8").toString("base64");
  return `ESA ${encoded}`;
}

function xmlText(xml, tagName) {
  const match = String(xml || "").match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXml(match[1].trim()) : null;
}

function xmlBlocks(xml, tagName) {
  const blocks = [];
  const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  let match;
  while ((match = pattern.exec(String(xml || ""))) !== null) blocks.push(match[1]);
  return blocks;
}

function decodeXml(value) {
  return String(value ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function numericOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function assertRakutenSuccess(xml) {
  const systemStatus = xmlText(xml, "systemStatus");
  const resultCode = xmlText(xml, "resultCode");
  if ((systemStatus && systemStatus !== "OK") || (resultCode && resultCode !== "0")) {
    const error = new Error(`Rakuten RMS API returned systemStatus=${systemStatus || "unknown"}, resultCode=${resultCode || "unknown"}.`);
    error.statusCode = 502;
    error.code = "rakuten_rms_result_error";
    error.remoteCode = resultCode || systemStatus || undefined;
    error.rakutenBody = String(xml || "").slice(0, 4000);
    throw error;
  }
}

async function rmsFetch(path, options = {}) {
  const response = await fetch(`${RMS_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: authorizationHeader(),
      Accept: "text/xml, application/xml;q=0.9, */*;q=0.8",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`Rakuten RMS API request failed with HTTP ${response.status}.`);
    error.statusCode = 502;
    error.code = "rakuten_rms_http_error";
    error.rakutenStatus = response.status;
    error.rakutenBody = text.slice(0, 4000);
    throw error;
  }
  assertRakutenSuccess(text);
  return text;
}

function parseFolder(xml) {
  return {
    folderId: numericOrNull(xmlText(xml, "folderId")),
    folderName: xmlText(xml, "folderName"),
    upperFolderId: numericOrNull(xmlText(xml, "upperFolderId")),
    folderPath: xmlText(xml, "folderPath"),
    fileCount: numericOrNull(xmlText(xml, "fileCount"))
  };
}

export async function getCabinetUsage() {
  const xml = await rmsFetch("/cabinet/usage/get", { method: "GET" });
  const systemStatus = xmlText(xml, "systemStatus");
  const resultCode = xmlText(xml, "resultCode");

  return {
    interfaceId: xmlText(xml, "interfaceId"),
    systemStatus,
    resultCode,
    usage: {
      maxSpaceMb: numericOrNull(xmlText(xml, "MaxSpace")),
      useSpaceKb: numericOrNull(xmlText(xml, "UseSpace")),
      availSpaceKb: numericOrNull(xmlText(xml, "AvailSpace")),
      folderMax: numericOrNull(xmlText(xml, "FolderMax")),
      fileMaxPerFolder: numericOrNull(xmlText(xml, "FileMax")),
      useFolderCount: numericOrNull(xmlText(xml, "UseFolderCount")),
      availFolderCount: numericOrNull(xmlText(xml, "AvailFolderCount"))
    }
  };
}

export async function getCabinetFolders({ offset = 1, limit = 100 } = {}) {
  const query = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  const xml = await rmsFetch(`/cabinet/folders/get?${query.toString()}`, { method: "GET" });
  const folders = xmlBlocks(xml, "folder")
    .map(parseFolder)
    .filter((folder) => folder.folderId !== null || folder.folderName);

  return {
    interfaceId: xmlText(xml, "interfaceId"),
    systemStatus: xmlText(xml, "systemStatus"),
    resultCode: xmlText(xml, "resultCode"),
    offset,
    limit,
    folders
  };
}

export async function getAllCabinetFolders({ limit = 100, maxPages = 100 } = {}) {
  const folders = [];
  for (let offset = 1; offset <= maxPages; offset += 1) {
    const page = await getCabinetFolders({ offset, limit });
    folders.push(...page.folders);
    if (page.folders.length < limit) break;
  }
  return folders;
}

export async function createCabinetFolder({ folderName, upperFolderId = null }) {
  const cleanFolderName = String(folderName || "").trim();
  if (!cleanFolderName) {
    const error = new Error("folderName is required.");
    error.statusCode = 400;
    error.code = "bad_request";
    throw error;
  }

  const upperFolderXml = upperFolderId === null || upperFolderId === undefined || upperFolderId === ""
    ? ""
    : `<upperFolderId>${escapeXml(upperFolderId)}</upperFolderId>`;
  const body = `<?xml version="1.0" encoding="UTF-8"?><request><folderInsertRequest><folder><folderName>${escapeXml(cleanFolderName)}</folderName>${upperFolderXml}</folder></folderInsertRequest></request>`;
  const xml = await rmsFetch("/cabinet/folder/insert", {
    method: "POST",
    headers: { "Content-Type": "text/xml;charset=UTF-8" },
    body
  });

  return {
    interfaceId: xmlText(xml, "interfaceId"),
    systemStatus: xmlText(xml, "systemStatus"),
    resultCode: xmlText(xml, "resultCode"),
    folderId: numericOrNull(xmlText(xml, "folderId")),
    folderName: xmlText(xml, "folderName") || cleanFolderName
  };
}

// ItemAPI 2.0 GET. Existing R-Cabinet credentials must explicitly be bound to
// the requested shop; never reuse them for a different store by assumption.
export async function getItemV2ReadOnly({shopRef,manageNumber,request=fetch}) {
  const configuredShop=String(process.env.AIONE_RAKUTEN_SHOP_REF||"").trim();
  if(!configuredShop||configuredShop!==String(shopRef||"").trim()){
    const e=new Error("Rakuten credential shop binding is not configured or does not match.");
    e.statusCode=503;e.code="rakuten_shop_binding_missing";throw e;
  }
  const code=String(manageNumber||"").trim();
  if(!/^[A-Za-z0-9_-]{1,64}$/.test(code)){
    const e=new Error("Invalid Rakuten product management number.");e.statusCode=400;e.code="invalid_manage_number";throw e;
  }
  const response=await request("https://api.rms.rakuten.co.jp/es/2.0/items/manage-numbers/"+encodeURIComponent(code),{
    method:"GET",headers:{Authorization:authorizationHeader(),Accept:"application/json"},
    signal:AbortSignal.timeout(15000)
  });
  const raw=await response.text();
  if(response.status===404)return {exists:false,httpStatus:404,manageNumber:code,shopRef};
  if(!response.ok){const e=new Error("Rakuten ItemAPI read failed (HTTP "+response.status+").");e.statusCode=502;e.code="rakuten_itemapi_read_failed";e.rakutenStatus=response.status;throw e;}
  let item;try{item=JSON.parse(raw)}catch{const e=new Error("Rakuten ItemAPI response was not JSON.");e.statusCode=502;e.code="rakuten_itemapi_invalid_response";throw e;}
  return {exists:true,httpStatus:response.status,manageNumber:code,shopRef,item};
}

function parseCabinetFile(block) {
  return {
    fileId: numericOrNull(xmlText(block, "FileId")),
    folderId: numericOrNull(xmlText(block, "FolderId")),
    filePath: xmlText(block, "FilePath"),
    fileName: xmlText(block, "FileName"),
    fileUrl: xmlText(block, "FileUrl"),
    fileWidth: numericOrNull(xmlText(block, "FileWidth")),
    fileHeight: numericOrNull(xmlText(block, "FileHeight"))
  };
}

// Strict remote read for reconciling AIONE mappings with R-Cabinet before writes.
export function parseCabinetFolderFilesXml(xml) {
  const resultCode = xmlText(xml, "resultCode");
  if (resultCode && resultCode !== "0") {
    const e = new Error("Rakuten Cabinet folder listing returned an error.");
    e.code = "rakuten_cabinet_files_list_failed";
    e.statusCode = 502;
    e.remoteCode = resultCode;
    throw e;
  }
  const blocks = xmlBlocks(xml, "file");
  const files = blocks.map(parseCabinetFile);
  if (files.some(f => !Number.isSafeInteger(f.fileId) || f.fileId <= 0 || !f.filePath)) {
    const e = new Error("Rakuten Cabinet folder listing contains invalid file records.");
    e.code = "rakuten_cabinet_files_invalid";
    e.statusCode = 502;
    throw e;
  }
  return {
    resultCode,
    total: numericOrNull(xmlText(xml, "fileAllCount")),
    files
  };
}

export async function getAllCabinetFolderFiles({folderId, limit = 100, maxPages = 100} = {}) {
  const id = Number(folderId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    const e = new Error("A verified R-Cabinet folderId is required.");
    e.code = "rakuten_cabinet_folder_unresolved";
    e.statusCode = 409;
    throw e;
  }
  const pageLimit = Math.min(100, Math.max(1, Math.trunc(Number(limit) || 100)));
  const files = [];
  for (let offset = 1; offset <= maxPages; offset++) {
    const query = new URLSearchParams({ folderId: String(id), offset: String(offset), limit: String(pageLimit) });
    const xml = await rmsFetch("/cabinet/folder/files/get?" + query, { method: "GET" });
    const page = parseCabinetFolderFilesXml(xml);
    files.push(...page.files);
    if (page.files.length < pageLimit) return files;
  }
  throw Object.assign(new Error("R-Cabinet image listing exceeded safe pagination limit."),
    { code: "rakuten_cabinet_files_limit", statusCode: 409 });
}

// ShopAPI 1.0 read-only store settings: never infer shipping IDs from carrier names.
function shopXmlBlocks(xml, tag) {
  const normalized = String(xml||"").replace(/(<\/?)[A-Za-z_][A-Za-z0-9_.-]*:/g, "$1");
  return xmlBlocks(normalized,tag);
}
function shopXmlText(block, tag) {
  return xmlText(String(block||"").replace(/(<\/?)[A-Za-z_][A-Za-z0-9_.-]*:/g,"$1"),tag);
}
export function parseRakutenShopPublishingOptions(deliveryXml, leadTimeXml) {
  const deliverySets = shopXmlBlocks(deliveryXml,"deliverySetInfo").map(item=>({
    id:numericOrNull(shopXmlText(item,"deliverySetId")),
    name:shopXmlText(item,"deliverySetName"),
    default:shopXmlText(item,"deliverySetDefaultFlag")==="1"
  })).filter(item=>Number.isSafeInteger(item.id)&&item.id>0);
  const deliveryDates = shopXmlBlocks(leadTimeXml,"delvdateMaster").map(item=>({
    id:numericOrNull(shopXmlText(item,"delvdateNumber")),
    label:shopXmlText(item,"delvdateCaption"),
    days:numericOrNull(shopXmlText(item,"appointDays"))
  })).filter(item=>Number.isSafeInteger(item.id)&&item.id>0);
  if(!deliverySets.length || !deliveryDates.length) {
    const error=new Error("RMS ShopAPI did not return verifiable delivery set and delivery date options.");
    error.code="rakuten_shipping_options_missing";error.statusCode=409;throw error;
  }
  const distinct=(rows)=>new Set(rows.map(x=>x.id)).size===rows.length;
  if(!distinct(deliverySets)||!distinct(deliveryDates)){
    const error=new Error("RMS ShopAPI returned duplicate shipping configuration IDs.");
    error.code="rakuten_shipping_options_ambiguous";error.statusCode=409;throw error;
  }
  return {deliverySets,deliveryDates,
    defaultDeliverySetId:deliverySets.filter(x=>x.default).length===1?deliverySets.find(x=>x.default).id:null};
}
export async function getRakutenShopPublishingOptions() {
  const [delivery,dates]=await Promise.all([
    rmsFetch("/shop/deliverySetInfo",{method:"GET"}),
    rmsFetch("/shop/delvdateMaster",{method:"GET"})
  ]);
  return parseRakutenShopPublishingOptions(delivery,dates);
}
