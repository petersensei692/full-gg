"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { CalendarIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export type DateRange = { start: Date; end: Date } | null;

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - (day === 0 ? 6 : day - 1);
  date.setDate(diff);
  return toDateOnly(date);
}

function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return toDateOnly(end);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addMonths(d: Date, n: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + n);
  return out;
}

function formatRange(range: DateRange): string {
  if (!range) return "All time";
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(range.start)} - ${fmt(range.end)}`;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
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

function isInRange(d: Date, start: Date, end: Date): boolean {
  const t = d.getTime();
  return t >= toDateOnly(start).getTime() && t <= toDateOnly(end).getTime();
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className = "" }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    } else {
      setDropdownRect(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inTrigger && !inDropdown) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const today = toDateOnly(new Date());
  const quickRanges = [
    { label: "All time", get: (): DateRange => { setSelecting("start"); return null; } },
    { label: "Today", get: (): DateRange => ({ start: new Date(today), end: new Date(today) }) },
    { label: "This Week", get: () => ({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) }) },
    { label: "This Month", get: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  ];

  const handleDateClick = (d: Date) => {
    if (d.getTime() === 0) return;
    const day = toDateOnly(d);
    if (selecting === "start") {
      setDraft({ start: day, end: day });
      setSelecting("end");
    } else {
      const start = draft!.start.getTime();
      const end = day.getTime();
      setDraft({ start: end < start ? day : draft!.start, end: end < start ? draft!.start : day });
      setSelecting("start");
    }
  };

  const handleApply = () => {
    onChange(draft);
    setOpen(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setOpen(false);
  };

  const renderCalendar = (year: number, month: number) => {
    const days = getDaysInMonth(year, month);
    const monthLabel = new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-dashboard-foreground">{monthLabel}</span>
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => addMonths(m, -12))}
              className="p-1 rounded text-dashboard-foreground/70 hover:bg-sidebar-hover"
              aria-label="Previous year"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => addMonths(m, -1))}
              className="p-1 rounded text-dashboard-foreground/70 hover:bg-sidebar-hover"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="p-1 rounded text-dashboard-foreground/70 hover:bg-sidebar-hover"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => addMonths(m, 12))}
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
            const isStart = draft && !isEmpty && isSameDay(d, draft.start);
            const isEnd = draft && !isEmpty && isSameDay(d, draft.end);
            const inRange = draft && !isEmpty && isInRange(d, draft.start, draft.end);
            const isToday = isSameDay(d, new Date());
            return (
              <button
                key={i}
                type="button"
                disabled={isEmpty}
                onClick={() => handleDateClick(d)}
                className={`
                  w-8 h-8 text-xs rounded
                  ${isEmpty ? "invisible" : ""}
                  ${isStart || isEnd ? "bg-primary text-primary-foreground font-medium" : ""}
                  ${inRange && !isStart && !isEnd ? "bg-primary/30 text-dashboard-foreground" : ""}
                  ${!inRange && !isEmpty ? "text-dashboard-foreground hover:bg-sidebar-hover hover:ring-1 hover:ring-primary focus:ring-1 focus:ring-primary focus:outline-none" : ""}
                  ${isToday && !isStart && !isEnd ? "ring-1 ring-primary" : ""}
                `}
              >
                {isEmpty ? "" : d.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const PANEL_WIDTH = 320;
  const dropdownContent = open && dropdownRect && typeof document !== "undefined" && (
    <div
      ref={(el) => { dropdownRef.current = el; }}
      className="fixed z-[9999] rounded-xl border border-sidebar-border bg-sidebar shadow-xl p-4 min-w-[320px]"
      style={{
        top: dropdownRect.top,
        left: Math.max(0, dropdownRect.left + dropdownRect.width - PANEL_WIDTH),
      }}
    >
      <div className="mb-3">
        <label className="block text-xs font-medium text-dashboard-foreground/70 mb-1">Date Range</label>
        <div className="rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground">
          {formatRange(draft)}
        </div>
      </div>
      <div className="mb-4">
        {renderCalendar(currentMonth.getFullYear(), currentMonth.getMonth())}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {quickRanges.map(({ label, get }) => (
          <button
            key={label}
            type="button"
            onClick={() => setDraft(get())}
            className="text-xs text-primary hover:underline underline-offset-2"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-lg border border-sidebar-border px-3 py-1.5 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Apply
        </button>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-w-[200px] justify-between"
      >
        <span className="truncate">{formatRange(value)}</span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-dashboard-foreground/60" />
      </button>

      {typeof document !== "undefined" && dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}
