"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Wrench, PenLine, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type {
  WeeklyWatchlist,
  AssetWatchlist,
  CreateWatchItemDto,
  WatchItem,
} from "@/types/api";
import type { WatchlistBias } from "@/types/calendar";
import { useImagePaste } from "@/hooks/useImagePaste";
import { deleteStoredImage } from "@/lib/imageUpload";
import { getImageUrl } from "@/lib/imageUrls";
import { useAssets } from "@/context/AssetsContext";
import { assetWatchlistService } from "@/lib/api";

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
  const [baseAsset, setBaseAsset] = useState(currentAssetSlug);
  const [quoteAsset, setQuoteAsset] = useState(
    currentAssetSlug === "usd" ? "eur" : "usd"
  );
  const [thesisHtml, setThesisHtml] = useState("");
  const [bias, setBias] = useState<WatchlistBias>("bullish");
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);
  const [thesisImages, setThesisImages] = useState<Array<{ path: string; url: string }>>([]);
  const [error, setError] = useState("");
  const thesisRef = useRef<HTMLDivElement>(null);

  const selectedAssetWatchlist = assetWatchlists.find(
    (aw) => aw.id === selectedAssetWatchlistId
  );

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
    const applyInitial = () => {
      if (mode === "edit" && initialItem) {
        const baseSlug =
          assetOptions.find((a) => a.label === initialItem.baseAsset.name)?.slug ??
          initialItem.baseAsset.name.toLowerCase();
        const quoteSlug =
          assetOptions.find((a) => a.label === initialItem.quoteAsset.name)?.slug ??
          initialItem.quoteAsset.name.toLowerCase();
        const wlId =
          initialItem.baseAssetWatchlist?.weeklyWatchlist?.id ??
          initialItem.quoteAssetWatchlist?.weeklyWatchlist?.id ??
          initialItem.watchlist?.id;
        setCalendarId(wlId ?? "");
        setBaseAsset(baseSlug);
        setQuoteAsset(quoteSlug);
        const notes = initialItem.thesis?.notes ?? "";
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
        setCalendarId(
          (selectedCalendarId ?? calendars[0]?.id) ?? ""
        );
        setBaseAsset(currentAssetSlug);
        const other =
          assetOptions.find((a) => a.slug !== currentAssetSlug)?.slug ?? "usd";
        setQuoteAsset(other);
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
    // Defer so DialogContent is mounted and refs are set (Radix renders in portal after open)
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
    assetOptions,
    mode,
    initialItem?.id,
    initialItem?.thesis?.notes,
    initialItem?.thesis?.images?.length,
    initialItem?.thesis?.images?.[0],
  ]);

  const { handlePaste: handleThesisPaste } = useImagePaste({
    onImageReady: (img) => setThesisImages((prev) => [...prev, img]),
  });

  const pairName = useMemo(() => {
    const base = assetOptions.find((a) => a.slug === baseAsset)?.label ?? baseAsset.toUpperCase();
    const quote = assetOptions.find((a) => a.slug === quoteAsset)?.label ?? quoteAsset.toUpperCase();
    return `${base} / ${quote}`;
  }, [baseAsset, quoteAsset, assetOptions]);

  const isValidPair = baseAsset === currentAssetSlug || quoteAsset === currentAssetSlug;

  const applyFormat = useCallback((cmd: "bold" | "italic" | "underline") => {
    document.execCommand(cmd, false);
    thesisRef.current?.focus();
  }, []);

  const applyHeading = useCallback((block: "h1" | "h2" | "h3") => {
    document.execCommand("formatBlock", false, block);
    thesisRef.current?.focus();
  }, []);

  /** Keep editor focus/selection when clicking toolbar so format applies to selection */
  const preventFocusLoss = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleSave = () => {
    setError("");
    if (!isValidPair) {
      setError(`Either Base or Quote must be ${currentAssetLabel} (current asset).`);
      return;
    }
    if (baseAsset === quoteAsset) {
      setError("Base and Quote must be different.");
      return;
    }
    let baseAssetId = assetOptions.find((a) => a.slug === baseAsset)?.id;
    let quoteAssetId = assetOptions.find((a) => a.slug === quoteAsset)?.id;
    if (useAssetWatchlistMode && allAssetWatchlistsForWeek.length > 0) {
      const baseSlug = baseAsset.toLowerCase().replace(/\s/g, "-");
      const quoteSlug = quoteAsset.toLowerCase().replace(/\s/g, "-");
      baseAssetId ??= allAssetWatchlistsForWeek.find(
        (aw) => aw.asset.name.toLowerCase().replace(/\s/g, "-") === baseSlug
      )?.asset.id;
      quoteAssetId ??= allAssetWatchlistsForWeek.find(
        (aw) => aw.asset.name.toLowerCase().replace(/\s/g, "-") === quoteSlug
      )?.asset.id;
    }
    if (!baseAssetId || !quoteAssetId) {
      setError(
        "Could not resolve asset IDs. Ensure the server is running and assets are loaded, then try again."
      );
      return;
    }
    const thesisNotes = thesisRef.current?.innerHTML ?? "";

    let dto: CreateWatchItemDto;
    if (useAssetWatchlistMode && allAssetWatchlistsForWeek.length > 0) {
      const baseAW = allAssetWatchlistsForWeek.find(
        (aw) => aw.asset.id === baseAssetId
      );
      const quoteAW = allAssetWatchlistsForWeek.find(
        (aw) => aw.asset.id === quoteAssetId
      );
      if (!baseAW || !quoteAW) {
        setError("Could not find asset watchlists for the selected pair.");
        return;
      }
      const origImages = initialItem?.thesis?.images ?? [];
      const origNames = initialItem?.thesis?.imageNames ?? [];
      const imageNames =
        mode === "edit" && origNames.length > 0
          ? thesisImages.map(
              (img) => origNames[origImages.indexOf(img.path)] ?? ""
            )
          : undefined;
      const thesisPayload =
        thesisNotes || thesisImages.length
          ? {
              notes: thesisNotes,
              images: thesisImages.map((img) => img.path),
              imageNames,
            }
          : undefined;
      dto = {
        baseAssetWatchlistId: baseAW.id,
        quoteAssetWatchlistId: quoteAW.id,
        baseAssetId,
        quoteAssetId,
        pairName,
        bias,
        thesis: thesisPayload,
      };
    } else if (calendarId) {
      const origImages = initialItem?.thesis?.images ?? [];
      const origNames = initialItem?.thesis?.imageNames ?? [];
      const imageNames =
        mode === "edit" && origNames.length > 0
          ? thesisImages.map(
              (img) => origNames[origImages.indexOf(img.path)] ?? ""
            )
          : undefined;
      const thesisPayload =
        thesisNotes || thesisImages.length
          ? {
              notes: thesisNotes,
              images: thesisImages.map((img) => img.path),
              imageNames,
            }
          : undefined;
      dto = {
        watchlistId: calendarId,
        baseAssetId,
        quoteAssetId,
        pairName,
        bias,
        thesis: thesisPayload,
      };
    } else {
      setError("Select a watchlist.");
      return;
    }
    onSubmit(dto);
    setThesisHtml("");
    setThesisImages([]);
    setBaseAsset(currentAssetSlug);
    setQuoteAsset(currentAssetSlug === "usd" ? "eur" : "usd");
    onOpenChange(false);
  };

  const handleDiscard = () => {
    setThesisHtml("");
    thesisImages.forEach((img) => {
      deleteStoredImage(img.path).catch(() => undefined);
    });
    setThesisImages([]);
    setError("");
    onOpenChange(false);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={true}
        containToMain={true}
        className="max-h-[85dvh] flex flex-col items-stretch justify-start overflow-hidden bg-sidebar border border-sidebar-border rounded-xl p-0 shadow-xl"
      >
        <div className="scrollbar-modal flex flex-col min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="space-y-6 min-w-0 overflow-x-hidden p-6">
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
              <select
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select a watchlist...</option>
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {new Date(cal.startDate).toISOString().slice(0, 10)} →{" "}
                    {new Date(cal.endDate).toISOString().slice(0, 10)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Asset Selection */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-dashboard-foreground/80 mb-2">
              <Wrench className="h-4 w-4" />
              Asset Selection
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-dashboard-foreground/60 mb-1">Base Asset</label>
                <select
                  value={baseAsset}
                  onChange={(e) => {
                    const next = e.target.value;
                    setBaseAsset(next);
                    if (next !== currentAssetSlug && quoteAsset !== currentAssetSlug) {
                      setQuoteAsset(currentAssetSlug);
                    }
                    if (next === quoteAsset) {
                      setQuoteAsset(currentAssetSlug === next ? (assetOptions.find((a) => a.slug !== next)?.slug ?? "usd") : currentAssetSlug);
                    }
                  }}
                  className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {assetOptions.map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-dashboard-foreground/60 mb-1">Quote Asset</label>
                <select
                  value={quoteAsset}
                  onChange={(e) => {
                    const next = e.target.value;
                    setQuoteAsset(next);
                    if (next !== currentAssetSlug && baseAsset !== currentAssetSlug) {
                      setBaseAsset(currentAssetSlug);
                    }
                    if (next === baseAsset) {
                      setBaseAsset(currentAssetSlug === next ? (assetOptions.find((a) => a.slug !== next)?.slug ?? "usd") : currentAssetSlug);
                    }
                  }}
                  className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {assetOptions.map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-2 rounded-lg border border-sidebar-border bg-sidebar/50 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-dashboard-foreground/60">
                Generated pair name
              </span>
              <p className="text-lg font-semibold text-primary mt-0.5">{pairName}</p>
            </div>
            {!isValidPair && (
              <p className="text-xs text-red-400 mt-1">
                One of Base or Quote must be {currentAssetLabel} (current asset).
              </p>
            )}
          </div>

          {/* Bias */}
          <div>
            <label className="block text-sm font-medium text-dashboard-foreground/80 mb-2">
              Bias
            </label>
            <select
              value={bias}
              onChange={(e) => setBias(e.target.value as WatchlistBias)}
              className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
            </select>
          </div>

          {/* Technical Thesis & Notes */}
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
            </div>
            <div
              ref={thesisRef}
              contentEditable
              data-placeholder="Start typing your technical thesis... (Key levels, RSI divergence, Order block confirmation)"
              onPaste={handleThesisPaste}
              onInput={() => setThesisHtml(thesisRef.current?.innerHTML ?? "")}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.tagName === "IMG" && target instanceof HTMLImageElement) {
                  setZoomedImageSrc(target.src);
                }
              }}
              className="min-h-[120px] max-h-[280px] w-full min-w-0 overflow-y-auto overflow-x-hidden rounded-lg border border-sidebar-border bg-header-input px-3 py-2.5 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary break-words break-all [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-dashboard-foreground/50 [&_*]:break-words [&_img]:max-w-[50%] [&_img]:max-h-[200px] [&_img]:w-[50%] [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:block [&_img]:my-2 [&_u]:underline [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium"
              suppressContentEditableWarning
            />
            {thesisImages.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {thesisImages.map((img) => (
                  <div key={img.path} className="relative">
                    <button
                      type="button"
                      onClick={() => setZoomedImageSrc(img.url)}
                      className="block"
                    >
                      <img
                        src={img.url}
                        alt="Thesis attachment"
                        className="h-20 w-28 object-cover rounded-lg border border-sidebar-border hover:border-primary/50 transition-colors"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setThesisImages((prev) => prev.filter((p) => p.path !== img.path));
                        await deleteStoredImage(img.path).catch(() => undefined);
                      }}
                      className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center shadow"
                      aria-label="Remove image"
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-sidebar-border">
            <button
              type="button"
              onClick={handleDiscard}
              className="rounded-lg border border-sidebar-border px-4 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValidPair || baseAsset === quoteAsset}
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
  );
}
