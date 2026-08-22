import { getPreviewOpportunities } from "../data/preview-opportunities.js";
import {
  ensureTask,
  getCollaborationData,
  onCollaborationChange,
  toggleTask
} from "../data/collaboration-store.js";

const WORKFLOW_PREFIX = "aione:selection:workflow:";
let stopSamplingDashboardListening = null;
let stopSamplingTaskListening = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readWorkflow(recordId) {
  try {
    return JSON.parse(window.localStorage.getItem(`${WORKFLOW_PREFIX}${recordId}`) || "null") || null;
  } catch {
    return null;
  }
}

function samplingRoute(recordId) {
  return `/sampling/opportunity/${encodeURIComponent(recordId)}?mode=edit`;
}

function openSamplingRecord(recordId) {
  window.location.hash = samplingRoute(recordId);
}

function samplingDedupeKey(recordId) {
  return `sampling:${recordId}:execute`;
}

function taskForOpportunity(tasks, recordId) {
  const key = samplingDedupeKey(recordId);
  return tasks.find((task) => task.dedupeKey === key || (
    task.workbench === "sampling" &&
    task.businessObjectType === "product_opportunity" &&
    task.businessObjectId === recordId
  ));
}

function taskStatusLabel(task) {
  if (!task) return "未建任务";
  if (task.status === "done") return "已完成";
  if (task.status === "active") return "处理中";
  return "待处理";
}

function sampleIsAbnormal(sampleState) {
  if (!sampleState) return false;
  const conclusion = String(sampleState.conclusion || "");
  if (sampleState.issueSeverity || sampleState.issueTags || sampleState.issueDescription) return true;
  return Boolean(conclusion && conclusion !== "合格，建议继续");
}

function sampleStatus(item, task, workflow) {
  const sample = workflow?.sampleState;
  if (sample?.status === "completed" && sampleIsAbnormal(sample)) {
    return { key: "abnormal", label: "待复测 / 异常", tone: "warning" };
  }
  if (sample?.status === "completed") {
    return { key: "completed", label: "已完成", tone: "success" };
  }
  if (sample?.status === "draft" || task?.status === "active") {
    return { key: "active", label: "测样中", tone: "active" };
  }
  return { key: "pending", label: "待测样", tone: "pending" };
}

function sampleFlowStage(task, workflow) {
  const sample = workflow?.sampleState;
  if (sample?.status === "completed") {
    return sampleIsAbnormal(sample) ? "conclusion" : "backwrite";
  }
  if (sample?.status === "draft") {
    if (sample.conclusion) return "conclusion";
    const checks = Object.values(sample.checks || {}).filter(Boolean).length;
    const hasEvidence = Number(sample.overallEvidence || 0) + Number(sample.detailEvidence || 0) + Number(sample.issueEvidence || 0) > 0;
    const hasMeasured = Boolean(sample.measuredWeight || checks || hasEvidence);
    if (hasMeasured) return "inspect";
    if (sample.received || sample.receivedAt || Number(sample.receivedQuantity || 0) > 0) return "received";
    if (sample.requestedQuantity || sample.expectedArrivalAt || sample.requestNotes || task?.status === "active") return "preparation";
  }
  if (task?.status === "active") return "preparation";
  return "pending";
}

function renderEmpty(host, title, copy) {
  host.innerHTML = `<div class="core-empty"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p></div>`;
}

function currentIdentity() {
  const identity = window.AIONEPreviewIdentity || {};
  return {
    id: identity.subjectId || "unknown",
    name: identity.displayName || "当前用户"
  };
}

function ensureSamplingTaskFor(item, tasks) {
  const existing = taskForOpportunity(tasks, item.id);
  if (existing) return existing;
  const identity = currentIdentity();
  return ensureTask({
    title: `完成 ${item.id} 测样验证`,
    description: `对“${item.name}”完成样品准备、实物检查、实测、证据记录和测样结论。`,
    assigneeId: identity.id,
    assigneeName: identity.name,
    workbench: "sampling",
    taskType: "sampling.execute",
    businessObjectType: "product_opportunity",
    businessObjectId: item.id,
    route: samplingRoute(item.id),
    dedupeKey: samplingDedupeKey(item.id),
    source: "sampling-workbench"
  });
}

