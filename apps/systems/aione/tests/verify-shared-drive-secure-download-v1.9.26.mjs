import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const server = read("backend/server.js");
const route = read("backend/src/routes/drive-assets.js");
const client = read("backend/src/integrations/google-drive-client.js");
const backendRegistry = read("backend/src/integrations/miwa-drive-assets.js");
const frontendRegistry = read("js/data/miwa-google-drive-registry.js");
const apiClient = read("js/services/aione-api-client.js");
const page = read("js/pages/miwa-company-home.js");
const bridge = read("api/aione-bridge.js");

must(server.includes('/api/v1/drive-assets'), "Drive asset route not mounted");
must(route.includes('Content-Disposition') && route.includes('private, no-store'), "Secure download headers missing");
must(client.includes('https://www.googleapis.com/auth/drive.readonly'), "Drive read-only ADC scope missing");
must(client.includes('drive_runtime_access_missing'), "Runtime access error missing");
must(backendRegistry.includes('0AIPSFkmR2vB_Uk9PVA') && backendRegistry.includes('army-architecture'), "Backend allow-list registry missing");
must(!frontendRegistry.includes('drive.google.com/uc?export=download'), "Direct Google Drive browser download URL still present");
must(frontendRegistry.includes('/api/v1/drive-assets/${encodeURIComponent(key)}/download'), "Frontend secure download path missing");
must(apiClient.includes('export async function aioneDownload'), "Authenticated frontend download helper missing");
must(page.includes('data-company-action="download-asset"') && page.includes('aioneDownload(path)'), "Company asset page is not using secure download helper");
must(bridge.includes('Readable.fromWeb(upstream.body).pipe(res)'), "Vercel bridge is not streaming binary responses");

console.log("V1.9.26 shared-drive secure download verification passed.");
