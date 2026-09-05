/* ========================================
   AIONE Global Shell Finalization
   Header = work context + daily awareness
   Footer = spirit + ecosystem + platform identity
======================================== */

function createAppLauncherDots() {
  const root = document.createElement("span");
  root.className = "miwa-app-launcher__dots";
  root.setAttribute("aria-hidden", "true");
  for (let index = 0; index < 9; index += 1) root.append(document.createElement("i"));
  return root;
}

function syncLauncherEntries() {
  const source = document.getElementById("desktop-quick-resource-entries");
  const grid = document.getElementById("miwaAppLauncherGrid");
  if (!source || !grid) return;
  grid.replaceChildren(...Array.from(source.children));
}

function compactBrand() {
  const desktopHeader = document.querySelector(".desktop-header");
  if (!desktopHeader) return;
  const formalName = desktopHeader.querySelector("#miwaSystemFormalName");
  if (formalName) formalName.textContent = "美和一体化工作平台";
}

function simplifyBusinessContext() {
  const context = document.querySelector(".desktop-header .miwa-business-context");
  if (!context) return;
  context.querySelector(".miwa-business-context__divider")?.remove();
  context.querySelector("#desktop-business-entry")?.remove();
  context.querySelector("#desktop-business-menu")?.remove();
  context.classList.add("is-home-only");
}

function installInlineMiwaAI() {
  document.getElementById("miwaFloatingAI")?.remove();
  const entry = document.querySelector(".desktop-header #desktop-miwa-ai-entry");
  const aiHome = document.querySelector('.desktop-header [data-header-route="ai-home"]');
  if (!entry || !aiHome) return;
  entry.classList.remove("miwa-ai-source-entry");
  entry.classList.add("miwa-nav-item", "miwa-nav-item--ai-action");
  entry.removeAttribute("aria-hidden");
  entry.hidden = false;
  if (aiHome.nextElementSibling !== entry) aiHome.after(entry);
}

