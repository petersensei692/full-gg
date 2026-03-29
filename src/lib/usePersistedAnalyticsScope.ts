"use client";

import { useCallback, useEffect, useState } from "react";

export type AnalyticsScope = {
  pairs: string[];
  currencies: string[];
};

const PREFIX = "gg:analyticsScope:";

export type AnalyticsScopePageKey = "dashboard" | "performance";

function defaultScope(): AnalyticsScope {
  return { pairs: [], currencies: [] };
}

export function loadAnalyticsScope(page: AnalyticsScopePageKey): AnalyticsScope {
  if (typeof window === "undefined") return defaultScope();
  try {
    const raw = localStorage.getItem(PREFIX + page);
    if (!raw) return defaultScope();
    const o = JSON.parse(raw) as Partial<AnalyticsScope>;
    return {
      pairs: Array.isArray(o.pairs) ? o.pairs : [],
      currencies: Array.isArray(o.currencies) ? o.currencies : [],
    };
  } catch {
    return defaultScope();
  }
}

export function saveAnalyticsScope(page: AnalyticsScopePageKey, s: AnalyticsScope): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFIX + page, JSON.stringify(s));
}

export function scopeActive(s: AnalyticsScope): boolean {
  return s.pairs.length > 0 || s.currencies.length > 0;
}

export function usePersistedAnalyticsScope(page: AnalyticsScopePageKey) {
  const [scope, setScope] = useState<AnalyticsScope>(defaultScope);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setScope(loadAnalyticsScope(page));
    setHydrated(true);
  }, [page]);

  const persist = useCallback(
    (next: AnalyticsScope) => {
      saveAnalyticsScope(page, next);
      setScope(next);
    },
    [page],
  );

  return { scope, persist, hydrated };
}
