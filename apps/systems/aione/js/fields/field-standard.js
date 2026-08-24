/* ========================================
   Field Standard｜AIONE字段标准核心
   页面显示名可以变化，fieldCode一旦正式锁定不得随意改变。
======================================== */
import { FIELD_TYPE_KEYS, getFieldTypeDefinition } from "./field-types.js";
import { MIWA_NINE_ELEMENT_KEYS } from "../config/miwa-nine-elements.js";

export const FIELD_SCHEMA_VERSION = "1.0";
export const FIELD_LIFECYCLE_STATES = Object.freeze(["discussion", "validating", "locked", "deprecated"]);
export const FIELD_SOURCE_MODES = Object.freeze(["manual", "system", "inherited", "api", "import", "ai", "calculated", "mixed"]);
export const FIELD_AUTOMATION_MODES = Object.freeze(["manual", "assisted", "automatic", "derived", "mixed"]);
export const FIELD_HISTORY_MODES = Object.freeze(["none", "changes", "snapshot"]);
export const FIELD_SENSITIVITY_LEVELS = Object.freeze(["normal", "sensitive", "secret"]);

const clone = (value) => JSON.parse(JSON.stringify(value));
const isBlank = (value) => value === null || value === undefined || String(value).trim() === "";

export function normalizeFieldDefinition(raw = {}, context = {}) {
  const fieldCode = String(raw.fieldCode || "").trim();
  const key = String(raw.key || fieldCode.split(".").pop() || "").trim();
  const dataType = FIELD_TYPE_KEYS.includes(raw.dataType) ? raw.dataType : (raw.type === "number" && raw.format === "money" ? "money" : FIELD_TYPE_KEYS.includes(raw.type) ? raw.type : raw.dictionary ? "enum" : "text");
  const nineElement = MIWA_NINE_ELEMENT_KEYS.includes(raw.nineElement) ? raw.nineElement : "information";
  const typeDef = getFieldTypeDefinition(dataType);
  const required = Boolean(raw.required);
  const sensitivity = FIELD_SENSITIVITY_LEVELS.includes(raw.permission?.sensitivity) ? raw.permission.sensitivity : "normal";
  const standard = {
    schemaVersion: FIELD_SCHEMA_VERSION,
    lifecycle: FIELD_LIFECYCLE_STATES.includes(raw.lifecycle) ? raw.lifecycle : "validating",
    fieldCode,
    key,
    label: String(raw.label || key || fieldCode || "未命名字段"),
    definition: String(raw.definition || `${context.objectName || "业务对象"}的“${raw.label || key}”字段；正式业务口径待知识之家逐步锁定。`),
    dataType,
    nineElement,
    required,
    primary: Boolean(raw.primary),
    dictionary: Boolean(raw.dictionary || dataType === "enum" || dataType === "multi_enum" || dataType === "status"),
    dictionaryKey: raw.dictionaryKey || null,
    unit: raw.unit || null,
    currency: raw.currency || null,
    source: FIELD_SOURCE_MODES.includes(raw.source) ? raw.source : "mixed",
    ownerRole: raw.ownerRole || "当前业务负责人",
    captureTiming: raw.captureTiming || "业务事实发生时",
    automation: FIELD_AUTOMATION_MODES.includes(raw.automation) ? raw.automation : "mixed",
    calculation: raw.calculation || null,
    validation: {
      required,
      min: raw.validation?.min ?? null,
      max: raw.validation?.max ?? null,
      pattern: raw.validation?.pattern || null,
      message: raw.validation?.message || null
    },
    routes: {
      knowledge: raw.routes?.knowledge || { status: "pending", knowledgeId: null, anchorId: fieldCode || key },
      rule: raw.routes?.rule || { status: "pending", knowledgeId: null, anchorId: fieldCode || key },
      help: raw.routes?.help || { status: "pending", routeId: "help", anchorId: fieldCode || key }
    },
    permission: {
      read: raw.permission?.read || "internal_open",
      write: raw.permission?.write || "responsible_or_admin",
      sensitivity
    },
    history: FIELD_HISTORY_MODES.includes(raw.history) ? raw.history : "changes",
    event: {
      onChange: raw.event?.onChange !== false,
      name: raw.event?.name || (fieldCode ? `${fieldCode}.changed` : `${key}.changed`)
    },
    importAliases: Array.isArray(raw.importAliases) ? [...raw.importAliases] : [],
    storageKey: raw.storageKey || key,
    ui: {
      input: raw.ui?.input || typeDef.input,
      rows: raw.ui?.rows || null,
      span: raw.ui?.span || null,
      format: raw.ui?.format || raw.format || null,
      placeholder: raw.ui?.placeholder || ""
    },
    db: {
      suggestedType: raw.db?.suggestedType || typeDef.sql,
      nullable: raw.db?.nullable ?? !required,
      indexCandidate: Boolean(raw.db?.indexCandidate),
      uniqueCandidate: Boolean(raw.db?.uniqueCandidate || raw.primary)
    },
    tags: Array.isArray(raw.tags) ? [...raw.tags] : []
  };
  return Object.freeze(standard);
}

