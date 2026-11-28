import assert from 'node:assert/strict';
import {addProductCatalogPresets,productFieldOptions,applyBoundProductSelections,categoryBrand,suggestedProductCategory} from '../../js/config/product-setting-catalogs.js';
import {validateCustomSettings,assertCustomSchemaTransition} from '../../js/config/custom-settings.js';
import {INITIAL_PARAMETERS} from '../../js/config/shared-parameter-defaults.js';
import {applyProductCatalogSelections} from '../src/services/product-catalog-selection.js';
import {normalizeProductEntry} from '../src/services/product-entry-contract.js';
import {customSettingsWorkbook,parseCustomSettingsWorkbook} from '../src/services/custom-settings-workbook.js';
const p=structuredClone(INITIAL_PARAMETERS);p.customSettings=addProductCatalogPresets(p);validateCustomSettings(p.customSettings);
assert.equal(addProductCatalogPresets(p).categories.length,4);
const brands=p.customSettings.categories.find(c=>c.productField==='brand'),cats=p.customSettings.categories.find(c=>c.productField==='category'),materials=p.customSettings.categories.find(c=>c.productField==='material');
brands.rows.push({id:'r_new',name:'新增品牌',businessValue:'新增品牌',values:{name_ja:'新ブランド'},enabled:true,isDefault:false,sortOrder:1});
materials.rows.push({id:'r_cotton',name:'棉混',businessValue:'棉混',values:{name_ja:'綿混'},enabled:true,isDefault:true,sortOrder:0});
const input={localCode:'cat987',nameZh:'分类迁移验收',category:'女袜',brand:'新增品牌'};
let product=applyProductCatalogSelections(normalizeProductEntry(input),input,null,p);
assert.equal(product.material,'棉混');assert.equal(product.customSettings[brands.id],'r_new');
assert.equal(product.customSettings[cats.id],cats.rows.find(r=>r.businessValue==='女袜').id);
assert.equal(categoryBrand(p,'女袜'),'SOCKONE');cats.rows[0].values.keywords='水龙头,防冻罩';assert.equal(suggestedProductCategory(p,'水龙头防冻罩'),'家居用品');
// Rename only the display label; all legacy business values and stable references survive.
const old=structuredClone(p.customSettings);brands.rows.find(r=>r.id==='r_new').name='新品牌显示名';assertCustomSchemaTransition(old,p.customSettings);
assert.equal(productFieldOptions(p,'brand','新增品牌').find(r=>r.value==='新增品牌').label,'新品牌显示名');
const bytes=await customSettingsWorkbook(brands),roundtrip=await parseCustomSettingsWorkbook(brands,bytes);assert.equal(roundtrip.rows.find(r=>r.id==='r_new').businessValue,'新增品牌');
const changed=structuredClone(p.customSettings);changed.categories.find(c=>c.productField==='brand').rows[0].businessValue='changed';assert.throws(()=>assertCustomSchemaTransition(p.customSettings,changed),/引用值/);
brands.rows.find(r=>r.id==='r_new').enabled=false;
// Legacy records without IDs can still be edited/migrated after the choice is retired.
const previous={...product,customSettings:{}};
product=applyProductCatalogSelections(normalizeProductEntry({...product}),{...product},previous,p);assert.equal(product.brand,'新增品牌');
assert.throws(()=>applyProductCatalogSelections(normalizeProductEntry(input),input,null,p),/启用/);
assert.throws(()=>applyProductCatalogSelections(normalizeProductEntry({...input,brand:'未知品牌'}),{...input,brand:'未知品牌'},null,p),/启用/);
const legacy={...input,brand:'历史品牌',material:'历史材质'};product=applyProductCatalogSelections(normalizeProductEntry(legacy),legacy,legacy,p);assert.equal(product.brand,'历史品牌');
const blank={...input,brand:'',material:''};product=applyProductCatalogSelections(normalizeProductEntry(blank),blank,legacy,p);assert.equal(product.brand,'');assert.equal(product.material,'');
// Conflicting IDs cannot silently rewrite explicit product facts.
assert.throws(()=>applyBoundProductSelections({brand:'HOMEONE',customSettings:{}},{brand:'HOMEONE',customSettings:{[brands.id]:'r_new'}},null,p),/不一致/);
const duplicates=structuredClone(p.customSettings);duplicates.categories.push({...structuredClone(brands),id:'duplicate',name:'重复绑定'});assert.throws(()=>validateCustomSettings(duplicates),/重复/);
console.log('PASS bound product catalogs: draft presets, actual selectors, defaults, stable IDs, rename, XLSX, legacy retention, disabled choices, conflicting facts and schema protection');
