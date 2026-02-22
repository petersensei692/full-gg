"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type {
  WeeklyCalendar,
  WeeklyWatchlist,
  Event,
  WatchItem,
  CreateWeeklyCalendarDto,
  CreateWeeklyWatchlistDto,
  CreateEventDto,
  CreateWatchItemDto,
  UpdateWatchItemDto,
  UpdateWeeklyCalendarDto,
  UpdateWeeklyWatchlistDto,
  UpdateEventDto,
} from "@/types/api";
import {
  weeklyCalendarService,
  weeklyWatchlistService,
  eventsService,
  watchItemsService,
} from "@/lib/api";

interface WatchlistCalendarContextValue {
  weeklyCalendars: WeeklyCalendar[];
  weeklyWatchlists: WeeklyWatchlist[];
  events: Event[];
  watchItems: WatchItem[];
  loading: boolean;
  error: string | null;
  refetchAll: () => Promise<void>;

  createWeeklyCalendar: (dto: CreateWeeklyCalendarDto) => Promise<WeeklyCalendar>;
  updateWeeklyCalendar: (id: string, dto: UpdateWeeklyCalendarDto) => Promise<WeeklyCalendar>;
  deleteWeeklyCalendar: (id: string) => Promise<void>;

  createWeeklyWatchlist: (dto: CreateWeeklyWatchlistDto) => Promise<WeeklyWatchlist>;
  updateWeeklyWatchlist: (id: string, dto: UpdateWeeklyWatchlistDto) => Promise<WeeklyWatchlist>;
  deleteWeeklyWatchlist: (id: string) => Promise<void>;

  createEvent: (dto: CreateEventDto) => Promise<Event>;
  updateEvent: (id: string, dto: UpdateEventDto) => Promise<Event>;
  deleteEvent: (id: string) => Promise<void>;

  createWatchItem: (dto: CreateWatchItemDto) => Promise<WatchItem>;
  updateWatchItem: (id: string, dto: UpdateWatchItemDto) => Promise<WatchItem>;
  deleteWatchItem: (id: string) => Promise<void>;
}

const WatchlistCalendarContext =
  createContext<WatchlistCalendarContextValue | null>(null);

export function WatchlistCalendarProvider({ children }: { children: ReactNode }) {
  const [weeklyCalendars, setWeeklyCalendars] = useState<WeeklyCalendar[]>([]);
  const [weeklyWatchlists, setWeeklyWatchlists] = useState<WeeklyWatchlist[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [watchItems, setWatchItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [calendarRes, watchlistRes, eventRes, watchItemRes] =
        await Promise.allSettled([
          weeklyCalendarService.getAll(),
          weeklyWatchlistService.getAll(),
          eventsService.getAll(),
          watchItemsService.getAll(),
        ]);

      if (calendarRes.status === "fulfilled") {
        setWeeklyCalendars(calendarRes.value);
      } else {
        setWeeklyCalendars([]);
        console.error("Weekly calendars fetch failed:", calendarRes.reason);
      }

      if (watchlistRes.status === "fulfilled") {
        setWeeklyWatchlists(watchlistRes.value);
      } else {
        setWeeklyWatchlists([]);
        console.error("Weekly watchlists fetch failed:", watchlistRes.reason);
      }

      if (eventRes.status === "fulfilled") {
        setEvents(eventRes.value);
      } else {
        setEvents([]);
        console.error("Events fetch failed:", eventRes.reason);
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

  const createWeeklyCalendar = useCallback(async (dto: CreateWeeklyCalendarDto) => {
    const created = await weeklyCalendarService.create(dto);
    setWeeklyCalendars((prev) => [...prev, created]);
    return created;
  }, []);

  const updateWeeklyCalendar = useCallback(
    async (id: string, dto: UpdateWeeklyCalendarDto) => {
      const updated = await weeklyCalendarService.update(id, dto);
      setWeeklyCalendars((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    []
  );

  const deleteWeeklyCalendar = useCallback(async (id: string) => {
    await weeklyCalendarService.delete(id);
    setWeeklyCalendars((prev) => prev.filter((c) => c.id !== id));
    setEvents((prev) =>
      prev.filter(
        (e) =>
          e.calendar?.id !== id &&
          e.assetCalendar?.weeklyCalendar?.id !== id
      )
    );
  }, []);

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

  const createEvent = useCallback(async (dto: CreateEventDto) => {
    const created = await eventsService.create(dto);
    setEvents((prev) => [...prev, created]);
    return created;
  }, []);

  const updateEvent = useCallback(async (id: string, dto: UpdateEventDto) => {
    const updated = await eventsService.update(id, dto);
    setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    await eventsService.delete(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
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

  const value: WatchlistCalendarContextValue = {
    weeklyCalendars,
    weeklyWatchlists,
    events,
    watchItems,
    loading,
    error,
    refetchAll,
    createWeeklyCalendar,
    updateWeeklyCalendar,
    deleteWeeklyCalendar,
    createWeeklyWatchlist,
    updateWeeklyWatchlist,
    deleteWeeklyWatchlist,
    createEvent,
    updateEvent,
    deleteEvent,
    createWatchItem,
    updateWatchItem,
    deleteWatchItem,
  };

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
