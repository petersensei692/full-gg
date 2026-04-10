"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Coins, LineChart, X } from "lucide-react";
import {
  defaultTradeFilters,
  type TradeFilters,
  formatDurationMsForFilter,
  parseDurationInputToParts,
  partsToDurationMs,
  sanitizeDecimalFilterInput,
} from "@/lib/trade-filters";
import { uniqueCurrenciesFromPairs } from "@/lib/pair-currency-utils";

type Props = {
  open: boolean;
  onClose: () => void;
  symbolOptions: string[];
  applied: TradeFilters;
  onApply: (next: TradeFilters) => void;
};

const PANEL_MS = 320;

const DURATION_FIELDS = ["d", "h", "m", "s"] as const;
type DurationField = (typeof DURATION_FIELDS)[number];

function DurationPartsGrid({
  parts,
  onChange,
}: {
  parts: { d: number; h: number; m: number; s: number };
  onChange: (next: { d: number; h: number; m: number; s: number }) => void;
}) {
  const label = (f: DurationField) =>
    f === "d" ? "Days" : f === "h" ? "Hrs" : f === "m" ? "Min" : "Sec";
  const maxFor = (f: DurationField) => (f === "d" ? 9999 : f === "h" ? 23 : 59);

  return (
    <div className="grid grid-cols-4 gap-2">
      {DURATION_FIELDS.map((field) => (
        <label key={field} className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[10px] uppercase text-header-muted">{label(field)}</span>
          <input
            type="number"
            min={0}
            max={maxFor(field)}
            value={parts[field]}
            onChange={(e) => {
              const v = Math.max(0, parseInt(e.target.value, 10) || 0);
              const cap = Math.min(v, maxFor(field));
              onChange({ ...parts, [field]: cap });
            }}
            className="w-full rounded-lg border border-sidebar-border bg-header px-2 py-1.5 text-sm text-header-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </label>
      ))}
    </div>
  );
}

function HoldDurationFilters({
  minValue,
  maxValue,
  onMin,
  onMax,
}: {
  minValue: string;
  maxValue: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}) {
  const minParts = parseDurationInputToParts(minValue);
  const maxParts = parseDurationInputToParts(maxValue);
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-header-foreground">Hold time</p>
      <p className="text-xs text-header-muted">Minimum</p>
      <DurationPartsGrid
        parts={minParts}
        onChange={(next) => {
          const ms = partsToDurationMs(next.d, next.h, next.m, next.s);
          onMin(ms > 0 ? formatDurationMsForFilter(ms) : "");
        }}
      />
      <p className="text-xs text-header-muted">Maximum</p>
      <DurationPartsGrid
        parts={maxParts}
        onChange={(next) => {
          const ms = partsToDurationMs(next.d, next.h, next.m, next.s);
          onMax(ms > 0 ? formatDurationMsForFilter(ms) : "");
        }}
      />
    </div>
  );
}

function FieldPair({
  label,
  minPlaceholder,
  maxPlaceholder,
  minValue,
  maxValue,
  onMin,
  onMax,
  decimal,
  allowNegativeDecimal,
}: {
  label: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  minValue: string;
  maxValue: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
  /** When true, only digits, optional decimal point, and up to 2 fractional digits. */
  decimal?: boolean;
  /** Only when `decimal`: allow a leading minus (e.g. negative R). */
  allowNegativeDecimal?: boolean;
}) {
  const decOpts = decimal ? { allowNegative: !!allowNegativeDecimal, maxDecimals: 2 } : undefined;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-header-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          inputMode={decimal ? "decimal" : undefined}
          autoComplete="off"
          value={minValue}
          onChange={(e) =>
            onMin(decimal ? sanitizeDecimalFilterInput(e.target.value, decOpts) : e.target.value)
          }
          placeholder={minPlaceholder ?? "Minimum"}
          className="rounded-lg border border-sidebar-border bg-header px-3 py-2 text-sm text-header-foreground placeholder:text-header-muted/50"
        />
        <input
          type="text"
          inputMode={decimal ? "decimal" : undefined}
          autoComplete="off"
          value={maxValue}
          onChange={(e) =>
            onMax(decimal ? sanitizeDecimalFilterInput(e.target.value, decOpts) : e.target.value)
          }
          placeholder={maxPlaceholder ?? "Maximum"}
          className="rounded-lg border border-sidebar-border bg-header px-3 py-2 text-sm text-header-foreground placeholder:text-header-muted/50"
        />
      </div>
    </div>
  );
}

