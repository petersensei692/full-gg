/** Strip HTML tags and return plain text. */
export function stripHtml(html: string): string {
  if (!html?.trim()) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? div.innerText ?? "").trim();
}

/** Get the first sentence of note HTML (plain text): up to first period, or first line, or first ~120 chars. */
export function getFirstSentence(html: string, maxLength = 120): string {
  const text = stripHtml(html);
  if (!text) return "";
  const periodIdx = text.indexOf(".");
  if (periodIdx !== -1 && periodIdx < maxLength) {
    return text.slice(0, periodIdx + 1).trim();
  }
  const firstLine = text.split(/\r?\n/)[0]?.trim() ?? text;
  if (firstLine.length <= maxLength) return firstLine;
  return firstLine.slice(0, maxLength).trim() + "...";
}
