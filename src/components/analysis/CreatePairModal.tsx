"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Wrench, PenLine, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { ASSET_CONFIGS } from "@/types/asset";
import type { WeeklyCalendar, WatchlistEntry } from "@/types/calendar";
import { useImagePaste } from "@/hooks/useImagePaste";

const ASSET_OPTIONS = Object.values(ASSET_CONFIGS);

interface CreatePairModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars: WeeklyCalendar[];
  selectedCalendarId: string | null;
  currentAssetSlug: string;
  currentAssetLabel: string;
  onCreated: (entry: WatchlistEntry) => void;
}

export function CreatePairModal({
  open,
  onOpenChange,
  calendars,
  selectedCalendarId,
  currentAssetSlug,
  currentAssetLabel,
  onCreated,
}: CreatePairModalProps) {
  const [calendarId, setCalendarId] = useState(selectedCalendarId || "");
  const [baseAsset, setBaseAsset] = useState(currentAssetSlug);
  const [quoteAsset, setQuoteAsset] = useState(
    currentAssetSlug === "usd" ? "eur" : "usd"
  );
  const [thesisHtml, setThesisHtml] = useState("");
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);
  const [error, setError] = useState("");
  const thesisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setCalendarId((selectedCalendarId || calendars.find((c) => c.assetSlug === currentAssetSlug)?.id) ?? "");
      setBaseAsset(currentAssetSlug);
      const other = Object.keys(ASSET_CONFIGS).find((s) => s !== currentAssetSlug) ?? "usd";
      setQuoteAsset(other);
      setThesisHtml("");
      setError("");
    }
  }, [open, selectedCalendarId, calendars, currentAssetSlug]);

  const { handlePaste: handleThesisPaste } = useImagePaste({ editorRef: thesisRef });

  const pairName = useMemo(() => {
    const base = ASSET_CONFIGS[baseAsset]?.label ?? baseAsset.toUpperCase();
    const quote = ASSET_CONFIGS[quoteAsset]?.label ?? quoteAsset.toUpperCase();
    return `${base} / ${quote}`;
  }, [baseAsset, quoteAsset]);

  const isValidPair = baseAsset === currentAssetSlug || quoteAsset === currentAssetSlug;

  const applyFormat = useCallback((cmd: "bold" | "italic" | "underline") => {
    document.execCommand(cmd, false);
    thesisRef.current?.focus();
  }, []);

  const applyHeading = useCallback((block: "h1" | "h2" | "h3") => {
    document.execCommand("formatBlock", false, block);
    thesisRef.current?.focus();
  }, []);

  const handleSave = () => {
    setError("");
    if (!calendarId) {
      setError("Select a weekly watchlist.");
      return;
    }
    if (!isValidPair) {
      setError(`Either Base or Quote must be ${currentAssetLabel} (current asset).`);
      return;
    }
    if (baseAsset === quoteAsset) {
      setError("Base and Quote must be different.");
      return;
    }
    const thesis = thesisRef.current?.innerHTML ?? "";
    const entry: WatchlistEntry = {
      id: `wl-${Date.now()}`,
      weeklyCalendarId: calendarId,
      assetSlug: currentAssetSlug,
      baseAsset,
      quoteAsset,
      pairName,
      thesis,
      chartImages: [],
      createdAt: Date.now(),
    };
    onCreated(entry);
    setThesisHtml("");
    setBaseAsset(currentAssetSlug);
    setQuoteAsset(currentAssetSlug === "usd" ? "eur" : "usd");
    onOpenChange(false);
  };

  const handleDiscard = () => {
    setThesisHtml("");
    setError("");
    onOpenChange(false);
  };

  const assetCalendars = useMemo(
    () => calendars.filter((c) => c.assetSlug === currentAssetSlug),
    [calendars, currentAssetSlug]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={true}
        containToMain={true}
        className="max-w-2xl w-full max-h-[85dvh] overflow-y-auto bg-sidebar border border-sidebar-border rounded-xl p-6"
      >
        <div className="space-y-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-dashboard-foreground/60">
              New entry
            </span>
            <h3 className="text-xl font-semibold text-dashboard-foreground mt-1">
              Weekly Watchlist Creator
            </h3>
            <p className="text-sm text-dashboard-foreground/70 mt-0.5">
              Define your trading pairs and document your fundamental thesis for the upcoming session.
            </p>
          </div>

          {/* Weekly watchlist */}
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
              {assetCalendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.startDate} → {cal.endDate}
                </option>
              ))}
            </select>
          </div>

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
                      setQuoteAsset(currentAssetSlug === next ? Object.keys(ASSET_CONFIGS).find((s) => s !== next) ?? "usd" : currentAssetSlug);
                    }
                  }}
                  className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {ASSET_OPTIONS.map((a) => (
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
                      setBaseAsset(currentAssetSlug === next ? Object.keys(ASSET_CONFIGS).find((s) => s !== next) ?? "usd" : currentAssetSlug);
                    }
                  }}
                  className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {ASSET_OPTIONS.map((a) => (
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
              className="min-h-[120px] max-h-[280px] w-full overflow-y-auto rounded-lg border border-sidebar-border bg-header-input px-3 py-2.5 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-dashboard-foreground/50 [&_img]:max-w-[50%] [&_img]:max-h-[200px] [&_img]:w-[50%] [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:block [&_img]:my-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium"
              suppressContentEditableWarning
            />
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
              Save to Watchlist
              <ChevronRight className="h-4 w-4" />
            </button>
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
