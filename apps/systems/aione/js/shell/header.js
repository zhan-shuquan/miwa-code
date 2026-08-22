import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260822-v1.3.0-level2-empty-base-candidate";
import { getRouteDefinition } from "../config/route-registry.js";

/* ========================================
   MIWA System Header｜美和システム全局Header
   表示・権限補助・全局入口・标准事件をこのモジュールで管理する。
   注記：画面上の権限制御はサーバー側権限検証の代替ではない。
======================================== */

const SOLAR_TERM_NAMES = [
  "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨",
  "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑",
  "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"
];

const SOLAR_TERM_INFO = [
  0, 21208, 42467, 63836, 85337, 107014, 128867, 150921,
  173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033,
  353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758
];

function getCurrentRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return hash.split(/[/?]/)[0] || "work";
}

function normalizeCount(value) {
  return Math.max(0, Number(value) || 0);
}

function updateCount(elementId, value) {
  const badge = document.getElementById(elementId);
  if (!badge || value === undefined || value === null) return;

  const count = normalizeCount(value);
  badge.textContent = count > 99 ? "99+" : String(count);
  badge.hidden = count === 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeConfig(current, next) {
  const result = { ...(current || {}) };

  Object.entries(next || {}).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = mergeConfig(result[key], value);
    } else if (isPlainObject(value)) {
      result[key] = mergeConfig({}, value);
    } else if (Array.isArray(value)) {
      result[key] = [...value];
    } else {
      result[key] = value;
    }
  });

  return result;
}

function dispatchWindowEvent(name, detail = {}, cancelable = false) {
  const event = new CustomEvent(name, { detail, cancelable });
  return window.dispatchEvent(event);
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = value ?? "";
}

function getTimeZoneDateParts(timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(new Date());

  const map = {};
  parts.forEach((part) => {
    if (part.type !== "literal") map[part.type] = part.value;
  });

  return map;
}

function getZodiac(month, day) {
  const signs = [
    ["摩羯座", 1, 20], ["水瓶座", 2, 19], ["双鱼座", 3, 21], ["白羊座", 4, 20],
    ["金牛座", 5, 21], ["双子座", 6, 22], ["巨蟹座", 7, 23], ["狮子座", 8, 23],
    ["处女座", 9, 23], ["天秤座", 10, 24], ["天蝎座", 11, 23], ["射手座", 12, 22],
    ["摩羯座", 12, 32]
  ];

  for (const [name, signMonth, signDay] of signs) {
    if (month < signMonth || (month === signMonth && day < signDay)) return name;
  }

  return "摩羯座";
}

function getLunarText(date) {
  try {
    return new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
      month: "long",
      day: "numeric"
    }).format(date).replace(/\s+/g, "");
  } catch {
    return "待接入";
  }
}

function solarTermDate(year, index) {
  const base = Date.UTC(1900, 0, 6, 2, 5);
  const millis = 31556925974.7 * (year - 1900) + SOLAR_TERM_INFO[index] * 60000;
  return new Date(base + millis);
}

function getSolarTermText(date) {
  const year = date.getFullYear();
  const list = [];

  for (let targetYear = year - 1; targetYear <= year + 1; targetYear += 1) {
    for (let index = 0; index < 24; index += 1) {
      list.push({ name: SOLAR_TERM_NAMES[index], date: solarTermDate(targetYear, index) });
    }
  }

  list.sort((a, b) => a.date - b.date);

  const now = date.getTime();
  let current = null;
  let next = null;

  for (const item of list) {
    if (item.date.getTime() <= now) current = item;
    if (item.date.getTime() > now) {
      next = item;
      break;
    }
  }

  if (!current || !next) return "--";

  const days = Math.max(0, Math.ceil((next.date.getTime() - now) / 86400000));
  return days <= 1
    ? `${current.name} · 明日${next.name}`
    : `${current.name} · ${days}天后${next.name}`;
}

