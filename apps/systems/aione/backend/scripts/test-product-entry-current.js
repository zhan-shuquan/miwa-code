import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { evaluateProductEntryReadiness, evaluateProductPublicationStatus } from "../src/services/product-entry-status-service.js";
import pool from "../db.js";
import {
  normalizeProductEntry, buildSkuEntries, parseProductEntryWorkbook,
  exportProductEntries, readinessWarnings
} from "../src/services/product-entry-contract.js";
import {
  assertCurrentProductEntrySchema, saveManualProduct, listManualProducts,
  getManualProduct, previewImportProducts, importManualProducts
} from "../src/services/product-manual-entry-service.js";

async function expectCode(fn, code) {
  await assert.rejects(fn, err => err.code === code, "expected error code "+code);
}
async function wpsExample() {
  const book=new ExcelJS.Workbook(),sheet=book.addWorksheet("商品信息"),sku=book.addWorksheet("sku生成器");
  const fields={
    C3:"zjl238",C4:"户外水龙头防冻罩",C5:"https://detail.1688.com/offer/961532175335.html",
    C6:5.5,C7:0,C8:1,C9:64,C10:"家居用品",C11:"HOMEONE",
    C13:"空运大件（普货）",C14:"原装",C15:"3cm厚",C16:"A4信封",
    C17:26,C18:18,C19:2,C24:0,C38:980,
    I3:"蛇口カバー 凍結防止 屋外",I4:"冬の蛇口に、かぶせて留めるだけ",I5:565305,
    I10:1000,I13:"モニターの発色により異なる場合があります",I22:"颜色",J22:"黑色",I30:"是"
  };
  for(const [cell,value] of Object.entries(fields))sheet.getCell(cell).value=value;
  sku.getCell("J9").value={formula:"IF(A9=\"\",\"\",IF(ISNUMBER(AD9),AD9,#REF!))",result:1000};
  sku.getCell("L9").value=null;
  return Buffer.from(await book.xlsx.writeBuffer());
}
async function run(){
  const fixture=await parseProductEntryWorkbook(await wpsExample(),"zjl238.xlsx");
  assert.equal(fixture.sourceKind,"wps-single");
  assert.equal(fixture.items.length,1);
  const original=fixture.items[0];
  assert.equal(original.localCode,"zjl238");
  assert.equal(original.nameZh,"户外水龙头防冻罩");
  const detailed=normalizeProductEntry({...original,material:"EVA",productSpecifications:"长度约26cm；厚度约2cm"});
  assert.equal(detailed.material,"EVA");
  assert.equal(detailed.productSpecifications,"长度约26cm；厚度约2cm");
  const detailedExport=await exportProductEntries([detailed]);
  const detailedRoundTrip=await parseProductEntryWorkbook(detailedExport,"product_details.xlsx");
  assert.equal(detailedRoundTrip.items[0].material,"EVA","material must survive workbook roundtrip");
  assert.equal(detailedRoundTrip.items[0].productSpecifications,"长度约26cm；厚度约2cm","descriptive product specifications must survive workbook roundtrip");
  assert.equal(original.salePriceJpy,980);
  assert.equal(original.rakutenGenreId,"565305");
  assert.equal(original.autoPublish,true);
  assert.equal(original.skuOverrides.length,0);
  assert.equal(buildSkuEntries(original).length,1);
  assert.equal(buildSkuEntries(original)[0].stock,1000,"new product SKU stock defaults to 1000");
  assert.equal(original.defaultStock,1000);
  assert(fixture.warnings.some(x=>x.includes("损坏引用")),"warn about broken formulas");
  assert(readinessWarnings(original).length>0);
  await expectCode(async()=>normalizeProductEntry({...original,autoPublish:"maybe"}),"invalid_auto_publish");
  assert.equal(buildSkuEntries(normalizeProductEntry({...original,specs:[{name:"颜色",values:Array.from({length:13},(_,i)=>String(i+1))}]})).length,13,"AIONE catalog entry must not limit to 12 SKUs");
  assert.equal(buildSkuEntries(normalizeProductEntry({...original,specs:[{name:"颜色",values:["黑色","白色"]},{name:"尺码",values:["M","L"]},{name:"套数",values:["1","2"]},{name:"型号",values:["A","B"]}]})).length,16,"AIONE catalog entry must support more than three specification dimensions");
  const slash = normalizeProductEntry({...original,specs:[{name:"颜色",values:"黑色，灰色"},{name:"尺码",values:"M/L"}]});
  const variants=buildSkuEntries(slash);
  assert.equal(variants.length,4,"two colors x M/L must yield four SKU combinations");
  assert.deepEqual(variants.map(x=>x.identity),["颜色=黑色|尺码=M","颜色=黑色|尺码=L","颜色=灰色|尺码=M","颜色=灰色|尺码=L"]);
  const customized=normalizeProductEntry({...slash,skuOverrides:[{index:2,identity:"颜色=灰色|尺码=M",priceJpy:1580,stock:321}]});
  const reordered=normalizeProductEntry({...customized,specs:[{name:"颜色",values:"灰色，黑色"},{name:"尺码",values:"M/L"}]});
  const rsku=buildSkuEntries(reordered).find(x=>x.identity==="颜色=灰色|尺码=M");
  assert.equal(rsku.priceJpy,980,"SKU selling price must inherit the shared product price, even if a legacy override exists");
  const unifiedPrice=normalizeProductEntry({...customized,salePriceJpy:1080});
  assert.deepEqual([...new Set(buildSkuEntries(unifiedPrice).map(x=>x.priceJpy))],[1080],"all SKU variants must follow one product selling price");
  assert.equal(buildSkuEntries(unifiedPrice).find(x=>x.identity==="颜色=灰色|尺码=M").stock,321,"independent SKU stock must survive unified selling price changes");
  assert.equal(rsku.stock,321,"SKU stock override must follow specification identity, not row");
  assert.equal(buildSkuEntries(reordered).find(x=>x.identity==="颜色=黑色|尺码=L").stock,1000);
  const exported=await exportProductEntries([original]);
  const roundtrip=await parseProductEntryWorkbook(exported,"aione_export.xlsx");
  assert.equal(roundtrip.items[0].localCode,original.localCode);
  assert.equal(roundtrip.items[0].salePriceJpy,original.salePriceJpy);
  assert.equal(roundtrip.items[0].specs[0].name,"颜色");
  assert.deepEqual(roundtrip.items[0].specs[0].values,["黑色"]);
  assert.equal(roundtrip.items[0].autoPublish,false,"new exports must not perpetuate legacy auto-publish controls");
  const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(exported);
  assert.equal(workbook.getWorksheet("商品一览").getRow(1).values.includes("自动上架"),false);
  assert.equal(evaluateProductEntryReadiness(original,null).label,"资料待完善");
  assert.equal(evaluateProductEntryReadiness({...original,pcDescription:"PC说明",spDescription:"移动说明",salesDescription:"销售说明"},true).label,"待平台校验");
  assert.equal(evaluateProductPublicationStatus([]).label,"待核实");
   assert.equal(roundtrip.items[0].defaultStock,1000);
   assert.equal(roundtrip.items[0].profitTargets.productMargin,40);

  // DATABASE_URL must point to a disposable CI Postgres with CURRENT baseline loaded.
  if(!process.env.DATABASE_URL || process.env.AIONE_ENV!=="controlled-ci") {
    throw new Error("Refusing DB contract test outside controlled-ci disposable database.");
  }
  await assertCurrentProductEntrySchema(pool);
  const preview=await previewImportProducts([original]);
  assert.equal(preview[0].action,"new_draft");
  const added=await saveManualProduct(original,{personId:"ci",sourceSystem:"controlled-ci"},{createOnly:true});
  assert.equal(added.product.localCode,"zjl238");
  assert.match(added.product.productCode,/^MH\d{7}$/);
  assert.equal(added.product.version,1);
  assert.equal(added.skus.length,1);
  const read=await getManualProduct("zjl238");
  assert.equal(read.product.id,added.product.id);
  assert.equal(read.product.salePriceJpy,980);
  assert.equal(read.product.autoPublish,true);
  assert.equal(read.skus.length,1);
  const skuRecord=read.skus[0];
  assert.equal(skuRecord.attributes["颜色"],"黑色");
  const stored=await pool.query("SELECT status,metadata FROM public.products WHERE id=$1",[added.product.id]);
  assert.equal(stored.rows[0].status,"draft");
  assert.equal(stored.rows[0].metadata.autoPublishAuthorized,false);
  assert.equal(stored.rows[0].metadata.publishStatus,"draft_only");
  const listings=await pool.query("SELECT count(*)::integer AS n FROM public.listings WHERE product_id=$1",[added.product.id]);
  assert.equal(listings.rows[0].n,0);

  const changed=await saveManualProduct({...original,nameZh:"户外防冻罩（已校对）",salePriceJpy:1080},{
    personId:"ci",sourceSystem:"controlled-ci"
  },{updateOnly:true,expectedVersion:1});
  assert.equal(changed.product.version,2);
  const current=await getManualProduct("zjl238");
  assert.equal(current.product.nameZh,"户外防冻罩（已校对）");
  assert.equal(current.product.salePriceJpy,1080);
  assert.equal(current.skus[0].sku_code,skuRecord.sku_code);
  await expectCode(()=>saveManualProduct(original,{}, {updateOnly:true,expectedVersion:1}),"product_version_conflict");
  await expectCode(()=>saveManualProduct(original,{}, {createOnly:true}),"product_exists");

  // Real user flow: single-SKU draft can change specification after first save.
  const changedSpec=await saveManualProduct({...original,specs:[{name:"颜色",values:["白色","黑色"]}]},{personId:"ci"},{updateOnly:true,expectedVersion:2});
  assert.equal(changedSpec.product.version,3);
  assert.equal(changedSpec.skus.length,2);
  const twoSku=await getManualProduct("zjl238");
  assert.equal(twoSku.skus.length,2);
  assert.equal(twoSku.skus.find(x=>x.sku_code===skuRecord.sku_code).attributes["颜色"],"黑色","previous black SKU identity must remain stable");
  assert.equal(twoSku.skus.some(x=>x.attributes["颜色"]==="白色"),true,"new white variant exists");
  const reduced=await saveManualProduct({...original,specs:[{name:"颜色",values:["白色"]}]},{personId:"ci"},{updateOnly:true,expectedVersion:3});
  assert.equal(reduced.skus.length,1);
  assert.equal((await getManualProduct("zjl238")).skus.length,1);
  // A channel listing makes SKU identity changes unsafe and must continue to block.
  await pool.query("INSERT INTO public.platforms(code,name) VALUES ('CI_RAKUTEN','Rakuten') ON CONFLICT DO NOTHING");
  const platform=await pool.query("SELECT id FROM public.platforms WHERE code='CI_RAKUTEN'");
  await pool.query("INSERT INTO public.stores(code,name,platform_id) VALUES ('CI_STORE','CI', $1) ON CONFLICT DO NOTHING",[platform.rows[0].id]);
  const store=await pool.query("SELECT id FROM public.stores WHERE code='CI_STORE'");
  await pool.query("INSERT INTO public.listings(listing_code,product_id,store_id) VALUES ($1,$2,$3)",["CI_ZJL238",added.product.id,store.rows[0].id]);
  await expectCode(()=>saveManualProduct({...original,specs:[{name:"颜色",values:["黑色"]}]},{personId:"ci"},{updateOnly:true,expectedVersion:4}),"sku_identity_changed");
  const list=await listManualProducts({query:"zjl238"});
  assert.equal(list.length,1);
  assert.equal(list[0].id,added.product.id);
  assert.equal(list[0].publication.label,"未上架");
  assert.equal(list[0].readiness.label,"资料待完善");
  const e=await exportProductEntries([current.product]);
  const parsed=await parseProductEntryWorkbook(e,"roundtrip.xlsx");
  assert.equal(parsed.items[0].salePriceJpy,1080);

  const second=normalizeProductEntry({...original,localCode:"zjl239",autoPublish:"否"});
  const batch=await importManualProducts([original,second],{personId:"ci",sourceSystem:"controlled-ci"});
  assert.equal(batch.successCount,1);
  assert.equal(batch.failedCount,1);
  assert.equal((await getManualProduct("zjl239")).product.autoPublish,false);
  const skipped=await previewImportProducts([original,second]);
  assert.deepEqual(skipped.map(x=>x.action),["existing_requires_confirm","existing_requires_confirm"]);

  console.log("PASS: CURRENT baseline / real WPS pattern / Excel roundtrip / CRUD / versioning / SKU / duplicate / no publish.");
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>pool.end());
