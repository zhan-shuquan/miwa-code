import {Router} from "express";
import {getItemV2ReadOnly} from "../integrations/rakuten-rms-client.js";
import pool from "../../db.js";
import {getManualProduct} from "../services/product-manual-entry-service.js";
import {rakutenFirstItemPreflight} from "../services/rakuten-itemapi-preflight.js";
const router=Router();
router.get("/integrations/rakuten/products/:productRef/itemapi-preflight",async(req,res,next)=>{
 try{
  const {product,skus}=await getManualProduct(String(req.params.productRef||""));
  const assets=await pool.query("SELECT id,sku_id,asset_role,metadata FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL",[product.id]);
  // Stored SKU identity is real; per-SKU inventory and price still require a verified RMS contract.
  const evaluatedSkus=skus.map(s=>({id:s.id,sku_code:s.sku_code,priceJpy:null,stock:null}));
  const credentialShop=String(process.env.AIONE_RAKUTEN_SHOP_REF||"").trim();
  const shopBound=Boolean(credentialShop&&credentialShop===product.targetShopRef);
  const hasSecrets=Boolean(process.env.AIONE_RAKUTEN_SERVICE_SECRET&&process.env.AIONE_RAKUTEN_LICENSE_KEY);
  const result=rakutenFirstItemPreflight({product,skus:evaluatedSkus,assets:assets.rows,shopConfigured:shopBound&&hasSecrets});
  res.set("Cache-Control","no-store").json({ok:true,productId:product.id,localCode:product.localCode,rmsConfiguration:{credentialShopBound:shopBound,credentialsPresent:hasSecrets,readyForRead:shopBound&&hasSecrets},...result});
 }catch(error){next(error)}
});
router.get("/integrations/rakuten/products/:productRef/remote-existence",async(req,res,next)=>{
 try{
  const {product}=await getManualProduct(String(req.params.productRef||""));
  const result=await getItemV2ReadOnly({shopRef:product.targetShopRef,manageNumber:product.localCode});
  // Keep the raw provider item private; an existence check only needs boolean evidence.
  res.set("Cache-Control","no-store").json({ok:true,productId:product.id,shopRef:result.shopRef,manageNumber:result.manageNumber,exists:result.exists,remoteStatus:result.httpStatus});
 }catch(error){next(error)}
});
export default router;
