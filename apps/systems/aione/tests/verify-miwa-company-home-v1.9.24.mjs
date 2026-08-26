import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(read("package.json"));
const content = read("js/data/miwa-company-content.js");
const page = read("js/pages/miwa-company-home.js");
const css = read("css/pages/miwa-company-home.css");
const index = read("index.html");
const systemConfig = read("js/config/system-config.js");
const bindingReadme = read("assets/corporate/miwa-modern-enterprise-corps/README.md");
const manifest = JSON.parse(read("assets/corporate/miwa-modern-enterprise-corps/manifest.json"));

must(packageJson.version === "1.9.24", "package版本不是V1.9.24");
must(index.includes("20260826-v1.9.24-miwa-content"), "index缓存版本未升级到V1.9.24");
must(systemConfig.includes("20260826-v1.9.24-miwa-content"), "系统组件缓存版本未升级到V1.9.24");

for (const title of ["美和灵魂","美和准则","美和传承"]) {
  must(content.includes(`title:"${title}"`) && content.includes("真实内容已接入"), `理念与文化真实内容缺失: ${title}`);
}
for (const text of ["战略未动 · 情报先行","作战未起 · 粮草先行","命令一出 · 执行到底","战果必留 · 复盘必做"]) {
  must(page.includes(text), `经营架构缺少底层作战原则: ${text}`);
}
for (const force of ["指挥军","作战军","建设军","保障军"]) {
  must(page.includes(force), `经营架构缺少执行力量: ${force}`);
}
for (const step of ["确定目标","侦察环境","形成方案","确认粮草","准备装备与兵力","宣传/销售打开市场","事业执行交付","记录战果","分析复盘","重新决策"]) {
  must(page.includes(step), `十步经营闭环缺少: ${step}`);
}
must(page.includes("modern企业军团") === false, "存在错误的混合名称");
must(page.includes("现代企业军团不是新的母架构"), "未区分母架构与执行体系");
must(page.includes("miwa-company-source-panel") && css.includes(".miwa-company-source-panel"), "内容来源面板未接入");
must(css.includes(".miwa-company-force-grid") && css.includes(".miwa-company-operation-loop") && css.includes(".miwa-company-execution-principles"), "V1.9.24真实内容组件样式缺失");
must(content.includes("getMiwaCompanySearchRecords"), "美和AI企业内容搜索记录接口缺失");

const expectedFiles = [
  "00_美和集团现代企业军团总架构_V0.1.pptx",
  "01_美和集团现代企业军团总纲_V0.1.docx",
  "02_美和集团现代企业军团编制总表_V0.1.xlsx",
  "03_美和集团现代企业军团作战指挥关系图_V0.1.pdf",
  "04_美和集团军需与战略粮草体系_V0.1.docx",
  "05_美和集团现代企业军团标准作战流程与经营闭环_V0.1.pdf",
  "06_美和集团AI人才军团体系_V0.1.docx",
  "07_美和集团情报与决策体系_V0.1.docx",
  "08_美和集团宣传与市场作战体系_V0.1.docx",
  "09_美和集团数字后勤与基础设施体系_V0.1.docx"
];
for (const file of expectedFiles) {
  must(content.includes(file), `集团核心资料索引缺失: ${file}`);
  must(bindingReadme.includes(file), `原件绑定说明缺失: ${file}`);
}
must(manifest.documents.length === 10, "集团核心资料Manifest不是10项");
must(manifest.status === "source_files_pending_binding", "Manifest未明确源文件待绑定状态");
must(page.includes("原件待绑定") && page.includes("原始文件尚未复制到AIONE资产目录"), "未绑定原件没有明确安全提示");
must(page.includes('data-company-action="print"') && css.includes("@media print"), "PDF出版模式回归");

console.log("V1.9.24 MIWA company home real-content validation passed.");
