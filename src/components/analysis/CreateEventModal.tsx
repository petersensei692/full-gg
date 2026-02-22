"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type {
  WeeklyCalendar,
  AssetCalendar,
  CreateEventDto,
  Event,
} from "@/types/api";
import type { EventImpact } from "@/types/calendar";
import { useAssets } from "@/context/AssetsContext";

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars?: WeeklyCalendar[];
  selectedCalendarId?: string | null;
  /** When provided, uses asset calendar mode (no asset selector, submits assetCalendarId) */
  assetCalendars?: AssetCalendar[];
  selectedAssetCalendarId?: string | null;
  defaultCurrency?: string; // e.g. asset label "GBP"
  mode?: "create" | "edit";
  initialEvent?: Event;
  onSubmit: (dto: CreateEventDto) => void;
}

const IMPACT_OPTIONS: { value: EventImpact; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

/** Normalize time to HH:mm for type="time" input */
function normalizeTime(value: string | undefined): string {
  if (!value || typeof value !== "string") return "";
  const m = value.trim().match(/^(\d{1,2}):(\d{1,2})/);
  if (m) {
    return `${m[1].padStart(2, "0")}:${m[2].padStart(2, "0")}`;
  }
  return "";
}

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
  calendars = [],
  selectedCalendarId = null,
  assetCalendars = [],
  selectedAssetCalendarId = null,
  defaultCurrency = "",
  mode = "create",
  initialEvent,
  onSubmit,
}: CreateEventModalProps) {
  const useAssetCalendarMode = assetCalendars.length > 0;
  const [assetCalendarId, setAssetCalendarId] = useState(
    selectedAssetCalendarId || ""
  );
  const [calendarId, setCalendarId] = useState(selectedCalendarId || "");
  const [name, setName] = useState("");
  const [impact, setImpact] = useState<EventImpact>("medium");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const timeInputRef = useRef<HTMLInputElement>(null);
  const { assets } = useAssets();
  const [assetId, setAssetId] = useState("");

  const activeCalendar = useAssetCalendarMode
    ? assetCalendars.find((ac) => ac.id === assetCalendarId)
    : null;
  const activeWeeklyCalendar = useAssetCalendarMode
    ? activeCalendar?.weeklyCalendar
    : calendars.find((c) => c.id === calendarId);
  const dayOptions = activeWeeklyCalendar
    ? getDaysInRange(activeWeeklyCalendar.startDate, activeWeeklyCalendar.endDate)
    : [];

  useEffect(() => {
    if (open) {
      if (useAssetCalendarMode) {
        const acId =
          initialEvent?.assetCalendar?.id ??
          selectedAssetCalendarId ??
          assetCalendars[0]?.id ??
          "";
        setAssetCalendarId(acId);
      } else {
        const calId =
          initialEvent?.assetCalendar?.weeklyCalendar?.id ??
          initialEvent?.calendar?.id ??
          selectedCalendarId ??
          calendars[0]?.id ??
          "";
        setCalendarId(calId);
      }

      if (initialEvent) {
        const cal =
          initialEvent.assetCalendar?.weeklyCalendar ?? initialEvent.calendar ?? null;
        const dayOpts = cal
          ? getDaysInRange(cal.startDate, cal.endDate)
          : [];
        const match = dayOpts.find(
          (d) =>
            new Date(d + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
            }) === initialEvent.day
        );
        setDate(match ?? "");
        setTime(normalizeTime(initialEvent.time) || "");
        const matchAssetId =
          assets.find((a) => a.label === initialEvent.asset.name)?.id ??
          assets[0]?.id ??
          "";
        setAssetId(matchAssetId);
        setName(initialEvent.name);
        setImpact(initialEvent.impact.toLowerCase() as EventImpact);
      } else {
        setDate("");
        setTime("");
        const defaultAsset =
          assets.find((a) => a.label === defaultCurrency)?.id ??
          assets[0]?.id ??
          "";
        setAssetId(defaultAsset);
        setName("");
        setImpact("medium");
      }
    }
  }, [
    open,
    selectedCalendarId,
    selectedAssetCalendarId,
    calendars,
    assetCalendars,
    useAssetCalendarMode,
    defaultCurrency,
    assets,
    initialEvent,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;
    const dayLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
    });
    const timeValue =
      timeInputRef.current?.value || time || "00:00";
    if (useAssetCalendarMode && assetCalendarId) {
      onSubmit({
        assetCalendarId,
        day: dayLabel,
        time: timeValue,
        name: name.trim(),
        impact,
      });
    } else if (calendarId && assetId) {
      onSubmit({
        calendarId,
        day: dayLabel,
        time: timeValue,
        assetId,
        name: name.trim(),
        impact,
      });
    } else return;
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
          {mode === "edit" ? "Edit Event" : "Create Event"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4 min-w-0">
          {useAssetCalendarMode ? (
            <div>
              <label
                htmlFor="event-asset-calendar"
                className="block text-sm font-medium text-dashboard-foreground/80 mb-1"
              >
                Calendar
              </label>
              <select
                id="event-asset-calendar"
                value={assetCalendarId}
                onChange={(e) => {
                  setAssetCalendarId(e.target.value);
                  setDate("");
                }}
                required
                className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select a calendar...</option>
                {assetCalendars.map((ac) => (
                  <option key={ac.id} value={ac.id}>
                    {new Date(ac.startDate).toISOString().slice(0, 10)} →{" "}
                    {new Date(ac.endDate).toISOString().slice(0, 10)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
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
                    {new Date(cal.startDate).toISOString().slice(0, 10)} →{" "}
                    {new Date(cal.endDate).toISOString().slice(0, 10)}
                  </option>
                ))}
              </select>
            </div>
          )}
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
              disabled={
                (useAssetCalendarMode ? !assetCalendarId : !calendarId) ||
                dayOptions.length === 0
              }
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
              ref={timeInputRef}
              id="event-time"
              type="time"
              key={`event-time-${open}-${date}-${initialEvent?.id ?? "new"}`}
              defaultValue={time}
              className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {!useAssetCalendarMode && (
            <div>
              <label
                htmlFor="event-asset"
                className="block text-sm font-medium text-dashboard-foreground/80 mb-1"
              >
                Asset
              </label>
              <select
                id="event-asset"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                required
                className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select asset...</option>
                {assets.map((a) => (
                  <option key={a.id ?? a.slug} value={a.id ?? ""}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          )}
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
              {mode === "edit" ? "Save changes" : "Create event"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