function weatherTextFromCode(code) {
  const map = {
    0: ["☀", "晴"],
    1: ["🌤", "晴间多云"],
    2: ["⛅", "多云"],
    3: ["☁", "阴"],
    45: ["🌫", "有雾"],
    48: ["🌫", "雾凇"],
    51: ["🌦", "毛毛雨"],
    53: ["🌦", "毛毛雨"],
    55: ["🌧", "毛毛雨"],
    61: ["🌦", "小雨"],
    63: ["🌧", "中雨"],
    65: ["🌧", "大雨"],
    71: ["🌨", "小雪"],
    73: ["🌨", "中雪"],
    75: ["❄", "大雪"],
    80: ["🌦", "阵雨"],
    81: ["🌧", "阵雨"],
    82: ["⛈", "强阵雨"],
    95: ["⛈", "雷雨"]
  };

  return map[Number(code)] || ["◌", "天气"];
}

export function initHeader(initialConfig = {}) {
  const componentHost = document.getElementById("desktop-header-host");
  const header = componentHost?.querySelector(".desktop-header");
  if (!componentHost || !header || header.dataset.initialized === "true") return;

  header.dataset.initialized = "true";

  let config = mergeConfig({}, initialConfig);
  let dailyTimer = null;
  let weatherTimer = null;
  let previousFocus = null;

  function renderBrand() {
    const brand = config.brand || {};
    const logo = document.getElementById("miwaCompanyLogo");
    const fallback = document.getElementById("miwaLogoFallback");

    setText("miwaSystemShortName", brand.systemShortName || "AIONE");
    setText("miwaSystemFormalName", brand.systemFormalName || "美和一体化工作平台");

    document.querySelectorAll(".mobile-brand-name").forEach((element) => {
      element.textContent = brand.systemShortName || "AIONE";
    });
    document.querySelectorAll(".mobile-logo").forEach((element) => {
      if (brand.logoSrc) element.src = brand.logoSrc;
    });

    if (!logo || !fallback) return;

    if (brand.logoSrc) {
      logo.src = brand.logoSrc;
      logo.hidden = false;
      fallback.hidden = true;
      logo.onerror = () => {
        logo.hidden = true;
        fallback.hidden = false;
      };
    } else {
      logo.hidden = true;
      fallback.hidden = false;
    }
  }

  /* Headerには安全な本人要約だけを表示する。 */
  function renderUser() {
    const user = config.user || {};
    const displayName = user.displayName || user.name || "当前用户";
    const workIdentity =
      user.primaryWorkIdentity || user.workIdentity || user.role || "当前工作身份";
    const grade = user.positionGrade || user.grade || "";
    const initial = user.initial || user.avatarText || displayName.trim().charAt(0) || "M";
    const details = {
      position: workIdentity,
      responsibility: user.primaryResponsibility || "",
      project: user.primaryProject || "",
      entity: user.legalEntity || user.businessUnit || "",
      email: user.email || ""
    };

    ["desktop", "mobile"].forEach((scope) => {
      setText(`${scope}-user-name`, displayName);
      setText(`${scope}-position-grade`, grade);
      setText(`${scope}-user-menu-name`, displayName);
      setText(`${scope}-user-menu-grade`, grade);

      const gradeElement = document.getElementById(`${scope}-position-grade`);
      const menuGradeElement = document.getElementById(`${scope}-user-menu-grade`);
      if (gradeElement) gradeElement.hidden = !grade;
      if (menuGradeElement) menuGradeElement.hidden = !grade;

      [
        document.getElementById(`${scope}-user-avatar`),
        document.getElementById(`${scope}-user-menu-avatar`)
      ].forEach((avatar) => {
        if (!avatar) return;
        avatar.textContent = user.avatarUrl ? "" : initial;
        avatar.style.backgroundImage = user.avatarUrl ? `url("${user.avatarUrl}")` : "";
        avatar.classList.toggle("has-image", Boolean(user.avatarUrl));
      });

      Object.entries(details).forEach(([key, value]) => {
        setText(`${scope}-user-menu-${key}`, value);
        const rowSelector = scope === "desktop"
          ? `[data-user-detail="${key}"]`
          : `[data-mobile-user-detail="${key}"]`;
        const row = document.querySelector(rowSelector);
        if (row) row.hidden = !value;
      });

      const employeeEntry = document.getElementById(`${scope}-employee-entry`);
      if (employeeEntry) {
        const gradeText = grade ? `，职级${grade}` : "";
        employeeEntry.setAttribute("aria-label", `${displayName}${gradeText}，打开个人资料卡`);
      }
    });

    setText("miwaDailyLocation", user.locationName || "东京");
    setText("mobileDailyLocation", user.locationName || "东京");
  }

  /* 入口表示制御だけを担当し、正式権限検証はバックエンドで実施する。 */
  function applyPermissions() {
    const restricted = config.permissionMode === "restricted";
    const permissions = Array.isArray(config.permissions)
      ? new Set(config.permissions)
      : null;

    header.querySelectorAll("[data-permission]").forEach((item) => {
      item.hidden = restricted && permissions
        ? !permissions.has(item.dataset.permission)
        : false;
    });
  }

  function updateActiveRoute() {
    const currentRoute = getCurrentRoute();
    const definition = getRouteDefinition();
    const activeRoute = definition.parent || currentRoute;

    document.querySelectorAll("[data-header-route]").forEach((item) => {
      const isActive = item.dataset.headerRoute === activeRoute;
      item.classList.toggle("is-active", isActive);

      if (isActive) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
  }

  function renderDaily() {
    const timeZone = config.user?.timeZone || "Asia/Tokyo";
    const parts = getTimeZoneDateParts(timeZone);
    const localDate = new Date(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );

    setText("miwaSolarDate", `${parts.year}/${parts.month}/${parts.day}`);
    setText("miwaWeekday", new Intl.DateTimeFormat("zh-CN", {
      timeZone,
      weekday: "short"
    }).format(new Date()));
    setText("miwaLocalTime", `${parts.hour}:${parts.minute}`);
    setText("miwaLunarDate", getLunarText(localDate));
    setText("miwaSolarTerm", getSolarTermText(localDate));
    setText("miwaZodiac", getZodiac(Number(parts.month), Number(parts.day)));
    setText("mobileSolarDate", `${parts.year}/${parts.month}/${parts.day}`);
    setText("mobileWeekday", new Intl.DateTimeFormat("zh-CN", {
      timeZone,
      weekday: "short"
    }).format(new Date()));
    setText("mobileLocalTime", `${parts.hour}:${parts.minute}`);
    setText("mobileLunarDate", getLunarText(localDate));
    setText("mobileSolarTerm", getSolarTermText(localDate));
    setText("mobileZodiac", getZodiac(Number(parts.month), Number(parts.day)));
  }

  async function loadWeather() {
    const weatherElements = [
      document.getElementById("miwaWeather"),
      document.getElementById("mobileWeather")
    ].filter(Boolean);
    if (!weatherElements.length) return;

    const setWeatherText = (value) => {
      weatherElements.forEach((element) => {
        element.textContent = value;
      });
    };

    const weather = config.weather || {};
    const user = config.user || {};

    if (!weather.enabled) {
      setWeatherText("天气未启用");
      return;
    }

    try {
      if (typeof weather.provider === "function") {
        const result = await weather.provider(user);
        setWeatherText(result?.displayText || "天气暂不可用");
        return;
      }

      const latitude = Number(user.latitude);
      const longitude = Number(user.longitude);
      const timeZone = user.timeZone || "Asia/Tokyo";

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("weather-location-missing");
      }

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current=temperature_2m,apparent_temperature,weather_code&timezone=${encodeURIComponent(timeZone)}`;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("weather-request-failed");

      const data = await response.json();
      const current = data.current || {};
      const [icon, label] = weatherTextFromCode(current.weather_code);
      const temperature = Math.round(Number(current.temperature_2m));
      const apparent = Math.round(Number(current.apparent_temperature));

      setWeatherText(`${icon} ${label} ${temperature}°C · 体感${apparent}°C`);
    } catch {
      setWeatherText("天气暂不可用");
    }
  }

  function renderSchedule() {
    const schedule = config.enterprise?.importantSchedule || null;
    const root = document.getElementById("miwaDynamicSchedule");
    const text = document.getElementById("miwaScheduleText");
    if (!root || !text) return;
    const showEmptyState = config.enterprise?.showScheduleSlotWhenEmpty !== false;
    root.hidden = !schedule && !showEmptyState;
    root.dataset.scheduleId = schedule?.id || "";
    text.textContent = schedule?.text || config.enterprise?.emptyScheduleText || "暂无重要日程";
  }

  function renderNotice() {
    const notice = config.enterprise?.notice || null;
    const renderTarget = ({ rootId, typeId, textId }) => {
      const root = document.getElementById(rootId);
      const type = document.getElementById(typeId);
      const text = document.getElementById(textId);
      if (!root || !type || !text) return;

      if (!notice) {
        const showEmptyState = config.enterprise?.showNoticeSlotWhenEmpty === true;
        root.hidden = !showEmptyState;
        root.classList.remove("is-urgent");
        root.dataset.noticeId = "";
        type.textContent = "通知";
        text.textContent = config.enterprise?.emptyNoticeText || "暂无重要通知";
        return;
      }

      type.textContent = "通知";
      text.textContent = notice.text || notice.title || "";
      root.hidden = false;
      root.classList.toggle("is-urgent", notice.level === "urgent");
      root.dataset.noticeId = notice.id || "";
    };

    renderTarget({ rootId: "miwaDynamicNotice", typeId: "miwaNoticeType", textId: "miwaNoticeText" });
    renderTarget({ rootId: "mobileDynamicNotice", typeId: "mobileNoticeType", textId: "mobileNoticeText" });
  }

  function createCommonEntry(entry) {
    const hasUrl = typeof entry.url === "string" && entry.url.trim().length > 0;
    const element = document.createElement(hasUrl ? "a" : "button");
    element.className = "miwa-common-entry";
    element.dataset.commonEntry = entry.id || "";
    element.classList.toggle("is-planned", entry.status === "planned");
    element.classList.toggle("is-link-pending", !hasUrl);

    if (hasUrl) {
      element.href = entry.url;
      element.target = "_blank";
      element.rel = "noopener noreferrer";
    } else {
      element.type = "button";
      element.setAttribute("aria-disabled", "true");
      element.title = entry.status === "planned" ? "入口筹备中" : "链接将在系统启用前确认";
    }

    const mark = document.createElement("span");
    mark.className = "miwa-common-entry__mark";
    mark.textContent = entry.mark || entry.name?.slice(0, 1) || "·";
    mark.style.setProperty("--entry-color", entry.color || "#176B4D");

    const copy = document.createElement("span");
    copy.className = "miwa-common-entry__copy";
    const name = document.createElement("strong");
    name.textContent = entry.name || "未命名入口";
    const subtitle = document.createElement("small");
    subtitle.textContent = entry.subtitle || "";
    copy.append(name, subtitle);

    element.append(mark, copy);
    if (hasUrl) {
      const external = document.createElement("span");
      external.className = "miwa-common-entry__external";
      external.textContent = "↗";
      external.setAttribute("aria-hidden", "true");
      element.append(external);
    }
    return element;
  }

  function renderCommonEntries() {
    const commonEntries = config.commonEntries || {};
    [
      ["desktop-store-entries", "stores"],
      ["desktop-logistics-entries", "logistics"],
      ["desktop-office-entries", "office"],
      ["desktop-shopping-entries", "shopping"],
      ["desktop-mail-entries", "mail"],
      ["mobile-store-entries", "stores"],
      ["mobile-tool-entries", "tools"]
    ].forEach(([hostId, groupId]) => {
      const host = document.getElementById(hostId);
      if (!host) return;
      const entries = Array.isArray(commonEntries[groupId]?.items)
        ? commonEntries[groupId].items
        : [];
      host.replaceChildren(...entries.map(createCommonEntry));
    });
  }

  function getSpiritContent(spiritId) {
    const content = config.spiritContent || {};
    return content[spiritId] || content["miwa-spirit"] || {
      kicker: "美和精神",
      title: "美和精神",
      description: "",
      practice: ""
    };
  }

  function openHeaderInfo(spiritId) {
    const content = getSpiritContent(spiritId);
    const drawer = document.getElementById("miwaHeaderInfoDrawer");
    const overlay = document.getElementById("miwaHeaderInfoOverlay");

    setText("miwaHeaderInfoKicker", content.kicker);
    setText("miwaHeaderInfoTitle", content.title);
    setText("miwaHeaderInfoDescription", content.description);
    setText("miwaHeaderInfoPractice", content.practice);

    if (!drawer || !overlay) return;

    previousFocus = document.activeElement;
    drawer.dataset.spiritId = spiritId;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.hidden = false;
    drawer.querySelector('[data-action="header-info-close"]')?.focus();

    dispatchWindowEvent("miwa:header:spirit-open", { spiritId, content });
  }

  function closeHeaderInfo() {
    const drawer = document.getElementById("miwaHeaderInfoDrawer");
    const overlay = document.getElementById("miwaHeaderInfoOverlay");

    if (drawer) {
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
    }

    if (overlay) overlay.hidden = true;

    if (previousFocus instanceof HTMLElement) previousFocus.focus();
    previousFocus = null;
  }

  function restartTimers() {
    if (dailyTimer) clearInterval(dailyTimer);
    if (weatherTimer) clearInterval(weatherTimer);

    dailyTimer = setInterval(renderDaily, 30000);

    const refreshMinutes = Math.max(5, Number(config.weather?.refreshMinutes || 15));
    weatherTimer = setInterval(loadWeather, refreshMinutes * 60 * 1000);
  }

  function render() {
    renderBrand();
    renderUser();
    renderCommonEntries();
    renderSemanticIcons(document);
    updateCount("desktop-work-count", config.workCount);
    updateCount("mobile-work-count", config.workCount);
    updateCount("desktop-notification-count", config.notificationCount);
    updateCount("mobile-notification-count", config.notificationCount);
    renderDaily();
    renderSchedule();
    renderNotice();
    if (config.weather?.enabled) loadWeather();
    applyPermissions();
    updateActiveRoute();
  }

  function configure(nextConfig = {}) {
    config = mergeConfig(config, nextConfig);
    render();
    dispatchWindowEvent("miwa:header:configured", { config });
  }

  function bindEmployeeEntry() {
    const openProfile = () => {
      const user = config.user || {};
      const safeSummary = {
        employeeId: user.employeeId || null,
        displayName: user.displayName || user.name || null,
        primaryWorkIdentity:
          user.primaryWorkIdentity || user.workIdentity || user.role || null,
        positionGrade: user.positionGrade || user.grade || null,
        primaryResponsibility: user.primaryResponsibility || null,
        primaryProject: user.primaryProject || null,
        legalEntity: user.legalEntity || user.businessUnit || null,
        email: user.email || null
      };

      const shouldContinue = dispatchWindowEvent(
        "aione:employee-entry-open",
        { user: safeSummary },
        true
      );

      if (shouldContinue) {
        window.location.hash = `#/${user.profileRoute || "employee-profile"}`;
      }
    };

    const bindings = [
      { scope: "desktop", entryId: "desktop-employee-entry", menuId: "desktop-user-menu", profileId: "desktop-user-profile", logoutId: "desktop-user-logout" },
      { scope: "mobile", entryId: "mobile-employee-entry", menuId: "mobile-user-menu", profileId: "mobile-user-profile", logoutId: "mobile-user-logout" }
    ];

    const closeAllMenus = () => {
      bindings.forEach(({ entryId, menuId }) => {
        const entry = document.getElementById(entryId);
        const menu = document.getElementById(menuId);
        if (menu) menu.hidden = true;
        if (entry) entry.setAttribute("aria-expanded", "false");
      });
    };

    bindings.forEach(({ scope, entryId, menuId, profileId, logoutId }) => {
      const employeeEntry = document.getElementById(entryId);
      const userMenu = document.getElementById(menuId);
      if (!employeeEntry) return;

      employeeEntry.addEventListener("click", (event) => {
        event.stopPropagation();
        if (!userMenu) {
          openProfile();
          return;
        }
        const willOpen = userMenu.hidden;
        closeAllMenus();
        userMenu.hidden = !willOpen;
        employeeEntry.setAttribute("aria-expanded", String(willOpen));
      });

      document.getElementById(profileId)?.addEventListener("click", () => {
        closeAllMenus();
        openProfile();
      });

      document.getElementById(logoutId)?.addEventListener("click", () => {
        closeAllMenus();
        dispatchWindowEvent("aione:preview-logout-request", { source: `${scope}-header-user-menu` });
      });
    });

    document.addEventListener("click", (event) => {
      const clickedInside = bindings.some(({ entryId, menuId }) => {
        const entry = document.getElementById(entryId);
        const menu = document.getElementById(menuId);
        return entry?.contains(event.target) || menu?.contains(event.target);
      });
      if (!clickedInside) closeAllMenus();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAllMenus();
    });
  }

  function bindGlobalSearch() {
    ["desktop-search-input", "mobile-search-input"].forEach((inputId) => {
      const input = document.getElementById(inputId);
      if (!input) return;

      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        const query = input.value.trim();
        if (!query) return;

        dispatchWindowEvent("aione:global-search", { query });
        dispatchWindowEvent("miwa:header:search", { query });
        if (config.searchRoute) {
          window.location.hash = `#/${config.searchRoute}?q=${encodeURIComponent(query)}`;
        }
      });
    });

    const mobileButton = document.getElementById("mobile-search-button");
    const mobilePanel = document.getElementById("mobile-search-panel");
    mobileButton?.addEventListener("click", () => {
      if (!mobilePanel) return;
      mobilePanel.hidden = !mobilePanel.hidden;
      if (!mobilePanel.hidden) document.getElementById("mobile-search-input")?.focus();
    });
  }

  function bindSpiritEvents() {
    document.querySelectorAll("[data-spirit]").forEach((button) => {
      button.addEventListener("click", () => openHeaderInfo(button.dataset.spirit));
    });
  }

  function bindHeaderActions() {
    document.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;

        if (action === "header-info-close") {
          closeHeaderInfo();
          return;
        }

        if (action === "system-switcher") {
          dispatchWindowEvent("miwa:header:system-switcher", { source: "header" });
          dispatchWindowEvent("aione:system-switcher-open", { source: "header" });
          return;
        }

        if (action === "important-schedule") {
          const scheduleId = document.getElementById("miwaDynamicSchedule")?.dataset.scheduleId || "";
          dispatchWindowEvent("miwa:header:important-schedule", { scheduleId });
          window.location.hash = "#/calendar?filter=important";
          return;
        }

        if (action === "notice-detail") {
          const noticeId =
            document.getElementById("miwaDynamicNotice")?.dataset.noticeId ||
            document.getElementById("mobileDynamicNotice")?.dataset.noticeId ||
            "";
          dispatchWindowEvent("miwa:header:notice-detail", { noticeId });
          window.location.hash = noticeId ? `#/notification-detail?id=${encodeURIComponent(String(noticeId))}` : "#/notifications";
          return;
        }

        if (action === "open-full-reference") {
          const spiritId = document.getElementById("miwaHeaderInfoDrawer")?.dataset.spiritId || "";
          dispatchWindowEvent("miwa:header:open-full-reference", { spiritId });
          if (config.spiritReferenceRoute) {
            window.location.hash = `#/${config.spiritReferenceRoute}`;
          }
        }
      });
    });

    document.getElementById("miwaHeaderInfoOverlay")?.addEventListener("click", closeHeaderInfo);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeHeaderInfo();
    });
  }

  function bindCommonEntries() {
    document.querySelectorAll("[data-common-entry-group]").forEach((group) => {
      group.addEventListener("click", (event) => {
        const entry = event.target.closest("[data-common-entry]");
        if (!entry || entry.tagName === "A") return;
        const groupId = group.dataset.commonEntryGroup;
        const entryId = entry.dataset.commonEntry;
        dispatchWindowEvent("aione:common-entry-request", { groupId, entryId, status: "link-pending" });
      });
    });
  }

  /* バックエンド接続後もDOMを作り直さず、設定差分だけで更新できる。 */
  function bindRuntimeUpdates() {
    window.addEventListener("aione:header-update", (event) => {
      configure(event.detail || {});
    });
  }

  bindEmployeeEntry();
  bindGlobalSearch();
  bindSpiritEvents();
  bindHeaderActions();
  bindCommonEntries();
  bindRuntimeUpdates();
  configure(config);
  restartTimers();

  window.addEventListener("hashchange", updateActiveRoute);

  window.MIWAHeader = {
    configure,
    setNotification(notification) {
      configure({ enterprise: { notice: notification || null } });
    },
    clearNotification() {
      configure({ enterprise: { notice: null } });
    },
    setImportantSchedule(schedule) {
      configure({ enterprise: { importantSchedule: schedule || null } });
    },
    clearImportantSchedule() {
      configure({ enterprise: { importantSchedule: null } });
    },
    openSpiritInfo: openHeaderInfo,
    closeSpiritInfo: closeHeaderInfo,
    setUser(user) {
      configure({ user });
    },
    setBrand(brand) {
      configure({ brand });
    },
    setNotificationCount(count) {
      configure({ notificationCount: normalizeCount(count) });
    },
    refreshWeather: loadWeather,
    getConfig() {
      return mergeConfig({}, config);
    }
  };
}
