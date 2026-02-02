"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  WeeklyCalendar,
  WatchlistEntry,
  EconomicEvent,
} from "@/types/calendar";

interface WatchlistCalendarContextValue {
  calendars: WeeklyCalendar[];
  addCalendar: (c: WeeklyCalendar) => void;
  setCalendars: React.Dispatch<React.SetStateAction<WeeklyCalendar[]>>;

  watchlistEntries: WatchlistEntry[];
  addWatchlistEntry: (e: WatchlistEntry) => void;
  setWatchlistEntries: React.Dispatch<React.SetStateAction<WatchlistEntry[]>>;

  economicEvents: EconomicEvent[];
  addEconomicEvent: (e: EconomicEvent) => void;
  setEconomicEvents: React.Dispatch<React.SetStateAction<EconomicEvent[]>>;
}

const WatchlistCalendarContext = createContext<WatchlistCalendarContextValue | null>(null);

export function WatchlistCalendarProvider({ children }: { children: ReactNode }) {
  const [calendars, setCalendars] = useState<WeeklyCalendar[]>([]);
  const [watchlistEntries, setWatchlistEntries] = useState<WatchlistEntry[]>([]);
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([]);

  const addCalendar = useCallback((c: WeeklyCalendar) => {
    setCalendars((prev) => [...prev, c]);
  }, []);

  const addWatchlistEntry = useCallback((e: WatchlistEntry) => {
    setWatchlistEntries((prev) => [...prev, e]);
  }, []);

  const addEconomicEvent = useCallback((e: EconomicEvent) => {
    setEconomicEvents((prev) => [...prev, e]);
  }, []);

  const value: WatchlistCalendarContextValue = {
    calendars,
    addCalendar,
    setCalendars,
    watchlistEntries,
    addWatchlistEntry,
    setWatchlistEntries,
    economicEvents,
    addEconomicEvent,
    setEconomicEvents,
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
