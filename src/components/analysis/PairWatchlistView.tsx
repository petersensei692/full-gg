"use client";

import { useState, useMemo } from "react";
import { Calendar, Plus, ChevronDown } from "lucide-react";
import type { AssetConfig } from "@/types/asset";
import type { WeeklyCalendar, WatchlistEntry } from "@/types/calendar";
import { useWatchlistCalendar } from "@/context/WatchlistCalendarContext";
import { WeeklyCalendarModal } from "./WeeklyCalendarModal";
import { CreatePairModal } from "./CreatePairModal";
import { WatchlistEntryCard } from "./WatchlistEntryCard";

interface PairWatchlistViewProps {
  asset: AssetConfig;
}

export function PairWatchlistView({ asset }: PairWatchlistViewProps) {
  const { calendars, addCalendar, watchlistEntries: entries, addWatchlistEntry } =
    useWatchlistCalendar();

  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);

  const selectedCalendar = calendars.find((c) => c.id === selectedCalendarId);

  const watchlistEntries = useMemo(
    () =>
      selectedCalendarId
        ? entries
            .filter((e) => e.weeklyCalendarId === selectedCalendarId)
            .sort((a, b) => b.createdAt - a.createdAt)
        : [],
    [entries, selectedCalendarId]
  );

  const handleCalendarCreated = (calendar: WeeklyCalendar) => {
    addCalendar(calendar);
    setSelectedCalendarId(calendar.id);
    setCalendarDropdownOpen(false);
  };

  const handlePairCreated = (entry: WatchlistEntry) => {
    addWatchlistEntry(entry);
    setPairModalOpen(false);
  };

  return (
    <div className="flex-1 p-6 pt-4 flex flex-col min-h-0">
      {/* Top bar: same as Economic Events */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setCalendarDropdownOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors"
          >
            <Calendar className="h-4 w-4" />
            {selectedCalendar
              ? `${selectedCalendar.startDate} → ${selectedCalendar.endDate}`
              : "Choose or create weekly watchlist"}
            <ChevronDown className="h-4 w-4" />
          </button>
          {calendarDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                aria-hidden
                onClick={() => setCalendarDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1 z-50 min-w-[220px] rounded-lg border border-sidebar-border bg-sidebar py-1 shadow-lg">
                {calendars.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-dashboard-foreground/70">
                    No watchlists yet
                  </p>
                ) : (
                  calendars.map((cal) => (
                    <button
                      key={cal.id}
                      type="button"
                      onClick={() => {
                        setSelectedCalendarId(cal.id);
                        setCalendarDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-sidebar-hover transition-colors ${
                        selectedCalendarId === cal.id
                          ? "text-primary font-medium"
                          : "text-dashboard-foreground"
                      }`}
                    >
                      {cal.startDate} → {cal.endDate}
                    </button>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCalendarDropdownOpen(false);
                    setCalendarModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-sidebar-hover transition-colors border-t border-sidebar-border mt-1 pt-2"
                >
                  <Plus className="h-4 w-4" />
                  Create new watchlist
                </button>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setPairModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Pair
        </button>
      </div>

      {/* Stream-like list of watchlist entries */}
      <div className="flex-1 min-h-0 overflow-auto w-full max-w-full">
        {!selectedCalendar ? (
          <div className="flex flex-col items-center justify-center h-64 text-dashboard-foreground/60 text-sm rounded-lg border border-sidebar-border bg-sidebar/30">
            <Calendar className="h-10 w-10 mb-2 opacity-50" />
            <p>Select or create a weekly watchlist to view pairs.</p>
          </div>
        ) : watchlistEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-dashboard-foreground/60 text-sm rounded-lg border border-sidebar-border bg-sidebar/30">
            <p>No pairs in this watchlist yet. Create a pair to get started.</p>
          </div>
        ) : (
          <div className="w-full max-w-full space-y-6">
            {watchlistEntries.map((entry) => (
              <WatchlistEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      <WeeklyCalendarModal
        open={calendarModalOpen}
        onOpenChange={setCalendarModalOpen}
        variant="watchlist"
        onCreated={handleCalendarCreated}
      />
      <CreatePairModal
        open={pairModalOpen}
        onOpenChange={setPairModalOpen}
        calendars={calendars}
        selectedCalendarId={selectedCalendarId}
        currentAssetSlug={asset.slug}
        currentAssetLabel={asset.label}
        onCreated={handlePairCreated}
      />
    </div>
  );
}
