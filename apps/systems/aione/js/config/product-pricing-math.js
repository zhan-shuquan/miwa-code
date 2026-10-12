// Shared deterministic price math: no marketing price-tail adjustment.
// Monetary fee lines use Math.round, consistent with the Product profit ledger.
export function minimumBreakEvenYen(fixedCost, percentRates=[], targetMargin=0){
  if(fixedCost===null||fixedCost===undefined||!Number.isFinite(Number(fixedCost))||Number(fixedCost)<0)return null;
  const rates=percentRates.map(Number);
  if(rates.some(r=>!Number.isFinite(r)||r<0||r>=100))return null;
  const margin=Number(targetMargin);
  if(!Number.isFinite(margin)||margin<0||margin>=100)return null;
  const denominator=1-rates.reduce((total,rate)=>total+rate,0)/100-margin/100;
  if(denominator<=0)return null;
  const fixed=Math.round(Number(fixedCost));
  const start=Math.max(0,Math.floor(fixed/denominator)-rates.length-2);
  const qualifies=price=>{
    const fee=rates.reduce((total,rate)=>total+Math.round(price*rate/100),0);
    return price-fixed-fee >= price*margin/100-1e-9;
  };
  for(let price=start;price<start+1000;price++)if(qualifies(price))return price;
  return null;
}

/**
 * 销售基础总成本（JPY）= 到日本仓成本 + 日本配送成本 + 平台交易成本。
 * 这是按当前实际售价计算的平台交易费，不包含优惠券、积分、广告等运营费。
 * 如任何成本尚未确认，则保持待核算（null），避免错误地用零代替。
 */
export function salesBaseCostJpy(warehouseCostJpy,japanDeliveryCostJpy,platformCostJpy){
  const amounts=[warehouseCostJpy,japanDeliveryCostJpy,platformCostJpy];
  if(amounts.some(n=>n===null||n===undefined||n===""||!Number.isFinite(Number(n))||Number(n)<0))return null;
  return amounts.reduce((sum,n)=>sum+Math.round(Number(n)),0);
}
