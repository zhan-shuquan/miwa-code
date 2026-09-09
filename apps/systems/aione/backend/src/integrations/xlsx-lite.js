import { inflateRawSync } from "node:zlib";

function u16(buffer, offset) { return buffer.readUInt16LE(offset); }
function u32(buffer, offset) { return buffer.readUInt32LE(offset); }

function decodeXml(value) {
  return String(value || "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function unzipEntries(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22) throw new Error("Invalid XLSX/ZIP buffer.");
  let eocd = -1;
  const min = Math.max(0, buffer.length - 65557);
  for (let i = buffer.length - 22; i >= min; i -= 1) {
    if (u32(buffer, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("XLSX ZIP end record not found.");
  const centralSize = u32(buffer, eocd + 12);
  const centralOffset = u32(buffer, eocd + 16);
  const entries = new Map();
  let cursor = centralOffset;
  const end = centralOffset + centralSize;
  while (cursor < end) {
    if (u32(buffer, cursor) !== 0x02014b50) throw new Error("Invalid XLSX ZIP central directory.");
    const method = u16(buffer, cursor + 10);
    const compressedSize = u32(buffer, cursor + 20);
    const fileNameLength = u16(buffer, cursor + 28);
    const extraLength = u16(buffer, cursor + 30);
    const commentLength = u16(buffer, cursor + 32);
    const localOffset = u32(buffer, cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + fileNameLength).toString("utf8");
    if (u32(buffer, localOffset) !== 0x04034b50) throw new Error(`Invalid XLSX local entry: ${name}`);
    const localNameLength = u16(buffer, localOffset + 26);
    const localExtraLength = u16(buffer, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    let data;
    if (method === 0) data = compressed;
    else if (method === 8) data = inflateRawSync(compressed);
    else throw new Error(`Unsupported XLSX ZIP compression method ${method} for ${name}`);
    entries.set(name.replace(/^\//, ""), data);
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const values = [];
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match;
  while ((match = siRegex.exec(xml))) {
    const parts = [];
    const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let textMatch;
    while ((textMatch = tRegex.exec(match[1]))) parts.push(decodeXml(textMatch[1]));
    values.push(parts.join(""));
  }
  return values;
}

function columnIndex(ref) {
  const letters = String(ref || "").match(/^[A-Z]+/i)?.[0]?.toUpperCase() || "A";
  let index = 0;
  for (const char of letters) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

function resolveFirstSheetPath(entries) {
  const workbook = entries.get("xl/workbook.xml")?.toString("utf8") || "";
  const relId = workbook.match(/<sheet\b[^>]*r:id="([^"]+)"/i)?.[1];
  if (!relId) return "xl/worksheets/sheet1.xml";
  const rels = entries.get("xl/_rels/workbook.xml.rels")?.toString("utf8") || "";
  const escaped = relId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const target = rels.match(new RegExp(`<Relationship\\b[^>]*Id="${escaped}"[^>]*Target="([^"]+)"`, "i"))?.[1]
    || rels.match(new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${escaped}"`, "i"))?.[1];
  if (!target) return "xl/worksheets/sheet1.xml";
  const normalized = target.replace(/^\//, "");
  return normalized.startsWith("xl/") ? normalized : `xl/${normalized.replace(/^\.\//, "")}`;
}

function cellValue(cellXml, sharedStrings) {
  const type = cellXml.match(/\bt="([^"]+)"/)?.[1] || "";
  if (type === "inlineStr") {
    const parts = [];
    const regex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let m;
    while ((m = regex.exec(cellXml))) parts.push(decodeXml(m[1]));
    return parts.join("");
  }
  const raw = cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
  if (type === "s") return sharedStrings[Number(raw)] ?? "";
  if (type === "b") return raw === "1";
  return decodeXml(raw);
}

function parseSheetRows(xml, sharedStrings, maxRows) {
  const rows = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(xml)) && rows.length < maxRows) {
    const cells = [];
    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1]))) {
      const ref = cellMatch[1].match(/\br="([^"]+)"/)?.[1] || "A1";
      cells[columnIndex(ref)] = cellValue(`<c ${cellMatch[1]}>${cellMatch[2]}</c>`, sharedStrings);
    }
    rows.push(cells.map((value) => value ?? ""));
  }
  return rows;
}

function rowsToObjects(matrix) {
  if (!matrix.length) return [];
  const headerRowIndex = matrix.findIndex((row) => row.filter((value) => String(value || "").trim()).length >= 2);
  if (headerRowIndex < 0) return [];
  const headers = matrix[headerRowIndex].map((value, index) => String(value || `column_${index + 1}`).trim() || `column_${index + 1}`);
  const objects = [];
  for (const row of matrix.slice(headerRowIndex + 1)) {
    if (!row.some((value) => String(value || "").trim())) continue;
    const item = {};
    headers.forEach((header, index) => { item[header] = row[index] ?? ""; });
    objects.push(item);
  }
  return objects;
}

export function parseXlsxFirstSheet(buffer, { maxRows = 10000 } = {}) {
  const entries = unzipEntries(buffer);
  const sharedStrings = parseSharedStrings(entries.get("xl/sharedStrings.xml")?.toString("utf8") || "");
  const sheetPath = resolveFirstSheetPath(entries);
  const sheet = entries.get(sheetPath);
  if (!sheet) throw new Error(`XLSX first worksheet not found: ${sheetPath}`);
  const matrix = parseSheetRows(sheet.toString("utf8"), sharedStrings, Math.max(2, Math.min(Number(maxRows || 10000), 20000)));
  return {
    sheetPath,
    rowCount: matrix.length,
    rows: rowsToObjects(matrix)
  };
}
