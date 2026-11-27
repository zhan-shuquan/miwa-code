export function selectionWorkspaceEnabled() {
  return (
    window.AIONE_SELECTION_PREVIEW === true ||
    window.AIONE_SELECTION_WORKSPACE_ENABLED === true
  );
}
export function configureSelectionNavigation() {
  if (!selectionWorkspaceEnabled()) return;
  const allowed = new Set([
    "work",
    "calendar",
    "talent-home",
    "ai-home",
    "ai-office",
    "product-home",
    "notifications",
    "settings",
    "company",
  ]);
  document.querySelectorAll("[data-header-route]").forEach((el) => {
    if (!allowed.has(el.dataset.headerRoute)) el.hidden = true;
  });
  document
    .querySelectorAll('[data-header-route="work"]')
    .forEach((el) => (el.href = "#/work"));
}
