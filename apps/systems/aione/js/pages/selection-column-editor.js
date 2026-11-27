export function openColumnEditor(host, names, columns, onSave, onError) {
  const dialog = document.createElement("dialog");
  dialog.className = "sw";
  let order = [
      ...columns,
      ...Object.keys(names).filter((k) => !columns.includes(k)),
    ],
    visible = new Set(columns);
  function render() {
    dialog.replaceChildren();
    const title = document.createElement("h2");
    title.textContent = "列表显示设置";
    dialog.append(title);
    for (const [i, key] of order.entries()) {
      const row = document.createElement("div");
      row.className = "sw-toolbar";
      const label = document.createElement("label"),
        check = document.createElement("input");
      check.type = "checkbox";
      check.checked = visible.has(key);
      check.onchange = () =>
        check.checked ? visible.add(key) : visible.delete(key);
      label.append(check, document.createTextNode(names[key]));
      row.append(label);
      for (const [text, delta] of [
        ["上移", -1],
        ["下移", 1],
      ]) {
        const button = document.createElement("button");
        button.textContent = text;
        button.disabled = i + delta < 0 || i + delta >= order.length;
        button.onclick = () => {
          [order[i], order[i + delta]] = [order[i + delta], order[i]];
          render();
        };
        row.append(button);
      }
      dialog.append(row);
    }
    const save = document.createElement("button");
    save.textContent = "保存";
    save.onclick = async () => {
      try {
        const result = order.filter((k) => visible.has(k));
        if (!result.length) throw Error("请至少显示一个字段");
        await onSave(result);
        dialog.remove();
      } catch (e) {
        onError(e);
      }
    };
    const reset = document.createElement("button");
    reset.textContent = "恢复默认";
    reset.onclick = () => {
      order = Object.keys(names);
      visible = new Set(order);
      render();
    };
    const close = document.createElement("button");
    close.textContent = "取消";
    close.onclick = () => dialog.remove();
    dialog.append(save, reset, close);
  }
  render();
  host.append(dialog);
  dialog.showModal();
}
