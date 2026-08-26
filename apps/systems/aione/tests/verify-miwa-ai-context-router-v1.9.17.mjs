import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const read = (rel) => fs.readFileSync(path.join(appRoot, rel), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const config = read("js/config/system-config.js");
const registrySource = read("js/ai/ai-capability-registry.js");
const router = read("js/ai/ai-context-router.js");
const layer = read("js/shell/miwa-ai-layer.js");
const component = read("components/shell/ai/miwa-ai-layer.html");
const client = read("js/ai/ai-secretary-client.js");
const provider = read("backend/src/ai/openai-provider.js");
const preview = read("backend/src/ai/preview-provider.js");
const baseline = read("docs/BASELINE_V1.9.17_MIWA_AI_CONTEXT_ROUTER_CANDIDATE.md");

must(config.includes("v1.9.17-ai-context-router") || config.includes("v1.9.18-1688-source-api-bridge") || config.includes("v1.9.19-1688-oauth-bridge") || config.includes("v1.9.20-1688-permanent-token-direct") || config.includes("v1.9.28-ai-context-capabilities"), "Asset version is not V1.9.17+ AI Context Router");

const registryUrl = pathToFileURL(path.join(appRoot, "js/ai/ai-capability-registry.js")).href;
const registry = await import(`${registryUrl}?v=1.9.17`);
const capabilities = registry.getCapabilitiesForAIContext({
  routeId:"selection",
  workbench:{ id:"selection", label:"选品工作台" },
  object:{ type:"product_opportunity", id:"XPTEST" }
});
const codes = capabilities.map((item) => item.code);
const expected = [
  "selection.analyze_opportunity",
  "selection.check_profit_risk",
  "selection.sample_decision",
  "selection.generate_summary"
];
must(codes.length === 4, `Selection object capabilities should be exactly 4; got ${codes.length}`);
must(expected.every((code) => codes.includes(code)), `Selection object capability routing mismatch: ${codes.join(", ")}`);
must(registrySource.includes("Employees only see context-matched 美和AI capabilities"), "Capability registry does not document unified employee-facing AI");

must(router.includes("parseOpportunityRoute") && router.includes("#/selection/opportunity") === false, "Router structure unexpectedly hardcodes an invalid literal route");
must(router.includes("/^#\\/(selection|sampling)\\/opportunity\\/([^?]+)/"), "Opportunity detail route parser is missing");
must(router.includes("aione:selection:workflow:${objectId}"), "Router does not read Selection workflow state");
for (const id of ["pricing-total-cost","pricing-recommended-price","pricing-final-price","pricing-final-profit","pricing-final-margin","pricing-gross-margin"]) {
  must(router.includes(id), `Router does not read deterministic field: ${id}`);
}
must(router.includes("workbench") && router.includes("object") && router.includes("state") && router.includes("user") && router.includes("data"), "AI Context is missing required business dimensions");

must(layer.includes("routeAIONEAIContext") && layer.includes("capabilityCode"), "美和AI Layer is not using routed capability metadata");
must(component.includes("能力自动匹配"), "Composer does not show automatic capability matching");
must(!component.includes('data-miwa-ai-tool="capabilities"'), "Legacy employee-facing capability/tool selector still exists");

must(client.includes("buildAIONEAIContext") && client.includes("aiRequest"), "AI execution snapshot does not include routed context/capability");
must(client.includes("node.dataset.provider") && client.includes("node.dataset.model"), "Provider/model diagnostics were not preserved internally");
must(client.includes('renderStatus("美和AI已就绪", "success")'), "Unified ready-state text is missing");
must(!client.includes('providerDisplayName || result.provider'), "Provider/model is still exposed through the old user-facing rendering path");

must(provider.includes("不要再次询问用户要选择哪个AI、岗位、Skill或模型"), "Live provider does not honor automatic AI/capability routing");
must(provider.includes("确定性") && provider.includes("成本") && provider.includes("利润"), "Live provider is not instructed to respect deterministic AIONE calculations");
must(preview.includes('selection.analyze_opportunity') && preview.includes('selection.check_profit_risk') && preview.includes('selection.sample_decision') && preview.includes('selection.generate_summary'), "Preview provider cannot validate all four Selection capabilities");

must(baseline.includes("员工不选择AI人才、AI岗位、Skill、Agent、模型或Provider"), "Baseline does not lock the simple employee-facing interaction principle");
must(baseline.includes("Proposal -> Human Confirm"), "Baseline does not preserve the human-confirmation write boundary");

console.log("V1.9.17_MIWA_AI_CONTEXT_ROUTER_OK");
