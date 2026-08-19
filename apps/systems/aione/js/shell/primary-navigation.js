/* ========================================
   MIWA Primary Navigation｜現在地とモバイル操作
======================================== */

function getCurrentRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return hash.split(/[/?]/)[0] || "work";
}

export function initPrimaryNavigation() {
  const updateActiveRoute = () => {
    const route = getCurrentRoute();

    document.querySelectorAll("[data-nav-route]").forEach((item) => {
      const isActive = item.dataset.navRoute === route;
      item.classList.toggle("active", isActive);
      if (isActive) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });

    document.querySelectorAll("[data-mobile-route]").forEach((item) => {
      item.classList.toggle("active", item.dataset.mobileRoute === route);
    });
  };

  const drawer = document.getElementById("mobile-drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  const closeButton = drawer?.querySelector(".drawer-close");
  const closeDrawer = () => {
    drawer?.classList.remove("open");
    backdrop?.classList.remove("open");
  };

  closeButton?.addEventListener("click", closeDrawer);
  backdrop?.addEventListener("click", closeDrawer);

  updateActiveRoute();
  window.addEventListener("hashchange", updateActiveRoute);
}
