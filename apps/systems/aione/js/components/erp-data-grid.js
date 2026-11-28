/* Shared compact ERP table. No business data persistence or mock records. */
const html = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const configKey = id => "aione:grid:v1:" + id;
function readConfig(id){try {const c=JSON.parse(localStorage.getItem(configKey(id))||"null");return c&&typeof c==="object"?c:{};}catch{return {};}}
function storeConfig(id,config){try{localStorage.setItem(configKey(id),JSON.stringify(config));}catch{}}
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export function renderErpGrid(host,{id,columns,rows,onRowClick,onRender,empty="暂无记录",pageSize=20}){
  if(!host)return ()=>{};
  let config=readConfig(id), order=Array.isArray(config.order)?config.order:columns.map(c=>c.key),
      visible=Array.isArray(config.visible)?config.visible:columns.filter(c=>c.defaultVisible!==false).map(c=>c.key),
      widths=config.widths||{},sort=config.sort||null, size=[20,30,50,100].includes(config.size)?config.size:pageSize,
      page=1,selected=null;
  const byKey=new Map(columns.map(c=>[c.key,c]));
  const getCols=()=>[...new Set([...order,...columns.map(c=>c.key)])].filter(k=>byKey.has(k)&&visible.includes(k)).map(k=>byKey.get(k));
  const save=()=>storeConfig(id,{order,visible,widths,sort,size});
  host.classList.add("aione-erp-grid");
  const cssId="aione-erp-grid-css";
  if(!document.getElementById(cssId)){const style=document.createElement("style");style.id=cssId;style.textContent=`
.aione-erp-grid{position:relative;min-width:0;color:#273d31;font:12px/1.4 system-ui,sans-serif}.aione-erp-grid button,.aione-erp-grid select{font:inherit;cursor:pointer}.aione-erp-grid .eg-tools,.aione-erp-grid .eg-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 2px;flex-wrap:wrap}.aione-erp-grid .eg-scroll{overflow:auto;max-width:100%}.aione-erp-grid table{border-collapse:collapse;white-space:nowrap;width:max-content;min-width:100%;font-size:12px}.aione-erp-grid th,.aione-erp-grid td{padding:5px 7px;height:30px;border-bottom:1px solid #e6ece8;max-width:420px;overflow:hidden;text-overflow:ellipsis;text-align:left}.aione-erp-grid th{position:sticky;top:0;background:#f7f9f8;z-index:1;color:#4d6659;user-select:none}.aione-erp-grid th[draggable]{cursor:grab}.aione-erp-grid th .eg-resize{position:absolute;right:0;top:0;height:100%;width:7px;cursor:col-resize}.aione-erp-grid th button{background:none;border:0;color:inherit;padding:0;text-align:left}.aione-erp-grid tr:hover td{background:#f4f8f5;cursor:pointer}.aione-erp-grid tr.eg-selected td{background:#e8f4ed}.aione-erp-grid .eg-btn{background:#fff;border:1px solid #dce5de;border-radius:5px;padding:5px 8px;color:#315441}.aione-erp-grid .eg-menu{position:absolute;right:0;top:36px;z-index:5;background:#fff;border:1px solid #dce5de;border-radius:8px;padding:12px;box-shadow:0 8px 22px #0002;max-height:380px;overflow:auto;min-width:235px}.aione-erp-grid .eg-menu label{display:block;padding:4px 0}.aione-erp-grid .eg-muted{color:#74867b;font-size:11px}
`;document.head.appendChild(style);}
  function sortedRows(){
    if(!sort||!byKey.has(sort.key))return [...rows];
    const col=byKey.get(sort.key);
    return rows.map((row,i)=>({row,i})).sort((a,b)=>{
      const av=typeof col.sortValue==="function"?col.sortValue(a.row):a.row[col.key],bv=typeof col.sortValue==="function"?col.sortValue(b.row):b.row[col.key];
      const an=col.type==="number"?Number(av):NaN,bn=col.type==="number"?Number(bv):NaN;
      const missingA=av===undefined||av===null||av==="",missingB=bv===undefined||bv===null||bv==="";
      if(missingA!==missingB)return missingA?1:-1;
      let result=col.type==="number"&&Number.isFinite(an)&&Number.isFinite(bn)?an-bn:String(av??"").localeCompare(String(bv??""),"zh",{numeric:true});
      return result?(sort.direction==="desc"?-result:result):a.i-b.i;
    }).map(x=>x.row);
  }
  function draw(){
    const cols=getCols(), list=sortedRows(),total=Math.max(1,Math.ceil(list.length/size));page=clamp(page,1,total);
    host.innerHTML=`<div class="eg-tools"><span class="eg-muted">共 ${list.length} 条</span><div style="position:relative"><button class="eg-btn" data-eg-columns>⚙ 列设置</button><button class="eg-btn" data-eg-fit>自动适配</button><div data-eg-menu></div></div></div><div class="eg-scroll"><table><thead><tr>${cols.map(c=>`<th draggable="true" data-eg-col="${html(c.key)}" style="position:relative;${widths[c.key]?`width:${clamp(Number(widths[c.key]),65,420)}px;min-width:${clamp(Number(widths[c.key]),65,420)}px`:`min-width:${c.minWidth||90}px`}"><button data-eg-sort="${html(c.key)}">${html(c.label)} ${sort?.key===c.key?(sort.direction==="asc"?"↑":"↓"):""}</button><span class="eg-resize" data-eg-resize="${html(c.key)}"></span></th>`).join("")}</tr></thead><tbody>${list.slice((page-1)*size,page*size).map((r,i)=>`<tr data-eg-row="${(page-1)*size+i}" class="${selected===r?"eg-selected":""}">${cols.map(c=>`<td title="${html(r[c.key])}">${typeof c.render==="function"?c.render(r):html(r[c.key]??"—")}</td>`).join("")}</tr>`).join("")||`<tr><td colspan="${Math.max(1,cols.length)}">${html(empty)}</td></tr>`}</tbody></table></div><div class="eg-foot"><label>每页 <select data-eg-pagesize>${[20,30,50,100].map(n=>`<option value="${n}" ${n===size?"selected":""}>${n}</option>`).join("")}</select> 行</label><span><button class="eg-btn" data-eg-prev>‹</button> ${page} / ${total} <button class="eg-btn" data-eg-next>›</button></span></div>`;
    host.querySelector("[data-eg-columns]").onclick=()=>{let menu=host.querySelector("[data-eg-menu]");if(menu.innerHTML){menu.innerHTML="";return}menu.innerHTML=`<div class="eg-menu"><strong>显示字段</strong>${columns.map(c=>`<label><input type="checkbox" data-eg-visible="${html(c.key)}" ${visible.includes(c.key)?"checked":""}/> ${html(c.label)}</label>`).join("")}<button class="eg-btn" data-eg-reset>恢复默认</button></div>`;menu.querySelectorAll("[data-eg-visible]").forEach(el=>el.onchange=()=>{visible=el.checked?[...visible,el.dataset.egVisible]:visible.filter(k=>k!==el.dataset.egVisible);save();draw()});menu.querySelector("[data-eg-reset]").onclick=()=>{order=columns.map(c=>c.key);visible=columns.filter(c=>c.defaultVisible!==false).map(c=>c.key);widths={};sort=null;save();draw()};};
    host.querySelector("[data-eg-fit]").onclick=()=>{widths={};for(const c of cols){let max=Math.max(c.label.length*13,...list.slice(0,100).map(r=>String(r[c.key]??"").length*8));widths[c.key]=clamp(max+22,75,280)}save();draw()};
    host.querySelectorAll("[data-eg-sort]").forEach(b=>b.onclick=()=>{const k=b.dataset.egSort;sort=sort?.key!==k?{key:k,direction:"asc"}:sort.direction==="asc"?{key:k,direction:"desc"}:null;page=1;save();draw()});
    host.querySelectorAll("[data-eg-row]").forEach(tr=>tr.onclick=e=>{if(e.target.closest("button,a,input"))return;selected=list[(page-1)*size+Number(tr.dataset.egRow)-(page-1)*size];draw();onRowClick?.(selected)});
    host.querySelector("[data-eg-prev]").onclick=()=>{page--;draw()};host.querySelector("[data-eg-next]").onclick=()=>{page++;draw()};host.querySelector("[data-eg-pagesize]").onchange=e=>{size=Number(e.target.value);page=1;save();draw()};
    let dragKey=null;
    host.querySelectorAll("[data-eg-col]").forEach(th=>{
      th.ondragstart=e=>{if(e.target.closest(".eg-resize")){e.preventDefault();return}dragKey=th.dataset.egCol;e.dataTransfer.effectAllowed="move"};
      th.ondragover=e=>{e.preventDefault()};th.ondrop=e=>{e.preventDefault();const target=th.dataset.egCol;if(!dragKey||dragKey===target)return;order=order.filter(x=>x!==dragKey);order.splice(order.indexOf(target),0,dragKey);dragKey=null;save();draw()};
      const handle=th.querySelector(".eg-resize");
      handle.ondblclick=e=>{e.stopPropagation();const c=byKey.get(handle.dataset.egResize);widths[c.key]=clamp(Math.max(c.label.length*13,...list.slice(0,100).map(r=>String(r[c.key]??"").length*8))+22,75,280);save();draw()};
      handle.onpointerdown=e=>{e.preventDefault();e.stopPropagation();const key=handle.dataset.egResize,start=e.clientX,base=th.getBoundingClientRect().width;const move=ev=>{widths[key]=clamp(base+ev.clientX-start,65,420);th.style.width=widths[key]+"px";th.style.minWidth=widths[key]+"px"};const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);save();draw()};window.addEventListener("pointermove",move);window.addEventListener("pointerup",up,{once:true})};
    });
    onRender?.({page,size,visibleColumns:cols.map(c=>c.key),rowCount:list.length});
  }
  draw();
  return ()=>{};
}