function formatCycleDays(startAt, completedAt) {
  if (!startAt || !completedAt) return null;
  const start = new Date(startAt).getTime();
  const end = new Date(completedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.max(0.1, (end - start) / 86400000);
}

function productVisual(item) {
  const url = item?.representativeImage?.type === "url" ? String(item.representativeImage.url || "").trim() : "";
  if (url) {
    return `<img src="${escapeHtml(url)}" alt="${escapeHtml(item.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="sampling-dashboard-card__placeholder" hidden aria-hidden="true">样品</span>`;
  }
  return `<span class="sampling-dashboard-card__placeholder" aria-hidden="true">样品</span>`;
}

function dashboardRows() {
  const tasks = getCollaborationData().tasks.filter((task) => task.workbench === "sampling");
  return getPreviewOpportunities()
    .filter((item) => !item.isVoided)
    .map((item) => {
      const task = taskForOpportunity(tasks, item.id);
      const workflow = readWorkflow(item.id);
      const sample = workflow?.sampleState || null;
      const status = sampleStatus(item, task, workflow);
      const flowStage = sampleFlowStage(task, workflow);
      return { item, task, workflow, sample, status, flowStage };
    });
}

function renderSamplingDashboard(root) {
  const rows = dashboardRows();
  const statusGrid = root.querySelector("#sampling-status-grid");
  const flowTrack = root.querySelector("#sampling-flow-track");
  const metrics = root.querySelector("#sampling-metrics");
  if (!statusGrid || !flowTrack || !metrics) return;

  const counts = {
    pending: rows.filter((row) => row.status.key === "pending").length,
    active: rows.filter((row) => row.status.key === "active").length,
    abnormal: rows.filter((row) => row.status.key === "abnormal").length,
    completed: rows.filter((row) => row.status.key === "completed").length
  };

  const statusItems = [
    ["pending", "待测样", "等待建立或开始测样任务"],
    ["active", "测样中", "已经进入真实验证"],
    ["abnormal", "待复测 / 异常", "存在风险、修改或复测要求"],
    ["completed", "已完成", "结论已形成并回写"]
  ];
  statusGrid.innerHTML = statusItems.map(([key, label, note]) => `
    <button class="sampling-status-card ${key}" type="button" data-sampling-status-filter="${key}">
      <span>${escapeHtml(label)}</span><strong>${counts[key]}</strong><small>${escapeHtml(note)}</small>
    </button>
  `).join("");

  const flowDefinitions = [
    ["pending", "01", "待测样"],
    ["preparation", "02", "样品准备"],
    ["received", "03", "到货确认"],
    ["inspect", "04", "实物检查与实测"],
    ["conclusion", "05", "形成结论"],
    ["backwrite", "06", "回写选品"]
  ];
  const flowCounts = Object.fromEntries(flowDefinitions.map(([key]) => [key, rows.filter((row) => row.flowStage === key).length]));
  flowTrack.innerHTML = flowDefinitions.map(([key, number, label]) => `
    <button class="selection-flow-step sampling-flow-step" type="button" data-sampling-flow-filter="${key}">
      <small>${number}</small><span>${escapeHtml(label)}</span><b>${flowCounts[key]}</b>
    </button>
  `).join("");

  const now = Date.now();
  const weekCompleted = rows.filter((row) => {
    const completedAt = row.sample?.completedAt;
    if (!completedAt) return false;
    const time = new Date(completedAt).getTime();
    return Number.isFinite(time) && now - time <= 7 * 86400000;
  }).length;
  const cycleDays = rows.map((row) => formatCycleDays(row.task?.createdAt, row.sample?.completedAt)).filter((value) => value !== null);
  const averageCycle = cycleDays.length ? `${(cycleDays.reduce((sum, value) => sum + value, 0) / cycleDays.length).toFixed(1)}天` : "待验证";
  const completionRate = rows.length ? `${Math.round((counts.completed / rows.length) * 100)}%` : "0%";
  const metricItems = [
    ["测样商品总数", rows.length],
    ["待测样", counts.pending],
    ["进行中", counts.active],
    ["异常 / 复测", counts.abnormal],
    ["本周完成", weekCompleted],
    ["平均测样周期", averageCycle],
    ["完成率", completionRate]
  ];
  metrics.innerHTML = metricItems.map(([label, value]) => `<div class="selection-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");

  const ownerSelect = root.querySelector("#sampling-owner-select");
  const currentOwner = ownerSelect?.value || "";
  if (ownerSelect) {
    const owners = [...new Set(rows.map((row) => row.item.owner).filter(Boolean))].sort();
    ownerSelect.innerHTML = `<option value="">全部负责人</option>${owners.map((owner) => `<option value="${escapeHtml(owner)}">${escapeHtml(owner)}</option>`).join("")}`;
    ownerSelect.value = owners.includes(currentOwner) ? currentOwner : "";
  }

  const filterState = root._samplingFilterState || { search: "", status: "", owner: "", flow: "", view: "card" };
  root._samplingFilterState = filterState;
  filterState.owner = ownerSelect?.value || filterState.owner || "";

  const searchValue = String(root.querySelector("#sampling-search")?.value || filterState.search || "").trim().toLowerCase();
  const statusValue = root.querySelector("#sampling-status-select")?.value || filterState.status || "";
  const ownerValue = ownerSelect?.value || filterState.owner || "";
  filterState.search = searchValue;
  filterState.status = statusValue;
  filterState.owner = ownerValue;

  const visible = rows.filter((row) => {
    if (filterState.flow && row.flowStage !== filterState.flow) return false;
    if (statusValue && row.status.key !== statusValue) return false;
    if (ownerValue && row.item.owner !== ownerValue) return false;
    if (searchValue) {
      const haystack = `${row.item.name} ${row.item.id} ${row.item.owner || ""} ${row.item.type || ""}`.toLowerCase();
      if (!haystack.includes(searchValue)) return false;
    }
    return true;
  });

  const flowLabel = root.querySelector("#sampling-flow-label");
  const flowTotal = root.querySelector("#sampling-flow-total");
  const activeFlow = flowDefinitions.find(([key]) => key === filterState.flow);
  if (flowLabel) flowLabel.textContent = activeFlow ? activeFlow[2] : "全部";
  if (flowTotal) flowTotal.textContent = String(rows.length);
  root.querySelectorAll("[data-sampling-flow-filter]").forEach((button) => button.classList.toggle("active", String(button.dataset.samplingFlowFilter || "") === filterState.flow));
  root.querySelectorAll("[data-sampling-status-filter]").forEach((button) => button.classList.toggle("active", String(button.dataset.samplingStatusFilter || "") === statusValue));

  const cardGrid = root.querySelector("#sampling-dashboard-card-grid");
  const tableBody = root.querySelector("#sampling-dashboard-table-body");
  if (!visible.length) {
    renderEmpty(cardGrid, "当前筛选下没有测样商品", "调整筛选条件后可继续查看。 ");
    tableBody.innerHTML = `<tr><td colspan="7">当前筛选下没有测样商品</td></tr>`;
  } else {
    cardGrid.innerHTML = visible.map((row) => {
      const action = row.task ? "进入测样" : "建立任务并进入";
      const conclusion = row.sample?.conclusion || "待形成";
      return `
        <article class="sampling-dashboard-card">
          <div class="sampling-dashboard-card__visual">${productVisual(row.item)}</div>
          <div class="sampling-dashboard-card__body">
            <div class="sampling-dashboard-card__top">
              <span class="sampling-dashboard-status ${row.status.tone}">${escapeHtml(row.status.label)}</span>
              <span>${escapeHtml(row.item.id)}</span>
            </div>
            <h3 title="${escapeHtml(row.item.name)}">${escapeHtml(row.item.name)}</h3>
            <dl>
              <div><dt>负责人</dt><dd>${escapeHtml(row.item.owner || "待确认")}</dd></div>
              <div><dt>选品类型</dt><dd>${escapeHtml(row.item.type || "待确认")}</dd></div>
              <div><dt>当前环节</dt><dd>${escapeHtml(flowDefinitions.find(([key]) => key === row.flowStage)?.[2] || "待测样")}</dd></div>
              <div><dt>任务状态</dt><dd>${escapeHtml(taskStatusLabel(row.task))}</dd></div>
            </dl>
            <div class="sampling-dashboard-card__conclusion"><span>测样结论</span><strong>${escapeHtml(conclusion)}</strong></div>
          </div>
          <button class="sampling-dashboard-card__action" type="button" data-sampling-open="${escapeHtml(row.item.id)}">${escapeHtml(action)}</button>
        </article>
      `;
    }).join("");

    tableBody.innerHTML = visible.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.item.name)}</strong><br><small>${escapeHtml(row.item.id)}</small></td>
        <td><span class="sampling-dashboard-status ${row.status.tone}">${escapeHtml(row.status.label)}</span></td>
        <td>${escapeHtml(row.item.owner || "待确认")}</td>
        <td>${escapeHtml(flowDefinitions.find(([key]) => key === row.flowStage)?.[2] || "待测样")}</td>
        <td>${escapeHtml(taskStatusLabel(row.task))}</td>
        <td>${escapeHtml(row.sample?.conclusion || "待形成")}</td>
        <td><button type="button" data-sampling-open="${escapeHtml(row.item.id)}">${row.task ? "进入测样" : "建立任务并进入"}</button></td>
      </tr>
    `).join("");
  }

  root.querySelectorAll("[data-sampling-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = rows.find((row) => row.item.id === button.dataset.samplingOpen)?.item;
      if (!item) return;
      ensureSamplingTaskFor(item, getCollaborationData().tasks.filter((task) => task.workbench === "sampling"));
      openSamplingRecord(item.id);
    });
  });

  const visibleCount = root.querySelector("#sampling-visible-count");
  if (visibleCount) visibleCount.textContent = `当前显示 ${visible.length} / ${rows.length} 项`;

  const cardMode = filterState.view !== "list";
  cardGrid.hidden = !cardMode;
  root.querySelector("#sampling-dashboard-list-view").hidden = cardMode;
  root.querySelectorAll("[data-sampling-view]").forEach((button) => button.classList.toggle("active", button.dataset.samplingView === (cardMode ? "card" : "list")));
}

