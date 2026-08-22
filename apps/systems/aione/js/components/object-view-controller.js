/* ========================================
   Object View Controller｜对象卡片/列表统一视图控制器
   Component Foundation：只负责“怎么显示和切换”，
   页面工程只负责“显示什么数据”。
======================================== */

function resolveView(button, keys = ["objectView", "selectionView"]) {
  for (const key of keys) {
    const value = button?.dataset?.[key];
    if (value) return value;
  }
  return "";
}

export function createObjectViewController({
  root,
  cardHost,
  listHost,
  buttonSelector = "[data-object-view]",
  activeClasses = ["is-active"],
  datasetKeys = ["objectView"],
  initialView = "card"
} = {}) {
  if (!root || !cardHost || !listHost) {
    return {
      setView() {},
      getView() { return initialView === "list" ? "list" : "card"; }
    };
  }

  let currentView = initialView === "list" ? "list" : "card";

  function setVisibility(node, visible) {
    node.hidden = !visible;
    /* hidden 是语义真相；inline display 作为旧CSS/缓存CSS的防御层。 */
    if (visible) node.style.removeProperty("display");
    else node.style.setProperty("display", "none", "important");
    node.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  function syncButtons() {
    root.querySelectorAll(buttonSelector).forEach((button) => {
      const view = resolveView(button, datasetKeys);
      const selected = view === currentView;
      activeClasses.forEach((className) => button.classList.toggle(className, selected));
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }

  function setView(nextView) {
    currentView = nextView === "list" ? "list" : "card";
    setVisibility(cardHost, currentView === "card");
    setVisibility(listHost, currentView === "list");
    syncButtons();
    return currentView;
  }

  setView(currentView);

  return {
    setView,
    getView() { return currentView; },
    refresh() { return setView(currentView); }
  };
}
