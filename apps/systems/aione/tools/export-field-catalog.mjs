import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getFieldCatalogSnapshot } from "../js/config/field-registry.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const target = path.join(root, "docs", "FIELD_CATALOG_V1.0.json");
const snapshot = getFieldCatalogSnapshot();
fs.writeFileSync(target, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
console.log(`FIELD_CATALOG_EXPORTED ${target}`);
