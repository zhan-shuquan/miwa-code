// A projection of the existing settings catalog; stable IDs are the stored facts.
export function productCustomColumns(parameters,products=[]){
 const columns=[];
 for(const category of parameters?.customSettings?.categories||[]){
  if(category.productField||category.specBinding)continue;
  if(!(category.enabled&&category.productBinding)&&!products.some(p=>p.customSettings?.[category.id]))continue;
  const selected=p=>category.rows.find(r=>r.id===p.customSettings?.[category.id]);
  columns.push({key:'custom:'+category.id,label:category.name,selection:true,categoryId:category.id,value:p=>selected(p)?.name||p.customSettings?.[category.id]||''});
  for(const field of category.fields.filter(f=>!f.hidden))columns.push({
   key:'custom:'+category.id+':'+field.id,label:category.name+' · '+field.label,
   value:p=>{const v=selected(p)?.values?.[field.id];return typeof v==='boolean'?(v?'是':'否'):v??'';}
  });
 }
 return columns;
}
