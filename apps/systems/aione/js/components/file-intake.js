// Shared native-file, drag/drop and clipboard intake. Persistence stays with the caller.
export const fileBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(Error("读取文件失败"));
    r.readAsDataURL(file);
  });
export function bindFileIntake({ zone, input, onFiles, signal }) {
  const on = (el, event, fn) => el?.addEventListener(event, fn, { signal });
  on(input, "change", () => {
    const files = [...input.files];
    input.value = "";
    if (files.length) onFiles(files);
  });
  on(zone, "dragover", (e) => e.preventDefault());
  on(zone, "drop", (e) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    if (files.length) onFiles(files);
  });
  on(zone, "paste", (e) => {
    const files = [...e.clipboardData.items]
      .filter((i) => i.kind === "file")
      .map((i) => i.getAsFile())
      .filter(Boolean);
    if (files.length) {
      e.preventDefault();
      onFiles(files);
    }
  });
}
