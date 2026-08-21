import {
  addCalendarEvent,
  getCollaborationData,
  onCollaborationChange
} from "../data/collaboration-store.js";

let stopListening = null;

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createAgendaEmpty() {
  const element = document.createElement("div");
  element.className = "core-empty";
  const strong = document.createElement("strong");
  strong.textContent = "当日暂无安排";
  const paragraph = document.createElement("p");
  paragraph.textContent = "可新增日程；任务设置完成日期后也会自动出现在这里。";
  element.append(strong, paragraph);
  return element;
}

export function initMiwaCalendar() {
  const root = document.querySelector(".calendar-page");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  stopListening?.();
  const now = new Date();
  let viewDate = new Date(now.getFullYear(), now.getMonth(), 1);
  let selectedDate = dateKey(now);

  const eventDialog = root.querySelector("#event-dialog");
  const eventDate = root.querySelector("#event-date");

  const entriesForDate = (target, data) => {
    const events = data.events
      .filter((event) => event.date === target)
      .map((event) => ({ ...event, source: "event" }));
    const tasks = data.tasks
      .filter((task) => task.dueDate === target && task.status !== "done")
      .map((task) => ({ id: task.id, title: task.title, time: "", type: "task", description: `${task.creatorName} → ${task.assigneeName}`, source: "task" }));
    return [...events, ...tasks].sort((a, b) => String(a.time || "99:99").localeCompare(String(b.time || "99:99")));
  };

  const renderAgenda = (data) => {
    const labelDate = new Date(`${selectedDate}T12:00:00`);
    root.querySelector("#calendar-selected-label").textContent = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(labelDate);
    const list = root.querySelector("#calendar-agenda-list");
    list.replaceChildren();
    const entries = entriesForDate(selectedDate, data);
    if (!entries.length) {
      list.append(createAgendaEmpty());
      return;
    }
    entries.forEach((entry) => {
      const card = document.createElement("article");
      card.className = `calendar-agenda-item is-${entry.type}`;
      const time = document.createElement("span");
      time.textContent = entry.source === "task" ? "任务" : (entry.time || "全天");
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = entry.title;
      const description = document.createElement("p");
      description.textContent = entry.description || (entry.source === "task" ? "今日到期" : "");
      copy.append(title, description);
      card.append(time, copy);
      list.append(card);
    });
  };

  const render = () => {
    const data = getCollaborationData();
    root.querySelector("#calendar-month-label").textContent = `${viewDate.getFullYear()}年${viewDate.getMonth() + 1}月`;
    const grid = root.querySelector("#calendar-grid");
    grid.replaceChildren();

    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - mondayOffset);

    for (let index = 0; index < 42; index += 1) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      const key = dateKey(day);
      const entries = entriesForDate(key, data);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "calendar-day";
      button.classList.toggle("is-other-month", day.getMonth() !== viewDate.getMonth());
      button.classList.toggle("is-today", key === dateKey(now));
      button.classList.toggle("is-selected", key === selectedDate);
      button.dataset.date = key;
      const number = document.createElement("span");
      number.className = "calendar-day__number";
      number.textContent = String(day.getDate());
      const preview = document.createElement("span");
      preview.className = "calendar-day__entries";
      entries.slice(0, 2).forEach((entry) => {
        const item = document.createElement("span");
        item.className = entry.source === "task" ? "is-task" : "is-event";
        item.textContent = entry.title;
        preview.append(item);
      });
      if (entries.length > 2) {
        const more = document.createElement("small");
        more.textContent = `还有${entries.length - 2}项`;
        preview.append(more);
      }
      button.append(number, preview);
      button.addEventListener("click", () => {
        selectedDate = key;
        if (day.getMonth() !== viewDate.getMonth()) viewDate = new Date(day.getFullYear(), day.getMonth(), 1);
        render();
      });
      grid.append(button);
    }
    renderAgenda(data);
  };

  root.querySelector("#calendar-prev")?.addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    render();
  });
  root.querySelector("#calendar-next")?.addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    render();
  });
  root.querySelector("#calendar-today")?.addEventListener("click", () => {
    viewDate = new Date(now.getFullYear(), now.getMonth(), 1);
    selectedDate = dateKey(now);
    render();
  });
  root.querySelector("#open-event-dialog")?.addEventListener("click", () => {
    if (eventDate) eventDate.value = selectedDate;
    eventDialog?.showModal();
  });
  root.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => eventDialog?.close()));
  root.querySelector("#event-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    selectedDate = String(values.get("date"));
    const selected = new Date(`${selectedDate}T12:00:00`);
    viewDate = new Date(selected.getFullYear(), selected.getMonth(), 1);
    addCalendarEvent({
      title: values.get("title"),
      date: values.get("date"),
      time: values.get("time"),
      type: values.get("type"),
      description: values.get("description")
    });
    form.reset();
    eventDialog?.close();
  });

  stopListening = onCollaborationChange(render);
  render();
}
