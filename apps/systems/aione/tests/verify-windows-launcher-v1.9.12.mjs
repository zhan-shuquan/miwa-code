import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const repoRoot = path.resolve(appRoot, "../../..");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const cmdNames = [
  "START_MIWA_AI_RUNTIME_AND_VERIFY.cmd",
  "START_AI_SECRETARY_PREVIEW.cmd",
  "SETUP_NODE_LTS.cmd"
];
const psNames = [
  "START_MIWA_AI_RUNTIME_AND_VERIFY.ps1",
  "START_AI_SECRETARY_PREVIEW.ps1",
  "SETUP_NODE_LTS.ps1",
  "VERIFY_MIWA_AI_RUNTIME.ps1"
];

for (const name of cmdNames) {
  const buf = fs.readFileSync(path.join(repoRoot, name));
  must(![...buf].some((b) => b > 0x7f), `${name} must remain ASCII`);
  const text = buf.toString("ascii");
  must(text.includes("\r\n"), `${name} must use CRLF`);
  must(!text.replace(/\r\n/g, "").includes("\n"), `${name} contains bare LF`);
  must(text.includes("powershell.exe -NoProfile -ExecutionPolicy Bypass -File"), `${name} must be a minimal PowerShell wrapper`);
}

for (const name of psNames) {
  const buf = fs.readFileSync(path.join(repoRoot, name));
  must(buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf, `${name} must use UTF-8 BOM`);
  const text = buf.toString("utf8");
  must(text.includes("\r\n"), `${name} must use CRLF`);
  must(!text.replace(/\r\n/g, "").includes("\n"), `${name} contains bare LF`);
}

const attrs = fs.readFileSync(path.join(repoRoot, ".gitattributes"), "utf8");
const editor = fs.readFileSync(path.join(repoRoot, ".editorconfig"), "utf8");
must(attrs.includes("*.cmd text eol=crlf") && attrs.includes("*.ps1 text eol=crlf"), ".gitattributes does not preserve Windows launcher CRLF");
must(editor.includes("[*.{cmd,bat}]") && editor.includes("end_of_line = crlf") && editor.includes("[*.ps1]"), ".editorconfig does not preserve Windows launcher format");

console.log("V1.9.12_WINDOWS_LAUNCHER_FORMAT_OK");
