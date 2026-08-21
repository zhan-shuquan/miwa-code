function createStoreLink(entry) {
  const hasUrl = typeof entry.url === "string" && entry.url.trim();
  const el = document.createElement(hasUrl ? "a" : "div");
  el.className = `store-link${hasUrl ? "" : " is-planned"}`;
  if (hasUrl) {
    el.href = entry.url;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
  }

  const mark = document.createElement("span");
  mark.className = "store-link__mark";
  mark.textContent = entry.mark || entry.name?.slice(0, 1) || "·";

  const copy = document.createElement("span");
  copy.className = "store-link__copy";
  const name = document.createElement("strong");
  name.textContent = entry.name || "未命名店铺";
  const sub = document.createElement("small");
  sub.textContent = entry.subtitle || (hasUrl ? "正式运营" : "按实际业务增加");
  copy.append(name, sub);
  el.append(mark, copy);

  const state = document.createElement("span");
  state.className = "store-link__state";
  state.textContent = hasUrl ? "进入 ↗" : "预设";
  el.append(state);
  return el;
}

export function initStoreHome(storeConfig = {}) {
  const grid = document.getElementById("store-platform-grid");
  if (!grid) return;

  const sections = Array.isArray(storeConfig.moreSections) ? storeConfig.moreSections : [];
  const activeStores = sections.flatMap((section) => section.items || []).filter((item) => item.url);
  const activePlatforms = sections.filter((section) => (section.items || []).some((item) => item.url));
  const plannedPlatforms = sections.filter((section) => !(section.items || []).some((item) => item.url));

  const metrics = document.getElementById("store-home-metrics");
  const metricData = [
    ["已运营店铺", activeStores.length, "当前可直接进入"],
    ["已运营平台", activePlatforms.length, "已有真实店铺"],
    ["预设平台", plannedPlatforms.length, "按业务发展启用"]
  ];
  metrics?.replaceChildren(...metricData.map(([label, value, hint]) => {
    const card = document.createElement("article");
    card.className = "store-metric";
    card.innerHTML = `<span>${label}</span><strong>${value}</strong><small>${hint}</small>`;
    return card;
  }));

  document.getElementById("store-home-note").textContent = storeConfig.developmentNote || "";

  grid.replaceChildren(...sections.map((section) => {
    const card = document.createElement("article");
    card.className = "store-platform-card";
    const head = document.createElement("header");
    head.className = "store-platform-card__head";
    const title = document.createElement("div");
    title.innerHTML = `<h3>${section.label || "未分类"}</h3><span>${section.hint || ""}</span>`;
    const count = document.createElement("strong");
    const items = Array.isArray(section.items) ? section.items : [];
    count.textContent = items.length ? `${items.length} 店` : "待发展";
    head.append(title, count);

    const body = document.createElement("div");
    body.className = "store-platform-card__body";
    if (items.length) {
      items.forEach((entry) => body.append(createStoreLink(entry)));
    } else {
      const empty = document.createElement("div");
      empty.className = "store-platform-card__empty";
      empty.innerHTML = `<strong>当前暂无正式店铺</strong><span>平台位置已经预留，后续只在真实业务成立后增加店铺入口。</span>`;
      body.append(empty);
    }
    card.append(head, body);
    return card;
  }));

  const changeList = document.getElementById("store-change-list");
  const changes = Array.isArray(storeConfig.recentChanges) ? storeConfig.recentChanges : [];
  if (changeList) {
    if (!changes.length) {
      changeList.innerHTML = `<div class="store-change-empty">暂无需要公开的新变化。</div>`;
    } else {
      changeList.replaceChildren(...changes.map((change) => {
        const item = document.createElement("article");
        item.className = "store-change-item";
        item.innerHTML = `<time>${change.date || ""}</time><div><strong>${change.title || "更新"}</strong><p>${change.detail || ""}</p></div>`;
        return item;
      }));
    }
  }
}
