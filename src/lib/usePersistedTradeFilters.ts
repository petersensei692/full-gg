"use client";

import { useCallback, useEffect, useState } from "react";
import {
  defaultTradeFilters,
  loadTradeFilters,
  saveTradeFilters,
  type TradeFilters,
  type TradeFiltersPageKey,
} from "@/lib/trade-filters";

export function usePersistedTradeFilters(page: TradeFiltersPageKey) {
  const [filters, setFilters] = useState<TradeFilters>(defaultTradeFilters);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFilters(loadTradeFilters(page));
    setHydrated(true);
  }, [page]);

  const persist = useCallback(
    (next: TradeFilters) => {
      saveTradeFilters(page, next);
      setFilters(next);
    },
    [page],
  );

  return { filters, persist, hydrated };
}
