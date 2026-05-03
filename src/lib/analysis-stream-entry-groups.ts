import type { StreamEntry } from "@/types/asset";

export type StreamSeparatorType = "same-day" | "new-day" | "new-week" | "first";

export type StreamEntryGroupRow = {
  entry: StreamEntry;
  separatorType: StreamSeparatorType;
  weekGroup?: string;
  dateGroup?: string;
};

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

/** Shared date/week separators for asset + global analysis streams (oldest → newest). */
export function buildStreamEntryGroups(entries: StreamEntry[]): StreamEntryGroupRow[] {
  let lastWeekKey: string | undefined;
  let lastDateKey: string | undefined;
  return entries.map((entry, index) => {
    const ts = entry.createdAt ?? 0;
    const weekKey = ts ? getWeekKey(ts) : undefined;
    const dateKey = ts ? new Date(ts).toDateString() : undefined;
    const isNewWeek = weekKey && weekKey !== lastWeekKey;
    const isNewDay = dateKey && dateKey !== lastDateKey;
    if (weekKey) lastWeekKey = weekKey;
    if (dateKey) lastDateKey = dateKey;
    let separatorType: StreamSeparatorType = "first";
    if (index > 0) {
      if (isNewWeek) separatorType = "new-week";
      else if (isNewDay) separatorType = "new-day";
      else separatorType = "same-day";
    }
    const weekGroup = (isNewWeek || index === 0) && ts ? formatWeekGroup(ts) : undefined;
    const dateGroup = (isNewDay || index === 0) && ts ? formatDateGroup(ts) : undefined;
    return { entry, separatorType, weekGroup, dateGroup };
  });
}
