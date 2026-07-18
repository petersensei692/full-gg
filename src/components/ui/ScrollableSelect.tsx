"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type ScrollableSelectOption = {
  value: string;
  label: string;
};

type ScrollableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: ScrollableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Visible rows in the open menu before scrolling (default 5). */
  maxVisible?: number;
  /** Open menu below (default) or above the trigger. */
  placement?: "bottom" | "top";
  className?: string;
  id?: string;
  "aria-label"?: string;
};

const TRIGGER_CLASS =
  "flex w-full items-center justify-between gap-2 rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-left text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50";

/** Collapsed select-like control; open menu scrolls after ~maxVisible rows. */
export function ScrollableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  maxVisible = 5,
  placement = "bottom",
  className = "",
  id,
  "aria-label": ariaLabel,
}: ScrollableSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);
  const canOpen = !disabled && options.length > 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!canOpen && open) setOpen(false);
  }, [canOpen, open]);

  const selectOption = (next: string, e: React.MouseEvent) => {
    // Prevent <label> wrapping this control from re-clicking the trigger (which would reopen).
    e.preventDefault();
    e.stopPropagation();
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        disabled={!canOpen}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!canOpen) return;
          setOpen((o) => !o);
        }}
        className={TRIGGER_CLASS}
      >
        <span className={selected ? "truncate" : "truncate text-dashboard-foreground/50"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-dashboard-foreground/60 transition-transform ${
            open ? (placement === "top" ? "rotate-0" : "rotate-180") : placement === "top" ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className={`scrollbar-modal absolute z-50 w-full overflow-y-auto rounded-lg border border-sidebar-border bg-sidebar py-1 shadow-xl ${
            placement === "top" ? "bottom-full mb-1" : "top-full mt-1"
          }`}
          style={{ maxHeight: `calc(${maxVisible} * 2.25rem)` }}
          onMouseDown={(e) => {
            // Keep focus/selection from flipping the parent <label> onto the trigger.
            e.preventDefault();
          }}
        >
          {options.map((o) => {
            const isSelected = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`flex w-full px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar-hover ${
                    isSelected ? "bg-primary/10 text-primary" : "text-dashboard-foreground"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => selectOption(o.value, e)}
                >
                  <span className="truncate">{o.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
