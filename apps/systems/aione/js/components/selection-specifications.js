// Selection draft editor. Formal identifiers are returned by ERP, never generated here.
export function mountSpecifications({root, getData, attributes, api, file64, esc, on, guarded, report}) {
  const options = attributes.filter(a=>!a.disabled);
  const draw = () => {
    const data=getData(); data.specificationAttributes ||= []; data.fixedSpecifications ||= {}; data.skuSourceFiles ||= []; data.skus ||= []; data.has_variants ??= data.skus.length > 0;
    const selected=data.skus.filter(s=>s.selected !== false), axes=data.specificationAttributes;
    root.innerHTML=`<label><input type="checkbox" data-multiple ${data.has_variants?'checked':''}>有多种规格</label>
      <span>规格生成依据：Item Attribute（ERP）</span>
      <div class="sw-toolbar"><button type="button" data-import-spec>上传1688 SKU资料</button><input type="file" data-spec-file accept=".csv" hidden><button type="button" data-add-attribute>添加ERP商品规格属性</button></div>
      <div>${axes.map((a,i)=>`<div class="sw-toolbar"><select aria-label="商品规格属性${i+1}" data-attribute="${i}"><option value="">请选择ERP属性</option>${options.map(o=>`<option value="${esc(o.name)}" ${o.name===a.attribute?'selected':''}>${esc(o.name)}</option>`).join('')}</select><label><input type="checkbox" data-sales="${i}" ${a.sales?'checked':''}>销售可选属性</label>${!a.sales?`<input aria-label="固定${esc(a.attribute)}" data-fixed="${esc(a.attribute)}" value="${esc(data.fixedSpecifications[a.attribute])}" placeholder="固定商品规格">`:''}<button type="button" data-remove-attribute="${i}">删除属性</button></div>`).join('')}</div>
      <p role="status" data-spec-count>计划销售SKU：${data.has_variants?selected.length:1} ${axes.map(a=>`${esc(a.attribute)}：${a.sales?new Set(selected.map(s=>s.attributeValues?.[a.attribute]).filter(Boolean)).size:(data.fixedSpecifications[a.attribute]?1:0)}种`).join(' · ')}</p>
      <div>${data.skuSourceFiles.map((s,i)=>`<p>${esc(s.filename)} · ${esc(s.encoding)} <button type="button" data-download="${i}">下载原始文件</button></p>`).join('')}</div>
      ${data.has_variants?`<div class="sw-table-wrap"><table><thead><tr><th>销售</th><th>供应商SKU ID</th><th>原始规格</th><th>确认规格</th>${axes.filter(a=>a.sales).map(a=>`<th>${esc(a.attribute)}</th>`).join('')}<th>供应商参考</th><th>实际差异（留空继承商品）</th><th>确认</th></tr></thead><tbody>${data.skus.map((s,i)=>`<tr><td><input aria-label="销售SKU ${i+1}" type="checkbox" data-selected="${i}" ${s.selected!==false?'checked':''}></td><td>${esc(s.supplierSkuId||s.code)}</td><td>${esc(s.originalName||s.spec)}${s.warnings?.length?'<p role="alert">原文缺字，请核实修正</p>':''}</td><td><input aria-label="确认规格${i+1}" data-spec-row="${i}" data-key="spec" value="${esc(s.spec)}"></td>${axes.filter(a=>a.sales).map(a=>`<td><input aria-label="${esc(a.attribute)} ${i+1}" data-spec-row="${i}" data-axis="${esc(a.attribute)}" value="${esc(s.attributeValues?.[a.attribute])}"></td>`).join('')}<td>采购价：${esc(s.supplierCost??'—')} CNY<br>库存：${esc(s.supplierStock??'—')}<br>重量参考：${esc(s.referenceWeight??'—')}g${s.supplierImageUrl?`<br><a href="${esc(s.supplierImageUrl)}" target="_blank" rel="noopener">原始图片</a>`:''}</td><td>${[['cost','采购价CNY'],['weight','净重g'],['quantity','套装数量']].map(([k,label])=>`<label>${label}<input type="number" min="0" aria-label="SKU${i+1}${label}" data-spec-row="${i}" data-key="${k}" value="${esc(s[k])}"></label>`).join('')}</td><td><input aria-label="确认SKU ${i+1}" type="checkbox" data-confirmed="${i}" ${s.confirmed?'checked':''}></td></tr>`).join('')}</tbody></table></div>`:''}`;
    const bind=(selector,event,fn)=>root.querySelectorAll(selector).forEach(el=>on(el,event,()=>fn(el)));
    bind('[data-multiple]','change',el=>{getData().has_variants=el.checked;draw()});
    bind('[data-add-attribute]','click',()=>{getData().specificationAttributes.push({attribute:options.find(o=>!axes.some(a=>a.attribute===o.name))?.name||'',sales:false});draw()});
    bind('[data-remove-attribute]','click',el=>{getData().specificationAttributes.splice(Number(el.dataset.removeAttribute),1);getData().skus.forEach(s=>s.confirmed=false);draw()});
    bind('[data-attribute]','change',el=>{getData().specificationAttributes[Number(el.dataset.attribute)].attribute=el.value;getData().skus.forEach(s=>s.confirmed=false);draw()});
    bind('[data-sales]','change',el=>{getData().specificationAttributes[Number(el.dataset.sales)].sales=el.checked;getData().skus.forEach(s=>s.confirmed=false);draw()});
    bind('[data-fixed]','input',el=>{getData().fixedSpecifications[el.dataset.fixed]=el.value;getData().skus.forEach(s=>s.confirmed=false)});
    bind('[data-selected]','change',el=>{getData().skus[Number(el.dataset.selected)].selected=el.checked;draw()});
    bind('[data-confirmed]','change',el=>{getData().skus[Number(el.dataset.confirmed)].confirmed=el.checked});
    bind('[data-spec-row]','input',el=>{const s=getData().skus[Number(el.dataset.specRow)];s.confirmed=false;if(el.dataset.axis){s.attributeValues||={};s.attributeValues[el.dataset.axis]=el.value}else s[el.dataset.key]=el.value;
      const d=getData(), rows=d.skus.filter(x=>x.selected!==false);
      root.querySelector('[data-spec-count]').textContent='计划销售SKU：'+rows.length+' '+d.specificationAttributes.map(a=>a.attribute+'：'+(a.sales?new Set(rows.map(x=>x.attributeValues?.[a.attribute]).filter(Boolean)).size:(d.fixedSpecifications[a.attribute]?1:0))+'种').join(' · ');
      root.querySelector('[data-confirmed="'+el.dataset.specRow+'"]').checked=false;
    });
    bind('[data-download]','click',el=>{const s=getData().skuSourceFiles[Number(el.dataset.download)],a=document.createElement('a');a.href='data:text/csv;base64,'+s.base64;a.download=s.filename;a.click()});
    bind('[data-import-spec]','click',()=>root.querySelector('[data-spec-file]').click());
    on(root.querySelector('[data-spec-file]'),'change',guarded(async e=>{
      const file=e.target.files[0];if(!file)return;
      const parsed=await api('/sku-file','POST',{filename:file.name,base64:await file64(file),sourceUrl:getData().sourceUrl});
      const d=getData();if(d.skuSourceFiles.some(s=>s.sha256===parsed.source.sha256)){report('同一原始文件已导入，保留现有修正。');return}
      const old=new Map(d.skus.map(s=>[s.supplierSkuId||s.code,s]));
      for(const s of parsed.skus){const previous=old.get(s.supplierSkuId);old.set(s.supplierSkuId,previous?{...s,...previous}:s)}
      d.skus=[...old.values()];d.skuSourceFiles.push(parsed.source);d.has_variants=true;
      // This supported CSV uses name segments; suggestions still require row confirmation.
      if(!d.specificationAttributes.length && options.some(a=>a.name==='Colour') && parsed.skus.every(s=>s.sourceParts.length===2)) {
        d.specificationAttributes.push({attribute:'Colour',sales:true});
        d.skus.forEach(s=>{s.attributeValues||={};s.attributeValues.Colour ||= s.sourceParts?.[0]||''});
        const sizes=[...new Set(parsed.skus.map(s=>s.originalName.match(/\b(\d+(?:\.\d+)?)[xX×](\d+(?:\.\d+)?)\s*CM/i)?.slice(1).join('×')).filter(Boolean))];
        if(sizes.length===1 && options.some(a=>a.name==='Size')) {d.specificationAttributes.push({attribute:'Size',sales:false});d.fixedSpecifications.Size=sizes[0]+'cm'}
      }
      draw();report('SKU已解析；请匹配ERP属性、修正缺字并保存草稿。'+parsed.warnings.join('；'));
    }));
  };
  draw(); return {draw};
}




