import pool from '../../db.js';
import {boundProductCatalog} from '../../../js/config/product-setting-catalogs.js';
const fail=message=>Object.assign(new Error(message),{code:'invalid_store_setting',statusCode:400});
export async function readSettingsStores(db=pool){
 const result=await db.query('SELECT s.id,s.code,s.name,s.status,p.status AS platform_status,p.code AS platform_code,p.name AS platform_name FROM public.stores s JOIN public.platforms p ON p.id=s.platform_id ORDER BY s.name,s.code');return result.rows;
}
export async function assertStoreProfileReferences(db,parameters,previous){
 const c=boundProductCatalog(parameters,'targetShopRef');if(!c)return;
 const result=await db.query('SELECT s.id,s.name,s.status,p.status AS platform_status FROM public.stores s JOIN public.platforms p ON p.id=s.platform_id WHERE s.id=ANY($1::uuid[]) FOR SHARE OF s,p',[c.rows.map(r=>r.values.store_id)]);
 const old=boundProductCatalog(previous,'targetShopRef');
 for(const row of c.rows){const store=result.rows.find(s=>s.id===row.values.store_id),prior=old?.rows.find(r=>r.id===row.id);
  if(!store)throw fail('店铺设置引用的正式店铺不存在');
  if(prior&&prior.values.store_id!==row.values.store_id)throw fail('已有店铺设置不能更换正式店铺编号');
  if(!prior&&row.businessValue!==store.name)throw fail('新增店铺设置的引用值必须与正式店铺名称一致');
  if(row.enabled&&(store.status!=='active'||store.platform_status!=='active'))throw fail('已停用的正式店铺不能启用');
 }
}
export async function assertProductStoreReference(db,product,previous,parameters){
 if(previous?.targetShopRef===product.targetShopRef)return;
 const c=boundProductCatalog(parameters,'targetShopRef');if(!c)return;
 const row=c.rows.find(r=>r.businessValue===product.targetShopRef);
 const result=await db.query("SELECT s.id FROM public.stores s JOIN public.platforms p ON p.id=s.platform_id WHERE s.id=$1::uuid AND s.status='active' AND p.status='active' FOR SHARE OF s,p",[row?.values.store_id||null]);
 if(!row||!result.rows.length)throw fail('请选择有效的正式店铺');
}
