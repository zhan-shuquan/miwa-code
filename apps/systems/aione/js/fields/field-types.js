/* ========================================
   Field Types｜AIONE标准字段类型
   这是业务语义层到数据库/表单/AI Tool Layer之间的稳定类型字典。
======================================== */
export const FIELD_TYPE_DEFINITIONS = Object.freeze({
  text:        { input: "text",     sql: "text",          category: "text" },
  long_text:   { input: "textarea", sql: "text",          category: "text" },
  number:      { input: "number",   sql: "numeric",       category: "number" },
  integer:     { input: "number",   sql: "bigint",        category: "number" },
  money:       { input: "number",   sql: "numeric(18,2)", category: "money" },
  percent:     { input: "number",   sql: "numeric(8,4)",  category: "number" },
  boolean:     { input: "checkbox", sql: "boolean",       category: "boolean" },
  date:        { input: "date",     sql: "date",          category: "time" },
  datetime:    { input: "datetime-local", sql: "timestamptz", category: "time" },
  duration:    { input: "number",   sql: "bigint",        category: "time" },
  url:         { input: "url",      sql: "text",          category: "text" },
  email:       { input: "email",    sql: "text",          category: "text" },
  phone:       { input: "tel",      sql: "text",          category: "text" },
  enum:        { input: "select",   sql: "text",          category: "dictionary" },
  multi_enum:  { input: "select",   sql: "jsonb",         category: "dictionary" },
  status:      { input: "select",   sql: "text",          category: "dictionary" },
  person_ref:  { input: "text",     sql: "text",          category: "reference" },
  object_ref:  { input: "text",     sql: "text",          category: "reference" },
  file_ref:    { input: "text",     sql: "text",          category: "reference" },
  image_ref:   { input: "url",      sql: "text",          category: "reference" },
  json:        { input: "textarea", sql: "jsonb",         category: "structured" }
});

export const FIELD_TYPE_KEYS = Object.freeze(Object.keys(FIELD_TYPE_DEFINITIONS));
export function getFieldTypeDefinition(type = "text") {
  return FIELD_TYPE_DEFINITIONS[type] || FIELD_TYPE_DEFINITIONS.text;
}
