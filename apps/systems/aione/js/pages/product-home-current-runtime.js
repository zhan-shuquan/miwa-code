import { initProductHomeCurrent } from "./product-home-current.js?v=20260903-product-home-current-v1";

function rawHash(){return String(window.location.hash||"");}
function isProductHome(){return rawHash().startsWith("#/product-home");}
function centerId(){
  const raw=rawHash();
  if(!isProductHome())return null;
  const query=raw.includes("?")?new URLSearchParams(raw.slice(raw.indexOf("?")+1)):new URLSearchParams();
  return query.get("center")||"home";
}
function shouldKeepLegacy(){return centerId()==="brand-center";}
function renderCurrent(){
  if(!isProductHome()||shouldKeepLegacy())return false;
  const host=document.getElementById("app-main-host");
  if(!host)return false;
  if(host.dataset.productHomeCurrentKey===rawHash())return true;
  initProductHomeCurrent();
  host.dataset.productHomeCurrentKey=rawHash();
  return true;
}
let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{
    queued=false;
    if(!renderCurrent())return;
    window.setTimeout(renderCurrent,80);
    window.setTimeout(renderCurrent,240);
  });
}
window.addEventListener("hashchange",schedule);
window.addEventListener("DOMContentLoaded",()=>{
  schedule();
  const host=document.getElementById("app-main-host");
  if(host)new MutationObserver(()=>{
    if(!isProductHome()||shouldKeepLegacy())return;
    if(!host.querySelector(".phc")){delete host.dataset.productHomeCurrentKey;schedule();}
  }).observe(host,{childList:true});
});
if(document.readyState!=="loading")schedule();
