// Single source of truth for converting a verified R-Cabinet FileUrl into
// ItemAPI 2.0 CABINET.location (relative to /{shop}/cabinet).
// Store-specific path is deliberately locked for the first live GD pilot.
export const GD_CABINET_PUBLIC_BASE="https://image.rakuten.co.jp/global-dimensions/cabinet";
const GOOD_PATH=/^\/(?:[a-z0-9_-]+\/){1,5}[a-z0-9_-]+\.(?:jpe?g|png|gif)$/i;
const text=x=>String(x??"").trim();

export function publicCabinetImageUrl(location){
 const path=text(location);
 return GOOD_PATH.test(path)?GD_CABINET_PUBLIC_BASE+path:null;
}
export function cabinetLocationFromFileUrl(raw){
 try{
  const value=text(raw),url=new URL(value),prefix=new URL(GD_CABINET_PUBLIC_BASE);
  if(url.origin!==prefix.origin||url.username||url.password||url.search||url.hash)return null;
  if(!url.pathname.startsWith(prefix.pathname+"/"))return null;
  const path=url.pathname.slice(prefix.pathname.length);
  return publicCabinetImageUrl(path)===value?path:null;
 }catch{return null}
}
export function locatePublishedCabinetAsset(asset,remoteFiles=[]){
 const filename=text(asset?.external_path).split("/").at(-1);
 const fileId=Number(asset?.external_asset_id);
 if(!filename||!Number.isSafeInteger(fileId)||fileId<=0||asset?.mapping_status!=="active")
  return {...asset,location:null,locationError:"cabinet_mapping_missing_or_inactive"};
 const matches=remoteFiles.filter(file=>Number(file.fileId)===fileId&&text(file.filePath).split("/").at(-1)===filename);
 if(matches.length!==1)return {...asset,location:null,locationError:matches.length?"cabinet_mapping_ambiguous":"cabinet_mapping_remote_not_found"};
 const path=cabinetLocationFromFileUrl(matches[0].fileUrl);
 if(!path||path.split("/").at(-1)!==filename)
  return {...asset,location:null,locationError:"cabinet_provider_file_url_invalid"};
 return {...asset,location:path,locationError:null,verifiedCabinetFileId:fileId};
}
