"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Plus, Trash2, X } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AnalyticsDateRangePicker } from "@/components/analytics/AnalyticsDateRangePicker";
import { tradesApi, watchItemsService, weeklyWatchlistService } from "@/lib/api";
import { usePersistedDateRange } from "@/lib/usePersistedDateRange";
import { usePersistedTradeFilters } from "@/lib/usePersistedTradeFilters";
import { filtersActive } from "@/lib/trade-filters";
import type { TradesQueryParams } from "@/lib/services/trades.service";
import { TradeFiltersDrawer } from "@/components/analytics/TradeFiltersDrawer";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { uploadImageBlob } from "@/lib/imageUpload";
import { getImageUrl } from "@/lib/imageUrls";
import { pairsService } from "@/lib/services/pairs.service";
import { strategiesService } from "@/lib/services/strategies.service";
import type {
  Trade,
  TradeCloseType,
  TradeExecutionType,
  TradeNote,
  TradeSlEvolutionEntry,
  TradingPair,
  Strategy,
  WatchItem,
  WeeklyWatchlist,
} from "@/types/api";

const EXECUTION_TYPES: TradeExecutionType[] = [
  "market order",
  "buy stop",
  "sell stop",
  "buy limit",
  "sell limit",
];

/** Matches server: reward:risk = reward distance / stop distance in price (same as pip ratio). */
function computeTargetedR(type: Trade["type"], entry: number, tp: number, sl: number): number {
  const risk = type === "buy" ? Math.abs(entry - sl) : Math.abs(sl - entry);
  const reward = type === "buy" ? Math.abs(tp - entry) : Math.abs(entry - tp);
  if (!(risk > 0)) return 0;
  return reward / risk;
}

function formatTargetedR(value: number): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "—";
}

const FALLBACK_TRADES: Trade[] = [
  {
    id: "fallback-1",
    pair: "BTCUSD",
    type: "buy",
    executionType: "market order",
    executionTime: "2026-03-21T17:11:00.000Z",
    executionPrice: 30000.0019,
    tpPrice: 30020.0,
    initialSlPrice: 29980.0,
    slEvolution: [],
    profitFactorTargeted: 2,
    profitFactorEarned: { earnings: [{ earnedR: 1.2 }], earningsNumber: 1, totalEarned: 1.2 },
    positionSize: 1,
    closePrices: [{ price: 30010.0097, type: "fullClose", lots: 1, percentage: 100, time: "2026-03-21T17:56:00.000Z" }],
    tradeCloseTime: "2026-03-21T17:56:00.000Z",
    status: "fullyClosed",
    trackNotes: [],
    pairWatched: null,
    createdAt: "2026-03-21T17:11:00.000Z",
    updatedAt: "2026-03-21T17:56:00.000Z",
  },
  {
    id: "fallback-2",
    pair: "EURUSD",
    type: "sell",
    executionType: "sell limit",
    executionTime: "2026-03-21T01:35:00.000Z",
    executionPrice: 1.1405,
    tpPrice: 1.132,
    initialSlPrice: 1.145,
    slEvolution: [],
    profitFactorTargeted: 2.5,
    profitFactorEarned: { earnings: [{ earnedR: 0.8 }], earningsNumber: 1, totalEarned: 0.8 },
    positionSize: 2,
    closePrices: [{ price: 1.1305, type: "fullClose", lots: 2, percentage: 100, time: "2026-03-21T03:08:00.000Z" }],
    tradeCloseTime: "2026-03-21T03:08:00.000Z",
    status: "fullyClosed",
    trackNotes: [],
    pairWatched: null,
    createdAt: "2026-03-21T01:35:00.000Z",
    updatedAt: "2026-03-21T03:08:00.000Z",
  },
];

/** Sticky column widths (px) — keep in sync with `<th>` min-widths (actions: two 32px buttons + gap + padding) */
const TRADE_STICKY = { date: 168, actions: 92, pair: 150, type: 110 } as const;
const TRADE_LEFT = {
  actions: TRADE_STICKY.date,
  pair: TRADE_STICKY.date + TRADE_STICKY.actions,
  type: TRADE_STICKY.date + TRADE_STICKY.actions + TRADE_STICKY.pair,
} as const;

function Cell({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <td
      className={`whitespace-nowrap px-5 py-4 text-sm text-dashboard-foreground ${className}`}
      style={style}
    >
      {children}
    </td>
  );
}

function formatTradeDeleteDetails(trade: Trade): string {
  const close = getLatestClosePrice(trade);
  const lines = [
    `Pair: ${trade.pair}`,
    `Side: ${trade.type.toUpperCase()}`,
    `Status: ${trade.status}`,
    `Execution: ${formatDateTime(trade.executionTime)} @ ${trade.executionPrice}`,
    `TP: ${trade.tpPrice}  |  SL: ${getActualSl(trade)}`,
    close != null ? `Last close: ${close}` : null,
    `R targeted: ${formatTargetedR(trade.profitFactorTargeted)}  |  R earned: ${trade.profitFactorEarned.totalEarned.toFixed(2)}`,
    `Created: ${formatCreatedAt(trade.createdAt)}`,
  ].filter(Boolean) as string[];
  return lines.join("\n");
}

function getLatestClosePrice(trade: Trade): number | null {
  if (trade.closePrices.length === 0) return null;
  return trade.closePrices[trade.closePrices.length - 1].price;
}

function getActualSl(trade: Trade): number {
  const last = trade.slEvolution[trade.slEvolution.length - 1];
  if (!last) return trade.initialSlPrice;
  const value = Object.values(last)[0];
  return typeof value === "number" ? value : trade.initialSlPrice;
}

function getTotalClosedLots(trade: Trade): number {
  return trade.closePrices.reduce((sum, c) => sum + c.lots, 0);
}

