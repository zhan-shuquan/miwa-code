import { PREVIEW_IDENTITIES } from "../config/preview-identities.js";
import {
  addSuggestion,
  addTask,
  getCollaborationData,
  onCollaborationChange,
  toggleTask
} from "../data/collaboration-store.js";

let stopListening = null;

function formatDateTime(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "";
  }
}

function emptyState(title, copy) {
  const element = document.createElement("div");
  element.className = "core-empty";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const paragraph = document.createElement("p");
  paragraph.textContent = copy;
  element.append(strong, paragraph);
  return element;
}

function priorityLabel(priority) {
  return { normal: "普通", important: "重要", urgent: "紧急" }[priority] || "普通";
}

export function initTodayWork() {
  const root = document.querySelector(".today-work-page");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  stopListening?.();
  const identity = window.AIONEPreviewIdentity || {};
  let filter = "mine";

  const taskDialog = root.querySelector("#task-dialog");
  const suggestionDialog = root.querySelector("#suggestion-dialog");
  const assignee = root.querySelector("#task-assignee");

  PREVIEW_IDENTITIES.forEach((person) => {
    const option = document.createElement("option");
    option.value = person.subjectId;
    option.textContent = `${person.displayName} · ${person.primaryWorkIdentity}`;
    option.dataset.name = person.displayName;
    if (person.subjectId === identity.subjectId) option.selected = true;
    assignee?.append(option);
  });

  const render = () => {
    const data = getCollaborationData();
    const today = new Date().toISOString().slice(0, 10);
    const assigned = data.tasks.filter((task) => task.assigneeId === identity.subjectId && task.status !== "done");
    const created = data.tasks.filter((task) => task.creatorId === identity.subjectId && task.status !== "done");
    const completed = data.tasks.filter((task) => task.completedAt?.slice(0, 10) === today);

    root.querySelector("#work-count-assigned").textContent = String(assigned.length);
    root.querySelector("#work-count-created").textContent = String(created.length);
    root.querySelector("#work-count-completed").textContent = String(completed.length);
    root.querySelector("#work-count-suggestions").textContent = String(data.suggestions.length);
    window.MIWAHeader?.configure({ workCount: assigned.length });

    const visibleTasks = data.tasks.filter((task) => {
      if (filter === "all") return true;
      if (filter === "assigned") return task.assigneeId === identity.subjectId;
      return task.assigneeId === identity.subjectId || task.creatorId === identity.subjectId;
    });

    const taskList = root.querySelector("#today-task-list");
    taskList.replaceChildren();
    if (!visibleTasks.length) {
      taskList.append(emptyState("当前没有相关任务", "可以布置第一项协同任务；任务对全员开放，不按岗位限制发起人。"));
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
        const priority = document.createElement("span");
        priority.className = `work-priority is-${task.priority}`;
        priority.textContent = priorityLabel(task.priority);
        top.append(title, priority);
        const meta = document.createElement("p");
        const due = task.dueDate ? ` · 截止 ${task.dueDate}` : "";
        const workbench = task.workbench ? ` · ${task.workbench === "sampling" ? "测样工作台" : task.workbench}` : "";
        const businessObject = task.businessObjectId ? ` · ${task.businessObjectId}` : "";
        meta.textContent = `${task.creatorName} → ${task.assigneeName}${workbench}${businessObject}${due}`;
        main.append(top, meta);
        if (task.description) {
          const description = document.createElement("p");
          description.className = "work-task__description";
          description.textContent = task.description;
          main.append(description);
        }
        const actions = document.createElement("div");
        actions.className = "sampling-task-actions";
        if (task.route) {
          const open = document.createElement("button");
          open.type = "button";
          open.textContent = "打开任务";
          open.addEventListener("click", () => {
            window.location.hash = task.route;
          });
          actions.append(open);
        }
        const action = document.createElement("button");
        action.type = "button";
        action.textContent = task.status === "done" ? "恢复待办" : "标记完成";
        action.addEventListener("click", () => toggleTask(task.id));
        actions.append(action);
        card.append(main, actions);
        taskList.append(card);
      });
    }

    const ideaList = root.querySelector("#today-suggestion-list");
    ideaList.replaceChildren();
    if (!data.suggestions.length) {
      ideaList.append(emptyState("还没有建议或创新", "所有成员都可以提交。先记录，再讨论是否进入验证。"));
    } else {
      data.suggestions.slice(0, 8).forEach((idea) => {
        const card = document.createElement("article");
        card.className = "work-idea";
        const meta = document.createElement("span");
        meta.textContent = `${idea.category} · ${idea.authorName} · ${formatDateTime(idea.createdAt)}`;
        const title = document.createElement("strong");
        title.textContent = idea.title;
        const content = document.createElement("p");
        content.textContent = idea.content;
        card.append(meta, title, content);
        ideaList.append(card);
      });
    }
  };

  root.querySelectorAll("[data-task-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      filter = button.dataset.taskFilter;
      root.querySelectorAll("[data-task-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    });
  });

  root.querySelector("#open-task-dialog")?.addEventListener("click", () => taskDialog?.showModal());
  root.querySelector("#open-suggestion-dialog")?.addEventListener("click", () => suggestionDialog?.showModal());
  root.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => root.querySelector(`#${button.dataset.closeDialog}`)?.close());
  });

  root.querySelector("#task-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const selected = assignee?.selectedOptions?.[0];
    addTask({
      title: values.get("title"),
      assigneeId: values.get("assigneeId"),
      assigneeName: selected?.dataset.name || selected?.textContent || "当前成员",
      dueDate: values.get("dueDate"),
      priority: values.get("priority"),
      description: values.get("description")
    });
    form.reset();
    if (assignee) assignee.value = identity.subjectId || assignee.options[0]?.value;
    taskDialog?.close();
  });

  root.querySelector("#suggestion-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    addSuggestion({ title: values.get("title"), content: values.get("content"), category: values.get("category") });
    form.reset();
    suggestionDialog?.close();
  });

  stopListening = onCollaborationChange(render);
  render();
}

