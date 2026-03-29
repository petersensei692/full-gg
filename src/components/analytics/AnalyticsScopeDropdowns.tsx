"use client";

import { useEffect, useRef, useState } from "react";
import { Coins, LineChart } from "lucide-react";
import type { AnalyticsScope } from "@/lib/usePersistedAnalyticsScope";
import { scopeActive } from "@/lib/usePersistedAnalyticsScope";
import { uniqueCurrenciesFromPairs } from "@/lib/pair-currency-utils";

function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-sidebar-border bg-sidebar ${className}`}>{children}</div>
  );
}

type MultiPanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
};

function MultiPanel({ open, onClose, title, options, selected, onToggle, anchorRef }: MultiPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute left-0 top-full z-[120] mt-1 min-w-[220px] max-w-[min(100vw-2rem,320px)] rounded-xl border border-sidebar-border bg-sidebar p-2 shadow-xl"
    >
      <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-header-muted">{title}</p>
      <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-lg border border-sidebar-border bg-header/40 p-2">
        {options.length === 0 ? (
          <p className="px-2 py-3 text-sm text-header-muted">No options</p>
        ) : (
          options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-header"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => onToggle(opt)}
                className="rounded border-sidebar-border"
              />
              <span className="text-sm text-header-foreground">{opt}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

type Props = {
  pairOptions: string[];
  scope: AnalyticsScope;
  onScopeChange: (next: AnalyticsScope) => void;
};

export function AnalyticsScopeDropdowns({ pairOptions, scope, onScopeChange }: Props) {
  const [openCur, setOpenCur] = useState(false);
  const [openPair, setOpenPair] = useState(false);
  const curBtnRef = useRef<HTMLButtonElement>(null);
  const pairBtnRef = useRef<HTMLButtonElement>(null);

  const currencyOptions = uniqueCurrenciesFromPairs(pairOptions);

  const toggleCurrency = (c: string) => {
    const next = scope.currencies.includes(c)
      ? scope.currencies.filter((x) => x !== c)
      : [...scope.currencies, c];
    onScopeChange({ ...scope, currencies: next });
  };

  const togglePair = (p: string) => {
    const next = scope.pairs.includes(p) ? scope.pairs.filter((x) => x !== p) : [...scope.pairs, p];
    onScopeChange({ ...scope, pairs: next });
  };

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <div className="relative">
        <button
          ref={curBtnRef}
          type="button"
          onClick={() => {
            setOpenPair(false);
            setOpenCur((v) => !v);
          }}
          className={scope.currencies.length > 0 ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-dashboard-bg rounded-xl" : ""}
          aria-expanded={openCur}
          aria-label="Currencies filter"
          title="Currencies"
        >
          <SurfaceCard className="flex h-10 w-10 items-center justify-center">
            <Coins className="h-4 w-4 text-primary" />
          </SurfaceCard>
        </button>
        <MultiPanel
          open={openCur}
          onClose={() => setOpenCur(false)}
          title="Currencies"
          options={currencyOptions}
          selected={scope.currencies}
          onToggle={toggleCurrency}
          anchorRef={curBtnRef}
        />
      </div>

      <div className="relative">
        <button
          ref={pairBtnRef}
          type="button"
          onClick={() => {
            setOpenCur(false);
            setOpenPair((v) => !v);
          }}
          className={scope.pairs.length > 0 ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-dashboard-bg rounded-xl" : ""}
          aria-expanded={openPair}
          aria-label="Pairs filter"
          title="Pairs"
        >
          <SurfaceCard className="flex h-10 w-10 items-center justify-center">
            <LineChart className="h-4 w-4 text-primary" />
          </SurfaceCard>
        </button>
        <MultiPanel
          open={openPair}
          onClose={() => setOpenPair(false)}
          title="Pairs"
          options={pairOptions}
          selected={scope.pairs}
          onToggle={togglePair}
          anchorRef={pairBtnRef}
        />
      </div>

      {scopeActive(scope) && (
        <span className="text-xs text-header-muted">
          {scope.currencies.length > 0 ? `${scope.currencies.length} currencies · ` : ""}
          {scope.pairs.length > 0 ? `${scope.pairs.length} pairs` : ""}
        </span>
      )}
    </div>
  );
}
