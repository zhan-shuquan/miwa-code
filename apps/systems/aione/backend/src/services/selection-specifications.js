import { parseSupplierFile } from './selection-sku-file.js';
const fail = (s) => { const e = new Error(s); e.statusCode = 400; throw e; };
const clean = (s, n = 200) => String(s ?? '').trim().slice(0,n);
export function specifications(input, snapshot, submit = false) {
  const hasVariants = input.has_variants === true || input.has_variants === 1;
  const attributes = (input.specificationAttributes || []).map(a => ({attribute:clean(a.attribute), sales:a.sales === true, ...(a.values != null ? {values:clean(a.values,10000)} : {})}));
  if (attributes.length > 10 || new Set(attributes.map(a=>a.attribute)).size !== attributes.length) fail('规格属性重复或超过10项');
  const known = snapshot.itemAttributes || [];
  for (const a of attributes) if (!known.some(k=>k.name === a.attribute && !k.disabled)) fail('请选择ERP现有有效属性：'+a.attribute);
  const parsedFiles=(input.skuSourceFiles||[]).map(s=>parseSupplierFile(Buffer.from(String(s.base64||''),'base64'),input.sourceUrl,s.filename,snapshot));
  const sourceFiles=parsedFiles.map(p=>p.source);
  if (sourceFiles.length > 5 || new Set(sourceFiles.map(s=>s.sha256)).size !== sourceFiles.length) fail('原始SKU文件重复或超过5份');
  const sourceRows = new Map();
  for(const parsed of parsedFiles) for(const row of parsed.skus) sourceRows.set(row.code,row);
  const fixed = Object.fromEntries(attributes.filter(a=>!a.sales).map(a=>[a.attribute,clean(input.fixedSpecifications?.[a.attribute])]));
  const skus = (input.skus || []).map((s,i) => {
    const manual=s.origin==='manual',code=clean(s.code||s.supplierSkuId,100);
    if(!/^[\w-]{1,100}$/.test(code))fail('SKU草稿行标识无效，请重新添加该行');
    const supplierSkuId=clean(s.supplierSkuId??(manual?'':s.code),100);
    const original = sourceRows.get(code);
    if (sourceFiles.length && !original && !manual) fail('SKU不属于已上传原始文件，请使用手动录入添加新行');
    const row = {...original, code, supplierSkuId, origin:manual?'manual':'import', selected:s.selected !== false,
      confirmed:s.confirmed === true, spec:clean(s.spec,500),
      attributeValues:Object.fromEntries(attributes.filter(a=>a.sales).map(a=>[a.attribute,clean(s.attributeValues?.[a.attribute])]))};
    if(s.supplierImageUrl != null) {
      const image=clean(s.supplierImageUrl,4000);
      if(image && !/^https?:\/\//i.test(image)) fail('SKU参考图片须使用有效HTTP或HTTPS网址');
      row.supplierImageUrl=image;
    }
    for(const key of ['cost','weight','quantity','price'])delete row[key];
    for(const key of ['cost','weight','quantity','price']) if(s[key] != null && s[key] !== '') {
      if(!Number.isFinite(Number(s[key])) || Number(s[key]) < 0 || (['quantity','weight'].includes(key) && Number(s[key]) <= 0)) fail('SKU实际差异值无效');
      row[key]=Number(s[key]);
    }
    if(submit && hasVariants && row.selected) {
      if(row.supplierCostText && row.supplierCost == null && row.cost == null && !(Number(input.custom_单个采购价)>0)) fail(`第${i+1}条SKU采购价为区间，请填写商品采购价或该SKU实际采购价`);
      if(!row.confirmed) fail(`第${i+1}条SKU尚未人工确认`);
      for(const value of [row.spec,...Object.values(row.attributeValues)]) if(!value || /[?\uFFFD]/.test(value)) fail(`第${i+1}条SKU存在未修正规格`);
    }
    return row;
  });
  if(skus.length > 500 || new Set(skus.map(s=>s.code)).size !== skus.length) fail('供应商SKU重复或超过500行');
  if(submit) {
    if(Object.values(fixed).some(v=>!v || /[?\uFFFD]/.test(v))) fail('固定规格尚未核实');
    if(hasVariants) {
      const rows=skus.filter(s=>s.selected);
      if(!rows.length || !attributes.some(a=>a.sales)) fail('多规格商品须确认销售属性及SKU');
      const supplierIds=rows.map(s=>s.supplierSkuId).filter(Boolean);
      if(new Set(supplierIds).size!==supplierIds.length) fail('1688 SKU ID重复，请核实');
      const combos=rows.map(s=>JSON.stringify(Object.entries(s.attributeValues).map(([k,v])=>[k,v.toLocaleLowerCase()])));
      if(new Set(combos).size !== combos.length) fail('确认的销售规格组合重复，请核实属性映射');
    }
  }
  return {has_variants:hasVariants,variant_based_on:'Item Attribute', specificationAttributes:attributes,
    fixedSpecifications:fixed, skuSourceFiles:sourceFiles, skus};
}

// Confirmation belongs to the selection action, not an individual row checkbox.
// Excluded rows retain their original data and can never be revived here.
export function confirmSpecifications(input, snapshot) {
  const axes=input.specificationAttributes||[];
  const prepared={...input,skus:(input.skus||[]).map(row=>row.selected===false?row:{...row,
    confirmed:true,
    spec:axes.map(a=>a.sales?row.attributeValues?.[a.attribute]:input.fixedSpecifications?.[a.attribute]).map(v=>clean(v)).join(' / ')
  })};
  return specifications(prepared,snapshot,true);
}
