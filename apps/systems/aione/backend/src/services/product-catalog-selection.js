import {validateProductSpecSettings} from '../../../js/config/product-spec-settings.js';
import {applyBoundProductSelections} from '../../../js/config/product-setting-catalogs.js';
import {catalogRows,catalogDefault} from '../../../js/config/settings-catalog.js';
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
 return validateProductSpecSettings(applyBoundProductSelections(product,input,previous,parameters),previous,parameters);
}
