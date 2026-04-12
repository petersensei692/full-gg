/** Named browser window for favorite analyses (minimize / maximize / close). */
export const FAVORITES_WINDOW_NAME = "gg-favorites-analysis";

export const FAVORITES_CLOSING_MSG = "gg-favorites-closed";

const POPUP_FEATURES =
  "popup=yes,width=1240,height=820,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes";

let favoritesPopupRef: Window | null = null;
const openListeners = new Set<() => void>();

function notifyOpenListeners() {
  openListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

export function isFavoritesWindowOpen(): boolean {
  return !!(favoritesPopupRef && !favoritesPopupRef.closed);
}

export function subscribeFavoritesWindowOpen(cb: () => void): () => void {
  openListeners.add(cb);
  return () => openListeners.delete(cb);
}

/** Call from the main app so closing the popup (separate JS realm) clears the opener ref. */
export function attachFavoritesPopupCloserListener(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onMessage = (ev: MessageEvent) => {
    const d = ev.data as { type?: string } | undefined;
    if (d?.type !== FAVORITES_CLOSING_MSG) return;
    favoritesPopupRef = null;
    notifyOpenListeners();
  };
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}

/**
 * Opens or focuses the favorites window and navigates to the given path (absolute within the app, e.g. /fundamental-analysis/favorites/global).
 */
export function openFavoritesWindow(pathWithQuery: string): void {
  if (typeof window === "undefined") return;
  const url = `${window.location.origin}${pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`}`;

  if (favoritesPopupRef && !favoritesPopupRef.closed) {
    try {
      favoritesPopupRef.focus();
      favoritesPopupRef.location.href = url;
    } catch {
      favoritesPopupRef = window.open(url, FAVORITES_WINDOW_NAME, POPUP_FEATURES);
    }
  } else {
    favoritesPopupRef = window.open(url, FAVORITES_WINDOW_NAME, POPUP_FEATURES);
  }
  notifyOpenListeners();
}

/** Call from the favorites window on unload (popup cannot touch opener’s module state). */
export function notifyFavoritesWindowClosing(): void {
  try {
    window.opener?.postMessage({ type: FAVORITES_CLOSING_MSG }, "*");
  } catch {
    /* ignore */
  }
}
