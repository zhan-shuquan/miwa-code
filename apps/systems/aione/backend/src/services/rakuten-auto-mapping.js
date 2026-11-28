import {translateSpec} from '../../../js/config/product-spec-settings.js';
// Deterministic Rakuten mapping: use canonical product facts and verified shop policy.
// No image guesses, invented maker model, or fastest-dispatch default.
const str=x=>String(x??"").trim();
const norm=x=>str(x).normalize("NFKC").toLowerCase().replace(/[\s_-]/g,"");
const COLORS={ブラック:["黑色","黒","black"],ホワイト:["白","white"],グレー:["灰色","gray"],オレンジ:["橙色","orange"],ブルー:["蓝色","blue"],レッド:["红色","red"],ベージュ:["米色","beige"]};
function color(x,parameters){const translated=translateSpec(parameters,'颜色',str(x));if(translated.categoryId)return translated.missing?'':translated.value;return Object.entries(COLORS).find(([k,v])=>[k,...v].some(y=>norm(y)===norm(x)))?.[0]||str(x)}
const pilotDash=(p,a)=>p?.localCode==="zjl238"&&p?.targetShopRef==="永井GD"&&String(p?.rakutenGenreId)==="565305"&&String(a?.id)==="8"&&a?.nameJa==="代表カラー";
export function autoMapAttributes({product,sku,genre,dictionaries={},parameters={}}){
 const blocking=[],trace=[],attributes=[],e=product?.extraAttributes||{};
 for(const a of (genre?.attributes||[]).filter(x=>x?.properties?.rmsMandatoryFlg===true)){
  const id=String(a.id),name=str(a.nameJa),method=str(a.properties?.rmsInputMethod).toUpperCase();
  const dictionary=Array.isArray(dictionaries[id])?dictionaries[id]:[];
  let value=str(sku?.attributes?.[name]??sku?.attributes?.[id]??e[id]??e[name]),source=value?"saved_attribute":null;
  if(!value&&name==="メーカー型番"&&str(product?.productModel)){value=str(product.productModel);source="product_model";}
  if(!value&&name==="代表カラー"){
   const colors=[product?.primaryColor,e.primaryColor,e["颜色"],sku?.attributes?.["颜色"],sku?.attributes?.["カラー"]].filter(x=>str(x)).map(x=>color(x,parameters));
   if(colors.length&&new Set(colors).size===1){value=colors[0];source="structured_color";}
  }
  if(!value&&name==="素材"&&str(product?.material)){value=str(product.material);source="material";}
  if(method==="SELECTIVE"&&value){
   const matched=dictionary.filter(x=>norm(x?.nameJa)===norm(color(value,parameters)));
   if(matched.length===1){value=matched[0].nameJa;source="rms_dictionary";}
   else if(value!=="-"||!(dictionary.some(x=>str(x?.nameJa)==="-")||pilotDash(product,a))){value="";}
  }
  const textAllowed=str(a.dataType).toUpperCase()==="STRING"&&["DESCRIPTIVE","FREE_TEXT","TEXT","FREE"].includes(method);
  const selectiveDash=method==="SELECTIVE"&&(dictionary.some(x=>str(x?.nameJa)==="-")||pilotDash(product,a));
  if(!value&&(textAllowed||selectiveDash)){value="-";source=selectiveDash?"rms_verified_dash_option":"allowed_required_text_dash";}
  if(!value){blocking.push("required_attribute_no_compatible_value:"+id);trace.push({id,name,status:"missing_compatible_value"});continue;}
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
