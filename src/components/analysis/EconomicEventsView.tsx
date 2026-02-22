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
  const { events, createEvent, updateEvent, deleteEvent, refetchAll } =
    useWatchlistCalendar();

  const [assetCalendars, setAssetCalendars] = useState<AssetCalendar[]>([]);
  const [selectedAssetCalendarId, setSelectedAssetCalendarId] = useState<
    string | null
  >(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  const selectedAssetCalendar = assetCalendars.find(
    (ac) => ac.id === selectedAssetCalendarId
  );

  useEffect(() => {
    if (!asset.id) {
      setAssetCalendars([]);
      setSelectedAssetCalendarId(null);
      return;
    }
    setLoadingCalendars(true);
    assetCalendarService
      .getByAsset(asset.id)
      .then((list) => {
        setAssetCalendars(list);
        setSelectedAssetCalendarId((prev) => {
          if (prev && list.some((ac) => ac.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
      })
      .catch(() => setAssetCalendars([]))
      .finally(() => setLoadingCalendars(false));
  }, [asset.id]);

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
    const dayToDate = Object.fromEntries(
      daysInWeek.map((d) => [getWeekdayName(d.date), d.date])
    );
    events
      .filter((e) => e.assetCalendar?.id === selectedAssetCalendar.id)
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
  }, [events, selectedAssetCalendar, daysInWeek]);

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
      await updateEvent(editingEvent.id, {
        day: dto.day,
        time: dto.time,
        name: dto.name,
        impact: dto.impact,
      });
    } else {
      await createEvent(dto);
    }
    if (dto.assetCalendarId) setSelectedAssetCalendarId(dto.assetCalendarId);
    setEditingEvent(null);
    setEventModalOpen(false);
    refetchAll();
  };

  return (
    <div className="flex-1 p-6 pt-4 flex flex-col min-h-0">
      {/* Top bar: Choose calendar + Create Event */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setCalendarDropdownOpen((o) => !o)}
            disabled={loadingCalendars || !asset.id}
            className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors disabled:opacity-50"
          >
            <Calendar className="h-4 w-4" />
            {loadingCalendars
              ? "Loading..."
              : selectedAssetCalendar
              ? `${new Date(selectedAssetCalendar.startDate).toISOString().slice(0, 10)} → ${new Date(
                  selectedAssetCalendar.endDate
                ).toISOString().slice(0, 10)}`
              : assetCalendars.length === 0
              ? "No calendars (create one on Calendar page)"
              : "Choose calendar"}
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
                {assetCalendars.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-dashboard-foreground/70">
                    No calendars yet. Create one from the Calendar page.
                  </p>
                ) : (
                  assetCalendars.map((ac) => (
                    <div key={ac.id} className="flex items-center gap-2 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAssetCalendarId(ac.id);
                          setCalendarDropdownOpen(false);
                        }}
                        className={`flex-1 text-left text-sm hover:text-primary transition-colors ${
                          selectedAssetCalendarId === ac.id
                            ? "text-primary font-medium"
                            : "text-dashboard-foreground"
                        }`}
                      >
                        {new Date(ac.startDate).toISOString().slice(0, 10)} →{" "}
                        {new Date(ac.endDate).toISOString().slice(0, 10)}
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

      {/* Weekly calendar view: days and events */}
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-sidebar-border bg-sidebar/30">
        {!selectedAssetCalendar ? (
          <div className="flex flex-col items-center justify-center h-64 text-dashboard-foreground/60 text-sm">
            <Calendar className="h-10 w-10 mb-2 opacity-50" />
            <p>
              {asset.id
                ? "Select a calendar or create one from the Calendar page."
                : "Asset ID required to load calendars."}
            </p>
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
                  {dayEvents.length === 0 ? (
                    <div className="py-8 px-4 text-dashboard-foreground/50 text-center text-sm rounded-lg border border-sidebar-border bg-sidebar/30">
                      No events
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex flex-col gap-0 rounded-lg border border-sidebar-border bg-sidebar/50 overflow-hidden"
                        >
                          <div className="flex items-center gap-3 px-3 py-2 border-b border-sidebar-border bg-sidebar/80 text-xs font-semibold uppercase tracking-wider text-dashboard-foreground shrink-0">
                            <span className="w-12 shrink-0 tabular-nums text-center">{ev.time || "—"}</span>
                            <span className="w-10 shrink-0 text-center">{ev.asset?.name ?? asset.label}</span>
                            <span className="w-8 shrink-0 flex justify-center" title={ev.impact}>
                              <span className="inline-flex gap-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${IMPACT_DOTS[ev.impact.toLowerCase() as EventImpact]}`} />
                                <span className={`w-1.5 h-1.5 rounded-full ${IMPACT_DOTS[ev.impact.toLowerCase() as EventImpact]}`} />
                                <span className={`w-1.5 h-1.5 rounded-full ${IMPACT_DOTS[ev.impact.toLowerCase() as EventImpact]}`} />
                              </span>
                            </span>
                            <span className="flex-1 min-w-0" />
                            <span className="shrink-0 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEvent(ev);
                                  setEventModalOpen(true);
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
                          </div>
                          <div className="px-3 py-2 text-sm text-dashboard-foreground break-words min-w-0">
                            {ev.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
    </div>
  );
}
