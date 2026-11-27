import assert from 'node:assert/strict';
import {selectionHeaderStatus} from '../../js/components/business-workspace-header.js';
import {quickWorkbook} from '../src/services/selection-file-contract.js';
import ExcelJS from 'exceljs';
const origin='http://127.0.0.1:8765';
const login=await fetch(origin+'/__preview/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({account:'employeeA'})});
assert.equal(login.status,200);
const cookie=login.headers.get('set-cookie').split(';')[0];
async function api(path,body,method=body?'POST':'GET'){
  const r=await fetch(origin+'/api/v1/selection-workspace'+path,{method,headers:{cookie,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json();assert(r.ok,JSON.stringify(data));return data;
}
const boot=await api('/bootstrap');
assert(!boot.fields.some(f=>f.id==='custom_主要材质1'));
assert(boot.fields.some(f=>f.id==='custom_miwa_auxiliary_info'&&!f.required));
const order=boot.layout.fields.map(f=>f.id);
assert.equal(order.indexOf('custom_miwa_auxiliary_info'),order.indexOf('custom_miwa_selection_notes')+1);
const data={item_name:'人工简称验收',shortNameManual:true,custom_商品长标题中文:'小型家用迷你食品保鲜封口机',custom_miwa_selection_notes:'采购：不混色\n美工：保留原图',custom_miwa_auxiliary_info:'材质：ABS+不锈钢\n尺寸：20cm',custom_主要材质1:'历史材质原文'};
let record=await api('/records',{data,requestKey:crypto.randomUUID()});
const path='/records/'+encodeURIComponent(record.id);
record=await api(path,{data:{...record.data,custom_miwa_selection_notes:'更新采购备注'},version:record.version},'PATCH');
const loaded=await api(path);
assert.equal(loaded.data.item_name,data.item_name);
assert.equal(loaded.data.custom_miwa_selection_notes,'更新采购备注');
assert.equal(loaded.data.custom_miwa_auxiliary_info,data.custom_miwa_auxiliary_info);
assert.equal(loaded.data.custom_主要材质1,data.custom_主要材质1);
for(const status of ['confirmed','submitting','submitted'])for(const job of ['queued','processing','succeeded','failed'])
  assert.equal(selectionHeaderStatus({status,jobs:[{status:job}]}).conclusion,'已确认');
const template=new ExcelJS.Workbook(),s=template.addWorksheet('商品资料');
s.addRow(['美和ERP字段','人工填写']);s.addRow(['特殊说明','']);s.addRow(['主要材质','']);s.addRow(['采购URL','']);
s.addRow(['是否上架','']);s.addRow(['是否美工','']);
const result=new ExcelJS.Workbook();await result.xlsx.load(await quickWorkbook(data,await template.xlsx.writeBuffer()));
assert.equal(result.worksheets[0].getCell('B2').value,'备注：\n'+data.custom_miwa_selection_notes+'\n\n辅助信息：\n'+data.custom_miwa_auxiliary_info);
assert.equal(result.worksheets[0].getCell('B3').value,data.custom_主要材质1);
console.log('PASS launch API: auxiliary/remarks independent save and reload, manual short name, historical material, layout migration, selection/intake states, unchanged workbook template');
