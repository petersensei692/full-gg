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

function formatDateGroup(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

interface AssetAnalysisViewProps {
  asset: AssetConfig;
}

export function AssetAnalysisView({ asset }: AssetAnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<"stream" | "events" | "watchlist">("stream");
  const [entries, setEntries] = useState<StreamEntry[]>([]);

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
      };
      setEntries((prev) => [...prev, entry]);
    },
    []
  );

  const streamScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    streamScrollRef.current?.scrollTo({ top: streamScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [entries.length]);

  const entriesWithDateGroups = useMemo(() => {
    let lastDateGroup: string | undefined;
    return entries.map((entry) => {
      const group = entry.createdAt ? formatDateGroup(entry.createdAt) : undefined;
      const showDateGroup = group && group !== lastDateGroup;
      if (showDateGroup) lastDateGroup = group;
      return { entry, dateGroup: showDateGroup ? group : undefined };
    });
  }, [entries]);

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
            <div className="w-full max-w-full space-y-6 flex-1">
              {entriesWithDateGroups.map(({ entry, dateGroup }) => (
                <StreamEntryComponent
                  key={entry.id}
                  entry={entry}
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
