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
