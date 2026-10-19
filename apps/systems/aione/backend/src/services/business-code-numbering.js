import {DEFAULT_CODE_RULES,productCodeStem,productBusinessCode} from '../../../js/config/business-code-rules.js';
export async function allocateBusinessSerial(db,key,minimum){
 const result=await db.query(`INSERT INTO public.aione_business_number_counters(counter_key,last_value) VALUES($1,$2)
 ON CONFLICT(counter_key) DO UPDATE SET last_value=greatest(public.aione_business_number_counters.last_value+1,$2),updated_at=now() RETURNING last_value`,[key,minimum]);
 return Number(result.rows[0].last_value);
}
export async function allocateProductBusinessCode(db,parameters,date=new Date()){
 const rule=parameters.codeRules?.product||DEFAULT_CODE_RULES.product,stem=productCodeStem(rule,date);
 await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['aione-number:'+stem]);
 // Include manually assigned numbers in the starting point so automatic numbering skips them.
 const r=await db.query(`SELECT max(CASE WHEN suffix ~ '^[0-9]{1,10}$' THEN suffix::bigint END) AS maximum FROM (
 SELECT substring(metadata->'manualEntry'->>'localCode' FROM $2::integer) AS suffix FROM public.products
 WHERE metadata->'manualEntry'->>'localCode' LIKE $1) existing`,[stem+'%',stem.length+1]);
 const serial=await allocateBusinessSerial(db,'product:'+stem,Math.max(rule.start,Number(r.rows[0]?.maximum||0)+1));
 return productBusinessCode(rule,serial,date);
}