function MultiDropdown({
  label,
  icon: Icon,
  options,
  selected,
  onToggle,
  ringActive,
}: {
  label: string;
  icon: typeof Coins;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  ringActive: boolean;
}) {
  const [ddOpen, setDdOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ddOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setDdOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [ddOpen]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setDdOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-sidebar-border bg-header px-3 py-2 text-left text-sm text-header-foreground hover:bg-header/80 ${
          ringActive ? "ring-2 ring-primary/40" : ""
        }`}
      >
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-primary" />
          {label}
        </span>
        <span className="text-xs text-header-muted">{selected.length ? `${selected.length} selected` : "Any"}</span>
      </button>
      {ddOpen && (
        <div
          ref={panelRef}
          className="absolute left-0 right-0 top-full z-[130] mt-1 max-h-48 space-y-0.5 overflow-y-auto rounded-lg border border-sidebar-border bg-sidebar p-2 shadow-lg"
        >
          {options.length === 0 ? (
            <p className="px-2 py-2 text-sm text-header-muted">No options</p>
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
      )}
    </div>
  );
}

export function TradeFiltersDrawer({ open, onClose, symbolOptions, applied, onApply }: Props) {
  const [mounted, setMounted] = useState(false);
  const [renderOpen, setRenderOpen] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [draft, setDraft] = useState<TradeFilters>(applied);
  const [pairText, setPairText] = useState("");
  const [selectedPairs, setSelectedPairs] = useState<string[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setRenderOpen(true);
      setAnimateIn(false);
      let alive = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (alive) setAnimateIn(true);
        });
      });
      return () => {
        alive = false;
      };
    }
    setAnimateIn(false);
    const hideTimer = window.setTimeout(() => setRenderOpen(false), PANEL_MS);
    return () => clearTimeout(hideTimer);
  }, [open]);

  useEffect(() => {
    if (open) {
      setDraft({ ...applied });
      setPairText(applied.symbols.join(", "));
      setSelectedPairs([...applied.symbols]);
      setSelectedCurrencies([...applied.currencies]);
    }
  }, [open, applied]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const currencyOptions = uniqueCurrenciesFromPairs(symbolOptions.length > 0 ? symbolOptions : parsePairList(pairText));

  const panel =
    renderOpen &&
    mounted && (
      <div className="fixed inset-0 z-[110] flex justify-end">
        <button
          type="button"
          className={`absolute inset-0 bg-black/50 backdrop-blur-[1px] transition-opacity duration-300 ease-out ${
            animateIn ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-label="Close filters"
          onClick={onClose}
        />
        <aside
          className={`relative z-[111] flex h-full w-full max-w-md flex-col border-l border-sidebar-border bg-sidebar shadow-2xl transition-transform duration-300 ease-out will-change-transform ${
            animateIn ? "translate-x-0" : "translate-x-full"
          }`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b border-sidebar-border p-4">
            <div>
              <h2 className="text-lg font-semibold text-header-foreground">Filters</h2>
              <p className="mt-0.5 text-xs text-header-muted">Configure your filter preferences</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-header" aria-label="Close">
              <X className="h-5 w-5 text-header-muted" />
            </button>
          </div>

          <div className="border-b border-sidebar-border px-4 py-3">
            <span className="rounded-md bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary">Trade Filters</span>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            <div className="space-y-3">
              <p className="text-sm font-medium text-header-foreground">Pairs & currencies</p>
              {symbolOptions.length > 0 ? (
                <>
                  <MultiDropdown
                    label="Pairs"
                    icon={LineChart}
                    options={symbolOptions}
                    selected={selectedPairs}
                    ringActive={selectedPairs.length > 0}
                    onToggle={(sym) =>
                      setSelectedPairs((prev) =>
                        prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym],
                      )
                    }
                  />
                  <MultiDropdown
                    label="Currencies"
                    icon={Coins}
                    options={currencyOptions}
                    selected={selectedCurrencies}
                    ringActive={selectedCurrencies.length > 0}
                    onToggle={(c) =>
                      setSelectedCurrencies((prev) =>
                        prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                      )
                    }
                  />
                </>
              ) : (
                <input
                  type="text"
                  value={pairText}
                  onChange={(e) => setPairText(e.target.value)}
                  placeholder="Comma-separated pairs, e.g. EURUSD, BTCUSD"
                  className="w-full rounded-lg border border-sidebar-border bg-header px-3 py-2 text-sm text-header-foreground placeholder:text-header-muted/50"
                />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-header-foreground">Order type</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.buy}
                    onChange={(e) => setDraft((d) => ({ ...d, buy: e.target.checked }))}
                    className="rounded border-sidebar-border"
                  />
                  <span className="text-sm text-header-foreground">Buy</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.sell}
                    onChange={(e) => setDraft((d) => ({ ...d, sell: e.target.checked }))}
                    className="rounded border-sidebar-border"
                  />
                  <span className="text-sm text-header-foreground">Sell</span>
                </label>
              </div>
            </div>

            <FieldPair
              label="Profit range (R)"
              decimal
              allowNegativeDecimal
              minValue={draft.profitMin}
              maxValue={draft.profitMax}
              onMin={(v) => setDraft((d) => ({ ...d, profitMin: v }))}
              onMax={(v) => setDraft((d) => ({ ...d, profitMax: v }))}
            />

            <HoldDurationFilters
              minValue={draft.holdMin}
              maxValue={draft.holdMax}
              onMin={(v) => setDraft((d) => ({ ...d, holdMin: v }))}
              onMax={(v) => setDraft((d) => ({ ...d, holdMax: v }))}
            />

            <FieldPair
              label="Volume range"
              decimal
              minValue={draft.volumeMin}
              maxValue={draft.volumeMax}
              onMin={(v) => setDraft((d) => ({ ...d, volumeMin: v }))}
              onMax={(v) => setDraft((d) => ({ ...d, volumeMax: v }))}
            />
          </div>

          <div className="mt-auto flex gap-3 border-t border-sidebar-border p-4">
            <button
              type="button"
              onClick={() => {
                setDraft(defaultTradeFilters());
                setPairText("");
                setSelectedPairs([]);
                setSelectedCurrencies([]);
              }}
              className="flex-1 rounded-lg border border-sidebar-border py-2.5 text-sm font-medium text-header-foreground hover:bg-header"
            >
              Clear filters
            </button>
            <button
              type="button"
              onClick={() => {
                const symbols =
                  symbolOptions.length > 0 ? selectedPairs : parsePairList(pairText);
                onApply({
                  ...draft,
                  symbols,
                  currencies: symbolOptions.length > 0 ? selectedCurrencies : [],
                });
                onClose();
              }}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Apply filters
            </button>
          </div>
        </aside>
      </div>
    );

  return panel && mounted ? createPortal(panel, document.body) : null;
}

function parsePairList(s: string): string[] {
  return s
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}
