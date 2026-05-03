"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type {
  WeeklyWatchlist,
  WatchItem,
  CreateWeeklyWatchlistDto,
  CreateWatchItemDto,
  UpdateWatchItemDto,
  UpdateWeeklyWatchlistDto,
} from "@/types/api";
import { weeklyWatchlistService, watchItemsService } from "@/lib/api";

interface WatchlistCalendarContextValue {
  weeklyWatchlists: WeeklyWatchlist[];
  watchItems: WatchItem[];
  loading: boolean;
  error: string | null;
  refetchAll: () => Promise<void>;

  createWeeklyWatchlist: (dto: CreateWeeklyWatchlistDto) => Promise<WeeklyWatchlist>;
  updateWeeklyWatchlist: (id: string, dto: UpdateWeeklyWatchlistDto) => Promise<WeeklyWatchlist>;
  deleteWeeklyWatchlist: (id: string) => Promise<void>;

  createWatchItem: (dto: CreateWatchItemDto) => Promise<WatchItem>;
  updateWatchItem: (id: string, dto: UpdateWatchItemDto) => Promise<WatchItem>;
  deleteWatchItem: (id: string) => Promise<void>;
}

const WatchlistCalendarContext =
  createContext<WatchlistCalendarContextValue | null>(null);

export function WatchlistCalendarProvider({ children }: { children: ReactNode }) {
  const [weeklyWatchlists, setWeeklyWatchlists] = useState<WeeklyWatchlist[]>([]);
  const [watchItems, setWatchItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [watchlistRes, watchItemRes] = await Promise.allSettled([
        weeklyWatchlistService.getAll(),
        watchItemsService.getAll(),
      ]);

      if (watchlistRes.status === "fulfilled") {
        setWeeklyWatchlists(watchlistRes.value);
      } else {
        setWeeklyWatchlists([]);
        console.error("Weekly watchlists fetch failed:", watchlistRes.reason);
      }

      if (watchItemRes.status === "fulfilled") {
        setWatchItems(watchItemRes.value);
      } else {
        setWatchItems([]);
        console.error("Watch items fetch failed:", watchItemRes.reason);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchAll();
  }, [refetchAll]);

  const createWeeklyWatchlist = useCallback(async (dto: CreateWeeklyWatchlistDto) => {
    const created = await weeklyWatchlistService.create(dto);
    setWeeklyWatchlists((prev) => [...prev, created]);
    return created;
  }, []);

  const updateWeeklyWatchlist = useCallback(
    async (id: string, dto: UpdateWeeklyWatchlistDto) => {
      const updated = await weeklyWatchlistService.update(id, dto);
      setWeeklyWatchlists((prev) => prev.map((w) => (w.id === id ? updated : w)));
      return updated;
    },
    []
  );

  const deleteWeeklyWatchlist = useCallback(async (id: string) => {
    await weeklyWatchlistService.delete(id);
    setWeeklyWatchlists((prev) => prev.filter((w) => w.id !== id));
    setWatchItems((prev) =>
      prev.filter(
        (w) =>
          w.watchlist?.id !== id &&
          w.baseAssetWatchlist?.weeklyWatchlist?.id !== id &&
          w.quoteAssetWatchlist?.weeklyWatchlist?.id !== id
      )
    );
  }, []);

  const createWatchItem = useCallback(async (dto: CreateWatchItemDto) => {
    const created = await watchItemsService.create(dto);
    setWatchItems((prev) => [...prev, created]);
    return created;
  }, []);

  const updateWatchItem = useCallback(async (id: string, dto: UpdateWatchItemDto) => {
    const updated = await watchItemsService.update(id, dto);
    setWatchItems((prev) => prev.map((w) => (w.id === id ? updated : w)));
    return updated;
  }, []);

  const deleteWatchItem = useCallback(async (id: string) => {
    await watchItemsService.delete(id);
    setWatchItems((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const value = useMemo<WatchlistCalendarContextValue>(
    () => ({
      weeklyWatchlists,
      watchItems,
      loading,
      error,
      refetchAll,
      createWeeklyWatchlist,
      updateWeeklyWatchlist,
      deleteWeeklyWatchlist,
      createWatchItem,
      updateWatchItem,
      deleteWatchItem,
    }),
    [
      weeklyWatchlists,
      watchItems,
      loading,
      error,
      refetchAll,
      createWeeklyWatchlist,
      updateWeeklyWatchlist,
      deleteWeeklyWatchlist,
      createWatchItem,
      updateWatchItem,
      deleteWatchItem,
    ]
  );

  return (
    <WatchlistCalendarContext.Provider value={value}>
      {children}
    </WatchlistCalendarContext.Provider>
  );
}

export function useWatchlistCalendar() {
  const ctx = useContext(WatchlistCalendarContext);
  if (!ctx) {
    throw new Error("useWatchlistCalendar must be used within WatchlistCalendarProvider");
  }
  return ctx;
}
