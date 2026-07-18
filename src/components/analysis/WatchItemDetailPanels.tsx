"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type { AllAnalysisItem, WatchItem } from "@/types/api";
import { useWatchlistCalendar } from "@/context/WatchlistCalendarContext";
import { deleteStoredImage } from "@/lib/imageUpload";
import { getImageUrl } from "@/lib/imageUrls";
import { sanitizeRichHtml } from "@/lib/sanitizeRichHtml";
import { allAnalysisService } from "@/lib/api";
import {
  mapAllAnalysisItemsToStreamEntries,
  orderStreamEntriesByIds,
} from "@/lib/all-analysis-map";
import { buildStreamEntryGroups } from "@/lib/analysis-stream-entry-groups";
import { StreamEntry as StreamEntryComponent } from "@/components/analysis/StreamEntry";
import { WatchItemAnalysisLinkPickerModal } from "@/components/analysis/WatchItemAnalysisLinkPickerModal";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type FocusSection = "main" | "analysis";
type AnalysisSide = "base" | "quote";

function watchPairLabel(entry: WatchItem): string {
  return entry.tradingPair?.pair ?? entry.pairName;
}

export type WatchItemDetailPanelsProps = {
  entry: WatchItem;
  mode: "editable" | "readonly";
  /** Called when editable actions update the watch item (link/unlink/image). */
  onEntryChange?: (entry: WatchItem) => void;
  /** Fired when the analysis link picker opens/closes (editable mode). */
  onPickerOpenChange?: (open: boolean) => void;
  className?: string;
};

