"use client";

import { useState, useMemo } from "react";
import { Calendar, ChevronDown, Trash2 } from "lucide-react";
import { useWatchlistCalendar } from "@/context/WatchlistCalendarContext";
import { CreateEventModal } from "@/components/analysis/CreateEventModal";
import type { WeeklyCalendar, Event } from "@/types/api";
import type { EventImpact } from "@/types/calendar";
import { WeeklyCalendarModal } from "@/components/analysis/WeeklyCalendarModal";

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
  const s = new Date(start).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const e = new Date(end).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${s} → ${e}`;
}

function getDateForDay(calendar: WeeklyCalendar, day: string): string | null {
  const start = new Date(calendar.startDate);
  const end = new Date(calendar.endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const label = d.toLocaleDateString("en-US", { weekday: "long" });
    if (label.toLowerCase() === day.toLowerCase()) {
      return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

function getDaysInRange(start: string, end: string): { date: string; label: string }[] {
  const days: { date: string; label: string }[] = [];
  const d = new Date(start);
  const endD = new Date(end);
  while (d <= endD) {
    const iso = d.toISOString().slice(0, 10);
    days.push({
      date: iso,
      label: new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
    });
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function CalendarView() {
  const {
    weeklyCalendars,
    events,
    createWeeklyCalendar,
    deleteEvent,
    deleteWeeklyCalendar,
    updateWeeklyCalendar,
    updateEvent,
  } = useWatchlistCalendar();

  const [displayCount, setDisplayCount] = useState<string>("4");
  const [displayDropdownOpen, setDisplayDropdownOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<WeeklyCalendar | null>(null);
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [createCalendarModalOpen, setCreateCalendarModalOpen] = useState(false);

  const sortedCalendars = useMemo(
    () =>
      [...weeklyCalendars].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [weeklyCalendars]
  );

  const displayedCalendars = useMemo(() => {
    if (displayCount === "all") return sortedCalendars;
    const n = Math.max(1, parseInt(displayCount, 10) || 1);
    return sortedCalendars.slice(0, n);
  }, [sortedCalendars, displayCount]);

  const eventsByCalendarId = useMemo(() => {
    const map: Record<string, Event[]> = {};
    events.forEach((ev) => {
      const calId =
        ev.assetCalendar?.weeklyCalendar?.id ?? ev.calendar?.id ?? null;
      if (!calId) return;
      if (!map[calId]) map[calId] = [];
      map[calId].push(ev);
    });
    Object.keys(map).forEach((id) => {
      map[id].sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));
    });
    return map;
  }, [events]);

  const displayLabel =
    DISPLAY_OPTIONS.find((o) => o.value === displayCount)?.label ?? "Last 4";

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-auto">
      <div className="p-6 pt-4 flex flex-col min-h-0 flex-1">
        <h1 className="text-xl font-semibold text-dashboard-foreground mb-4">
          Economic Calendar
        </h1>
        <p className="text-sm text-dashboard-foreground/70 mb-4">
          Create calendars and events from any asset&apos;s Economic Events tab. Each card shows all events for that week, sorted by date & time.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setCreateCalendarModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Create calendar
          </button>
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
              <p className="text-xs mt-1 mb-3">Create a calendar to get started.</p>
              <button
                type="button"
                onClick={() => setCreateCalendarModalOpen(true)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Create calendar
              </button>
            </div>
          ) : (
            displayedCalendars.map((cal: WeeklyCalendar) => {
              const calEvents = eventsByCalendarId[cal.id] ?? [];
              const eventsByDate: Record<string, Event[]> = {};
              calEvents.forEach((ev) => {
                const date = getDateForDay(cal, ev.day);
                if (!date) return;
                if (!eventsByDate[date]) eventsByDate[date] = [];
                eventsByDate[date].push(ev);
              });
              Object.keys(eventsByDate).forEach((d) =>
                eventsByDate[d].sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"))
              );
              const daysInRange = getDaysInRange(cal.startDate, cal.endDate);
              return (
                <div
                  key={cal.id}
                  className="rounded-xl border border-sidebar-border bg-sidebar/50 overflow-hidden shadow-sm"
                >
                  <div className="px-5 py-4 border-b border-sidebar-border bg-sidebar/80 grid grid-cols-[15%_12.5%_12.5%_12.5%_35%_12.5%] items-center gap-0 w-full">
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      <Calendar className="h-5 w-5 shrink-0 text-primary/80" />
                      <h2 className="text-lg font-semibold text-dashboard-foreground truncate">
                        {formatDateRange(cal.startDate, cal.endDate)}
                      </h2>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCalendar(cal);
                          setEditModalOpen(true);
                        }}
                        className="text-dashboard-foreground/50 hover:text-primary transition-colors p-1"
                        aria-label="Edit calendar"
                        title="Edit calendar"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteWeeklyCalendar(cal.id)}
                        className="text-dashboard-foreground/50 hover:text-red-400 transition-colors p-1"
                        aria-label="Delete calendar"
                        title="Delete calendar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    {daysInRange.length === 0 ? (
                      <p className="text-sm text-dashboard-foreground/50 py-4">
                        No date range.
                      </p>
                    ) : (
                      daysInRange.map(({ date, label }) => {
                        const dayEvents = (eventsByDate[date] ?? []).sort((a, b) =>
                          (a.time || "00:00").localeCompare(b.time || "00:00")
                        );
                        const today = new Date().toISOString().slice(0, 10);
                        const isToday = date === today;
                        return (
                          <div key={date} className="rounded-lg border border-sidebar-border bg-sidebar/30 overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-sidebar-border bg-sidebar/50">
                              <h4 className="text-sm font-semibold text-dashboard-foreground">
                                {label}
                              </h4>
                              {isToday && (
                                <span className="rounded bg-sidebar-hover px-2 py-0.5 text-xs font-medium text-dashboard-foreground/80">
                                  TODAY
                                </span>
                              )}
                            </div>
                            {dayEvents.length === 0 ? (
                              <p className="text-sm text-dashboard-foreground/50 py-4 px-4">
                                No events
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm table-fixed">
                                  <colgroup>
                                    <col className="w-[15%]" />
                                    <col className="w-[12.5%]" />
                                    <col className="w-[12.5%]" />
                                    <col className="w-[12.5%]" />
                                    <col className="w-[35%]" />
                                    <col className="w-[12.5%]" />
                                  </colgroup>
                                  <thead>
                                    <tr className="border-b border-sidebar-border bg-sidebar/80 text-dashboard-foreground/70 font-medium">
                                      <th className="py-2.5 px-2 text-left">DATE</th>
                                      <th className="py-2.5 px-2 text-center">TIME</th>
                                      <th className="py-2.5 px-2 text-center">CUR</th>
                                      <th className="py-2.5 px-2 text-center">IMPACT</th>
                                      <th className="py-2.5 px-2 text-left"></th>
                                      <th className="py-2.5 px-2 text-center">DEL</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {dayEvents.map((ev, i) => (
                                      <tr
                                        key={ev.id}
                                        className={`border-b border-sidebar-border/50 last:border-0 ${
                                          i % 2 === 0 ? "bg-header-input/30" : "bg-sidebar/30"
                                        }`}
                                      >
                                        <td className="py-2.5 px-2 text-dashboard-foreground/80 text-left">
                                          {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </td>
                                        <td className="py-2.5 px-2 text-dashboard-foreground/90 tabular-nums text-center">
                                          {ev.time || "—"}
                                        </td>
                                        <td className="py-2.5 px-2 text-dashboard-foreground font-medium text-center">
                                          {ev.asset?.name ?? "—"}
                                        </td>
                                        <td className="py-2.5 px-2 text-center">
                                          <span
                                            className="inline-flex gap-0.5 items-center justify-center"
                                            title={ev.impact}
                                          >
                                            <span
                                              className={`w-1.5 h-1.5 shrink-0 rounded-full ${IMPACT_DOTS[ev.impact.toLowerCase() as EventImpact]}`}
                                            />
                                            <span
                                              className={`w-1.5 h-1.5 shrink-0 rounded-full ${IMPACT_DOTS[ev.impact.toLowerCase() as EventImpact]}`}
                                            />
                                            <span
                                              className={`w-1.5 h-1.5 shrink-0 rounded-full ${IMPACT_DOTS[ev.impact.toLowerCase() as EventImpact]}`}
                                            />
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-2 text-dashboard-foreground text-left break-words" title={ev.name}>
                                          {ev.name}
                                        </td>
                                        <td className="py-2.5 px-2 text-center">
                                          <span className="inline-flex items-center justify-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingEvent(ev);
                                                setEditEventOpen(true);
                                              }}
                                              className="text-dashboard-foreground/50 hover:text-primary transition-colors"
                                              aria-label="Edit event"
                                              title="Edit event"
                                            >
                                              ✎
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => deleteEvent(ev.id)}
                                              className="text-dashboard-foreground/50 hover:text-red-400 transition-colors"
                                              aria-label="Delete event"
                                              title="Delete event"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
    <WeeklyCalendarModal
      open={createCalendarModalOpen}
      onOpenChange={setCreateCalendarModalOpen}
      mode="create"
      onSubmit={async (dto) => {
        await createWeeklyCalendar(dto);
        setCreateCalendarModalOpen(false);
      }}
    />
    <WeeklyCalendarModal
      open={editModalOpen}
      onOpenChange={setEditModalOpen}
      mode="edit"
      initialStartDate={editingCalendar?.startDate}
      initialEndDate={editingCalendar?.endDate}
      onSubmit={async (dto) => {
        if (!editingCalendar) return;
        await updateWeeklyCalendar(editingCalendar.id, dto);
        setEditModalOpen(false);
        setEditingCalendar(null);
      }}
    />
    <CreateEventModal
      open={editEventOpen}
      onOpenChange={setEditEventOpen}
      calendars={weeklyCalendars}
      selectedCalendarId={
        editingEvent?.assetCalendar?.weeklyCalendar?.id ??
        editingEvent?.calendar?.id ??
        null
      }
      defaultCurrency={editingEvent?.asset.name ?? ""}
      mode="edit"
      initialEvent={editingEvent ?? undefined}
      onSubmit={async (dto) => {
        if (!editingEvent) return;
        await updateEvent(editingEvent.id, dto);
        setEditEventOpen(false);
        setEditingEvent(null);
      }}
    />
    </>
  );
}
