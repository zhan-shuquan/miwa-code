import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, "..");
const scanRoots = [path.join(backendRoot, "src"), path.join(backendRoot, "scripts")];
const forbiddenTokens = ["downloadRemoteImage"];
const allowedFiles = new Set([path.resolve(here, "guard-rakuten-canonical-only.js")]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && full.endsWith(".js") ? [full] : [];
  });
}

const violations = [];
for (const root of scanRoots) {
  for (const file of walk(root)) {
    if (allowedFiles.has(path.resolve(file))) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const token of forbiddenTokens) {
      if (text.includes(token)) {
        violations.push(`${path.relative(backendRoot, file)} contains forbidden Rakuten remote-publication token: ${token}`);
      }
    }
  }
}

if (violations.length) {
  console.error("[AIONE][STOP] Rakuten canonical-only guard failed.");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("[AIONE] Rakuten canonical-only publication guard PASS");
