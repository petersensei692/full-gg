"use client";

import { useState, useMemo } from "react";
import { Calendar, ChevronDown, Trash2 } from "lucide-react";
import { useWatchlistCalendar } from "@/context/WatchlistCalendarContext";
import type { WeeklyWatchlist, WatchItem } from "@/types/api";
import { WatchlistEntryCard } from "@/components/analysis/WatchlistEntryCard";
import { CreatePairModal } from "@/components/analysis/CreatePairModal";
import { useAssets } from "@/context/AssetsContext";
import { WeeklyCalendarModal } from "@/components/analysis/WeeklyCalendarModal";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";

const DISPLAY_OPTIONS = [
  { value: "1", label: "Latest" },
  { value: "2", label: "Last 2" },
  { value: "4", label: "Last 4" },
  { value: "8", label: "Last 8" },
  { value: "12", label: "Last 12" },
  { value: "all", label: "All" },
] as const;

function formatDateRange(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const e = new Date(end).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${s} → ${e}`;
}

export function WatchListView() {
  const {
    weeklyWatchlists,
    watchItems,
    createWeeklyWatchlist,
    deleteWeeklyWatchlist,
    updateWeeklyWatchlist,
    updateWatchItem,
  } = useWatchlistCalendar();
  const { assets } = useAssets();

  const [displayCount, setDisplayCount] = useState<string>("4");
  const [displayDropdownOpen, setDisplayDropdownOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingWatchlist, setEditingWatchlist] = useState<WeeklyWatchlist | null>(null);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WatchItem | null>(null);
  const [createWatchlistModalOpen, setCreateWatchlistModalOpen] = useState(false);
  const [pendingWatchlistDelete, setPendingWatchlistDelete] = useState<WeeklyWatchlist | null>(null);

  const sortedCalendars = useMemo(
    () =>
      [...weeklyWatchlists].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [weeklyWatchlists]
  );

  const displayedCalendars = useMemo(() => {
    if (displayCount === "all") return sortedCalendars;
    const n = Math.max(1, parseInt(displayCount, 10) || 1);
    return sortedCalendars.slice(0, n);
  }, [sortedCalendars, displayCount]);

  const pairsByCalendarId = useMemo(() => {
    const map: Record<string, WatchItem[]> = {};
    watchItems.forEach((e) => {
      const wlId =
        e.baseAssetWatchlist?.weeklyWatchlist?.id ??
        e.quoteAssetWatchlist?.weeklyWatchlist?.id ??
        e.watchlist?.id;
      if (!wlId) return;
      if (!map[wlId]) map[wlId] = [];
      map[wlId].push(e);
    });
    Object.keys(map).forEach((id) =>
      map[id].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
    return map;
  }, [watchItems]);

  const displayLabel =
    DISPLAY_OPTIONS.find((o) => o.value === displayCount)?.label ?? "Last 4";

  return (
    <>
    <div className="flex h-full min-h-0 flex-col overflow-auto">
      <div className="p-6 pt-4 flex flex-col min-h-0 flex-1">
        <h1 className="text-xl font-semibold text-dashboard-foreground mb-4">
          Weekly Watchlists
        </h1>
        <p className="text-sm text-dashboard-foreground/70 mb-4">
          Create weekly watchlists and pairs from any asset&apos;s Pair Watchlist tab. They appear here as cards.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setCreateWatchlistModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Create watchlist
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDisplayDropdownOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors"
            >
              Display: {displayLabel}
              <ChevronDown className="h-4 w-4" />
            </button>
            {displayDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden
                  onClick={() => setDisplayDropdownOpen(false)}
                />
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border border-sidebar-border bg-sidebar py-1 shadow-lg">
                  {DISPLAY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setDisplayCount(opt.value);
                        setDisplayDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-sidebar-hover transition-colors ${
                        displayCount === opt.value
                          ? "text-primary font-medium"
                          : "text-dashboard-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto space-y-6">
          {displayedCalendars.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[280px] text-dashboard-foreground/60 text-sm rounded-xl border border-sidebar-border bg-sidebar/30">
              <Calendar className="h-12 w-12 mb-3 opacity-50" />
              <p>No weekly watchlists yet.</p>
              <p className="text-xs mt-1 mb-3">Create a watchlist to get started.</p>
              <button
                type="button"
                onClick={() => setCreateWatchlistModalOpen(true)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Create watchlist
              </button>
            </div>
          ) : (
            displayedCalendars.map((cal: WeeklyWatchlist) => {
              const pairs = (pairsByCalendarId[cal.id] ?? []).sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              return (
                <div
                  key={cal.id}
                  className="rounded-xl border border-sidebar-border bg-sidebar/50 overflow-hidden shadow-sm"
                >
                  <div className="px-5 py-4 border-b border-sidebar-border bg-sidebar/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary/80" />
                      <h2 className="text-lg font-semibold text-dashboard-foreground">
                        {formatDateRange(cal.startDate, cal.endDate)}
                      </h2>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWatchlist(cal);
                          setEditModalOpen(true);
                        }}
                        className="text-dashboard-foreground/50 hover:text-primary transition-colors p-1"
                        aria-label="Edit watchlist"
                        title="Edit watchlist"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingWatchlistDelete(cal)}
                        className="text-dashboard-foreground/50 hover:text-red-400 transition-colors p-1"
                        aria-label="Delete watchlist"
                        title="Delete watchlist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    {pairs.length === 0 ? (
                      <p className="text-sm text-dashboard-foreground/50 py-4">
                        No pairs in this watchlist yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {pairs.map((entry) => (
                          <WatchlistEntryCard
                            key={entry.id}
                            entry={entry}
                            onEdit={() => {
                              setEditingItem(entry);
                              setEditItemOpen(true);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
    <ConfirmDeleteDialog
      open={pendingWatchlistDelete != null}
      onOpenChange={(o) => !o && setPendingWatchlistDelete(null)}
      title="Delete this weekly watchlist?"
      description="All pairs in this watchlist will be removed. This cannot be undone."
      details={
        pendingWatchlistDelete
          ? [
              `Week: ${formatDateRange(pendingWatchlistDelete.startDate, pendingWatchlistDelete.endDate)}`,
              `ID: ${pendingWatchlistDelete.id}`,
            ].join("\n")
          : undefined
      }
      onConfirm={async () => {
        if (pendingWatchlistDelete) await deleteWeeklyWatchlist(pendingWatchlistDelete.id);
      }}
    />
    <WeeklyCalendarModal
      open={createWatchlistModalOpen}
      onOpenChange={setCreateWatchlistModalOpen}
      mode="create"
      variant="watchlist"
      onSubmit={async (dto) => {
        await createWeeklyWatchlist(dto);
        setCreateWatchlistModalOpen(false);
      }}
    />
    <WeeklyCalendarModal
      open={editModalOpen}
      onOpenChange={setEditModalOpen}
      mode="edit"
      variant="watchlist"
      initialStartDate={editingWatchlist?.startDate}
      initialEndDate={editingWatchlist?.endDate}
      onSubmit={async (dto) => {
        if (!editingWatchlist) return;
        await updateWeeklyWatchlist(editingWatchlist.id, dto);
        setEditModalOpen(false);
        setEditingWatchlist(null);
      }}
    />
    <CreatePairModal
      open={editItemOpen}
      onOpenChange={(open) => {
        if (!open) {
          setEditItemOpen(false);
          setEditingItem(null);
        }
      }}
      calendars={weeklyWatchlists}
      selectedCalendarId={
        editingItem?.watchlist?.id ??
        editingItem?.baseAssetWatchlist?.weeklyWatchlist?.id ??
        editingItem?.quoteAssetWatchlist?.weeklyWatchlist?.id ??
        null
      }
      currentAssetSlug={
        editingItem
          ? (assets.find((a) => a.label === editingItem.baseAsset.name)?.slug ??
            editingItem.baseAsset.name.toLowerCase())
          : "usd"
      }
      currentAssetLabel={
        editingItem
          ? (assets.find((a) => a.label === editingItem.baseAsset.name)?.label ??
            editingItem.baseAsset.name)
          : "USD"
      }
      mode="edit"
      initialItem={editingItem ?? undefined}
      onSubmit={async (dto) => {
        if (!editingItem) return;
        await updateWatchItem(editingItem.id, {
          pairName: dto.pairName,
          bias: dto.bias,
          thesis: dto.thesis
            ? {
                notes: dto.thesis.notes,
                images: dto.thesis.images,
                imageNames:
                  dto.thesis.imageNames ?? editingItem.thesis?.imageNames,
              }
            : undefined,
        });
        setEditItemOpen(false);
        setEditingItem(null);
      }}
    />
    </>
  );
}
