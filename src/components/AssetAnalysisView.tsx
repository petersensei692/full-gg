"use client";

import { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Calendar, Plus, ChevronDown, ChevronUp, Settings } from "lucide-react";
import type { AssetConfig, StreamEntry } from "@/types/asset";
import type { Analysis, AssetCalendar, AssetWatchlist, Event, WatchItem, CreateWatchItemDto } from "@/types/api";
import { analysisService, assetCalendarService, assetWatchlistService } from "@/lib/api";
import { useAssets } from "@/context/AssetsContext";
import { useWatchlistCalendar } from "@/context/WatchlistCalendarContext";
import { deleteStoredImage } from "@/lib/imageUpload";
import { EditAnalysisModal } from "./analysis/EditAnalysisModal";
import { AssetHeader } from "./analysis/AssetHeader";
import { StreamTabs } from "./analysis/StreamTabs";
import { StreamEntry as StreamEntryComponent } from "./analysis/StreamEntry";
import { PostAnalysisInput } from "./analysis/PostAnalysisInput";
import { EconomicEventsView } from "./analysis/EconomicEventsView";
import { PairWatchlistView } from "./analysis/PairWatchlistView";
import { DateRangePicker, type DateRange } from "./analysis/DateRangePicker";
import { CreateEventModal } from "./analysis/CreateEventModal";
import { CreatePairModal } from "./analysis/CreatePairModal";
import { SidebarTrigger } from "./SidebarTrigger";

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

