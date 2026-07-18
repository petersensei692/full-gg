"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Wrench, PenLine, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type {
  WeeklyWatchlist,
  AssetWatchlist,
  CreateWatchItemDto,
  WatchItem,
  TradingPair,
} from "@/types/api";
import type { WatchlistBias } from "@/types/calendar";
import { useAnalysisEditorPaste } from "@/hooks/useAnalysisEditorPaste";
import { deleteStoredImage } from "@/lib/imageUpload";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { AttachedImagesStrip } from "@/components/analysis/AttachedImagesStrip";
import { getImageUrl } from "@/lib/imageUrls";
import { readEditorHtml, sanitizeRichHtml } from "@/lib/sanitizeRichHtml";
import { useAssets } from "@/context/AssetsContext";
import { assetWatchlistService } from "@/lib/api";
import { pairsService } from "@/lib/services/pairs.service";
import { clearDraft, loadDraftJson, saveDraftJson } from "@/lib/form-drafts";
import { ScrollableSelect } from "@/components/ui/ScrollableSelect";

interface CreatePairModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars?: WeeklyWatchlist[];
  selectedCalendarId?: string | null;
  assetWatchlists?: AssetWatchlist[];
  selectedAssetWatchlistId?: string | null;
  currentAssetSlug: string;
  currentAssetLabel: string;
  mode?: "create" | "edit";
  initialItem?: WatchItem;
  onSubmit: (dto: CreateWatchItemDto) => void;
}

type PairModalDraftV1 = {
  v: 1;
  calendarId: string;
  tradingPairId: string;
  bias: WatchlistBias;
  html: string;
  imagePaths: string[];
};

