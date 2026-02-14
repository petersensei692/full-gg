"use client";

import { useState, useMemo } from "react";
import { Calendar, Plus, ChevronDown, Trash2 } from "lucide-react";
import type { AssetConfig } from "@/types/asset";
import type { WeeklyWatchlist, WatchItem, CreateWatchItemDto } from "@/types/api";
import { useWatchlistCalendar } from "@/context/WatchlistCalendarContext";
import { WeeklyCalendarModal } from "./WeeklyCalendarModal";
import { CreatePairModal } from "./CreatePairModal";
import { WatchlistEntryCard } from "./WatchlistEntryCard";

interface PairWatchlistViewProps {
  asset: AssetConfig;
}

export function PairWatchlistView({ asset }: PairWatchlistViewProps) {
  const {
    weeklyWatchlists,
    watchItems,
    createWeeklyWatchlist,
    updateWeeklyWatchlist,
    createWatchItem,
    updateWatchItem,
    deleteWeeklyWatchlist,
  } = useWatchlistCalendar();

  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [editingWatchlist, setEditingWatchlist] = useState<WeeklyWatchlist | null>(null);
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WatchItem | null>(null);
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);

  const selectedCalendar = weeklyWatchlists.find((c) => c.id === selectedCalendarId);

  const watchlistEntries = useMemo(
    () =>
      selectedCalendarId
        ? watchItems
            .filter((e) => e.watchlist.id === selectedCalendarId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [],
    [watchItems, selectedCalendarId]
  );

  const handleCalendarSubmit = async (dto: { startDate: string; endDate: string }) => {
    if (editingWatchlist) {
      const updated = await updateWeeklyWatchlist(editingWatchlist.id, dto);
      setSelectedCalendarId(updated.id);
    } else {
      const created = await createWeeklyWatchlist(dto);
      setSelectedCalendarId(created.id);
    }
    setEditingWatchlist(null);
    setCalendarDropdownOpen(false);
  };

  const handlePairSubmit = async (dto: CreateWatchItemDto) => {
    if (editingItem) {
      await updateWatchItem(editingItem.id, dto);
    } else {
      await createWatchItem(dto);
    }
    setEditingItem(null);
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
              ? `${new Date(selectedCalendar.startDate).toISOString().slice(0, 10)} → ${new Date(
                  selectedCalendar.endDate
                ).toISOString().slice(0, 10)}`
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
                {weeklyWatchlists.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-dashboard-foreground/70">
                    No watchlists yet
                  </p>
                ) : (
                  weeklyWatchlists.map((cal) => (
                    <div key={cal.id} className="flex items-center gap-2 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCalendarId(cal.id);
                          setCalendarDropdownOpen(false);
                        }}
                        className={`flex-1 text-left text-sm hover:text-primary transition-colors ${
                          selectedCalendarId === cal.id
                            ? "text-primary font-medium"
                            : "text-dashboard-foreground"
                        }`}
                      >
                        {new Date(cal.startDate).toISOString().slice(0, 10)} →{" "}
                        {new Date(cal.endDate).toISOString().slice(0, 10)}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteWeeklyWatchlist(cal.id)}
                        className="text-dashboard-foreground/50 hover:text-red-400 transition-colors"
                        aria-label="Delete watchlist"
                        title="Delete watchlist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWatchlist(cal);
                          setCalendarModalOpen(true);
                        }}
                        className="text-dashboard-foreground/50 hover:text-primary transition-colors"
                        aria-label="Edit watchlist"
                        title="Edit watchlist"
                      >
                        ✎
                      </button>
                    </div>
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
            {watchlistEntries.map((entry: WatchItem) => (
              <WatchlistEntryCard
                key={entry.id}
                entry={entry}
                onEdit={() => {
                  setEditingItem(entry);
                  setPairModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <WeeklyCalendarModal
        open={calendarModalOpen}
        onOpenChange={setCalendarModalOpen}
        variant="watchlist"
        mode={editingWatchlist ? "edit" : "create"}
        initialStartDate={editingWatchlist?.startDate}
        initialEndDate={editingWatchlist?.endDate}
        onSubmit={handleCalendarSubmit}
      />
      <CreatePairModal
        open={pairModalOpen}
        onOpenChange={setPairModalOpen}
        calendars={weeklyWatchlists}
        selectedCalendarId={selectedCalendarId}
        currentAssetSlug={asset.slug}
        currentAssetLabel={asset.label}
        mode={editingItem ? "edit" : "create"}
        initialItem={editingItem ?? undefined}
        onSubmit={handlePairSubmit}
      />
    </div>
  );
}
