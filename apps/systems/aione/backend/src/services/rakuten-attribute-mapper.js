// Rakuten genre attributes are defined by the provider, not by the AIONE form.
// A missing value may use "-" only when the verified genre attribute contract
// explicitly declares a free-text attribute and permits that literal.
const nonBlank=value=>value!==undefined&&value!==null&&String(value).trim()!=="";
export function mapRakutenGenreAttributes(definitions,values={}){
 if(!Array.isArray(definitions))throw new TypeError("rakuten_genre_definitions_required");
 const attributes=[],blocking=[],autoFilled=[];
 for(const definition of definitions){
  const id=String(definition?.id||"").trim();
  if(!id){blocking.push("attribute_id_missing");continue;}
  const type=String(definition?.type||"").trim().toLowerCase();
  const required=definition?.required===true;
  const supplied=values[id];
  const value=nonBlank(supplied)?String(supplied).trim():null;
  if(value!==null){
   if(type==="choice"&&Array.isArray(definition.allowedValues)&&!definition.allowedValues.includes(value)){blocking.push("attribute_choice_invalid:"+id);continue;}
   if(type==="number"&&!Number.isFinite(Number(value))){blocking.push("attribute_number_invalid:"+id);continue;}
   attributes.push({id,value});continue;
  }
  if(!required)continue;
  const dashAllowed=type==="text"&&definition.allowDash===true&&definition.verified===true;
  if(dashAllowed){attributes.push({id,value:"-"});autoFilled.push(id);}
  else blocking.push("required_attribute_unresolved:"+id);
 }
 return {attributes,autoFilled,blocking,ready:blocking.length===0};
}
