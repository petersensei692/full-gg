"use client";

import { useCallback, useEffect, useState } from "react";

const PREFIX = "gg:analyticsDateRange:";

export type AnalyticsDateRangePageKey = "dashboard" | "performance" | "trades";

function load(key: AnalyticsDateRangePageKey): { fromMs: number | null; toMs: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const o = JSON.parse(raw) as { fromMs: number | null; toMs: number };
    if (typeof o.toMs !== "number" || !Number.isFinite(o.toMs)) return null;
    return {
      fromMs: o.fromMs != null && Number.isFinite(o.fromMs) ? o.fromMs : null,
      toMs: o.toMs,
    };
  } catch {
    return null;
  }
}

/** Per-page date range persisted in localStorage (each page has its own key). */
export function usePersistedDateRange(pageKey: AnalyticsDateRangePageKey) {
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date>(() => new Date());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const p = load(pageKey);
    if (p) {
      setFrom(p.fromMs != null ? new Date(p.fromMs) : null);
      setTo(new Date(p.toMs));
    }
    setHydrated(true);
  }, [pageKey]);

  const setRange = useCallback(
    (nextFrom: Date | null, nextTo: Date) => {
      const payload = { fromMs: nextFrom?.getTime() ?? null, toMs: nextTo.getTime() };
      localStorage.setItem(PREFIX + pageKey, JSON.stringify(payload));
      setFrom(nextFrom);
      setTo(nextTo);
    },
    [pageKey],
  );

  return { from, to, setRange, hydrated };
}
