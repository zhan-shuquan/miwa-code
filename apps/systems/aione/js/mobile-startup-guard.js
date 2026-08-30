/* ========================================
   AIONE Mobile Startup Guard
   Prevent silent white screens on mobile preview environments.
   This layer does not replace AIONE auth or routing; it only exposes
   startup failures and retries the canonical module entry once.
======================================== */

(() => {
  if (window.__AIONE_MOBILE_STARTUP_GUARD__) return;
  window.__AIONE_MOBILE_STARTUP_GUARD__ = true;

  const isMobile = window.matchMedia?.("(max-width: 1099px)")?.matches ?? window.innerWidth < 1100;
  if (!isMobile) return;

  let failure = null;
  let retrying = false;
  let panel = null;

  const hasVisibleApp = () => Boolean(
    document.documentElement.dataset.miwaSystemReady === "true" ||
    document.getElementById("aione-preview-auth-host") ||
    document.getElementById("mobile-topbar-host")?.children.length ||
    document.getElementById("app-main-host")?.children.length
  );

  function ensurePanel() {
    if (panel?.isConnected) return panel;
    panel = document.createElement("section");
    panel.id = "aione-mobile-startup-guard";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");
    panel.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:4900",
      "display:grid",
      "place-items:center",
      "padding:24px",
      "background:#F8F9FA",
      "color:#202124",
      "font-family:Inter,'PingFang SC','Microsoft YaHei',Arial,sans-serif"
    ].join(";");
    panel.innerHTML = `
      <div style="width:min(420px,100%);padding:24px;border:1px solid #DADCE0;border-radius:16px;background:#fff;box-shadow:0 1px 2px rgba(32,33,36,.06);text-align:center">
        <div style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#176B4D">AIONE</div>
        <h1 style="margin:12px 0 6px;font-size:20px;line-height:1.35">正在启动美和AIONE</h1>
        <p data-aione-boot-message style="margin:0;color:#5F6368;font-size:13px;line-height:1.7">正在检查移动端界面和内测身份…</p>
        <button data-aione-boot-retry type="button" hidden style="margin-top:16px;min-height:42px;padding:0 18px;border:1px solid #176B4D;border-radius:8px;background:#176B4D;color:#fff;font-weight:700">重新加载</button>
      </div>`;
    panel.querySelector("[data-aione-boot-retry]")?.addEventListener("click", () => window.location.reload());
    document.body.appendChild(panel);
    return panel;
  }

  function show(message, { error = false, retry = false } = {}) {
    const node = ensurePanel();
    const messageNode = node.querySelector("[data-aione-boot-message]");
    const retryButton = node.querySelector("[data-aione-boot-retry]");
    if (messageNode) {
      messageNode.textContent = message;
      messageNode.style.color = error ? "#C83A32" : "#5F6368";
    }
    if (retryButton) retryButton.hidden = !retry;
  }

  function dismissIfReady() {
    if (!hasVisibleApp()) return false;
    panel?.remove();
    panel = null;
    return true;
  }

  window.addEventListener("error", (event) => {
    const target = event.target;
    if (target && target !== window && (target.src || target.href)) {
      failure = `资源加载失败：${target.src || target.href}`;
    } else if (event.message) {
      failure = event.message;
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    failure = reason?.message || String(reason || "未知异步错误");
  });

  // Give the canonical entry a short chance to render auth or shell.
  window.setTimeout(async () => {
    if (dismissIfReady()) return;
    show("移动端启动时间较长，正在重新连接 AIONE 主入口…");

    if (retrying) return;
    retrying = true;
    try {
      await import("./miwa-system.js?v=20260830-mobile-startup-guard-v1");
    } catch (error) {
      failure = error?.message || String(error);
      show(`AIONE 启动模块未能完成：${failure}`, { error: true, retry: true });
      return;
    } finally {
      retrying = false;
    }

    window.setTimeout(() => {
      if (dismissIfReady()) return;
      const detail = failure ? `：${failure}` : "";
      show(`AIONE 移动端启动未完成${detail}`, { error: Boolean(failure), retry: true });
    }, 2500);
  }, 1800);

  // Never leave a silent white screen indefinitely.
  window.setTimeout(() => {
    if (dismissIfReady()) return;
    const detail = failure ? `：${failure}` : "。请点击重新加载后再试一次";
    show(`AIONE 移动端仍未完成启动${detail}`, { error: Boolean(failure), retry: true });
  }, 8000);
})();
