/**
 * Strip pasted/source color & background styles from rich HTML so content
 * follows the app theme instead of Word/Notion/ChatGPT clipboard styles.
 */

const COLORISH_STYLE =
  /^(color|background|background-color|background-image|background-position|background-repeat|background-size|caret-color|text-shadow|box-shadow|-webkit-text-fill-color|-webkit-text-stroke|-webkit-text-stroke-color|-webkit-text-stroke-width)$/i;

function stripColorishInlineStyle(el: Element): void {
  if (!(el instanceof HTMLElement)) return;

  el.removeAttribute("bgcolor");
  el.removeAttribute("color");

  if (!el.hasAttribute("style")) return;

  const style = el.style;
  const toRemove: string[] = [];
  for (let i = 0; i < style.length; i++) {
    const prop = style.item(i);
    if (prop && COLORISH_STYLE.test(prop)) toRemove.push(prop);
  }
  for (const prop of toRemove) {
    style.removeProperty(prop);
  }

  const remaining = el.getAttribute("style")?.trim();
  if (!remaining) el.removeAttribute("style");
}

function walk(node: Node): void {
  if (node.nodeType === Node.ELEMENT_NODE) {
    stripColorishInlineStyle(node as Element);
  }
  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) {
    walk(children[i]!);
  }
}

/** Remove color/background from HTML; keeps bold/italic/headings/images/etc. */
export function sanitizeRichHtml(html: string): string {
  if (!html?.trim()) return html ?? "";
  if (typeof document === "undefined") {
    // SSR / non-DOM: strip common color attrs and style declarations coarsely
    return html
      .replace(/\s(?:bgcolor|color)\s*=\s*(["']).*?\1/gi, "")
      .replace(
        /style\s*=\s*(["'])([\s\S]*?)\1/gi,
        (_m, quote: string, body: string) => {
          const cleaned = body
            .split(";")
            .map((p) => p.trim())
            .filter((p) => {
              if (!p) return false;
              const name = p.split(":")[0]?.trim() ?? "";
              return !COLORISH_STYLE.test(name);
            })
            .join("; ");
          return cleaned ? `style=${quote}${cleaned}${quote}` : "";
        },
      );
  }

  const template = document.createElement("template");
  template.innerHTML = html;
  walk(template.content);
  return template.innerHTML;
}

/** Read contenteditable HTML and sanitize color/background paste junk. */
export function readEditorHtml(el: HTMLElement | null | undefined): string {
  return sanitizeRichHtml(el?.innerHTML ?? "");
}
