"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Filter } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { tradesApi } from "@/lib/api";
import type { Trade } from "@/types/api";

const FALLBACK_TRADES: Trade[] = [
  {
    id: "fallback-1",
    pair: "BTCUSD",
    type: "buy",
    executionType: "market order",
    executionTime: "2026-03-21T17:11:00.000Z",
    executionPrice: 30000.0019,
    tpPrice: 30020.0,
    slPrice: 29980.0,
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
    slPrice: 1.145,
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

function getFullClosePrice(trade: Trade): number | null {
  const fullClose = trade.closePrices.find((c) => c.type === "fullClose");
  return fullClose ? fullClose.price : null;
}

export default function AnalyticsTradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <DashboardLayout>
      <div className="min-h-full bg-dashboard-bg text-dashboard-foreground">
        <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6">
          <div className="mb-4 border-b border-sidebar-border">
            <div className="flex min-w-max items-center gap-6 text-sm font-medium">
              <button type="button" className="border-b-2 border-primary px-1 py-3 text-primary">
                Trade History
              </button>
              <button type="button" className="px-1 py-3 text-header-foreground/85">
                Daily Journal
              </button>
              <button type="button" className="px-1 py-3 text-header-foreground/85">
                Library
              </button>
            </div>
          </div>

          <header className="mb-4 flex flex-wrap items-center justify-end gap-2">
            <div className="rounded-xl border border-sidebar-border bg-sidebar px-3 py-2 text-sm text-header-foreground">
              <span className="text-red-400">TEST</span> - Test Account
            </div>
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
                      const closePrice = getFullClosePrice(trade);
                      return (
                        <tr key={trade.id} className="border-b border-sidebar-border/70 hover:bg-header/40">
                          <Cell className="w-14 px-3">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-[11px] text-primary">
                              ↗
                            </span>
                          </Cell>
                          <Cell className="font-medium">{trade.pair}</Cell>
                          <Cell className="uppercase">{trade.type}</Cell>
                          <Cell>{trade.executionPrice}</Cell>
                          <Cell>{trade.tpPrice}</Cell>
                          <Cell>{trade.slPrice}</Cell>
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
      </div>
    </DashboardLayout>
  );
}
