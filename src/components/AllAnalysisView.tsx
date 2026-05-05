"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { StreamEntry } from "@/types/asset";
import type { AllAnalysisItem } from "@/types/api";
import { allAnalysisService, analysisService, globalAnalysisService } from "@/lib/api";
import { buildStreamEntryGroups } from "@/lib/analysis-stream-entry-groups";
import { StreamEntry as StreamEntryComponent } from "./analysis/StreamEntry";
import { FavoritesAnalysisSidebar } from "./analysis/FavoritesAnalysisSidebar";
import { DateRangePicker, type DateRange } from "./analysis/DateRangePicker";
import { SidebarTrigger } from "./SidebarTrigger";
import { buildSectionedAnalysisExportText, downloadAnalysisTxt } from "@/lib/analysis-export";
import { ChevronDown, ChevronUp, Download, SlidersHorizontal, Star } from "lucide-react";

const ANALYSIS_TYPE_TO_TAG: Record<
  string,
  { tag: StreamEntry["tag"]; tagColor: StreamEntry["tagColor"] }
> = {
  daily: { tag: "INTRADAY UPDATE", tagColor: "red" },
  weekly: { tag: "WEEKLY OUTLOOK", tagColor: "blue" },
  monthly: { tag: "MONTHLY OUTLOOK", tagColor: "yellow" },
  qoq: { tag: "QoQ OUTLOOK", tagColor: "green" },
  yearly: { tag: "YEARLY OUTLOOK", tagColor: "maroon" },
  tradeNote: { tag: "TRADE NOTE", tagColor: "blue" },
};

const ANALYSIS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "qoq", label: "QoQ" },
  { value: "yearly", label: "Yearly" },
  { value: "tradeNote", label: "Trade note" },
] as const;

const CURRENCY_ORDER = ["USD", "EUR", "GBP", "JPY", "CAD", "CHF", "AUD", "NZD"];

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function extractAnalysisType(notes: string): { cleanedNotes: string; analysisType: string } {
  const match = notes.match(/<!--analysis-type:([^>]*)-->/);
  const analysisType = match?.[1]?.trim() || "daily";
  const cleanedNotes = notes.replace(/<!--analysis-type:[^>]*-->/, "").trim();
  return { cleanedNotes, analysisType };
}

function normalizeAssetType(t: string | null | undefined): "currency" | "commodity" | "stocks" | "crypto" {
  const v = (t ?? "").toLowerCase();
  if (v === "commodity") return "commodity";
  if (v === "stocks" || v === "bond") return "stocks";
  if (v === "crypto") return "crypto";
  return "currency";
}