export function initSamplingWorkbench() {
  const root = document.querySelector(".sampling-dashboard-page");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";
  root._samplingFilterState = { search: "", status: "", owner: "", flow: "", view: "card" };

  const rerender = () => renderSamplingDashboard(root);
  root.querySelector("#sampling-search")?.addEventListener("input", rerender);
  root.querySelector("#sampling-status-select")?.addEventListener("change", rerender);
  root.querySelector("#sampling-owner-select")?.addEventListener("change", rerender);
  root.querySelector("#sampling-reset")?.addEventListener("click", () => {
    root.querySelector("#sampling-search").value = "";
    root.querySelector("#sampling-status-select").value = "";
    root.querySelector("#sampling-owner-select").value = "";
    root._samplingFilterState.search = "";
    root._samplingFilterState.status = "";
    root._samplingFilterState.owner = "";
    root._samplingFilterState.flow = "";
    rerender();
  });
  root.addEventListener("click", (event) => {
    const flowButton = event.target.closest("[data-sampling-flow-filter]");
    if (flowButton) {
      root._samplingFilterState.flow = String(flowButton.dataset.samplingFlowFilter || "");
      rerender();
      return;
    }
    const statusButton = event.target.closest("[data-sampling-status-filter]");
    if (statusButton) {
      const next = String(statusButton.dataset.samplingStatusFilter || "");
      root._samplingFilterState.status = root._samplingFilterState.status === next ? "" : next;
      root.querySelector("#sampling-status-select").value = root._samplingFilterState.status;
      rerender();
      return;
    }
    const viewButton = event.target.closest("[data-sampling-view]");
    if (viewButton) {
      root._samplingFilterState.view = viewButton.dataset.samplingView === "list" ? "list" : "card";
      rerender();
    }
  });

  stopSamplingDashboardListening?.();
  stopSamplingDashboardListening = onCollaborationChange(rerender);
  rerender();
}

