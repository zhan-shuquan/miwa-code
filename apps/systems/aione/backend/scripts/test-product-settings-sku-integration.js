import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {INITIAL_PARAMETERS} from '../../js/config/shared-parameter-defaults.js';
import {addProductCatalogPresets} from '../../js/config/product-setting-catalogs.js';
import {addSpecCatalogPresets} from '../../js/config/product-spec-settings.js';
import {productCustomColumns} from '../../js/config/product-custom-columns.js';
import {resolveEffectiveSku} from '../../js/config/product-effective-sku.js';
import {calculateProductCosts} from '../../js/config/product-shared-cost-engine.js';
import {normalizeProductEntry,exportProductEntries,parseProductEntryWorkbook,buildSkuEntries} from '../src/services/product-entry-contract.js';
import {applyProductCatalogSelections} from '../src/services/product-catalog-selection.js';
const parameters=structuredClone(INITIAL_PARAMETERS);
parameters.customSettings=addProductCatalogPresets(parameters);
parameters.customSettings=addSpecCatalogPresets(parameters);
const category={id:'care',name:'洗护资料',enabled:true,productBinding:true,fields:[
 {id:'instruction',label:'说明',type:'text'},{id:'temperature',label:'水温',type:'number'},
 {id:'washable',label:'可水洗',type:'boolean'},{id:'hidden_note',label:'内部备注',type:'text',hidden:true}
],rows:[{id:'gentle',name:'轻柔洗',enabled:true,sortOrder:1,values:{instruction:'温和清洗',temperature:30,washable:false}},
 {id:'hand',name:'手洗',enabled:true,sortOrder:2,values:{temperature:20,washable:true}}]};
parameters.customSettings.categories.push(category);
parameters.delivery.SIZE_140={name:'140サイズ',fee:1100,enabled:true};
const raw={localCode:'qa20920',nameZh:'联合字段与SKU验收',category:'女袜',brand:'SOCKONE',customSettings:{care:'gentle'},
 purchaseUnitCostCny:12,weightG:60,setQuantity:3,salePriceJpy:980,specs:[{name:'颜色',values:['黑色','白色']}],
 extraAttributes:{independentSkuCosts:'true',independentSkuPricing:'true'},skuOverrides:[{index:2,identity:'颜色=白色',purchaseCostCny:20,purchaseCostBasis:'set',setQuantity:5,actualShipmentWeightG:380,domesticFreightCny:0,priceJpy:1580,sizeClass:'SIZE_140'}]};
const product=applyProductCatalogSelections(normalizeProductEntry(raw),raw,null,parameters);
const columns=productCustomColumns(parameters,[product]);
assert.deepEqual(columns.map(c=>c.value(product)),['轻柔洗','温和清洗',30,'否']);
assert.ok(!columns.some(c=>c.key.includes('hidden_note')));
const before=calculateProductCosts(product,resolveEffectiveSku(product,product.skuOverrides[0]),parameters);
assert.equal(before.status,'priced');
const bytes=await exportProductEntries([product],parameters);
const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);
const sheet=book.getWorksheet('商品一览');
const headers=sheet.getRow(1).values;
assert.ok(headers.includes('洗护资料 · 水温（只读）'));
assert.equal(sheet.getRow(2).getCell(headers.indexOf('资料ID:care')).value,'gentle');
let round=(await parseProductEntryWorkbook(bytes,'roundtrip.xlsx')).items[0];
assert.deepEqual(round.customSettings,product.customSettings);
assert.equal(buildSkuEntries(round)[1].priceJpy,1580);
assert.deepEqual(round.skuOverrides,product.skuOverrides);
assert.equal(calculateProductCosts(round,resolveEffectiveSku(round,round.skuOverrides[0]),parameters).net,before.net);
// The stable selection ID is editable; displayed catalog fields are a read-only projection.
sheet.getRow(2).getCell(headers.indexOf('资料ID:care')).value='hand';
sheet.getRow(2).getCell(headers.indexOf('洗护资料 · 水温（只读）')).value=999;
round=(await parseProductEntryWorkbook(Buffer.from(await book.xlsx.writeBuffer()),'edited.xlsx')).items[0];
assert.equal(round.customSettings.care,'hand');
assert.equal(productCustomColumns(parameters,[round]).find(c=>c.key==='custom:care:temperature').value(round),20);
category.name='洗护显示名称';category.rows[0].name='改名后轻柔洗';category.enabled=false;
assert.equal(productCustomColumns(parameters,[product])[0].value(product),'改名后轻柔洗');
assert.throws(()=>applyProductCatalogSelections(normalizeProductEntry(raw),raw,null,parameters),/停用/);
assert.equal(applyProductCatalogSelections(normalizeProductEntry(product),product,product,parameters).customSettings.care,'gentle');
// Retired SKU choices remain usable by their previous identity, but cannot be newly assigned.
parameters.settingsCatalogMeta={japanPackaging:{'A4信封':{enabled:false}}};
assert.throws(()=>applyProductCatalogSelections(normalizeProductEntry({...raw,customSettings:{},skuOverrides:[{index:1,identity:'颜色=黑色',packagingMaterial:'A4信封'}]}),{...raw,customSettings:{}},product,parameters),/SKU请选择启用/);
assert.throws(()=>normalizeProductEntry({...raw,customSettings:[]}),/自定义资料/);
console.log('PASS #206 + #209 integration: dynamic columns, hidden fields, stable references, editable Excel selection IDs, read-only projections, SKU costs/prices, retired choices and unchanged profit');
