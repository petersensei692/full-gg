"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogOverlay } from "@/components/ui/Dialog";
import type { AllAnalysisItem } from "@/types/api";
import type { StreamEntry as StreamEntryType } from "@/types/asset";
import { allAnalysisService } from "@/lib/api";
import { DateRangePicker, type DateRange } from "@/components/analysis/DateRangePicker";
import { AnalysisScopeFilterDropdown } from "@/components/analysis/AnalysisScopeFilterDropdown";
import { normalizeAssetCategory } from "@/lib/asset-category";
import { rowMatchesScopeFilter } from "@/lib/analysis-scope-filter";
import { mapAllAnalysisItemsToStreamEntries } from "@/lib/all-analysis-map";
import { buildStreamEntryGroups } from "@/lib/analysis-stream-entry-groups";
import { StreamEntry as StreamEntryComponent } from "@/components/analysis/StreamEntry";
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react";

const ANALYSIS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "qoq", label: "QoQ" },
  { value: "yearly", label: "Yearly" },
  { value: "tradeNote", label: "Trade note" },
] as const;

export interface WatchItemAnalysisLinkPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetLabel: string;
  /** Asset `type` from API (currency, commodity, …) for scope grouping. */
  assetType?: string;
  initialSelectedIds: string[];
  onApply: (ids: string[]) => void | Promise<void>;
}

