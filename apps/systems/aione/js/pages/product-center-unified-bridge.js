import { initUnifiedProductCenter } from "./product-center-unified.js?v=20260903-product-center-unified";

function isProductCenterRoute(){
  const raw=String(window.location.hash||"");
  if(!raw.startsWith("#/product-home"))return false;
  const q=raw.includes("?")?new URLSearchParams(raw.slice(raw.indexOf("?")+1)):new URLSearchParams();
  return q.get("center")==="product-center";
}

let timer=0;
function schedule(){
  window.clearTimeout(timer);
  if(!isProductCenterRoute())return;
  timer=window.setTimeout(async()=>{
    for(let i=0;i<24;i+=1){
      const host=document.getElementById("app-main-host");
      if(host){initUnifiedProductCenter();break;}
      await new Promise(r=>window.setTimeout(r,50));
    }
  },90);
}
window.addEventListener("hashchange",schedule);
window.addEventListener("DOMContentLoaded",schedule);
if(document.readyState!=="loading")schedule();
