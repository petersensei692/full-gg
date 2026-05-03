"use client";

import { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronDown, ChevronUp, Plus, SlidersHorizontal, Star } from "lucide-react";
import type { AssetConfig, StreamEntry } from "@/types/asset";
import type { Analysis, AssetWatchlist, CreateWatchItemDto, WatchItem } from "@/types/api";
import { analysisService, assetWatchlistService } from "@/lib/api";
import { useAssets } from "@/context/AssetsContext";
import { useWatchlistCalendar } from "@/context/WatchlistCalendarContext";
import { deleteStoredImage } from "@/lib/imageUpload";
import { EditAnalysisModal } from "./analysis/EditAnalysisModal";
import { AssetHeader } from "./analysis/AssetHeader";
import { StreamEntry as StreamEntryComponent } from "./analysis/StreamEntry";
import { PostAnalysisInput } from "./analysis/PostAnalysisInput";
import { DateRangePicker, type DateRange } from "./analysis/DateRangePicker";
import {
  deserializeDateRangeFromStorage,
  loadAssetAnalysisStreamFilters,
  loadFavoritesWindowAssetFilters,
  saveAssetAnalysisStreamFilters,
  saveFavoritesWindowAssetFilters,
  serializeDateRangeForStorage,
} from "@/lib/analysis-stream-filters";
import { broadcastAnalysisOrFavoriteChanged, subscribeAnalysisOrFavoriteChanged } from "@/lib/analysisBroadcast";
import { buildStreamEntryGroups } from "@/lib/analysis-stream-entry-groups";
import { SidebarTrigger } from "./SidebarTrigger";
import { FavoritesAnalysisSidebar } from "./analysis/FavoritesAnalysisSidebar";
import { StreamTabs } from "./analysis/StreamTabs";
import { PairWatchlistView } from "./analysis/PairWatchlistView";
import { CreatePairModal } from "./analysis/CreatePairModal";

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

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function addAnalysisTypeMarker(notes: string, analysisType: string): string {
  return `<!--analysis-type:${analysisType}-->${notes}`;
}

function extractAnalysisType(notes: string): { cleanedNotes: string; analysisType: string } {
  const match = notes.match(/<!--analysis-type:([^>]*)-->/);
  const analysisType = match?.[1]?.trim() || "daily";
  const cleanedNotes = notes.replace(/<!--analysis-type:[^>]*-->/, "").trim();
  return { cleanedNotes, analysisType };
}

const ANALYSIS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "qoq", label: "QoQ" },
  { value: "yearly", label: "Yearly" },
  { value: "tradeNote", label: "Trade note" },
] as const;

interface AssetAnalysisViewProps {
  asset: AssetConfig;
  /** Favorites popup: stream is starred-only; separate filter storage; no composer */
  favoritesWindow?: boolean;
}

