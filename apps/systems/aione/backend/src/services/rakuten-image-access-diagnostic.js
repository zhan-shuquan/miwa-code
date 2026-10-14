import pool from "../../db.js";
import {getRakutenCanonicalPackReadiness} from "./rakuten-canonical-publish-service.js";
import {getAllCabinetFolderFiles} from "../integrations/rakuten-rms-client.js";

const IMAGE_ORIGIN="https://image.rakuten.co.jp";
const IMAGE_PREFIX="/global-dimensions/cabinet";
const VALID_LOCATION=/^\/rkc001\/[a-z0-9_-]+\.(?:jpe?g|png|gif)$/i;
const code=x=>String(x??"").trim();

function canonicalUrl(location){
 const path=code(location);
 return VALID_LOCATION.test(path)?IMAGE_ORIGIN+IMAGE_PREFIX+path:null;
}

export function analyzeRmsImageReferences({item={},cabinetFiles=[],mappings=[],expectedCount=12}={}){
 const refs=(item.images||[]).map((x,i)=>({slot:"商品图"+(i+1),location:code(x.location),type:x.type||null}));
 for(const [sku,variant] of Object.entries(item.variants||{})){
  for(const [i,img] of (variant.images||[]).entries())
   refs.push({slot:"SKU "+sku+(i?"/"+(i+1):""),location:code(img.location),type:img.type||null});
 }
 const issues=[];
 if(refs.length!==expectedCount)issues.push("referenced_image_count_mismatch");
 const rows=refs.map(ref=>{
  const errors=[],url=canonicalUrl(ref.location);
  if(!url||ref.type&&ref.type!=="CABINET")errors.push("itemapi_image_location_invalid");
  const name=ref.location.split("/").at(-1);
  const remoteMatches=Array.isArray(cabinetFiles)?cabinetFiles.filter(f=>code(f.filePath)===name):[];
  if(remoteMatches.length!==1)errors.push(remoteMatches.length?"cabinet_filename_ambiguous":"cabinet_file_missing");
  const remote=remoteMatches.length===1?remoteMatches[0]:null;
  const mapped=mappings.filter(m=>code(m.external_path).split("/").at(-1)===name&&m.mapping_status==="active");
  if(mapped.length!==1||!remote||code(mapped[0].external_asset_id)!==code(remote.fileId))
   errors.push("mapped_file_identity_mismatch");
  let providerUrl=null,providerUrlMatches=false;
  if(remote?.fileUrl&&url){
   try {
    const u=new URL(remote.fileUrl),expected=new URL(url);
    providerUrl=u.toString();
    providerUrlMatches=u.protocol==="https:"&&u.hostname===expected.hostname&&u.pathname===expected.pathname;
   }catch{}
   if(!providerUrlMatches)errors.push("provider_url_differs_from_itemapi");
  }else if(remote&&!remote.fileUrl){
   errors.push("cabinet_provider_url_missing");
  }
  return {...ref,url,providerUrl,remoteFileId:remote?.fileId??null,remoteFileFound:Boolean(remote),mappingFound:Boolean(mapped.length===1),providerUrlMatches,access:null,issues:errors};
 });
 for(const [i,row] of rows.entries())for(const x of row.issues)issues.push(x+":"+String(i+1));
 return {rows,issues:[...new Set(issues)],total:rows.length,cabinetMatched:rows.filter(r=>r.remoteFileFound&&r.mappingFound&&r.providerUrlMatches&&r.issues.length===0).length};
}

export async function probeRmsImageUrl(url,{request=fetch,timeoutMs=5000}={}){
 if(!url||!url.startsWith(IMAGE_ORIGIN+IMAGE_PREFIX+"/rkc001/")||!VALID_LOCATION.test(url.slice((IMAGE_ORIGIN+IMAGE_PREFIX).length)))
  return {ok:false,status:null,reason:"unsafe_or_invalid_image_url"};
 try{
  const response=await request(url,{method:"GET",headers:{Accept:"image/*",Range:"bytes=0-0"},redirect:"manual",signal:AbortSignal.timeout(timeoutMs)});
  const contentType=code(response.headers?.get?.("content-type")).toLowerCase();
  const ok=(response.status===200||response.status===206)&&contentType.startsWith("image/");
  try{await response.body?.cancel?.()}catch{}
  return {ok,status:response.status,contentType:contentType||null,reason:ok?null:"image_http_not_readable"};
 }catch(err){
  return {ok:false,status:null,reason:err?.name==="TimeoutError"?"image_request_timeout":"image_request_failed"};
 }
}

export async function verifyRmsPublishedImageAccess({
 productId,item,shopRef="永井GD",db=pool,loadPlan=getRakutenCanonicalPackReadiness,
 readCabinetFiles=getAllCabinetFolderFiles,probe=probeRmsImageUrl
}={}){
 if(shopRef!=="永井GD")throw Object.assign(new Error("Pilot shop mismatch."),{code:"pilot_scope_rejected",statusCode:403});
 const plan=await loadPlan({productId,shopRef,containerCode:"rkc001"});
 const folderId=Number(plan?.container?.rakutenFolderId);
 if(!Number.isSafeInteger(folderId)||folderId<=0)
  return {verified:false,total:0,accessible:0,cabinetMatched:0,issues:["cabinet_folder_id_unresolved"],rows:[]};
 const [cabinetFiles,existing]=await Promise.all([
  readCabinetFiles({folderId}),
  db.query("SELECT pa.id AS asset_id,cam.external_path,cam.external_asset_id,cam.lifecycle_status AS mapping_status FROM public.product_assets pa LEFT JOIN public.channel_asset_mappings cam ON cam.asset_id=pa.id AND cam.channel='rakuten' AND cam.shop_ref=$2 AND cam.archived_at IS NULL WHERE pa.product_id=$1 AND pa.archived_at IS NULL ORDER BY pa.asset_no",[productId,shopRef])
 ]);
 const checked=analyzeRmsImageReferences({item,cabinetFiles,mappings:existing.rows,expectedCount:12});
 const rows=checked.rows;
 // Range-limited GET checks actual CDN visibility; never writes to RMS or reads private files.
 // Bound concurrency and time so a slow CDN cannot overload the AIONE bridge.
 for(let i=0;i<rows.length;i+=6){
  await Promise.all(rows.slice(i,i+6).map(async row=>{
   row.access=await probe(row.url);
   if(!row.access?.ok)row.issues.push("image_url_unreachable");
  }));
 }
 const issues=[...checked.issues];
 for(const [i,row] of rows.entries())if(!row.access?.ok)issues.push("image_url_unreachable:"+String(i+1));
 const accessible=rows.filter(row=>row.access?.ok).length;
 return {verified:!issues.length&&accessible===12,total:rows.length,accessible,
  cabinetMatched:checked.cabinetMatched,issues,rows,
  notice:"Read-only remote R-Cabinet file ID / FileUrl reconciliation and public image URL GET; does not change ItemAPI, stock or images."};
}
