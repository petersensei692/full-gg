import type { StreamEntry } from "@/types/asset";

export type StreamSeparatorType =
  | "same-day"
  | "new-day"
  | "new-week"
  | "new-month"
  | "new-year"
  | "first";

export type StreamEntryGroupRow = {
  entry: StreamEntry;
  separatorType: StreamSeparatorType;
  yearGroup?: string;
  monthGroup?: string;
  weekGroup?: string;
  dateGroup?: string;
};

function formatDateGroup(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatWeekGroup(ts: number): string {
  const d = new Date(ts);
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (v: Date) => v.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return `Week of ${fmt(monday)} to ${fmt(sunday)}`;
}

function getWeekKey(ts: number): string {
  const d = new Date(ts);
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return monday.toISOString().slice(0, 10);
}

function getMonthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`;
}

function getYearKey(ts: number): string {
  return `${new Date(ts).getFullYear()}`;
}

function formatMonthGroup(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Shared date/week separators for asset + global analysis streams (oldest → newest). */
export function buildStreamEntryGroups(entries: StreamEntry[]): StreamEntryGroupRow[] {
  let lastYearKey: string | undefined;
  let lastMonthKey: string | undefined;
  let lastWeekKey: string | undefined;
  let lastDateKey: string | undefined;
  return entries.map((entry, index) => {
    const ts = entry.createdAt ?? 0;
    const yearKey = ts ? getYearKey(ts) : undefined;
    const monthKey = ts ? getMonthKey(ts) : undefined;
    const weekKey = ts ? getWeekKey(ts) : undefined;
    const dateKey = ts ? new Date(ts).toDateString() : undefined;
    const isNewYear = yearKey && yearKey !== lastYearKey;
    const isNewMonth = monthKey && monthKey !== lastMonthKey;
    const isNewWeek = weekKey && weekKey !== lastWeekKey;
    const isNewDay = dateKey && dateKey !== lastDateKey;
    if (yearKey) lastYearKey = yearKey;
    if (monthKey) lastMonthKey = monthKey;
    if (weekKey) lastWeekKey = weekKey;
    if (dateKey) lastDateKey = dateKey;
    let separatorType: StreamSeparatorType = "first";
    if (index > 0) {
      if (isNewYear) separatorType = "new-year";
      else if (isNewMonth) separatorType = "new-month";
      else if (isNewWeek) separatorType = "new-week";
      else if (isNewDay) separatorType = "new-day";
      else separatorType = "same-day";
    }
    const yearGroup = (isNewYear || index === 0) && ts ? getYearKey(ts) : undefined;
    const monthGroup = (isNewMonth || index === 0) && ts ? formatMonthGroup(ts) : undefined;
    const weekGroup = (isNewWeek || index === 0) && ts ? formatWeekGroup(ts) : undefined;
    const dateGroup = (isNewDay || index === 0) && ts ? formatDateGroup(ts) : undefined;
    return { entry, separatorType, yearGroup, monthGroup, weekGroup, dateGroup };
  });
}
