"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { StreamEntry } from "@/types/asset";
import type { GlobalAnalysis } from "@/types/api";
import { globalAnalysisService } from "@/lib/api";
import { useAssets } from "@/context/AssetsContext";
import { StreamEntry as StreamEntryComponent } from "./analysis/StreamEntry";
import { PostGlobalAnalysisInput } from "./PostGlobalAnalysisInput";
import { EditAnalysisModal } from "./analysis/EditAnalysisModal";
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

export function GlobalAnalysisView() {
  const { assets } = useAssets();
  const [list, setList] = useState<GlobalAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisFilter, setAnalysisFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>(null);
  const [editing, setEditing] = useState<GlobalAnalysis | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await globalAnalysisService.getAll();
      setList(data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleCreate = useCallback(
    async (payload: {
      notes: string;
      images: string[];
      imageNames?: string[];
      scope: "global" | string[];
      analysisType: string;
    }) => {
      await globalAnalysisService.create({
        notes: payload.notes,
        images: payload.images,
        imageNames: payload.imageNames,
        scope: payload.scope,
        analysisType: payload.analysisType,
      });
      await fetchList();
    },
    [fetchList]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await globalAnalysisService.delete(id);
      await fetchList();
    },
    [fetchList]
  );

  const handleEdit = useCallback((ga: GlobalAnalysis) => {
    setEditing(ga);
    setEditModalOpen(true);
  }, []);

  const handleEditSubmit = useCallback(
    async (payload: { notes: string; images: string[] }) => {
      if (!editing) return;
      await globalAnalysisService.update(editing.id, {
        notes: payload.notes,
        images: payload.images.length > 0 ? payload.images : null,
      });
      setEditing(null);
      setEditModalOpen(false);
      await fetchList();
    },
    [editing, fetchList]
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
      await globalAnalysisService.update(gaId, { imageNames: nextImageNames });
      await fetchList();
    },
    [list, fetchList]
  );

  const mappedEntries = useMemo((): StreamEntry[] => {
    return list.map((ga) => {
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
        content: ga.notes,
        createdAt,
        analysisType,
        images: imageList,
        imageNames,
        scopeLabel: ga.scopeDisplay,
      };
    });
  }, [list]);

  const filteredEntries = useMemo(() => {
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
    return entries;
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

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-auto">
        <div className="h-14 shrink-0 flex items-center gap-3 px-6 border-b border-sidebar-border overflow-hidden">
          <div className="flex-grow-0 min-w-0 overflow-hidden">
            <h2 className="text-sm font-semibold text-dashboard-foreground truncate">Global Analysis</h2>
          </div>
          <div className="flex-1 min-w-0 overflow-hidden flex justify-center" />
          <div className="flex-1 min-w-0 overflow-hidden flex items-center justify-end gap-2">
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
        </div>
        <div className="flex-1 flex flex-col min-h-0 w-full">
          <div className="flex-1 min-h-0 overflow-auto px-6 w-full">
            <div className="w-full max-w-full space-y-0 pb-4">
              {loading ? (
                <p className="text-sm text-dashboard-foreground/70 py-4">Loading...</p>
              ) : (
                entriesWithGroups.map(({ entry, separatorType, weekGroup, dateGroup }) => (
                  <StreamEntryComponent
                    key={entry.id}
                    entry={entry}
                    separatorType={separatorType}
                    weekGroup={weekGroup}
                    dateGroup={dateGroup}
                    onDelete={() => handleDelete(entry.id)}
                    onUpdateImageName={(path, name) => handleUpdateImageName(entry.id, path, name)}
                    onEdit={() => {
                      const ga = list.find((g) => g.id === entry.id);
                      if (ga) handleEdit(ga);
                    }}
                  />
                ))
              )}
            </div>
          </div>
          <div className="shrink-0 w-full px-6 pb-6 pt-3 border-t border-sidebar-border/50 bg-dashboard-bg">
            <PostGlobalAnalysisInput
              placeholder="Post a new global analysis..."
              assets={assets}
              onCreated={handleCreate}
            />
          </div>
        </div>
      </div>

      {editing && (
        <EditAnalysisModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          initialNotes={editing.notes}
          initialImages={editing.images ?? []}
          onSubmit={handleEditSubmit}
        />
      )}
    </>
  );
}
