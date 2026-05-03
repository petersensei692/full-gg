/** Extract plain text from a paste/drag data transfer (Notepad-style: no rich HTML). */
export function getPlainTextFromDataTransfer(data: DataTransfer | null): string {
  if (!data) return "";
  const plain = data.getData("text/plain");
  if (plain !== "") return plain;
  const html = data.getData("text/html");
  if (!html) return "";
  if (typeof window === "undefined") return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent ?? div.innerText ?? "";
}