export function WatchItemAnalysisLinkPickerModal({
  open,
  onOpenChange,
  assetId,
  assetLabel,
  assetType,
  initialSelectedIds,
  onApply,
}: WatchItemAnalysisLinkPickerModalProps) {
  const [rows, setRows] = useState<AllAnalysisItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [applyBusy, setApplyBusy] = useState(false);
  const [analysisFilter, setAnalysisFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(true);
  const [scopeIncludeGlobal, setScopeIncludeGlobal] = useState(true);
  const [scopeCheckedAssets, setScopeCheckedAssets] = useState<Set<string>>(() => new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtersBtnRef = useRef<HTMLButtonElement | null>(null);
  const filtersPanelRef = useRef<HTMLDivElement | null>(null);
  const streamScrollRef = useRef<HTMLDivElement | null>(null);
  const didInitialAutoScrollRef = useRef(false);

  const initialKey = initialSelectedIds.join("|");

  useEffect(() => {
    if (!open) return;
    setSelectedIds([...initialSelectedIds]);
    didInitialAutoScrollRef.current = false;
    setScopeIncludeGlobal(true);
    setScopeCheckedAssets(new Set([assetId]));
  }, [open, assetId, initialKey]);

  const fetchRows = useCallback(async () => {
    if (!assetId) return;
    setLoading(true);
    try {
      const data = await allAnalysisService.getAll(assetId);
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    if (open && assetId) void fetchRows();
  }, [open, assetId, fetchRows]);

  const mappedEntries = useMemo((): StreamEntryType[] => {
    return mapAllAnalysisItemsToStreamEntries(rows);
  }, [rows]);

  const rowById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const entriesAfterFiltersExceptFavoritesToggle = useMemo(() => {
    let list = mappedEntries;
    if (analysisFilter !== "all") {
      list = list.filter((e) => (e.analysisType ?? "daily") === analysisFilter);
    }
    if (dateRange) {
      const startMs = new Date(
        dateRange.start.getFullYear(),
        dateRange.start.getMonth(),
        dateRange.start.getDate(),
      ).getTime();
      const endMs = new Date(
        dateRange.end.getFullYear(),
        dateRange.end.getMonth(),
        dateRange.end.getDate(),
        23,
        59,
        59,
        999,
      ).getTime();
      list = list.filter((e) => {
        const t = e.createdAt ?? 0;
        return t >= startMs && t <= endMs;
      });
    }
    list = list.filter((e) => {
      const row = rowById.get(e.id);
      if (!row) return false;
      return rowMatchesScopeFilter(row, {
        includeGlobalFull: scopeIncludeGlobal,
        checkedAssetIds: scopeCheckedAssets,
      });
    });
    return list;
  }, [
    mappedEntries,
    rowById,
    analysisFilter,
    dateRange,
    scopeIncludeGlobal,
    scopeCheckedAssets,
  ]);

  const filteredEntries = useMemo(() => {
    let list = entriesAfterFiltersExceptFavoritesToggle;
    if (!favoritesOnly) {
      list = list.filter((e) => !e.favorite);
    }
    return list;
  }, [entriesAfterFiltersExceptFavoritesToggle, favoritesOnly]);

  const entriesWithGroups = useMemo(
    () => buildStreamEntryGroups(filteredEntries),
    [filteredEntries],
  );

  const scopeAssetOptions = useMemo(
    () => [
      {
        id: assetId,
        name: assetLabel,
        category: normalizeAssetCategory(assetType),
      },
    ],
    [assetId, assetLabel, assetType],
  );

  /**
   * Close the filters popover on outside press. Date + scope panels stay in this DOM subtree
   * (`portal={false}`), so target containment covers them — no body portals, no dialog dismissal.
   */
  useEffect(() => {
    if (!filtersOpen) return;
    const stopCloseFilters = (ev: MouseEvent | PointerEvent) => {
      const t = ev.target as Node | null;
      if (filtersBtnRef.current?.contains(t)) return;
      if (filtersPanelRef.current?.contains(t)) return;
      setFiltersOpen(false);
    };
    document.addEventListener("mousedown", stopCloseFilters, true);
    document.addEventListener("pointerdown", stopCloseFilters, true);
    return () => {
      document.removeEventListener("mousedown", stopCloseFilters, true);
      document.removeEventListener("pointerdown", stopCloseFilters, true);
    };
  }, [filtersOpen]);

  useEffect(() => {
    if (loading) return;
    if (didInitialAutoScrollRef.current) return;
    didInitialAutoScrollRef.current = true;
    const el = streamScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }, [loading, entriesWithGroups]);

  const toggleId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const i = prev.indexOf(id);
      if (i >= 0) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }, []);

  const handleApply = async () => {
    setApplyBusy(true);
    try {
      await onApply(selectedIds);
      onOpenChange(false);
    } catch {
      /* stay open */
    } finally {
      setApplyBusy(false);
    }
  };

  const selectedCount = selectedIds.length;

  /**
   * Never dismiss this dialog from overlay / outside pointer / focus — Radix treats many interactions
   * as “outside” when nested pickers or filters change focus. Close only via header X, Cancel, or Apply.
   */
  const blockRadixOutsideDismiss = useCallback((e: { preventDefault: () => void }) => {
    e.preventDefault();
  }, []);

  const filtersPanelContent = (
    <div className="space-y-3">
      <div className="space-y-1">
        <span className="text-xs font-medium text-dashboard-foreground/70">Analysis type</span>
        <select
          value={analysisFilter}
          onChange={(e) => setAnalysisFilter(e.target.value)}
          className="w-full rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {ANALYSIS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <span className="text-xs font-medium text-dashboard-foreground/70">Date range</span>
        <DateRangePicker
          portal={false}
          compact
          dropdownAlign="start"
          value={dateRange}
          onChange={setDateRange}
          className="w-full"
        />
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={favoritesOnly}
        onClick={() => setFavoritesOnly((v) => !v)}
        className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          favoritesOnly
            ? "border-primary bg-primary/15 text-dashboard-foreground"
            : "border-sidebar-border bg-sidebar text-dashboard-foreground/70 hover:bg-sidebar-hover hover:text-dashboard-foreground"
        }`}
      >
        Favorites
      </button>
      <div className="space-y-1">
        <span className="text-xs font-medium text-dashboard-foreground/70">Scope</span>
        <AnalysisScopeFilterDropdown
          portal={false}
          assets={scopeAssetOptions}
          includeGlobalFull={scopeIncludeGlobal}
          onIncludeGlobalFullChange={setScopeIncludeGlobal}
          checkedAssetIds={scopeCheckedAssets}
          onToggleAsset={(id, checked) => {
            setScopeCheckedAssets((prev) => {
              const next = new Set(prev);
              if (checked) next.add(id);
              else next.delete(id);
              return next;
            });
          }}
          onSelectAll={() => {
            setScopeIncludeGlobal(true);
            setScopeCheckedAssets(new Set([assetId]));
          }}
          onClearAll={() => {
            setScopeIncludeGlobal(false);
            setScopeCheckedAssets(new Set());
          }}
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        containToMain
        overlayProps={
          { "data-link-analysis-picker-overlay": "" } as ComponentPropsWithoutRef<typeof DialogOverlay>
        }
        data-link-analysis-picker=""
        onInteractOutside={blockRadixOutsideDismiss}
        onPointerDownOutside={blockRadixOutsideDismiss}
        onFocusOutside={blockRadixOutsideDismiss}
        className="!p-0 bg-sidebar border border-sidebar-border rounded-xl w-full max-w-[min(96rem,calc(100dvw-var(--sidebar-width,0px)-2rem))] h-[min(92dvh,920px)] max-h-[92dvh] flex flex-col overflow-hidden min-w-0 !items-stretch !justify-start"
      >
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-x-hidden">
          <div className="relative z-[70] h-11 shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-sidebar-border">
            <div className="w-9 shrink-0" aria-hidden />
            <div className="relative shrink-0">
              <button
                ref={filtersBtnRef}
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                className="rounded-lg border border-sidebar-border p-2 text-header-muted hover:bg-sidebar-hover hover:text-primary"
                title="Filters"
                aria-label="Analysis filters"
                aria-expanded={filtersOpen}
                aria-haspopup="dialog"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              {filtersOpen ? (
                <div
                  ref={filtersPanelRef}
                  className="absolute left-0 top-[calc(100%+6px)] z-[80] w-[min(20rem,calc(100vw-2rem))] max-h-[min(70vh,520px)] overflow-y-auto overflow-x-hidden rounded-lg border border-sidebar-border bg-sidebar p-3 shadow-xl"
                  role="dialog"
                  aria-label="Link analysis filters"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {filtersPanelContent}
                </div>
              ) : null}
            </div>
            <h2 className="flex-1 min-w-0 truncate text-center text-sm font-semibold text-dashboard-foreground sm:text-left">
              Link analyses — {assetLabel}
            </h2>
            <span className="shrink-0 text-xs text-dashboard-foreground/55 tabular-nums">
              {selectedCount} selected
            </span>
            <DialogClose
              className="shrink-0 rounded-lg border border-sidebar-border p-2 text-dashboard-foreground/80 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </DialogClose>
          </div>

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-b border-sidebar-border">
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div
                ref={streamScrollRef}
                className="absolute inset-0 overflow-x-hidden overflow-y-auto px-6"
              >
                <div className="w-full max-w-full space-y-0 pb-4">
                  {loading ? (
                    <p className="py-4 text-sm text-dashboard-foreground/70">Loading...</p>
                  ) : entriesWithGroups.length === 0 ? (
                    <p className="py-4 text-sm text-dashboard-foreground/50 italic">
                      No analyses match the filters.
                    </p>
                  ) : (
                    entriesWithGroups.map(
                      ({
                        entry,
                        separatorType,
                        yearGroup,
                        monthGroup,
                        weekGroup,
                        dateGroup,
                      }) => {
                        const checked = selectedIds.includes(entry.id);
                        return (
                          <div key={entry.id} className="min-w-0">
                            <StreamEntryComponent
                              entry={entry}
                              separatorType={separatorType}
                              yearGroup={yearGroup}
                              monthGroup={monthGroup}
                              weekGroup={weekGroup}
                              dateGroup={dateGroup}
                              linkPickerOverlay={
                                <label className="cursor-pointer flex items-center justify-center p-0.5">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleId(entry.id)}
                                    className="h-4 w-4 rounded border-sidebar-border text-primary focus:ring-primary"
                                    aria-label={`Link analysis ${entry.tag}`}
                                  />
                                </label>
                              }
                            />
                          </div>
                        );
                      },
                    )
                  )}
                </div>
              </div>
              <div className="pointer-events-none absolute inset-0 z-20">
                <div className="pointer-events-auto absolute bottom-4 right-8 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      streamScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
                    }
                    className="h-9 w-9 rounded-lg border border-sidebar-border bg-sidebar/95 text-dashboard-foreground hover:bg-sidebar-hover transition-colors shadow-md backdrop-blur-sm"
                    aria-label="Go to top"
                    title="Go to top"
                  >
                    <ChevronUp className="h-5 w-5 mx-auto" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      streamScrollRef.current?.scrollTo({
                        top: streamScrollRef.current.scrollHeight,
                        behavior: "smooth",
                      })
                    }
                    className="h-9 w-9 rounded-lg border border-sidebar-border bg-sidebar/95 text-dashboard-foreground hover:bg-sidebar-hover transition-colors shadow-md backdrop-blur-sm"
                    aria-label="Go to bottom"
                    title="Go to bottom"
                  >
                    <ChevronDown className="h-5 w-5 mx-auto" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 px-5 py-3 flex justify-end gap-2 bg-sidebar">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-sidebar-border px-4 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={applyBusy}
              onClick={() => void handleApply()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {applyBusy ? "Saving…" : "Apply links"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
