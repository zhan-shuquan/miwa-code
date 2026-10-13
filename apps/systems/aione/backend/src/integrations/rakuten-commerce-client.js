// Rakuten ItemAPI 2.0 / InventoryAPI 2.0 transport.
// Never log credentials or send raw API error bodies to the frontend.
const API_BASE = "https://api.rms.rakuten.co.jp/es/2.0";
const VALID_CODE = /^[A-Za-z0-9_-]{1,96}$/;
const INVENTORY_PATH = (manageNumber, variantId) =>
  "/inventories/manage-numbers/" + encodeURIComponent(manageNumber) + "/variants/" + encodeURIComponent(variantId);
const ITEM_PATH = code => "/items/manage-numbers/" + encodeURIComponent(code);

function fail(code, message, statusCode=409) {
  return Object.assign(new Error(message), {code,statusCode});
}
function assertShop(shopRef) {
  if (!shopRef || shopRef !== String(process.env.AIONE_RAKUTEN_SHOP_REF || "").trim()) {
    throw fail("rakuten_shop_binding_mismatch","RMS credential is not bound to the selected shop.",403);
  }
  const secret=String(process.env.AIONE_RAKUTEN_SERVICE_SECRET||"").trim();
  const key=String(process.env.AIONE_RAKUTEN_LICENSE_KEY||"").trim();
  if(!secret || !key)throw fail("rakuten_credentials_missing","RMS credentials are not configured.",503);
  return "ESA " + Buffer.from(secret + ":" + key,"utf8").toString("base64");
}
function requireCode(value,label) {
  const code=String(value||"").trim();
  if(!VALID_CODE.test(code))throw fail("rakuten_code_invalid",label+" is invalid.",400);
  return code;
}
async function jsonRequest({shopRef,path,method="GET",payload=null,request=fetch,timeoutMs=25000}) {
  const authorization=assertShop(shopRef);
  const headers={Authorization:authorization,Accept:"application/json"};
  if(method!=="GET")headers["Content-Type"]="application/json";
  let response;
  try {
    response=await request(API_BASE+path,{
      method,headers,
      ...(payload!==null?{body:JSON.stringify(payload)}:{}),
      signal:AbortSignal.timeout(timeoutMs)
    });
  }catch(error){
    throw Object.assign(fail("rakuten_http_transport_uncertain","RMS network response not confirmed; read remote before any retry.",502),{cause:error});
  }
  const raw=await response.text();
  let body=null;
  if(raw.trim())try{body=JSON.parse(raw)}catch{
    throw fail("rakuten_json_response_invalid","Rakuten response is not valid JSON.",502);
  }
  if(!response.ok || (Array.isArray(body?.errors)&&body.errors.length)){
    const details=(body?.errors||[]).map(x=>({code:String(x.code||"").slice(0,100),field:String(x.field||x.property||"").slice(0,100),message:String(x.message||"").slice(0,200)})).slice(0,20);
    const error=fail("rakuten_api_rejected","Rakuten API rejected request (HTTP "+response.status+").",502);
    error.rakutenStatus=response.status;
    error.remoteCode=details[0]?.code||undefined;
    error.rakutenErrors=details;
    throw error;
  }
  return {status:response.status,body};
}
export async function putItemV2({shopRef,manageNumber,payload,request=fetch}) {
  const code=requireCode(manageNumber,"manageNumber");
  if(!payload||typeof payload!=="object"||Array.isArray(payload))throw fail("rakuten_payload_invalid","ItemAPI payload must be a JSON object.",400);
  return jsonRequest({shopRef,path:ITEM_PATH(code),method:"PUT",payload,request,timeoutMs:30000});
}
export async function getInventoryV2({shopRef,manageNumber,variantId,request=fetch}) {
  const code=requireCode(manageNumber,"manageNumber");
  const sku=requireCode(variantId,"variantId");
  return jsonRequest({shopRef,path:INVENTORY_PATH(code,sku),request});
}
export async function putInventoryV2({shopRef,manageNumber,variantId,quantity,request=fetch}) {
  const code=requireCode(manageNumber,"manageNumber");
  const sku=requireCode(variantId,"variantId");
  if(!Number.isSafeInteger(quantity)||quantity<0)throw fail("inventory_quantity_invalid","Absolute stock must be a non-negative integer.",400);
  return jsonRequest({shopRef,path:INVENTORY_PATH(code,sku),method:"PUT",payload:{mode:"ABSOLUTE",quantity},request,timeoutMs:30000});
}
export async function getGenreAttributesV2({shopRef,genreId,request=fetch}) {
  const genre=String(genreId||"").trim();
  if(!/^\d{5,12}$/.test(genre))throw fail("genre_id_invalid","A valid leaf Rakuten genre ID is required.",400);
  const result=await jsonRequest({shopRef,path:"/navigation/genres/"+encodeURIComponent(genre)+"/attributes",request});
  if(!Array.isArray(result.body?.genre?.attributes) || result.body?.genre?.lowest!==true) {
    throw fail("rakuten_genre_attributes_unverified","RMS did not return a verified leaf-genre attribute definition.",409);
  }
  return result.body;
}
