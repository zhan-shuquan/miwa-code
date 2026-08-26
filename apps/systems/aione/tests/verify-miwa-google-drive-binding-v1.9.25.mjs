import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(read("package.json"));
const index = read("index.html");
const systemConfig = read("js/config/system-config.js");
const page = read("js/pages/miwa-company-home.js");
const manifest = JSON.parse(read("assets/corporate/miwa-modern-enterprise-corps/manifest.json"));
const registryText = read("js/data/miwa-google-drive-registry.js");
const contentText = read("js/data/miwa-company-content.js");

must(Number(packageJson.version.split(".")[2]) >= 25, "package版本低于V1.9.25");
const versionFromText = (value) => {
  const matches = [...String(value).matchAll(/v1\.9\.(\d+)(?:\.(\d+))?/g)]
    .map((m) => [Number(m[1]), Number(m[2] || 0)]);
  return matches.sort((a,b) => (b[0]-a[0]) || (b[1]-a[1]))[0] || [0, 0];
};
const atLeast = ([minor, patch], reqMinor, reqPatch = 0) => minor > reqMinor || (minor === reqMinor && patch >= reqPatch);
must(atLeast(versionFromText(index), 25), "index缓存版本低于V1.9.25");
must(atLeast(versionFromText(systemConfig), 25), "系统组件缓存版本低于V1.9.25");
must(registryText.includes("美和之家｜AIONE内容源") && registryText.includes("集团核心资料"), "Drive镜像目录注册缺失");
must(["google_drive_bound","google_drive_secure_proxy"].includes(manifest.status), "Manifest没有进入Google Drive绑定状态");
must(manifest.documents.length === 10, "Manifest核心资料数量不是10");
must(manifest.documents.every((item) => item.bound && item.fileId && item.viewUrl && (item.downloadUrl || item.downloadPath)), "存在未绑定Drive原件的核心资料");
must(page.includes("查看原件 ↗") && page.includes("下载原件"), "企业资料页未启用查看/下载原件");
must(contentText.includes("sourceId:asset.driveFileId") && contentText.includes("sourceUrl:asset.url") && contentText.includes("sourceFolderId:asset.driveFolderId"), "美和AI来源字段未接入搜索记录");

const registryUrl = pathToFileURL(path.join(root, "js/data/miwa-google-drive-registry.js")).href;
const contentUrl = pathToFileURL(path.join(root, "js/data/miwa-company-content.js")).href;
const registry = await import(`${registryUrl}?test=${Date.now()}`);
const content = await import(`${contentUrl}?test=${Date.now()}`);

must(Object.keys(registry.MIWA_DRIVE_CORE_ASSETS).length === 10, "Drive核心资料注册不是10项");
const coreAssets = content.MIWA_GROUP_CORE_ASSETS.filter((asset) => asset.scope === "core");
must(coreAssets.length === 10, "AIONE集团核心资料不是10项");
for (const asset of coreAssets) {
  must(asset.storage === "google-drive", `资料未声明Google Drive存储: ${asset.title}`);
  must(asset.driveFileId, `资料缺少Drive File ID: ${asset.title}`);
  must(asset.url?.startsWith("https://drive.google.com/"), `资料查看URL无效: ${asset.title}`);
  must(asset.downloadPath?.includes("/api/v1/drive-assets/") || asset.downloadUrl?.includes("export=download"), `资料下载入口无效: ${asset.title}`);
  must(asset.recordStatus === "构想/验证中", `V0.1资料状态被错误升级: ${asset.title}`);
}

const searchRecords = content.getMiwaCompanySearchRecords().filter((record) => record.kind === "asset" && record.sourceType === "google-drive");
must(searchRecords.length === 10, "美和AI搜索记录没有10条Google Drive资料来源");
must(searchRecords.every((record) => record.sourceId && record.sourceUrl && (record.downloadPath || record.downloadUrl) && record.sourceFolderId), "美和AI资料来源字段不完整");

console.log("V1.9.25 MIWA Google Drive asset binding validation passed.");
