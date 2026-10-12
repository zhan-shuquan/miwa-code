import {Router} from "express";
import pool from "../../db.js";
import {getManualProduct} from "../services/product-manual-entry-service.js";
import {rakutenFirstItemPreflight} from "../services/rakuten-itemapi-preflight.js";
const router=Router();
router.get("/integrations/rakuten/products/:productRef/itemapi-preflight",async(req,res,next)=>{
 try{
  const {product,skus}=await getManualProduct(String(req.params.productRef||""));
  const assets=await pool.query("SELECT id,sku_id,asset_role,metadata FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL",[product.id]);
  const specSkus=Array.isArray(product.skuOverrides)?product.skuOverrides:[];
  const evaluatedSkus=skus.map(s=>({
   id:s.id,sku_code:s.sku_code,
   // Never equate default price/stock with verified per-SKU Rakuten data.
   priceJpy:specSkus.find(o=>o.identity&&Object.entries(s.attributes||{}).filter(([k])=>!k.startsWith("__aione")).every(([k,v])=>o.identity.includes(k+"="+v)))?.priceJpy??product.salePriceJpy,
   stock:null
  }));
  const result=rakutenFirstItemPreflight({product,skus:evaluatedSkus,assets:assets.rows,shopConfigured:false});
  res.set("Cache-Control","no-store").json({ok:true,productId:product.id,localCode:product.localCode,...result});
 }catch(error){next(error)}
});
export default router;
