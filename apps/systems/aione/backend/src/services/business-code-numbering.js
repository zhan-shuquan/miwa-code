import {DEFAULT_CODE_RULES,productCodeStem,productBusinessCode} from '../../../js/config/business-code-rules.js';
export async function businessNumberCountersReady(db){
 const result=await db.query(`SELECT count(*)::int AS columns_count FROM information_schema.columns WHERE table_schema='public' AND table_name='aione_business_number_counters' AND ((column_name='counter_key' AND data_type='text') OR (column_name='last_value' AND data_type='bigint') OR (column_name='updated_at' AND data_type='timestamp with time zone'))`);
 return result.rows[0]?.columns_count===3;
}
export async function allocateBusinessSerial(db,key,minimum){
 if(!await businessNumberCountersReady(db))throw Object.assign(new Error('编号配置尚未就绪，请先完成编号依赖核查'),{code:'business_numbering_not_ready',statusCode:503});
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
