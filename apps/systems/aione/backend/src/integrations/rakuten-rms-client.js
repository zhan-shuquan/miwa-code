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
  return match ? match[1].trim() : null;
}

function numericOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
  return text;
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
