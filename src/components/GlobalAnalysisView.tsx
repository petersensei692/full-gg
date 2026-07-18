"use client";

import { useState, useCallback, useMemo, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import type { StreamEntry } from "@/types/asset";
import type { GlobalAnalysis } from "@/types/api";
import { globalAnalysisService } from "@/lib/api";
import { useAssets } from "@/context/AssetsContext";
import { StreamEntry as StreamEntryComponent } from "./analysis/StreamEntry";
import { PostGlobalAnalysisInput } from "./PostGlobalAnalysisInput";
import { EditAnalysisModal } from "./analysis/EditAnalysisModal";
import { DateRangePicker, type DateRange } from "./analysis/DateRangePicker";
import { ChevronUp, ChevronDown, Download, SlidersHorizontal, Star } from "lucide-react";
import { SidebarTrigger } from "./SidebarTrigger";
import {
  deserializeDateRangeFromStorage,
  saveGlobalAnalysisStreamFilters,
  loadGlobalAnalysisStreamFilters,
  serializeDateRangeForStorage,
  loadFavoritesWindowGlobalFilters,
  saveFavoritesWindowGlobalFilters,
} from "@/lib/analysis-stream-filters";
import { broadcastAnalysisOrFavoriteChanged, subscribeAnalysisOrFavoriteChanged } from "@/lib/analysisBroadcast";
import { buildStreamEntryGroups } from "@/lib/analysis-stream-entry-groups";
import { FavoritesAnalysisSidebar } from "./analysis/FavoritesAnalysisSidebar";
import { buildAnalysisExportText, downloadAnalysisTxt } from "@/lib/analysis-export";
import { ScrollableSelect } from "@/components/ui/ScrollableSelect";

const ANALYSIS_TYPE_TO_TAG: Record<
  string,
  { tag: StreamEntry["tag"]; tagColor: StreamEntry["tagColor"] }
> = {
  daily: { tag: "INTRADAY UPDATE", tagColor: "red" },
  weekly: { tag: "WEEKLY OUTLOOK", tagColor: "blue" },
  monthly: { tag: "MONTHLY OUTLOOK", tagColor: "yellow" },
  qoq: { tag: "QoQ OUTLOOK", tagColor: "green" },
  yearly: { tag: "YEARLY OUTLOOK", tagColor: "maroon" },
};

const ANALYSIS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "qoq", label: "QoQ" },
  { value: "yearly", label: "Yearly" },
] as const;

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function GlobalAnalysisView({ favoritesWindow = false }: { favoritesWindow?: boolean }) {
  const { assets } = useAssets();
  const [list, setList] = useState<GlobalAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisFilter, setAnalysisFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(true);
  /** When true, only entries whose scope is full "global" (all assets) */
  const [globalOnly, setGlobalOnly] = useState(false);
  const [favoritesSidebarOpen, setFavoritesSidebarOpen] = useState(false);
  const [globalFiltersMenuOpen, setGlobalFiltersMenuOpen] = useState(false);
  const [editing, setEditing] = useState<GlobalAnalysis | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const entryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const streamScrollRef = useRef<HTMLDivElement | null>(null);
  const globalFiltersButtonRef = useRef<HTMLButtonElement | null>(null);
  const globalFiltersPanelRef = useRef<HTMLDivElement | null>(null);
  const [globalFiltersDropdownPos, setGlobalFiltersDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const didInitialAutoScrollRef = useRef(false);
  const filtersHydratedRef = useRef(false);
  const skipNextFilterPersistRef = useRef(true);

  useEffect(() => {
    if (favoritesWindow) {
      const stored = loadFavoritesWindowGlobalFilters();
      if (stored) {
        setAnalysisFilter(stored.analysisFilter);
        setDateRange(deserializeDateRangeFromStorage(stored.dateRange));
      }
    } else {
      const stored = loadGlobalAnalysisStreamFilters();
      if (stored) {
        setAnalysisFilter(stored.analysisFilter);
        setDateRange(deserializeDateRangeFromStorage(stored.dateRange));
        setFavoritesOnly(!!stored.favoritesOnly);
        setGlobalOnly(!!stored.globalOnly);
      } else {
        setFavoritesOnly(true);
        setGlobalOnly(false);
      }
    }
    filtersHydratedRef.current = true;
  }, [favoritesWindow]);

  useEffect(() => {
    if (!filtersHydratedRef.current) return;
    if (skipNextFilterPersistRef.current) {
      skipNextFilterPersistRef.current = false;
      return;
    }
    if (favoritesWindow) {
      saveFavoritesWindowGlobalFilters({
        analysisFilter,
        dateRange: serializeDateRangeForStorage(dateRange),
      });
    } else {
      saveGlobalAnalysisStreamFilters({
        analysisFilter,
        favoritesOnly,
        dateRange: serializeDateRangeForStorage(dateRange),
        globalOnly,
      });
    }
  }, [analysisFilter, favoritesWindow, dateRange, globalOnly, favoritesOnly]);

  const updateGlobalFiltersDropdownPosition = useCallback(() => {
    if (!globalFiltersMenuOpen || !globalFiltersButtonRef.current) return;
    const rect = globalFiltersButtonRef.current.getBoundingClientRect();
    const width = Math.min(320, Math.max(260, window.innerWidth - 16));
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
    if (left < 8) left = 8;
    setGlobalFiltersDropdownPos({ top: rect.bottom + 6, left, width });
  }, [globalFiltersMenuOpen]);

  useLayoutEffect(() => {
    if (!globalFiltersMenuOpen) {
      setGlobalFiltersDropdownPos(null);
      return;
    }
    updateGlobalFiltersDropdownPosition();
    const onResize = () => updateGlobalFiltersDropdownPosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [globalFiltersMenuOpen, updateGlobalFiltersDropdownPosition]);

  useEffect(() => {
    if (!globalFiltersMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (globalFiltersButtonRef.current?.contains(t)) return;
      if (globalFiltersPanelRef.current?.contains(t)) return;
      if ((t as Element | null)?.closest?.("[data-date-range-picker-panel]")) return;
      setGlobalFiltersMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [globalFiltersMenuOpen]);

  const fetchList = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const data = await globalAnalysisService.getAll();
      setList(data);
    } catch {
      setList([]);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    return subscribeAnalysisOrFavoriteChanged(() => {
      void fetchList({ silent: true });
    });
  }, [fetchList]);

  const handleCreate = useCallback(
    async (payload: {
      notes: string;
      images: string[];
      imageNames?: string[];
      scope: "global" | string[];
      analysisType: string;
      title?: string;
    }) => {
      const created = await globalAnalysisService.create({
        notes: payload.notes,
        images: payload.images,
        imageNames: payload.imageNames,
        scope: payload.scope,
        analysisType: payload.analysisType,
        title: payload.title?.trim() ? payload.title.trim() : undefined,
      });
      setPendingFocusId(created.id);
      setList((prev) => [...prev, created]);
      broadcastAnalysisOrFavoriteChanged();
    },
    []
  );

  const handleDelete = useCallback(async (id: string) => {
    await globalAnalysisService.delete(id);
    setList((prev) => prev.filter((g) => g.id !== id));
    broadcastAnalysisOrFavoriteChanged();
  }, []);

  const handleEdit = useCallback((ga: GlobalAnalysis) => {
    setEditing(ga);
    setEditModalOpen(true);
  }, []);

  const handleEditSubmit = useCallback(
    async (payload: {
      notes: string;
      images: string[];
      analysisType?: string;
      scope?: "global" | string[];
      title?: string | null;
    }) => {
      if (!editing) return;
      const oldImages = editing.images ?? [];
      const nameByPath = new Map(oldImages.map((p, i) => [p, editing.imageNames?.[i] ?? ""]));
      const nextImageNames = payload.images.map((p) => nameByPath.get(p) ?? "");
      const updated = await globalAnalysisService.update(editing.id, {
        notes: payload.notes,
        images: payload.images.length > 0 ? payload.images : null,
        imageNames:
          nextImageNames.length > 0 || (editing.imageNames?.length ?? 0) > 0
            ? nextImageNames
            : undefined,
        analysisType: payload.analysisType,
        scope: payload.scope,
        title:
          payload.title === undefined
            ? undefined
            : payload.title?.trim()
              ? payload.title.trim()
              : null,
      });
      setPendingFocusId(updated.id);
      setList((prev) => prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)));
      setEditing(null);
      setEditModalOpen(false);
      broadcastAnalysisOrFavoriteChanged();
    },
    [editing]
  );

  const handleUpdateImageName = useCallback(
    async (gaId: string, imagePath: string, name: string) => {
      const ga = list.find((g) => g.id === gaId);
      if (!ga) return;
      const imageList = ga.images ?? [];
      const index = imageList.indexOf(imagePath);
      if (index < 0) return;
      const currentNames = ga.imageNames ?? [];
      const nextImageNames = imageList.map((_, i) => (i === index ? name : (currentNames[i] ?? "")));
      setList((prev) =>
        prev.map((g) => (g.id === gaId ? { ...g, imageNames: nextImageNames } : g))
      );
      const updated = await globalAnalysisService.update(gaId, { imageNames: nextImageNames });
      setList((prev) => prev.map((g) => (g.id === gaId ? { ...g, ...updated } : g)));
    },
    [list]
  );

  const handleReorderImages = useCallback(
    async (gaId: string, orderedPaths: string[]) => {
      const ga = list.find((g) => g.id === gaId);
      if (!ga) return;
      const oldOrder = ga.images ?? [];
      if (orderedPaths.length !== oldOrder.length) return;
      const nameByPath = new Map(oldOrder.map((p, i) => [p, ga.imageNames?.[i] ?? ""]));
      const nextImageNames = orderedPaths.map((p) => nameByPath.get(p) ?? "");
      const updated = await globalAnalysisService.update(gaId, {
        images: orderedPaths,
        imageNames: nextImageNames.length > 0 || (ga.imageNames?.length ?? 0) > 0 ? nextImageNames : undefined,
      });
      setList((prev) => prev.map((g) => (g.id === gaId ? { ...g, ...updated } : g)));
      broadcastAnalysisOrFavoriteChanged();
    },
    [list]
  );

  const handleToggleFavorite = useCallback(async (id: string, next: boolean) => {
    try {
      const updated = await globalAnalysisService.update(id, { favorite: next });
      setList((prev) => prev.map((g) => (g.id === id ? { ...g, ...updated } : g)));
      broadcastAnalysisOrFavoriteChanged();
    } catch {
      /* ignore */
    }
  }, []);

  const visibleGlobalList = useMemo(() => {
    if (favoritesWindow || !globalOnly) return list;
    return list.filter((ga) => ga.scope === "global");
  }, [list, globalOnly, favoritesWindow]);

  const mappedEntries = useMemo((): StreamEntry[] => {
    const entries = visibleGlobalList.map((ga) => {
      const createdAt = new Date(ga.createdAt).getTime();
      const imageList = ga.images ?? [];
      const names = ga.imageNames ?? [];
      const imageNames = imageList.map((_, i) => names[i] ?? "");
      const analysisType = ga.analysisType ?? "daily";
      const { tag, tagColor } =
        ANALYSIS_TYPE_TO_TAG[analysisType] ??
        ({ tag: "INTRADAY UPDATE" as const, tagColor: "red" as const });
      return {
        id: ga.id,
        author: "You",
        time: formatTime(new Date(ga.createdAt)),
        tag,
        tagColor,
        title: ga.title ?? null,
        content: ga.notes,
        createdAt,
        analysisType,
        images: imageList,
        imageNames,
        scopeLabel: ga.scopeDisplay,
        favorite: ga.favorite ?? false,
      };
    });
    /** Oldest first, newest at bottom (same as asset analysis stream) */
    return entries.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  }, [visibleGlobalList]);

  /** All stream filters except the “Favorites” toggle — used so the favorites sidebar always lists favorites under the same filters, independent of that toggle. */
  const entriesAfterFiltersExceptFavoritesToggle = useMemo(() => {
    let entries = mappedEntries;
    if (analysisFilter !== "all") {
      entries = entries.filter((e) => (e.analysisType ?? "daily") === analysisFilter);
    }
    if (dateRange) {
      const startMs = new Date(
        dateRange.start.getFullYear(),
        dateRange.start.getMonth(),
        dateRange.start.getDate()
      ).getTime();
      const endMs = new Date(
        dateRange.end.getFullYear(),
        dateRange.end.getMonth(),
        dateRange.end.getDate(),
        23,
        59,
        59,
        999
      ).getTime();
      entries = entries.filter((e) => {
        const t = e.createdAt ?? 0;
        return t >= startMs && t <= endMs;
      });
    }
    if (favoritesWindow) {
      entries = entries.filter((e) => e.favorite);
    }
    return entries;
  }, [mappedEntries, analysisFilter, dateRange, favoritesWindow]);

  const filteredEntries = useMemo(() => {
    let entries = entriesAfterFiltersExceptFavoritesToggle;
    if (!favoritesOnly) {
      entries = entries.filter((e) => !e.favorite);
    }
    return entries;
  }, [entriesAfterFiltersExceptFavoritesToggle, favoritesOnly]);

  const sidebarFavoriteEntries = useMemo(
    () => entriesAfterFiltersExceptFavoritesToggle.filter((e) => e.favorite),
    [entriesAfterFiltersExceptFavoritesToggle]
  );

  const entriesWithGroups = useMemo(
    () => buildStreamEntryGroups(filteredEntries),
    [filteredEntries]
  );

  const favoritesEntriesWithGroups = useMemo(
    () => buildStreamEntryGroups(sidebarFavoriteEntries),
    [sidebarFavoriteEntries]
  );

  const handleExportEntries = useCallback((entries: StreamEntry[], kind: "main" | "favorites") => {
    const text = buildAnalysisExportText(entries);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `global-analysis-${kind}-${stamp}.txt`;
    downloadAnalysisTxt(filename, text);
  }, []);

  useEffect(() => {
    if (!pendingFocusId || loading) return;
    const target = entryRefs.current[pendingFocusId];
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setPendingFocusId(null);
  }, [pendingFocusId, loading, entriesWithGroups]);

  // On first entry to the page, scroll to the bottom (latest).
  useEffect(() => {
    if (loading) return;
    if (pendingFocusId) return; // focus effect will handle it
    if (didInitialAutoScrollRef.current) return;
    didInitialAutoScrollRef.current = true;
    const el = streamScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }, [loading, pendingFocusId, entriesWithGroups]);

  const scrollToTop = useCallback(() => {
    const el = streamScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = streamScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  const globalFiltersPanel = (
    <div className="space-y-3">
      <div className="space-y-1">
        <span className="text-xs font-medium text-dashboard-foreground/70">Analysis type</span>
        <ScrollableSelect
          value={analysisFilter}
          onChange={setAnalysisFilter}
          options={ANALYSIS_FILTER_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
          aria-label="Analysis type"
        />
      </div>
      <div className="space-y-1">
        <span className="text-xs font-medium text-dashboard-foreground/70">Date range</span>
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          className="w-full"
          dropdownPlacement="beside"
        />
      </div>
      {!favoritesWindow && (
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
      )}
      {!favoritesWindow && (
        <button
          type="button"
          role="switch"
          aria-checked={globalOnly}
          onClick={() => setGlobalOnly((v) => !v)}
          title={
            globalOnly
              ? "Show all global analysis entries"
              : "Show only analyses applied to all assets (global scope)"
          }
          className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            globalOnly
              ? "border-primary bg-primary/15 text-dashboard-foreground"
              : "border-sidebar-border bg-sidebar text-dashboard-foreground/70 hover:bg-sidebar-hover hover:text-dashboard-foreground"
          }`}
        >
          Global only
        </button>
      )}
    </div>
  );

  const globalHeaderBar = (
    <div className="min-h-11 shrink-0 flex flex-wrap items-center gap-2 sm:gap-3 border-b border-sidebar-border overflow-visible px-4 sm:pl-6 sm:pr-10 py-2 sm:py-0">
      <SidebarTrigger />
      <div className="relative shrink-0">
        <button
          ref={globalFiltersButtonRef}
          type="button"
          onClick={() => setGlobalFiltersMenuOpen((o) => !o)}
          className="shrink-0 rounded-lg border border-sidebar-border p-2.5 sm:p-2 text-header-muted hover:bg-sidebar-hover hover:text-primary"
          title="Filters"
          aria-label="Analysis filters"
          aria-expanded={globalFiltersMenuOpen}
          aria-haspopup="dialog"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => handleExportEntries(filteredEntries, "main")}
        disabled={loading || filteredEntries.length === 0}
        className="shrink-0 rounded-lg border border-sidebar-border p-2.5 sm:p-2 text-header-muted hover:bg-sidebar-hover hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
        title="Export filtered analyses (.txt)"
        aria-label="Export filtered analyses"
      >
        <Download className="h-4 w-4" />
      </button>
      {!favoritesWindow && (
        <button
          type="button"
          onClick={() => setFavoritesSidebarOpen((o) => !o)}
          className={`shrink-0 rounded-lg border p-2.5 sm:p-2 transition-colors ${
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
      )}
      <h2 className="flex-1 min-w-0 basis-full sm:basis-auto truncate text-center text-sm font-semibold text-dashboard-foreground sm:text-left order-last sm:order-none mt-1 sm:mt-0">
        Global Analysis
      </h2>
    </div>
  );

  const favoritesPanel =
    favoritesEntriesWithGroups.length === 0 ? (
      <p className="py-8 text-center text-sm text-dashboard-foreground/70">
        No favorites match the current filters.
      </p>
    ) : (
      <div className="min-w-0 w-full max-w-full space-y-0 pb-4">
        {favoritesEntriesWithGroups.map(({ entry, separatorType, yearGroup, monthGroup, weekGroup, dateGroup }) => (
          <div key={`fav-${entry.id}`}>
            <StreamEntryComponent
              entry={entry}
              separatorType={separatorType}
              yearGroup={yearGroup}
              monthGroup={monthGroup}
              weekGroup={weekGroup}
              dateGroup={dateGroup}
              fillColumnWidth
              onDelete={() => handleDelete(entry.id)}
              onUpdateImageName={(path, name) => handleUpdateImageName(entry.id, path, name)}
              onReorderImages={(ordered) => handleReorderImages(entry.id, ordered)}
              onEdit={() => {
                const ga = list.find((g) => g.id === entry.id);
                if (ga) handleEdit(ga);
              }}
              onToggleFavorite={() => handleToggleFavorite(entry.id, !entry.favorite)}
            />
          </div>
        ))}
      </div>
    );

  return (
    <>
      {typeof document !== "undefined" &&
        globalFiltersMenuOpen &&
        globalFiltersDropdownPos &&
        createPortal(
          <div
            ref={globalFiltersPanelRef}
            className="fixed max-h-[min(70vh,520px)] overflow-y-auto rounded-lg border border-sidebar-border bg-sidebar p-3 shadow-xl"
            style={{
              top: globalFiltersDropdownPos.top,
              left: globalFiltersDropdownPos.left,
              width: globalFiltersDropdownPos.width,
              zIndex: 10000,
            }}
            role="dialog"
            aria-label="Global analysis filters"
          >
            {globalFiltersPanel}
          </div>,
          document.body
        )}
      <div className="flex h-full min-h-0 flex-col overflow-auto">
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
            {globalHeaderBar}
            <div className="relative flex min-h-0 flex-1 flex-col min-w-0 overflow-hidden">
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <div
                  ref={streamScrollRef}
                  className="absolute inset-0 overflow-x-hidden overflow-y-auto px-4 sm:px-6"
                >
                  <div className="w-full max-w-full space-y-0 pb-4">
                    {loading ? (
                      <p className="py-4 text-sm text-dashboard-foreground/70">Loading...</p>
                    ) : (
                      entriesWithGroups.map(({ entry, separatorType, yearGroup, monthGroup, weekGroup, dateGroup }) => (
                        <div
                          key={entry.id}
                          ref={(el) => {
                            entryRefs.current[entry.id] = el;
                          }}
                        >
                          <StreamEntryComponent
                            entry={entry}
                            separatorType={separatorType}
                            yearGroup={yearGroup}
                            monthGroup={monthGroup}
                            weekGroup={weekGroup}
                            dateGroup={dateGroup}
                            onDelete={() => handleDelete(entry.id)}
                            onUpdateImageName={(path, name) => handleUpdateImageName(entry.id, path, name)}
                            onReorderImages={(ordered) => handleReorderImages(entry.id, ordered)}
                            onEdit={() => {
                              const ga = list.find((g) => g.id === entry.id);
                              if (ga) handleEdit(ga);
                            }}
                            onToggleFavorite={() =>
                              handleToggleFavorite(entry.id, !entry.favorite)
                            }
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-0 z-20">
                      <div className="pointer-events-auto absolute bottom-4 right-4 sm:right-8 flex flex-col gap-2 pb-[env(safe-area-inset-bottom,0px)]">
                    <button
                      type="button"
                      onClick={scrollToTop}
                      className="h-9 w-9 rounded-lg border border-sidebar-border bg-sidebar/95 text-dashboard-foreground hover:bg-sidebar-hover transition-colors shadow-md backdrop-blur-sm"
                      aria-label="Go to top"
                      title="Go to top"
                    >
                      <ChevronUp className="h-5 w-5 mx-auto" />
                    </button>
                    <button
                      type="button"
                      onClick={scrollToBottom}
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

            </div>

            {!favoritesWindow && (
              <FavoritesAnalysisSidebar
                open={favoritesSidebarOpen}
                onOpenChange={setFavoritesSidebarOpen}
                title="Favorite analyses"
                onExport={() => handleExportEntries(sidebarFavoriteEntries, "favorites")}
                exportDisabled={sidebarFavoriteEntries.length === 0}
              >
                {favoritesPanel}
              </FavoritesAnalysisSidebar>
            )}
          </div>

          {!favoritesWindow && !editModalOpen && (
            <div className="relative z-[70] w-full shrink-0 border-t border-sidebar-border/50 bg-dashboard-bg px-4 sm:px-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-3">
              <PostGlobalAnalysisInput
                placeholder="Post a new global analysis..."
                assets={assets}
                onCreated={handleCreate}
              />
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditAnalysisModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          initialTitle={editing.title ?? ""}
          initialNotes={editing.notes}
          initialImages={editing.images ?? []}
          initialAnalysisType={editing.analysisType ?? "daily"}
          globalScopeEditor={{ initialScope: editing.scope, assets }}
          onSubmit={handleEditSubmit}
          draftKey={`analysis-edit:${editing.id}`}
        />
      )}
    </>
  );
}
