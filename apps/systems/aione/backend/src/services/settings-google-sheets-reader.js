import {GoogleAuth} from 'google-auth-library';
import {SETTINGS_SHEET_ID,SETTINGS_SHEET_TABS,previewMaterialRows} from '../../../js/config/settings-google-sheets-mapping.js';

// Read only. Application Google identity and Settings-editor authorization remain in the route.
const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});
const bad=(message,statusCode=503)=>Object.assign(new Error(message),{code:'settings_sheet_unavailable',statusCode});
export async function fetchMaterialSheetValues({request=async(args)=>{const client=await auth.getClient();return client.request(args);}}={}){
 const tab=SETTINGS_SHEET_TABS.material;
 const range=encodeURIComponent("'"+tab+"'!A1:F501");
 const url='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(SETTINGS_SHEET_ID)+'/values/'+range+'?valueRenderOption=FORMATTED_VALUE';
 try{
  const response=await request({url,method:'GET',timeout:15000});
  if(!Array.isArray(response?.data?.values))throw bad('Google 材质表未返回资料，请检查页签和读取权限');
  return response.data.values;
 }catch(e){
  if(e?.code==='settings_sheet_unavailable')throw e;
  const status=Number(e?.response?.status||e?.status||0);
  throw bad(status===403||status===404?'AIONE 运行账号暂时无法读取 Google 设置表，请检查共享权限':'Google 设置表读取失败，请稍后重试');
 }
}
export async function buildMaterialGoogleSheetPreview(category,options={}){
 return previewMaterialRows(category,await fetchMaterialSheetValues(options));
}
