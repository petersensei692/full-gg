"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type { WeeklyCalendar } from "@/types/calendar";

interface WeeklyCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When "watchlist", shows "Weekly Watchlist" title/button (e.g. for Pair Watchlist tab). */
  variant?: "calendar" | "watchlist";
  onCreated: (calendar: WeeklyCalendar) => void;
}

export function WeeklyCalendarModal({
  open,
  onOpenChange,
  variant = "calendar",
  onCreated,
}: WeeklyCalendarModalProps) {
  const isWatchlist = variant === "watchlist";
  const title = isWatchlist ? "Create Weekly Watchlist" : "Create Weekly Calendar";
  const submitLabel = isWatchlist ? "Create watchlist" : "Create calendar";
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    if (new Date(endDate) < new Date(startDate)) return;

    const calendar: WeeklyCalendar = {
      id: `wc-${Date.now()}`,
      startDate,
      endDate,
      createdAt: Date.now(),
    };
    onCreated(calendar);
    setStartDate("");
    setEndDate("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={true}
        className="max-w-md w-full bg-sidebar border border-sidebar-border rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-dashboard-foreground mb-4">
          {title}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="start-date"
              className="block text-sm font-medium text-dashboard-foreground/80 mb-1"
            >
              Start date
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="end-date"
              className="block text-sm font-medium text-dashboard-foreground/80 mb-1"
            >
              End date
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              min={startDate || undefined}
              className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
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
              {submitLabel}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
