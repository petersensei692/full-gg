"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { AssetConfig, StreamEntry } from "@/types/asset";
import { AssetHeader } from "./analysis/AssetHeader";
import { StreamTabs } from "./analysis/StreamTabs";
import { StreamEntry as StreamEntryComponent } from "./analysis/StreamEntry";
import { PostAnalysisInput } from "./analysis/PostAnalysisInput";
import { EconomicEventsView } from "./analysis/EconomicEventsView";
import { PairWatchlistView } from "./analysis/PairWatchlistView";

const ANALYSIS_TYPE_TO_TAG: Record<string, { tag: StreamEntry["tag"]; tagColor: StreamEntry["tagColor"] }> = {
  daily: { tag: "INTRADAY UPDATE", tagColor: "orange" },
  weekly: { tag: "WEEKLY OUTLOOK", tagColor: "green" },
  monthly: { tag: "POLICY NOTE", tagColor: "blue" },
  qoq: { tag: "MARKET PULSE", tagColor: "purple" },
  yearly: { tag: "POLICY NOTE", tagColor: "blue" },
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
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
  const [entries, setEntries] = useState<StreamEntry[]>([]);
  const [analysisFilter, setAnalysisFilter] = useState<string>("all");

  const handleCreate = useCallback(
    (contentHtml: string, analysisType: string) => {
      const now = Date.now();
      const { tag, tagColor } = ANALYSIS_TYPE_TO_TAG[analysisType] ?? { tag: "MARKET PULSE" as const, tagColor: "blue" as const };
      const entry: StreamEntry = {
        id: `entry-${now}`,
        author: "You",
        time: formatTime(new Date(now)),
        tag,
        tagColor,
        content: contentHtml,
        createdAt: now,
        analysisType: analysisType,
      };
      setEntries((prev) => [...prev, entry]);
    },
    []
  );

  const streamScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    streamScrollRef.current?.scrollTo({ top: streamScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [entries.length]);

  const filteredEntries = useMemo(() => {
    if (analysisFilter === "all") return entries;
    return entries.filter((e) => (e.analysisType ?? "daily") === analysisFilter);
  }, [entries, analysisFilter]);

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
      const weekGroup = isNewWeek && ts ? formatWeekGroup(ts) : undefined;
      const dateGroup = isNewDay && ts ? formatDateGroup(ts) : undefined;
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
    <div className="flex h-full min-h-0 flex-col overflow-auto">
        <div className="px-6 pt-3 pb-0">
          <AssetHeader title={fullTitle} />
          <div className="mt-2">
            <StreamTabs active={activeTab} onSelect={setActiveTab} />
          </div>
        </div>

        {activeTab === "stream" && (
          <div ref={streamScrollRef} className="flex-1 p-6 pt-4 overflow-auto w-full flex flex-col min-h-0">
            <div className="flex flex-wrap items-center gap-3 mb-4">
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
            </div>
            <div className="w-full max-w-full space-y-0 flex-1">
              {entriesWithGroups.map(({ entry, separatorType, weekGroup, dateGroup }) => (
                <StreamEntryComponent
                  key={entry.id}
                  entry={entry}
                  separatorType={separatorType}
                  weekGroup={weekGroup}
                  dateGroup={dateGroup}
                />
              ))}
            </div>
            <div className="w-full max-w-full mt-6">
              <PostAnalysisInput placeholder={asset.placeholder} onCreated={handleCreate} />
            </div>
          </div>
        )}

        {activeTab === "events" && <EconomicEventsView asset={asset} />}

        {activeTab === "watchlist" && <PairWatchlistView asset={asset} />}
    </div>
  );
}
