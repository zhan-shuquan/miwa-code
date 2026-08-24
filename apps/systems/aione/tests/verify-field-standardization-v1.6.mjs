import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FIELD_TYPE_KEYS } from "../js/fields/field-types.js";
import { FIELD_SCHEMA_VERSION } from "../js/fields/field-standard.js";
import { MIWA_NINE_ELEMENTS, MIWA_NINE_ELEMENT_KEYS } from "../js/config/miwa-nine-elements.js";
import { getFieldSchema, getSystemFieldSchema, getSelectionRecordInputSchema } from "../js/config/field-registry.js";
import { getBusinessPageDefinition } from "../js/config/business-page-definitions.js";
import { getContentPageDefinition } from "../js/config/content-page-definitions.js";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=(r)=>fs.readFileSync(path.join(root,r),"utf8");
const must=(c,m)=>{if(!c)throw new Error(m)};
const businessRoutes=["customer-home","store-home","application-home","expense-home","income-home","cash-expense","work","analysis","talent-home","category-home","product-home","ai-home","shared-home"];
const requiredMeta=["schemaVersion","fieldCode","key","label","definition","dataType","nineElement","source","ownerRole","captureTiming","automation","validation","routes","permission","history","event","ui","db"];

must(FIELD_SCHEMA_VERSION==="1.0","字段Schema版本不是1.0");
must(MIWA_NINE_ELEMENTS.map((x)=>x.label).join("|")==="目标|人|物|事|平台|时间|钱|信息|结果","美和9要素固定顺序被改变");

for(const route of businessRoutes){
  const def=getBusinessPageDefinition(route); must(def,`业务定义缺失：${route}`);
  must(def.fieldSchemaId,`页面未登记fieldSchemaId：${route}`);
  must(def.fields.length>0,`标准字段为空：${route}`);
  must(def.systemFields.length>=6,`系统审计字段不足：${route}`);
  const codes=new Set();
  for(const field of def.fields){
    requiredMeta.forEach((key)=>must(Object.hasOwn(field,key),`${route}.${field.key}缺少字段元数据：${key}`));
    must(field.fieldCode.startsWith(field.fieldCode.split(".")[0]+"."),`${route}.${field.key} fieldCode异常`);
    must(FIELD_TYPE_KEYS.includes(field.dataType),`${field.fieldCode} 数据类型未登记：${field.dataType}`);
    must(MIWA_NINE_ELEMENT_KEYS.includes(field.nineElement),`${field.fieldCode} 未映射美和9要素`);
    must(field.permission.read==="internal_open" || field.permission.sensitivity!=="normal",`${field.fieldCode} 普通内部字段没有默认开放读取`);
    must(!codes.has(field.fieldCode),`${route}内fieldCode重复：${field.fieldCode}`); codes.add(field.fieldCode);
  }
}

const company=getContentPageDefinition("company"), knowledge=getContentPageDefinition("knowledge-home");
must(company.fields.map((x)=>x.fieldCode).join("|")===knowledge.fields.map((x)=>x.fieldCode).join("|"),"美和之家与知识之家没有共用同一内容字段语义");
must(company.fields.some((x)=>x.fieldCode==="content.body"&&x.dataType==="long_text"),"内容正文标准字段缺失");

const work=getFieldSchema("work");
const by=(fields,key)=>fields.find((x)=>x.key===key);
must(by(work,"timeEvidence")?.nineElement==="time"&&by(work,"timeEvidence")?.automation==="derived","工作有效时间字段未标准化为自动派生时间事实");
must(by(work,"moneyStatus")?.nineElement==="money","工作钱字段未映射到钱");
must(by(work,"result")?.nineElement==="result","工作结果字段未映射到结果");
must(by(getFieldSchema("expense-home"),"amount")?.dataType==="money","支出金额未使用money标准类型");
must(by(getFieldSchema("talent-home"),"name")?.nineElement==="people","人才姓名未映射到人");

const selection=getFieldSchema("selection"), selectionInput=getSelectionRecordInputSchema();
must(selection.some((x)=>x.fieldCode==="selection_opportunity.purchase_unit_price"&&x.storageKey==="pricing-purchase-unit"),"选品采购单价未连接旧详情存储键");
must(selectionInput.some((x)=>x.storageKey==="selection-record-name"&&x.importAliases.includes("商品名称")),"选品商品名称导入/详情字段映射缺失");
must(selectionInput.some((x)=>x.storageKey==="selection-record-source"&&x.importAliases.includes("采购来源链接")),"选品采购来源导入映射缺失");

for(const route of [...businessRoutes,"company","knowledge-home","selection"]){
  const sys=getSystemFieldSchema(route); const keys=new Set(sys.map((x)=>x.key));
  for(const key of ["createdAt","updatedAt","createdBy","updatedBy","recordVersion","archivedAt"]) must(keys.has(key),`${route}缺少系统审计字段：${key}`);
}

const mainDefs=read("js/config/business-page-definitions.js"), extraDefs=read("js/config/business-page-definitions-extra.js");
must(!/\bfields\s*:\s*\[/.test(mainDefs),"主业务定义仍保留页面内字段数组");
must(!/\bfields\s*:\s*\[/.test(extraDefs),"扩展业务定义仍保留页面内字段数组");
const businessPage=read("js/pages/business-page-template.js"), contentPage=read("js/pages/content-page-template.js"), preview=read("js/data/preview-opportunities.js");
for(const fn of ["coerceFieldValue","validateObjectByFields","formatFieldValue","getHtmlInputType"]) must(businessPage.includes(fn),`标准业务母版未使用字段标准能力：${fn}`);
for(const fn of ["coerceFieldValue","validateObjectByFields","getHtmlInputType"]) must(contentPage.includes(fn),`内容母版未使用字段标准能力：${fn}`);
must(preview.includes("getSelectionRecordInputSchema"),"选品批量导入仍未调用统一字段注册表");
must(fs.existsSync(path.join(root,"docs/FIELD_CATALOG_V1.0.json")),"机器可读字段目录未生成");
console.log("V1.6 field standardization validation passed.");
