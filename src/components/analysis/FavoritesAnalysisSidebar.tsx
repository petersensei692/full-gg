"use client";

import type { ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Download, X } from "lucide-react";

type FavoritesAnalysisSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  onExport?: () => void;
  exportDisabled?: boolean;
  children: ReactNode;
};

/**
 * Overlays the analysis shell (header + filters + stream): **75vw** from `md` up, **90vw** on small screens,
 * slides in/out horizontally with a backdrop. Parent must be `relative` and wrap the area to cover.
 * Place **below** the stream row in DOM but use `absolute inset-0` so it still covers header + filters + stream.
 * Keep the composer **outside** this overlay’s parent or with higher z-index.
 */
export function FavoritesAnalysisSidebar({
  open,
  onOpenChange,
  title = "Favorite analyses",
  onExport,
  exportDisabled = false,
  children,
}: FavoritesAnalysisSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Jump to latest (bottom) when the drawer opens — entries are oldest → newest.
  useLayoutEffect(() => {
    if (!open) return;
    const jump = () => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    };
    jump();
    const id1 = requestAnimationFrame(() => {
      jump();
      requestAnimationFrame(jump);
    });
    return () => cancelAnimationFrame(id1);
  }, [open]);

  const scrollToTop = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const headerRow = (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-4 py-3">
      <h3 className="min-w-0 truncate text-sm font-semibold">{title}</h3>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={scrollToTop}
          className="rounded-lg border border-sidebar-border p-2 text-dashboard-foreground/80 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors"
          aria-label="Scroll favorites to top"
          title="Top"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={scrollToBottom}
          className="rounded-lg border border-sidebar-border p-2 text-dashboard-foreground/80 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors"
          aria-label="Scroll favorites to bottom"
          title="Bottom"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className="rounded-lg border border-sidebar-border p-2 text-dashboard-foreground/80 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Export favorite analyses"
            title="Export favorites (.txt)"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-lg border border-sidebar-border p-2 text-dashboard-foreground/80 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors"
          aria-label="Close favorites"
          title="Close favorites"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const scrollAreaClass =
    "min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-3 sm:px-3";

  return (
    <div
      className={[
        "absolute inset-0 z-[55] flex flex-col",
        open ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Dismiss favorites"
        className={[
          "absolute inset-0 bg-black/35 transition-opacity duration-300 ease-out",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
        onClick={() => onOpenChange(false)}
        tabIndex={open ? 0 : -1}
      />
      <aside
        className={[
          "absolute right-0 top-0 flex h-full min-w-0 flex-col border-l border-sidebar-border bg-sidebar text-dashboard-foreground shadow-xl",
          /* Phone: full width; sm+: 90vw; md+: 75vw */
          "w-full max-w-full sm:w-[90vw] sm:max-w-[90vw] md:w-[75vw] md:max-w-[75vw]",
          "transition-transform duration-300 ease-out will-change-transform",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {headerRow}
        <div ref={scrollRef} className={scrollAreaClass}>
          {children}
        </div>
      </aside>
    </div>
  );
}
