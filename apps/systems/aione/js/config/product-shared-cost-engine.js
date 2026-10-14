// Single deterministic logistics and cost engine. Input must come from active Cloud SQL parameters.
import {minimumBreakEvenYen,salesBaseCostJpy} from "./product-pricing-math.js";
const valid=x=>typeof x==="number"&&Number.isFinite(x)&&x>=0;
const money=x=>Math.round(x);
export function effectiveSizeClass(product,mode){return mode?.fulfillment==="direct"?"直发":product.sizeClass||"";}
export function calculateProductCosts(product,sku,params){
 const c=params?.commerce,shop=params?.shop,common=params?.common;
 if(!c||!shop||!common)return {status:"unconfigured",reason:"共享参数尚未加载"};
 const mode=Object.values(c.logistics||{}).find(x=>x.name===product.logisticsMethod);
 if(!mode)return {status:"unconfigured",reason:"物流方式尚未匹配共享参数"};
 const qty=Number(product.setQuantity||1);
 const cost=Number(sku?.cost??product.purchaseUnitCostCny);
 const actual=Number(product.actualShipmentWeightG);
 const estimate=Number(sku?.weight??product.weightG)*qty;
 const weight=actual>0?actual:estimate;
 if(!valid(weight)||weight<=0)return {status:"unconfigured",reason:"请录入实际发货重量，或者填写净重以预估"};
 if(!valid(cost)||!valid(qty)||qty<1||!valid(common.cnyToJpyRate))return {status:"unconfigured",reason:"采购成本或汇率未配置"};
 const fx=common.cnyToJpyRate;
 const packName=product.packagingMethod;
 const packCny=packName==="定制包装"?(product.customPackagingCostCny===null||product.customPackagingCostCny===undefined||product.customPackagingCostCny===""?null:Number(product.customPackagingCostCny)):c.chinaPackagingCny[packName];
 if(packCny===null||!valid(packCny))return {status:"unconfigured",reason:"定制包装请填写实际中国包装费（CNY）"};
 const purchase=money(cost*qty*fx),domestic=money(Number(product.domesticFreightCny||0)*fx),pack=money(packCny*fx);
 const freightCny=mode.billing==="step"?
 mode.firstFeeCny+Math.max(0,Math.ceil((weight-mode.firstWeightG)/mode.additionalWeightG))*mode.additionalFeeCny:
 weight/1000*mode.perKgCny;
 const shipping=money(freightCny*fx),duty=money(purchase*c.tariffRatePct/100);
 const warehouse=purchase+domestic+pack+shipping+duty;
 const size=effectiveSizeClass(product,mode);
 const tiers={"3cm厚":"THIN_3CM","60cm":"SIZE_60","80cm":"SIZE_80","100cm":"SIZE_100","120cm":"SIZE_120"};
 const deliveryKey=tiers[sku?.sizeClass||product.sizeClass],tariff=params.delivery?.[deliveryKey];
 const jpack=mode.fulfillment==="direct"?0:c.japanPackagingJpy[product.packagingMaterial];
 const delivery=mode.fulfillment==="direct"?0:(tariff?.enabled!==false?tariff?.fee:null);
 if(!valid(delivery)||!valid(jpack))return {status:"unconfigured",reason:"日本配送或包装费用尚未配置"};
 const japan=jpack+delivery;
 const price=Number(sku?.price??product.salePriceJpy??0);
 const rates=product.rates||{};
 const platformRate=Number(rates.platform??shop.platformFeeRate);
 const platform=money(price*platformRate/100);
 const feeRates=["coupon","points","ads","other"].map(k=>Number(rates[k]??0));
 const operation=feeRates.reduce((a,r)=>a+money(price*r/100),0);
 const fixed=warehouse+japan;
 const roundPrice=minimum=>{if(minimum===null)return null;const step=c.priceRoundUnitJpy,tail=c.priceTailJpy;return Math.max(tail,Math.ceil((minimum-tail)/step)*step+tail)};
 const targetPrice=roundPrice(minimumBreakEvenYen(fixed,[platformRate],Number(product.profitTargets?.productMargin??c.productMarginTargetPct)));
 const operatingBreakEven=minimumBreakEvenYen(fixed,[platformRate,...feeRates]);
 const baseCost=salesBaseCostJpy(warehouse,japan,platform);
 const gross=price-baseCost,net=gross-operation;
 return {status:"priced",estimated:!(actual>0),sizeClass:size,mode,weight,
 price,warehouse,japan,deliveryQuote:{status:"priced",amountJpy:delivery},platform,operation,gross,net,baseCost,fixed,targetPrice,
 operatingBreakEven,unoperatedBreakEven:minimumBreakEvenYen(fixed,[platformRate]),platformRate,feeRates,
 ledger:[["到日本仓成本",warehouse,[["商品采购成本",purchase],["中国国内运费",domestic],["中国包装成本",pack],["国际物流成本",shipping],["关税成本",duty]]],["日本配送成本",japan,[["日本包装成本",jpack],["日本配送运费",delivery]]],["平台交易成本",platform,[["乐天平台交易费",platform]]],["销售运营成本",operation,["优惠券","积分","RPP广告","其他运营费用"].map((n,i)=>[n,money(price*feeRates[i]/100)])]]};
}
