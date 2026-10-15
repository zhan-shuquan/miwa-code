// Catalog values remain in the existing authoritative shared-parameter payload.
export const SETTINGS_CATALOGS = Object.freeze({
 chinaPackaging: {label:'中国包装方式', owner:'商品之家', path:['commerce','chinaPackagingCny'], currency:'CNY'},
 japanPackaging: {label:'日本包装物', owner:'商品之家', path:['commerce','japanPackagingJpy'], currency:'JPY'},
 logistics: {label:'物流方式与运费', owner:'往来之家', path:['commerce','logistics'], currency:'CNY'}
});
export function catalogValues(parameters,kind){const def=SETTINGS_CATALOGS[kind];return def?def.path.reduce((v,k)=>v?.[k],parameters)||{}:{};}
export function catalogRows(parameters,kind){return Object.entries(catalogValues(parameters,kind)).map(([key,value],i)=>({key,name:kind==='logistics'?value.name:key,value,...(parameters.settingsCatalogMeta?.[kind]?.[key]||{}),enabled:parameters.settingsCatalogMeta?.[kind]?.[key]?.enabled!==false,isDefault:parameters.settingsCatalogMeta?.[kind]?.[key]?.isDefault===true,sortOrder:parameters.settingsCatalogMeta?.[kind]?.[key]?.sortOrder??i+1})).sort((a,b)=>a.sortOrder-b.sortOrder||a.name.localeCompare(b.name));}
export function catalogOptions(parameters,kind,current){const rows=catalogRows(parameters,kind).filter(r=>r.enabled!==false||r.name===current);if(current&&!rows.some(r=>r.name===current))rows.unshift({name:current});return rows.map(r=>r.name);}
export function setCatalogRow(parameters,kind,row){
 const def=SETTINGS_CATALOGS[kind];if(!def)throw new Error('未知设置分类');
 const key=String(row.key||'').trim();
 if(!key||key.length>80||['__proto__','constructor','prototype'].includes(key))throw new Error('名称或编号无效');
 if(row.isDefault===true&&row.enabled===false)throw new Error('默认选项必须启用');
 const map=catalogValues(parameters,kind);
 map[key]=kind==='logistics'?{...row.value,name:String(row.value?.name||'').trim()}:Number(row.value);
 parameters.settingsCatalogMeta??={};parameters.settingsCatalogMeta[kind]??={};
 if(row.isDefault===true){if(row.enabled===false)throw new Error('默认选项必须启用');for(const item of Object.values(parameters.settingsCatalogMeta[kind]))item.isDefault=false;}
 parameters.settingsCatalogMeta[kind][key]={enabled:row.enabled!==false,sortOrder:Number(row.sortOrder??1),isDefault:row.isDefault===true};
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
