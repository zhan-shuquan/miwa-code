import {
  aioneApi,
  aioneImageBlobUrl,
  aioneDownload,
} from "../services/aione-api-client.js";
import { renderSemanticIcons } from "../config/semantic-icons.js";
import { tableSortState, nextTableSort } from "../components/table-sort.js";
import { bindFileIntake, fileBase64 } from "../components/file-intake.js";
const businessTime = (value) =>
  value
    ? new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";
const base = "/api/v1/selection-workspace/pool";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icon = (name) =>
  `<span class="sw-icon" data-icon="${name}" aria-hidden="true"></span>`;
const stateLabel = {
  pending: "待认领",
  claimed: "已认领",
  assigned: "已分配",
  abandoned: "放弃选品",
  archived: "已归档",
  draft: "研究中／草稿",
  confirmed: "已确认选品",
  number_pending: "待生成正式货号",
  submitted: "已提交ERP",
};
const api = (path, method = "GET", body) =>
  aioneApi(base + path, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
export async function initSelectionPool(host) {
  const controller = new AbortController(),
    signal = controller.signal;
  window.addEventListener("hashchange", () => controller.abort(), {
    once: true,
  });
  const on = (el, event, fn) => el?.addEventListener(event, fn, { signal });
  const urls = new Set();
  signal.addEventListener("abort", () => urls.forEach(URL.revokeObjectURL));
  if (!document.getElementById("selection-workspace-css")) {
    const css = document.createElement("link");
    css.id = "selection-workspace-css";
    css.rel = "stylesheet";
    css.href = "./css/pages/selection-workspace.css";
    document.head.append(css);
  }
  const boot = await api("/bootstrap");
  if (signal.aborted) return;
  const channelGroups = new Map();
  for (const channel of boot.channels || []) {
    const group = channelGroups.get(channel.channel_group) || [];
    group.push(channel);
    channelGroups.set(channel.channel_group, group);
  }
  const sourceModule = `<details class="sw-card sp-sources"><summary>选品来源</summary>${[...channelGroups].map(([group,channels]) => `<section><h3>${esc(group)}</h3><div class="sp-source-links">${channels.map(ch => `<a href="${esc(ch.official_url)}" title="${esc(ch.entry_note || ch.channel_name)}" target="_blank" rel="noopener noreferrer"><span class="sp-platform-icon" aria-hidden="true">${esc(ch.icon_text || ch.channel_name.slice(0,1))}</span>${esc(ch.channel_name)}</a>`).join('')}</div></section>`).join('') || '<p>ERP选品渠道尚未同步，请联系管理员。</p>'}</details>`;
  const preferenceKey = "selection.pool." + (boot.identity.memberId || "anonymous");
  const savedColumns = Number(localStorage.getItem(preferenceKey + ".columns"));
  let columns = [4, 6, 8].includes(savedColumns) ? savedColumns : 6;
  let scope =
      new URLSearchParams(location.hash.split("?")[1]).get("scope") ||
      "pending",
    mode = localStorage.getItem(preferenceKey + ".mode") || "cards",
    offset = 0,
    sort = { sort: "createdAt", direction: "desc" },
    result,
    sequence = 0;
  if (scope === "all" && !boot.permissions.manage) scope = "pending";
  let selected = new Set(),
    batchKey = crypto.randomUUID(),
    images = [],
    importFile = null;
  const report = (message, error = false) => {
    const el = host.querySelector("[data-pool-message]");
    el.textContent = message;
    el.hidden = !message;
    el.classList.toggle("sw-error", error);
  };
  const guarded =
    (fn) =>
    async (...args) => {
      try {
        await fn(...args);
      } catch (e) {
        report(e.message, true);
      }
    };
  host.innerHTML = `<section class="sw sp"><header class="sw-heading"><div><small>商品之家</small><h1>选品池</h1></div></header><p data-pool-message role="status" hidden></p>
  ${sourceModule}
  ${boot.permissions.collect ? `<section class="sw-card"><h2>${icon("product")}快速收集</h2><div class="sp-quick-grid"><textarea data-share rows="4" placeholder="粘贴多个商品分享内容、链接或口令" aria-label="批量商品分享内容"></textarea><div data-intake-zone class="sp-intake" tabindex="0" title="点击上传、拖拽或Ctrl+V粘贴图片；沿用后台图片大小限制"><button data-add-images>添加商品图片／手机截图</button><div data-staged-images class="sp-staged"></div></div></div><div class="sw-toolbar"><button data-collect class="sw-primary">加入选品池</button><button data-import>${icon("file")}导入1688选品库</button><label data-merge-option hidden><input type="checkbox" data-merge>图片合为同一商品</label><details><summary>更多设置</summary><label><input type="checkbox" data-suspected>保留已核对的SNS独立商品</label></details><span data-intake-summary></span></div><input type="file" data-image-files accept="image/jpeg,image/png,image/webp" multiple hidden><input type="file" data-import-file accept=".xlsx,.csv" hidden><details data-mapping hidden><summary>导入字段映射</summary><div class="sw-grid">${boot.importFields.map((k) => `<label style="grid-column:span 3">${esc(k)}<input data-map="${k}" placeholder="原文件列名（自动识别时留空）"></label>`).join("")}</div></details><div data-preflight-results></div></section>` : ""}
  <nav class="sw-workspace-tabs" aria-label="选品池范围">${["pending", "mine", ...(boot.permissions.manage ? ["all"] : [])].map((k) => `<button data-scope="${k}" aria-pressed="${scope === k}">${icon(k === "mine" ? "people" : "product")}${{ pending: "待认领", mine: "我的认领", all: "全部选品" }[k]}</button>`).join("")}</nav>
  <div class="sw-toolbar sp-stage-counts" data-stage-counts aria-label="当前筛选范围阶段统计"></div>
  <div class="sw-toolbar sp-filters"><input data-query placeholder="搜索选品货号、正式货号或标题" aria-label="选品池搜索"><input data-filter="selector" placeholder="选品人会员号"><input data-filter="platform" placeholder="来源平台"><input data-filter="owner" placeholder="负责人会员号"><input data-filter="from" type="date" aria-label="开始日期"><input data-filter="to" type="date" aria-label="结束日期"><select data-filter="state" aria-label="认领状态"><option value="">全部认领状态</option>${["pending", "claimed", "assigned", "abandoned", "archived"].map((k) => `<option value="${k}">${stateLabel[k]}</option>`).join("")}</select><button data-search>查询</button><button data-mode>切换列表／卡片</button><label>每行<select data-columns aria-label="每行商品数量">${[4,6,8].map(n => `<option value="${n}" ${n === columns ? "selected" : ""}>${n}个</option>`).join("")}</select></label></div>
  <div class="sw-toolbar"><label><input data-select-all type="checkbox">全选本页</label><button data-batch="claim">批量认领</button>${boot.permissions.assign ? '<select data-assignee aria-label="指定负责人"><option value="">选择负责人</option>' + boot.people.map((p) => `<option value="${esc(p.id)}">${esc(p.display_name)} · ${esc(p.id)}</option>`).join("") + '</select><button data-batch="assign">批量分配</button>' : ""}${boot.permissions.manage ? '<button data-batch="return">收回／退回池</button><button data-batch="archive">批量归档</button>' : ""}${boot.permissions.configureGrants ? "<button data-grants>负责人授权</button>" : ""}<button data-export>导出</button><span data-total></span></div>
  <div data-collection></div><div class="sw-toolbar"><button data-prev>上一页</button><span data-page></span><button data-next>下一页</button></div></section>`;
  const query = () => {
    const q = new URLSearchParams({
      scope,
      limit: "24",
      offset: String(offset),
      ...sort,
      q: host.querySelector("[data-query]").value,
    });
    host.querySelectorAll("[data-filter]").forEach((el) => {
      if (el.value) q.set(el.dataset.filter, el.value);
    });
    return q;
  };
  async function assetURL(record, asset) {
    const url = await aioneImageBlobUrl(
      base +
        `/records/${encodeURIComponent(record)}/assets/${asset}?size=thumbnail`,
    );
    urls.add(url);
    return url;
  }
  async function action(action, ids) {
    const body = { action, ids };
    if (action === "assign") {
      body.owner = host.querySelector("[data-assignee]").value;
      if (!body.owner) throw Error("请选择负责人");
    }
    if (action === "abandon") {
      body.reason = await reasonDialog();
      if (!body.reason) return;
    }
    await api("/action", "POST", body);
    report(action === "claim" ? "已认领，可直接进入选品录入" : "操作已保存");
    selected.clear();
    await load();
  }
  function reasonDialog() {
    return new Promise((resolve) => {
      const d = document.createElement("dialog");
      d.innerHTML =
        '<h2>放弃选品</h2><textarea rows="3" aria-label="放弃原因" placeholder="填写简短原因"></textarea><button data-ok>确认放弃</button><button data-cancel>取消</button>';
      host.append(d);
      d.querySelector("[data-ok]").onclick = () => {
        const value = d.querySelector("textarea").value.trim();
        if (!value) return;
        d.close();
        d.remove();
        resolve(value);
      };
      d.querySelector("[data-cancel]").onclick = () => {
        d.close();
        d.remove();
        resolve(null);
      };
      d.addEventListener(
        "cancel",
        () => {
          d.remove();
          resolve(null);
        },
        { once: true },
      );
      d.showModal();
    });
  }
  const openLink = (r) =>
    r.source?.url
      ? `<a href="${esc(r.source.url)}" target="_blank" rel="noopener noreferrer" title="打开来源页面" aria-label="打开来源页面">${icon("external")}</a>`
      : "";
  const entry = (r) =>
    `#/product-home?view=entry&id=${encodeURIComponent(r.id)}`;
  function actions(r) {
    const sourcing = r.stage?.code === 'need_source' || r.stage?.code === 'no_source';
    const supplier = (boot.channels || []).find(c => c.channel_code === '1688');
    const findSource = sourcing && supplier
      ? `<a class="sw-code-link" href="${esc(supplier.official_url)}" target="_blank" rel="noopener noreferrer" title="在1688使用图片搜索或人工找货，找到后在选品录入填写采购链接">1688找同款</a>` : '';
    return `${r.claimState === "pending" ? `<button class="sw-primary" data-action="claim" data-id="${esc(r.id)}">认领</button>` : `${r.owner === boot.identity.memberId || boot.permissions.manage ? `${findSource}<a class="sw-code-link" href="${entry(r)}">${esc(sourcing ? '填写采购链接' : r.stage?.nextAction || "继续录入")}</a>` : ""}`}${r.owner === boot.identity.memberId && !["confirmed", "submitted", "submitting"].includes(r.status) ? `<button data-action="return" data-id="${esc(r.id)}">退回</button><button data-action="abandon" data-id="${esc(r.id)}">放弃</button>` : ""}`;
  }
  async function load() {
    const seq = ++sequence;
    result = await api("/records?" + query());
    if (seq !== sequence || signal.aborted) return;
    const box = host.querySelector("[data-collection]");
    host.querySelector("[data-stage-counts]").innerHTML = (result.stageCounts || []).map(s => `<span>${esc(s.label)} <strong>${s.count}</strong></span>`).join("");
    host.querySelector("[data-total]").textContent = `共 ${result.total} 条`;
    host.querySelector("[data-page]").textContent =
      `${Math.floor(offset / 24) + 1} / ${Math.max(1, Math.ceil(result.total / 24))}`;
    host.querySelector("[data-prev]").disabled = offset === 0;
    host.querySelector("[data-next]").disabled = offset + 24 >= result.total;
    const pick = (r) =>
      `<input type="checkbox" data-pick="${esc(r.id)}" aria-label="选择 ${esc(r.selectionNo)}" ${selected.has(r.id) ? "checked" : ""}>`;
    const image = (r) =>
      `<button class="sp-image" data-preview="${esc(r.id)}" title="放大商品图片">${r.assets.length ? `<img data-thumb="${esc(r.id)}" alt="商品图片">` : icon("product")}</button>`;
    const number = (r) =>
      `<a class="sw-code-link" ${r.claimState === "pending" && !boot.permissions.manage ? 'data-detail="' + esc(r.id) + '" href="#"' : 'href="' + entry(r) + '"'}>${esc(r.selectionNo)}</a>`;
    if (mode === "cards")
      box.innerHTML =
        `<div class="sp-cards" style="--sp-columns:${columns}">` +
        result.items
          .map(
            (r) =>
              `<article class="sw-card sp-card"><div class="sp-card-top">${pick(r)}${number(r)}${openLink(r)}</div>${image(r)}<h3>${esc(r.title)}</h3><div class="sp-facts"><span>${esc(r.source?.platform || "图片")}</span><span>${r.referencePrice == null ? "" : "参考采购价 " + esc(r.referencePrice)}</span><span>选品人 ${esc(r.selectorName || r.selector)}</span><span>负责人 ${esc(r.ownerName || r.owner || "待分配")}</span><span>${esc(r.stage?.label || "")}</span><span>下一步：${esc(r.stage?.nextAction || "")}</span><time>${esc(businessTime(r.createdAt))}</time></div><div class="sw-toolbar">${actions(r)}<span>${stateLabel[r.claimState] || r.claimState}</span></div></article>`,
          )
          .join("") +
        "</div>";
    else {
      const names = {
        selectionNo: "选品货号",
        title: "商品标题",
        platform: "来源平台",
        referencePrice: "参考采购价",
        selector: "原始选品人",
        owner: "负责人",
        createdAt: "入池时间",
        claimState: "认领状态",
        status: "业务阶段",
      };
      box.innerHTML = `<div class="sw-table-wrap"><table><thead><tr><th>选择</th><th>图片</th>${Object.keys(
        names,
      )
        .map(
          (k) =>
            `<th aria-sort="${tableSortState(sort, k).ariaSort}"><button data-sort="${k}">${names[k]}${icon(tableSortState(sort, k).icon)}</button></th>`,
        )
        .join("")}<th>操作</th></tr></thead><tbody>${result.items
        .map(
          (r) =>
            `<tr><td>${pick(r)}</td><td>${image(r)}</td>${Object.keys(names)
              .map(
                (k) =>
                  `<td>${k === "selectionNo" ? number(r) : esc(k === "status" ? r.stage?.label || stateLabel[r.status] : k === "platform" ? r.source?.platform || "图片" : k === "createdAt" ? businessTime(r.createdAt) : k === "selector" ? (r.selectorName || r.selector) : k === "owner" ? (r.ownerName || r.owner || "—") : stateLabel[r[k]] || r[k] || "—")}</td>`,
              )
              .join("")}<td>${openLink(r)}${actions(r)}</td></tr>`,
        )
        .join("")}</tbody></table></div>`;
    }
    if (!result.items.length)
      box.innerHTML = '<section class="sw-card">暂无符合条件的选品</section>';
    renderSemanticIcons(host);
    box
      .querySelectorAll("[data-pick]")
      .forEach((el) =>
        on(el, "change", () =>
          el.checked
            ? selected.add(el.dataset.pick)
            : selected.delete(el.dataset.pick),
        ),
      );
    box.querySelectorAll("[data-action]").forEach((el) =>
      on(
        el,
        "click",
        guarded(() => action(el.dataset.action, [el.dataset.id])),
      ),
    );
    box.querySelectorAll("[data-sort]").forEach((el) =>
      on(
        el,
        "click",
        guarded(async () => {
          sort = nextTableSort(sort, el.dataset.sort);
          offset = 0;
          await load();
        }),
      ),
    );
    box.querySelectorAll("[data-detail]").forEach((el) =>
      on(
        el,
        "click",
        guarded(async (e) => {
          e.preventDefault();
          const r = await api(
            "/records/" + encodeURIComponent(el.dataset.detail),
          );
          const d = document.createElement("dialog");
          d.className = "sw-text-dialog";
          d.innerHTML =
            "<h2>" +
            esc(r.selectionNo) +
            "</h2><h3>" +
            esc(r.title) +
            "</h3><p>" +
            esc(r.rawShare) +
            "</p><p>参考采购价：" +
            esc(r.referencePrice ?? "待补充") +
            "</p>" +
            openLink(r) +
            '<div class="sw-toolbar"><button data-claim>认领并继续研究</button><button data-close>关闭</button></div>';
          host.append(d);
          renderSemanticIcons(d);
          d.querySelector("[data-close]").onclick = () => d.remove();
          d.querySelector("[data-claim]").onclick = guarded(async () => {
            await action("claim", [r.id]);
            d.remove();
            location.hash = entry(r);
          });
          d.showModal();
        }),
      ),
    );

    for (const r of result.items)
      if (r.assets.length) {
        try {
          const url = await assetURL(r.id, r.assets[0].id);
          if (seq !== sequence || signal.aborted) break;
          const img = box.querySelector('[data-thumb="' + r.id + '"]');
          if (img) img.src = url;
        } catch {
          /* Card remains usable with a placeholder. */
        }
      }
    box.querySelectorAll("[data-preview]").forEach((el) =>
      on(
        el,
        "click",
        guarded(async () => {
          const r = result.items.find((r) => r.id === el.dataset.preview);
          if (!r.assets.length) return;
          const d = document.createElement("dialog");
          d.className = "sw-text-dialog";
          d.innerHTML =
            '<button data-close>关闭</button><div class="sp-gallery"></div>';
          host.append(d);
          for (const a of r.assets) {
            const url = await aioneImageBlobUrl(
              base + `/records/${encodeURIComponent(r.id)}/assets/${a.id}`,
            );
            urls.add(url);
            const img = document.createElement("img");
            img.src = url;
            img.alt = a.filename;
            d.querySelector(".sp-gallery").append(img);
          }
          d.querySelector("[data-close]").onclick = () => d.remove();
          d.showModal();
        }),
      ),
    );
  }
  on(
    host.querySelector("[data-search]"),
    "click",
    guarded(async () => {
      offset = 0;
      selected.clear();
      await load();
    }),
  );
  on(
    host.querySelector("[data-mode]"),
    "click",
    guarded(async () => {
      mode = mode === "cards" ? "list" : "cards";
      localStorage.setItem(preferenceKey + ".mode", mode);
      await load();
    }),
  );
  on(host.querySelector("[data-columns]"), "change", guarded(async (e) => {
    columns = Number(e.target.value);
    localStorage.setItem(preferenceKey + ".columns", String(columns));
    await load();
  }));
  host.querySelectorAll("[data-scope]").forEach((el) =>
    on(
      el,
      "click",
      guarded(async () => {
        scope = el.dataset.scope;
        offset = 0;
        selected.clear();
        host
          .querySelectorAll("[data-scope]")
          .forEach((e) =>
            e.setAttribute("aria-pressed", String(e.dataset.scope === scope)),
          );
        await load();
      }),
    ),
  );
  on(
    host.querySelector("[data-prev]"),
    "click",
    guarded(async () => {
      offset = Math.max(0, offset - 24);
      await load();
    }),
  );
  on(
    host.querySelector("[data-next]"),
    "click",
    guarded(async () => {
      offset += 24;
      await load();
    }),
  );
  on(host.querySelector("[data-select-all]"), "change", (e) => {
    host.querySelectorAll("[data-pick]").forEach((el) => {
      el.checked = e.target.checked;
      e.target.checked
        ? selected.add(el.dataset.pick)
        : selected.delete(el.dataset.pick);
    });
  });
  host.querySelectorAll("[data-batch]").forEach((el) =>
    on(
      el,
      "click",
      guarded(() => action(el.dataset.batch, [...selected])),
    ),
  );
  on(
    host.querySelector("[data-export]"),
    "click",
    guarded(async () => {
      await aioneDownload(base + "/export?" + query(), {
        fileName: "选品池.xlsx",
      });
    }),
  );
  if (boot.permissions.collect) {
    const input = host.querySelector("[data-image-files]"),
      zone = host.querySelector("[data-intake-zone]");
    const addFiles = guarded(async (files) => {
      importFile = null;
      for (const file of files) {
        if (file.size > boot.uploadPolicy.maxBytes)
          throw Error(`图片 ${file.name} 超过后台大小限制`);
        const url = URL.createObjectURL(file);
        urls.add(url);
        images.push({ file, url });
      }
      batchKey = crypto.randomUUID();
      host.querySelector("[data-merge-option]").hidden = images.length < 2;
      host.querySelector("[data-staged-images]").innerHTML = images
        .map(
          (v, i) =>
            `<div><img src="${v.url}" alt="${esc(v.file.name)}"><button data-remove-stage="${i}">删除</button></div>`,
        )
        .join("");
      host.querySelectorAll("[data-remove-stage]").forEach((el) =>
        on(el, "click", () => {
          const staged = images[Number(el.dataset.removeStage)];
          images = images.filter((v) => v !== staged);
          host.querySelector("[data-merge-option]").hidden = images.length < 2;
          el.parentElement.remove();
          host
            .querySelectorAll("[data-remove-stage]")
            .forEach((b, i) => (b.dataset.removeStage = i));
          batchKey = crypto.randomUUID();
        }),
      );
    });
    bindFileIntake({ zone, input, onFiles: addFiles, signal });
    on(host.querySelector("[data-upload]"), "click", () => input.click());
    on(host.querySelector("[data-add-images]"), "click", () => input.click());
    on(host.querySelector("[data-import]"), "click", () =>
      host.querySelector("[data-import-file]").click(),
    );
    on(
      host.querySelector("[data-import-file]"),
      "change",
      guarded(async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        importFile = { filename: file.name, base64: await fileBase64(file) };
        e.target.value = '';
        images = [];
        host.querySelector("[data-merge-option]").hidden = true;
        host.querySelector("[data-staged-images]").innerHTML = "";
        host.querySelector("[data-mapping]").hidden = false;
        host.querySelector("[data-intake-summary]").textContent = file.name + " · 点击加入选品池完成导入";
        batchKey = crypto.randomUUID();
      }),
    );
    on(host.querySelector("[data-share]"), "input", () => {
      importFile = null;
      host.querySelector('[data-intake-summary]').textContent = '';
      host.querySelector('[data-mapping]').hidden = true;
      batchKey = crypto.randomUUID();
    });
    const payload = async () =>
      importFile
        ? {
            file: importFile,
            mapping: Object.fromEntries(
              [...host.querySelectorAll("[data-map]")]
                .filter((e) => e.value)
                .map((e) => [e.dataset.map, e.value]),
            ),
          }
        : { text: host.querySelector("[data-share]").value };
    on(
      host.querySelector("[data-preflight]"),
      "click",
      guarded(async () => {
        const p = await payload();
        const result = await api("/preflight", "POST", p);
        host.querySelector("[data-intake-summary]").textContent =
          `有效 ${result.valid} · 重复 ${result.duplicate} · 异常 ${result.invalid} · 待核对 ${result.suspected}`;
        host.querySelector("[data-preflight-results]").innerHTML = result.rows
          .map(
            (r) =>
              `<p>${esc(r.title || r.source?.url || "分享内容")} · ${esc(r.reason || "可入池")}</p>`,
          )
          .join("");
      }),
    );
    on(
      host.querySelector("[data-collect]"),
      "click",
      guarded(async () => {
        const button = host.querySelector("[data-collect]");
        button.disabled = true;
        try {
          const groups = images.length
            ? host.querySelector("[data-merge]").checked
              ? [images]
              : images.map((i) => [i])
            : [null];
          const results = [];
          for (let i = 0; i < groups.length; i++) {
            const data = groups[i]
              ? {
                  candidates: [
                    {
                      title: "",
                      rawShare: host.querySelector("[data-share]").value,
                      images: await Promise.all(
                        groups[i].slice(0, 1).map(async (v) => ({
                          filename: v.file.name,
                          base64: await fileBase64(v.file),
                        })),
                      ),
                    },
                  ],
                }
              : await payload();
            const response = await api("/collect", "POST", {
              ...data,
              requestKey: batchKey + ":" + i,
              keepSuspected: host.querySelector("[data-suspected]").checked,
            });
            results.push(...response.items);
            if (
              groups[i]?.length > 1 &&
              response.items[0]?.state === "created"
            ) {
              for (const image of groups[i].slice(1))
                await aioneApi(
                  "/api/v1/selection-workspace/records/" +
                    encodeURIComponent(response.items[0].id) +
                    "/assets",
                  {
                    method: "POST",
                    body: JSON.stringify({
                      filename: image.file.name,
                      base64: await fileBase64(image.file),
                    }),
                  },
                );
            }
          }
          report(
            `加入 ${results.filter((r) => r.state === "created").length} 条；重复 ${results.filter((r) => r.state === "duplicate").length} 条；待处理 ${results.filter((r) => !["created", "duplicate"].includes(r.state)).length} 条`,
          );
          host.querySelector("[data-preflight-results]").innerHTML = results
            .filter((r) => r.reason)
            .map(
              (r) =>
                `<p>${esc(r.line ? "第" + r.line + "行：" : "")}${esc(r.reason)}</p>`,
            )
            .join("");
          if (
            results.every((r) => ["created", "duplicate"].includes(r.state))
          ) {
            images = [];
        host.querySelector("[data-merge-option]").hidden = true;
            importFile = null;
            host.querySelector("[data-intake-summary]").textContent = "";
            host.querySelector("[data-mapping]").hidden = true;
            host.querySelector("[data-share]").value = "";
            host.querySelector("[data-staged-images]").innerHTML = "";
            batchKey = crypto.randomUUID();
          }
          await load();
        } finally {
          button.disabled = false;
        }
      }),
    );
  }
  on(
    host.querySelector("[data-grants]"),
    "click",
    guarded(async () => {
      const d = document.createElement("dialog");
      d.className = "sw-text-dialog";
      d.innerHTML =
        "<h2>选品负责人授权</h2>" +
        boot.grantPeople
          .map(
            (p) =>
              `<p data-person="${esc(p.id)}">${esc(p.display_name)} · ${esc(p.id)} ${["research", "collect", "assign", "manage", "manageGrants"].map((k) => `<label><input type="checkbox" data-permission="${k}" ${boot.grants?.[p.id]?.[k] ? "checked" : ""}>${{ research: "选品研究", collect: "收集", assign: "分配", manage: "管理全部", manageGrants: "管理负责人授权" }[k]}</label>`).join("")}</p>`,
          )
          .join("") +
        "<button data-save-grants>保存授权</button><button data-close>关闭</button>";
      host.append(d);
      d.querySelector("[data-close]").onclick = () => d.remove();
      d.querySelector("[data-save-grants]").onclick = guarded(async () => {
        const value = Object.fromEntries(
          [...d.querySelectorAll("[data-person]")].map((p) => [
            p.dataset.person,
            Object.fromEntries(
              [...p.querySelectorAll("[data-permission]")].map((e) => [
                e.dataset.permission,
                e.checked,
              ]),
            ),
          ]),
        );
        await api("/grants", "PUT", value);
        d.remove();
        report("授权已保存，下次打开页面生效");
      });
      d.showModal();
    }),
  );
  renderSemanticIcons(host);
  await load();
}