function formatDateTime(value: string | null): string {
  if (!value) return "Pending";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const PAGE_SIZE = 25;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isPersistedTradeId(id: string): boolean {
  return UUID_RE.test(id);
}

export default function AnalyticsTradesPage() {
  type PanelTab = "metrics" | "management" | "notes" | "pairWatched";
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("metrics");
  const [noteDraft, setNoteDraft] = useState("");
  const [noteImages, setNoteImages] = useState<string[]>([]);
  const [noteNewCaptions, setNoteNewCaptions] = useState<string[]>([]);
  const noteEditorRef = useRef<HTMLTextAreaElement>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [addTradeOpen, setAddTradeOpen] = useState(false);
  const [catalogPairs, setCatalogPairs] = useState<TradingPair[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [addPairId, setAddPairId] = useState("");
  const [addStrategyId, setAddStrategyId] = useState("");
  const [addType, setAddType] = useState<Trade["type"]>("buy");
  const [addExecType, setAddExecType] = useState<TradeExecutionType>("market order");
  const [addOpenPrice, setAddOpenPrice] = useState("");
  const [addTp, setAddTp] = useState("");
  const [addSl, setAddSl] = useState("");
  const [addLots, setAddLots] = useState("1");
  const [addOpenTime, setAddOpenTime] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [executeModalOpen, setExecuteModalOpen] = useState(false);
  const [executeTarget, setExecuteTarget] = useState<Trade | null>(null);
  const [executeTime, setExecuteTime] = useState("");
  const [currentWeeklyWatchlists, setCurrentWeeklyWatchlists] = useState<WeeklyWatchlist[]>([]);
  const [currentWeekPairs, setCurrentWeekPairs] = useState<WatchItem[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [newSlPrice, setNewSlPrice] = useState("");
  const [closeType, setCloseType] = useState<TradeCloseType>("partClose");
  const [closePriceInput, setClosePriceInput] = useState("");
  const [closeTimeInput, setCloseTimeInput] = useState(new Date().toISOString().slice(0, 16));
  const [closeLotsInput, setCloseLotsInput] = useState("");
  const [closePercentInput, setClosePercentInput] = useState("");
  const { from: rangeFrom, to: rangeTo, setRange: setTradeDateRange, hydrated: rangeHydrated } =
    usePersistedDateRange("trades");
  const { filters: tradeFilters, persist: persistTradeFilters } = usePersistedTradeFilters("trades");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [noteEditIdx, setNoteEditIdx] = useState<number | null>(null);
  const [noteEditText, setNoteEditText] = useState("");
  const [noteEditImages, setNoteEditImages] = useState<string[]>([]);
  const [noteEditNames, setNoteEditNames] = useState<string[]>([]);
  const [pairOptionsFromApi, setPairOptionsFromApi] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tradePendingDelete, setTradePendingDelete] = useState<Trade | null>(null);

  useEffect(() => {
    if (!selectedTrade) return;
    if (selectedTrade.status === "cancelled") {
      setPanelTab("metrics");
    }
  }, [selectedTrade?.id, selectedTrade?.status]);

  useEffect(() => {
    let cancelled = false;
    tradesApi
      .getDistinctPairs()
      .then((pairs) => {
        if (!cancelled && pairs.length > 0) setPairOptionsFromApi(pairs);
      })
      .catch(() => {});
    pairsService
      .getAll()
      .then((pairs) => {
        if (!cancelled) setCatalogPairs(Array.isArray(pairs) ? pairs : []);
      })
      .catch(() => {
        if (!cancelled) setCatalogPairs([]);
      });
    strategiesService
      .getAll()
      .then((list) => {
        if (!cancelled) setStrategies(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setStrategies([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tradableCatalogPairs = useMemo(
    () => catalogPairs.filter((p) => p.pipValue != null),
    [catalogPairs],
  );

  const symbolOptions = useMemo(() => {
    if (pairOptionsFromApi.length > 0) return pairOptionsFromApi;
    const list = Array.isArray(trades) && trades.length > 0 ? trades : FALLBACK_TRADES;
    const s = new Set<string>();
    for (const t of list) s.add(t.pair);
    return [...s].sort();
  }, [pairOptionsFromApi, trades]);

  useEffect(() => {
    if (!rangeHydrated) return;
    let cancelled = false;
    setLoading(true);
    const params: TradesQueryParams = {
      page,
      limit: PAGE_SIZE,
      symbols: tradeFilters.symbols,
      currencies: tradeFilters.currencies,
      buy: tradeFilters.buy,
      sell: tradeFilters.sell,
      profitMin: tradeFilters.profitMin,
      profitMax: tradeFilters.profitMax,
      holdMin: tradeFilters.holdMin,
      holdMax: tradeFilters.holdMax,
      volumeMin: tradeFilters.volumeMin,
      volumeMax: tradeFilters.volumeMax,
      dateFrom: rangeFrom ? rangeFrom.toISOString() : undefined,
      dateTo: rangeTo ? rangeTo.toISOString() : undefined,
    };
    tradesApi
      .getPage(params)
      .then((res) => {
        if (!cancelled) {
          setTrades(Array.isArray(res?.items) ? res.items : []);
          setTotal(typeof res?.total === "number" ? res.total : 0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTrades(FALLBACK_TRADES);
          setTotal(FALLBACK_TRADES.length);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    page,
    rangeHydrated,
    rangeFrom,
    rangeTo,
    tradeFilters.symbols,
    tradeFilters.currencies,
    tradeFilters.buy,
    tradeFilters.sell,
    tradeFilters.profitMin,
    tradeFilters.profitMax,
    tradeFilters.holdMin,
    tradeFilters.holdMax,
    tradeFilters.volumeMin,
    tradeFilters.volumeMax,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    rangeFrom,
    rangeTo,
    tradeFilters.symbols,
    tradeFilters.currencies,
    tradeFilters.buy,
    tradeFilters.sell,
    tradeFilters.profitMin,
    tradeFilters.profitMax,
    tradeFilters.holdMin,
    tradeFilters.holdMax,
    tradeFilters.volumeMin,
    tradeFilters.volumeMax,
  ]);

  const addSelectedPair = useMemo(
    () => tradableCatalogPairs.find((p) => p.id === addPairId) ?? null,
    [tradableCatalogPairs, addPairId],
  );

  const rows = Array.isArray(trades) && trades.length > 0 ? trades : FALLBACK_TRADES;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const selectedTradeNotes = selectedTrade?.trackNotes ?? [];
  const selectedTradeActualSl = selectedTrade ? getActualSl(selectedTrade) : null;
  const selectedTradeRemainingLots = selectedTrade
    ? Math.max(0, selectedTrade.positionSize - getTotalClosedLots(selectedTrade))
    : 0;
  const tradeAllowsManagement =
    !!selectedTrade &&
    (selectedTrade.status === "executed" || selectedTrade.status === "partlyClosed");

  const canManageTrade =
    tradeAllowsManagement && selectedTradeRemainingLots > 0.000001 && selectedTrade!.status !== "fullyClosed";

  /** Add notes (including one after the trade is fully closed). */
  const canAddTradeNote =
    !!selectedTrade &&
    selectedTrade.status !== "cancelled";

  /** Edit existing notes only while the trade is still open / partly closed. */
  const canEditExistingTradeNote =
    !!selectedTrade &&
    (selectedTrade.status === "pending" ||
      selectedTrade.status === "executed" ||
      selectedTrade.status === "partlyClosed");

  const pairWatchReadOnly =
    !!selectedTrade &&
    (selectedTrade.status === "fullyClosed" || selectedTrade.status === "cancelled");

  const selectedIsCancelled = selectedTrade?.status === "cancelled";

  const updateSelectedTrade = (updated: Trade) => {
    setTrades((prev) => (Array.isArray(prev) ? prev : []).map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTrade(updated);
    setNoteEditIdx(null);
  };

  const beginEditNote = (idx: number) => {
    if (!selectedTrade) return;
    const n = selectedTrade.trackNotes[idx];
    if (!n) return;
    setNoteEditIdx(idx);
    setNoteEditText(n.text);
    setNoteEditImages([...(n.images ?? [])]);
    const names = n.imageNames ?? [];
    setNoteEditNames(n.images?.map((_, i) => names[i] ?? "") ?? []);
  };

  const cancelEditNote = () => {
    setNoteEditIdx(null);
  };

  const handleNotePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems = Array.from(items).filter((item) => item.type.startsWith("image/"));
    if (imageItems.length === 0) return;
    e.preventDefault();
    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;
      const uploaded = await uploadImageBlob(file);
      setNoteImages((prev) => [...prev, uploaded.path]);
      setNoteNewCaptions((prev) => [...prev, ""]);
    }
  };

  const handleNoteEditPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems = Array.from(items).filter((item) => item.type.startsWith("image/"));
    if (imageItems.length === 0) return;
    e.preventDefault();
    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;
      const uploaded = await uploadImageBlob(file);
      setNoteEditImages((prev) => [...prev, uploaded.path]);
      setNoteEditNames((prev) => [...prev, ""]);
    }
  };

  const handleAppendSlUpdate = async () => {
    if (!selectedTrade) return;
    const nextPrice = Number(newSlPrice);
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) return;
    const nextIndex = selectedTrade.slEvolution.length + 1;
    const nextEntry: TradeSlEvolutionEntry = { [`slUpdate${nextIndex}`]: nextPrice };
    const updated = await tradesApi.update(selectedTrade.id, {
      slEvolution: [...selectedTrade.slEvolution, nextEntry],
    });
    updateSelectedTrade(updated);
    setNewSlPrice("");
  };

  const handleAddClosePrice = async () => {
    if (!selectedTrade) return;
    const price = Number(closePriceInput);
    if (!Number.isFinite(price) || price <= 0) return;
    const timeIso = new Date(closeTimeInput).toISOString();
    const remainingLots = Math.max(0, selectedTrade.positionSize - getTotalClosedLots(selectedTrade));
    if (remainingLots <= 0) return;

    let lots = 0;
    let percentage = 0;
    if (closeType === "fullClose") {
      lots = remainingLots;
      percentage = (lots / selectedTrade.positionSize) * 100;
    } else {
      const enteredLots = Number(closeLotsInput);
      const enteredPct = Number(closePercentInput);
      if (Number.isFinite(enteredLots) && enteredLots > 0) {
        lots = Math.min(enteredLots, remainingLots);
        percentage = (lots / selectedTrade.positionSize) * 100;
      } else if (Number.isFinite(enteredPct) && enteredPct > 0) {
        const pctLots = (enteredPct / 100) * selectedTrade.positionSize;
        lots = Math.min(pctLots, remainingLots);
        percentage = (lots / selectedTrade.positionSize) * 100;
      } else {
        return;
      }
    }

    const nextClose = { price, type: closeType, lots, percentage, time: timeIso };
    const nextClosePrices = [...selectedTrade.closePrices, nextClose];
    const updated = await tradesApi.update(selectedTrade.id, {
      closePrices: nextClosePrices,
    });
    updateSelectedTrade(updated);
    setClosePriceInput("");
    setCloseLotsInput("");
    setClosePercentInput("");
  };

  const loadCurrentWeekPairs = async () => {
    setLinkLoading(true);
    try {
      const [weekly, allPairs] = await Promise.all([
        weeklyWatchlistService.getAll(),
        watchItemsService.getAll(),
      ]);
      const now = new Date();
      const activeWeeks = weekly.filter((w) => {
        const start = new Date(w.startDate);
        const end = new Date(w.endDate);
        return start <= now && now <= end;
      });
      const activeIds = new Set(activeWeeks.map((w) => w.id));
      const pairs = allPairs.filter((p) => p.watchlist?.id && activeIds.has(p.watchlist.id));
      setCurrentWeeklyWatchlists(activeWeeks);
      setCurrentWeekPairs(pairs);
    } finally {
      setLinkLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-full bg-dashboard-bg text-dashboard-foreground">
        <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6">
          <header className="mb-4 flex flex-wrap items-center justify-start gap-2">
            <AnalyticsDateRangePicker
              from={rangeFrom}
              to={rangeTo}
              onApply={(nextFrom, nextTo) => {
                setTradeDateRange(nextFrom, nextTo);
              }}
            />
            <button
              type="button"
              onClick={() => {
                setAddPairId(tradableCatalogPairs[0]?.id ?? "");
                setAddStrategyId(strategies[0]?.id ?? "");
                setAddType("buy");
                setAddExecType("market order");
                setAddOpenPrice("");
                setAddTp("");
                setAddSl("");
                setAddLots("1");
                setAddOpenTime("");
                setAddTradeOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20"
            >
              <Plus className="h-4 w-4" />
              Add Trade
            </button>
            <button
              type="button"
              aria-label="Open trade filters"
              title="Trade filters"
              onClick={() => setFilterOpen(true)}
              className={
                filtersActive(tradeFilters)
                  ? "flex h-10 w-10 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar ring-2 ring-primary/50"
                  : "flex h-10 w-10 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar"
              }
            >
              <Filter className="h-4 w-4 text-primary" />
            </button>
          </header>

          <TradeFiltersDrawer
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
            symbolOptions={symbolOptions}
            applied={tradeFilters}
            onApply={persistTradeFilters}
          />

          <ConfirmDeleteDialog
            open={tradePendingDelete != null}
            onOpenChange={(open) => !open && setTradePendingDelete(null)}
            title="Delete this trade?"
            description="The trade and its journal data will be removed permanently."
            details={tradePendingDelete ? formatTradeDeleteDetails(tradePendingDelete) : undefined}
            onConfirm={async () => {
              const trade = tradePendingDelete;
              if (!trade) return;
              setDeletingId(trade.id);
              try {
                await tradesApi.delete(trade.id);
                const remainingOnPage = trades.filter((t) => t.id !== trade.id).length;
                setTrades((prev) => (Array.isArray(prev) ? prev : []).filter((t) => t.id !== trade.id));
                setTotal((t) => Math.max(0, t - 1));
                if (remainingOnPage === 0 && page > 1) {
                  setPage((p) => Math.max(1, p - 1));
                }
                if (selectedTrade?.id === trade.id) {
                  setPanelOpen(false);
                  setSelectedTrade(null);
                }
                setTradePendingDelete(null);
              } catch (e) {
                window.alert(e instanceof Error ? e.message : "Could not delete trade. Try again.");
              } finally {
                setDeletingId(null);
              }
            }}
          />

          <div className="rounded-xl border border-sidebar-border bg-sidebar flex flex-col min-h-0">
            <div className="isolate overflow-auto max-h-[min(70vh,calc(100dvh-13rem))] scrollbar-hide">
              <table className="min-w-[1500px] w-full border-collapse">
                <thead>
                  <tr className="border-b border-sidebar-border">
                    <th
                      style={{ left: 0, width: TRADE_STICKY.date, minWidth: TRADE_STICKY.date }}
                      className="sticky top-0 z-[45] min-w-[168px] max-w-[168px] bg-sidebar px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted shadow-[4px_0_8px_-4px_rgba(0,0,0,0.18)]"
                    >
                      Date &amp; Time
                    </th>
                    <th
                      style={{ left: TRADE_LEFT.actions, width: TRADE_STICKY.actions, minWidth: TRADE_STICKY.actions }}
                      className="sticky top-0 z-[45] bg-sidebar px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-header-muted shadow-[4px_0_8px_-4px_rgba(0,0,0,0.18)]"
                    >
                      <span className="sr-only">Open / delete</span>
                    </th>
                    <th
                      style={{ left: TRADE_LEFT.pair, width: TRADE_STICKY.pair, minWidth: TRADE_STICKY.pair }}
                      className="sticky top-0 z-[45] min-w-[150px] bg-sidebar px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted shadow-[4px_0_8px_-4px_rgba(0,0,0,0.18)]"
                    >
                      Pair
                    </th>
                    <th
                      style={{ left: TRADE_LEFT.type, width: TRADE_STICKY.type, minWidth: TRADE_STICKY.type }}
                      className="sticky top-0 z-[45] min-w-[110px] bg-sidebar px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted shadow-[4px_0_8px_-4px_rgba(0,0,0,0.18)]"
                    >
                      Type
                    </th>
                    <th className="sticky top-0 z-[30] min-w-[130px] bg-sidebar px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted">
                      Entry Price
                    </th>
                    <th className="sticky top-0 z-[30] min-w-[120px] bg-sidebar px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted">
                      TP Price
                    </th>
                    <th className="sticky top-0 z-[30] min-w-[120px] bg-sidebar px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted">
                      SL Price
                    </th>
                    <th className="sticky top-0 z-[30] min-w-[130px] bg-sidebar px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted">
                      Close Price
                    </th>
                    <th className="sticky top-0 z-[30] min-w-[120px] bg-sidebar px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted">
                      R Targeted
                    </th>
                    <th className="sticky top-0 z-[30] min-w-[120px] bg-sidebar px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted">
                      R Earned
                    </th>
                    <th className="sticky top-0 z-[30] min-w-[130px] bg-sidebar px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && rows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-5 py-10 text-center text-sm text-header-muted">
                        Loading trades...
                      </td>
                    </tr>
                  ) : (
                    rows.map((trade) => {
                      const closePrice = getLatestClosePrice(trade);
                      return (
                        <tr key={trade.id} className="group border-b border-sidebar-border/70 hover:bg-sidebar-hover">
                          <Cell
                            style={{ left: 0, width: TRADE_STICKY.date, minWidth: TRADE_STICKY.date }}
                            className="sticky z-[25] max-w-[168px] bg-sidebar shadow-[4px_0_8px_-4px_rgba(0,0,0,0.18)] whitespace-nowrap text-xs text-header-muted group-hover:bg-sidebar-hover"
                          >
                            {formatCreatedAt(trade.createdAt)}
                          </Cell>
                          <Cell
                            style={{ left: TRADE_LEFT.actions, width: TRADE_STICKY.actions, minWidth: TRADE_STICKY.actions }}
                            className="sticky z-[25] bg-sidebar px-2 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.18)] group-hover:bg-sidebar-hover"
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTrade(trade);
                                  setPanelOpen(true);
                                  setPanelTab("metrics");
                                }}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/50 bg-primary/15 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
                                aria-label={`Open trade journal for ${trade.pair}`}
                              >
                                ↗
                              </button>
                              {isPersistedTradeId(trade.id) && (
                                <button
                                  type="button"
                                  disabled={deletingId === trade.id}
                                  onClick={() => setTradePendingDelete(trade)}
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-rose-500/55 bg-rose-500/15 text-rose-400 transition-colors hover:bg-rose-500/25 disabled:opacity-50"
                                  aria-label={`Delete trade ${trade.pair}`}
                                  title="Delete trade"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </Cell>
                          <Cell
                            style={{ left: TRADE_LEFT.pair, width: TRADE_STICKY.pair, minWidth: TRADE_STICKY.pair }}
                            className="sticky z-[25] bg-sidebar font-medium shadow-[4px_0_8px_-4px_rgba(0,0,0,0.18)] group-hover:bg-sidebar-hover"
                          >
                            {trade.pair}
                          </Cell>
                          <Cell
                            style={{ left: TRADE_LEFT.type, width: TRADE_STICKY.type, minWidth: TRADE_STICKY.type }}
                            className="sticky z-[25] bg-sidebar uppercase shadow-[4px_0_8px_-4px_rgba(0,0,0,0.18)] group-hover:bg-sidebar-hover"
                          >
                            {trade.type}
                          </Cell>
                          <Cell className="relative z-0 bg-sidebar group-hover:bg-sidebar-hover">{trade.executionPrice}</Cell>
                          <Cell className="relative z-0 bg-sidebar group-hover:bg-sidebar-hover">{trade.tpPrice}</Cell>
                          <Cell className="relative z-0 bg-sidebar group-hover:bg-sidebar-hover">{getActualSl(trade)}</Cell>
                          <Cell className="relative z-0 bg-sidebar group-hover:bg-sidebar-hover">{closePrice ?? "-"}</Cell>
                          <Cell className="relative z-0 bg-sidebar group-hover:bg-sidebar-hover">
                            {formatTargetedR(trade.profitFactorTargeted)}
                          </Cell>
                          <Cell
                            className={`relative z-0 bg-sidebar group-hover:bg-sidebar-hover ${
                              trade.profitFactorEarned.totalEarned >= 0 ? "text-primary" : "text-rose-400"
                            }`}
                          >
                            {trade.profitFactorEarned.totalEarned.toFixed(2)}
                          </Cell>
                          <Cell className="relative z-0 bg-sidebar group-hover:bg-sidebar-hover">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md border border-sidebar-border bg-header px-2 py-1 text-xs capitalize">
                                {trade.status}
                              </span>
                              {trade.status === "pending" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const updated = await tradesApi.update(trade.id, { status: "cancelled" });
                                      setTrades((prev) => (Array.isArray(prev) ? prev : []).map((t) => (t.id === updated.id ? updated : t)));
                                      if (selectedTrade?.id === trade.id) setSelectedTrade(updated);
                                    }}
                                    className="rounded border border-rose-500/50 px-2 py-0.5 text-[11px] text-rose-400 hover:bg-rose-500/10"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExecuteTarget(trade);
                                      setExecuteTime(new Date().toISOString().slice(0, 16));
                                      setExecuteModalOpen(true);
                                    }}
                                    className="rounded border border-primary/50 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/10"
                                  >
                                    Execute
                                  </button>
                                </>
                              )}
                            </div>
                          </Cell>
                        </tr>
                      );
                    })
                  )}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-5 py-10 text-center text-sm text-header-muted">
                        No trades match the current filters and date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sidebar-border px-4 py-3">
              <p className="text-xs text-header-muted">
                {total === 0
                  ? "0 trades"
                  : `Showing ${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + rows.length} of ${total}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-sidebar-border px-3 py-1.5 text-xs font-medium text-header-foreground hover:bg-header disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-header-muted">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-sidebar-border px-3 py-1.5 text-xs font-medium text-header-foreground hover:bg-header disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {panelOpen && (
          <button
            type="button"
            aria-label="Close trade details"
            className="fixed inset-0 z-[55] bg-black/40"
            onClick={() => setPanelOpen(false)}
          />
        )}
        {/* Right-side detail panel */}
        <div
          className={`fixed inset-y-0 right-0 z-[60] w-full md:w-2/3 border-l border-sidebar-border bg-dashboard-bg shadow-2xl transition-transform duration-300 ease-out ${
            panelOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {selectedTrade && (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-4">
                <div className="min-w-0 flex-1 pr-3">
                  <div className="border-l-2 border-primary pl-3">
                    <p className="truncate text-2xl font-semibold text-header-foreground">
                      {selectedTrade.pair}{" "}
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-xs uppercase text-primary">
                        {selectedTrade.type}
                      </span>
                    </p>
                    <p className="truncate text-sm text-header-muted">
                      {selectedTrade.executionPrice} {"->"} {getLatestClosePrice(selectedTrade) ?? "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPanelOpen(false)}
                    aria-label="Close trade journal"
                    className="rounded-md p-1 text-header-muted hover:bg-header hover:text-header-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="border-b border-sidebar-border px-5 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-6">
                  <button
                    type="button"
                    onClick={() => setPanelTab("metrics")}
                    className={`rounded px-2 py-1 transition-colors ${
                      panelTab === "metrics" ? "bg-primary/10 text-primary" : "text-header-foreground hover:text-primary"
                    }`}
                  >
                    Trade Metrics
                  </button>
                  <button
                    type="button"
                    disabled={selectedIsCancelled}
                    onClick={() => setPanelTab("management")}
                    className={`rounded px-2 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      panelTab === "management" ? "bg-primary/10 text-primary" : "text-header-foreground hover:text-primary"
                    }`}
                  >
                    Trade Management
                  </button>
                  <button
                    type="button"
                    disabled={selectedIsCancelled}
                    onClick={() => setPanelTab("notes")}
                    className={`rounded px-2 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      panelTab === "notes" ? "bg-primary/10 text-primary" : "text-header-foreground hover:text-primary"
                    }`}
                  >
                    Notes
                  </button>
                  <button
                    type="button"
                    disabled={selectedIsCancelled}
                    onClick={() => setPanelTab("pairWatched")}
                    className={`rounded px-2 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      panelTab === "pairWatched" ? "bg-primary/10 text-primary" : "text-header-foreground hover:text-primary"
                    }`}
                  >
                    Pair Watched
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {panelTab === "metrics" && (
                  <>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-header-muted">Order Type</p>
                        <p className="mt-1 text-header-foreground capitalize">{selectedTrade.executionType}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-header-muted">Symbol</p>
                        <p className="mt-1 text-header-foreground">{selectedTrade.pair}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-header-muted">Lots</p>
                        <p className="mt-1 text-header-foreground">{selectedTrade.positionSize}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-header-muted">Open Time</p>
                        <p className="mt-1 text-header-foreground">{formatDateTime(selectedTrade.executionTime)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-header-muted">Close Time</p>
                        <p className="mt-1 text-header-foreground">{formatDateTime(selectedTrade.tradeCloseTime)}</p>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-sidebar-border pt-5">
                      <p className="mb-4 text-xs uppercase tracking-wide text-header-muted">Price Summary</p>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <p className="text-xs text-header-muted">Open Price</p>
                          <p className="mt-1 text-header-foreground">{selectedTrade.executionPrice}</p>
                        </div>
                        <div>
                          <p className="text-xs text-header-muted">Close Price</p>
                          <p className="mt-1 text-header-foreground">{getLatestClosePrice(selectedTrade) ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-header-muted">TP Price</p>
                          <p className="mt-1 text-header-foreground">{selectedTrade.tpPrice}</p>
                        </div>
                        <div>
                          <p className="text-xs text-header-muted">Initial SL</p>
                          <p className="mt-1 text-header-foreground">{selectedTrade.initialSlPrice}</p>
                        </div>
                        <div>
                          <p className="text-xs text-header-muted">Actual SL</p>
                          <p className="mt-1 text-header-foreground">{selectedTradeActualSl}</p>
                        </div>
                      </div>
                    </div>

                    {selectedTrade.status === "pending" && (
                      <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
                        <p className="text-sm font-medium text-header-foreground">Pending trade</p>
                        <p className="mt-1 text-xs text-header-muted">Execute with an open time, or cancel. Management and pair linking unlock after execution.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const updated = await tradesApi.update(selectedTrade.id, { status: "cancelled" });
                              updateSelectedTrade(updated);
                            }}
                            className="rounded-lg border border-rose-500/50 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10"
                          >
                            Cancel trade
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setExecuteTarget(selectedTrade);
                              setExecuteTime(new Date().toISOString().slice(0, 16));
                              setExecuteModalOpen(true);
                            }}
                            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                          >
                            Execute…
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 border-t border-sidebar-border pt-5">
                      <p className="mb-4 text-xs uppercase tracking-wide text-header-muted">Trade Results</p>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-header-muted">R Targeted</p>
                          <p className="mt-1 text-header-foreground">{formatTargetedR(selectedTrade.profitFactorTargeted)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-header-muted">R Earned</p>
                          <p className={`mt-1 ${selectedTrade.profitFactorEarned.totalEarned >= 0 ? "text-primary" : "text-rose-400"}`}>
                            {selectedTrade.profitFactorEarned.totalEarned.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-header-muted">Status</p>
                          <p className="mt-1 text-header-foreground capitalize">{selectedTrade.status}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {panelTab === "management" && (
                  <div className="space-y-6">
                    {!canManageTrade && (
                      <p className="text-xs text-header-muted">
                        This trade is view-only here (fully closed, cancelled, or no open lots). SL history and closes are shown below.
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-sidebar-border bg-sidebar/30 p-3">
                        <p className="text-xs text-header-muted">Current SL</p>
                        <p className="mt-1 text-header-foreground">{selectedTradeActualSl}</p>
                      </div>
                      <div className="rounded-lg border border-sidebar-border bg-sidebar/30 p-3">
                        <p className="text-xs text-header-muted">Current TP</p>
                        <p className="mt-1 text-header-foreground">{selectedTrade.tpPrice}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-sidebar-border bg-sidebar/40 p-4">
                      <p className="text-sm font-medium text-header-foreground">Update SL</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          value={newSlPrice}
                          onChange={(e) => setNewSlPrice(e.target.value)}
                          placeholder="New SL price"
                          className="h-10 min-w-[180px] rounded-lg border border-sidebar-border bg-header-input px-3 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="button"
                          disabled={!canManageTrade}
                          onClick={handleAppendSlUpdate}
                          className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Update SL
                        </button>
                      </div>
                      <div className="mt-4 space-y-1.5">
                        {selectedTrade.slEvolution.length === 0 ? (
                          <p className="text-xs text-header-muted">No SL update yet.</p>
                        ) : (
                          selectedTrade.slEvolution.map((entry, idx) => {
                            const value = Object.values(entry)[0];
                            return (
                              <p key={`sl-evo-${idx}`} className="text-sm text-dashboard-foreground">
                                Update {idx + 1}: <span className="text-primary">{value}</span>
                              </p>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-sidebar-border bg-sidebar/40 p-4">
                      <p className="text-sm font-medium text-header-foreground">Add Close Price</p>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <select
                          value={closeType}
                          onChange={(e) => setCloseType(e.target.value as TradeCloseType)}
                          className="h-10 rounded-lg border border-sidebar-border bg-header-input px-3 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="partClose">partClose</option>
                          <option value="fullClose">fullClose</option>
                        </select>
                        <input
                          type="datetime-local"
                          value={closeTimeInput}
                          onChange={(e) => setCloseTimeInput(e.target.value)}
                          className="h-10 rounded-lg border border-sidebar-border bg-header-input px-3 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="number"
                          value={closePriceInput}
                          onChange={(e) => setClosePriceInput(e.target.value)}
                          placeholder="Close price"
                          className="h-10 rounded-lg border border-sidebar-border bg-header-input px-3 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="number"
                          value={closeLotsInput}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCloseLotsInput(v);
                            if (!selectedTrade) return;
                            const lots = Number(v);
                            if (Number.isFinite(lots) && selectedTrade.positionSize > 0) {
                              setClosePercentInput(((lots / selectedTrade.positionSize) * 100).toFixed(4));
                            } else {
                              setClosePercentInput("");
                            }
                          }}
                          disabled={closeType === "fullClose"}
                          placeholder={closeType === "fullClose" ? "Auto (remaining lots)" : "Lots closed"}
                          className="h-10 rounded-lg border border-sidebar-border bg-header-input px-3 text-sm text-dashboard-foreground disabled:opacity-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="number"
                          value={closePercentInput}
                          onChange={(e) => {
                            const v = e.target.value;
                            setClosePercentInput(v);
                            if (!selectedTrade) return;
                            const pct = Number(v);
                            if (Number.isFinite(pct) && selectedTrade.positionSize > 0) {
                              setCloseLotsInput(((pct / 100) * selectedTrade.positionSize).toFixed(4));
                            } else {
                              setCloseLotsInput("");
                            }
                          }}
                          disabled={closeType === "fullClose"}
                          placeholder={closeType === "fullClose" ? "Auto (remaining %)" : "Percentage closed"}
                          className="h-10 rounded-lg border border-sidebar-border bg-header-input px-3 text-sm text-dashboard-foreground disabled:opacity-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="button"
                          disabled={!canManageTrade}
                          onClick={handleAddClosePrice}
                          className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Add Close Price
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-header-muted">
                        Remaining lots: {selectedTradeRemainingLots.toFixed(4)}
                      </p>
                      <div className="mt-4 space-y-1.5">
                        {selectedTrade.closePrices.length === 0 ? (
                          <p className="text-xs text-header-muted">No close price added yet.</p>
                        ) : (
                          selectedTrade.closePrices.map((cp, idx) => {
                            const earnedR = selectedTrade.profitFactorEarned?.earnings?.[idx]?.earnedR;
                            return (
                              <p key={`close-${idx}`} className="text-sm text-dashboard-foreground">
                                Close {idx + 1}:{" "}
                                <span className="text-primary">{cp.price}</span>{" "}
                                ({cp.type}, {cp.lots.toFixed(4)} lots, {cp.percentage.toFixed(2)}%)
                                {typeof earnedR === "number" && (
                                  <>
                                    {" "}• Earned R:{" "}
                                    <span className={earnedR >= 0 ? "text-primary" : "text-rose-400"}>
                                      {earnedR.toFixed(2)}
                                    </span>
                                  </>
                                )}
                              </p>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {panelTab === "notes" && (
                  <div className="flex h-full min-h-0 flex-col">
                    {!canAddTradeNote && (
                      <p className="mb-3 text-xs text-header-muted">Notes are view-only on cancelled trades.</p>
                    )}
                    {canAddTradeNote && !canEditExistingTradeNote && (
                      <p className="mb-3 text-xs text-header-muted">
                        This trade is closed: you can add a final note below. Earlier notes are read-only.
                      </p>
                    )}
                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                      {selectedTradeNotes.map((note, idx) => (
                        <article
                          key={`${selectedTrade.id}-note-${idx}`}
                          className="mb-4 rounded-xl border border-sidebar-border border-l-4 border-l-blue-500 bg-sidebar/50 p-4"
                        >
                          {noteEditIdx === idx && canEditExistingTradeNote ? (
                            <div className="space-y-3">
                              <textarea
                                value={noteEditText}
                                onChange={(e) => setNoteEditText(e.target.value)}
                                onPaste={handleNoteEditPaste}
                                className="min-h-[95px] w-full resize-y rounded-lg border border-sidebar-border bg-header-input px-3 py-2.5 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                              {noteEditImages.map((img, imgIdx) => (
                                <div
                                  key={img}
                                  className="overflow-hidden rounded-lg border border-sidebar-border bg-sidebar/50"
                                >
                                  <input
                                    type="text"
                                    value={noteEditNames[imgIdx] ?? ""}
                                    onChange={(e) =>
                                      setNoteEditNames((prev) => {
                                        const next = [...prev];
                                        next[imgIdx] = e.target.value;
                                        return next;
                                      })
                                    }
                                    placeholder={`Image ${imgIdx + 1} title`}
                                    className="w-full border-b border-sidebar-border bg-sidebar/80 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-dashboard-foreground placeholder:text-dashboard-foreground/50"
                                  />
                                  <img
                                    src={getImageUrl(img)}
                                    alt=""
                                    className="max-h-[220px] w-full object-contain"
                                  />
                                </div>
                              ))}
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!selectedTrade) return;
                                    const nextNotes: TradeNote[] = selectedTrade.trackNotes.map((n, i) =>
                                      i === idx
                                        ? {
                                            ...n,
                                            text: noteEditText.trim(),
                                            images: noteEditImages,
                                            imageNames: noteEditImages.map((_, j) => (noteEditNames[j] ?? "").trim()),
                                          }
                                        : n,
                                    );
                                    const updated = await tradesApi.update(selectedTrade.id, { trackNotes: nextNotes });
                                    updateSelectedTrade(updated);
                                  }}
                                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                  Save note
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditNote}
                                  className="rounded-lg border border-sidebar-border px-4 py-2 text-sm text-header-foreground hover:bg-header"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="mb-3 whitespace-pre-wrap break-words text-sm text-dashboard-foreground">
                                {note.text}
                              </p>
                              {note.images?.length > 0 && (
                                <div className="grid grid-cols-1 gap-3">
                                  {note.images.map((img, imgIdx) => (
                                    <div key={img} className="space-y-1">
                                      {(note.imageNames?.[imgIdx] ?? "").trim() !== "" && (
                                        <p className="text-xs font-semibold uppercase tracking-wider text-header-muted">
                                          {note.imageNames![imgIdx]}
                                        </p>
                                      )}
                                      <img
                                        src={getImageUrl(img)}
                                        alt=""
                                        className="max-h-[280px] w-full rounded-lg border border-sidebar-border object-contain"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                              {canEditExistingTradeNote && (
                                <button
                                  type="button"
                                  onClick={() => beginEditNote(idx)}
                                  className="mt-3 rounded-lg border border-sidebar-border px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                                >
                                  Edit note
                                </button>
                              )}
                            </>
                          )}
                        </article>
                      ))}
                    </div>

                    {canAddTradeNote && (
                      <div className="shrink-0 border-t border-sidebar-border/60 pt-3">
                        <textarea
                          ref={noteEditorRef}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          onPaste={handleNotePaste}
                          placeholder="Post note..."
                          className="min-h-[95px] w-full resize-y rounded-lg border border-sidebar-border bg-header-input px-3 py-2.5 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-header-muted">Paste images directly in the note editor.</p>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!selectedTrade) return;
                              if (!noteDraft.trim() && noteImages.length === 0) return;
                              const imageNames = noteImages.map((_, i) => (noteNewCaptions[i] ?? "").trim());
                              const nextNotes: TradeNote[] = [
                                ...(selectedTrade.trackNotes ?? []),
                                { text: noteDraft.trim(), images: noteImages, imageNames },
                              ];
                              const updated = await tradesApi.update(selectedTrade.id, { trackNotes: nextNotes });
                              updateSelectedTrade(updated);
                              setNoteDraft("");
                              setNoteImages([]);
                              setNoteNewCaptions([]);
                            }}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                          >
                            Create
                          </button>
                        </div>
                        {noteImages.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {noteImages.map((img, imgIdx) => (
                              <div key={img} className="flex flex-col gap-1 rounded-lg border border-sidebar-border bg-sidebar/40 p-2">
                                <input
                                  type="text"
                                  value={noteNewCaptions[imgIdx] ?? ""}
                                  onChange={(e) =>
                                    setNoteNewCaptions((prev) => {
                                      const next = [...prev];
                                      next[imgIdx] = e.target.value;
                                      return next;
                                    })
                                  }
                                  placeholder={`Image ${imgIdx + 1} title`}
                                  className="w-full rounded border border-sidebar-border bg-header-input px-2 py-1 text-xs text-dashboard-foreground"
                                />
                                <img
                                  src={getImageUrl(img)}
                                  alt=""
                                  className="h-20 w-32 rounded border border-sidebar-border object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {panelTab === "pairWatched" && (
                  <div className="space-y-4">
                    {pairWatchReadOnly && (
                      <p className="text-xs text-header-muted">Read-only: linking is disabled for closed or cancelled trades.</p>
                    )}
                    <div className="flex items-center justify-between rounded-xl border border-sidebar-border bg-sidebar/40 p-4">
                      <div>
                        <p className="text-sm font-medium text-header-foreground">Linked Pair</p>
                        <p className="text-sm text-header-muted">
                          {selectedTrade.pairWatched?.tradingPair?.pair ??
                            selectedTrade.pairWatched?.pairName ??
                            "No pair linked"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedTrade.pairWatched && !pairWatchReadOnly && (
                          <button
                            type="button"
                            onClick={async () => {
                              const updated = await tradesApi.update(selectedTrade.id, { pairWatchedId: null });
                              updateSelectedTrade(updated);
                            }}
                            className="rounded-lg border border-sidebar-border px-3 py-2 text-sm font-medium text-header-foreground hover:bg-header"
                          >
                            Unlink
                          </button>
                        )}
                        {!pairWatchReadOnly && (
                          <button
                            type="button"
                            onClick={async () => {
                              await loadCurrentWeekPairs();
                              setLinkModalOpen(true);
                            }}
                            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                          >
                            Link
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedTrade.pairWatched ? (
                      <div className="rounded-xl border border-sidebar-border bg-sidebar/30 p-4">
                        <p className="text-base font-semibold text-header-foreground">
                          {selectedTrade.pairWatched.tradingPair?.pair ??
                            selectedTrade.pairWatched.pairName}
                        </p>
                        <p className="mt-2 text-sm text-header-muted">{selectedTrade.pairWatched.bias}</p>
                        {selectedTrade.pairWatched.thesis?.notes && (
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm text-dashboard-foreground">
                            {selectedTrade.pairWatched.thesis.notes}
                          </p>
                        )}
                        {!!selectedTrade.pairWatched.thesis?.images?.length && (
                          <div className="mt-3 grid grid-cols-1 gap-3">
                            {selectedTrade.pairWatched.thesis.images.map((img) => (
                              <img
                                key={img}
                                src={getImageUrl(img)}
                                alt="Pair watched"
                                className="max-h-[280px] w-full rounded-lg border border-sidebar-border object-contain"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-header-muted">
                        Click <span className="text-primary">Link</span> to attach a pair from the current weekly watchlist.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {linkModalOpen && selectedTrade && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-xl rounded-xl border border-sidebar-border bg-sidebar p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-header-foreground">Link Pair Watched</h3>
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="rounded p-1 text-header-muted hover:bg-header"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {selectedTrade.pairWatched && (
                <div className="mb-3 flex items-center justify-between rounded-lg border border-sidebar-border bg-header/40 px-3 py-2">
                  <span className="text-sm text-header-foreground">
                    Linked:{" "}
                    {selectedTrade.pairWatched.tradingPair?.pair ??
                      selectedTrade.pairWatched.pairName}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const updated = await tradesApi.update(selectedTrade.id, { pairWatchedId: null });
                      updateSelectedTrade(updated);
                      setLinkModalOpen(false);
                    }}
                    className="text-sm text-rose-400 hover:underline"
                  >
                    Unlink
                  </button>
                </div>
              )}
              <p className="mb-3 text-sm text-header-muted">
                Current weekly watchlists: {currentWeeklyWatchlists.length}
              </p>
              <div className="max-h-[320px] space-y-2 overflow-y-auto">
                {linkLoading ? (
                  <p className="text-sm text-header-muted">Loading pairs...</p>
                ) : currentWeekPairs.length === 0 ? (
                  <p className="text-sm text-header-muted">No pairs found for the current weekly watchlist dates.</p>
                ) : (
                  currentWeekPairs.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={async () => {
                        const updated = await tradesApi.update(selectedTrade.id, { pairWatchedId: item.id });
                        updateSelectedTrade(updated);
                        setLinkModalOpen(false);
                      }}
                      className="w-full rounded-lg border border-sidebar-border bg-header px-3 py-2 text-left hover:border-primary/60"
                    >
                      <p className="text-sm font-medium text-header-foreground">
                        {item.tradingPair?.pair ?? item.pairName}
                      </p>
                      <p className="text-xs text-header-muted">{item.bias}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {addTradeOpen && (
          <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 px-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-sidebar-border bg-sidebar p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-header-foreground">Add trade</h3>
                <button type="button" onClick={() => setAddTradeOpen(false)} className="rounded p-1 text-header-muted hover:bg-header">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <label className="block space-y-1">
                  <span className="text-header-muted">Trading pair</span>
                  <select
                    value={addPairId}
                    onChange={(e) => setAddPairId(e.target.value)}
                    className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-dashboard-foreground"
                  >
                    {tradableCatalogPairs.length === 0 ? (
                      <option value="">No pairs with pip value</option>
                    ) : (
                      tradableCatalogPairs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.pair}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                {tradableCatalogPairs.length === 0 && (
                  <p className="text-xs text-header-muted">
                    Configure pip values on the Pairs page before creating trades.
                  </p>
                )}
                <label className="block space-y-1">
                  <span className="text-header-muted">Strategy</span>
                  <select
                    value={addStrategyId}
                    onChange={(e) => setAddStrategyId(e.target.value)}
                    className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-dashboard-foreground"
                  >
                    {strategies.length === 0 ? (
                      <option value="">No strategies yet</option>
                    ) : (
                      strategies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                {strategies.length === 0 && (
                  <p className="text-xs text-header-muted">
                    Create a strategy on the Strategies page before creating trades.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-header-muted">Direction</span>
                    <select
                      value={addType}
                      onChange={(e) => setAddType(e.target.value as Trade["type"])}
                      className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-dashboard-foreground"
                    >
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-header-muted">Order type</span>
                    <select
                      value={addExecType}
                      onChange={(e) => setAddExecType(e.target.value as TradeExecutionType)}
                      className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-dashboard-foreground"
                    >
                      {EXECUTION_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block space-y-1">
                  <span className="text-header-muted">Position size (lots)</span>
                  <input
                    type="number"
                    value={addLots}
                    onChange={(e) => setAddLots(e.target.value)}
                    className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-dashboard-foreground"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-header-muted">Open price</span>
                  <input
                    type="number"
                    step="any"
                    value={addOpenPrice}
                    onChange={(e) => setAddOpenPrice(e.target.value)}
                    className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-dashboard-foreground"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-header-muted">Take profit</span>
                  <input
                    type="number"
                    step="any"
                    value={addTp}
                    onChange={(e) => setAddTp(e.target.value)}
                    className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-dashboard-foreground"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-header-muted">Initial SL</span>
                  <input
                    type="number"
                    step="any"
                    value={addSl}
                    onChange={(e) => setAddSl(e.target.value)}
                    className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-dashboard-foreground"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-header-muted">Open time (optional — leave empty for pending)</span>
                  <input
                    type="datetime-local"
                    value={addOpenTime}
                    onChange={(e) => setAddOpenTime(e.target.value)}
                    className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-dashboard-foreground"
                  />
                </label>
                <p className="text-xs text-header-muted">
                  R targeted (preview, same as saved value):{" "}
                  {(() => {
                    const entry = Number(addOpenPrice);
                    const tp = Number(addTp);
                    const sl = Number(addSl);
                    if (!Number.isFinite(entry) || !Number.isFinite(tp) || !Number.isFinite(sl)) return "—";
                    return computeTargetedR(addType, entry, tp, sl).toFixed(4);
                  })()}
                </p>
                <p className="text-[11px] leading-relaxed text-header-muted">
                  Formula: buy → |TP − entry| ÷ |entry − SL|; sell → |entry − TP| ÷ |SL − entry|. Example buy
                  1.15190 / TP 1.15445 / SL 1.15078 → (0.00255 ÷ 0.00112) ≈ 2.28 R (standard reward-to-risk in
                  price).
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    const entry = Number(addOpenPrice);
                    const tp = Number(addTp);
                    const sl = Number(addSl);
                    const lots = Number(addLots);
                    if (
                      !addPairId ||
                      !addSelectedPair ||
                      !addStrategyId ||
                      !Number.isFinite(entry) ||
                      !Number.isFinite(tp) ||
                      !Number.isFinite(sl) ||
                      !Number.isFinite(lots) ||
                      lots <= 0
                    ) {
                      return;
                    }
                    setAddSaving(true);
                    try {
                      const created = await tradesApi.create({
                        pairId: addPairId,
                        strategyId: addStrategyId,
                        type: addType,
                        executionType: addExecType,
                        executionPrice: entry,
                        tpPrice: tp,
                        initialSlPrice: sl,
                        positionSize: lots,
                        ...(addOpenTime.trim()
                          ? { executionTime: new Date(addOpenTime).toISOString() }
                          : {}),
                      });
                      setTrades((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
                      setAddTradeOpen(false);
                    } finally {
                      setAddSaving(false);
                    }
                  }}
                  className="mt-2 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  disabled={
                    addSaving ||
                    !addPairId ||
                    !addStrategyId ||
                    tradableCatalogPairs.length === 0 ||
                    strategies.length === 0
                  }
                >
                  {addSaving ? "Saving…" : "Create trade"}
                </button>
              </div>
            </div>
          </div>
        )}

        {executeModalOpen && executeTarget && (
          <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-md rounded-xl border border-sidebar-border bg-sidebar p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-header-foreground">Execute trade</h3>
                <button
                  type="button"
                  onClick={() => setExecuteModalOpen(false)}
                  className="rounded p-1 text-header-muted hover:bg-header"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-2 text-sm text-header-muted">{executeTarget.pair}</p>
              <label className="block space-y-1 text-sm">
                <span className="text-header-muted">Execution time</span>
                <input
                  type="datetime-local"
                  value={executeTime}
                  onChange={(e) => setExecuteTime(e.target.value)}
                  className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-dashboard-foreground"
                />
              </label>
              <button
                type="button"
                onClick={async () => {
                  if (!executeTime.trim()) return;
                  const updated = await tradesApi.update(executeTarget.id, {
                    executionTime: new Date(executeTime).toISOString(),
                    status: "executed",
                  });
                  setTrades((prev) => (Array.isArray(prev) ? prev : []).map((t) => (t.id === updated.id ? updated : t)));
                  if (selectedTrade?.id === updated.id) updateSelectedTrade(updated);
                  setExecuteModalOpen(false);
                  setExecuteTarget(null);
                }}
                className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Confirm execution
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
