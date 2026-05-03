"use client";

import { useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { isoToUtcYmd } from "@/components/analysis/FundamentalDateField";
import {
  AnalyticsStyleDateRangePanel,
  startOfDay,
  endOfDay,
} from "@/components/analytics/AnalyticsStyleDateRangePanel";
const WEEKLY_WATCHLIST_MIN_YEAR = 2026;

interface WeeklyCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  initialStartDate?: string;
  initialEndDate?: string;
  onSubmit: (dto: { startDate: string; endDate: string }) => void;
}

function defaultWeekRange(): { from: Date; to: Date } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(monday.getDate() + diff);
  return { from: startOfDay(monday), to: endOfDay(now) };
}

function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

function parseInitialRange(initialStartDate?: string, initialEndDate?: string): { from: Date; to: Date } {
  const startYmd = isoToUtcYmd(initialStartDate);
  const endYmd = isoToUtcYmd(initialEndDate);
  if (startYmd && endYmd) {
    const from = startOfDay(new Date(`${startYmd}T12:00:00`));
    const to = endOfDay(new Date(`${endYmd}T12:00:00`));
    if (isValidDate(from) && isValidDate(to)) {
      return { from, to };
    }
  }
  return defaultWeekRange();
}

/** Match prior API: calendar day components stored as UTC midnight / end-of-UTC-day. */
function localRangeToIsoPayload(from: Date, to: Date): { startDate: string; endDate: string } {
  const sy = from.getFullYear();
  const sm = from.getMonth();
  const sd = from.getDate();
  const ey = to.getFullYear();
  const em = to.getMonth();
  const ed = to.getDate();
  return {
    startDate: new Date(Date.UTC(sy, sm, sd, 0, 0, 0, 0)).toISOString(),
    endDate: new Date(Date.UTC(ey, em, ed, 23, 59, 59, 999)).toISOString(),
  };
}

export function WeeklyCalendarModal({
  open,
  onOpenChange,
  mode = "create",
  initialStartDate,
  initialEndDate,
  onSubmit,
}: WeeklyCalendarModalProps) {
  const title =
    mode === "edit" ? "Edit Weekly Watchlist" : "Create Weekly Watchlist";
  const applyLabel = mode === "edit" ? "Save watchlist" : "Create watchlist";

  const { from: initialFrom, to: initialTo } = useMemo(
    () => parseInitialRange(initialStartDate, initialEndDate),
    [initialStartDate, initialEndDate],
  );

  const calendarBounds = useMemo(() => {
    const y = new Date().getFullYear();
    return { minYear: WEEKLY_WATCHLIST_MIN_YEAR, maxYear: y + 1 };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={true}
        className="max-w-3xl w-full flex-col items-stretch justify-start gap-0 overflow-y-auto border-0 bg-transparent p-3 shadow-none sm:p-4 max-h-[96dvh]"
      >
        <div className="w-full rounded-xl border border-sidebar-border bg-sidebar p-1 shadow-xl">
          <h3 className="px-3 pt-3 text-lg font-semibold text-dashboard-foreground">{title}</h3>
          <div className="p-2 pt-1">
            <AnalyticsStyleDateRangePanel
              key={`${open}-${initialStartDate ?? ""}-${initialEndDate ?? ""}`}
              requireFiniteRange
              hidePresetsAndRelative
              calendarBounds={calendarBounds}
              initialFrom={initialFrom}
              initialTo={initialTo}
              className="border-0 shadow-none"
              applyButtonLabel={applyLabel}
              onCancel={() => onOpenChange(false)}
              onApply={(from, to) => {
                if (!from || !to) return;
                const { startDate, endDate } = localRangeToIsoPayload(from, to);
                if (endDate < startDate) return;
                onSubmit({ startDate, endDate });
                onOpenChange(false);
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
