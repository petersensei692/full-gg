"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

export type AnalyticsRangePreset = "1D" | "1W" | "1M" | "1Y" | "ALL";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
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

function toLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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

const PRESETS: Array<[string, AnalyticsRangePreset]> = [
  ["Today", "1D"],
  ["1 Week", "1W"],
  ["1 Month", "1M"],
  ["1 Year", "1Y"],
  ["All Time", "ALL"],
];

const YEAR_OPTIONS = (() => {
  const y = new Date().getFullYear();
  const list: number[] = [];
  for (let i = y + 1; i >= y - 25; i -= 1) list.push(i);
  return list;
})();

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-sidebar-border bg-sidebar ${className}`}>{children}</div>;
}

export function AnalyticsDateRangePicker({
  from,
  to,
  onApply,
}: {
  from: Date | null;
  to: Date;
  onApply: (nextFrom: Date | null, nextTo: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
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

  const pillLabel = useMemo(() => {
    if (!from) return "All Time";
    return `${toLabel(from)} - ${toLabel(to)}`;
  }, [from, to]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setDraftFrom(from);
    setDraftTo(to);
    setRangeAnchor(null);
    const end = to;
    const start = from ?? addMonths(end, -1);
    setLeftMY({ y: start.getFullYear(), m: start.getMonth() });
    const r = addMonths(start, 1);
    setRightMY({ y: r.getFullYear(), m: r.getMonth() });
    setActivePreset(from ? "1M" : "ALL");
    setDateMode(from ? "preset" : "all");
  }, [open, from, to]);

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
    if (!day || draftFrom == null) return false;
    const t = startOfDay(day).getTime();
    return t >= startOfDay(draftFrom).getTime() && t <= startOfDay(draftTo).getTime();
  };

  const isRangeEnd = (day: Date | null): boolean => {
    if (!day || draftFrom == null) return false;
    const t = startOfDay(day).getTime();
    return t === startOfDay(draftFrom).getTime() || t === startOfDay(draftTo).getTime();
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
    const allTime = dateMode === "all" && draftFrom === null;
    if (allTime) {
      onApply(null, endOfDay(new Date()));
    } else {
      onApply(draftFrom, draftTo ? endOfDay(draftTo) : endOfDay(new Date()));
    }
    setOpen(false);
  };

  const renderMonth = (which: "left" | "right") => {
    const my = which === "left" ? leftMY : rightMY;
    const matrix = monthMatrix(my.y, my.m);
    const title = new Date(my.y, my.m, 1).toLocaleDateString(undefined, { month: "long" });

    const shift = (delta: number) => {
      const base = new Date(my.y, my.m + delta, 1);
      const next = { y: base.getFullYear(), m: base.getMonth() };
      if (which === "left") setLeftMY(next);
      else setRightMY(next);
    };

    const setYear = (y: number) => {
      if (which === "left") setLeftMY((p) => ({ ...p, y }));
      else setRightMY((p) => ({ ...p, y }));
    };

    return (
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <button type="button" onClick={() => shift(-1)} className="rounded-md border border-sidebar-border p-1.5 hover:bg-header" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <span className="truncate text-base font-semibold text-header-foreground">{title}</span>
            <select
              value={my.y}
              onChange={(e) => setYear(Number(e.target.value))}
              className="max-w-[88px] rounded-md border border-sidebar-border bg-header px-1.5 py-1 text-sm text-header-foreground"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={() => shift(1)} className="rounded-md border border-sidebar-border p-1.5 hover:bg-header" aria-label="Next month">
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

  const overlay =
    open &&
    mounted &&
    createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 px-3 py-10 backdrop-blur-[1px]"
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="relative z-[101] w-full max-w-3xl" onMouseDown={(e) => e.stopPropagation()}>
        <SurfaceCard className="p-4 shadow-2xl">
          <div className="grid w-full grid-cols-5 gap-2">
            {PRESETS.map(([label, value]) => (
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
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">{renderMonth("left")}{renderMonth("right")}</div>
          <div className="mt-4 flex items-center justify-between border-t border-sidebar-border pt-4">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-sidebar-border px-4 py-2 text-sm text-header-foreground hover:bg-header">
              Cancel
            </button>
            <button type="button" onClick={handleApply} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Apply
            </button>
          </div>
        </SurfaceCard>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-left">
        <SurfaceCard className="flex h-10 items-center gap-2 px-3 text-sm">
          <Calendar className="h-4 w-4 shrink-0 text-header-muted" />
          <span className="text-header-foreground">{pillLabel}</span>
        </SurfaceCard>
      </button>
      {overlay}
    </>
  );
}

/** @deprecated use distinctMonthsInRange from analytics utils if needed export */
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