function formatDateGroup(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatWeekGroup(ts: number): string {
  const d = new Date(ts);
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return `Week of ${monday.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
}

function getWeekKey(ts: number): string {
  const d = new Date(ts);
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return monday.toISOString().slice(0, 10);
}

interface AssetAnalysisViewProps {
  asset: AssetConfig;
}

export function AssetAnalysisView({ asset }: AssetAnalysisViewProps) {
  const { assets } = useAssets();
  const { createEvent, updateEvent, refetchAll, createWatchItem, updateWatchItem } = useWatchlistCalendar();
  /** Resolve asset.id at runtime from API (static export has no API at build time) */
  const resolvedAsset = useMemo(
    () => (asset.id ? asset : (assets.find((a) => a.slug === asset.slug) ?? asset)),
    [asset, assets]
  );

  const [activeTab, setActiveTab] = useState<"stream" | "events" | "watchlist">("stream");
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [analysisFilter, setAnalysisFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>(null);
  const [editingAnalysis, setEditingAnalysis] = useState<Analysis | null>(null);
  const [editingAnalysisType, setEditingAnalysisType] = useState<string>("daily");
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Events tab state (lifted for unified header)
  const [assetCalendars, setAssetCalendars] = useState<AssetCalendar[]>([]);
  const [selectedAssetCalendarId, setSelectedAssetCalendarId] = useState<string | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const sortedAssetCalendars = useMemo(
    () => [...assetCalendars].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [assetCalendars]
  );
  const selectedAssetCalendar = assetCalendars.find((ac) => ac.id === selectedAssetCalendarId);

  // Watchlist tab state (lifted for unified header)
  const [assetWatchlists, setAssetWatchlists] = useState<AssetWatchlist[]>([]);
  const [selectedAssetWatchlistId, setSelectedAssetWatchlistId] = useState<string | null>(null);
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [editingWatchItem, setEditingWatchItem] = useState<WatchItem | null>(null);
  const [watchlistDropdownOpen, setWatchlistDropdownOpen] = useState(false);
  const [loadingWatchlists, setLoadingWatchlists] = useState(false);
  const calendarTriggerRef = useRef<HTMLButtonElement>(null);
  const watchlistTriggerRef = useRef<HTMLButtonElement>(null);
  const calendarDropdownRef = useRef<HTMLDivElement | null>(null);
  const watchlistDropdownRef = useRef<HTMLDivElement | null>(null);
  const [calendarDropdownRect, setCalendarDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [watchlistDropdownRect, setWatchlistDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const sortedAssetWatchlists = useMemo(
    () => [...assetWatchlists].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [assetWatchlists]
  );
  const selectedAssetWatchlist = assetWatchlists.find((aw) => aw.id === selectedAssetWatchlistId);

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
  }, [resolvedAsset]);

  const handleDeleteAnalysis = useCallback(
    async (analysisId: string, images: string[]) => {
      await analysisService.delete(analysisId);
      await Promise.all(images.map((path) => deleteStoredImage(path).catch(() => undefined)));
      setAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
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

  const handleEditAnalysis = useCallback((analysis: Analysis) => {
    const { analysisType } = extractAnalysisType(analysis.notes);
    setEditingAnalysis(analysis);
    setEditingAnalysisType(analysisType);
    setEditModalOpen(true);
  }, []);

  const streamScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!resolvedAsset.id) {
      setAnalyses([]);
      return;
    }
    analysisService
      .getAll(resolvedAsset.id)
      .then((list) => setAnalyses(list))
      .catch(() => setAnalyses([]));
  }, [resolvedAsset.id]);

  useEffect(() => {
    if (!resolvedAsset.id) {
      setAssetCalendars([]);
      setSelectedAssetCalendarId(null);
      return;
    }
    setLoadingCalendars(true);
    assetCalendarService
      .getByAsset(resolvedAsset.id)
      .then((list) => {
        setAssetCalendars(list);
        const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSelectedAssetCalendarId((prev) => (prev && list.some((ac) => ac.id === prev) ? prev : sorted[0]?.id ?? null));
      })
      .catch(() => setAssetCalendars([]))
      .finally(() => setLoadingCalendars(false));
  }, [resolvedAsset.id]);

  useEffect(() => {
    if (!resolvedAsset.id) {
      setAssetWatchlists([]);
      setSelectedAssetWatchlistId(null);
      return;
    }
    setLoadingWatchlists(true);
    assetWatchlistService
      .getByAsset(resolvedAsset.id)
      .then((list) => {
        setAssetWatchlists(list);
        const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSelectedAssetWatchlistId((prev) => (prev && list.some((aw) => aw.id === prev) ? prev : sorted[0]?.id ?? null));
      })
      .catch(() => setAssetWatchlists([]))
      .finally(() => setLoadingWatchlists(false));
  }, [resolvedAsset.id]);

  useEffect(() => {
    if (calendarDropdownOpen && calendarTriggerRef.current) {
      const rect = calendarTriggerRef.current.getBoundingClientRect();
      setCalendarDropdownRect({ top: rect.bottom + 4, left: rect.left + rect.width - 220, width: rect.width });
    } else {
      setCalendarDropdownRect(null);
    }
  }, [calendarDropdownOpen]);

  useEffect(() => {
    if (watchlistDropdownOpen && watchlistTriggerRef.current) {
      const rect = watchlistTriggerRef.current.getBoundingClientRect();
      setWatchlistDropdownRect({ top: rect.bottom + 4, left: rect.left + rect.width - 220, width: rect.width });
    } else {
      setWatchlistDropdownRect(null);
    }
  }, [watchlistDropdownOpen]);

  useEffect(() => {
    if (!calendarDropdownOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!calendarTriggerRef.current?.contains(target) && !calendarDropdownRef.current?.contains(target)) {
        setCalendarDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [calendarDropdownOpen]);

  useEffect(() => {
    if (!watchlistDropdownOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!watchlistTriggerRef.current?.contains(target) && !watchlistDropdownRef.current?.contains(target)) {
        setWatchlistDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [watchlistDropdownOpen]);

  const handleEventSubmit = useCallback(
    async (dto: { assetCalendarId?: string; calendarId?: string; day: string; time: string; assetId?: string; name: string; impact: string }) => {
      if (editingEvent) {
        await updateEvent(editingEvent.id, { day: dto.day, time: dto.time, name: dto.name, impact: dto.impact });
      } else {
        await createEvent(dto);
      }
      if (dto.assetCalendarId) setSelectedAssetCalendarId(dto.assetCalendarId);
      setEditingEvent(null);
      setEventModalOpen(false);
      refetchAll();
    },
    [editingEvent, createEvent, updateEvent, refetchAll]
  );

  const handlePairSubmit = useCallback(
    async (dto: CreateWatchItemDto) => {
      if (editingWatchItem) {
        await updateWatchItem(editingWatchItem.id, {
          pairName: dto.pairName,
          bias: dto.bias,
          thesis: dto.thesis ? { notes: dto.thesis.notes, images: dto.thesis.images, imageNames: dto.thesis.imageNames ?? editingWatchItem.thesis?.imageNames } : undefined,
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
    return list;
  }, [mappedEntries, analysisFilter, dateRange]);

  const entriesWithGroups = useMemo(() => {
    let lastWeekKey: string | undefined;
    let lastDateKey: string | undefined;
    return filteredEntries.map((entry, index) => {
      const ts = entry.createdAt ?? 0;
      const weekKey = ts ? getWeekKey(ts) : undefined;
      const dateKey = ts ? new Date(ts).toDateString() : undefined;
      const isNewWeek = weekKey && weekKey !== lastWeekKey;
      const isNewDay = dateKey && dateKey !== lastDateKey;
      if (weekKey) lastWeekKey = weekKey;
      if (dateKey) lastDateKey = dateKey;
      let separatorType: "same-day" | "new-day" | "new-week" | "first" = "first";
      if (index > 0) {
        if (isNewWeek) separatorType = "new-week";
        else if (isNewDay) separatorType = "new-day";
        else separatorType = "same-day";
      }
      const weekGroup = (isNewWeek || index === 0) && ts ? formatWeekGroup(ts) : undefined;
      const dateGroup = (isNewDay || index === 0) && ts ? formatDateGroup(ts) : undefined;
      return { entry, separatorType, weekGroup, dateGroup };
    });
  }, [filteredEntries]);

  /** Newest analyses are at the bottom; scroll there when opening the stream or when the list changes. */
  useLayoutEffect(() => {
    if (activeTab !== "stream") return;
    const el = streamScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeTab, analyses.length, filteredEntries.length]);

  const displayTitle = resolvedAsset.symbol
    ? `${resolvedAsset.label} (${resolvedAsset.symbol})`
    : resolvedAsset.label;
  const fullTitle =
    resolvedAsset.slug === "usd"
      ? `US Dollar Index (${resolvedAsset.symbol ?? resolvedAsset.label})`
      : displayTitle;

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-auto">
        {/* Header bar: hamburger (mobile) + title + tabs; reduced height */}
        <div className="h-11 shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-sidebar-border overflow-hidden">
          <SidebarTrigger />
          <Link
            href="/settings"
            className="shrink-0 rounded-lg border border-sidebar-border p-2 text-header-muted hover:bg-sidebar-hover hover:text-primary"
            title="Settings"
            aria-label="Open settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <div className="flex-grow-0 min-w-0 overflow-hidden flex items-center shrink">
            <AssetHeader title={fullTitle} />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden flex justify-center">
            <StreamTabs active={activeTab} onSelect={setActiveTab} noBorder />
          </div>
        </div>

        {/* Filters / actions bar below header (per tab) */}
        {activeTab === "stream" && (
          <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-sidebar-border bg-sidebar/30">
            <span className="text-sm text-dashboard-foreground/70 shrink-0">Filter:</span>
            <select
              value={analysisFilter}
              onChange={(e) => setAnalysisFilter(e.target.value)}
              className="rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
            >
              {ANALYSIS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        )}
        {activeTab === "events" && (
          <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-sidebar-border bg-sidebar/30">
            <div className="relative min-w-0 max-w-full">
              <button
                ref={calendarTriggerRef}
                type="button"
                onClick={() => setCalendarDropdownOpen((o) => !o)}
                disabled={loadingCalendars || !resolvedAsset.id}
                className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors disabled:opacity-50 min-w-0 max-w-full truncate"
              >
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {loadingCalendars ? "Loading..." : selectedAssetCalendar
                    ? `${new Date(selectedAssetCalendar.startDate).toISOString().slice(0, 10)} → ${new Date(selectedAssetCalendar.endDate).toISOString().slice(0, 10)}`
                    : assetCalendars.length === 0 ? "No calendars" : "Choose calendar"}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setEventModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
            >
              <Plus className="h-4 w-4" />
              Create event
            </button>
          </div>
        )}
        {activeTab === "watchlist" && (
          <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-sidebar-border bg-sidebar/30">
            <div className="relative min-w-0 max-w-full">
              <button
                ref={watchlistTriggerRef}
                type="button"
                onClick={() => setWatchlistDropdownOpen((o) => !o)}
                disabled={loadingWatchlists || !resolvedAsset.id}
                className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors disabled:opacity-50 min-w-0 max-w-full truncate"
              >
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {loadingWatchlists ? "Loading..." : selectedAssetWatchlist
                    ? `${new Date(selectedAssetWatchlist.startDate).toISOString().slice(0, 10)} → ${new Date(selectedAssetWatchlist.endDate).toISOString().slice(0, 10)}`
                    : assetWatchlists.length === 0 ? "No watchlists" : "Choose watchlist"}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPairModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
            >
              <Plus className="h-4 w-4" />
              Create Pair
            </button>
          </div>
        )}

        {activeTab === "stream" && (
          <div className="flex-1 flex flex-col min-h-0 w-full">
            <div className="flex-1 min-h-0 relative w-full">
              <div
                ref={streamScrollRef}
                className="absolute inset-0 overflow-x-hidden overflow-y-auto px-6"
              >
                <div className="w-full max-w-full space-y-0 pb-4">
                  {entriesWithGroups.map(({ entry, separatorType, weekGroup, dateGroup }) => {
                    const analysis = analyses.find((a) => a.id === entry.id);
                    const fromGlobalAnalysis = !!analysis?.globalAnalysisId;
                    const fromTradeNote =
                      !!analysis?.notes?.includes("<!--analysis-type:tradeNote-->");
                    const streamReadOnly = fromGlobalAnalysis || fromTradeNote;
                    return (
                      <StreamEntryComponent
                        key={entry.id}
                        entry={entry}
                        separatorType={separatorType}
                        weekGroup={weekGroup}
                        dateGroup={dateGroup}
                        onDelete={streamReadOnly ? undefined : () => handleDeleteAnalysis(entry.id, entry.images ?? [])}
                        onDeleteImage={streamReadOnly ? undefined : (path) => handleDeleteImage(entry.id, path)}
                        onUpdateImageName={streamReadOnly ? undefined : (path, name) => handleUpdateImageName(entry.id, path, name)}
                        onEdit={streamReadOnly ? undefined : () => analysis && handleEditAnalysis(analysis)}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="pointer-events-none absolute inset-0 z-20">
                <div className="pointer-events-auto absolute bottom-4 right-8 flex flex-col gap-2">
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
            <div className="shrink-0 w-full px-6 pb-6 pt-3 border-t border-sidebar-border/50 bg-dashboard-bg">
              <PostAnalysisInput placeholder={resolvedAsset.placeholder} onCreated={handleCreate} />
            </div>
          </div>
        )}

        {activeTab === "events" && (
          <EconomicEventsView
            asset={resolvedAsset}
            assetCalendars={assetCalendars}
            selectedAssetCalendarId={selectedAssetCalendarId}
            selectedAssetCalendar={selectedAssetCalendar ?? null}
            eventModalOpen={eventModalOpen}
            setEventModalOpen={setEventModalOpen}
            onEditEvent={(ev) => { setEditingEvent(ev); setEventModalOpen(true); }}
            loadingCalendars={loadingCalendars}
          />
        )}

        {activeTab === "watchlist" && (
          <PairWatchlistView
            asset={resolvedAsset}
            assetWatchlists={assetWatchlists}
            selectedAssetWatchlistId={selectedAssetWatchlistId}
            selectedAssetWatchlist={selectedAssetWatchlist ?? null}
            pairModalOpen={pairModalOpen}
            setPairModalOpen={setPairModalOpen}
            onEditItem={(item) => { setEditingWatchItem(item); setPairModalOpen(true); }}
            loadingWatchlists={loadingWatchlists}
          />
        )}
      </div>
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
            setEditModalOpen(false);
            setEditingAnalysis(null);
          }}
        />
      )}

      <CreateEventModal
        open={eventModalOpen}
        onOpenChange={(open) => { setEventModalOpen(open); if (!open) setEditingEvent(null); }}
        assetCalendars={assetCalendars}
        selectedAssetCalendarId={selectedAssetCalendarId}
        defaultCurrency={resolvedAsset.label}
        mode={editingEvent ? "edit" : "create"}
        initialEvent={editingEvent ?? undefined}
        onSubmit={handleEventSubmit}
      />

      <CreatePairModal
        open={pairModalOpen}
        onOpenChange={(open) => { setPairModalOpen(open); if (!open) setEditingWatchItem(null); }}
        calendars={[]}
        selectedCalendarId={null}
        assetWatchlists={assetWatchlists}
        selectedAssetWatchlistId={selectedAssetWatchlistId}
        currentAssetSlug={resolvedAsset.slug}
        currentAssetLabel={resolvedAsset.label}
        mode={editingWatchItem ? "edit" : "create"}
        initialItem={editingWatchItem ?? undefined}
        onSubmit={handlePairSubmit}
      />

      {typeof document !== "undefined" &&
        calendarDropdownOpen &&
        calendarDropdownRect &&
        createPortal(
          <div
            ref={(el) => { calendarDropdownRef.current = el; }}
            className="fixed z-[9999] w-[240px] max-h-[220px] overflow-y-auto rounded-lg border border-sidebar-border bg-sidebar py-1 shadow-lg"
            style={{ top: calendarDropdownRect.top, left: Math.max(0, calendarDropdownRect.left) }}
          >
            {assetCalendars.length === 0 ? (
              <p className="px-3 py-2 text-sm text-dashboard-foreground/70">No calendars yet.</p>
            ) : (
              sortedAssetCalendars.map((ac) => (
                <button
                  key={ac.id}
                  type="button"
                  onClick={() => { setSelectedAssetCalendarId(ac.id); setCalendarDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:text-primary transition-colors ${selectedAssetCalendarId === ac.id ? "text-primary font-medium" : "text-dashboard-foreground"}`}
                >
                  {new Date(ac.startDate).toISOString().slice(0, 10)} → {new Date(ac.endDate).toISOString().slice(0, 10)}
                </button>
              ))
            )}
          </div>,
          document.body
        )}

      {typeof document !== "undefined" &&
        watchlistDropdownOpen &&
        watchlistDropdownRect &&
        createPortal(
          <div
            ref={(el) => { watchlistDropdownRef.current = el; }}
            className="fixed z-[9999] w-[240px] max-h-[220px] overflow-y-auto rounded-lg border border-sidebar-border bg-sidebar py-1 shadow-lg"
            style={{ top: watchlistDropdownRect.top, left: Math.max(0, watchlistDropdownRect.left) }}
          >
            {assetWatchlists.length === 0 ? (
              <p className="px-3 py-2 text-sm text-dashboard-foreground/70">No watchlists yet.</p>
            ) : (
              sortedAssetWatchlists.map((aw) => (
                <button
                  key={aw.id}
                  type="button"
                  onClick={() => { setSelectedAssetWatchlistId(aw.id); setWatchlistDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:text-primary transition-colors ${selectedAssetWatchlistId === aw.id ? "text-primary font-medium" : "text-dashboard-foreground"}`}
                >
                  {new Date(aw.startDate).toISOString().slice(0, 10)} → {new Date(aw.endDate).toISOString().slice(0, 10)}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </>
  );
}
