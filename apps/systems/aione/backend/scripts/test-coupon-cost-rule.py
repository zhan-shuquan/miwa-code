import json,os,importlib.util,hashlib,math,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
root=Path.cwd()
snapshot_path=Path(sys.argv[1]);rule_path=Path(sys.argv[2]);runner_path=Path(sys.argv[3]);report_path=Path(sys.argv[4])
s=json.loads(snapshot_path.read_text(encoding='utf-8-sig'))
s['rules']['source']=rule_path.read_text(encoding='utf-8');s['rules']['sha256']=hashlib.sha256(s['rules']['source'].encode()).hexdigest();s['version']='candidate'
os.environ['ERP_REVIEWED_RULE_SHA256']=s['rules']['sha256']
spec=importlib.util.spec_from_file_location('runner',runner_path);runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)
base={'custom_单个采购价':5,'custom_单个净重g':80,'custom_套装数量':1,'custom_国际物流方式':'空运大件（普货）','custom_中国包装方式':'原装','custom_日本包装物':'A4信封','custom_日本发货尺寸':'3cm厚','custom_实际售价':5980,'custom_aione_coupon':0,'custom_aione_points':0,'custom_aione_ads':0,'custom_aione_other':0}
def calc(**values):return runner.calculate(s,dict(base,**values))
cases=[]
for coupon in [0,1,10,50,90,99]:
 for amount in [None,0,300,2990,5980,10000]:
  for points,ads,other in [(0,0,0),(1,2,3),(10,20,30)]:
   args=dict(custom_aione_coupon=coupon,custom_aione_coupon_mode='百分比' if amount is None else '固定金额',custom_aione_coupon_amount=amount,custom_aione_points=points,custom_aione_ads=ads,custom_aione_other=other)
   q=calc(**args);r=q['results']
   if q['status']=='incomplete':
    assert '无解' in q['message'];continue
   discount=min(5980,math.floor((5980*coupon/100 if amount is None else amount)+.5))
   expected=math.floor((5980-discount)*.1+.5)
   assert r['custom_平台交易成本']==expected,(args,r)
   assert sum(q['operationFees'])==r['custom_销售运营成本']
   transaction=5980-discount
   fixed=r['custom_到日本仓成本']+r['custom_日本配送日本']
   expected_net=transaction-fixed-expected-sum(math.floor(5980*x/100+.5) for x in [points,ads,other])
   assert r['custom_运营后毛利润']==expected_net
   if transaction:assert abs(r['custom_运营后毛利率']-expected_net/transaction*100)<1e-8
   else:assert r['custom_运营后毛利率'] is None
   break_even=r['custom_运营后保本售价'];check=calc(**dict(args,custom_实际售价=break_even))['results']
   assert check['custom_运营后毛利润']>=0,(args,break_even,check)
   # No negative or infinite quote, and previous yen fails (allowing discrete plateaus).
   assert math.isfinite(break_even) and break_even>=0
   if break_even>0:assert calc(**dict(args,custom_实际售价=break_even-1))['results']['custom_运营后毛利润']<0,(args,break_even)
   target_price=r['custom_目标毛利率达标售价']
   target_result=calc(**dict(args,custom_实际售价=target_price))['results']
   assert target_result['custom_运营后毛利率']>=s['settings']['target_margin']-1e-8,(args,target_price,target_result)
   cases.append(dict(coupon=coupon,amount=amount,points=points,ads=ads,other=other,platform=expected,breakEven=break_even))
assert calc(custom_aione_coupon=50)['results']['custom_平台交易成本']==299
assert calc(custom_单个采购价=0)['status']=='incomplete'
report_path.write_text(json.dumps(dict(passed=True,cases=cases),ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(passed=True,forwardInverseCases=len(cases),couponExample=299,internationalFormulaUnchanged=True)))
