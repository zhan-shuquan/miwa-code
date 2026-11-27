import { fillSingleAttribute } from '../services/selection-specification-fill.js';
// Draft row keys are local correlation keys; ERP alone creates formal SKU numbers.
const valid=value=>Boolean(String(value??'').trim())&&!/[?\uFFFD]/.test(String(value));
export function specificationIssues(data,index){
 const row=data.skus[index],axes=data.specificationAttributes||[];
 const values=axes.map(a=>a.sales?row.attributeValues?.[a.attribute]:data.fixedSpecifications?.[a.attribute]);
 if(!axes.length||!axes.some(a=>a.sales))return ['请选择至少一个销售可选属性'];
 if(!values.every(valid))return ['属性缺失或含缺字，请核实修正'];
 const key=s=>axes.filter(a=>a.sales).map(a=>String(s.attributeValues?.[a.attribute]||'').trim().toLocaleLowerCase()).join('\u0000');
 if(data.skus.some((s,i)=>i!==index&&s.selected!==false&&key(s)===key(row)))return ['销售规格组合重复'];
 for(const name of ['cost','weight','quantity','price'])if(row[name]!==''&&row[name]!=null&&(!Number.isFinite(Number(row[name]))||Number(row[name])<0||(['weight','quantity'].includes(name)&&Number(row[name])===0)))return ['采购价、净重或数量无效'];
 return [];
}

