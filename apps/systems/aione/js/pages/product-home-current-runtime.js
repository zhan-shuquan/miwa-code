import { initProductHomeCurrent } from "./product-home-current.js?v=20260903-product-home-current-v2";

function rawHash(){return String(window.location.hash||"");}
function isProductHome(){return rawHash().startsWith("#/product-home");}
function renderCurrent(){
  if(!isProductHome())return false;
  const host=document.getElementById("app-main-host");
  if(!host)return false;
  if(host.dataset.productHomeCurrentKey===rawHash()&&host.querySelector(".phc"))return true;
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
    if(!isProductHome())return;
    if(!host.querySelector(".phc")){delete host.dataset.productHomeCurrentKey;schedule();}
  }).observe(host,{childList:true});
});
if(document.readyState!=="loading")schedule();
