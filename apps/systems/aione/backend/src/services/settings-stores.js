import pool from '../../db.js';
import {boundProductCatalog} from '../../../js/config/product-setting-catalogs.js';
const fail=message=>Object.assign(new Error(message),{code:'invalid_store_setting',statusCode:400});
export async function settingsStoreRegistryReady(db=pool){
 // CURRENT also supports an older lifecycle schema without the canonical store registry.
 // Probe before querying so a missing optional table cannot abort the settings transaction.
 const result=await db.query(`SELECT count(*)::int AS columns_count FROM information_schema.columns WHERE table_schema='public' AND ((table_name='stores' AND column_name IN ('id','code','name','status','platform_id')) OR (table_name='platforms' AND column_name IN ('id','code','name','status')))`);
 return result.rows[0]?.columns_count===9;
}
export async function readSettingsStoreState(db=pool){
 if(!await settingsStoreRegistryReady(db))return {ready:false,stores:[],message:'正式店铺资料尚未就绪，暂不能引用店铺默认设置。其他共享设置可正常维护。'};
 return {ready:true,stores:await readSettingsStores(db),message:''};
}
export async function readSettingsStores(db=pool){
 const result=await db.query('SELECT s.id,s.code,s.name,s.status,p.status AS platform_status,p.code AS platform_code,p.name AS platform_name FROM public.stores s JOIN public.platforms p ON p.id=s.platform_id ORDER BY s.name,s.code');return result.rows;
}
export async function assertStoreProfileReferences(db,parameters,previous){
 const c=boundProductCatalog(parameters,'targetShopRef');if(!c||!c.rows.length)return;
 if(!await settingsStoreRegistryReady(db))throw fail('正式店铺资料尚未就绪，无法保存店铺引用');
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
 if(!await settingsStoreRegistryReady(db))throw fail('正式店铺资料尚未就绪，无法选择新店铺');
 const row=c.rows.find(r=>r.businessValue===product.targetShopRef);
 const result=await db.query("SELECT s.id FROM public.stores s JOIN public.platforms p ON p.id=s.platform_id WHERE s.id=$1::uuid AND s.status='active' AND p.status='active' FOR SHARE OF s,p",[row?.values.store_id||null]);
 if(!row||!result.rows.length)throw fail('请选择有效的正式店铺');
}
