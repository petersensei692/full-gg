"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type AnalyticsRangePreset = "1D" | "1W" | "1M" | "1Y" | "ALL";

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function monthMatrix(year: number, month: number): Array<Array<Date | null>> {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const matrix: Array<Array<Date | null>> = [];
  let currentDay = 1;
  for (let r = 0; r < 6; r += 1) {
    const row: Array<Date | null> = [];
    for (let c = 0; c < 7; c += 1) {
      const cellIndex = r * 7 + c;
      if (cellIndex < startWeekday || currentDay > daysInMonth) row.push(null);
      else {
        row.push(new Date(year, month, currentDay));
        currentDay += 1;
      }
    }
    matrix.push(row);
  }
  return matrix;
}

function startForPreset(range: AnalyticsRangePreset, now: Date): Date | null {
  const d = new Date(now);
  if (range === "ALL") return null;
  if (range === "1D") return startOfDay(d);
  if (range === "1W") {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return startOfDay(d);
  }
  if (range === "1M") return new Date(d.getFullYear(), d.getMonth(), 1);
  return new Date(d.getFullYear(), 0, 1);
}

const PRESETS_FULL: Array<[string, AnalyticsRangePreset]> = [
  ["Today", "1D"],
  ["1 Week", "1W"],
  ["1 Month", "1M"],
  ["1 Year", "1Y"],
  ["All Time", "ALL"],
];

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-sidebar-border bg-sidebar ${className}`}>{children}</div>;
}

export interface CalendarYearBounds {
  minYear: number;
  maxYear: number;
}

export interface AnalyticsStyleDateRangePanelProps {
  /** Hide “All Time” and block apply until a start date is set (weekly calendar / watchlist). */
  requireFiniteRange?: boolean;
  initialFrom: Date | null;
  initialTo: Date;
  onApply: (from: Date | null, to: Date) => void;
  onCancel?: () => void;
  className?: string;
  /** Override default “Apply” (e.g. “Create watchlist”). */
  applyButtonLabel?: string;
  /** Omit preset pills and “In The Last” row (e.g. weekly create modals). */
  hidePresetsAndRelative?: boolean;
  /**
   * Limit year dropdown and month navigation. If the current range uses years outside the
   * bounds (legacy edit), those years are still included so the select value stays valid.
   */
  calendarBounds?: CalendarYearBounds | null;
}

/**
 * Dual-month range UI matching analytics (presets, relative window, two calendars).
 * Use inside a dialog or portal — no nested popovers.
 */
function clampYearToOptions(y: number, options: number[]): number {
  if (options.length === 0) return y;
  if (options.includes(y)) return y;
  return options.reduce((best, cur) => (Math.abs(cur - y) < Math.abs(best - y) ? cur : best), options[0]);
}

function isValidDate(d: unknown): d is Date {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

/** End of range is always a real Date (guards undefined / invalid `initialTo` from parents). */
function coercePanelEnd(d: unknown): Date {
  if (isValidDate(d)) return d;
  return endOfDay(new Date());
}

export function AnalyticsStyleDateRangePanel({
  requireFiniteRange = false,
  initialFrom,
  initialTo,
  onApply,
  onCancel,
  className = "",
  applyButtonLabel = "Apply",
  hidePresetsAndRelative = false,
  calendarBounds = null,
}: AnalyticsStyleDateRangePanelProps) {
  const presets = requireFiniteRange ? PRESETS_FULL.filter(([, v]) => v !== "ALL") : PRESETS_FULL;

  const [dateMode, setDateMode] = useState<"preset" | "relative" | "all">("all");
  const [activePreset, setActivePreset] = useState<AnalyticsRangePreset>("ALL");
  const [relativeAmount, setRelativeAmount] = useState(30);
  const [relativeUnit, setRelativeUnit] = useState<"days" | "months">("days");
  const [draftFrom, setDraftFrom] = useState<Date | null>(null);
  const [draftTo, setDraftTo] = useState<Date>(new Date());
  const [rangeAnchor, setRangeAnchor] = useState<Date | null>(null);
  const [leftMY, setLeftMY] = useState({ y: new Date().getFullYear(), m: new Date().getMonth() });
  const [rightMY, setRightMY] = useState(() => {
    const n = new Date();
    const r = addMonths(n, 1);
    return { y: r.getFullYear(), m: r.getMonth() };
  });

  const draftToSafe = coercePanelEnd(draftTo);

  const { yearOptions, navLo, navHi } = useMemo(() => {
    const cy = new Date().getFullYear();
    if (!calendarBounds) {
      const max = cy + 1;
      const min = cy - 25;
      const list: number[] = [];
      for (let y = max; y >= min; y -= 1) list.push(y);
      return { yearOptions: list, navLo: min, navHi: max };
    }
    const { minYear, maxYear } = calendarBounds;
    const anchorYears: number[] = [leftMY.y, rightMY.y];
    if (draftFrom && isValidDate(draftFrom)) anchorYears.push(draftFrom.getFullYear());
    anchorYears.push(draftToSafe.getFullYear());
    const lo = Math.min(minYear, ...anchorYears);
    const hi = Math.max(maxYear, ...anchorYears);
    const list: number[] = [];
    for (let y = hi; y >= lo; y -= 1) list.push(y);
    return { yearOptions: list, navLo: lo, navHi: hi };
  }, [calendarBounds, leftMY.y, rightMY.y, draftFrom, draftToSafe]);

  useEffect(() => {
    const end = coercePanelEnd(initialTo);
    const fromOk = initialFrom != null && isValidDate(initialFrom) ? initialFrom : null;
    setDraftFrom(fromOk);
    setDraftTo(end);
    setRangeAnchor(null);
    const start = fromOk ?? addMonths(end, -1);
    setLeftMY({ y: start.getFullYear(), m: start.getMonth() });
    const r = addMonths(start, 1);
    setRightMY({ y: r.getFullYear(), m: r.getMonth() });
    if (hidePresetsAndRelative) {
      setDateMode("preset");
      setActivePreset("1W");
    } else if (requireFiniteRange) {
      setActivePreset("1W");
      setDateMode("preset");
    } else {
      setActivePreset(initialFrom ? "1M" : "ALL");
      setDateMode(initialFrom ? "preset" : "all");
    }
  }, [initialFrom, initialTo, requireFiniteRange, hidePresetsAndRelative]);

  useEffect(() => {
    if (yearOptions.length === 0) return;
    setLeftMY((p) => {
      const y = clampYearToOptions(p.y, yearOptions);
      return y === p.y ? p : { ...p, y };
    });
    setRightMY((p) => {
      const y = clampYearToOptions(p.y, yearOptions);
      return y === p.y ? p : { ...p, y };
    });
  }, [yearOptions]);

  const handleDayClick = (day: Date | null) => {
    if (!day) return;
    const d0 = startOfDay(day);
    if (!rangeAnchor) {
      setRangeAnchor(d0);
      setDraftFrom(d0);
      setDraftTo(endOfDay(d0));
      return;
    }
    let a = rangeAnchor.getTime();
    let b = d0.getTime();
    if (b < a) [a, b] = [b, a];
    setDraftFrom(new Date(a));
    setDraftTo(endOfDay(new Date(b)));
    setRangeAnchor(null);
  };

  const inDraftRange = (day: Date | null): boolean => {
    if (!day || draftFrom == null || !isValidDate(draftFrom)) return false;
    const t = startOfDay(day).getTime();
    return t >= startOfDay(draftFrom).getTime() && t <= startOfDay(draftToSafe).getTime();
  };

  const isRangeEnd = (day: Date | null): boolean => {
    if (!day || draftFrom == null || !isValidDate(draftFrom)) return false;
    const t = startOfDay(day).getTime();
    return t === startOfDay(draftFrom).getTime() || t === startOfDay(draftToSafe).getTime();
  };

  const applyPreset = (preset: AnalyticsRangePreset) => {
    setActivePreset(preset);
    const end = new Date();
    if (preset === "ALL") {
      setDateMode("all");
      setDraftFrom(null);
      setDraftTo(endOfDay(end));
      setRangeAnchor(null);
      return;
    }
    setDateMode("preset");
    const start = startForPreset(preset, end);
    setDraftFrom(start);
    setDraftTo(endOfDay(end));
    setRangeAnchor(null);
    if (start) {
      setLeftMY({ y: start.getFullYear(), m: start.getMonth() });
      const r = addMonths(start, 1);
      setRightMY({ y: r.getFullYear(), m: r.getMonth() });
    }
  };

  const handleApply = () => {
    if (requireFiniteRange && (draftFrom == null || !isValidDate(draftFrom))) return;
    const allTime = !requireFiniteRange && dateMode === "all" && draftFrom === null;
    if (allTime) {
      onApply(null, endOfDay(new Date()));
    } else {
      onApply(draftFrom, endOfDay(draftToSafe));
    }
  };

  const renderMonth = (which: "left" | "right") => {
    const my = which === "left" ? leftMY : rightMY;
    const matrix = monthMatrix(my.y, my.m);
    const title = new Date(my.y, my.m, 1).toLocaleDateString(undefined, { month: "long" });
    const minNav = new Date(navLo, 0, 1);
    const maxNav = new Date(navHi, 11, 1);
    const prevMonth = new Date(my.y, my.m - 1, 1);
    const nextMonth = new Date(my.y, my.m + 1, 1);
    const canShiftPrev = prevMonth >= minNav && prevMonth <= maxNav;
    const canShiftNext = nextMonth >= minNav && nextMonth <= maxNav;

    const shift = (delta: number) => {
      const base = new Date(my.y, my.m + delta, 1);
      if (base < minNav || base > maxNav) return;
      const next = { y: base.getFullYear(), m: base.getMonth() };
      if (which === "left") setLeftMY(next);
      else setRightMY(next);
    };

    const setYear = (y: number) => {
      const clamped = clampYearToOptions(y, yearOptions);
      if (which === "left") setLeftMY((p) => ({ ...p, y: clamped }));
      else setRightMY((p) => ({ ...p, y: clamped }));
    };

    return (
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => shift(-1)}
            disabled={!canShiftPrev}
            className="rounded-md border border-sidebar-border p-1.5 hover:bg-header disabled:pointer-events-none disabled:opacity-30"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <span className="truncate text-base font-semibold text-header-foreground">{title}</span>
            <select
              value={yearOptions.includes(my.y) ? my.y : yearOptions[0] ?? my.y}
              onChange={(e) => setYear(Number(e.target.value))}
              className="max-w-[88px] rounded-md border border-sidebar-border bg-header px-1.5 py-1 text-sm text-header-foreground"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => shift(1)}
            disabled={!canShiftNext}
            className="rounded-md border border-sidebar-border p-1.5 hover:bg-header disabled:pointer-events-none disabled:opacity-30"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-header-muted">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={`${which}-h-${i}`} className="py-1">
              {d}
            </span>
          ))}
        </div>
        <div className="mt-1 space-y-0.5">
          {matrix.map((row, ri) => (
            <div key={`${which}-r-${ri}`} className="grid grid-cols-7 gap-0.5">
              {row.map((cell, ci) => {
                if (!cell) return <span key={`${which}-${ri}-${ci}`} className="h-8" />;
                const inR = draftFrom != null && inDraftRange(cell);
                const endCap = draftFrom != null && isRangeEnd(cell);
                return (
                  <button
                    key={`${which}-${ri}-${ci}`}
                    type="button"
                    onClick={() => handleDayClick(cell)}
                    className={`flex h-8 items-center justify-center rounded text-sm transition-colors ${
                      endCap ? "bg-primary text-primary-foreground ring-2 ring-primary/80" : ""
                    } ${inR && !endCap ? "bg-primary/25 text-header-foreground" : ""} ${
                      !inR && !endCap ? "text-header-foreground hover:bg-header" : ""
                    }`}
                  >
                    {cell.getDate()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const gridCols = presets.length <= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-5";

  return (
    <SurfaceCard className={`p-4 shadow-2xl ${className}`}>
      <p className="mb-3 text-sm text-dashboard-foreground/80">Select date range</p>
      {!hidePresetsAndRelative ? (
        <>
          <div className={`grid w-full gap-2 ${gridCols}`}>
            {presets.map(([label, value]) => (
              <button
                key={value}
                type="button"
                onClick={() => applyPreset(value)}
                className={`rounded-md border px-2 py-1.5 text-center text-sm ${
                  activePreset === value && (value === "ALL" ? dateMode === "all" : dateMode === "preset")
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-sidebar-border text-header-foreground hover:bg-header/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-sm text-header-muted">In The Last</span>
            <input
              type="number"
              min={1}
              value={relativeAmount}
              onChange={(e) => {
                const n = Number(e.target.value) || 1;
                setRelativeAmount(n);
                setDateMode("relative");
                setActivePreset("1M");
                const end = new Date();
                const start = new Date(end);
                if (relativeUnit === "days") start.setDate(start.getDate() - n);
                else start.setMonth(start.getMonth() - n);
                setDraftFrom(startOfDay(start));
                setDraftTo(endOfDay(end));
                setRangeAnchor(null);
                setLeftMY({ y: start.getFullYear(), m: start.getMonth() });
                const r = addMonths(start, 1);
                setRightMY({ y: r.getFullYear(), m: r.getMonth() });
              }}
              className="h-9 w-20 rounded-md border border-sidebar-border bg-header px-2 text-sm"
            />
            <select
              value={relativeUnit}
              onChange={(e) => {
                const unit = e.target.value as "days" | "months";
                setRelativeUnit(unit);
                setDateMode("relative");
                const end = new Date();
                const start = new Date(end);
                if (unit === "days") start.setDate(start.getDate() - relativeAmount);
                else start.setMonth(start.getMonth() - relativeAmount);
                setDraftFrom(startOfDay(start));
                setDraftTo(endOfDay(end));
                setRangeAnchor(null);
              }}
              className="h-9 rounded-md border border-sidebar-border bg-header px-2 text-sm"
            >
              <option value="days">days</option>
              <option value="months">months</option>
            </select>
          </div>
        </>
      ) : null}
      <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${hidePresetsAndRelative ? "" : "mt-4"}`}>
        {renderMonth("left")}
        {renderMonth("right")}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-sidebar-border pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-sidebar-border px-4 py-2 text-sm text-header-foreground hover:bg-header"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={requireFiniteRange && (draftFrom == null || !isValidDate(draftFrom))}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40 disabled:pointer-events-none"
        >
          {applyButtonLabel}
        </button>
      </div>
    </SurfaceCard>
  );
}

export function distinctMonthsInRange(from: Date | null, to: Date): number {
  if (!from) return 999;
  const set = new Set<string>();
  let d = new Date(from.getFullYear(), from.getMonth(), 1);
  const endM = new Date(to.getFullYear(), to.getMonth(), 1);
  while (d <= endM) {
    set.add(`${d.getFullYear()}-${d.getMonth()}`);
    d = addMonths(d, 1);
  }
  return set.size;
}
