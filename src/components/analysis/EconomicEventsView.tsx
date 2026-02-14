"use client";

import { useState, useMemo, useEffect } from "react";
import { Calendar, Plus, ChevronDown, Trash2 } from "lucide-react";
import type { AssetConfig } from "@/types/asset";
import type { WeeklyCalendar, Event } from "@/types/api";
import type { EventImpact } from "@/types/calendar";
import { useWatchlistCalendar } from "@/context/WatchlistCalendarContext";
import { WeeklyCalendarModal } from "./WeeklyCalendarModal";
import { CreateEventModal } from "./CreateEventModal";

interface EconomicEventsViewProps {
  asset: AssetConfig;
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

const IMPACT_DOTS: Record<EventImpact, string> = {
  low: "bg-emerald-400",
  medium: "bg-amber-400",
  high: "bg-red-400",
};

function getWeekdayName(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
  });
}

export function EconomicEventsView({ asset }: EconomicEventsViewProps) {
  const {
    weeklyCalendars,
    events,
    createWeeklyCalendar,
    updateWeeklyCalendar,
    createEvent,
    updateEvent,
    deleteEvent,
    deleteWeeklyCalendar,
  } = useWatchlistCalendar();

  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<WeeklyCalendar | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);

  const selectedCalendar = weeklyCalendars.find((c) => c.id === selectedCalendarId);

  useEffect(() => {
    if (!selectedCalendarId && weeklyCalendars.length > 0) {
      setSelectedCalendarId(weeklyCalendars[0].id);
    }
  }, [selectedCalendarId, weeklyCalendars]);

  const daysInWeek = useMemo(
    () =>
      selectedCalendar
        ? getDaysInRange(selectedCalendar.startDate, selectedCalendar.endDate)
        : [],
    [selectedCalendar]
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    if (!selectedCalendar) return map;
    const dayToDate = Object.fromEntries(
      daysInWeek.map((d) => [getWeekdayName(d.date), d.date])
    );
    events
      .filter((e) => e.calendar.id === selectedCalendar.id)
      .forEach((e) => {
        const date = dayToDate[e.day];
        if (!date) return;
        if (!map[date]) map[date] = [];
        map[date].push(e);
      });
    Object.keys(map).forEach((d) =>
      map[d].sort((a, b) => (a.time || "").localeCompare(b.time || ""))
    );
    return map;
  }, [events, selectedCalendar, daysInWeek]);

  const handleCalendarSubmit = async (dto: { startDate: string; endDate: string }) => {
    if (editingCalendar) {
      const updated = await updateWeeklyCalendar(editingCalendar.id, dto);
      setSelectedCalendarId(updated.id);
    } else {
      const created = await createWeeklyCalendar(dto);
      setSelectedCalendarId(created.id);
    }
    setEditingCalendar(null);
    setCalendarDropdownOpen(false);
  };

  const handleEventSubmit = async (dto: {
    calendarId: string;
    day: string;
    time: string;
    assetId: string;
    name: string;
    impact: string;
  }) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, dto);
    } else {
      await createEvent(dto);
    }
    setSelectedCalendarId(dto.calendarId);
    setEditingEvent(null);
    setEventModalOpen(false);
  };

  return (
    <div className="flex-1 p-6 pt-4 flex flex-col min-h-0">
      {/* Top bar: Choose/Create Weekly Calendar + Create Event */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setCalendarDropdownOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors"
          >
            <Calendar className="h-4 w-4" />
            {selectedCalendar
              ? `${new Date(selectedCalendar.startDate).toISOString().slice(0, 10)} → ${new Date(
                  selectedCalendar.endDate
                ).toISOString().slice(0, 10)}`
              : "Choose or create weekly calendar"}
            <ChevronDown className="h-4 w-4" />
          </button>
          {calendarDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                aria-hidden
                onClick={() => setCalendarDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1 z-50 min-w-[220px] rounded-lg border border-sidebar-border bg-sidebar py-1 shadow-lg">
                {weeklyCalendars.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-dashboard-foreground/70">
                    No calendars yet
                  </p>
                ) : (
                  weeklyCalendars.map((cal) => (
                    <div key={cal.id} className="flex items-center gap-2 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCalendarId(cal.id);
                          setCalendarDropdownOpen(false);
                        }}
                        className={`flex-1 text-left text-sm hover:text-primary transition-colors ${
                          selectedCalendarId === cal.id
                            ? "text-primary font-medium"
                            : "text-dashboard-foreground"
                        }`}
                      >
                        {new Date(cal.startDate).toISOString().slice(0, 10)} →{" "}
                        {new Date(cal.endDate).toISOString().slice(0, 10)}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteWeeklyCalendar(cal.id)}
                        className="text-dashboard-foreground/50 hover:text-red-400 transition-colors"
                        aria-label="Delete calendar"
                        title="Delete calendar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCalendar(cal);
                          setCalendarModalOpen(true);
                        }}
                        className="text-dashboard-foreground/50 hover:text-primary transition-colors"
                        aria-label="Edit calendar"
                        title="Edit calendar"
                      >
                        ✎
                      </button>
                    </div>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCalendarDropdownOpen(false);
                    setCalendarModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-sidebar-hover transition-colors border-t border-sidebar-border mt-1 pt-2"
                >
                  <Plus className="h-4 w-4" />
                  Create new calendar
                </button>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEventModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create event
        </button>
      </div>

      {/* Weekly calendar view: days and events */}
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-sidebar-border bg-sidebar/30">
        {!selectedCalendar ? (
          <div className="flex flex-col items-center justify-center h-64 text-dashboard-foreground/60 text-sm">
            <Calendar className="h-10 w-10 mb-2 opacity-50" />
            <p>Select or create a weekly calendar to view events.</p>
          </div>
        ) : (
          <div className="divide-y divide-sidebar-border">
            {daysInWeek.map(({ date, label }) => {
              const today = new Date().toISOString().slice(0, 10);
              const isToday = date === today;
              const dayEvents = (eventsByDate[date] || []).sort((a, b) =>
                (a.time || "00:00").localeCompare(b.time || "00:00")
              );
              return (
                <div key={date} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-sm font-semibold text-dashboard-foreground">
                      {label}
                    </h4>
                    {isToday && (
                      <span className="rounded bg-sidebar-hover px-2 py-0.5 text-xs font-medium text-dashboard-foreground/80">
                        TODAY
                      </span>
                    )}
                  </div>
                  <div className="rounded-lg border border-sidebar-border overflow-hidden">
                    <table className="w-full text-sm table-fixed">
                      <thead>
                        <tr className="border-b border-sidebar-border bg-sidebar/80 text-dashboard-foreground/70 font-medium">
                          <th className="w-20 py-2.5 px-3 text-center">TIME</th>
                          <th className="w-16 py-2.5 px-3 text-center">CUR</th>
                          <th className="w-20 py-2.5 px-3 text-center">IMPACT</th>
                          <th className="w-1/3 max-w-[200px] py-2.5 px-3 text-center">EVENT</th>
                          <th className="w-10 py-2.5 px-3 text-center">DEL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayEvents.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-4 px-3 text-dashboard-foreground/50 text-center"
                            >
                              No events
                            </td>
                          </tr>
                        ) : (
                          dayEvents.map((ev, i) => (
                            <tr
                              key={ev.id}
                              className={`border-b border-sidebar-border/50 last:border-0 ${
                                i % 2 === 0 ? "bg-header-input/30" : "bg-sidebar/30"
                              }`}
                            >
                              <td className="py-2.5 px-3 text-dashboard-foreground/90 tabular-nums text-center">
                                {ev.time || "—"}
                              </td>
                              <td className="py-2.5 px-3 text-dashboard-foreground font-medium text-center">
                                {ev.asset?.name ?? asset.label}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className="inline-flex gap-0.5 items-center justify-center"
                                  title={ev.impact}
                                >
                                  <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${IMPACT_DOTS[ev.impact.toLowerCase() as EventImpact]}`} />
                                  <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${IMPACT_DOTS[ev.impact.toLowerCase() as EventImpact]}`} />
                                  <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${IMPACT_DOTS[ev.impact.toLowerCase() as EventImpact]}`} />
                                </span>
                              </td>
                              <td className="w-1/3 max-w-[200px] py-2.5 px-3 text-dashboard-foreground text-center truncate" title={ev.name}>
                                {ev.name}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => deleteEvent(ev.id)}
                                  className="text-dashboard-foreground/50 hover:text-red-400 transition-colors"
                                  aria-label="Delete event"
                                  title="Delete event"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEvent(ev);
                                    setEventModalOpen(true);
                                  }}
                                  className="ml-2 text-dashboard-foreground/50 hover:text-primary transition-colors"
                                  aria-label="Edit event"
                                  title="Edit event"
                                >
                                  ✎
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <WeeklyCalendarModal
        open={calendarModalOpen}
        onOpenChange={setCalendarModalOpen}
        mode={editingCalendar ? "edit" : "create"}
        initialStartDate={editingCalendar?.startDate}
        initialEndDate={editingCalendar?.endDate}
        onSubmit={handleCalendarSubmit}
      />
      <CreateEventModal
        open={eventModalOpen}
        onOpenChange={setEventModalOpen}
        calendars={weeklyCalendars}
        selectedCalendarId={selectedCalendarId}
        defaultCurrency={asset.label}
        mode={editingEvent ? "edit" : "create"}
        initialEvent={editingEvent ?? undefined}
        onSubmit={handleEventSubmit}
      />
    </div>
  );
}
