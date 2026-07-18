/**
 * Persist in-progress form text to localStorage so drafts survive navigation and reloads.
 * Keys are namespaced — pass stable logical ids (e.g. `asset-analysis-new:${assetId}`).
 */

const PREFIX = "gg-form-draft:";

export function loadDraftJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveDraftJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota or private mode */
  }
}

export function clearDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}