export function AllAnalysisView() {
  const [rows, setRows] = useState<AllAnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisFilter, setAnalysisFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(true);
  const [assetsOnly, setAssetsOnly] = useState(false);
  const [globalOnly, setGlobalOnly] = useState(false);
  const [favoritesSidebarOpen, setFavoritesSidebarOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersBtnRef = useRef<HTMLButtonElement | null>(null);
  const filtersPanelRef = useRef<HTMLDivElement | null>(null);
  const [filtersPos, setFiltersPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const streamScrollRef = useRef<HTMLDivElement | null>(null);
  const didInitialAutoScrollRef = useRef(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await allAnalysisService.getAll();
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateFiltersPos = useCallback(() => {
    if (!filtersOpen || !filtersBtnRef.current) return;
    const rect = filtersBtnRef.current.getBoundingClientRect();
    const width = Math.min(320, Math.max(260, window.innerWidth - 16));
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
    if (left < 8) left = 8;
    setFiltersPos({ top: rect.bottom + 6, left, width });
  }, [filtersOpen]);

  useEffect(() => {
    if (!filtersOpen) {
      setFiltersPos(null);
      return;
    }
    updateFiltersPos();
    const onResize = () => updateFiltersPos();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [filtersOpen, updateFiltersPos]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (filtersBtnRef.current?.contains(t)) return;
      if (filtersPanelRef.current?.contains(t)) return;
      if ((t as Element | null)?.closest?.("[data-date-range-picker-panel]")) return;
      setFiltersOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [filtersOpen]);

  const mappedEntries = useMemo((): StreamEntry[] => {
    return rows
      .map((r) => {
        const createdAt = new Date(r.createdAt).getTime();
        const { cleanedNotes, analysisType } = extractAnalysisType(r.notes ?? "");
        const { tag, tagColor } =
          ANALYSIS_TYPE_TO_TAG[analysisType] ??
          ({ tag: "INTRADAY UPDATE" as const, tagColor: "red" as const });
        return {
          id: r.id,
          author: "You",
          time: formatTime(new Date(r.createdAt)),
          tag,
          tagColor,
          title: r.title ?? null,
          content: cleanedNotes,
          createdAt,
          analysisType,
          images: r.images ?? [],
          imageNames: r.imageNames ?? [],
          scopeLabel: r.scopeLabel ?? (r.source === "global" ? "GLOBAL" : r.assetName ?? null),
          globalFullScope: !!r.globalFullScope,
          favorite: !!r.favorite,
        };
      })
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  }, [rows]);

  const filteredEntries = useMemo(() => {
    const rowById = new Map(rows.map((r) => [r.id, r]));
    let list = mappedEntries;
    if (analysisFilter !== "all") {
      list = list.filter((e) => (e.analysisType ?? "daily") === analysisFilter);
    }
    if (dateRange) {
      const startMs = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()).getTime();
      const endMs = new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999).getTime();
      list = list.filter((e) => {
        const t = e.createdAt ?? 0;
        return t >= startMs && t <= endMs;
      });
    }
    if (assetsOnly) {
      list = list.filter((e) => {
        const row = rowById.get(e.id);
        return row?.source === "asset";
      });
    }
    if (globalOnly) {
      list = list.filter((e) => !!e.globalFullScope);
    }
    if (!favoritesOnly) {
      list = list.filter((e) => !e.favorite);
    }
    return list;
  }, [mappedEntries, rows, analysisFilter, dateRange, assetsOnly, globalOnly, favoritesOnly]);

  const favoritesOnlyEntries = useMemo(
    () => filteredEntries.filter((e) => e.favorite),
    [filteredEntries],
  );

  const entriesWithGroups = useMemo(
    () => buildStreamEntryGroups(filteredEntries),
    [filteredEntries],
  );
  const favoritesEntriesWithGroups = useMemo(
    () => buildStreamEntryGroups(favoritesOnlyEntries),
    [favoritesOnlyEntries],
  );

  // Match other analysis pages: on first page entry, jump to latest entries (bottom).
  useEffect(() => {
    if (loading) return;
    if (didInitialAutoScrollRef.current) return;
    didInitialAutoScrollRef.current = true;
    const el = streamScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }, [loading, entriesWithGroups]);

  const handleToggleFavorite = useCallback(
    async (entryId: string, next: boolean) => {
      const row = rows.find((r) => r.id === entryId);
      if (!row) return;
      try {
        if (row.source === "global") {
          await globalAnalysisService.update(entryId, { favorite: next });
        } else {
          await analysisService.update(entryId, { favorite: next });
        }
        setRows((prev) => prev.map((r) => (r.id === entryId ? { ...r, favorite: next } : r)));
      } catch {
        // ignore
      }
    },
    [rows],
  );

  const buildExportSections = useCallback(
    (entries: StreamEntry[]) => {
      const rowById = new Map(rows.map((r) => [r.id, r]));
      const sectionBuckets = {
        globalFull: [] as StreamEntry[],
        globalScopedAssets: [] as StreamEntry[],
        currencies: [] as StreamEntry[],
        cryptos: [] as StreamEntry[],
        commodities: [] as StreamEntry[],
        stocks: [] as StreamEntry[],
      };
      const currencyRank = new Map(CURRENCY_ORDER.map((name, idx) => [name, idx]));

      const sorted = [...entries].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
      for (const e of sorted) {
        const row = rowById.get(e.id);
        if (!row) continue;
        if (row.source === "global") {
          if (row.globalFullScope) sectionBuckets.globalFull.push(e);
          else sectionBuckets.globalScopedAssets.push(e);
          continue;
        }
        const t = normalizeAssetType(row.assetType);
        if (t === "commodity") sectionBuckets.commodities.push(e);
        else if (t === "stocks") sectionBuckets.stocks.push(e);
        else if (t === "crypto") sectionBuckets.cryptos.push(e);
        else sectionBuckets.currencies.push(e);
      }

      const currencySorted = [...sectionBuckets.currencies].sort((a, b) => {
        const ra = rowById.get(a.id);
        const rb = rowById.get(b.id);
        const na = (ra?.assetName ?? "").toUpperCase();
        const nb = (rb?.assetName ?? "").toUpperCase();
        const oa = currencyRank.has(na) ? (currencyRank.get(na) as number) : 999;
        const ob = currencyRank.has(nb) ? (currencyRank.get(nb) as number) : 999;
        if (oa !== ob) return oa - ob;
        if (na !== nb) return na.localeCompare(nb);
        return (a.createdAt ?? 0) - (b.createdAt ?? 0);
      });

      return [
        { title: "Global analysis (global scope)", entries: sectionBuckets.globalFull },
        { title: "Global analysis (assets scope)", entries: sectionBuckets.globalScopedAssets },
        { title: "Currencies", entries: currencySorted },
        { title: "Cryptos", entries: sectionBuckets.cryptos },
        { title: "Commodities", entries: sectionBuckets.commodities },
        { title: "STOCKS", entries: sectionBuckets.stocks },
      ];
    },
    [rows],
  );

  const exportEntries = useCallback(
    (entries: StreamEntry[], kind: "main" | "favorites") => {
      const sections = buildExportSections(entries);
      const text = buildSectionedAnalysisExportText(sections);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadAnalysisTxt(`all-analysis-${kind}-${stamp}.txt`, text);
    },
    [buildExportSections],
  );

  const filtersPanel = (
    <div className="space-y-3">
      <div className="space-y-1">
        <span className="text-xs font-medium text-dashboard-foreground/70">Analysis type</span>
        <select
          value={analysisFilter}
          onChange={(e) => setAnalysisFilter(e.target.value)}
          className="w-full rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {ANALYSIS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <span className="text-xs font-medium text-dashboard-foreground/70">Date range</span>
        <DateRangePicker value={dateRange} onChange={setDateRange} className="w-full" dropdownPlacement="beside" />
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={favoritesOnly}
        onClick={() => setFavoritesOnly((v) => !v)}
        className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          favoritesOnly
            ? "border-primary bg-primary/15 text-dashboard-foreground"
            : "border-sidebar-border bg-sidebar text-dashboard-foreground/70 hover:bg-sidebar-hover hover:text-dashboard-foreground"
        }`}
      >
        Favorites
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={assetsOnly}
        onClick={() => setAssetsOnly((v) => !v)}
        className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          assetsOnly
            ? "border-primary bg-primary/15 text-dashboard-foreground"
            : "border-sidebar-border bg-sidebar text-dashboard-foreground/70 hover:bg-sidebar-hover hover:text-dashboard-foreground"
        }`}
      >
        Assets only
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={globalOnly}
        onClick={() => setGlobalOnly((v) => !v)}
        className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          globalOnly
            ? "border-primary bg-primary/15 text-dashboard-foreground"
            : "border-sidebar-border bg-sidebar text-dashboard-foreground/70 hover:bg-sidebar-hover hover:text-dashboard-foreground"
        }`}
      >
        Global only
      </button>
    </div>
  );

  return (
    <>
      {typeof document !== "undefined" && filtersOpen && filtersPos &&
        createPortal(
          <div
            ref={filtersPanelRef}
            className="fixed max-h-[min(70vh,520px)] overflow-y-auto rounded-lg border border-sidebar-border bg-sidebar p-3 shadow-xl"
            style={{ top: filtersPos.top, left: filtersPos.left, width: filtersPos.width, zIndex: 10000 }}
            role="dialog"
            aria-label="All analysis filters"
          >
            {filtersPanel}
          </div>,
          document.body,
        )}
      <div className="flex h-full min-h-0 flex-col overflow-auto">
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1 flex-col min-w-0 overflow-hidden">
            <div className="h-11 shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-sidebar-border overflow-visible">
              <SidebarTrigger />
              <button
                ref={filtersBtnRef}
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                className="shrink-0 rounded-lg border border-sidebar-border p-2 text-header-muted hover:bg-sidebar-hover hover:text-primary"
                title="Filters"
                aria-label="All analysis filters"
                aria-expanded={filtersOpen}
                aria-haspopup="dialog"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setFavoritesSidebarOpen((o) => !o)}
                className={`shrink-0 rounded-lg border p-2 transition-colors ${
                  favoritesSidebarOpen
                    ? "border-sky-500 bg-sky-500/15 text-sky-500"
                    : "border-sidebar-border bg-sidebar text-dashboard-foreground/70 hover:bg-sidebar-hover hover:text-dashboard-foreground"
                }`}
                aria-pressed={favoritesSidebarOpen}
                title="Show favorite analyses"
                aria-label="Show favorite analyses"
              >
                <Star className={`h-4 w-4 ${favoritesSidebarOpen ? "fill-current" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => exportEntries(filteredEntries, "main")}
                disabled={filteredEntries.length === 0}
                className="shrink-0 rounded-lg border border-sidebar-border p-2 text-header-muted hover:bg-sidebar-hover hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                title="Export filtered analyses (.txt)"
                aria-label="Export filtered analyses"
              >
                <Download className="h-4 w-4" />
              </button>
              <h2 className="flex-1 min-w-0 truncate text-center text-sm font-semibold text-dashboard-foreground sm:text-left">
                All Analysis
              </h2>
            </div>
            <div className="relative flex min-h-0 flex-1 flex-col min-w-0 overflow-hidden">
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <div ref={streamScrollRef} className="absolute inset-0 overflow-x-hidden overflow-y-auto px-6">
                  <div className="w-full max-w-full space-y-0 pb-4">
                    {loading ? (
                      <p className="py-4 text-sm text-dashboard-foreground/70">Loading...</p>
                    ) : (
                      entriesWithGroups.map(({ entry, separatorType, yearGroup, monthGroup, weekGroup, dateGroup }) => (
                        <StreamEntryComponent
                          key={entry.id}
                          entry={entry}
                          separatorType={separatorType}
                          yearGroup={yearGroup}
                          monthGroup={monthGroup}
                          weekGroup={weekGroup}
                          dateGroup={dateGroup}
                          onToggleFavorite={() => handleToggleFavorite(entry.id, !entry.favorite)}
                        />
                      ))
                    )}
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-0 z-20">
                  <div className="pointer-events-auto absolute bottom-4 right-8 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => streamScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                      className="h-9 w-9 rounded-lg border border-sidebar-border bg-sidebar/95 text-dashboard-foreground hover:bg-sidebar-hover transition-colors shadow-md backdrop-blur-sm"
                      aria-label="Go to top"
                      title="Go to top"
                    >
                      <ChevronUp className="h-5 w-5 mx-auto" />
                    </button>
                    <button
                      type="button"
                      onClick={() => streamScrollRef.current?.scrollTo({ top: streamScrollRef.current.scrollHeight, behavior: "smooth" })}
                      className="h-9 w-9 rounded-lg border border-sidebar-border bg-sidebar/95 text-dashboard-foreground hover:bg-sidebar-hover transition-colors shadow-md backdrop-blur-sm"
                      aria-label="Go to bottom"
                      title="Go to bottom"
                    >
                      <ChevronDown className="h-5 w-5 mx-auto" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <FavoritesAnalysisSidebar
              open={favoritesSidebarOpen}
              onOpenChange={setFavoritesSidebarOpen}
              title="Favorite analyses"
              onExport={() => exportEntries(favoritesOnlyEntries, "favorites")}
              exportDisabled={favoritesOnlyEntries.length === 0}
            >
              {favoritesEntriesWithGroups.length === 0 ? (
                <p className="py-8 text-center text-sm text-dashboard-foreground/70">
                  No favorites match the current filters.
                </p>
              ) : (
                <div className="min-w-0 w-full max-w-full space-y-0 pb-4">
                  {favoritesEntriesWithGroups.map(({ entry, separatorType, yearGroup, monthGroup, weekGroup, dateGroup }) => (
                    <StreamEntryComponent
                      key={`fav-${entry.id}`}
                      entry={entry}
                      separatorType={separatorType}
                      yearGroup={yearGroup}
                      monthGroup={monthGroup}
                      weekGroup={weekGroup}
                      dateGroup={dateGroup}
                      fillColumnWidth
                      onToggleFavorite={() => handleToggleFavorite(entry.id, !entry.favorite)}
                    />
                  ))}
                </div>
              )}
            </FavoritesAnalysisSidebar>
          </div>
        </div>
      </div>
    </>
  );
}

