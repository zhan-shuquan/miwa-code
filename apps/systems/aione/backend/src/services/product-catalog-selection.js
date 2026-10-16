import {applyStoreDefaults} from "../../../js/config/product-store-settings.js";
import {validateProductSpecSettings} from '../../../js/config/product-spec-settings.js';
import {applyBoundProductSelections} from '../../../js/config/product-setting-catalogs.js';
import {catalogRows,catalogDefault,deliveryDefault,deliveryValue} from '../../../js/config/settings-catalog.js';
import {customProductSelections} from '../../../js/config/custom-settings.js';
const fields={packagingMethod:'chinaPackaging',packagingMaterial:'japanPackaging',logisticsMethod:'logistics'};
// Caller must hold the shared-parameter row lock until the product commit.
export function applyProductCatalogSelections(product,input,previous,parameters){
 product.customSettings=customProductSelections(parameters,input.customSettings,previous?.customSettings);
 for(const [field,kind] of Object.entries(fields)){
  if(!previous&&!String(input[field]??'').trim())product[field]=catalogDefault(parameters,kind,product[field]);
  const name=product[field];
  if(field==='packagingMethod'&&name==='定制包装')continue;
  const row=catalogRows(parameters,kind).find(r=>r.name===name);
  if(previous?.[field]===name)continue; // Historical or retired choices remain editable.
  if(!row||row.enabled===false)throw Object.assign(new Error('请选择启用的'+({packagingMethod:'包装方式',packagingMaterial:'日本包装物',logisticsMethod:'物流方式'}[field])),{code:'inactive_product_setting',statusCode:400});
 }
 if(!previous&&!String(input.sizeClass??'').trim())product.sizeClass=deliveryDefault(parameters);
 for(const size of [product.sizeClass,...(product.skuOverrides||[]).map(s=>s.sizeClass).filter(Boolean)]){
  if(!size&&previous)continue;
  if(size===previous?.sizeClass||(previous?.skuOverrides||[]).some(s=>s.sizeClass===size))continue;
  if(!catalogRows(parameters,'delivery').some(r=>deliveryValue(r.key)===size&&r.enabled))throw Object.assign(new Error('请选择启用的配送尺寸'),{code:'inactive_product_setting',statusCode:400});
 }
 return validateProductSpecSettings(applyStoreDefaults(applyBoundProductSelections(product,input,previous,parameters),input,previous,parameters),previous,parameters);
}
