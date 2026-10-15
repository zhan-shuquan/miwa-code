import {customCategories,sortedCustomRows} from '../config/custom-settings.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function productCustomSettingsHtml(parameters,product,usage={}){
 const categories=customCategories(parameters).filter(c=>c.enabled&&c.productBinding||product.customSettings?.[c.id]);
 if(!categories.length)return '';
 return '<div class="pw-v7-block"><h3>自定义选项 <button class="btn" type="button" data-product-settings>维护设置</button></h3><p class="pw-helper">由设置中心维护；仅保存商品资料，不自动参与成本核算或平台上架。</p><div class="pw-four">'+categories.map(c=>{
  const current=product.customSettings?.[c.id]||'',rows=sortedCustomRows(c,usage[c.id]).filter(r=>c.enabled&&c.productBinding&&r.enabled||r.id===current),row=c.rows.find(r=>r.id===current);
  return '<label class="field"><span>'+esc(c.name)+(c.enabled&&c.productBinding?'':'（已停用）')+'</span><select data-custom-category="'+esc(c.id)+'"><option value="">请选择</option>'+rows.map(r=>'<option value="'+esc(r.id)+'" '+(r.id===current?'selected':'')+'>'+esc(r.name)+(r.enabled?'':'（已停用）')+'</option>').join('')+'</select>'+(row?'<small>'+c.fields.filter(f=>!f.hidden).map(f=>esc(f.label)+'：'+esc(typeof row.values[f.id]==='boolean'?(row.values[f.id]?'是':'否'):row.values[f.id]??'—')).join(' · ')+'</small>':'')+'</label>';
 }).join('')+'</div></div>';
}
