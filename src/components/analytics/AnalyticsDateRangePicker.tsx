"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar } from "lucide-react";
import { AnalyticsStyleDateRangePanel } from "./AnalyticsStyleDateRangePanel";

function toLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-sidebar-border bg-sidebar ${className}`}>{children}</div>;
}

export type { AnalyticsRangePreset } from "./AnalyticsStyleDateRangePanel";
export { distinctMonthsInRange } from "./AnalyticsStyleDateRangePanel";

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

  const pillLabel = useMemo(() => {
    if (!from) return "All Time";
    return `${toLabel(from)} - ${toLabel(to)}`;
  }, [from, to]);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          <AnalyticsStyleDateRangePanel
            initialFrom={from}
            initialTo={to}
            onApply={(nextFrom, nextTo) => {
              onApply(nextFrom, nextTo);
              setOpen(false);
            }}
            onCancel={() => setOpen(false)}
          />
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
