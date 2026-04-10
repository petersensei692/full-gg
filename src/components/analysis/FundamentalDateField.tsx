"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { CalendarIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

function padYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Parse API ISO string to YYYY-MM-DD using the UTC calendar date (matches weekly range storage). */
export function isoToUtcYmd(iso?: string): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const x = new Date(t);
  return padYmd(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
}

function addMonths(y: number, m: number, delta: number): { y: number; m: number } {
  const d = new Date(y, m + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() };
}

function getDaysInMonth(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days: Date[] = [];
  for (let i = 0; i < startPad; i++) {
    days.push(new Date(0));
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

interface FundamentalDateFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (ymd: string) => void;
  minYmd?: string;
  className?: string;
}

export function FundamentalDateField({
  id,
  label,
  value,
  onChange,
  minYmd,
  className = "",
}: FundamentalDateFieldProps) {
  const [open, setOpen] = useState(false);
  const parsed = value ? new Date(value + "T12:00:00") : null;
  const initialY = parsed && !Number.isNaN(parsed.getTime()) ? parsed.getFullYear() : new Date().getFullYear();
  const initialM = parsed && !Number.isNaN(parsed.getTime()) ? parsed.getMonth() : new Date().getMonth();
  const [viewY, setViewY] = useState(initialY);
  const [viewM, setViewM] = useState(initialM);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (open) {
      const p = value ? new Date(value + "T12:00:00") : null;
      if (p && !Number.isNaN(p.getTime())) {
        setViewY(p.getFullYear());
        setViewM(p.getMonth());
      }
    }
  }, [open, value]);

  useEffect(() => {
    if (open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    } else {
      setRect(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (dropdownRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const display =
    value && parsed && !Number.isNaN(parsed.getTime())
      ? parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "Select date";

  const minDate = minYmd ? new Date(minYmd + "T12:00:00") : null;
  const today = toDateOnly(new Date());

  const handlePick = (d: Date) => {
    if (d.getTime() === 0) return;
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    const ymd = padYmd(y, m, day);
    if (minYmd && ymd < minYmd) return;
    onChange(ymd);
    setOpen(false);
  };

  const monthLabel = new Date(viewY, viewM).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const days = getDaysInMonth(viewY, viewM);
  const PANEL = 288;

  const dropdown =
    open &&
    rect &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={(el) => {
          dropdownRef.current = el;
        }}
        className="fixed z-[10002] rounded-xl border border-sidebar-border bg-sidebar shadow-xl p-3 min-w-[272px]"
        style={{
          top: rect.top,
          left: Math.max(8, rect.left + rect.width - PANEL),
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-dashboard-foreground">{monthLabel}</span>
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={() => {
                const n = addMonths(viewY, viewM, -12);
                setViewY(n.y);
                setViewM(n.m);
              }}
              className="p-1 rounded text-dashboard-foreground/70 hover:bg-sidebar-hover"
              aria-label="Previous year"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const n = addMonths(viewY, viewM, -1);
                setViewY(n.y);
                setViewM(n.m);
              }}
              className="p-1 rounded text-dashboard-foreground/70 hover:bg-sidebar-hover"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const n = addMonths(viewY, viewM, 1);
                setViewY(n.y);
                setViewM(n.m);
              }}
              className="p-1 rounded text-dashboard-foreground/70 hover:bg-sidebar-hover"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const n = addMonths(viewY, viewM, 12);
                setViewY(n.y);
                setViewM(n.m);
              }}
              className="p-1 rounded text-dashboard-foreground/70 hover:bg-sidebar-hover"
              aria-label="Next year"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-[10px] font-medium text-dashboard-foreground/60 py-1">
              {day}
            </div>
          ))}
          {days.map((d, i) => {
            const isEmpty = d.getTime() === 0;
            const ymd = !isEmpty ? padYmd(d.getFullYear(), d.getMonth(), d.getDate()) : "";
            const disabledByMin = Boolean(!isEmpty && minYmd && ymd < minYmd);
            const selected = !isEmpty && value === ymd;
            const isToday = !isEmpty && isSameDay(d, today);
            return (
              <button
                key={i}
                type="button"
                disabled={isEmpty || disabledByMin}
                onClick={() => handlePick(d)}
                className={`
                  w-8 h-8 text-xs rounded
                  ${isEmpty ? "invisible" : ""}
                  ${disabledByMin ? "opacity-30 pointer-events-none" : ""}
                  ${selected ? "bg-primary text-primary-foreground font-medium" : ""}
                  ${!selected && !isEmpty ? "text-dashboard-foreground hover:bg-sidebar-hover hover:ring-1 hover:ring-primary focus:ring-1 focus:ring-primary focus:outline-none" : ""}
                  ${isToday && !selected ? "ring-1 ring-primary" : ""}
                `}
              >
                {isEmpty ? "" : d.getDate()}
              </button>
            );
          })}
        </div>
      </div>,
      document.body,
    );

  return (
    <div ref={triggerRef} className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-dashboard-foreground/80 mb-1">
        {label}
      </label>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <span className="truncate text-left">{display}</span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-dashboard-foreground/60" />
      </button>
      {dropdown}
    </div>
  );
}
