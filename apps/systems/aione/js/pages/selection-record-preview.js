/* ========================================
   Selection Record｜選品入力
   選品タイプ・商品機会IDを引き継ぎ、既存データがある場合は編集値を初期表示する。
======================================== */

function sourcePlatformValue(source){
  if(source === '供应商') return '供应商直供';
  return source || '1688';
}

export function initSelectionRecordPreview({type, id, item, onBack}) {
  const root = document.querySelector('.selection-record-preview');
  if (!root) return;

  const selectedType = type || item?.type || '常规选品';
  root.querySelector('#selection-record-type').textContent = selectedType;
  root.querySelector('#selection-record-type-auto').textContent = selectedType;
  if (id) root.querySelector('#selection-record-id').textContent = id;

  const titleInput = root.querySelector('#selection-record-title');
  const sourcePlatform = root.querySelector('#selection-record-source-platform');
  const owner = root.querySelector('#selection-record-owner');
  if(titleInput && item?.name) titleInput.value = item.name;
  if(sourcePlatform && item?.source) sourcePlatform.value = sourcePlatformValue(item.source);
  if(owner && item?.owner) owner.value = item.owner;

  root.querySelectorAll('[data-selection-record-back]').forEach((button) => {
    button.addEventListener('click', () => onBack?.());
  });

  root.querySelector('[data-selection-record-save]')?.addEventListener('click', () => {
    const button = root.querySelector('[data-selection-record-save]');
    const original = button.textContent;
    button.textContent = '✓ 草稿已保存';
    button.disabled = true;
    window.setTimeout(() => {
      button.textContent = original;
      button.disabled = false;
    }, 1400);
  });
}
