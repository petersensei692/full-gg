"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type { WeeklyCalendar } from "@/types/calendar";
import type { EconomicEvent, EventImpact } from "@/types/calendar";

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars: WeeklyCalendar[];
  selectedCalendarId: string | null;
  defaultCurrency?: string; // e.g. asset label "GBP"
  onCreated: (event: EconomicEvent) => void;
}

const IMPACT_OPTIONS: { value: EventImpact; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function getDaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const d = new Date(start);
  const endD = new Date(end);
  while (d <= endD) {
    days.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function CreateEventModal({
  open,
  onOpenChange,
  calendars,
  selectedCalendarId,
  defaultCurrency = "",
  onCreated,
}: CreateEventModalProps) {
  const [calendarId, setCalendarId] = useState(selectedCalendarId || "");
  const [name, setName] = useState("");
  const [impact, setImpact] = useState<EventImpact>("medium");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);

  useEffect(() => {
    if (open) {
      setCalendarId(selectedCalendarId || (calendars[0]?.id ?? ""));
      setDate("");
      setTime("");
      setCurrency(defaultCurrency);
    }
  }, [open, selectedCalendarId, calendars, defaultCurrency]);

  const selectedCalendar = calendars.find((c) => c.id === calendarId);
  const dayOptions = selectedCalendar
    ? getDaysInRange(selectedCalendar.startDate, selectedCalendar.endDate)
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calendarId || !name.trim() || !date) return;

    const event: EconomicEvent = {
      id: `ev-${Date.now()}`,
      weeklyCalendarId: calendarId,
      name: name.trim(),
      impact,
      date,
      time: time || undefined,
      currency: currency.trim() || undefined,
    };
    onCreated(event);
    setName("");
    setImpact("medium");
    setDate("");
    setTime("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={true}
        containToMain={true}
        className="max-w-md w-full max-h-[85dvh] overflow-y-auto bg-sidebar border border-sidebar-border rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-dashboard-foreground mb-4 shrink-0">
          Create Event
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4 min-w-0">
          <div>
            <label
              htmlFor="event-calendar"
              className="block text-sm font-medium text-dashboard-foreground/80 mb-1"
            >
              Weekly calendar
            </label>
            <select
              id="event-calendar"
              value={calendarId}
              onChange={(e) => {
                setCalendarId(e.target.value);
                setDate("");
              }}
              required
              className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select a calendar...</option>
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.startDate} → {cal.endDate}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="event-date"
              className="block text-sm font-medium text-dashboard-foreground/80 mb-1"
            >
              Day
            </label>
            <select
              id="event-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={!calendarId || dayOptions.length === 0}
              className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              <option value="">Select day...</option>
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  {new Date(d + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="event-time"
              className="block text-sm font-medium text-dashboard-foreground/80 mb-1"
            >
              Time
            </label>
            <input
              id="event-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="event-currency"
              className="block text-sm font-medium text-dashboard-foreground/80 mb-1"
            >
              Currency
            </label>
            <input
              id="event-currency"
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="e.g. USD, EUR, GBP"
              maxLength={6}
              className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground placeholder:text-dashboard-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="event-name"
              className="block text-sm font-medium text-dashboard-foreground/80 mb-1"
            >
              Event name
            </label>
            <input
              id="event-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NFP, Interest Rate Decision"
              required
              className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground placeholder:text-dashboard-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="event-impact"
              className="block text-sm font-medium text-dashboard-foreground/80 mb-1"
            >
              Impact
            </label>
            <select
              id="event-impact"
              value={impact}
              onChange={(e) => setImpact(e.target.value as EventImpact)}
              className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {IMPACT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-sidebar-border px-4 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Create event
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