export function getHtmlInputType(field = {}) {
  const input = field.ui?.input || getFieldTypeDefinition(field.dataType).input;
  return ["text","number","date","datetime-local","url","email","tel","checkbox"].includes(input) ? input : "text";
}

export function coerceFieldValue(field = {}, rawValue) {
  if (field.dataType === "boolean") return rawValue === true || rawValue === "true" || rawValue === "1" || rawValue === "on";
  if (["number","money","percent","integer","duration"].includes(field.dataType)) {
    if (isBlank(rawValue)) return field.required ? 0 : "";
    const value = Number(rawValue);
    return Number.isFinite(value) ? (field.dataType === "integer" || field.dataType === "duration" ? Math.trunc(value) : value) : rawValue;
  }
  if (field.dataType === "multi_enum") return Array.isArray(rawValue) ? rawValue : String(rawValue || "").split(",").map((item) => item.trim()).filter(Boolean);
  return rawValue ?? "";
}

export function validateFieldValue(field = {}, value) {
  const errors = [];
  if (field.required && isBlank(value)) errors.push(`${field.label}为必填项`);
  if (!isBlank(value) && ["number","money","percent","integer","duration"].includes(field.dataType) && !Number.isFinite(Number(value))) errors.push(`${field.label}必须是有效数字`);
  if (!isBlank(value) && field.dataType === "url") {
    try { new URL(String(value)); } catch (_) { errors.push(`${field.label}必须是有效网址`); }
  }
  if (!isBlank(value) && field.validation?.min !== null && Number(value) < Number(field.validation.min)) errors.push(`${field.label}不能小于${field.validation.min}`);
  if (!isBlank(value) && field.validation?.max !== null && Number(value) > Number(field.validation.max)) errors.push(`${field.label}不能大于${field.validation.max}`);
  if (!isBlank(value) && field.validation?.pattern) {
    try { if (!(new RegExp(field.validation.pattern)).test(String(value))) errors.push(field.validation.message || `${field.label}格式不正确`); } catch (_) {}
  }
  return errors;
}

export function validateObjectByFields(fields = [], object = {}) {
  const errors = [];
  fields.forEach((field) => errors.push(...validateFieldValue(field, object[field.key])));
  return Object.freeze({ ok: errors.length === 0, errors });
}

export function formatFieldValue(field = {}, value) {
  if (value === 0) return "0";
  if (isBlank(value)) return "—";
  if (field.dataType === "money" || field.ui?.format === "money") {
    const number = Number(value) || 0;
    const amount = Number.isInteger(number) ? number.toLocaleString("ja-JP") : number.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
    if (field.currency === "JPY") return `¥${amount}`;
    if (field.currency === "CNY") return `CN¥${amount}`;
    if (field.currency) return `${field.currency} ${amount}`;
    return amount;
  }
  if (field.dataType === "percent") return `${Number(value)}%`;
  if (field.dataType === "duration") {
    const seconds = Number(value) || 0; const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60);
    return hours ? `${hours}小时${minutes ? `${minutes}分` : ""}` : `${minutes}分`;
  }
  if (field.dataType === "url") return value ? "已设置" : "—";
  if (Array.isArray(value)) return value.join(" / ");
  return String(value);
}

export function fieldRoute(field = {}, kind = "knowledge") {
  const target = field.routes?.[kind];
  if (!target || target.status === "pending") return null;
  if (kind === "help" && target.routeId) return `#/${target.routeId}?anchor=${encodeURIComponent(target.anchorId || field.fieldCode || field.key)}`;
  if (target.knowledgeId) {
    const query = new URLSearchParams({ focus: target.knowledgeId });
    if (target.anchorId) query.set("anchor", target.anchorId);
    return `#/knowledge-home?${query.toString()}`;
  }
  return null;
}

export function cloneFieldSchema(fields = []) { return fields.map((field) => clone(field)); }
