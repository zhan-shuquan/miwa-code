/* ========================================
   MIWA System Header｜美和システム全局Header
   表示・権限補助・433説明・今日日常・標準イベントをこのモジュールで管理する。
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
    setText("miwaSystemFormalName", brand.systemFormalName || "一体化工作平台");

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
    const avatar = document.getElementById("desktop-user-avatar");
    const employeeEntry = document.getElementById("desktop-employee-entry");

    const displayName = user.displayName || user.name || "当前用户";
    const workIdentity =
      user.primaryWorkIdentity || user.workIdentity || user.role || "当前工作身份";
    const grade = user.positionGrade || user.grade || "";
    const initial = user.initial || user.avatarText || displayName.trim().charAt(0) || "M";

    setText("desktop-user-name", displayName);
    setText("desktop-user-work-identity", workIdentity);
    setText("desktop-position-grade", grade);
    setText("desktop-user-menu-name", displayName);
    setText("desktop-user-menu-role", workIdentity);
    setText("miwaDailyLocation", user.locationName || "东京");

    const gradeElement = document.getElementById("desktop-position-grade");
    if (gradeElement) gradeElement.hidden = !grade;

    if (avatar) {
      avatar.textContent = user.avatarUrl ? "" : initial;
      avatar.style.backgroundImage = user.avatarUrl ? `url("${user.avatarUrl}")` : "";
      avatar.classList.toggle("has-image", Boolean(user.avatarUrl));
    }

    if (employeeEntry) {
      const gradeText = grade ? `，职位等级${grade}` : "";
      employeeEntry.setAttribute(
        "aria-label",
        `${displayName}，${workIdentity}${gradeText}，打开员工个人工作身份入口`
      );
    }
  }

  /* 入口表示制御だけを担当し、正式権限検証はバックエンドで実施する。 */
  function applyPermissions() {
    const permissions = Array.isArray(config.permissions)
      ? new Set(config.permissions)
      : null;

    header.querySelectorAll("[data-permission]").forEach((item) => {
      item.hidden = permissions ? !permissions.has(item.dataset.permission) : false;
    });
  }

  function updateActiveRoute() {
    const currentRoute = getCurrentRoute();

    header.querySelectorAll("[data-header-route]").forEach((item) => {
      const isActive = item.dataset.headerRoute === currentRoute;
      item.classList.toggle("is-active", isActive);

      if (isActive) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
  }

  function updateMobileEnterpriseMessage() {
    const enterprise = config.enterprise || {};
    const mobileTag = document.getElementById("mobile-company-tag");
    const mobileText = document.getElementById("mobile-company-text");

    const dateText = new Intl.DateTimeFormat("zh-CN", {
      timeZone: enterprise.timeZone || config.user?.timeZone || "Asia/Tokyo",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short"
    }).format(new Date());

    if (mobileTag) {
      if (enterprise.tag) mobileTag.textContent = enterprise.tag;
      if (enterprise.type) mobileTag.className = `mobile-company-tag ${enterprise.type}`;
    }

    if (mobileText) {
      mobileText.textContent = enterprise.text || `${dateText}｜天气待接入`;
    }
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
  }

  async function loadWeather() {
    const weatherElement = document.getElementById("miwaWeather");
    if (!weatherElement) return;

    const weather = config.weather || {};
    const user = config.user || {};

    if (!weather.enabled) {
      weatherElement.textContent = "天气未启用";
      return;
    }

    try {
      if (typeof weather.provider === "function") {
        const result = await weather.provider(user);
        weatherElement.textContent = result?.displayText || "天气暂不可用";
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

      weatherElement.textContent = `${icon} ${label} ${temperature}°C · 体感${apparent}°C`;
    } catch {
      weatherElement.textContent = "天气暂不可用";
    }
  }

  function renderNotice() {
    const notice = config.enterprise?.notice || null;
    const root = document.getElementById("miwaDynamicNotice");
    const type = document.getElementById("miwaNoticeType");
    const text = document.getElementById("miwaNoticeText");

    if (!root || !type || !text) return;

    const action = document.getElementById("miwaNoticeAction");

    if (!notice) {
      const showEmptyState = config.enterprise?.showNoticeSlotWhenEmpty === true;
      root.hidden = !showEmptyState;
      root.classList.remove("is-urgent");
      root.dataset.noticeId = "";
      type.textContent = config.enterprise?.emptyNoticeLabel || "重要通知";
      text.textContent = config.enterprise?.emptyNoticeText || "暂无重要通知";
      if (action) action.hidden = true;
      return;
    }

    type.textContent = notice.label || "重要通知";
    text.textContent = notice.text || "";
    root.hidden = false;
    root.classList.toggle("is-urgent", notice.level === "urgent");
    root.dataset.noticeId = notice.id || "";
    if (action) {
      action.hidden = false;
      action.textContent = notice.actionLabel || "查看 ›";
    }
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
    updateCount("desktop-work-count", config.workCount);
    updateCount("desktop-notification-count", config.notificationCount);
    updateCount("mobile-notification-count", config.notificationCount);
    applyPermissions();
    updateMobileEnterpriseMessage();
    renderDaily();
    renderNotice();
    updateActiveRoute();
  }

  function configure(nextConfig = {}) {
    config = mergeConfig(config, nextConfig);
    render();
    loadWeather();
    restartTimers();
    dispatchWindowEvent("miwa:header:configured", { config });
  }

  function bindEmployeeEntry() {
    const employeeEntry = document.getElementById("desktop-employee-entry");
    const userMenu = document.getElementById("desktop-user-menu");
    const profileButton = document.getElementById("desktop-user-profile");
    const logoutButton = document.getElementById("desktop-user-logout");
    if (!employeeEntry) return;

    const closeUserMenu = () => {
      if (!userMenu) return;
      userMenu.hidden = true;
      employeeEntry.setAttribute("aria-expanded", "false");
    };

    const openProfile = () => {
      const user = config.user || {};
      const safeSummary = {
        employeeId: user.employeeId || null,
        displayName: user.displayName || user.name || null,
        primaryWorkIdentity:
          user.primaryWorkIdentity || user.workIdentity || user.role || null,
        positionGrade: user.positionGrade || user.grade || null
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

    employeeEntry.setAttribute("aria-expanded", "false");
    employeeEntry.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!userMenu) {
        openProfile();
        return;
      }
      const willOpen = userMenu.hidden;
      userMenu.hidden = !willOpen;
      employeeEntry.setAttribute("aria-expanded", String(willOpen));
    });

    profileButton?.addEventListener("click", () => {
      closeUserMenu();
      openProfile();
    });

    logoutButton?.addEventListener("click", () => {
      closeUserMenu();
      dispatchWindowEvent("aione:preview-logout-request", { source: "header-user-menu" });
    });

    document.addEventListener("click", (event) => {
      if (!userMenu || userMenu.hidden) return;
      if (employeeEntry.contains(event.target) || userMenu.contains(event.target)) return;
      closeUserMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeUserMenu();
    });
  }

  function bindGlobalSearch() {
    const input = document.getElementById("desktop-search-input");
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
  }

  function bindSpiritEvents() {
    componentHost.querySelectorAll("[data-spirit]").forEach((button) => {
      button.addEventListener("click", () => openHeaderInfo(button.dataset.spirit));
    });
  }

  function bindHeaderActions() {
    componentHost.querySelectorAll("[data-action]").forEach((button) => {
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

        if (action === "notice-detail") {
          const noticeId = document.getElementById("miwaDynamicNotice")?.dataset.noticeId || "";
          dispatchWindowEvent("miwa:header:notice-detail", { noticeId });
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
  bindRuntimeUpdates();
  configure(config);

  window.addEventListener("hashchange", updateActiveRoute);

  window.MIWAHeader = {
    configure,
    setNotification(notification) {
      configure({ enterprise: { notice: notification || null } });
    },
    clearNotification() {
      configure({ enterprise: { notice: null } });
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