export function AssetAnalysisView({ asset, favoritesWindow = false }: AssetAnalysisViewProps) {
  const { assets } = useAssets();
  /** Resolve asset.id at runtime from API (static export has no API at build time) */
  const resolvedAsset = useMemo(
    () => (asset.id ? asset : (assets.find((a) => a.slug === asset.slug) ?? asset)),
    [asset, assets]
  );

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [analysisFilter, setAnalysisFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>(null);
  /** When true, rows with full global scope are hidden on this asset stream only */
  const [hideGlobalScoped, setHideGlobalScoped] = useState(false);
  const [favoritesSidebarOpen, setFavoritesSidebarOpen] = useState(false);
  const [streamFiltersMenuOpen, setStreamFiltersMenuOpen] = useState(false);
  const streamFiltersButtonRef = useRef<HTMLButtonElement | null>(null);
  const streamFiltersPanelRef = useRef<HTMLDivElement | null>(null);
  const [analysisTypeFilterOpen, setAnalysisTypeFilterOpen] = useState(false);
  const analysisTypeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const analysisTypeMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const [analysisTypeMenuPos, setAnalysisTypeMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [streamFiltersDropdownPos, setStreamFiltersDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [editingAnalysis, setEditingAnalysis] = useState<Analysis | null>(null);
  const [editingAnalysisType, setEditingAnalysisType] = useState<string>("daily");
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<"stream" | "watchlist">("stream");
  const [assetWatchlists, setAssetWatchlists] = useState<AssetWatchlist[]>([]);
  const [selectedAssetWatchlistId, setSelectedAssetWatchlistId] = useState<string | null>(null);
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [editingWatchItem, setEditingWatchItem] = useState<WatchItem | null>(null);
  const [watchlistDropdownOpen, setWatchlistDropdownOpen] = useState(false);
  const [loadingWatchlists, setLoadingWatchlists] = useState(false);
  const watchlistTriggerRef = useRef<HTMLButtonElement | null>(null);
  const watchlistDropdownPanelRef = useRef<HTMLDivElement | null>(null);
  const [watchlistDropdownPos, setWatchlistDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const { createWatchItem, updateWatchItem, refetchAll } = useWatchlistCalendar();

  const sortedAssetWatchlists = useMemo(
    () =>
      [...assetWatchlists].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [assetWatchlists]
  );

  const selectedAssetWatchlist = useMemo(
    () => assetWatchlists.find((aw) => aw.id === selectedAssetWatchlistId) ?? null,
    [assetWatchlists, selectedAssetWatchlistId]
  );

  useEffect(() => {
    if (favoritesWindow) setActiveTab("stream");
  }, [favoritesWindow]);

  useEffect(() => {
    if (activeTab === "watchlist") setStreamFiltersMenuOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (!streamFiltersMenuOpen) setAnalysisTypeFilterOpen(false);
  }, [streamFiltersMenuOpen]);

  const updateAnalysisTypeMenuPosition = useCallback(() => {
    if (!analysisTypeFilterOpen || !analysisTypeTriggerRef.current) return;
    const rect = analysisTypeTriggerRef.current.getBoundingClientRect();
    const width = rect.width;
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
    if (left < 8) left = 8;
    setAnalysisTypeMenuPos({ top: rect.bottom + 6, left, width });
  }, [analysisTypeFilterOpen]);

  useLayoutEffect(() => {
    if (!analysisTypeFilterOpen) {
      setAnalysisTypeMenuPos(null);
      return;
    }
    updateAnalysisTypeMenuPosition();
    const onResize = () => updateAnalysisTypeMenuPosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [analysisTypeFilterOpen, updateAnalysisTypeMenuPosition]);

  useEffect(() => {
    if (!analysisTypeFilterOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (analysisTypeTriggerRef.current?.contains(t)) return;
      if (analysisTypeMenuPanelRef.current?.contains(t)) return;
      setAnalysisTypeFilterOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [analysisTypeFilterOpen]);

  useEffect(() => {
    if (!resolvedAsset.id || favoritesWindow) {
      setAssetWatchlists([]);
      setSelectedAssetWatchlistId(null);
      return;
    }
    setLoadingWatchlists(true);
    assetWatchlistService
      .getByAsset(resolvedAsset.id)
      .then((list) => {
        setAssetWatchlists(list);
        const sorted = [...list].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setSelectedAssetWatchlistId((prev) =>
          prev && list.some((aw) => aw.id === prev) ? prev : sorted[0]?.id ?? null
        );
      })
      .catch(() => {
        setAssetWatchlists([]);
        setSelectedAssetWatchlistId(null);
      })
      .finally(() => setLoadingWatchlists(false));
  }, [resolvedAsset.id, favoritesWindow]);

  const updateWatchlistDropdownPosition = useCallback(() => {
    if (!watchlistDropdownOpen || !watchlistTriggerRef.current) return;
    const rect = watchlistTriggerRef.current.getBoundingClientRect();
    const width = Math.min(320, Math.max(220, rect.width));
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
    if (left < 8) left = 8;
    setWatchlistDropdownPos({ top: rect.bottom + 6, left, width });
  }, [watchlistDropdownOpen]);

  useLayoutEffect(() => {
    if (!watchlistDropdownOpen) {
      setWatchlistDropdownPos(null);
      return;
    }
    updateWatchlistDropdownPosition();
    const onResize = () => updateWatchlistDropdownPosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [watchlistDropdownOpen, updateWatchlistDropdownPosition]);

  useEffect(() => {
    if (activeTab !== "watchlist") setWatchlistDropdownOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (!watchlistDropdownOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (watchlistTriggerRef.current?.contains(t)) return;
      if (watchlistDropdownPanelRef.current?.contains(t)) return;
      setWatchlistDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [watchlistDropdownOpen]);

  const handlePairSubmit = useCallback(
    async (dto: CreateWatchItemDto) => {
      if (editingWatchItem) {
        await updateWatchItem(editingWatchItem.id, {
          pairName: dto.pairName,
          bias: dto.bias,
          thesis: dto.thesis
            ? {
                notes: dto.thesis.notes,
                images: dto.thesis.images,
                imageNames: dto.thesis.imageNames ?? editingWatchItem.thesis?.imageNames,
              }
            : undefined,
        });
      } else {
        await createWatchItem(dto);
      }
      setEditingWatchItem(null);
      setPairModalOpen(false);
      refetchAll();
    },
    [editingWatchItem, createWatchItem, updateWatchItem, refetchAll]
  );

  const handleCreate = useCallback(async (payload: { notes: string; images: string[]; analysisType: string }) => {
    if (!resolvedAsset.id) {
      throw new Error("Asset ID is required to create analysis. Ensure the API is connected.");
    }
    const notesWithMarker = addAnalysisTypeMarker(payload.notes, payload.analysisType);
    const created = await analysisService.create({
      assetId: resolvedAsset.id,
      notes: notesWithMarker,
      images: payload.images,
    });
    setAnalyses((prev) => [...prev, created]);
    broadcastAnalysisOrFavoriteChanged();
  }, [resolvedAsset]);

  const handleDeleteAnalysis = useCallback(
    async (analysisId: string, images: string[]) => {
      await analysisService.delete(analysisId);
      await Promise.all(images.map((path) => deleteStoredImage(path).catch(() => undefined)));
      setAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
      broadcastAnalysisOrFavoriteChanged();
    },
    []
  );

  const handleDeleteImage = useCallback(
    async (analysisId: string, imagePath: string) => {
      const target = analyses.find((a) => a.id === analysisId);
      if (!target) return;
      const imageList = target.images ?? [];
      const index = imageList.indexOf(imagePath);
      const nextImages = imageList.filter((p) => p !== imagePath);
      const currentNames = target.imageNames ?? [];
      const nextImageNames = currentNames.filter((_, i) => i !== index);
      const updated = await analysisService.update(analysisId, {
        images: nextImages,
        imageNames: nextImageNames.length > 0 || currentNames.length > 0 ? nextImageNames : undefined,
      });
      await deleteStoredImage(imagePath).catch(() => undefined);
      setAnalyses((prev) => prev.map((a) => (a.id === analysisId ? updated : a)));
    },
    [analyses]
  );

  const handleUpdateImageName = useCallback(
    async (analysisId: string, imagePath: string, name: string) => {
      const target = analyses.find((a) => a.id === analysisId);
      if (!target) return;
      const imageList = target.images ?? [];
      const index = imageList.indexOf(imagePath);
      if (index < 0) return;
      const currentNames = target.imageNames ?? [];
      const nextImageNames = imageList.map((_, i) => (i === index ? name : (currentNames[i] ?? "")));
      setAnalyses((prev) =>
        prev.map((a) => (a.id === analysisId ? { ...a, imageNames: nextImageNames } : a))
      );
      const updated = await analysisService.update(analysisId, { imageNames: nextImageNames });
      setAnalyses((prev) => prev.map((a) => (a.id === analysisId ? updated : a)));
    },
    [analyses]
  );

  const handleReorderImages = useCallback(
    async (analysisId: string, orderedPaths: string[]) => {
      const target = analyses.find((a) => a.id === analysisId);
      if (!target) return;
      const oldOrder = target.images ?? [];
      if (orderedPaths.length !== oldOrder.length) return;
      const nameByPath = new Map(oldOrder.map((p, i) => [p, target.imageNames?.[i] ?? ""]));
      const nextImageNames = orderedPaths.map((p) => nameByPath.get(p) ?? "");
      const updated = await analysisService.update(analysisId, {
        images: orderedPaths,
        imageNames: nextImageNames.length > 0 || (target.imageNames?.length ?? 0) > 0 ? nextImageNames : undefined,
      });
      setAnalyses((prev) => prev.map((a) => (a.id === analysisId ? updated : a)));
      broadcastAnalysisOrFavoriteChanged();
    },
    [analyses]
  );

  const handleEditAnalysis = useCallback((analysis: Analysis) => {
    const { analysisType } = extractAnalysisType(analysis.notes);
    setEditingAnalysis(analysis);
    setEditingAnalysisType(analysisType);
    setEditModalOpen(true);
  }, []);

  const handleToggleFavorite = useCallback(async (analysisId: string, next: boolean) => {
    try {
      const updated = await analysisService.update(analysisId, { favorite: next });
      setAnalyses((prev) => prev.map((a) => (a.id === analysisId ? updated : a)));
      broadcastAnalysisOrFavoriteChanged();
    } catch {
      /* ignore */
    }
  }, []);

  const streamScrollRef = useRef<HTMLDivElement>(null);
  const streamFiltersHydratedRef = useRef(false);
  const skipNextAssetFilterPersistRef = useRef(true);

  useEffect(() => {
    streamFiltersHydratedRef.current = false;
    skipNextAssetFilterPersistRef.current = true;
    if (!resolvedAsset.id) {
      setAnalysisFilter("all");
      setDateRange(null);
      return;
    }
    if (favoritesWindow) {
      const stored = loadFavoritesWindowAssetFilters(resolvedAsset.id);
      if (stored) {
        setAnalysisFilter(stored.analysisFilter);
        setDateRange(deserializeDateRangeFromStorage(stored.dateRange));
        setHideGlobalScoped(!!stored.hideGlobalScoped);
      } else {
        setAnalysisFilter("all");
        setDateRange(null);
        setHideGlobalScoped(false);
      }
    } else {
      const stored = loadAssetAnalysisStreamFilters(resolvedAsset.id);
      if (stored) {
        setAnalysisFilter(stored.analysisFilter);
        setDateRange(deserializeDateRangeFromStorage(stored.dateRange));
        setHideGlobalScoped(!!stored.hideGlobalScoped);
      } else {
        setAnalysisFilter("all");
        setDateRange(null);
        setHideGlobalScoped(false);
      }
    }
    streamFiltersHydratedRef.current = true;
  }, [resolvedAsset.id, favoritesWindow]);

  useEffect(() => {
    if (!resolvedAsset.id || !streamFiltersHydratedRef.current) return;
    if (skipNextAssetFilterPersistRef.current) {
      skipNextAssetFilterPersistRef.current = false;
      return;
    }
    if (favoritesWindow) {
      saveFavoritesWindowAssetFilters(resolvedAsset.id, {
        analysisFilter,
        dateRange: serializeDateRangeForStorage(dateRange),
        hideGlobalScoped,
      });
    } else {
      saveAssetAnalysisStreamFilters(resolvedAsset.id, {
        analysisFilter,
        favoritesOnly: false,
        dateRange: serializeDateRangeForStorage(dateRange),
        hideGlobalScoped,
      });
    }
  }, [resolvedAsset.id, favoritesWindow, analysisFilter, dateRange, hideGlobalScoped]);

  const refetchAnalyses = useCallback(() => {
    if (!resolvedAsset.id) return;
    analysisService
      .getAll(resolvedAsset.id)
      .then((list) => setAnalyses(list))
      .catch(() => setAnalyses([]));
  }, [resolvedAsset.id]);

  useEffect(() => {
    if (!resolvedAsset.id) {
      setAnalyses([]);
      return;
    }
    refetchAnalyses();
  }, [resolvedAsset.id, refetchAnalyses]);

  useEffect(() => {
    if (!resolvedAsset.id) return;
    return subscribeAnalysisOrFavoriteChanged(refetchAnalyses);
  }, [resolvedAsset.id, refetchAnalyses]);

  const updateStreamFiltersDropdownPosition = useCallback(() => {
    if (!streamFiltersMenuOpen || !streamFiltersButtonRef.current) return;
    const rect = streamFiltersButtonRef.current.getBoundingClientRect();
    const width = Math.min(320, Math.max(260, window.innerWidth - 16));
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
    if (left < 8) left = 8;
    setStreamFiltersDropdownPos({ top: rect.bottom + 6, left, width });
  }, [streamFiltersMenuOpen]);

  useLayoutEffect(() => {
    if (!streamFiltersMenuOpen) {
      setStreamFiltersDropdownPos(null);
      return;
    }
    updateStreamFiltersDropdownPosition();
    const onResize = () => updateStreamFiltersDropdownPosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [streamFiltersMenuOpen, updateStreamFiltersDropdownPosition]);

  const mappedEntries = useMemo(() => {
    return analyses
      .map((analysis) => {
        const createdAt = new Date(analysis.createdAt).getTime();
        const { cleanedNotes, analysisType } = extractAnalysisType(analysis.notes);
        const { tag, tagColor } =
          ANALYSIS_TYPE_TO_TAG[analysisType] ??
          ({ tag: "INTRADAY UPDATE" as const, tagColor: "red" as const });
        const imageList = analysis.images ?? [];
        const names = analysis.imageNames ?? [];
        const imageNames = imageList.map((_, i) => names[i] ?? "");
        const entry: StreamEntry = {
          id: analysis.id,
          author: "You",
          time: formatTime(new Date(analysis.createdAt)),
          tag,
          tagColor,
          content: cleanedNotes,
          createdAt,
          analysisType,
          images: imageList,
          imageNames,
          scopeLabel: analysis.scopeLabel ?? resolvedAsset.label,
          globalFullScope: analysis.scopeLabel === "GLOBAL",
          favorite: analysis.favorite ?? false,
        };
        return entry;
      })
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  }, [analyses]);

  const filteredEntries = useMemo(() => {
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
    if (favoritesWindow) {
      list = list.filter((e) => e.favorite);
    }
    if (hideGlobalScoped) {
      list = list.filter((e) => !e.globalFullScope);
    }
    return list;
  }, [mappedEntries, analysisFilter, dateRange, favoritesWindow, hideGlobalScoped]);

  const entriesWithGroups = useMemo(
    () => buildStreamEntryGroups(filteredEntries),
    [filteredEntries]
  );

  const favoritesEntriesWithGroups = useMemo(() => {
    const favOnly = filteredEntries.filter((e) => e.favorite);
    return buildStreamEntryGroups(favOnly);
  }, [filteredEntries]);

  /** Newest analyses are at the bottom; scroll there when opening the stream or when the list changes. */
  useLayoutEffect(() => {
    if (!favoritesWindow && activeTab !== "stream") return;
    const el = streamScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [analyses.length, filteredEntries.length, favoritesWindow, activeTab]);

  useEffect(() => {
    if (!streamFiltersMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (streamFiltersButtonRef.current?.contains(t)) return;
      if (streamFiltersPanelRef.current?.contains(t)) return;
      if ((t as Element | null)?.closest?.("[data-date-range-picker-panel]")) return;
      if ((t as Element | null)?.closest?.("[data-analysis-type-menu]")) return;
      setStreamFiltersMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [streamFiltersMenuOpen]);

  const displayTitle = resolvedAsset.symbol
    ? `${resolvedAsset.label} (${resolvedAsset.symbol})`
    : resolvedAsset.label;
  const fullTitle =
    resolvedAsset.slug === "usd"
      ? `US Dollar Index (${resolvedAsset.symbol ?? resolvedAsset.label})`
      : displayTitle;

  const streamFiltersPanel = (
    <div className="space-y-3">
      <div className="space-y-1">
        <span className="text-xs font-medium text-dashboard-foreground/70">Analysis type</span>
        <button
          ref={analysisTypeTriggerRef}
          type="button"
          onClick={() => setAnalysisTypeFilterOpen((o) => !o)}
          aria-expanded={analysisTypeFilterOpen}
          aria-haspopup="listbox"
          className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <span className="truncate">
            {ANALYSIS_FILTER_OPTIONS.find((o) => o.value === analysisFilter)?.label ?? analysisFilter}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${analysisTypeFilterOpen ? "rotate-180" : ""}`}
          />
        </button>
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
      <button
        type="button"
        role="switch"
        aria-checked={!hideGlobalScoped}
        onClick={() => setHideGlobalScoped((h) => !h)}
        title={
          hideGlobalScoped
            ? "Show analyses with full global scope on this page"
            : "Hide analyses with full global scope on this page"
        }
        className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          !hideGlobalScoped
            ? "border-primary bg-primary/15 text-dashboard-foreground"
            : "border-sidebar-border bg-sidebar text-dashboard-foreground/70 hover:bg-sidebar-hover hover:text-dashboard-foreground"
        }`}
      >
        Global analysis
      </button>
    </div>
  );

  const assetHeaderBar = (
    <div className="h-11 shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-sidebar-border overflow-visible">
      <SidebarTrigger />
      {(favoritesWindow || activeTab === "stream") && (
        <div className="relative flex shrink-0 items-center gap-1.5">
          <button
            ref={streamFiltersButtonRef}
            type="button"
            onClick={() => setStreamFiltersMenuOpen((o) => !o)}
            className="shrink-0 rounded-lg border border-sidebar-border p-2 text-header-muted hover:bg-sidebar-hover hover:text-primary"
            title="Filters"
            aria-label="Analysis filters"
            aria-expanded={streamFiltersMenuOpen}
            aria-haspopup="dialog"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          {!favoritesWindow && activeTab === "stream" && (
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
          )}
        </div>
      )}
      <div className="flex-1 min-w-0 flex items-center justify-center gap-3 overflow-hidden">
        <div
          className={
            favoritesWindow ? "min-w-0 overflow-hidden flex items-center w-full" : "min-w-0 max-w-[45%] shrink overflow-hidden"
          }
        >
          <AssetHeader title={fullTitle} />
        </div>
        {!favoritesWindow && (
          <StreamTabs active={activeTab} onSelect={setActiveTab} noBorder />
        )}
      </div>
    </div>
  );

  const watchlistToolbar =
    !favoritesWindow && activeTab === "watchlist" ? (
      <div className="shrink-0 flex flex-wrap items-center gap-3 px-6 pt-4 pb-3 border-b border-sidebar-border">
        <div className="relative">
          <button
            ref={watchlistTriggerRef}
            type="button"
            onClick={() => setWatchlistDropdownOpen((o) => !o)}
            disabled={loadingWatchlists || !resolvedAsset.id}
            aria-expanded={watchlistDropdownOpen}
            aria-haspopup="listbox"
            className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors disabled:opacity-50"
          >
            <Calendar className="h-4 w-4 shrink-0" />
            {loadingWatchlists
              ? "Loading..."
              : selectedAssetWatchlist
                ? `${new Date(selectedAssetWatchlist.startDate).toISOString().slice(0, 10)} → ${new Date(selectedAssetWatchlist.endDate).toISOString().slice(0, 10)}`
                : assetWatchlists.length === 0
                  ? "No watchlists"
                  : "Choose watchlist"}
            <ChevronDown className="h-4 w-4 shrink-0" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingWatchItem(null);
            setPairModalOpen(true);
          }}
          disabled={!selectedAssetWatchlist}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4 shrink-0" />
          Create Pair
        </button>
      </div>
    ) : null;

  const favoritesPanel =
    favoritesEntriesWithGroups.length === 0 ? (
      <p className="py-8 text-center text-sm text-dashboard-foreground/70">
        No favorites match the current filters.
      </p>
    ) : (
      <div className="min-w-0 w-full max-w-full space-y-0 pb-4">
        {favoritesEntriesWithGroups.map(({ entry, separatorType, weekGroup, dateGroup }) => {
          const analysis = analyses.find((a) => a.id === entry.id);
          const fromFullGlobalOnAsset =
            !!analysis?.globalAnalysisId && analysis?.scopeLabel === "GLOBAL";
          const fromTradeNote =
            !!analysis?.notes?.includes("<!--analysis-type:tradeNote-->");
          const streamReadOnly = fromFullGlobalOnAsset || fromTradeNote;
          return (
            <StreamEntryComponent
              key={`fav-${entry.id}`}
              entry={entry}
              separatorType={separatorType}
              weekGroup={weekGroup}
              dateGroup={dateGroup}
              fillColumnWidth
              onDelete={streamReadOnly ? undefined : () => handleDeleteAnalysis(entry.id, entry.images ?? [])}
              onDeleteImage={streamReadOnly ? undefined : (path) => handleDeleteImage(entry.id, path)}
              onUpdateImageName={streamReadOnly ? undefined : (path, name) => handleUpdateImageName(entry.id, path, name)}
              onReorderImages={
                streamReadOnly ? undefined : (ordered) => handleReorderImages(entry.id, ordered)
              }
              onEdit={streamReadOnly ? undefined : () => analysis && handleEditAnalysis(analysis)}
              onToggleFavorite={
                fromFullGlobalOnAsset
                  ? undefined
                  : () => handleToggleFavorite(entry.id, !entry.favorite)
              }
            />
          );
        })}
      </div>
    );

  return (
    <>
      {typeof document !== "undefined" &&
        streamFiltersMenuOpen &&
        streamFiltersDropdownPos &&
        createPortal(
          <div
            ref={streamFiltersPanelRef}
            className="fixed max-h-[min(70vh,520px)] overflow-y-auto rounded-lg border border-sidebar-border bg-sidebar p-3 shadow-xl"
            style={{
              top: streamFiltersDropdownPos.top,
              left: streamFiltersDropdownPos.left,
              width: streamFiltersDropdownPos.width,
              zIndex: 10000,
            }}
            role="dialog"
            aria-label="Stream filters"
          >
            {streamFiltersPanel}
          </div>,
          document.body
        )}
      {typeof document !== "undefined" &&
        analysisTypeFilterOpen &&
        analysisTypeMenuPos &&
        createPortal(
          <div
            ref={analysisTypeMenuPanelRef}
            data-analysis-type-menu="true"
            role="listbox"
            className="fixed max-h-[6.75rem] overflow-y-auto rounded-lg border border-sidebar-border bg-sidebar py-1 shadow-lg"
            style={{
              top: analysisTypeMenuPos.top,
              left: analysisTypeMenuPos.left,
              width: analysisTypeMenuPos.width,
              zIndex: 10001,
            }}
          >
            {ANALYSIS_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={analysisFilter === opt.value}
                onClick={() => {
                  setAnalysisFilter(opt.value);
                  setAnalysisTypeFilterOpen(false);
                }}
                className={`flex w-full px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar-hover ${
                  analysisFilter === opt.value ? "font-medium text-primary" : "text-dashboard-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>,
          document.body
        )}
      {typeof document !== "undefined" &&
        watchlistDropdownOpen &&
        watchlistDropdownPos &&
        createPortal(
          <div
            ref={watchlistDropdownPanelRef}
            className="fixed max-h-[220px] overflow-y-auto rounded-lg border border-sidebar-border bg-sidebar py-1 shadow-lg"
            style={{
              top: watchlistDropdownPos.top,
              left: watchlistDropdownPos.left,
              width: watchlistDropdownPos.width,
              zIndex: 10000,
            }}
            role="listbox"
            aria-label="Watchlists"
          >
            {assetWatchlists.length === 0 ? (
              <p className="px-3 py-2 text-sm text-dashboard-foreground/70">No watchlists yet.</p>
            ) : (
              sortedAssetWatchlists.map((aw) => (
                <button
                  key={aw.id}
                  type="button"
                  role="option"
                  onClick={() => {
                    setSelectedAssetWatchlistId(aw.id);
                    setWatchlistDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:text-primary transition-colors ${
                    selectedAssetWatchlistId === aw.id ? "text-primary font-medium" : "text-dashboard-foreground"
                  }`}
                >
                  {new Date(aw.startDate).toISOString().slice(0, 10)} →{" "}
                  {new Date(aw.endDate).toISOString().slice(0, 10)}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
      <div className="flex h-full min-h-0 flex-col overflow-auto">
        {favoritesWindow || activeTab === "stream" ? (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="relative flex min-h-0 flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
              {assetHeaderBar}
              <div className="relative flex min-h-0 flex-1 flex-col min-w-0 overflow-hidden">
                <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                  <div className="relative min-h-0 flex-1 overflow-hidden">
                    <div
                      ref={streamScrollRef}
                      className="absolute inset-0 overflow-x-hidden overflow-y-auto px-6"
                    >
                      <div className="w-full max-w-full space-y-0 pb-4">
                        {entriesWithGroups.map(({ entry, separatorType, weekGroup, dateGroup }) => {
                          const analysis = analyses.find((a) => a.id === entry.id);
                          const fromFullGlobalOnAsset =
                            !!analysis?.globalAnalysisId && analysis?.scopeLabel === "GLOBAL";
                          const fromTradeNote =
                            !!analysis?.notes?.includes("<!--analysis-type:tradeNote-->");
                          const streamReadOnly = fromFullGlobalOnAsset || fromTradeNote;
                          return (
                            <StreamEntryComponent
                              key={entry.id}
                              entry={entry}
                              separatorType={separatorType}
                              weekGroup={weekGroup}
                              dateGroup={dateGroup}
                              onDelete={
                                streamReadOnly ? undefined : () => handleDeleteAnalysis(entry.id, entry.images ?? [])
                              }
                              onDeleteImage={
                                streamReadOnly ? undefined : (path) => handleDeleteImage(entry.id, path)
                              }
                              onUpdateImageName={
                                streamReadOnly ? undefined : (path, name) =>
                                  handleUpdateImageName(entry.id, path, name)
                              }
                              onReorderImages={
                                streamReadOnly ? undefined : (ordered) => handleReorderImages(entry.id, ordered)
                              }
                              onEdit={streamReadOnly ? undefined : () => analysis && handleEditAnalysis(analysis)}
                              onToggleFavorite={
                                fromFullGlobalOnAsset
                                  ? undefined
                                  : () => handleToggleFavorite(entry.id, !entry.favorite)
                              }
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="pointer-events-none absolute inset-0 z-20">
                      <div
                        className={
                          favoritesSidebarOpen && !favoritesWindow
                            ? "pointer-events-auto absolute bottom-4 right-[calc(50%+1rem)] flex flex-col gap-2"
                            : "pointer-events-auto absolute bottom-4 right-8 flex flex-col gap-2"
                        }
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const el = streamScrollRef.current;
                            if (!el) return;
                            el.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="h-9 w-9 rounded-lg border border-sidebar-border bg-sidebar/95 text-dashboard-foreground hover:bg-sidebar-hover transition-colors shadow-md backdrop-blur-sm"
                          aria-label="Go to top"
                          title="Go to top"
                        >
                          <ChevronUp className="h-5 w-5 mx-auto" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const el = streamScrollRef.current;
                            if (!el) return;
                            el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                          }}
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
                >
                  {favoritesPanel}
                </FavoritesAnalysisSidebar>
              )}
            </div>

            {!favoritesWindow && (
              <div className="relative z-[70] shrink-0 w-full border-t border-sidebar-border/50 bg-dashboard-bg px-6 pb-6 pt-3">
                <PostAnalysisInput placeholder={resolvedAsset.placeholder} onCreated={handleCreate} />
              </div>
            )}
          </div>
        ) : (
          <>
            {assetHeaderBar}
            {watchlistToolbar}
            <div className="relative flex min-h-0 flex-1 flex-col min-w-0 overflow-hidden">
              <PairWatchlistView
                asset={resolvedAsset}
                assetWatchlists={assetWatchlists}
                selectedAssetWatchlistId={selectedAssetWatchlistId}
                selectedAssetWatchlist={selectedAssetWatchlist}
                pairModalOpen={pairModalOpen}
                setPairModalOpen={setPairModalOpen}
                onEditItem={(item) => {
                  setEditingWatchItem(item);
                  setPairModalOpen(true);
                }}
                loadingWatchlists={loadingWatchlists}
              />
            </div>
          </>
        )}
      </div>
      {!favoritesWindow && activeTab === "watchlist" && (
        <CreatePairModal
          open={pairModalOpen}
          onOpenChange={(open) => {
            setPairModalOpen(open);
            if (!open) setEditingWatchItem(null);
          }}
          assetWatchlists={assetWatchlists}
          selectedAssetWatchlistId={selectedAssetWatchlistId}
          currentAssetSlug={resolvedAsset.slug}
          currentAssetLabel={resolvedAsset.label}
          mode={editingWatchItem ? "edit" : "create"}
          initialItem={editingWatchItem ?? undefined}
          onSubmit={handlePairSubmit}
        />
      )}

      {editingAnalysis && (
        <EditAnalysisModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          initialNotes={extractAnalysisType(editingAnalysis.notes).cleanedNotes}
          initialImages={editingAnalysis.images ?? []}
          initialAnalysisType={editingAnalysisType}
          onSubmit={async ({ notes, images, analysisType: nextType }) => {
            if (!editingAnalysis) return;
            const type = nextType ?? editingAnalysisType;
            const notesWithMarker = addAnalysisTypeMarker(notes, type);
            const updated = await analysisService.update(editingAnalysis.id, {
              notes: notesWithMarker,
              images,
            });
            setAnalyses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            broadcastAnalysisOrFavoriteChanged();
            setEditModalOpen(false);
            setEditingAnalysis(null);
          }}
        />
      )}

    </>
  );
}
