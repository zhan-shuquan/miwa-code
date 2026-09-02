import { buildAIONEAIContext } from "./ai-context-router.js?v=20260902-product-home-secretary-v1";

function syncProductSecretaryIdentity(){
  const root=document.getElementById('miwa-ai-layer');
  if(!root) return;
  let context=null;
  try{context=buildAIONEAIContext();}catch{}
  const isProduct=context?.assistant?.scope==='product-home';
  const title=document.getElementById('miwa-ai-title');
  const kicker=root.querySelector('.miwa-ai-identity__kicker');
  const welcome=root.querySelector('.miwa-ai-welcome strong');
  const welcomeBody=root.querySelector('.miwa-ai-welcome .ai-secretary-message__body');
  if(title) title.textContent=isProduct?'商品之家AI秘书':'美和AI';
  if(kicker) kicker.textContent=isProduct?'美和AI · 商品之家专属上下文':'AIONE 智能能力层';
  if(welcome) welcome.textContent=isProduct?'商品之家AI秘书':'美和AI';
  if(welcomeBody && isProduct) welcomeBody.textContent=`已进入${context?.workbench?.label || '商品之家'}上下文。我会优先读取商品之家当前页面、对象与关联数据，再给出分析、检查和下一步。`;
  root.dataset.aiScope=isProduct?'product-home':'global';
}

const observer=new MutationObserver(syncProductSecretaryIdentity);
window.addEventListener('DOMContentLoaded',()=>{
  const host=document.getElementById('miwa-ai-layer-host');
  if(host) observer.observe(host,{childList:true,subtree:true});
  syncProductSecretaryIdentity();
});
window.addEventListener('hashchange',()=>window.setTimeout(syncProductSecretaryIdentity,0));
window.addEventListener('aione:brand-center-rendered',()=>window.setTimeout(syncProductSecretaryIdentity,0));
document.addEventListener('click',(event)=>{
  if(event.target.closest('#desktop-miwa-ai-entry,#mobile-miwa-ai-entry,[data-miwa-ai-entry]')) window.setTimeout(syncProductSecretaryIdentity,30);
},true);
window.setTimeout(syncProductSecretaryIdentity,700);
