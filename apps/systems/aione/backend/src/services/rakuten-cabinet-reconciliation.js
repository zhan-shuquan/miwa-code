import pool from "../../db.js";
import {getAllCabinetFolderFiles} from "../integrations/rakuten-rms-client.js";
import {buildRakutenSafeFilePath} from "../integrations/rakuten-cabinet-upload.js";
import {getRakutenCanonicalPackReadiness} from "./rakuten-canonical-publish-service.js";

export async function inspectRakutenCabinetProduct({productId,shopRef,containerCode="rkc001",readFiles=getAllCabinetFolderFiles,db=pool}) {
 const shop=String(process.env.AIONE_RAKUTEN_SHOP_REF||"").trim();
 if(!shop||shop!==shopRef)throw Object.assign(new Error("Credential shop binding mismatch."),{code:"rakuten_shop_binding_mismatch",statusCode:403});
 const plan=await getRakutenCanonicalPackReadiness({productId,shopRef,containerCode});
 const folderId=Number(plan.container?.rakutenFolderId);
 if(!Number.isSafeInteger(folderId)||folderId<=0)throw Object.assign(new Error("No verified cabinet folder."),{code:"rakuten_folder_unresolved",statusCode:409});
 const remote=await readFiles({folderId});
 const rows=await db.query(
   "SELECT pa.id,pa.canonical_name,pa.mime_type,cam.id AS mapping_id,cam.external_asset_id FROM public.product_assets pa LEFT JOIN public.channel_asset_mappings cam ON cam.asset_id=pa.id AND cam.channel='rakuten' AND cam.shop_ref=$2 AND cam.archived_at IS NULL AND cam.lifecycle_status='active' WHERE pa.product_id=$1 AND pa.archived_at IS NULL ORDER BY pa.asset_no",
   [productId,shopRef]
 );
 const mapped=rows.rows.map(asset=>{
  const expectedPath=buildRakutenSafeFilePath(asset.canonical_name,"image/jpeg");
  const originalPath=buildRakutenSafeFilePath(asset.canonical_name,asset.mime_type);
  const matching=remote.filter(x=>x.filePath===expectedPath||x.filePath===originalPath);
  const mappedId=Number(asset.external_asset_id);
  const matchId=remote.find(x=>x.fileId===mappedId);
  const verified=Boolean(Number.isSafeInteger(mappedId)&&mappedId>0&&matchId&&matching.some(x=>x.fileId===mappedId));
  return {assetId:asset.id,originalName:asset.canonical_name,expectedPath,otherPossiblePath:originalPath===expectedPath?null:originalPath,externalAssetId:asset.external_asset_id,verified,remoteFileId:matching.length===1?matching[0].fileId:null,unmappedExisting:!asset.external_asset_id&&matching.length>0,mappingConflict:Boolean(asset.external_asset_id&&!verified),ambiguous:matching.length>1};
 });
 const blockers=[];
 if(mapped.some(x=>x.mappingConflict))blockers.push("stored_mapping_not_found_in_remote_folder");
 if(mapped.some(x=>x.ambiguous))blockers.push("ambiguous_remote_image_paths");
 const orphaned=mapped.filter(x=>x.unmappedExisting);
 if(orphaned.length)blockers.push("remote_files_exist_without_aione_mapping");
 return {ok:true,shopRef,productId,containerCode,folderId,totalRemoteFiles:remote.length,expectedAssets:mapped.length,verifiedMappings:mapped.filter(x=>x.verified).length,unmappedRemoteAssets:orphaned.length,blocking:blockers,items:mapped};
}