export function WatchItemDetailPanels({
  entry,
  mode,
  onEntryChange,
  onPickerOpenChange,
  className = "",
}: WatchItemDetailPanelsProps) {
  const editable = mode === "editable";
  const { updateWatchItem } = useWatchlistCalendar();

  const [activeSection, setActiveSection] = useState<FocusSection>("main");
  const [analysisSide, setAnalysisSide] = useState<AnalysisSide>("base");
  const [pickerSide, setPickerSide] = useState<"base" | "quote" | null>(null);
  const [linkedBaseIds, setLinkedBaseIds] = useState<string[]>([]);
  const [linkedQuoteIds, setLinkedQuoteIds] = useState<string[]>([]);
  const [basePool, setBasePool] = useState<AllAnalysisItem[]>([]);
  const [quotePool, setQuotePool] = useState<AllAnalysisItem[]>([]);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);
  const [pendingDeleteImage, setPendingDeleteImage] = useState<{
    path: string;
    pairName: string;
    caption: string;
  } | null>(null);

  useEffect(() => {
    setActiveSection("main");
    setAnalysisSide("base");
    setDraftNames({});
    setSaveError(null);
  }, [entry.id]);

  useEffect(() => {
    onPickerOpenChange?.(pickerSide != null);
  }, [pickerSide, onPickerOpenChange]);

  useEffect(() => {
    setLinkedBaseIds(entry.linkedBaseAnalysisIds ?? []);
    setLinkedQuoteIds(entry.linkedQuoteAnalysisIds ?? []);
  }, [entry.id, entry.linkedBaseAnalysisIds, entry.linkedQuoteAnalysisIds]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [b, q] = await Promise.all([
          allAnalysisService.getAll(entry.baseAsset.id),
          allAnalysisService.getAll(entry.quoteAsset.id),
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
  }, [entry.baseAsset?.id, entry.quoteAsset?.id]);

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

  const images = entry.thesis?.images ?? [];
  const savedNames = entry.thesis?.imageNames ?? [];

  const removeBaseLink = useCallback(
    async (analysisId: string) => {
      if (!editable) return;
      const next = linkedBaseIds.filter((id) => id !== analysisId);
      setLinkedBaseIds(next);
      try {
        const updated = await updateWatchItem(entry.id, {
          linkedBaseAnalysisIds: next,
          linkedQuoteAnalysisIds: linkedQuoteIds,
        });
        onEntryChange?.(updated);
      } catch {
        setLinkedBaseIds(entry.linkedBaseAnalysisIds ?? []);
      }
    },
    [editable, entry, linkedBaseIds, linkedQuoteIds, updateWatchItem, onEntryChange],
  );

  const removeQuoteLink = useCallback(
    async (analysisId: string) => {
      if (!editable) return;
      const next = linkedQuoteIds.filter((id) => id !== analysisId);
      setLinkedQuoteIds(next);
      try {
        const updated = await updateWatchItem(entry.id, {
          linkedBaseAnalysisIds: linkedBaseIds,
          linkedQuoteAnalysisIds: next,
        });
        onEntryChange?.(updated);
      } catch {
        setLinkedQuoteIds(entry.linkedQuoteAnalysisIds ?? []);
      }
    },
    [editable, entry, linkedBaseIds, linkedQuoteIds, updateWatchItem, onEntryChange],
  );

  const handleUpdateImageName = useCallback(
    async (path: string, name: string) => {
      if (!editable) return;
      setSaveError(null);
      const imageList = entry.thesis?.images ?? [];
      const index = imageList.indexOf(path);
      if (index < 0) return;
      const currentNames = entry.thesis?.imageNames ?? [];
      const nextImageNames = imageList.map((_, i) =>
        i === index ? name : (currentNames[i] ?? ""),
      );
      try {
        const updated = await updateWatchItem(entry.id, {
          thesis: {
            notes: entry.thesis?.notes ?? "",
            images: imageList,
            imageNames: nextImageNames,
          },
        });
        onEntryChange?.(updated);
        setDraftNames((prev) => {
          const next = { ...prev };
          delete next[path];
          return next;
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to save image name";
        setSaveError(msg);
      }
    },
    [editable, entry, updateWatchItem, onEntryChange],
  );

  const handleDeleteImage = async (path: string) => {
    if (!editable || !entry.thesis) return;
    const imageList = entry.thesis.images ?? [];
    const index = imageList.indexOf(path);
    const nextImages = imageList.filter((p) => p !== path);
    const currentNames = entry.thesis.imageNames ?? [];
    const nextImageNames = nextImages.map(
      (_, i) => currentNames[i + (i >= index ? 1 : 0)] ?? "",
    );
    const updated = await updateWatchItem(entry.id, {
      thesis: {
        notes: entry.thesis.notes,
        images: nextImages,
        imageNames: nextImageNames.length > 0 ? nextImageNames : undefined,
      },
    });
    onEntryChange?.(updated);
    await deleteStoredImage(path).catch(() => undefined);
  };

  const emptyLinkedHint = editable
    ? "No linked analyses. Use Link to choose cards from this asset's stream."
    : "No linked analyses.";

  const activeStreamGroups = analysisSide === "base" ? baseStreamGroups : quoteStreamGroups;
  const activeAssetName =
    analysisSide === "base" ? entry.baseAsset.name : entry.quoteAsset.name;
  const activeSideLabel = analysisSide === "base" ? "Base" : "Quote";

  const removeActiveLink = analysisSide === "base" ? removeBaseLink : removeQuoteLink;

  return (
    <>
      <div className={`flex min-h-0 flex-1 flex-col min-w-0 overflow-hidden ${className}`}>
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
              {entry.thesis?.notes && (
                <div
                  className="rich-html-content w-full min-w-0 max-w-full break-words break-all text-sm text-dashboard-foreground/90 leading-relaxed prose prose-sm dark:prose-invert [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium [&_*]:break-words [&_*]:min-w-0 [&_*]:max-w-full [&_img]:max-w-full [&_img]:max-h-[280px] [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:my-2 overflow-hidden"
                  style={
                    {
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    } as React.CSSProperties
                  }
                  dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(entry.thesis.notes) }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === "IMG" && target instanceof HTMLImageElement) {
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
                    const displayName = path in draftNames ? draftNames[path] : savedName;
                    const fallbackLabel = `Chart ${i + 1}`;
                    return (
                      <div
                        key={path}
                        className="relative w-full min-w-full flex flex-col gap-0 rounded-lg border border-sidebar-border bg-sidebar/50 overflow-hidden"
                      >
                        {editable ? (
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
                        ) : (
                          <div className="px-3 py-2 border-b border-sidebar-border bg-sidebar/80 text-xs font-semibold uppercase tracking-wider text-dashboard-foreground">
                            {displayName.trim() || fallbackLabel}
                          </div>
                        )}
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
                          {editable && (
                            <button
                              type="button"
                              onClick={() =>
                                setPendingDeleteImage({
                                  path,
                                  pairName: watchPairLabel(entry),
                                  caption: displayName || fallbackLabel,
                                })
                              }
                              className="absolute top-2 right-2 rounded-full bg-red-500 text-white w-7 h-7 flex items-center justify-center shadow hover:bg-red-600 transition-colors"
                              aria-label="Delete image"
                              title="Delete image"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {saveError && <p className="text-sm text-red-400">{saveError}</p>}
              {(!entry.thesis?.notes || entry.thesis.notes.trim() === "") && images.length === 0 && (
                <p className="text-sm text-dashboard-foreground/50 italic">No thesis or images.</p>
              )}
            </div>
          )}

          {activeSection === "analysis" && (
            <div className="flex-1 min-h-0 flex flex-col gap-3 px-4 py-4 min-w-0">
              <div className="shrink-0 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setAnalysisSide("base")}
                  disabled={analysisSide === "base"}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sidebar-border text-dashboard-foreground hover:bg-sidebar-hover disabled:opacity-40 disabled:pointer-events-none"
                  aria-label={`Show base asset ${entry.baseAsset.name}`}
                  title={`Base — ${entry.baseAsset.name}`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0 text-center px-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-dashboard-foreground/55">
                    {activeSideLabel}
                  </p>
                  <p className="text-sm font-semibold text-dashboard-foreground truncate max-w-[12rem] sm:max-w-[16rem]">
                    {activeAssetName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAnalysisSide("quote")}
                  disabled={analysisSide === "quote"}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sidebar-border text-dashboard-foreground hover:bg-sidebar-hover disabled:opacity-40 disabled:pointer-events-none"
                  aria-label={`Show quote asset ${entry.quoteAsset.name}`}
                  title={`Quote — ${entry.quoteAsset.name}`}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-sidebar-border bg-sidebar/30 overflow-hidden">
                <div className="shrink-0 px-3 py-2 border-b border-sidebar-border flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-dashboard-foreground truncate">
                    {activeSideLabel} — {activeAssetName}
                  </span>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => setPickerSide(analysisSide)}
                      className="shrink-0 text-xs font-medium rounded-md border border-sidebar-border px-2 py-1 hover:bg-sidebar-hover text-dashboard-foreground"
                    >
                      Link
                    </button>
                  )}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
                  {activeStreamGroups.length === 0 ? (
                    <p className="text-xs text-dashboard-foreground/50 italic px-1">{emptyLinkedHint}</p>
                  ) : (
                    <>
                      {editable && (
                        <p className="text-[10px] text-dashboard-foreground/45 italic px-1 mb-2">
                          Triple-click a linked card to unlink it.
                        </p>
                      )}
                      {activeStreamGroups.map(
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
                              onTripleClick={
                                editable ? () => void removeActiveLink(streamEntry.id) : undefined
                              }
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
      </div>

      {editable && pickerSide ? (
        <WatchItemAnalysisLinkPickerModal
          open
          onOpenChange={(o) => !o && setPickerSide(null)}
          assetId={pickerSide === "base" ? entry.baseAsset.id : entry.quoteAsset.id}
          assetLabel={pickerSide === "base" ? entry.baseAsset.name : entry.quoteAsset.name}
          assetType={pickerSide === "base" ? entry.baseAsset.type : entry.quoteAsset.type}
          initialSelectedIds={pickerSide === "base" ? linkedBaseIds : linkedQuoteIds}
          onApply={async (ids) => {
            const updated = await updateWatchItem(entry.id, {
              linkedBaseAnalysisIds: pickerSide === "base" ? ids : linkedBaseIds,
              linkedQuoteAnalysisIds: pickerSide === "quote" ? ids : linkedQuoteIds,
            });
            onEntryChange?.(updated);
            if (pickerSide === "base") setLinkedBaseIds(ids);
            else setLinkedQuoteIds(ids);
          }}
        />
      ) : null}

      {zoomedImageSrc && (
        <Dialog open={!!zoomedImageSrc} onOpenChange={(o) => !o && setZoomedImageSrc(null)}>
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

      {editable && (
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
      )}
    </>
  );
}
