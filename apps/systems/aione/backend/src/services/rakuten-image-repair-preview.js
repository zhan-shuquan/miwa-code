// Read-only proposal. Never issue PATCH/PUT here or silently re-create an item.
import {createHash} from "node:crypto";
const value=x=>String(x??"").trim();
const basename=x=>value(x).split("/").at(-1);
const sha=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const EXPECTED_SKU=["zjl238-04","zjl238-05"];
export function buildZjl238ImageRepairPreview({item={},assets=[]}={}){
 const blocking=[],changes=[],matched=new Set();
 const assetsByName=new Map();
 for(const asset of assets){
  if(!asset.location)continue;
  const key=basename(asset.location);
  if(assetsByName.has(key))blocking.push("duplicate_published_image:"+key);
  assetsByName.set(key,asset);
 }
 if(assetsByName.size!==12)blocking.push("twelve_verified_cabinet_images_required");
 const sourceImages=Array.isArray(item.images)?item.images:[];
 if(sourceImages.length!==10)blocking.push("ten_product_images_expected");
 const skus=item.variants||{};
 if(Object.keys(skus).length!==2||EXPECTED_SKU.some(code=>!skus[code]))
  blocking.push("locked_sku_identity_mismatch");
 const replaceImage=(image,slot)=>{
  if(!image||image.type!=="CABINET"){blocking.push("image_type_not_cabinet:"+slot);return image}
  const filename=basename(image.location),source=assetsByName.get(filename);
  if(!source){blocking.push("cabinet_source_missing:"+slot);return image}
  if(matched.has(filename)){blocking.push("duplicate_item_image:"+filename);return image}
  matched.add(filename);
  if(image.location!==source.location)changes.push({slot,from:image.location,to:source.location});
  return {...image,location:source.location};
 };
 const newMain=sourceImages.map((x,i)=>replaceImage(x,"商品图"+(i+1)));
 const patchedVariants={};
 for(const code of EXPECTED_SKU){
  const list=skus[code]?.images;
  if(!Array.isArray(list)||list.length!==1){blocking.push("sku_image_count_invalid:"+code);continue}
  patchedVariants[code]={images:[replaceImage(list[0],"SKU "+code)]};
 }
 if(matched.size!==12)blocking.push("twelve_unique_item_image_refs_required");
 if(changes.length!==12)blocking.push("not_all_twelve_locations_need_repair");
 const itemImageFingerprint={images:item.images,variants:Object.fromEntries(EXPECTED_SKU.map(code=>[code,{images:skus[code]?.images||[]}]))};
 return {ready:blocking.length===0,blocking:[...new Set(blocking)],changes,
  originalImageDigest:sha(itemImageFingerprint),
  candidateImageFields:{images:newMain,variants:patchedVariants},
  notice:"Read-only, image-only candidate. Does NOT call Rakuten PATCH or write inventory; RMS PATCH contract and separate human approval required."};
}
