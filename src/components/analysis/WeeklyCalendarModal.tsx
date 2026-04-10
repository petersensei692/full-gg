"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { FundamentalDateField, isoToUtcYmd } from "@/components/analysis/FundamentalDateField";
import type { CreateWeeklyCalendarDto, CreateWeeklyWatchlistDto } from "@/types/api";

interface WeeklyCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When "watchlist", shows "Weekly Watchlist" title/button (e.g. for Pair Watchlist tab). */
  variant?: "calendar" | "watchlist";
  mode?: "create" | "edit";
  initialStartDate?: string;
  initialEndDate?: string;
  onSubmit: (dto: CreateWeeklyCalendarDto | CreateWeeklyWatchlistDto) => void;
}

export function WeeklyCalendarModal({
  open,
  onOpenChange,
  variant = "calendar",
  mode = "create",
  initialStartDate,
  initialEndDate,
  onSubmit,
}: WeeklyCalendarModalProps) {
  const isWatchlist = variant === "watchlist";
  const title = isWatchlist
    ? mode === "edit"
      ? "Edit Weekly Watchlist"
      : "Create Weekly Watchlist"
    : mode === "edit"
    ? "Edit Weekly Calendar"
    : "Create Weekly Calendar";
  const submitLabel = isWatchlist
    ? mode === "edit"
      ? "Save watchlist"
      : "Create watchlist"
    : mode === "edit"
    ? "Save calendar"
    : "Create calendar";
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (open) {
      setStartDate(isoToUtcYmd(initialStartDate));
      setEndDate(isoToUtcYmd(initialEndDate));
    }
  }, [open, initialStartDate, initialEndDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    if (endDate < startDate) return;

    const startIso = new Date(`${startDate}T00:00:00.000Z`).toISOString();
    const endIso = new Date(`${endDate}T23:59:59.999Z`).toISOString();
    onSubmit({ startDate: startIso, endDate: endIso });
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
          <FundamentalDateField
            id="start-date"
            label="Start date"
            value={startDate}
            onChange={(ymd) => {
              setStartDate(ymd);
              if (endDate && ymd && endDate < ymd) setEndDate(ymd);
            }}
          />
          <FundamentalDateField
            id="end-date"
            label="End date"
            value={endDate}
            minYmd={startDate || undefined}
            onChange={setEndDate}
          />
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