function installAppLauncher() {
  const tools = document.querySelector(".desktop-header .miwa-global-tools");
  if (!tools || document.getElementById("miwaAppLauncher")) return;

  const launcher = document.createElement("div");
  launcher.className = "miwa-app-launcher";
  launcher.id = "miwaAppLauncher";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "miwa-app-launcher__button";
  button.id = "miwaAppLauncherButton";
  button.setAttribute("aria-label", "快捷入口");
  button.setAttribute("title", "快捷入口");
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-expanded", "false");
  button.append(createAppLauncherDots());

  const panel = document.createElement("section");
  panel.className = "miwa-app-launcher__panel";
  panel.id = "miwaAppLauncherPanel";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="miwa-app-launcher__head">
      <strong>快捷入口</strong>
      <a href="#/shared-home">全部资源</a>
    </div>
    <div class="miwa-app-launcher__grid" id="miwaAppLauncherGrid" data-common-entry-group="shared-home"></div>
  `;

  launcher.append(button, panel);
  const notification = tools.querySelector(".miwa-tool-notification");
  tools.insertBefore(launcher, notification || null);

  const close = () => {
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
  };

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const opening = panel.hidden;
    panel.hidden = !opening;
    button.setAttribute("aria-expanded", String(opening));
    if (opening) syncLauncherEntries();
  });

  panel.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  window.addEventListener("miwa:header:configured", syncLauncherEntries);
  syncLauncherEntries();
}

function getSolarTermLabel(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const approximateTerms = [
    [1,5,"小寒"],[1,20,"大寒"],[2,4,"立春"],[2,19,"雨水"],[3,5,"惊蛰"],[3,20,"春分"],
    [4,5,"清明"],[4,20,"谷雨"],[5,5,"立夏"],[5,21,"小满"],[6,6,"芒种"],[6,21,"夏至"],
    [7,7,"小暑"],[7,23,"大暑"],[8,7,"立秋"],[8,23,"处暑"],[9,7,"白露"],[9,23,"秋分"],
    [10,8,"寒露"],[10,23,"霜降"],[11,7,"立冬"],[11,22,"小雪"],[12,7,"大雪"],[12,22,"冬至"]
  ];
  const current = Number(`${year}${String(month).padStart(2,"0")}${String(day).padStart(2,"0")}`);
  let selected = approximateTerms[approximateTerms.length - 1][2];
  for (const [termMonth, termDay, label] of approximateTerms) {
    const value = Number(`${year}${String(termMonth).padStart(2,"0")}${String(termDay).padStart(2,"0")}`);
    if (current >= value) selected = label;
    else break;
  }
  return selected;
}

function getChineseZodiacLabel(year) {
  const animals = ["猴","鸡","狗","猪","鼠","牛","虎","兔","龙","蛇","马","羊"];
  return `${animals[((Number(year) % 12) + 12) % 12]}年`;
}

function getStarSignLabel(month, day) {
  const value = Number(month) * 100 + Number(day);
  if (value >= 120 && value <= 218) return "水瓶座";
  if (value >= 219 && value <= 320) return "双鱼座";
  if (value >= 321 && value <= 419) return "白羊座";
  if (value >= 420 && value <= 520) return "金牛座";
  if (value >= 521 && value <= 621) return "双子座";
  if (value >= 622 && value <= 722) return "巨蟹座";
  if (value >= 723 && value <= 822) return "狮子座";
  if (value >= 823 && value <= 922) return "处女座";
  if (value >= 923 && value <= 1023) return "天秤座";
  if (value >= 1024 && value <= 1122) return "天蝎座";
  if (value >= 1123 && value <= 1221) return "射手座";
  return "摩羯座";
}

function getZonedDateParts(timeZone = "Asia/Tokyo") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year:"numeric",
    month:"2-digit",
    day:"2-digit"
  }).formatToParts(new Date());
  const map = {};
  parts.forEach((part) => {
    if (part.type !== "literal") map[part.type] = part.value;
  });
  return map;
}

function weatherTextFromCode(code) {
  const map = {
    0:["☀","晴"], 1:["🌤","晴间多云"], 2:["⛅","多云"], 3:["☁","阴"],
    45:["🌫","有雾"], 48:["🌫","有雾"], 51:["🌦","小雨"], 53:["🌦","小雨"],
    55:["🌧","小雨"], 61:["🌦","小雨"], 63:["🌧","中雨"], 65:["🌧","大雨"],
    71:["🌨","小雪"], 73:["🌨","中雪"], 75:["❄","大雪"], 80:["🌦","阵雨"],
    81:["🌧","阵雨"], 82:["⛈","强阵雨"], 95:["⛈","雷雨"]
  };
  return map[Number(code)] || ["◌","天气"];
}

async function loadDailyWeather(config = {}) {
  const weather = document.getElementById("miwaWeather");
  if (!weather) return;

  const user = config.user || {};
  const latitude = Number.isFinite(Number(user.latitude)) ? Number(user.latitude) : 35.6762;
  const longitude = Number.isFinite(Number(user.longitude)) ? Number(user.longitude) : 139.6503;
  const timeZone = user.timeZone || "Asia/Tokyo";

  weather.textContent = "天气读取中";
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current=temperature_2m,weather_code&timezone=${encodeURIComponent(timeZone)}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("weather-request-failed");
    const data = await response.json();
    const current = data.current || {};
    const [icon, label] = weatherTextFromCode(current.weather_code);
    const temperature = Math.round(Number(current.temperature_2m));
    weather.textContent = Number.isFinite(temperature) ? `${icon} ${label} ${temperature}°C` : `${icon} ${label}`;
  } catch {
    weather.textContent = "天气暂不可用";
  }
}

function appendDailyItem(daily, id, className) {
  let item = document.getElementById(id);
  if (item) return item;
  const separator = document.createElement("span");
  separator.className = "miwa-daily-separator";
  separator.setAttribute("aria-hidden", "true");
  item = document.createElement("span");
  item.className = className;
  item.id = id;
  daily.append(separator, item);
  return item;
}

function enhanceDailyAwareness() {
  const daily = document.querySelector(".desktop-header .miwa-daily-fixed");
  const location = document.getElementById("miwaDailyLocation");
  if (!daily || !location) return;

  const config = window.MIWAHeader?.getConfig?.() || {};
  const user = config.user || {};
  const country = user.countryName || user.country || "日本";
  const city = user.cityName || user.locationName || "东京";
  const normalizedCountry = String(country).trim() || "日本";
  const normalizedCity = String(city).includes("东京") ? "东京" : String(city).trim() || "东京";
  location.textContent = `${normalizedCountry}・${normalizedCity}`;

  const timeZone = user.timeZone || "Asia/Tokyo";
  const dateParts = getZonedDateParts(timeZone);
  appendDailyItem(daily, "miwaChineseZodiac", "miwa-daily-zodiac").textContent = getChineseZodiacLabel(dateParts.year);
  appendDailyItem(daily, "miwaStarSign", "miwa-daily-star-sign").textContent = getStarSignLabel(dateParts.month, dateParts.day);
  appendDailyItem(daily, "miwaSolarTerm", "miwa-daily-term").textContent = getSolarTermLabel(new Date());
  appendDailyItem(daily, "miwaWeather", "miwa-weather miwa-daily-weather");
  loadDailyWeather(config);
}

function moveSpiritToFooter() {
  const spirit = document.querySelector(".desktop-header>.miwa-spirit-row");
  const footer = document.querySelector(".desktop-footer");
  if (!spirit || !footer) return;
  spirit.classList.add("footer-spirit-row");
  footer.prepend(spirit);
}

function installFinalFooter() {
  const footer = document.querySelector(".desktop-footer");
  if (!footer || footer.querySelector(".footer-platform-final")) return;

  const ecosystem = document.createElement("nav");
  ecosystem.className = "footer-ecosystem";
  ecosystem.setAttribute("aria-label", "美和生态入口");
  ecosystem.innerHTML = `
    <span>美和官网</span>
    <span>美和独立站</span>
    <a href="#/business-home">美和跨境</a>
    <span>美和批发</span>
    <span>美和采购代理</span>
    <span>美和物流</span>
    <span>美和不动产</span>
    <span>美和留学</span>
    <span>美和商务咨询</span>
    <span>美和品牌</span>
    <span class="active" aria-current="page">美和AIONE</span>
    <span>美和ERP</span>
    <span>美和方法论</span>
    <span>美和工作手册</span>
    <span>美和学习手册</span>
  `;

  const platform = document.createElement("section");
  platform.className = "footer-platform-final";
  platform.innerHTML = `
    <strong>美和AIONE一体化工作平台 © <span id="footer-final-year"></span> 美和商会株式会社</strong>
    <p>让工作一体化，让管理标准化，让业务流程化，让执行自动化。</p>
  `;

  footer.append(ecosystem, platform);
  const year = document.getElementById("footer-final-year");
  if (year) year.textContent = String(new Date().getFullYear());
}

function reorderDailySignals() {
  const row = document.querySelector(".desktop-header .miwa-daily-row__inner");
  const notice = document.getElementById("miwaDynamicNotice");
  const schedule = document.getElementById("miwaDynamicSchedule");
  if (!row || !notice || !schedule) return;

  notice.hidden = false;
  schedule.hidden = false;
  const noticeType = document.getElementById("miwaNoticeType");
  const noticeText = document.getElementById("miwaNoticeText");
  const scheduleText = document.getElementById("miwaScheduleText");
  if (noticeType && !noticeType.textContent.trim()) noticeType.textContent = "重要通知";
  if (noticeText && !noticeText.textContent.trim()) noticeText.textContent = "暂无重要通知";
  if (scheduleText && !scheduleText.textContent.trim()) scheduleText.textContent = "暂无重要日程";

  row.append(notice, schedule);
}

function refreshFinalShell() {
  compactBrand();
  simplifyBusinessContext();
  installInlineMiwaAI();
  enhanceDailyAwareness();
  reorderDailySignals();
  syncLauncherEntries();
}

export function initFinalShell() {
  compactBrand();
  simplifyBusinessContext();
  installInlineMiwaAI();
  installAppLauncher();
  enhanceDailyAwareness();
  reorderDailySignals();
  installFinalFooter();
  moveSpiritToFooter();
  window.addEventListener("miwa:header:configured", refreshFinalShell);
  window.addEventListener("aione:current-user-change", refreshFinalShell);
}

function autoInitFinalShell() {
  if (document.documentElement.dataset.miwaSystemReady === "true") {
    initFinalShell();
    return;
  }
  const observer = new MutationObserver(() => {
    if (document.documentElement.dataset.miwaSystemReady !== "true") return;
    observer.disconnect();
    initFinalShell();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-miwa-system-ready"] });
}

autoInitFinalShell();
