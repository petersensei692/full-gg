"use client";

import { useState, useMemo, useEffect } from "react";
import { Calendar, Plus, ChevronDown, Trash2 } from "lucide-react";
import type { AssetConfig } from "@/types/asset";
import type { AssetCalendar, Event } from "@/types/api";
import type { EventImpact } from "@/types/calendar";
import { useWatchlistCalendar } from "@/context/WatchlistCalendarContext";
import { assetCalendarService } from "@/lib/api";
import { CreateEventModal } from "./CreateEventModal";

interface EconomicEventsViewProps {
  asset: AssetConfig;
  /** When provided, toolbar is rendered by parent; no internal fetch or modal */
  assetCalendars?: AssetCalendar[];
  selectedAssetCalendarId?: string | null;
  selectedAssetCalendar?: AssetCalendar | null;
  eventModalOpen?: boolean;
  setEventModalOpen?: (open: boolean) => void;
  onEditEvent?: (ev: Event) => void;
  loadingCalendars?: boolean;
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

const todayIso = () => new Date().toISOString().slice(0, 10);

/** True if the given date is strictly before today */
function isDayPassed(date: string): boolean {
  return date < todayIso();
}

/** True if the event's datetime (date + time) is in the past */
function isEventPassed(date: string, time: string): boolean {
  const dateTime = `${date}T${time || "23:59"}`;
  const eventMs = new Date(dateTime).getTime();
  return eventMs < Date.now();
}

/** Resolve weekday (e.g. "Tuesday") to the first matching date in range (same logic as principal calendar). */
function getDateForWeekdayInRange(
  startDate: string,
  endDate: string,
  weekday: string
): string | null {
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const label = d.toLocaleDateString("en-US", { weekday: "long" });
    if (label.toLowerCase() === weekday.toLowerCase()) {
      return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

export function EconomicEventsView({
  asset,
  assetCalendars: assetCalendarsProp,
  selectedAssetCalendarId: selectedAssetCalendarIdProp,
  selectedAssetCalendar: selectedAssetCalendarProp,
  eventModalOpen: eventModalOpenProp,
  setEventModalOpen: setEventModalOpenProp,
  onEditEvent,
  loadingCalendars: loadingCalendarsProp,
}: EconomicEventsViewProps) {
  const { events, deleteEvent } = useWatchlistCalendar();
  const controlled = assetCalendarsProp !== undefined;

  const [assetCalendarsLocal, setAssetCalendarsLocal] = useState<AssetCalendar[]>([]);
  const [selectedAssetCalendarIdLocal, setSelectedAssetCalendarIdLocal] = useState<string | null>(null);
  const [loadingCalendarsLocal, setLoadingCalendarsLocal] = useState(false);

  const assetCalendars = controlled ? assetCalendarsProp! : assetCalendarsLocal;
  const selectedAssetCalendarId = controlled ? (selectedAssetCalendarIdProp ?? null) : selectedAssetCalendarIdLocal;
  const loadingCalendars = controlled ? (loadingCalendarsProp ?? false) : loadingCalendarsLocal;
  const selectedAssetCalendar = controlled
    ? (selectedAssetCalendarProp ?? assetCalendars.find((ac) => ac.id === selectedAssetCalendarId) ?? null)
    : assetCalendars.find((ac) => ac.id === selectedAssetCalendarId) ?? null;

  useEffect(() => {
    if (controlled || !asset.id) return;
    setLoadingCalendarsLocal(true);
    assetCalendarService
      .getByAsset(asset.id)
      .then((list) => {
        setAssetCalendarsLocal(list);
        const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSelectedAssetCalendarIdLocal((prev) => (prev && list.some((ac) => ac.id === prev) ? prev : sorted[0]?.id ?? null));
      })
      .catch(() => setAssetCalendarsLocal([]))
      .finally(() => setLoadingCalendarsLocal(false));
  }, [asset.id, controlled]);

  const daysInWeek = useMemo(
    () =>
      selectedAssetCalendar
        ? getDaysInRange(
            selectedAssetCalendar.startDate,
            selectedAssetCalendar.endDate
          )
        : [],
    [selectedAssetCalendar]
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    if (!selectedAssetCalendar) return map;
    events
      .filter((e) => e.assetCalendar?.id === selectedAssetCalendar.id)
      .forEach((e) => {
        const date = getDateForWeekdayInRange(
          selectedAssetCalendar.startDate,
          selectedAssetCalendar.endDate,
          e.day
        );
        if (!date) return;
        if (!map[date]) map[date] = [];
        map[date].push(e);
      });
    Object.keys(map).forEach((d) =>
      map[d].sort((a, b) => (a.time || "").localeCompare(b.time || ""))
    );
    return map;
  }, [events, selectedAssetCalendar]);

  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const { createEvent, updateEvent, refetchAll } = useWatchlistCalendar();
  const handleEventSubmit = async (dto: {
    assetCalendarId?: string;
    calendarId?: string;
    day: string;
    time: string;
    assetId?: string;
    name: string;
    impact: string;
  }) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, { day: dto.day, time: dto.time, name: dto.name, impact: dto.impact });
    } else {
      await createEvent(dto);
    }
    if (!controlled && dto.assetCalendarId) setSelectedAssetCalendarIdLocal(dto.assetCalendarId);
    setEditingEvent(null);
    setEventModalOpen(false);
    refetchAll();
  };
  const showToolbar = !controlled;

  return (
    <div className="flex-1 p-6 pt-4 flex flex-col min-h-0">
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setCalendarDropdownOpen((o) => !o)}
              disabled={loadingCalendars || !asset.id}
              className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors disabled:opacity-50"
            >
              <Calendar className="h-4 w-4" />
              {loadingCalendars ? "Loading..." : selectedAssetCalendar
                ? `${new Date(selectedAssetCalendar.startDate).toISOString().slice(0, 10)} → ${new Date(selectedAssetCalendar.endDate).toISOString().slice(0, 10)}`
                : assetCalendars.length === 0 ? "No calendars (create one on Calendar page)" : "Choose calendar"}
              <ChevronDown className="h-4 w-4" />
            </button>
            {calendarDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" aria-hidden onClick={() => setCalendarDropdownOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[220px] max-h-[220px] overflow-y-auto rounded-lg border border-sidebar-border bg-sidebar py-1 shadow-lg">
                  {assetCalendars.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-dashboard-foreground/70">No calendars yet. Create one from the Calendar page.</p>
                  ) : (
                    [...assetCalendars].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((ac) => (
                      <div key={ac.id} className="flex items-center gap-2 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => { setSelectedAssetCalendarIdLocal(ac.id); setCalendarDropdownOpen(false); }}
                          className={`flex-1 text-left text-sm hover:text-primary transition-colors ${selectedAssetCalendarId === ac.id ? "text-primary font-medium" : "text-dashboard-foreground"}`}
                        >
                          {new Date(ac.startDate).toISOString().slice(0, 10)} → {new Date(ac.endDate).toISOString().slice(0, 10)}
                        </button>
                      </div>
                    ))
                  )}
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
      )}

      {/* Weekly calendar view: days and events */}
      {!selectedAssetCalendar ? (
        <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-sidebar-border bg-sidebar/30 flex flex-col items-center justify-center h-64 text-dashboard-foreground/60 text-sm">
          <Calendar className="h-10 w-10 mb-2 opacity-50" />
          <p>
            {asset.id
              ? "Select a calendar or create one from the Calendar page."
              : "Asset ID required to load calendars."}
          </p>
        </div>
      ) : (() => {
        const allDaysPassed = daysInWeek.length > 0 && daysInWeek.every((d) => isDayPassed(d.date));
        return (
          <div
            className={`flex-1 min-h-0 overflow-auto rounded-lg border border-sidebar-border ${
              allDaysPassed ? "bg-dashboard-foreground/10" : "bg-sidebar/30"
            }`}
          >
            <div className="divide-y divide-sidebar-border">
              {daysInWeek.map(({ date, label }) => {
                const today = todayIso();
                const isToday = date === today;
                const dayPassed = isDayPassed(date);
                const dayEvents = (eventsByDate[date] || []).sort((a, b) =>
                  (a.time || "00:00").localeCompare(b.time || "00:00")
                );
                return (
                  <div
                    key={date}
                    className={`p-4 ${dayPassed ? "bg-dashboard-foreground/10" : ""}`}
                  >
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
                          {dayEvents.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="py-4 px-2 text-dashboard-foreground/50 text-center"
                              >
                                No events
                              </td>
                            </tr>
                          ) : (
                            dayEvents.map((ev, i) => {
                              const eventPassed = isEventPassed(date, ev.time || "");
                              return (
                                <tr
                                  key={ev.id}
                                  className={`border-b border-sidebar-border/50 last:border-0 ${
                                    eventPassed
                                      ? "bg-dashboard-foreground/15"
                                      : i % 2 === 0
                                        ? "bg-header-input/30"
                                        : "bg-sidebar/30"
                                  }`}
                                >
                              <td className="py-2.5 px-2 text-dashboard-foreground/90 text-left break-words">
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
                                {ev.asset?.name ?? asset.label}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <span
                                  className="inline-flex gap-0.5 items-center justify-center"
                                  title={ev.impact}
                                >
                                  <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${IMPACT_DOTS[ev.impact.toLowerCase() as EventImpact]}`} />
                                  <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${IMPACT_DOTS[ev.impact.toLowerCase() as EventImpact]}`} />
                                  <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${IMPACT_DOTS[ev.impact.toLowerCase() as EventImpact]}`} />
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
                                      if (onEditEvent) onEditEvent(ev);
                                      else { setEditingEvent(ev); setEventModalOpen(true); }
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
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {!controlled && (
        <CreateEventModal
          open={eventModalOpen}
          onOpenChange={setEventModalOpen}
          assetCalendars={assetCalendars}
          selectedAssetCalendarId={selectedAssetCalendarId}
          defaultCurrency={asset.label}
          mode={editingEvent ? "edit" : "create"}
          initialEvent={editingEvent ?? undefined}
          onSubmit={handleEventSubmit}
        />
      )}
    </div>
  );
}