export function CreatePairModal({
  open,
  onOpenChange,
  calendars = [],
  selectedCalendarId = null,
  assetWatchlists = [],
  selectedAssetWatchlistId = null,
  currentAssetSlug,
  currentAssetLabel,
  mode = "create",
  initialItem,
  onSubmit,
}: CreatePairModalProps) {
  const { assets: assetOptions } = useAssets();
  const useAssetWatchlistMode = assetWatchlists.length > 0;
  const [calendarId, setCalendarId] = useState(selectedCalendarId || "");
  const [allAssetWatchlistsForWeek, setAllAssetWatchlistsForWeek] = useState<
    AssetWatchlist[]
  >([]);
  const [catalogPairs, setCatalogPairs] = useState<TradingPair[]>([]);
  const [tradingPairId, setTradingPairId] = useState("");
  const [thesisHtml, setThesisHtml] = useState("");
  const [bias, setBias] = useState<WatchlistBias>("bullish");
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);
  const [thesisImages, setThesisImages] = useState<Array<{ path: string; url: string }>>([]);
  const [error, setError] = useState("");
  const [imagePendingRemove, setImagePendingRemove] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const thesisRef = useRef<HTMLDivElement>(null);

  const selectedAssetWatchlist = assetWatchlists.find(
    (aw) => aw.id === selectedAssetWatchlistId
  );

  const currentAssetId = useMemo(
    () => assetOptions.find((a) => a.slug === currentAssetSlug)?.id,
    [assetOptions, currentAssetSlug],
  );

  const pairsForAsset = useMemo(() => {
    if (!currentAssetId) return [];
    return catalogPairs.filter(
      (p) => p.baseAssetId === currentAssetId || p.quoteAssetId === currentAssetId,
    );
  }, [catalogPairs, currentAssetId]);

  const selectedCatalogPair = useMemo(
    () => pairsForAsset.find((p) => p.id === tradingPairId) ?? null,
    [pairsForAsset, tradingPairId],
  );

  const pairDraftStorageKey = useMemo(
    () => `watch-pair:${currentAssetSlug}:${mode}:${initialItem?.id ?? "new"}`,
    [currentAssetSlug, mode, initialItem?.id],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    pairsService
      .getAll()
      .then((pairs) => {
        if (!cancelled) setCatalogPairs(Array.isArray(pairs) ? pairs : []);
      })
      .catch(() => {
        if (!cancelled) setCatalogPairs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open && useAssetWatchlistMode && selectedAssetWatchlist) {
      assetWatchlistService
        .getByWeeklyWatchlist(selectedAssetWatchlist.weeklyWatchlist.id)
        .then(setAllAssetWatchlistsForWeek)
        .catch(() => setAllAssetWatchlistsForWeek([]));
    } else {
      setAllAssetWatchlistsForWeek([]);
    }
  }, [open, useAssetWatchlistMode, selectedAssetWatchlist?.id]);

  useEffect(() => {
    if (!open) {
      setError("");
      return;
    }
    const stored = loadDraftJson<PairModalDraftV1>(pairDraftStorageKey);
    if (stored?.v === 1) {
      setCalendarId(stored.calendarId ?? "");
      setTradingPairId(stored.tradingPairId ?? "");
      setBias(stored.bias ?? "bullish");
      setThesisHtml(sanitizeRichHtml(stored.html ?? ""));
      if (stored.imagePaths?.length) {
        setThesisImages(stored.imagePaths.map((path) => ({ path, url: getImageUrl(path) })));
      } else {
        setThesisImages([]);
      }
      const draftHtml = sanitizeRichHtml(stored.html ?? "");
      const applyDraft = () => {
        if (thesisRef.current) thesisRef.current.innerHTML = draftHtml;
      };
      applyDraft();
      const d1 = setTimeout(applyDraft, 0);
      const d2 = setTimeout(applyDraft, 50);
      setError("");
      return () => {
        clearTimeout(d1);
        clearTimeout(d2);
      };
    }

    const applyInitial = () => {
      if (mode === "edit" && initialItem) {
        const wlId =
          initialItem.baseAssetWatchlist?.weeklyWatchlist?.id ??
          initialItem.quoteAssetWatchlist?.weeklyWatchlist?.id ??
          initialItem.watchlist?.id;
        setCalendarId(wlId ?? "");
        setTradingPairId(initialItem.tradingPairId ?? initialItem.tradingPair?.id ?? "");
        const notes = sanitizeRichHtml(initialItem.thesis?.notes ?? "");
        const images = (initialItem.thesis?.images ?? []).map((path) => ({
          path,
          url: getImageUrl(path),
        }));
        setThesisHtml(notes);
        setBias((initialItem.bias as WatchlistBias) ?? "bullish");
        setThesisImages(images);
        if (thesisRef.current) {
          thesisRef.current.innerHTML = notes;
        }
      } else {
        setCalendarId((selectedCalendarId ?? calendars[0]?.id) ?? "");
        setTradingPairId("");
        setThesisHtml("");
        setBias("bullish");
        setThesisImages([]);
        if (thesisRef.current) {
          thesisRef.current.innerHTML = "";
        }
      }
      setError("");
    };
    applyInitial();
    const t = setTimeout(applyInitial, 0);
    const t2 = setTimeout(applyInitial, 50);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [
    open,
    selectedCalendarId,
    calendars?.length,
    calendars?.[0]?.id,
    useAssetWatchlistMode,
    selectedAssetWatchlist?.id,
    currentAssetSlug,
    mode,
    initialItem?.id,
    initialItem?.tradingPairId,
    initialItem?.thesis?.notes,
    initialItem?.thesis?.images?.length,
    initialItem?.thesis?.images?.[0],
    pairDraftStorageKey,
  ]);

  useEffect(() => {
    if (!open || tradingPairId) return;
    if (pairsForAsset.length > 0) {
      setTradingPairId(pairsForAsset[0].id);
    }
  }, [open, tradingPairId, pairsForAsset]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const html = thesisRef.current?.innerHTML ?? "";
      const paths = thesisImages.map((i) => i.path);
      saveDraftJson(pairDraftStorageKey, {
        v: 1,
        calendarId,
        tradingPairId,
        bias,
        html,
        imagePaths: paths,
      } satisfies PairModalDraftV1);
    }, 500);
    return () => window.clearTimeout(t);
  }, [
    open,
    pairDraftStorageKey,
    calendarId,
    tradingPairId,
    bias,
    thesisHtml,
    thesisImages,
  ]);

  const { handlePaste: handleThesisPaste, handleDrop: handleThesisDrop } = useAnalysisEditorPaste({
    editorRef: thesisRef,
    onImageReady: (img) => setThesisImages((prev) => [...prev, img]),
  });

  const pairLabel = selectedCatalogPair?.pair ?? "—";

  const applyFormat = useCallback((cmd: "bold" | "italic" | "underline") => {
    document.execCommand(cmd, false);
    thesisRef.current?.focus();
  }, []);

  const applyHeading = useCallback((block: "h1" | "h2" | "h3" | "p") => {
    document.execCommand("formatBlock", false, block);
    thesisRef.current?.focus();
  }, []);

  const preventFocusLoss = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const buildThesisPayload = () => {
    const thesisNotes = readEditorHtml(thesisRef.current);
    const origImages = initialItem?.thesis?.images ?? [];
    const origNames = initialItem?.thesis?.imageNames ?? [];
    const imageNames =
      mode === "edit" && origNames.length > 0
        ? thesisImages.map((img) => origNames[origImages.indexOf(img.path)] ?? "")
        : undefined;
    if (!thesisNotes && thesisImages.length === 0) return undefined;
    return {
      notes: thesisNotes,
      images: thesisImages.map((img) => img.path),
      imageNames,
    };
  };

  const handleSave = () => {
    setError("");
    if (!tradingPairId || !selectedCatalogPair) {
      setError(`Select a catalog pair that includes ${currentAssetLabel}.`);
      return;
    }
    const thesisPayload = buildThesisPayload();
    let dto: CreateWatchItemDto;

    if (useAssetWatchlistMode && allAssetWatchlistsForWeek.length > 0) {
      const baseAW = allAssetWatchlistsForWeek.find(
        (aw) => aw.asset.id === selectedCatalogPair.baseAssetId,
      );
      const quoteAW = allAssetWatchlistsForWeek.find(
        (aw) => aw.asset.id === selectedCatalogPair.quoteAssetId,
      );
      if (!baseAW || !quoteAW) {
        setError(
          "Could not find asset watchlists for both legs of this pair in the selected week.",
        );
        return;
      }
      dto = {
        tradingPairId,
        baseAssetWatchlistId: baseAW.id,
        quoteAssetWatchlistId: quoteAW.id,
        bias,
        thesis: thesisPayload,
      };
    } else if (calendarId) {
      dto = {
        tradingPairId,
        watchlistId: calendarId,
        bias,
        thesis: thesisPayload,
      };
    } else {
      setError("Select a watchlist.");
      return;
    }

    onSubmit(dto);
    clearDraft(pairDraftStorageKey);
    setThesisHtml("");
    setThesisImages([]);
    setTradingPairId("");
    onOpenChange(false);
  };

  const runDiscard = () => {
    clearDraft(pairDraftStorageKey);
    setThesisHtml("");
    thesisImages.forEach((img) => {
      deleteStoredImage(img.path).catch(() => undefined);
    });
    setThesisImages([]);
    setError("");
    setDiscardConfirmOpen(false);
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={true}
        containToMain={true}
        className="max-h-[85dvh] flex flex-col items-stretch justify-start overflow-hidden bg-sidebar border border-sidebar-border rounded-xl p-0 shadow-xl"
      >
        <div className="scrollbar-modal flex flex-col min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="space-y-6 min-w-0 overflow-x-hidden p-4 sm:p-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-dashboard-foreground/60">
              {mode === "edit" ? "Edit entry" : "New entry"}
            </span>
            <h3 className="text-xl font-semibold text-dashboard-foreground mt-1">
              {mode === "edit" ? "Edit Watchlist Pair" : "Weekly Watchlist Creator"}
            </h3>
            <p className="text-sm text-dashboard-foreground/70 mt-0.5">
              {mode === "edit"
                ? "Update your trading pair and thesis."
                : "Define your trading pairs and document your fundamental thesis for the upcoming session."}
            </p>
          </div>

          {useAssetWatchlistMode ? (
            <div>
              <label className="block text-sm font-medium text-dashboard-foreground/80 mb-2">
                Watchlist
              </label>
              <p className="text-sm text-dashboard-foreground/70 py-2">
                {selectedAssetWatchlist
                  ? `${new Date(selectedAssetWatchlist.startDate).toISOString().slice(0, 10)} → ${new Date(
                      selectedAssetWatchlist.endDate
                    ).toISOString().slice(0, 10)}`
                  : "No watchlist selected"}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-dashboard-foreground/80 mb-2">
                Weekly watchlist
              </label>
              <ScrollableSelect
                value={calendarId}
                onChange={setCalendarId}
                placeholder="Select a watchlist..."
                options={calendars.map((cal) => ({
                  value: cal.id,
                  label: `${new Date(cal.startDate).toISOString().slice(0, 10)} → ${new Date(
                    cal.endDate
                  ).toISOString().slice(0, 10)}`,
                }))}
                aria-label="Weekly watchlist"
              />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-dashboard-foreground/80 mb-2">
              <Wrench className="h-4 w-4" />
              Trading pair
            </div>
            <ScrollableSelect
              value={tradingPairId}
              onChange={setTradingPairId}
              aria-label="Trading pair"
              placeholder={
                pairsForAsset.length === 0
                  ? `No catalog pairs for ${currentAssetLabel}`
                  : "Select a pair…"
              }
              options={pairsForAsset.map((p) => ({
                value: p.id,
                label: `${p.pair}${p.pipValue == null ? " (no pip)" : ""}`,
              }))}
              maxVisible={5}
            />
            <div className="mt-2 rounded-lg border border-sidebar-border bg-sidebar/50 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-dashboard-foreground/60">
                Pair
              </span>
              <p className="text-lg font-semibold text-primary mt-0.5">{pairLabel}</p>
            </div>
            {pairsForAsset.length === 0 && (
              <p className="text-xs text-red-400 mt-1">
                Add a pair including {currentAssetLabel} on the Pairs page.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dashboard-foreground/80 mb-2">
              Bias
            </label>
            <ScrollableSelect
              value={bias}
              onChange={(v) => setBias(v as WatchlistBias)}
              options={[
                { value: "bullish", label: "Bullish" },
                { value: "bearish", label: "Bearish" },
              ]}
              aria-label="Bias"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-dashboard-foreground/80 mb-2">
              <PenLine className="h-4 w-4" />
              Technical Thesis & Notes
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {(["bold", "italic", "underline"] as const).map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onMouseDown={preventFocusLoss}
                  onClick={() => applyFormat(cmd)}
                  className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors text-xs font-medium capitalize"
                >
                  {cmd === "bold" ? "B" : cmd === "italic" ? "I" : "U"}
                </button>
              ))}
              {(["h1", "h2", "h3"] as const).map((block) => (
                <button
                  key={block}
                  type="button"
                  onMouseDown={preventFocusLoss}
                  onClick={() => applyHeading(block)}
                  className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors text-xs font-semibold"
                >
                  {block.toUpperCase()}
                </button>
              ))}
              <button
                type="button"
                onMouseDown={preventFocusLoss}
                onClick={() => applyHeading("p")}
                className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors text-xs"
                aria-label="Normal text"
                title="Normal text"
              >
                P
              </button>
            </div>
            <div
              ref={thesisRef}
              contentEditable
              spellCheck={false}
              data-placeholder="Start typing your technical thesis... (Key levels, RSI divergence, Order block confirmation)"
              onPaste={handleThesisPaste}
              onDrop={handleThesisDrop}
              onInput={() => setThesisHtml(thesisRef.current?.innerHTML ?? "")}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.tagName === "IMG" && target instanceof HTMLImageElement) {
                  setZoomedImageSrc(target.src);
                }
              }}
              className="min-h-[120px] max-h-[280px] w-full min-w-0 overflow-y-auto overflow-x-hidden rounded-lg border border-sidebar-border bg-header-input px-3 py-2.5 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary break-words [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-dashboard-foreground/50 [&_*]:break-words [&_img]:max-w-[50%] [&_img]:max-h-[200px] [&_img]:w-[50%] [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:block [&_img]:my-2 [&_u]:underline [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium"
              suppressContentEditableWarning
              suppressHydrationWarning
            />
            {thesisImages.length > 0 && (
              <AttachedImagesStrip
                items={thesisImages}
                onReorder={setThesisImages}
                onRemove={(path) => setImagePendingRemove(path)}
                variant="cover"
                label="Thesis images — click to preview · drag to reorder"
              />
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-sidebar-border">
            <button
              type="button"
              onClick={() => setDiscardConfirmOpen(true)}
              className="rounded-lg border border-sidebar-border px-4 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!tradingPairId || !selectedCatalogPair}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {mode === "edit" ? "Save changes" : "Save to Watchlist"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        </div>

        {zoomedImageSrc && (
          <Dialog open={!!zoomedImageSrc} onOpenChange={(o) => !o && setZoomedImageSrc(null)}>
            <DialogContent showClose className="bg-black/95 border-0">
              <div className="relative w-full h-[90dvh] flex items-center justify-center">
                <img
                  src={zoomedImageSrc}
                  alt="Chart"
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>

    <ConfirmDeleteDialog
      open={imagePendingRemove != null}
      onOpenChange={(o) => !o && setImagePendingRemove(null)}
      title="Remove this thesis image?"
      description="It will be removed from this draft and deleted from storage."
      details={imagePendingRemove ? `Storage path: ${imagePendingRemove}` : undefined}
      confirmLabel="Remove image"
      onConfirm={async () => {
        if (imagePendingRemove) {
          const path = imagePendingRemove;
          setThesisImages((prev) => prev.filter((p) => p.path !== path));
          await deleteStoredImage(path).catch(() => undefined);
        }
      }}
    />
    <ConfirmDeleteDialog
      open={discardConfirmOpen}
      onOpenChange={setDiscardConfirmOpen}
      title="Discard this watchlist pair draft?"
      description="You will lose any unsaved pair and thesis. Uploaded images still in this draft will be deleted from storage."
      details={[
        `Pair: ${pairLabel}`,
        `Mode: ${mode === "edit" ? "Edit" : "Create"}`,
        `Thesis images in draft: ${thesisImages.length}`,
      ].join("\n")}
      confirmLabel="Discard"
      onConfirm={async () => {
        runDiscard();
      }}
    />
    </>
  );
}
