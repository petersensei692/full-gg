"use client";

import { useState, useCallback, useEffect, useMemo, type ComponentProps } from "react";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/Dialog";
import type { AllAnalysisItem, WatchItem } from "@/types/api";
import { useWatchlistCalendar } from "@/context/WatchlistCalendarContext";
import { deleteStoredImage } from "@/lib/imageUpload";
import { getImageUrl } from "@/lib/imageUrls";
import { allAnalysisService } from "@/lib/api";
import {
  mapAllAnalysisItemsToStreamEntries,
  orderStreamEntriesByIds,
} from "@/lib/all-analysis-map";
import { buildStreamEntryGroups } from "@/lib/analysis-stream-entry-groups";
import { StreamEntry as StreamEntryComponent } from "@/components/analysis/StreamEntry";
import { WatchItemAnalysisLinkPickerModal } from "@/components/analysis/WatchItemAnalysisLinkPickerModal";
import { Trash2, X } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";

type FocusSection = "main" | "analysis";

function watchItemDeleteDetails(entry: WatchItem): string {
  const wl =
    entry.watchlist ??
    entry.baseAssetWatchlist?.weeklyWatchlist ??
    entry.quoteAssetWatchlist?.weeklyWatchlist ??
    null;
  const week = wl != null ? `${wl.startDate} → ${wl.endDate}` : "—";
  return [
    `Pair: ${entry.pairName}`,
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
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const { deleteWatchItem, updateWatchItem } = useWatchlistCalendar();
  const [entryToShow, setEntryToShow] = useState<WatchItem | null>(null);
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState<WatchItem | null>(null);
  const [pendingDeleteImage, setPendingDeleteImage] = useState<{
    path: string;
    pairName: string;
    caption: string;
  } | null>(null);

  const [activeSection, setActiveSection] = useState<FocusSection>("main");
  const [pickerSide, setPickerSide] = useState<"base" | "quote" | null>(null);
  const [linkedBaseIds, setLinkedBaseIds] = useState<string[]>([]);
  const [linkedQuoteIds, setLinkedQuoteIds] = useState<string[]>([]);
  const [basePool, setBasePool] = useState<AllAnalysisItem[]>([]);
  const [quotePool, setQuotePool] = useState<AllAnalysisItem[]>([]);

  useEffect(() => {
    if (open && entry?.id) setActiveSection("main");
  }, [open, entry?.id]);

  useEffect(() => {
    if (!open) setPickerSide(null);
  }, [open]);

  useEffect(() => {
    if (entry && open) {
      setEntryToShow(entry);
    } else if (!open && entryToShow) {
      const t = setTimeout(() => setEntryToShow(null), 400);
      return () => clearTimeout(t);
    }
  }, [entry, open, entryToShow?.id]);

  const displayEntry = open ? (entry ?? entryToShow) : entryToShow ?? entry;

  useEffect(() => {
    if (!displayEntry) return;
    setLinkedBaseIds(displayEntry.linkedBaseAnalysisIds ?? []);
    setLinkedQuoteIds(displayEntry.linkedQuoteAnalysisIds ?? []);
  }, [
    displayEntry?.id,
    displayEntry?.linkedBaseAnalysisIds,
    displayEntry?.linkedQuoteAnalysisIds,
  ]);

  useEffect(() => {
    if (!open || !displayEntry) return;
    let cancelled = false;
    void (async () => {
      try {
        const [b, q] = await Promise.all([
          allAnalysisService.getAll(displayEntry.baseAsset.id),
          allAnalysisService.getAll(displayEntry.quoteAsset.id),
        ]);
        if (!cancelled) {
          setBasePool(b);
          setQuotePool(q);
        }
      } catch {
        if (!cancelled) {
          setBasePool([]);
          setQuotePool([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, displayEntry?.baseAsset?.id, displayEntry?.quoteAsset?.id]);

  const baseStreamGroups = useMemo(() => {
    const pool = mapAllAnalysisItemsToStreamEntries(basePool);
    const ordered = orderStreamEntriesByIds(pool, linkedBaseIds);
    return buildStreamEntryGroups(ordered);
  }, [basePool, linkedBaseIds]);

  const quoteStreamGroups = useMemo(() => {
    const pool = mapAllAnalysisItemsToStreamEntries(quotePool);
    const ordered = orderStreamEntriesByIds(pool, linkedQuoteIds);
    return buildStreamEntryGroups(ordered);
  }, [quotePool, linkedQuoteIds]);

  const removeBaseLink = useCallback(
    async (analysisId: string) => {
      if (!displayEntry) return;
      const next = linkedBaseIds.filter((id) => id !== analysisId);
      setLinkedBaseIds(next);
      try {
        const updated = await updateWatchItem(displayEntry.id, {
          linkedBaseAnalysisIds: next,
          linkedQuoteAnalysisIds: linkedQuoteIds,
        });
        setEntryToShow(updated);
      } catch {
        setLinkedBaseIds(displayEntry.linkedBaseAnalysisIds ?? []);
      }
    },
    [displayEntry, linkedBaseIds, linkedQuoteIds, updateWatchItem],
  );

  const removeQuoteLink = useCallback(
    async (analysisId: string) => {
      if (!displayEntry) return;
      const next = linkedQuoteIds.filter((id) => id !== analysisId);
      setLinkedQuoteIds(next);
      try {
        const updated = await updateWatchItem(displayEntry.id, {
          linkedBaseAnalysisIds: linkedBaseIds,
          linkedQuoteAnalysisIds: next,
        });
        setEntryToShow(updated);
      } catch {
        setLinkedQuoteIds(displayEntry.linkedQuoteAnalysisIds ?? []);
      }
    },
    [displayEntry, linkedBaseIds, linkedQuoteIds, updateWatchItem],
  );

  // Always render Dialog so Radix can manage focus/portal; only show content when we have displayEntry
  const showContent = !!displayEntry;

  /** Link picker is a second dialog (sibling portal). Clicks on it are "outside" the watchlist card; keep the watchlist open. */
  const holdWatchlistOpenWhenLinkPickerActive: NonNullable<
    ComponentProps<typeof DialogContent>["onInteractOutside"]
  > = useCallback(
    (e) => {
      if (!pickerSide) return;
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
    [pickerSide],
  );

  const holdWatchlistOpenOnFocusToLinkPicker: NonNullable<
    ComponentProps<typeof DialogContent>["onFocusOutside"]
  > = useCallback(
    (e) => {
      if (!pickerSide) return;
      const rel = (e as unknown as FocusEvent).relatedTarget as HTMLElement | null;
      if (
        rel?.closest("[data-link-analysis-picker]") ||
        rel?.closest("[data-link-analysis-picker-overlay]")
      ) {
        e.preventDefault();
      }
    },
    [pickerSide],
  );

  const handleUpdateImageName = useCallback(
    async (path: string, name: string) => {
      if (!displayEntry) return;
      setSaveError(null);
      const imageList = displayEntry.thesis?.images ?? [];
      const index = imageList.indexOf(path);
      if (index < 0) return;
      const currentNames = displayEntry.thesis?.imageNames ?? [];
      const nextImageNames = imageList.map((_, i) =>
        i === index ? name : (currentNames[i] ?? "")
      );
      try {
        await updateWatchItem(displayEntry.id, {
          thesis: {
            notes: displayEntry.thesis?.notes ?? "",
            images: imageList,
            imageNames: nextImageNames,
          },
        });
        setDraftNames((prev) => {
          const next = { ...prev };
          delete next[path];
          return next;
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to save image name";
        setSaveError(msg);
      }
    },
    [displayEntry, updateWatchItem]
  );

  const bias = displayEntry
    ? ((displayEntry.bias as "bullish" | "bearish") ?? "bullish")
    : "bullish";
  const images = displayEntry?.thesis?.images ?? [];
  const savedNames = displayEntry?.thesis?.imageNames ?? [];

  const handleDeleteImage = async (path: string) => {
    if (!displayEntry?.thesis) return;
    const imageList = displayEntry.thesis.images ?? [];
    const index = imageList.indexOf(path);
    const nextImages = imageList.filter((p) => p !== path);
    const currentNames = displayEntry.thesis.imageNames ?? [];
    const nextImageNames = nextImages.map(
      (_, i) => currentNames[i + (i >= index ? 1 : 0)] ?? ""
    );
    await updateWatchItem(displayEntry.id, {
      thesis: {
        notes: displayEntry.thesis.notes,
        images: nextImages,
        imageNames: nextImageNames.length > 0 ? nextImageNames : undefined,
      },
    });
    await deleteStoredImage(path).catch(() => undefined);
  };

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
                {displayEntry.pairName}
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

          <div className="flex gap-1 px-6 pt-1.5 pb-0 shrink-0 border-b border-sidebar-border justify-center">
            {(
              [
                { id: "main" as const, label: "Main" },
                { id: "analysis" as const, label: "Analysis" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveSection(t.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors ${
                  activeSection === t.id
                    ? "border-primary text-dashboard-foreground"
                    : "border-transparent text-dashboard-foreground/50 hover:text-dashboard-foreground/75"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden">
            {activeSection === "main" && (
          <div className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto px-6 py-5 space-y-4">
            {displayEntry.thesis?.notes && (
              <div
                className="w-full min-w-0 max-w-full break-words break-all text-sm text-dashboard-foreground/90 leading-relaxed prose prose-invert prose-sm [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium [&_*]:break-words [&_*]:min-w-0 [&_*]:max-w-full [&_img]:max-w-full [&_img]:max-h-[280px] [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:my-2 overflow-hidden"
                style={{ wordBreak: "break-word", overflowWrap: "break-word" } as React.CSSProperties}
                dangerouslySetInnerHTML={{ __html: displayEntry.thesis.notes }}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (
                    target.tagName === "IMG" &&
                    target instanceof HTMLImageElement
                  ) {
                    setZoomedImageSrc(target.src);
                  }
                }}
              />
            )}
            {images.length > 0 && (
              <div className="flex flex-col gap-4 w-full min-w-full">
                {images.map((path, i) => {
                  const url = getImageUrl(path);
                  const savedName = savedNames[i] ?? "";
                  const displayName =
                    path in draftNames ? draftNames[path] : savedName;
                  const fallbackLabel = `Chart ${i + 1}`;
                  return (
                    <div
                      key={path}
                      className="relative w-full min-w-full flex flex-col gap-0 rounded-lg border border-sidebar-border bg-sidebar/50 overflow-hidden"
                    >
                      <textarea
                        value={displayName}
                        onChange={(e) =>
                          setDraftNames((prev) => ({
                            ...prev,
                            [path]: e.target.value,
                          }))
                        }
                        onBlur={async (e) => {
                          const value = (e.target.value || "").trim();
                          if (value !== savedName) {
                            await handleUpdateImageName(path, value);
                          } else {
                            setDraftNames((prev) => {
                              const next = { ...prev };
                              delete next[path];
                              return next;
                            });
                          }
                        }}
                        placeholder={fallbackLabel}
                        rows={1}
                        className="resize-none px-3 py-2 border-b border-sidebar-border bg-sidebar/80 text-xs font-semibold uppercase tracking-wider text-dashboard-foreground placeholder:text-dashboard-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary w-full min-w-0 break-words overflow-auto rounded-none"
                      />
                      <div className="relative w-full min-h-[120px]">
                        <button
                          type="button"
                          onClick={() => setZoomedImageSrc(url)}
                          className="block w-full"
                        >
                          <img
                            src={url}
                            alt={`Chart ${i + 1}`}
                            className="w-full max-h-[70vh] object-contain"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDeleteImage({
                              path,
                              pairName: displayEntry.pairName,
                              caption: displayName || fallbackLabel,
                            })
                          }
                          className="absolute top-2 right-2 rounded-full bg-red-500 text-white w-7 h-7 flex items-center justify-center shadow hover:bg-red-600 transition-colors"
                          aria-label="Delete image"
                          title="Delete image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {saveError && (
              <p className="text-sm text-red-400">{saveError}</p>
            )}
            {(!displayEntry.thesis?.notes || displayEntry.thesis.notes.trim() === "") &&
              images.length === 0 && (
                <p className="text-sm text-dashboard-foreground/50 italic">
                  No thesis or images.
                </p>
              )}
          </div>
            )}

            {activeSection === "analysis" && (
              <div className="flex-1 min-h-0 flex flex-row gap-3 px-4 py-4 min-w-0 items-stretch">
                <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col rounded-lg border border-sidebar-border bg-sidebar/30 overflow-hidden">
                  <div className="shrink-0 px-3 py-2 border-b border-sidebar-border flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-dashboard-foreground truncate">
                      Base — {displayEntry.baseAsset.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPickerSide("base")}
                      className="shrink-0 text-xs font-medium rounded-md border border-sidebar-border px-2 py-1 hover:bg-sidebar-hover text-dashboard-foreground"
                    >
                      Link
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
                    {baseStreamGroups.length === 0 ? (
                      <p className="text-xs text-dashboard-foreground/50 italic px-1">
                        No linked analyses. Use Link to choose cards from this asset&apos;s stream.
                      </p>
                    ) : (
                      <>
                        <p className="text-[10px] text-dashboard-foreground/45 italic px-1 mb-2">
                          Triple-click a linked card to unlink it.
                        </p>
                        {baseStreamGroups.map(
                          ({
                            entry: streamEntry,
                            separatorType,
                            yearGroup,
                            monthGroup,
                            weekGroup,
                            dateGroup,
                          }) => (
                            <div key={streamEntry.id} className="pb-1">
                              <StreamEntryComponent
                                entry={streamEntry}
                                separatorType={separatorType}
                                yearGroup={yearGroup}
                                monthGroup={monthGroup}
                                weekGroup={weekGroup}
                                dateGroup={dateGroup}
                                fillColumnWidth
                                onTripleClick={() => void removeBaseLink(streamEntry.id)}
                              />
                            </div>
                          ),
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col rounded-lg border border-sidebar-border bg-sidebar/30 overflow-hidden">
                  <div className="shrink-0 px-3 py-2 border-b border-sidebar-border flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-dashboard-foreground truncate">
                      Quote — {displayEntry.quoteAsset.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPickerSide("quote")}
                      className="shrink-0 text-xs font-medium rounded-md border border-sidebar-border px-2 py-1 hover:bg-sidebar-hover text-dashboard-foreground"
                    >
                      Link
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
                    {quoteStreamGroups.length === 0 ? (
                      <p className="text-xs text-dashboard-foreground/50 italic px-1">
                        No linked analyses. Use Link to choose cards from this asset&apos;s stream.
                      </p>
                    ) : (
                      <>
                        <p className="text-[10px] text-dashboard-foreground/45 italic px-1 mb-2">
                          Triple-click a linked card to unlink it.
                        </p>
                        {quoteStreamGroups.map(
                          ({
                            entry: streamEntry,
                            separatorType,
                            yearGroup,
                            monthGroup,
                            weekGroup,
                            dateGroup,
                          }) => (
                            <div key={streamEntry.id} className="pb-1">
                              <StreamEntryComponent
                                entry={streamEntry}
                                separatorType={separatorType}
                                yearGroup={yearGroup}
                                monthGroup={monthGroup}
                                weekGroup={weekGroup}
                                dateGroup={dateGroup}
                                fillColumnWidth
                                onTripleClick={() => void removeQuoteLink(streamEntry.id)}
                              />
                            </div>
                          ),
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
          </>
          )}
        </DialogContent>
      </Dialog>

      {displayEntry && pickerSide ? (
        <WatchItemAnalysisLinkPickerModal
          open
          onOpenChange={(o) => !o && setPickerSide(null)}
          assetId={
            pickerSide === "base"
              ? displayEntry.baseAsset.id
              : displayEntry.quoteAsset.id
          }
          assetLabel={
            pickerSide === "base"
              ? displayEntry.baseAsset.name
              : displayEntry.quoteAsset.name
          }
          assetType={
            pickerSide === "base"
              ? displayEntry.baseAsset.type
              : displayEntry.quoteAsset.type
          }
          initialSelectedIds={
            pickerSide === "base" ? linkedBaseIds : linkedQuoteIds
          }
          onApply={async (ids) => {
            const updated = await updateWatchItem(displayEntry.id, {
              linkedBaseAnalysisIds:
                pickerSide === "base" ? ids : linkedBaseIds,
              linkedQuoteAnalysisIds:
                pickerSide === "quote" ? ids : linkedQuoteIds,
            });
            setEntryToShow(updated);
            if (pickerSide === "base") setLinkedBaseIds(ids);
            else setLinkedQuoteIds(ids);
          }}
        />
      ) : null}

      {zoomedImageSrc && (
        <Dialog
          open={!!zoomedImageSrc}
          onOpenChange={(o) => !o && setZoomedImageSrc(null)}
        >
          <DialogContent showClose className="bg-black/95 border-0">
            <div className="relative w-full h-[90dvh] flex items-center justify-center">
              <img
                src={zoomedImageSrc}
                alt="Zoomed"
                className="max-w-full max-h-full w-auto h-auto object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

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
      <ConfirmDeleteDialog
        open={pendingDeleteImage != null}
        onOpenChange={(o) => !o && setPendingDeleteImage(null)}
        title="Remove this thesis image?"
        description="The image will be removed from this pair and deleted from storage."
        details={
          pendingDeleteImage
            ? [
                `Pair: ${pendingDeleteImage.pairName}`,
                `Caption: ${pendingDeleteImage.caption}`,
                `Storage path: ${pendingDeleteImage.path}`,
              ].join("\n")
            : undefined
        }
        confirmLabel="Remove image"
        onConfirm={async () => {
          if (pendingDeleteImage) await handleDeleteImage(pendingDeleteImage.path);
        }}
      />
    </>
  );
}
