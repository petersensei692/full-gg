"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { AssetConfig, StreamEntry } from "@/types/asset";
import type { Analysis } from "@/types/api";
import { analysisService } from "@/lib/api";
import { deleteStoredImage } from "@/lib/imageUpload";
import { EditAnalysisModal } from "./analysis/EditAnalysisModal";
import { AssetHeader } from "./analysis/AssetHeader";
import { StreamTabs } from "./analysis/StreamTabs";
import { StreamEntry as StreamEntryComponent } from "./analysis/StreamEntry";
import { PostAnalysisInput } from "./analysis/PostAnalysisInput";
import { EconomicEventsView } from "./analysis/EconomicEventsView";
import { PairWatchlistView } from "./analysis/PairWatchlistView";
import { DateRangePicker, type DateRange } from "./analysis/DateRangePicker";

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
  const [activeTab, setActiveTab] = useState<"stream" | "events" | "watchlist">("stream");
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [analysisFilter, setAnalysisFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>(null);
  const [editingAnalysis, setEditingAnalysis] = useState<Analysis | null>(null);
  const [editingAnalysisType, setEditingAnalysisType] = useState<string>("daily");
  const [editModalOpen, setEditModalOpen] = useState(false);

  const handleCreate = useCallback(async (payload: { notes: string; images: string[]; analysisType: string }) => {
    const notesWithMarker = addAnalysisTypeMarker(payload.notes, payload.analysisType);
    const created = await analysisService.create({
      assetId: asset.id,
      notes: notesWithMarker,
      images: payload.images,
    });
    setAnalyses((prev) => [...prev, created]);
  }, [asset.id]);

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
    streamScrollRef.current?.scrollTo({ top: streamScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [analyses.length]);

  useEffect(() => {
    analysisService
      .getAll(asset.id)
      .then((list) => setAnalyses(list))
      .catch(() => setAnalyses([]));
  }, [asset.id]);

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

  const displayTitle = asset.symbol
    ? `${asset.label} (${asset.symbol})`
    : asset.label;
  const fullTitle =
    asset.slug === "usd"
      ? `US Dollar Index (${asset.symbol ?? asset.label})`
      : displayTitle;

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-auto">
        <div className="px-6 pt-3 pb-0">
          <AssetHeader title={fullTitle} />
          <div className="mt-2">
            <StreamTabs active={activeTab} onSelect={setActiveTab} />
          </div>
        </div>

        {activeTab === "stream" && (
          <div className="flex-1 flex flex-col min-h-0 w-full">
            <div className="flex flex-wrap items-center gap-3 mb-4 px-6 pt-4 shrink-0">
              <span className="text-sm text-dashboard-foreground/70">Filter:</span>
              <select
                value={analysisFilter}
                onChange={(e) => setAnalysisFilter(e.target.value)}
                className="rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {ANALYSIS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
            <div ref={streamScrollRef} className="flex-1 min-h-0 overflow-auto px-6 w-full">
              <div className="w-full max-w-full space-y-0 pb-4">
                {entriesWithGroups.map(({ entry, separatorType, weekGroup, dateGroup }) => (
                  <StreamEntryComponent
                    key={entry.id}
                    entry={entry}
                    separatorType={separatorType}
                    weekGroup={weekGroup}
                    dateGroup={dateGroup}
                    onDelete={() => handleDeleteAnalysis(entry.id, entry.images ?? [])}
                    onDeleteImage={(path) => handleDeleteImage(entry.id, path)}
                    onUpdateImageName={(path, name) => handleUpdateImageName(entry.id, path, name)}
                    onEdit={() => {
                      const analysis = analyses.find((a) => a.id === entry.id);
                      if (analysis) handleEditAnalysis(analysis);
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="shrink-0 w-full px-6 pb-6 pt-3 border-t border-sidebar-border/50 bg-dashboard-bg">
              <PostAnalysisInput placeholder={asset.placeholder} onCreated={handleCreate} />
            </div>
          </div>
        )}

        {activeTab === "events" && <EconomicEventsView asset={asset} />}

        {activeTab === "watchlist" && <PairWatchlistView asset={asset} />}
      </div>
      {editingAnalysis && (
        <EditAnalysisModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          initialNotes={extractAnalysisType(editingAnalysis.notes).cleanedNotes}
          initialImages={editingAnalysis.images ?? []}
          onSubmit={async ({ notes, images }) => {
            if (!editingAnalysis) return;
            const notesWithMarker = addAnalysisTypeMarker(notes, editingAnalysisType);
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
    </>
  );
}
