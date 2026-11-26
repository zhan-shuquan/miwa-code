import { aioneApi } from "../services/aione-api-client.js";
const base = "/api/v1/selection-workspace/pool";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export async function initSelectionPeople(host) {
  if (!document.getElementById("selection-workspace-css")) {
    const l = document.createElement("link");
    l.id = "selection-workspace-css";
    l.rel = "stylesheet";
    l.href = "./css/pages/selection-workspace.css";
    document.head.append(l);
  }
  const data = await aioneApi('/api/v1/selection-workspace/employees/me');
  const labels={employeeId:'ERP员工编号',memberId:'美和会员号',name:'员工姓名',company:'所属公司',branch:'分支机构',department:'部门',designation:'职位',employmentType:'雇佣类型',grade:'员工职级',status:'员工状态',prefix:'员工货号前缀'};
  host.innerHTML=`<section class="sw"><header class="sw-heading"><div><small>人才之家</small><h1>我的档案</h1></div><a href="#/product-home?view=pool">返回选品池</a></header><section class="sw-card"><header class="sw-heading"><h2>ERP员工档案</h2><button data-refresh>刷新</button></header>${data.employee ? `${/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data.employee.avatar || '') ? `<img class="sw-profile-avatar" src="${esc(data.employee.avatar)}" alt="员工头像">` : ''}<div class="sw-profile-grid">${Object.entries(labels).map(([key,label])=>`<div><span>${esc(label)}</span><strong>${esc((key==='status' ? {Active:'在职',Inactive:'停用',Suspended:'暂停',Left:'离职'}[data.employee[key]] : null) || data.employee[key] || '—')}</strong></div>`).join('')}</div>` : '<p role="status">尚未关联ERP员工档案，请管理员配置美和会员号。</p>'}<p class="sw-muted">${data.cached ? 'ERP暂未连接，显示最近一次有效的授权缓存。' : '资料由ERP统一维护。'} ${data.updatedAt ? '数据更新时间：'+esc(data.updatedAt) : ''}</p></section></section>`;
  host.querySelector('[data-refresh]').addEventListener('click',()=>initSelectionPeople(host));
}
