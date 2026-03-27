"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Filter, X } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { tradesApi, watchItemsService, weeklyWatchlistService } from "@/lib/api";
import { uploadImageBlob } from "@/lib/imageUpload";
import { getImageUrl } from "@/lib/imageUrls";
import type { Trade, TradeCloseType, TradeNote, TradeSlEvolutionEntry, WatchItem, WeeklyWatchlist } from "@/types/api";

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

function Cell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-5 py-4 text-sm text-dashboard-foreground ${className}`}>{children}</td>;
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
  if (!value) return "-";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
  const noteEditorRef = useRef<HTMLTextAreaElement>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [currentWeeklyWatchlists, setCurrentWeeklyWatchlists] = useState<WeeklyWatchlist[]>([]);
  const [currentWeekPairs, setCurrentWeekPairs] = useState<WatchItem[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [newSlPrice, setNewSlPrice] = useState("");
  const [closeType, setCloseType] = useState<TradeCloseType>("partClose");
  const [closePriceInput, setClosePriceInput] = useState("");
  const [closeTimeInput, setCloseTimeInput] = useState(new Date().toISOString().slice(0, 16));
  const [closeLotsInput, setCloseLotsInput] = useState("");
  const [closePercentInput, setClosePercentInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    tradesApi
      .getAll()
      .then((rows) => {
        if (!cancelled) setTrades(rows);
      })
      .catch(() => {
        if (!cancelled) setTrades(FALLBACK_TRADES);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => (trades.length > 0 ? trades : FALLBACK_TRADES), [trades]);

  const selectedTradeNotes = selectedTrade?.trackNotes ?? [];
  const selectedTradeActualSl = selectedTrade ? getActualSl(selectedTrade) : null;
  const selectedTradeRemainingLots = selectedTrade
    ? Math.max(0, selectedTrade.positionSize - getTotalClosedLots(selectedTrade))
    : 0;
  const canManageTrade =
    !!selectedTrade &&
    selectedTradeRemainingLots > 0.000001 &&
    selectedTrade.status !== "fullyClosed";

  const updateSelectedTrade = (updated: Trade) => {
    setTrades((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTrade(updated);
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
            <div className="flex h-10 items-center gap-2 rounded-xl border border-sidebar-border bg-sidebar px-3 text-sm">
              <Calendar className="h-4 w-4 text-header-muted" />
              <span className="text-header-foreground">Feb 26, 2026 - Today</span>
            </div>
            <button
              type="button"
              aria-label="Filter trades"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar"
            >
              <Filter className="h-4 w-4 text-primary" />
            </button>
          </header>

          <div className="rounded-xl border border-sidebar-border bg-sidebar">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="min-w-[1300px] w-full border-collapse">
                <thead>
                  <tr className="border-b border-sidebar-border bg-header/50">
                    <th className="w-14 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted" />
                    <th className="min-w-[150px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted">Pair</th>
                    <th className="min-w-[110px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted">Type</th>
                    <th className="min-w-[130px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted">Entry Price</th>
                    <th className="min-w-[120px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted">TP Price</th>
                    <th className="min-w-[120px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted">SL Price</th>
                    <th className="min-w-[130px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted">Close Price</th>
                    <th className="min-w-[120px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted">R Targeted</th>
                    <th className="min-w-[120px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted">R Earned</th>
                    <th className="min-w-[130px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-header-muted">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-5 py-10 text-center text-sm text-header-muted">
                        Loading trades...
                      </td>
                    </tr>
                  ) : (
                    rows.map((trade) => {
                      const closePrice = getLatestClosePrice(trade);
                      return (
                        <tr key={trade.id} className="border-b border-sidebar-border/70 hover:bg-header/40">
                          <Cell className="w-14 px-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTrade(trade);
                                setPanelOpen(true);
                                setPanelTab("metrics");
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-[11px] text-primary transition-colors hover:bg-primary/20"
                              aria-label={`Open trade journal for ${trade.pair}`}
                            >
                              ↗
                            </button>
                          </Cell>
                          <Cell className="font-medium">{trade.pair}</Cell>
                          <Cell className="uppercase">{trade.type}</Cell>
                          <Cell>{trade.executionPrice}</Cell>
                          <Cell>{trade.tpPrice}</Cell>
                          <Cell>{getActualSl(trade)}</Cell>
                          <Cell>{closePrice ?? "-"}</Cell>
                          <Cell>{trade.profitFactorTargeted.toFixed(2)}</Cell>
                          <Cell className={trade.profitFactorEarned.totalEarned >= 0 ? "text-primary" : "text-rose-400"}>
                            {trade.profitFactorEarned.totalEarned.toFixed(2)}
                          </Cell>
                          <Cell>
                            <span className="rounded-md border border-sidebar-border bg-header px-2 py-1 text-xs capitalize">
                              {trade.status}
                            </span>
                          </Cell>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

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
                    onClick={() => setPanelTab("management")}
                    className={`rounded px-2 py-1 transition-colors ${
                      panelTab === "management" ? "bg-primary/10 text-primary" : "text-header-foreground hover:text-primary"
                    }`}
                  >
                    Trade Management
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelTab("notes")}
                    className={`rounded px-2 py-1 transition-colors ${
                      panelTab === "notes" ? "bg-primary/10 text-primary" : "text-header-foreground hover:text-primary"
                    }`}
                  >
                    Notes
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelTab("pairWatched")}
                    className={`rounded px-2 py-1 transition-colors ${
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

                    <div className="mt-6 border-t border-sidebar-border pt-5">
                      <p className="mb-4 text-xs uppercase tracking-wide text-header-muted">Trade Results</p>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-header-muted">R Targeted</p>
                          <p className="mt-1 text-header-foreground">{selectedTrade.profitFactorTargeted.toFixed(2)}</p>
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
                                      {earnedR.toFixed(4)}
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
                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                      {selectedTradeNotes.map((note, idx) => (
                        <article
                          key={`${selectedTrade.id}-note-${idx}`}
                          className="mb-4 rounded-xl border border-sidebar-border border-l-4 border-l-blue-500 bg-sidebar/50 p-4"
                        >
                          <p className="mb-3 whitespace-pre-wrap break-words text-sm text-dashboard-foreground">{note.text}</p>
                          {note.images?.length > 0 && (
                            <div className="grid grid-cols-1 gap-3">
                              {note.images.map((img) => (
                                <img
                                  key={img}
                                  src={getImageUrl(img)}
                                  alt="Note image"
                                  className="max-h-[280px] w-full rounded-lg border border-sidebar-border object-contain"
                                />
                              ))}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>

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
                            const nextNotes: TradeNote[] = [
                              ...(selectedTrade.trackNotes ?? []),
                              { text: noteDraft.trim(), images: noteImages },
                            ];
                            const updated = await tradesApi.update(selectedTrade.id, { trackNotes: nextNotes });
                            updateSelectedTrade(updated);
                            setNoteDraft("");
                            setNoteImages([]);
                          }}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          Create
                        </button>
                      </div>
                      {noteImages.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {noteImages.map((img) => (
                            <img
                              key={img}
                              src={getImageUrl(img)}
                              alt="Pending upload"
                              className="h-16 w-24 rounded border border-sidebar-border object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {panelTab === "pairWatched" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-sidebar-border bg-sidebar/40 p-4">
                      <div>
                        <p className="text-sm font-medium text-header-foreground">Linked Pair</p>
                        <p className="text-sm text-header-muted">
                          {selectedTrade.pairWatched?.pairName ?? "No pair linked"}
                        </p>
                      </div>
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
                    </div>

                    {selectedTrade.pairWatched ? (
                      <div className="rounded-xl border border-sidebar-border bg-sidebar/30 p-4">
                        <p className="text-base font-semibold text-header-foreground">{selectedTrade.pairWatched.pairName}</p>
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
                      <p className="text-sm font-medium text-header-foreground">{item.pairName}</p>
                      <p className="text-xs text-header-muted">{item.bias}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
