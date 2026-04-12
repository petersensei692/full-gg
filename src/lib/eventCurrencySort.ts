import type { Event } from "@/types/api";

/** G10-style majors first; remaining currencies follow alphabetically by code. */
const MAJOR_ORDER = ["USD", "EUR", "GBP", "JPY", "CAD", "CHF", "AUD", "NZD"];

/** Derive a 3-letter currency code from an asset display name (e.g. "EUR/USD" → EUR). */
export function primaryCurrencyCode(assetName: string): string {
  const n = assetName.trim().toUpperCase();
  if (!n) return "";
  if (MAJOR_ORDER.includes(n)) return n;
  const slash = n.split("/")[0]?.trim();
  if (slash && slash.length >= 3) return slash.slice(0, 3);
  if (n.length >= 3) return n.slice(0, 3);
  return n;
}

export function compareEventsByCurrency(a: Event, b: Event): number {
  const na = a.asset?.name ?? "";
  const nb = b.asset?.name ?? "";
  const ca = primaryCurrencyCode(na);
  const cb = primaryCurrencyCode(nb);
  const ia = MAJOR_ORDER.indexOf(ca);
  const ib = MAJOR_ORDER.indexOf(cb);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return ca.localeCompare(cb) || na.localeCompare(nb);
}

export function sortEventsByCurrencyOrder(events: Event[]): Event[] {
  return [...events].sort(compareEventsByCurrency);
}
