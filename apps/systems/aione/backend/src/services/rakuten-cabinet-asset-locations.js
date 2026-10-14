// Read-only evidence adapter: never derive an ItemAPI path from an AIONE
// container code, and never invent a Cabinet folder from its numeric ID.
import {getRakutenCanonicalPackReadiness} from "./rakuten-canonical-publish-service.js";
import {getAllCabinetFolderFiles} from "../integrations/rakuten-rms-client.js";
import {locatePublishedCabinetAsset} from "./rakuten-cabinet-image-location.js";

const fail=(code)=>Object.assign(new Error(code),{code,statusCode:409});
export async function resolvePublishedCabinetAssetLocations({
 productId,shopRef,assets=[],getPlan=getRakutenCanonicalPackReadiness,listRemoteFiles=getAllCabinetFolderFiles
}={}){
 if(shopRef!=="永井GD")throw fail("rakuten_pilot_shop_mismatch");
 if(!productId||!Array.isArray(assets))throw fail("rakuten_image_source_invalid");
 const plan=await getPlan({productId,shopRef,containerCode:"rkc001"});
 const folderId=Number(plan.container?.rakutenFolderId);
 if(!Number.isSafeInteger(folderId)||folderId<=0)throw fail("rakuten_verified_cabinet_folder_missing");
 const remoteFiles=await listRemoteFiles({folderId});
 const mapped=assets.map(asset=>locatePublishedCabinetAsset(asset,remoteFiles));
 const issues=mapped.filter(x=>x.mapping_status==="active"&&x.external_asset_id&&!x.location).map(x=>x.locationError);
 return {folderId,assets:mapped,verifiedCount:mapped.filter(x=>x.location).length,issues:[...new Set(issues)]};
}
