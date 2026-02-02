"use client";

import { useState, useMemo } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { useWatchlistCalendar } from "@/context/WatchlistCalendarContext";
import type { WeeklyCalendar, EconomicEvent, EventImpact } from "@/types/calendar";

const DISPLAY_OPTIONS = [
  { value: "1", label: "Latest" },
  { value: "2", label: "Last 2" },
  { value: "4", label: "Last 4" },
  { value: "8", label: "Last 8" },
  { value: "12", label: "Last 12" },
  { value: "all", label: "All" },
] as const;

const IMPACT_DOTS: Record<EventImpact, string> = {
  low: "bg-emerald-400",
  medium: "bg-amber-400",
  high: "bg-red-400",
};

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const e = new Date(end + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${s} → ${e}`;
}

export function CalendarView() {
  const { calendars, economicEvents } = useWatchlistCalendar();

  const [displayCount, setDisplayCount] = useState<string>("4");
  const [displayDropdownOpen, setDisplayDropdownOpen] = useState(false);

  const sortedCalendars = useMemo(
    () => [...calendars].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [calendars]
  );

  const displayedCalendars = useMemo(() => {
    if (displayCount === "all") return sortedCalendars;
    const n = Math.max(1, parseInt(displayCount, 10) || 1);
    return sortedCalendars.slice(0, n);
  }, [sortedCalendars, displayCount]);

  const eventsByCalendarId = useMemo(() => {
    const map: Record<string, EconomicEvent[]> = {};
    economicEvents.forEach((ev) => {
      if (!map[ev.weeklyCalendarId]) map[ev.weeklyCalendarId] = [];
      map[ev.weeklyCalendarId].push(ev);
    });
    Object.keys(map).forEach((id) => {
      map[id].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return (a.time || "00:00").localeCompare(b.time || "00:00");
      });
    });
    return map;
  }, [economicEvents]);

  const displayLabel =
    DISPLAY_OPTIONS.find((o) => o.value === displayCount)?.label ?? "Last 4";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto">
      <div className="p-6 pt-4 flex flex-col min-h-0 flex-1">
        <h1 className="text-xl font-semibold text-dashboard-foreground mb-4">
          Economic Calendar
        </h1>
        <p className="text-sm text-dashboard-foreground/70 mb-4">
          Create calendars and events from any asset&apos;s Economic Events tab. Each card shows all events for that week, sorted by date & time.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative">
            <button
              type="button"
              onClick={() => setDisplayDropdownOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors"
            >
              Display: {displayLabel}
              <ChevronDown className="h-4 w-4" />
            </button>
            {displayDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden
                  onClick={() => setDisplayDropdownOpen(false)}
                />
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border border-sidebar-border bg-sidebar py-1 shadow-lg">
                  {DISPLAY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setDisplayCount(opt.value);
                        setDisplayDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-sidebar-hover transition-colors ${
                        displayCount === opt.value
                          ? "text-primary font-medium"
                          : "text-dashboard-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto space-y-6">
          {displayedCalendars.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[280px] text-dashboard-foreground/60 text-sm rounded-xl border border-sidebar-border bg-sidebar/30">
              <Calendar className="h-12 w-12 mb-3 opacity-50" />
              <p>No weekly calendars yet.</p>
              <p className="text-xs mt-1">Create one from an asset&apos;s Economic Events tab.</p>
            </div>
          ) : (
            displayedCalendars.map((cal: WeeklyCalendar) => {
              const events = eventsByCalendarId[cal.id] ?? [];
              return (
                <div
                  key={cal.id}
                  className="rounded-xl border border-sidebar-border bg-sidebar/50 overflow-hidden shadow-sm"
                >
                  <div className="px-5 py-4 border-b border-sidebar-border bg-sidebar/80">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary/80" />
                      <h2 className="text-lg font-semibold text-dashboard-foreground">
                        {formatDateRange(cal.startDate, cal.endDate)}
                      </h2>
                    </div>
                  </div>
                  <div className="p-5">
                    {events.length === 0 ? (
                      <p className="text-sm text-dashboard-foreground/50 py-4">
                        No events in this calendar yet.
                      </p>
                    ) : (
                      <div className="rounded-lg border border-sidebar-border overflow-hidden">
                        <table className="w-full text-sm table-fixed">
                          <thead>
                            <tr className="border-b border-sidebar-border bg-sidebar/80 text-dashboard-foreground/70 font-medium">
                              <th className="w-24 py-2.5 px-3 text-left">DATE</th>
                              <th className="w-20 py-2.5 px-3 text-center">TIME</th>
                              <th className="w-16 py-2.5 px-3 text-center">CUR</th>
                              <th className="w-16 py-2.5 px-3 text-center">IMPACT</th>
                              <th className="flex-1 min-w-0 py-2.5 px-3 text-left">EVENT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {events.map((ev, i) => {
                              const dateLabel = new Date(
                                ev.date + "T12:00:00"
                              ).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              });
                              return (
                                <tr
                                  key={ev.id}
                                  className={`border-b border-sidebar-border/50 last:border-0 ${
                                    i % 2 === 0 ? "bg-header-input/30" : "bg-sidebar/30"
                                  }`}
                                >
                                  <td className="py-2.5 px-3 text-dashboard-foreground/80 text-left">
                                    {dateLabel}
                                  </td>
                                  <td className="py-2.5 px-3 text-dashboard-foreground/90 tabular-nums text-center">
                                    {ev.time || "—"}
                                  </td>
                                  <td className="py-2.5 px-3 text-dashboard-foreground font-medium text-center">
                                    {ev.currency || "—"}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span
                                      className="inline-flex gap-0.5 items-center justify-center"
                                      title={ev.impact}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 shrink-0 rounded-full ${IMPACT_DOTS[ev.impact]}`}
                                      />
                                      <span
                                        className={`w-1.5 h-1.5 shrink-0 rounded-full ${IMPACT_DOTS[ev.impact]}`}
                                      />
                                      <span
                                        className={`w-1.5 h-1.5 shrink-0 rounded-full ${IMPACT_DOTS[ev.impact]}`}
                                      />
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-dashboard-foreground text-left truncate" title={ev.name}>
                                    {ev.name}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
