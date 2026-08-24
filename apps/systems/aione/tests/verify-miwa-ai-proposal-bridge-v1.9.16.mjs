import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const read = (rel) => fs.readFileSync(path.join(appRoot, rel), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const config = read("js/config/system-config.js");
const provider = read("backend/src/ai/openai-provider.js");
const service = read("backend/src/ai/ai-secretary-service.js");
const route = read("backend/src/routes/ai-secretary.js");
const client = read("js/ai/ai-secretary-client.js");
const css = read("css/shell/miwa-ai-layer.css");
const baseline = read("docs/BASELINE_V1.9.16_MIWA_AI_PROPOSAL_BRIDGE.md");

must((config.includes("20260824-v1.9.16-ai-proposal-bridge") || (config.includes("20260824-v1.9.17-ai-context-router") || (config.includes("20260824-v1.9.18-1688-source-api-bridge") || (config.includes("20260824-v1.9.19-1688-oauth-bridge") || config.includes("20260824-v1.9.20-1688-permanent-token-direct"))))), "Asset version is not V1.9.16");
must(provider.includes("explicitlyRequestsWorkCreation") && provider.includes("bridgeWorkProposal"), "OpenAI proposal bridge is missing");
must(provider.includes('name: "propose_create_work_item"') && provider.includes("tool_choice"), "Proposal bridge does not force structured proposal output");
must(service.includes("stagePendingProposals") && service.includes("getLatestPendingProposal"), "Pending proposal state is not staged on Backend");
must(service.includes("isExplicitHumanConfirmation") && service.includes("confirmationHandled"), "Natural-language confirmation bridge is missing");
must(service.includes("requestedProposalId && !stored") && service.includes("statusCode = 409"), "Staged proposal ownership/expiry guard is missing");
must(route.includes("proposalId:req.body?.proposalId"), "Confirm route does not accept proposalId");
must(client.includes("proposalId:proposal.id") && client.includes("result.confirmationResult"), "Frontend does not bind proposalId or natural confirmation results");
must(client.includes("renderMarkdownLite") && client.includes("appendInlineMarkdown"), "Markdown-lite renderer is missing");
must(css.includes("Markdown-lite rendering") && css.includes("ai-secretary-message__body h4"), "Markdown-lite styles are missing");
must(baseline.includes("Intent -> Proposal -> Human Confirm -> Tool -> Result"), "Baseline does not record the proposal bridge contract");

const storeUrl = pathToFileURL(path.join(appRoot, "backend/src/ai/pending-proposal-store.js")).href;
const store = await import(storeUrl);
const requestContext = { personId:"person-test" };
const contextSnapshot = { user:{ personId:"person-test" } };
const staged = store.stagePendingProposals({
  proposals:[{ type:"create_work_item", label:"Create work item", summary:"Test", payload:{ title:"Test" } }],
  executionId:"aix-test",
  officeCode:"chairman",
  objective:"test",
  requestContext,
  contextSnapshot
});
must(staged.length === 1 && staged[0].id && staged[0].status === "waiting_confirmation", "Pending proposal was not assigned an id/status");
const latest = store.getLatestPendingProposal({ officeCode:"chairman", requestContext, contextSnapshot });
must(latest?.id === staged[0].id, "Latest pending proposal lookup failed");
must(store.clearPendingProposal(staged[0].id) === true, "Pending proposal clear failed");

console.log("V1.9.16_MIWA_AI_PROPOSAL_BRIDGE_OK");
