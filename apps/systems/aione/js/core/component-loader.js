/* ========================================
   Component Loader｜コンポーネント読込
======================================== */

async function loadComponent(hostId, filePath) {
  const host = document.getElementById(hostId);
  if (!host) {
    throw new Error(`コンポーネント配置先が見つかりません: ${hostId}`);
  }

  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`コンポーネント読込失敗: ${filePath}`);
  }

  host.innerHTML = await response.text();
}

export async function loadComponents(componentEntries) {
  await Promise.all(
    componentEntries.map(([hostId, filePath]) => loadComponent(hostId, filePath))
  );
}
