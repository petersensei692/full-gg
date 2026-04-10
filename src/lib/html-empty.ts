/** True when pasted/typed HTML has no visible text and no embedded images. */
export function isHtmlEffectivelyEmpty(html: string): boolean {
  const raw = html?.trim() ?? "";
  if (!raw) return true;
  try {
    const doc = new DOMParser().parseFromString(`<div>${raw}</div>`, "text/html");
    const root = doc.body.firstElementChild;
    if (!root) return true;
    if (root.querySelector("img")) return false;
    return (root.textContent ?? "").trim() === "";
  } catch {
    return raw.replace(/<[^>]*>/g, "").trim() === "";
  }
}
