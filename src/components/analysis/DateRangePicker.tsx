"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
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
  /** Align with Sun–Sat headers (was Monday-first padding, which shifted every date one weekday left). */
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

function isInRange(d: Date, start: Date, end: Date): boolean {
  const t = d.getTime();
  return t >= toDateOnly(start).getTime() && t <= toDateOnly(end).getTime();
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  /** Open the calendar popup beside the trigger (to the right) instead of below. */
  dropdownPlacement?: "below" | "beside";
  /**
   * Horizontal alignment for `below` placement: leading edge of trigger vs panel.
   * `start` = panel left aligns with trigger left (calendar sits under the button).
   */
  dropdownAlign?: "start" | "end";
  /** Smaller padding, grid, and panel width (e.g. nested filter popovers). */
  compact?: boolean;
  /**
   * When `false`, the panel is not portaled to `document.body` and stays in the React tree.
   * Use inside nested dialogs so the panel remains a descendant of the dialog content (Radix will not treat it as an outside interaction).
   * @default true
   */
  portal?: boolean;
  /** Notified when the calendar dropdown opens or closes (parent dialogs can suppress Radix dismiss). */
  onDropdownOpenChange?: (open: boolean) => void;
}

const PANEL_WIDTH_DEFAULT = 320;
const PANEL_WIDTH_COMPACT = 260;
const PANEL_HEIGHT_EST_DEFAULT = 440;
const PANEL_HEIGHT_EST_COMPACT = 360;

