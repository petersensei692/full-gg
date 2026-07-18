"use client";

import { useState, useCallback, useEffect, type ComponentProps } from "react";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/Dialog";
import type { WatchItem } from "@/types/api";
import { useWatchlistCalendar } from "@/context/WatchlistCalendarContext";
import { WatchItemDetailPanels } from "@/components/analysis/WatchItemDetailPanels";
import { Trash2, X } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";

function watchPairLabel(entry: WatchItem): string {
  return entry.tradingPair?.pair ?? entry.pairName;
}

function watchItemDeleteDetails(entry: WatchItem): string {
  const wl =
    entry.watchlist ??
    entry.baseAssetWatchlist?.weeklyWatchlist ??
    entry.quoteAssetWatchlist?.weeklyWatchlist ??
    null;
  const week = wl != null ? `${wl.startDate} → ${wl.endDate}` : "—";
  return [
    `Pair: ${watchPairLabel(entry)}`,
    `Bias: ${entry.bias}`,
    `Watchlist week: ${week}`,
    `Thesis images: ${entry.thesis?.images?.length ?? 0}`,
    `ID: ${entry.id}`,
  ].join("\n");
}

interface WatchlistFocusDialogProps {
  entry: WatchItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (entry: WatchItem) => void;
  onDelete?: (entry: WatchItem) => void;
}

const BORDER_CLASS = {
  bullish: "border-l-4 border-l-primary",
  bearish: "border-l-4 border-l-red-500",
} as const;

export function WatchlistFocusDialog({
  entry,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: WatchlistFocusDialogProps) {
  const { deleteWatchItem } = useWatchlistCalendar();
  const [entryToShow, setEntryToShow] = useState<WatchItem | null>(null);
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState<WatchItem | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (entry && open) {
      setEntryToShow(entry);
    } else if (!open && entryToShow) {
      const t = setTimeout(() => setEntryToShow(null), 400);
      return () => clearTimeout(t);
    }
  }, [entry, open, entryToShow?.id]);

  useEffect(() => {
    if (!open) setPickerOpen(false);
  }, [open]);

  const displayEntry = open ? (entry ?? entryToShow) : entryToShow ?? entry;
  const showContent = !!displayEntry;

  const holdWatchlistOpenWhenLinkPickerActive: NonNullable<
    ComponentProps<typeof DialogContent>["onInteractOutside"]
  > = useCallback(
    (e) => {
      if (!pickerOpen) return;
      const orig = (e as { detail?: { originalEvent?: Event } }).detail?.originalEvent;
      const t = (orig?.target ?? (e as { target: EventTarget | null }).target) as Node | null;
      const el = t instanceof Element ? t : t?.parentElement;
      if (
        el?.closest("[data-link-analysis-picker]") ||
        el?.closest("[data-link-analysis-picker-overlay]")
      ) {
        e.preventDefault();
      }
    },
    [pickerOpen],
  );

  const holdWatchlistOpenOnFocusToLinkPicker: NonNullable<
    ComponentProps<typeof DialogContent>["onFocusOutside"]
  > = useCallback(
    (e) => {
      if (!pickerOpen) return;
      const rel = (e as unknown as FocusEvent).relatedTarget as HTMLElement | null;
      if (
        rel?.closest("[data-link-analysis-picker]") ||
        rel?.closest("[data-link-analysis-picker-overlay]")
      ) {
        e.preventDefault();
      }
    },
    [pickerOpen],
  );

  const bias = displayEntry
    ? ((displayEntry.bias as "bullish" | "bearish") ?? "bullish")
    : "bullish";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showClose={false}
          containToMain
          onInteractOutside={holdWatchlistOpenWhenLinkPickerActive}
          onPointerDownOutside={holdWatchlistOpenWhenLinkPickerActive}
          onFocusOutside={holdWatchlistOpenOnFocusToLinkPicker}
          className={`bg-sidebar border border-sidebar-border rounded-xl !w-[calc((100dvw-var(--sidebar-width,0px))*0.95)] !max-w-[calc((100dvw-var(--sidebar-width,0px))*0.95)] !h-[95dvh] !max-h-[95dvh] flex flex-col overflow-hidden p-0 min-w-0 !items-stretch !justify-start ${BORDER_CLASS[bias]}`}
        >
          {showContent && displayEntry && (
            <>
              <div className="px-4 sm:px-6 py-2 border-b border-sidebar-border flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-base font-semibold text-dashboard-foreground truncate pr-2 leading-tight">
                    {watchPairLabel(displayEntry)}
                  </h3>
                  <span
                    className={`shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded ${
                      bias === "bullish"
                        ? "bg-primary/20 text-primary"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {bias === "bullish" ? "Bullish" : "Bearish"}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(displayEntry)}
                      className="rounded-lg border border-transparent p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-primary transition-colors"
                      aria-label="Edit watch item"
                      title="Edit watch item"
                    >
                      ✎
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => displayEntry && setPendingDeleteEntry(displayEntry)}
                    className="rounded-lg border border-transparent p-1.5 text-dashboard-foreground/60 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                    aria-label="Delete watch item"
                    title="Delete watch item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <DialogClose
                    className="rounded-lg border border-sidebar-border p-1.5 text-dashboard-foreground/80 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </DialogClose>
                </div>
              </div>

              <WatchItemDetailPanels
                entry={displayEntry}
                mode="editable"
                onEntryChange={setEntryToShow}
                onPickerOpenChange={setPickerOpen}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={pendingDeleteEntry != null}
        onOpenChange={(o) => !o && setPendingDeleteEntry(null)}
        title="Delete this watchlist pair?"
        details={pendingDeleteEntry ? watchItemDeleteDetails(pendingDeleteEntry) : undefined}
        onConfirm={async () => {
          const e = pendingDeleteEntry;
          if (e) {
            await deleteWatchItem(e.id);
            onOpenChange(false);
            onDelete?.(e);
          }
        }}
      />
    </>
  );
}
