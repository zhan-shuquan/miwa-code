// Explicitly versioned verification result. Old backend readbacks cannot claim image acceptance.
export const RAKUTEN_READBACK_CONTRACT="rakuten-zjl238-images-v2";
export function assessRakutenReadback(x){
 const iv=x?.imageVerification;
 const complete=Boolean(x?.readbackContract===RAKUTEN_READBACK_CONTRACT&&x?.exists===true&&
  x?.skuDataVerified===true&&Array.isArray(x?.checks)&&Array.isArray(iv?.rows)&&iv.rows.length===12&&
  iv.total===12&&Number.isSafeInteger(iv.accessible)&&Number.isSafeInteger(iv.cabinetMatched)&&
  Array.isArray(iv.issues)&&iv.issues.length===0&&iv.accessible===12&&iv.cabinetMatched===12&&
  iv.verified===true&&x.verified===true&&x.checks.length===0);
 return {complete,skuVerified:x?.skuDataVerified===true,imageVerified:complete,
  unavailable:!x?.imageVerification||x?.readbackContract!==RAKUTEN_READBACK_CONTRACT,
  issues:iv?.issues||[],accessible:iv?.accessible??null,total:iv?.total??null,matched:iv?.cabinetMatched??null};
}
