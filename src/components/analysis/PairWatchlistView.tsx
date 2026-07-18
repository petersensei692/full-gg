"use client";

import { useState, useMemo, useEffect } from "react";
import { Calendar, Plus, ChevronDown } from "lucide-react";
import type { AssetConfig } from "@/types/asset";
import type { AssetWatchlist, WatchItem, CreateWatchItemDto } from "@/types/api";
import { useWatchlistCalendar } from "@/context/WatchlistCalendarContext";
import { assetWatchlistService } from "@/lib/api";
import { CreatePairModal } from "./CreatePairModal";
import { WatchlistEntryCard } from "./WatchlistEntryCard";

interface PairWatchlistViewProps {
  asset: AssetConfig;
  /** When provided, toolbar is rendered by parent; no internal fetch or modal */
  assetWatchlists?: AssetWatchlist[];
  selectedAssetWatchlistId?: string | null;
  selectedAssetWatchlist?: AssetWatchlist | null;
  pairModalOpen?: boolean;
  setPairModalOpen?: (open: boolean) => void;
  onEditItem?: (item: WatchItem) => void;
  loadingWatchlists?: boolean;
}

export function PairWatchlistView({
  asset,
  assetWatchlists: assetWatchlistsProp,
  selectedAssetWatchlistId: selectedAssetWatchlistIdProp,
  selectedAssetWatchlist: selectedAssetWatchlistProp,
  pairModalOpen: pairModalOpenProp,
  setPairModalOpen: setPairModalOpenProp,
  onEditItem,
  loadingWatchlists: loadingWatchlistsProp,
}: PairWatchlistViewProps) {
  const { watchItems } = useWatchlistCalendar();
  const controlled = assetWatchlistsProp !== undefined;

  const [assetWatchlistsLocal, setAssetWatchlistsLocal] = useState<AssetWatchlist[]>([]);
  const [selectedAssetWatchlistIdLocal, setSelectedAssetWatchlistIdLocal] = useState<string | null>(null);
  const [loadingWatchlistsLocal, setLoadingWatchlistsLocal] = useState(false);

  const assetWatchlists = controlled ? assetWatchlistsProp! : assetWatchlistsLocal;
  const selectedAssetWatchlistId = controlled ? (selectedAssetWatchlistIdProp ?? null) : selectedAssetWatchlistIdLocal;
  const loadingWatchlists = controlled ? (loadingWatchlistsProp ?? false) : loadingWatchlistsLocal;
  const selectedAssetWatchlist = controlled
    ? (selectedAssetWatchlistProp ?? assetWatchlists.find((aw) => aw.id === selectedAssetWatchlistId) ?? null)
    : assetWatchlists.find((aw) => aw.id === selectedAssetWatchlistId) ?? null;

  useEffect(() => {
    if (controlled || !asset.id) return;
    setLoadingWatchlistsLocal(true);
    assetWatchlistService
      .getByAsset(asset.id)
      .then((list) => {
        setAssetWatchlistsLocal(list);
        const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSelectedAssetWatchlistIdLocal((prev) => (prev && list.some((aw) => aw.id === prev) ? prev : sorted[0]?.id ?? null));
      })
      .catch(() => setAssetWatchlistsLocal([]))
      .finally(() => setLoadingWatchlistsLocal(false));
  }, [asset.id, controlled]);

  const watchlistEntries = useMemo(
    () =>
      selectedAssetWatchlistId
        ? watchItems
            .filter(
              (e) =>
                e.baseAssetWatchlist?.id === selectedAssetWatchlistId ||
                e.quoteAssetWatchlist?.id === selectedAssetWatchlistId
            )
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
        : [],
    [watchItems, selectedAssetWatchlistId]
  );

  const [editingItem, setEditingItem] = useState<WatchItem | null>(null);
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);
  const { createWatchItem, updateWatchItem, refetchAll } = useWatchlistCalendar();
  const sortedAssetWatchlists = useMemo(
    () => [...assetWatchlists].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [assetWatchlists]
  );

  const handlePairSubmit = async (dto: CreateWatchItemDto) => {
    if (editingItem) {
      await updateWatchItem(editingItem.id, {
        tradingPairId: dto.tradingPairId,
        bias: dto.bias,
        thesis: dto.thesis ? { notes: dto.thesis.notes, images: dto.thesis.images, imageNames: dto.thesis.imageNames ?? editingItem.thesis?.imageNames } : undefined,
      });
    } else {
      await createWatchItem(dto);
    }
    setEditingItem(null);
    setPairModalOpen(false);
    refetchAll();
  };

  const showToolbar = !controlled;

  return (
    <div className="flex-1 p-6 pt-4 flex flex-col min-h-0">
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setCalendarDropdownOpen((o) => !o)}
              disabled={loadingWatchlists || !asset.id}
              className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors disabled:opacity-50"
            >
              <Calendar className="h-4 w-4" />
              {loadingWatchlists ? "Loading..." : selectedAssetWatchlist
                ? `${new Date(selectedAssetWatchlist.startDate).toISOString().slice(0, 10)} → ${new Date(selectedAssetWatchlist.endDate).toISOString().slice(0, 10)}`
                : assetWatchlists.length === 0 ? "No watchlists (create one on Watchlist page)" : "Choose watchlist"}
              <ChevronDown className="h-4 w-4" />
            </button>
            {calendarDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" aria-hidden onClick={() => setCalendarDropdownOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[220px] max-h-[220px] overflow-y-auto rounded-lg border border-sidebar-border bg-sidebar py-1 shadow-lg">
                  {assetWatchlists.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-dashboard-foreground/70">No watchlists yet. Create one from the Watchlist page.</p>
                  ) : (
                    sortedAssetWatchlists.map((aw) => (
                      <button
                        key={aw.id}
                        type="button"
                        onClick={() => { setSelectedAssetWatchlistIdLocal(aw.id); setCalendarDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:text-primary transition-colors ${selectedAssetWatchlistId === aw.id ? "text-primary font-medium" : "text-dashboard-foreground"}`}
                      >
                        {new Date(aw.startDate).toISOString().slice(0, 10)} → {new Date(aw.endDate).toISOString().slice(0, 10)}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPairModalOpen(true)}
            disabled={!selectedAssetWatchlist}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Create Pair
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto w-full max-w-full">
        {!selectedAssetWatchlist ? (
          <div className="flex flex-col items-center justify-center h-64 text-dashboard-foreground/60 text-sm rounded-lg border border-sidebar-border bg-sidebar/30">
            <Calendar className="h-10 w-10 mb-2 opacity-50" />
            <p>
              {asset.id
                ? "Select a watchlist or create one from the Watchlist page."
                : "Asset ID required to load watchlists."}
            </p>
          </div>
        ) : watchlistEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-dashboard-foreground/60 text-sm rounded-lg border border-sidebar-border bg-sidebar/30">
            <p>No pairs in this watchlist yet. Create a pair to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {watchlistEntries.map((entry: WatchItem) => (
              <WatchlistEntryCard
                key={entry.id}
                entry={entry}
                onEdit={() => {
                  if (onEditItem) onEditItem(entry);
                  else { setEditingItem(entry); setPairModalOpen(true); }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {!controlled && (
        <CreatePairModal
          open={pairModalOpen}
          onOpenChange={setPairModalOpen}
          assetWatchlists={assetWatchlists}
          selectedAssetWatchlistId={selectedAssetWatchlistId}
          currentAssetSlug={asset.slug}
          currentAssetLabel={asset.label}
          mode={editingItem ? "edit" : "create"}
          initialItem={editingItem ?? undefined}
          onSubmit={handlePairSubmit}
        />
      )}
    </div>
  );
}
