// Deterministic Rakuten mapping: use canonical product facts and verified shop policy.
// No image guesses, invented maker model, or fastest-dispatch default.
const str=x=>String(x??"").trim();
const norm=x=>str(x).normalize("NFKC").toLowerCase().replace(/[\s_-]/g,"");
const COLORS={ブラック:["黑色","黒","black"],ホワイト:["白","white"],グレー:["灰色","gray"],オレンジ:["橙色","orange"],ブルー:["蓝色","blue"],レッド:["红色","red"],ベージュ:["米色","beige"]};
function color(x){return Object.entries(COLORS).find(([k,v])=>[k,...v].some(y=>norm(y)===norm(x)))?.[0]||str(x)}
export function autoMapAttributes({product,sku,genre,dictionaries={}}){
 const blocking=[],trace=[],attributes=[],e=product?.extraAttributes||{};
 for(const a of (genre?.attributes||[]).filter(a=>a?.properties?.rmsMandatoryFlg===true)){
  const id=String(a.id),name=str(a.nameJa),method=str(a.properties?.rmsInputMethod).toUpperCase();
  let value=str(sku?.attributes?.[name]??e[id]??e[name]),source=value?"stored_attribute":null;
  if(!value&&name==="メーカー型番"&&str(product?.productModel)){value=str(product.productModel);source="productModel"}
  if(!value&&name==="代表カラー"){
   const candidates=[product?.primaryColor,e.primaryColor,e["颜色"],sku?.attributes?.["颜色"],sku?.attributes?.["カラー"]].filter(x=>str(x)).map(color);
   if(new Set(candidates).size===1){value=candidates[0];source="structured_product_color"}
  }
  if(!value&&name==="素材"&&str(product?.material)){value=str(product.material);source="product.material"}
  if(!value&&method==="DESCRIPTIVE"&&str(a.dataType).toUpperCase()==="STRING"&&Number(a.minLength||0)<=1){value="-";source="confirmed_missing_text_rule"}
  if(value&&method==="SELECTIVE"){
   const choices=(dictionaries[id]||[]).filter(x=>str(x.nameJa));
   const match=choices.filter(x=>norm(x.nameJa)===norm(color(value)));
   if(match.length===1){value=match[0].nameJa;source+="_rms_dictionary"}else value="";
  }
  if(!value){blocking.push("required_attribute_unresolved:"+id);trace.push({id,name,status:"requires_source_fact"});continue}
  attributes.push({name,values:[value],...(str(a.unit)?{unit:str(a.unit)}:{})});
  trace.push({id,name,status:"mapped",value,source});
 }
 return {attributes,blocking,trace};
}
export function autoMapShipping({product,shipping,shopPolicy={}}){
 const e=product?.extraAttributes||{},sets=shipping?.deliverySets||[],dates=shipping?.deliveryDates||[],blocking=[],trace=[];
 let set=sets.find(x=>String(x.id)===str(e.rakutenDeliverySetId));
 if(!set){
  const h=Number(product?.packageHeightCm),l=Number(product?.packageLengthCm),w=Number(product?.packageWidthCm),mass=Number(product?.actualShipmentWeightG);
  const fits=product?.sizeClass==="3cm厚"&&[h,l,w,mass].every(x=>x>0)&&h<=3&&Math.max(l,w)<=31.2&&Math.min(l,w)<=22.8&&mass<=1000;
  const matches=sets.filter(x=>/ネコポス/.test(str(x.name)));
  if(fits&&matches.length===1){set=matches[0];trace.push({field:"deliverySetId",source:"measured_package_and_rms_carrier"})}
  else if(sets.length===1&&shopPolicy.singleDeliverySetAppliesToAll===true){set=sets[0];trace.push({field:"deliverySetId",source:"verified_shop_policy"})}
  else blocking.push("delivery_group_requires_packaging_or_shop_rule");
 }
 let date=dates.find(x=>String(x.id)===str(e.rakutenNormalDeliveryDateId));
 if(!date){
  const days=Number(shopPolicy.confirmedDispatchDays);
  const matches=Number.isInteger(days)&&days>=0&&shopPolicy.dispatchPolicyVerified===true?dates.filter(x=>Number(x.days)===days):[];
  if(matches.length===1){date=matches[0];trace.push({field:"normalDeliveryDateId",source:"verified_dispatch_sla"})}
  else blocking.push("dispatch_sla_requires_shop_rule");
 }
 return {deliverySetId:set?.id??null,normalDeliveryDateId:date?.id??null,blocking,trace};
}
export function autoMapCatalog({product,shopPolicy={}}){
 if(str(product?.barcode))return {articleNumber:{value:str(product.barcode)},blocking:[],source:"product.barcode"};
 const reason=str(product?.extraAttributes?.rakutenCatalogExemptionReason);
 if(/^[1-9][0-9]?$/.test(reason))return {articleNumber:{exemptionReason:Number(reason)},blocking:[],source:"verified_product_setting"};
 const genres=(shopPolicy.applicableGenreIds||[]).map(String);
 if(shopPolicy.noJanExemptionVerified===true&&genres.includes(str(product?.rakutenGenreId))&&Number.isInteger(shopPolicy.noJanExemptionReason))
  return {articleNumber:{exemptionReason:shopPolicy.noJanExemptionReason},blocking:[],source:"verified_shop_policy"};
 return {articleNumber:null,blocking:["jan_exemption_rule_not_verified"],source:null};
}
