// Catalog values remain in the existing authoritative shared-parameter payload.
export const SETTINGS_CATALOGS = Object.freeze({
 chinaPackaging: {label:'中国包装方式', owner:'商品之家', path:['commerce','chinaPackagingCny'], currency:'CNY'},
 japanPackaging: {label:'日本包装物', owner:'商品之家', path:['commerce','japanPackagingJpy'], currency:'JPY'},
 delivery: {label:'日本配送尺寸与运费', owner:'往来之家', path:['delivery'], currency:'JPY'},
 logistics: {label:'物流方式与运费', owner:'往来之家', path:['commerce','logistics'], currency:'CNY'}
});
export const DELIVERY_LEGACY_VALUES=Object.freeze({THIN_3CM:'3cm厚',SIZE_60:'60cm',SIZE_80:'80cm',SIZE_100:'100cm',SIZE_120:'120cm'});
export function deliveryValue(key){return DELIVERY_LEGACY_VALUES[key]||key;}
export function deliveryKey(value){return Object.keys(DELIVERY_LEGACY_VALUES).find(k=>DELIVERY_LEGACY_VALUES[k]===value)||value;}
export function deliveryOptions(parameters,current,usage){const rows=catalogRows(parameters,'delivery',usage).filter(r=>r.enabled||deliveryValue(r.key)===current);const options=rows.map(r=>({value:deliveryValue(r.key),label:r.name+(r.enabled?'':'（已停用）')}));if(current&&!options.some(r=>r.value===current))options.unshift({value:current,label:current+'（历史值）'});return options;}
export function deliveryDefault(parameters,fallback='3cm厚'){const rows=catalogRows(parameters,'delivery').filter(r=>r.enabled);const row=rows.find(r=>r.isDefault)||rows.find(r=>deliveryValue(r.key)===fallback)||rows[0];return row?deliveryValue(row.key):'';}
export function catalogValues(parameters,kind){const def=SETTINGS_CATALOGS[kind];return def?def.path.reduce((v,k)=>v?.[k],parameters)||{}:{};}
export function catalogRows(parameters,kind,usage){return Object.entries(catalogValues(parameters,kind)).map(([key,value],i)=>({key,name:['logistics','delivery'].includes(kind)?value.name:key,value,...(parameters.settingsCatalogMeta?.[kind]?.[key]||{}),enabled:parameters.settingsCatalogMeta?.[kind]?.[key]?.enabled!==false&&(kind!=='delivery'||value.enabled!==false),isDefault:parameters.settingsCatalogMeta?.[kind]?.[key]?.isDefault===true,sortOrder:parameters.settingsCatalogMeta?.[kind]?.[key]?.sortOrder??i+1})).sort((a,b)=>a.sortOrder-b.sortOrder||a.name.localeCompare(b.name)).sort((a,b)=>Number(b.pinned===true)-Number(a.pinned===true)||(parameters.settingsCatalogSort?.[kind]==='name'?a.name.localeCompare(b.name):parameters.settingsCatalogSort?.[kind]==='manual'||!usage?0:(Number(usage[kind==='delivery'?deliveryValue(b.key):b.name])||0)-(Number(usage[kind==='delivery'?deliveryValue(a.key):a.name])||0))||a.sortOrder-b.sortOrder||a.name.localeCompare(b.name));}
export function catalogOptions(parameters,kind,current,usage){const rows=catalogRows(parameters,kind,usage).filter(r=>r.enabled!==false||r.name===current);if(current&&!rows.some(r=>r.name===current))rows.unshift({name:current});return rows.map(r=>r.name);}
export function setCatalogRow(parameters,kind,row){
 const def=SETTINGS_CATALOGS[kind];if(!def)throw new Error('未知设置分类');
 const key=String(row.key||'').trim();
 if(!key||key.length>80||['__proto__','constructor','prototype'].includes(key))throw new Error('名称或编号无效');
 if(row.isDefault===true&&row.enabled===false)throw new Error('默认选项必须启用');
 const map=catalogValues(parameters,kind);
 map[key]=kind==='delivery'?{...row.value,name:String(row.value?.name||'').trim(),enabled:row.enabled!==false}:kind==='logistics'?{...row.value,name:String(row.value?.name||'').trim()}:Number(row.value);
 parameters.settingsCatalogMeta??={};parameters.settingsCatalogMeta[kind]??={};
 if(row.isDefault===true){if(row.enabled===false)throw new Error('默认选项必须启用');for(const item of Object.values(parameters.settingsCatalogMeta[kind]))item.isDefault=false;}
 parameters.settingsCatalogMeta[kind][key]={enabled:row.enabled!==false,sortOrder:Number(row.sortOrder??1),isDefault:row.isDefault===true,...(row.pinned!==undefined?{pinned:row.pinned}:parameters.settingsCatalogMeta[kind][key]?.pinned!==undefined?{pinned:parameters.settingsCatalogMeta[kind][key].pinned}:{})};
 return parameters;
}
export function catalogDefault(parameters,kind,fallback=''){
 const rows=catalogRows(parameters,kind).filter(r=>r.enabled!==false);
 return rows.find(r=>r.isDefault)?.name||rows.find(r=>r.name===fallback)?.name||rows[0]?.name||'';
}
export function removeCatalogRow(parameters,kind,key){
 if(!SETTINGS_CATALOGS[kind]||!Object.hasOwn(catalogValues(parameters,kind),key))throw new Error('设置项不存在');
 delete catalogValues(parameters,kind)[key];
 if(parameters.settingsCatalogMeta?.[kind])delete parameters.settingsCatalogMeta[kind][key];
}
