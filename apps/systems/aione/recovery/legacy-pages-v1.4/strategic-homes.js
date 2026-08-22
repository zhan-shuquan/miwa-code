import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260822-v1.3.0-level2-empty-base-candidate";

const STORAGE_PREFIX = "aione:home-follows:v1:";

function storageKey() {
  const identity = window.AIONEPreviewIdentity || {};
  return `${STORAGE_PREFIX}${identity.subjectId || "anonymous"}`;
}

function readFollows() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey()) || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeFollows(follows) {
  window.localStorage.setItem(storageKey(), JSON.stringify([...follows]));
}

export function initStrategicHome() {
  const root = document.querySelector(".strategic-home");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";
  renderSemanticIcons(root);

  const cards = [...root.querySelectorAll("[data-home-card]")];
  const follows = readFollows();
  const focusList = root.querySelector("[data-home-focus-list]");

  const renderFocus = () => {
    if (!focusList) return;
    focusList.replaceChildren();
    const selected = cards.filter((card) => follows.has(card.dataset.followKey));
    if (!selected.length) {
      const empty = document.createElement("span");
      empty.className = "strategic-home__focus-empty";
      empty.textContent = "暂未关注本页能力；点击卡片右上角星标即可固定。";
      focusList.append(empty);
      return;
    }
    selected.forEach((card) => {
      const link = document.createElement("a");
      link.className = "strategic-home__focus-link";
      link.href = `#/${card.dataset.route}`;
      link.textContent = card.dataset.title;
      focusList.append(link);
    });
  };

  cards.forEach((card) => {
    const button = card.querySelector("[data-follow-toggle]");
    if (!button) return;
    const key = card.dataset.followKey;
    const updateButton = () => {
      const active = follows.has(key);
      button.classList.toggle("is-followed", active);
      button.setAttribute("aria-pressed", String(active));
      button.textContent = active ? "★" : "☆";
      button.title = active ? "取消关注" : "加入我的关注";
    };
    button.addEventListener("click", () => {
      if (follows.has(key)) follows.delete(key);
      else follows.add(key);
      writeFollows(follows);
      updateButton();
      renderFocus();
    });
    updateButton();
  });

  renderFocus();
}

