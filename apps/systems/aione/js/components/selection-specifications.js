// Selection draft editor. Formal identifiers are returned by ERP, never generated here.
export function mountSpecifications({root, getData, attributes, api, file64, esc, on, guarded, report, erpSkus = []}) {
  root.classList.add('sw-specifications');
  const options = attributes.filter(a=>!a.disabled);
  const valid = value => Boolean(String(value ?? '').trim()) && !/[?\uFFFD]/.test(String(value));
  const summary = () => {
    const d=getData(), rows=d.skus.filter(s=>s.selected!==false), axes=d.specificationAttributes;
    const confirmed=rows.filter(s=>s.confirmed && valid(s.spec) && axes.every(a=>valid(a.sales?s.attributeValues?.[a.attribute]:d.fixedSpecifications[a.attribute])));
    return '已导入 '+d.skus.length+' · 计划销售 '+(d.has_variants?rows.length:1)+' · 有效已确认 '+confirmed.length+' · 待确认 '+(rows.length-confirmed.length)+' '+axes.map(a=>a.attribute+'：'+(a.sales?new Set(confirmed.map(s=>s.attributeValues[a.attribute])).size:(valid(d.fixedSpecifications[a.attribute])?1:0))+'种（'+(a.sales?'销售可选':'固定规格')+'）').join(' · ');
  };
  const draw = () => {
    const data=getData(); data.specificationAttributes ||= []; data.fixedSpecifications ||= {}; data.skuSourceFiles ||= []; data.skus ||= []; data.has_variants ??= data.skus.length > 0;
    const selected=data.skus.filter(s=>s.selected !== false), axes=data.specificationAttributes;
    root.innerHTML=`<label class="sw-spec-toggle"><input type="checkbox" data-multiple ${data.has_variants?'checked':''}>有多种规格</label>
      <div class="sw-toolbar"><button type="button" data-import-spec>上传1688 SKU资料</button><input type="file" data-spec-file accept=".csv" hidden><button type="button" data-add-attribute>添加ERP商品规格属性</button></div>
      <div>${axes.map((a,i)=>`<div class="sw-toolbar"><select aria-label="商品规格属性${i+1}" data-attribute="${i}"><option value="">请选择ERP属性</option>${options.map(o=>`<option value="${esc(o.name)}" ${o.name===a.attribute?'selected':''}>${esc(o.name)}</option>`).join('')}</select><label><input type="checkbox" data-sales="${i}" ${a.sales?'checked':''}>销售可选属性</label>${!a.sales?`<input aria-label="固定${esc(a.attribute)}" data-fixed="${esc(a.attribute)}" value="${esc(data.fixedSpecifications[a.attribute])}" placeholder="固定商品规格">`:''}<select aria-label="原始分段映射${i+1}" data-map-segment="${i}"><option value="">从CSV分段填入空白值</option>${Array.from({length:Math.max(0,...data.skus.map(s=>s.sourceParts?.length||0))},(_,n)=>`<option value="${n}">第${n+1}段</option>`).join('')}</select><button type="button" data-remove-attribute="${i}">删除属性</button></div>`).join('')}</div>
      <p role="status" data-spec-count>${esc(summary())}</p>
      <div>${data.skuSourceFiles.map((s,i)=>`<p>${esc(s.filename)} · ${esc(s.encoding)} <button type="button" data-download="${i}">下载原始文件</button></p>`).join('')}</div>
      ${data.has_variants?`<div class="sw-table-wrap"><table><thead><tr><th>销售</th><th>参考图片</th>${axes.filter(a=>a.sales).map(a=>`<th>${esc(a.attribute)}</th>`).join('')}<th>采购价</th><th>净重</th><th>确认</th><th>ERP SKU</th><th>详情</th></tr></thead><tbody>${data.skus.map((s,i)=>`<tr><td><input aria-label="销售SKU ${i+1}" type="checkbox" data-selected="${i}" ${s.selected!==false?'checked':''}></td><td>${/^https?:\/\//.test(s.supplierImageUrl||'')?`<a href="${esc(s.supplierImageUrl)}" target="_blank" rel="noopener"><img src="${esc(s.supplierImageUrl)}" alt="SKU参考图" referrerpolicy="no-referrer" width="48" height="48" loading="lazy" style="object-fit:contain"></a>`: '—'}</td>${axes.filter(a=>a.sales).map(a=>`<td><input aria-label="${esc(a.attribute)} ${i+1}" aria-invalid="${!valid(s.attributeValues?.[a.attribute])}" data-spec-row="${i}" data-axis="${esc(a.attribute)}" value="${esc(s.attributeValues?.[a.attribute])}" placeholder="待核实"></td>`).join('')}${[['cost','采购价CNY','custom_单个采购价'],['weight','净重g','custom_单个净重g']].map(([k,label,parent])=>`<td><input type="number" min="0" aria-label="SKU${i+1}${label}" data-spec-row="${i}" data-key="${k}" value="${esc(s[k])}" placeholder="继承 ${esc(data[parent]??'')}"></td>`).join('')}<td><input aria-label="确认SKU ${i+1}" type="checkbox" data-confirmed="${i}" ${s.confirmed?'checked':''}></td><td>${esc(erpSkus.find(r=>r.custom_miwa_supplier_sku_id===(s.supplierSkuId||s.code))?.name||'待建档')}</td><td><details><summary>原始资料</summary><p>供应商SKU：${esc(s.supplierSkuId||s.code)}</p><p>${esc(s.originalName)}</p>${s.warnings?.length?'<p role="alert">原始资料缺字，请核实对应属性</p>':''}<label>确认规格<input aria-label="确认规格${i+1}" data-spec-row="${i}" data-key="spec" value="${esc(s.spec)}"></label><p>参考采购价：${esc(s.supplierCost??'—')} · 库存：${esc(s.supplierStock??'—')}</p><label>套装数量<input type="number" min="1" aria-label="SKU${i+1}套装数量" data-spec-row="${i}" data-key="quantity" value="${esc(s.quantity)}" placeholder="继承商品"></label></details></td></tr>`).join('')}</tbody></table></div>`:''}`;

    const bind=(selector,event,fn)=>root.querySelectorAll(selector).forEach(el=>on(el,event,()=>fn(el)));
    bind('[data-multiple]','change',el=>{getData().has_variants=el.checked;draw()});
    bind('[data-add-attribute]','click',()=>{getData().specificationAttributes.push({attribute:options.find(o=>!axes.some(a=>a.attribute===o.name))?.name||'',sales:false});draw()});
    bind('[data-remove-attribute]','click',el=>{getData().specificationAttributes.splice(Number(el.dataset.removeAttribute),1);getData().skus.forEach(s=>s.confirmed=false);draw()});
    bind('[data-attribute]','change',el=>{getData().specificationAttributes[Number(el.dataset.attribute)].attribute=el.value;getData().skus.forEach(s=>s.confirmed=false);draw()});
    bind('[data-sales]','change',el=>{getData().specificationAttributes[Number(el.dataset.sales)].sales=el.checked;getData().skus.forEach(s=>s.confirmed=false);draw()});
    bind('[data-fixed]','input',el=>{getData().fixedSpecifications[el.dataset.fixed]=el.value;getData().skus.forEach(s=>s.confirmed=false);root.querySelectorAll("[data-confirmed]").forEach(el=>el.checked=false);root.querySelector("[data-spec-count]").textContent=summary()});
    bind('[data-map-segment]','change',el=>{if(el.value==='')return;const d=getData(),axis=d.specificationAttributes[Number(el.dataset.mapSegment)],part=Number(el.value);if(!axis.attribute)return;
      if(axis.sales){d.skus.forEach(row=>{row.attributeValues||={};if(!row.confirmed&&!row.attributeValues[axis.attribute])row.attributeValues[axis.attribute]=row.sourceParts?.[part]||''})}
      else{const values=[...new Set(d.skus.filter(s=>s.selected!==false).map(s=>s.sourceParts?.[part]).filter(Boolean))];if(values.length!==1){report('该分段有多个值，请作为销售属性或人工填写固定规格。');return}if(!d.fixedSpecifications[axis.attribute]){d.fixedSpecifications[axis.attribute]=values[0];d.skus.forEach(s=>s.confirmed=false)}}draw()});
    bind('[data-selected]','change',el=>{getData().skus[Number(el.dataset.selected)].selected=el.checked;draw()});
    bind('[data-confirmed]','change',el=>{const row=getData().skus[Number(el.dataset.confirmed)];if(el.checked){const d=getData(),values=d.specificationAttributes.map(a=>a.sales?row.attributeValues?.[a.attribute]:d.fixedSpecifications[a.attribute]);if(!values.length||!values.every(valid)){el.checked=false;report('请先核实本行所有属性及固定规格。');return}row.spec=values.join(' / ')}row.confirmed=el.checked;root.querySelector("[data-spec-count]").textContent=summary()});
    bind('[data-spec-row]','input',el=>{const s=getData().skus[Number(el.dataset.specRow)];s.confirmed=false;if(el.dataset.axis){s.attributeValues||={};s.attributeValues[el.dataset.axis]=el.value;el.setAttribute("aria-invalid",String(!valid(el.value)))}else s[el.dataset.key]=el.value;
      root.querySelector('[data-spec-count]').textContent=summary();
      root.querySelector('[data-confirmed="'+el.dataset.specRow+'"]').checked=false;
    });
    bind('[data-download]','click',el=>{const s=getData().skuSourceFiles[Number(el.dataset.download)],a=document.createElement('a');a.href='data:text/csv;base64,'+s.base64;a.download=s.filename;a.click()});
    bind('[data-import-spec]','click',()=>root.querySelector('[data-spec-file]').click());
    on(root.querySelector('[data-spec-file]'),'change',guarded(async e=>{
      const file=e.target.files[0];if(!file)return;
      const parsed=await api('/sku-file','POST',{filename:file.name,base64:await file64(file),sourceUrl:getData().sourceUrl});
      const d=getData();if(d.skuSourceFiles.some(s=>s.sha256===parsed.source.sha256)){report('同一原始文件已导入，保留现有修正。');return}
      const existing=new Map(d.skus.map(s=>[s.supplierSkuId||s.code,s]));
      const differences=parsed.skus.flatMap(row=>{const prev=existing.get(row.supplierSkuId);if(!prev)return ['新增SKU '+row.supplierSkuId];return ['originalName','supplierCost','supplierStock','supplierImageUrl'].filter(k=>String(prev[k]??'')!==String(row[k]??'')).map(k=>row.supplierSkuId+' · '+k+'：'+String(prev[k]??'空')+' → '+String(row[k]??'空'))});
      if(d.skuSourceFiles.length && differences.length){
        const accepted=await new Promise(resolve=>{const dialog=document.createElement('dialog');dialog.innerHTML='<h3>原始SKU资料差异</h3><p>以下变更仅更新供应商参考资料；人工修正及确认值继续保留。</p><ul>'+differences.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul><button data-accept>确认导入</button><button data-cancel>取消</button>';root.append(dialog);const finish=value=>{dialog.close();dialog.remove();resolve(value)};dialog.querySelector('[data-accept]').onclick=()=>finish(true);dialog.querySelector('[data-cancel]').onclick=()=>finish(false);dialog.oncancel=e=>{e.preventDefault();finish(false)};dialog.showModal()});
        if(!accepted)return;
      }
      const old=new Map(d.skus.map(s=>[s.supplierSkuId||s.code,s]));
      for(const s of parsed.skus){const previous=old.get(s.supplierSkuId);old.set(s.supplierSkuId,previous?{...s,...previous,originalName:s.originalName,supplierCost:s.supplierCost,supplierStock:s.supplierStock,supplierImageUrl:s.supplierImageUrl,sourceParts:s.sourceParts,warnings:s.warnings}:s)}
      d.skus=[...old.values()];d.skuSourceFiles.push(parsed.source);d.has_variants=true;
      draw();report('SKU已解析；请匹配ERP属性、修正缺字并保存草稿。'+parsed.warnings.join('；'));
    }));
  };
  draw(); return {draw};
}




