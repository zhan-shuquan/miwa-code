export const DEFAULT_CODE_RULES=Object.freeze({product:{prefix:'zsq',dateFormat:'none',separator:'',digits:3,start:81},sku:{prefix:'c',separator:'-',digits:2}});
const bad=message=>{throw Object.assign(new Error(message),{code:'invalid_business_code_rule',statusCode:400});};
export function validateCodeRules(rules){
 if(rules===undefined)return;
 if(!rules||typeof rules!=='object'||Array.isArray(rules)||Object.keys(rules).some(k=>!['product','sku'].includes(k)))bad('编码规则格式无效');
 const p=rules.product,s=rules.sku;
 if(!p||!s||!/^[a-z]{2,8}$/.test(p.prefix)||!['none','YYYY','YYYYMM','YYYYMMDD'].includes(p.dateFormat)||!['','-'].includes(p.separator)||!Number.isSafeInteger(p.digits)||p.digits<2||p.digits>10||!Number.isSafeInteger(p.start)||p.start<1||p.start>=10**p.digits)bad('商品货号规则无效：前缀2至8位小写英文、流水2至10位、起始值在位数范围内');
 if(!/^[a-z]{0,8}$/.test(s.prefix)||!['-',''].includes(s.separator)||!Number.isSafeInteger(s.digits)||s.digits<2||s.digits>6)bad('SKU规则无效');
}
export function productCodeStem(rule,date=new Date()){
 const dateString=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date).replaceAll('-','');
 const stamp=rule.dateFormat==='none'?'':dateString.slice(0,{YYYY:4,YYYYMM:6,YYYYMMDD:8}[rule.dateFormat]);
 return rule.prefix+(stamp?rule.separator+stamp:'')+rule.separator;
}
export function productBusinessCode(rule,serial,date){if(!Number.isSafeInteger(serial)||serial<1||serial>999999999999)bad('商品流水号超过支持范围');return productCodeStem(rule,date)+String(serial).padStart(rule.digits,'0');}
export function skuBusinessCode(rule,code,serial){if(!Number.isSafeInteger(serial)||serial<1||serial>999999999999)bad('SKU流水号超过支持范围');return code+rule.separator+rule.prefix+String(serial).padStart(rule.digits,'0');}
