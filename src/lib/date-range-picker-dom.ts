/** Hit-testing for UI portaled to `document.body` (outside React parent trees). */

function eventTouchesMarkedPortal(
  e: MouseEvent | PointerEvent,
  selector: string,
): boolean {
  const candidates = new Set<Node>();

  const add = (n: Node | null | undefined) => {
    if (n && !candidates.has(n)) candidates.add(n);
  };

  if (e.target != null) add(e.target as Node);
  if (typeof e.composedPath === "function") {
    for (const n of e.composedPath()) {
      if (n instanceof Node) add(n);
    }
  }

  for (const node of candidates) {
    const start =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : node.parentElement;
    if (start?.closest(selector)) return true;
  }
  return false;
}

export function eventTouchesDateRangePickerPanel(e: MouseEvent | PointerEvent): boolean {
  return eventTouchesMarkedPortal(e, "[data-date-range-picker-panel]");
}

export function eventTouchesAnalysisScopeFilterPanel(e: MouseEvent | PointerEvent): boolean {
  return eventTouchesMarkedPortal(e, "[data-analysis-scope-filter-panel]");
}