export function DateRangePicker({
  value,
  onChange,
  className = "",
  dropdownPlacement = "below",
  dropdownAlign = "end",
  compact = false,
  portal = true,
  onDropdownOpenChange,
}: DateRangePickerProps) {
  const panelWidth = compact ? PANEL_WIDTH_COMPACT : PANEL_WIDTH_DEFAULT;
  const panelHeightEst = compact ? PANEL_HEIGHT_EST_COMPACT : PANEL_HEIGHT_EST_DEFAULT;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  useEffect(() => {
    onDropdownOpenChange?.(open);
  }, [open, onDropdownOpenChange]);

  const updateDropdownPosition = useCallback(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const gap = compact ? 4 : 8;
    let top: number;
    let left: number;
    if (dropdownPlacement === "beside") {
      left = rect.right + gap;
      top = rect.top;
      if (left + panelWidth > window.innerWidth - gap) {
        left = rect.left - panelWidth - gap;
      }
      if (left < gap) left = gap;
      if (top + panelHeightEst > window.innerHeight - gap) {
        top = Math.max(gap, window.innerHeight - gap - panelHeightEst);
      }
    } else {
      top = rect.bottom + gap;
      if (dropdownAlign === "start") {
        left = rect.left;
        if (left + panelWidth > window.innerWidth - gap) {
          left = Math.max(gap, window.innerWidth - gap - panelWidth);
        }
      } else {
        left = Math.max(0, rect.left + rect.width - panelWidth);
        if (left + panelWidth > window.innerWidth - gap) {
          left = Math.max(gap, window.innerWidth - gap - panelWidth);
        }
      }
      if (left < gap) left = gap;
    }
    setDropdownPos({ top, left });
  }, [open, dropdownPlacement, dropdownAlign, compact, panelWidth, panelHeightEst]);

  useLayoutEffect(() => {
    if (!open) {
      setDropdownPos(null);
      return;
    }
    updateDropdownPosition();
    const onResize = () => updateDropdownPosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = containerRef.current?.contains(target);
      let inDropdown = dropdownRef.current?.contains(target);
      if (!inDropdown && dropdownRef.current && typeof e.composedPath === "function") {
        inDropdown = e.composedPath().includes(dropdownRef.current);
      }
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
    const navIcon = compact ? "h-3 w-3" : "h-4 w-4";
    const dayCell = compact ? "w-7 h-7 text-[10px]" : "w-8 h-8 text-xs";
    const dowLabel = compact ? "text-[9px] py-0.5" : "text-[10px] py-1";
    const headerMonth = compact ? "text-xs" : "text-sm";
    return (
      <div className="flex flex-col">
        <div className={`flex items-center justify-between ${compact ? "mb-1.5" : "mb-2"}`}>
          <span className={`font-medium text-dashboard-foreground ${headerMonth}`}>{monthLabel}</span>
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => addMonths(m, -12))}
              className={`${compact ? "p-0.5" : "p-1"} rounded text-dashboard-foreground/70 hover:bg-sidebar-hover`}
              aria-label="Previous year"
            >
              <ChevronsLeft className={navIcon} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => addMonths(m, -1))}
              className={`${compact ? "p-0.5" : "p-1"} rounded text-dashboard-foreground/70 hover:bg-sidebar-hover`}
              aria-label="Previous month"
            >
              <ChevronLeft className={navIcon} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className={`${compact ? "p-0.5" : "p-1"} rounded text-dashboard-foreground/70 hover:bg-sidebar-hover`}
              aria-label="Next month"
            >
              <ChevronRight className={navIcon} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => addMonths(m, 12))}
              className={`${compact ? "p-0.5" : "p-1"} rounded text-dashboard-foreground/70 hover:bg-sidebar-hover`}
              aria-label="Next year"
            >
              <ChevronsRight className={navIcon} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className={`font-medium text-dashboard-foreground/60 ${dowLabel}`}>
              {compact ? day.slice(0, 2) : day}
            </div>
          ))}
          {days.map((d, i) => {
            const isEmpty = d.getTime() === 0;
            const isStart = draft && !isEmpty && isSameDay(d, draft.start);
            const isEnd = draft && !isEmpty && isSameDay(d, draft.end);
            const inRange = draft && !isEmpty && isInRange(d, draft.start, draft.end);
            const isToday = isSameDay(d, today);
            return (
              <button
                key={i}
                type="button"
                disabled={isEmpty}
                onClick={() => handleDateClick(d)}
                className={`
                  ${dayCell} rounded
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

  const dropdownContent =
    open &&
    dropdownPos && (
    <div
      ref={(el) => { dropdownRef.current = el; }}
      data-date-range-picker-panel="true"
      className={`fixed isolate rounded-xl border border-sidebar-border bg-sidebar shadow-xl ${
        compact ? "p-3 max-w-[min(260px,calc(100vw-16px))]" : "p-4 max-w-[min(320px,calc(100vw-16px))]"
      } ${portal ? "z-[20000]" : "z-[200]"}`}
      style={{
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: panelWidth,
      }}
    >
      <div className={compact ? "mb-2" : "mb-3"}>
        <label className="block text-xs font-medium text-dashboard-foreground/70 mb-1">Date Range</label>
        <div
          className={`rounded-lg border border-sidebar-border bg-header-input text-dashboard-foreground ${
            compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"
          }`}
        >
          {formatRange(draft)}
        </div>
      </div>
      <div className={compact ? "mb-2" : "mb-4"}>
        {renderCalendar(currentMonth.getFullYear(), currentMonth.getMonth())}
      </div>
      <div className={`flex flex-wrap gap-2 ${compact ? "mb-2 gap-1.5" : "mb-4"}`}>
        {quickRanges.map(({ label, get }) => (
          <button
            key={label}
            type="button"
            onClick={() => setDraft(get())}
            className={`text-primary hover:underline underline-offset-2 ${compact ? "text-[10px]" : "text-xs"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleCancel}
          className={`rounded-lg border border-sidebar-border font-medium text-dashboard-foreground hover:bg-sidebar-hover ${
            compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
          }`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className={`rounded-lg bg-primary font-medium text-primary-foreground hover:bg-primary/90 ${
            compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
          }`}
        >
          Apply
        </button>
      </div>
    </div>
    );

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary justify-between"
      >
        <span className="min-w-0 truncate text-left">{formatRange(value)}</span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-dashboard-foreground/60" />
      </button>

      {portal
        ? typeof document !== "undefined" && dropdownContent && createPortal(dropdownContent, document.body)
        : dropdownContent}
    </div>
  );
}
