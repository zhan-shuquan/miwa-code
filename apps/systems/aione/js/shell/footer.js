/* ========================================
   MIWA Footer｜運用情報の初期化
======================================== */

export function initFooter(config = {}) {
  const year = document.getElementById("footer-current-year");
  const status = document.getElementById("footer-system-status");
  const environment = document.getElementById("footer-environment");
  const version = document.getElementById("footer-version");

  if (year) year.textContent = String(new Date().getFullYear());
  if (status && config.status) status.textContent = config.status;
  if (environment && config.environment) environment.textContent = config.environment;
  if (version && config.version) version.textContent = config.version;
}