export function mountSpecifications({root,getData,attributes,api,file64,esc,on,guarded,report,erpSkus=[]}){
 root.classList.add('sw-specifications');
 const options=attributes.filter(a=>!a.disabled),batch=new Set();let importing=false;
 const init=()=>{const d=getData();d.specificationAttributes||=[];d.fixedSpecifications||={};d.skuSourceFiles||=[];d.skus||=[];d.has_variants=!!d.has_variants||d.skus.filter(s=>s.selected!==false).length>1;return d;};
 const status=()=>{const d=init();return '规格属性 '+d.specificationAttributes.length+' 项 · SKU '+d.skus.filter(s=>s.selected!==false).length+' 条';};
 const invalidate=()=>{getData().skus.forEach(s=>s.confirmed=false);};
 const newRow=values=>({code:'draft_'+crypto.randomUUID().replaceAll('-',''),supplierSkuId:'',origin:'manual',selected:true,confirmed:false,attributeValues:values||{},spec:''});
 const erpCell=(s,sales)=>{const row=erpSkus.find(r=>s.supplierSkuId?r.custom_miwa_supplier_sku_id===s.supplierSkuId:sales.length&&sales.every(a=>r.attributeValues?.[a.attribute]===s.attributeValues?.[a.attribute]));return row?[row.name,row.specNameZh,row.specNameJa||'日文规格待核实'].map(v=>esc(v)).join('<br>'):'待ERP生成';};
 function draw(){
  const d=init(),axes=d.specificationAttributes,sales=axes.filter(a=>a.sales);
  root.innerHTML=`<label class="sw-spec-toggle"><input type="checkbox" data-multiple ${d.has_variants?'checked':''}>有多种规格</label>
   <div class="sw-toolbar"><button type="button" data-import-spec ${importing?'disabled':''}>${importing?'正在解析表格…':'表格导入'}</button><input type="file" data-spec-file accept=".xlsx,.xls,.csv" hidden><button type="button" data-manual>手动录入</button></div>
   <h3>商品规格属性</h3><div>${axes.map((a,i)=>`<div class="sw-spec-axis"><select aria-label="商品规格属性${i+1}" data-attribute="${i}"><option value="">请选择ERP属性</option>${options.map(o=>`<option value="${esc(o.name)}" ${o.name===a.attribute?'selected':''}>${esc(o.name)}</option>`).join('')}</select><label><input type="checkbox" data-sales="${i}" ${a.sales?'checked':''}>销售可选属性</label>${a.sales?`<textarea rows="2" aria-label="${esc(a.attribute)}可选值" data-values="${esc(a.attribute)}" placeholder="输入实际值，以顿号或逗号分隔">${esc(a.values??[...new Set(d.skus.map(s=>s.attributeValues?.[a.attribute]).filter(Boolean))].join('、'))}</textarea>`:`<input aria-label="固定${esc(a.attribute)}" data-fixed="${esc(a.attribute)}" value="${esc(d.fixedSpecifications[a.attribute])}" placeholder="固定规格值">`}<button type="button" data-remove-attribute="${i}">删除属性</button></div>`).join('')}</div>
   <div class="sw-toolbar"><button type="button" data-add-attribute>添加规格属性</button><button type="button" data-generate>生成SKU组合</button><button type="button" data-add-row>添加SKU行</button></div>
   <p role="status" data-spec-count>${esc(status())}</p>
   ${d.has_variants||d.skus.length?`<h3>SKU清单</h3><div class="sw-toolbar"><button type="button" data-select-all>全选SKU行</button><button type="button" data-clear-batch>清除选择</button><button type="button" data-delete-batch>批量删除</button></div>
   <div class="sw-table-wrap"><table><thead><tr><th>选择</th><th>参考图片</th>${!sales.length?'<th>原始SKU名称</th>':''}${sales.map(a=>`<th>${esc(a.attribute)}</th>`).join('')}<th>采购价</th><th>净重</th><th>1688 SKU ID</th><th>ERP SKU</th><th>操作</th></tr></thead><tbody>${d.skus.map((s,i)=>s.selected===false?'':`<tr><td><input aria-label="选择SKU ${i+1}" type="checkbox" data-batch="${i}" ${batch.has(s.code)?'checked':''}></td><td>${/^https?:\/\//.test(s.supplierImageUrl||'')?`<a href="${esc(s.supplierImageUrl)}" target="_blank" rel="noopener"><img src="${esc(s.supplierImageUrl)}" alt="SKU参考图" referrerpolicy="no-referrer" width="48" height="48" loading="lazy" style="object-fit:contain"></a>`:''}</td>${!sales.length?`<td>${esc(s.originalName||s.spec)}</td>`:''}${sales.map(a=>`<td><input aria-label="${esc(a.attribute)} ${i+1}" data-spec-row="${i}" data-axis="${esc(a.attribute)}" value="${esc(s.attributeValues?.[a.attribute])}" placeholder="待核实"></td>`).join('')}${[['cost','采购价CNY','custom_单个采购价'],['weight','净重g','custom_单个净重g']].map(([key,label,parent])=>`<td><input type="number" min="0" aria-label="SKU${i+1}${label}" data-spec-row="${i}" data-key="${key}" value="${esc(s[key])}" placeholder="继承 ${esc(d[parent]??'')}"></td>`).join('')}<td><input aria-label="SKU${i+1} 1688 SKU ID" data-spec-row="${i}" data-key="supplierSkuId" value="${esc(s.supplierSkuId||'')}"></td><td>${erpCell(s,sales)}</td><td><button type="button" data-delete-row="${i}">删除行</button></td></tr>`).join('')}</tbody></table></div>`:''}
   ${d.skuSourceFiles.length?`<details><summary>原始导入文件</summary>${d.skuSourceFiles.map((s,i)=>`<p>${esc(s.filename)} <button type="button" data-download="${i}">下载原始文件</button></p>`).join('')}</details>`:''}`;
  const bind=(selector,event,fn)=>root.querySelectorAll(selector).forEach(el=>on(el,event,()=>fn(el)));
  const refreshCount=()=>root.querySelector('[data-spec-count]').textContent=status();
  bind('[data-multiple]','change',el=>{getData().has_variants=el.checked;draw();});
  bind('[data-manual]','click',()=>{getData().has_variants=true;if(!getData().specificationAttributes.length)getData().specificationAttributes.push({attribute:options[0]?.name||'',sales:true});if(!getData().skus.length)getData().skus.push(newRow());draw();});
  bind('[data-add-attribute]','click',()=>{if(axes.length>=10){report('规格属性不能超过10项');return;}getData().specificationAttributes.push({attribute:options.find(o=>!axes.some(a=>a.attribute===o.name))?.name||'',sales:true});invalidate();draw();});
  bind('[data-remove-attribute]','click',el=>{getData().specificationAttributes.splice(Number(el.dataset.removeAttribute),1);invalidate();draw();});
  bind('[data-attribute]','change',el=>{getData().specificationAttributes[Number(el.dataset.attribute)].attribute=el.value;fillSingleAttribute(getData());invalidate();draw();});
  bind('[data-sales]','change',el=>{getData().specificationAttributes[Number(el.dataset.sales)].sales=el.checked;invalidate();draw();});
  bind('[data-values]','input',el=>{getData().specificationAttributes.find(a=>a.attribute===el.dataset.values).values=el.value;});
  bind('[data-fixed]','input',el=>{getData().fixedSpecifications[el.dataset.fixed]=el.value;invalidate();refreshCount();});
  bind('[data-add-row]','click',()=>{if(getData().skus.length>=500){report('SKU总数不能超过500条');return;}getData().has_variants=true;getData().skus.push(newRow());draw();});
  bind('[data-delete-row]','click',el=>{const removed=getData().skus[Number(el.dataset.deleteRow)];removed.selected=false;removed.confirmed=false;batch.delete(removed.code);draw();});
  bind('[data-batch]','change',el=>{const key=getData().skus[Number(el.dataset.batch)].code;if(el.checked)batch.add(key);else batch.delete(key);});
  bind('[data-select-all]','click',()=>{getData().skus.filter(s=>s.selected!==false).forEach(s=>batch.add(s.code));draw();});
  bind('[data-clear-batch]','click',()=>{batch.clear();draw();});
  bind('[data-delete-batch]','click',()=>{if(!batch.size){report('请先选择SKU行');return;}getData().skus.filter(s=>batch.has(s.code)).forEach(s=>{s.selected=false;s.confirmed=false;});batch.clear();draw();});
  bind('[data-spec-row]','input',el=>{const s=getData().skus[Number(el.dataset.specRow)];s.confirmed=false;if(el.dataset.axis){s.attributeValues||={};s.attributeValues[el.dataset.axis]=el.value;}else s[el.dataset.key]=el.value;refreshCount();});
  bind('[data-generate]','click',()=>{
   const data=getData(),sales=data.specificationAttributes.filter(a=>a.sales);if(!sales.length){report('请先选择销售可选属性并输入实际值');return;}
   let combinations=[{}];for(const a of sales){const text=a.values??[...new Set(data.skus.map(s=>s.attributeValues?.[a.attribute]).filter(Boolean))].join('、');const values=[...new Set(text.split(/[\n、,，]/).map(v=>v.trim()).filter(Boolean))];if(!values.length||!values.every(valid)){report('请核实'+a.attribute+'的实际可选值');return;}if(combinations.length*values.length>500){report('组合超过500条，请减少属性值，只保留计划销售的实际规格');return;}combinations=combinations.flatMap(c=>values.map(v=>({...c,[a.attribute]:v})));}
   const key=v=>sales.map(a=>String(v[a.attribute]||'').toLocaleLowerCase()).join('\u0000'),existing=new Set(data.skus.map(s=>key(s.attributeValues||{})));
   const fresh=combinations.filter(v=>!existing.has(key(v)));if(data.skus.length+fresh.length>500){report('SKU总数超过500条');return;}data.skus.push(...fresh.map(newRow));data.has_variants=true;draw();report('新增 '+fresh.length+' 条SKU组合，请删除不存在或不准备销售的组合。');
  });
  bind('[data-download]','click',el=>{const s=getData().skuSourceFiles[Number(el.dataset.download)],a=document.createElement('a');a.href='data:application/octet-stream;base64,'+s.base64;a.download=s.filename;a.click();});
  bind('[data-import-spec]','click',()=>root.querySelector('[data-spec-file]').click());
  on(root.querySelector('[data-spec-file]'),'change',guarded(async e=>{
   const file=e.target.files[0];if(!file||importing)return;importing=true;draw();
   try{
    const parsed=await api('/sku-file','POST',{filename:file.name,base64:await file64(file),sourceUrl:getData().sourceUrl});
    if(!parsed.source||!Array.isArray(parsed.skus)||!parsed.skus.length)throw Error('表格未返回有效SKU，请检查表头和数据行');
    const data=getData();if(data.skuSourceFiles.some(s=>s.sha256===parsed.source.sha256)){report('该表格已导入，现有人工修正保持不变');return;}
    const old=new Map(data.skus.map(s=>[s.code,s]));
    if(data.skuSourceFiles.length>=5)throw Error('最多保留5份原始表格，请核对后导入');
    const differences=parsed.skus.flatMap(s=>{const previous=old.get(s.code);if(!previous)return ['新增SKU '+(s.supplierSkuId||s.spec)];return [['originalName','原始规格'],['supplierCost','参考采购价'],['supplierStock','参考库存'],['supplierImageUrl','参考图片']].filter(([key])=>String(previous[key]??'')!==String(s[key]??'')).map(([key,label])=>(s.supplierSkuId||s.code)+' · '+label+'：'+String(previous[key]??'空')+' → '+String(s[key]??'空'));});
    if(data.skuSourceFiles.length&&differences.length){
     const accepted=await new Promise(resolve=>{const dialog=document.createElement('dialog');dialog.innerHTML='<h3>原始SKU资料差异</h3><p>更新供应商参考资料，保留人工修正及确认值。</p><ul>'+differences.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul><button data-accept>确认导入</button><button data-cancel>取消</button>';root.append(dialog);const finish=value=>{dialog.close();dialog.remove();resolve(value);};dialog.querySelector('[data-accept]').onclick=()=>finish(true);dialog.querySelector('[data-cancel]').onclick=()=>finish(false);dialog.oncancel=e=>{e.preventDefault();finish(false);};dialog.showModal();});
     if(!accepted)return;
    }
    if(new Set([...old.keys(),...parsed.skus.map(s=>s.code)]).size>500)throw Error('SKU总数超过500条，未合并本次表格');
    for(const s of parsed.skus){const previous=old.get(s.code);old.set(s.code,previous?{...s,...previous,originalName:s.originalName,supplierCost:s.supplierCost,supplierStock:s.supplierStock,supplierImageUrl:previous.supplierImageUrl??s.supplierImageUrl,sourceParts:s.sourceParts,warnings:s.warnings}:s);}
    data.skus=[...old.values()];data.skuSourceFiles.push(parsed.source);
    if(!data.specificationAttributes.length){data.specificationAttributes=parsed.specificationAttributes||[];data.fixedSpecifications={...parsed.fixedSpecifications,...data.fixedSpecifications};}
    data.has_variants=true;report('已导入 '+parsed.skus.length+' 条SKU。'+(parsed.warnings||[]).join('；'));
   }finally{importing=false;draw();}
  }));
 }
 draw();return {draw};
}
