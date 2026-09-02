import { initBrandCenterPreview } from "./brand-center-preview.js?v=20260902-brand-center-isolated-v2";

function routeState(){
  const raw=String(window.location.hash||'').replace(/^#\/?/,'');
  if(!raw.startsWith('product-home?')) return null;
  const query=raw.slice(raw.indexOf('?')+1);
  const center=new URLSearchParams(query).get('center');
  return center==='brand-center' ? { center } : null;
}

function clearBrandPreview(){
  delete document.body.dataset.brandCenterPreview;
}

function renderIfNeeded(){
  if(!routeState()){
    clearBrandPreview();
    return;
  }
  const host=document.getElementById('app-main-host');
  if(!host) return;
  if(host.querySelector('[data-brand-center-preview]')) return;
  initBrandCenterPreview();
}

function install(){
  const host=document.getElementById('app-main-host');
  if(host){
    const observer=new MutationObserver(()=>{
      if(routeState()) window.setTimeout(renderIfNeeded,0);
    });
    observer.observe(host,{childList:true,subtree:false});
  }
  renderIfNeeded();
}

window.addEventListener('DOMContentLoaded',()=>window.setTimeout(install,120));
window.addEventListener('hashchange',()=>window.setTimeout(renderIfNeeded,160));
window.setTimeout(renderIfNeeded,700);