export function initSamplingQueue() {
  const host = document.getElementById("sampling-opportunity-list");
  const count = document.getElementById("sampling-opportunity-count");
  if (!host) return;

  const opportunities = getPreviewOpportunities().filter((item) => !item.isVoided);
  const tasks = getCollaborationData().tasks.filter((task) => task.workbench === "sampling");
  if (count) count.textContent = `${opportunities.length} 件`;

  host.innerHTML = opportunities.map((item) => {
    const task = taskForOpportunity(tasks, item.id);
    const workflow = readWorkflow(item.id);
    const status = sampleStatus(item, task, workflow);
    return `
      <article class="sampling-opportunity-card">
        <div class="sampling-opportunity-card__copy">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.id)} · ${escapeHtml(status.label)}</span>
          <small>${escapeHtml(item.info || "等待进入测样验证")}</small>
        </div>
        <button type="button" data-sampling-record="${escapeHtml(item.id)}">${task ? "进入测样" : "建立任务并进入"}</button>
      </article>
    `;
  }).join("");

  host.querySelectorAll("[data-sampling-record]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = opportunities.find((candidate) => candidate.id === button.dataset.samplingRecord);
      if (!item) return;
      ensureSamplingTaskFor(item, tasks);
      openSamplingRecord(item.id);
    });
  });
}

