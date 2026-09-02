import { initBrandCenterPreview } from "./brand-center-preview.js?v=20260902-brand-center-v1";

function isBrandCenterRoute(){
  const raw=String(window.location.hash||'').replace(/^#\/?/,'');
  if(!raw.startsWith('product-home?')) return false;
  const query=raw.slice(raw.indexOf('?')+1);
  return new URLSearchParams(query).get('center')==='brand-center';
}

function renderIfNeeded(){
  if(!isBrandCenterRoute()){
    delete document.body.dataset.brandCenterPreview;
    return;
  }
  const host=document.getElementById('app-main-host');
  if(!host) return;
  if(host.querySelector('[data-brand-center-preview]')) return;
  initBrandCenterPreview();
}

const observer=new MutationObserver(()=>{
  if(isBrandCenterRoute()) window.setTimeout(renderIfNeeded,0);
});

window.addEventListener('DOMContentLoaded',()=>{
  const host=document.getElementById('app-main-host');
  if(host) observer.observe(host,{childList:true,subtree:false});
  window.setTimeout(renderIfNeeded,180);
});
window.addEventListener('hashchange',()=>window.setTimeout(renderIfNeeded,180));
window.setTimeout(renderIfNeeded,700);