export function initSamplingTasks() {
  const root = document.querySelector(".sampling-task-page");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  stopSamplingTaskListening?.();
  const identity = window.AIONEPreviewIdentity || {};
  let filter = "open";

  const render = () => {
    const opportunities = getPreviewOpportunities().filter((item) => !item.isVoided);
    const data = getCollaborationData();
    const samplingTasks = data.tasks.filter((task) => task.workbench === "sampling");

    const pending = samplingTasks.filter((task) => task.status === "pending").length;
    const active = samplingTasks.filter((task) => task.status === "active").length;
    const done = samplingTasks.filter((task) => task.status === "done").length;
    const candidates = opportunities.filter((item) => !taskForOpportunity(samplingTasks, item.id));

    root.querySelector("#sampling-count-pending").textContent = String(pending);
    root.querySelector("#sampling-count-active").textContent = String(active);
    root.querySelector("#sampling-count-done").textContent = String(done);
    root.querySelector("#sampling-count-candidates").textContent = String(candidates.length);

    const visibleTasks = samplingTasks.filter((task) => {
      if (filter === "all") return true;
      if (filter === "mine") return task.assigneeId === identity.subjectId || task.creatorId === identity.subjectId;
      return task.status !== "done";
    });

    const taskList = root.querySelector("#sampling-task-list");
    taskList.replaceChildren();
    if (!visibleTasks.length) {
      renderEmpty(taskList, "当前没有相关测样任务", "可以从右侧商品机会建立第一条测样任务。");
    } else {
      visibleTasks.forEach((task) => {
        const card = document.createElement("article");
        card.className = `work-task${task.status === "done" ? " is-done" : ""}`;

        const main = document.createElement("div");
        main.className = "work-task__main";
        const top = document.createElement("div");
        top.className = "work-task__top";
        const title = document.createElement("strong");
        title.textContent = task.title;
        const status = document.createElement("span");
        status.className = "work-priority";
        status.textContent = taskStatusLabel(task);
        top.append(title, status);

        const meta = document.createElement("p");
        const objectId = task.businessObjectId ? ` · ${task.businessObjectId}` : "";
        meta.textContent = `${task.creatorName} → ${task.assigneeName}${objectId}`;
        main.append(top, meta);

        if (task.description) {
          const description = document.createElement("p");
          description.className = "work-task__description";
          description.textContent = task.description;
          main.append(description);
        }

        const actions = document.createElement("div");
        actions.className = "sampling-task-actions";
        if (task.businessObjectId) {
          const open = document.createElement("button");
          open.type = "button";
          open.textContent = "进入测样";
          open.addEventListener("click", () => openSamplingRecord(task.businessObjectId));
          actions.append(open);
        }
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.textContent = task.status === "done" ? "恢复待办" : "标记完成";
        toggle.addEventListener("click", () => toggleTask(task.id));
        actions.append(toggle);

        card.append(main, actions);
        taskList.append(card);
      });
    }

    const candidateList = root.querySelector("#sampling-candidate-list");
    candidateList.replaceChildren();
    if (!candidates.length) {
      renderEmpty(candidateList, "当前商品机会都已有测样任务", "如需复测，后续在 ST 多次测样对象接入后建立新的复测任务。");
    } else {
      candidates.forEach((item) => {
        const card = document.createElement("article");
        card.className = "sampling-candidate";
        const copy = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = item.name;
        const meta = document.createElement("span");
        meta.textContent = `${item.id} · ${item.stageName || "商品机会"}`;
        copy.append(title, meta);

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "建立任务并进入";
        button.addEventListener("click", () => {
          ensureSamplingTaskFor(item, samplingTasks);
          openSamplingRecord(item.id);
        });

        card.append(copy, button);
        candidateList.append(card);
      });
    }
  };

  root.querySelectorAll("[data-sampling-task-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      filter = button.dataset.samplingTaskFilter;
      root.querySelectorAll("[data-sampling-task-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    });
  });

  stopSamplingTaskListening = onCollaborationChange(render);
  render();
}
