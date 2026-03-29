/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AnalyticsDateRangePicker } from "@/components/analytics/AnalyticsDateRangePicker";
import { AnalyticsScopeDropdowns } from "@/components/analytics/AnalyticsScopeDropdowns";
import { dashboardAnalyticsService, tradesApi } from "@/lib/api";
import type { DashboardAnalyticsResponse } from "@/types/api";
import { usePersistedDateRange } from "@/lib/usePersistedDateRange";
import { usePersistedAnalyticsScope } from "@/lib/usePersistedAnalyticsScope";

function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-sidebar-border bg-sidebar ${className}`}>
      {children}
    </div>
  );
}

function formatR(value: number | undefined, digits = 2): string {
  if (typeof value !== "number" || Number.isNaN(value)) return (0).toFixed(digits);
  return value.toFixed(digits);
}

export default function AnalyticsPage() {
  const { from: appliedFrom, to: appliedTo, setRange: setAppliedRange, hydrated } = usePersistedDateRange("dashboard");
  const { scope, persist: persistScope, hydrated: scopeHydrated } = usePersistedAnalyticsScope("dashboard");
  const [pairOptions, setPairOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardAnalyticsResponse | null>(null);

  const globalFrom = appliedFrom;
  const globalTo = appliedTo;

  useEffect(() => {
    tradesApi
      .getDistinctPairs()
      .then((pairs) => setPairOptions(pairs))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!hydrated || !scopeHydrated) return;
    let cancelled = false;
    setLoading(true);
    dashboardAnalyticsService
      .get({
        from: globalFrom,
        to: globalTo,
        pairs: scope.pairs,
        currencies: scope.currencies,
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, scopeHydrated, globalFrom, globalTo, scope.pairs, scope.currencies]);

  const headlineResult = data?.tradingStats.actualResult ?? 0;

  return (
    <DashboardLayout>
      <div className="min-h-full bg-dashboard-bg text-dashboard-foreground">
        <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6">
        <header className="mb-4 flex flex-wrap items-center justify-start gap-2">
            <AnalyticsDateRangePicker
              from={appliedFrom}
              to={appliedTo}
              onApply={(nextFrom, nextTo) => {
                setAppliedRange(nextFrom, nextTo);
              }}
            />
            <AnalyticsScopeDropdowns pairOptions={pairOptions} scope={scope} onScopeChange={persistScope} />
        </header>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Top row: two small cards side-by-side on wide screens */}
            <div className="grid grid-cols-1 gap-4 lg:col-span-2 lg:grid-cols-2">
              <SurfaceCard className="min-h-[170px] p-4 lg:col-span-2">
                <div className="grid h-full grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-sidebar-border bg-header/40 px-3 py-2 text-center">
                    <p className="text-xs uppercase tracking-wide text-header-muted">Trade Count</p>
                    <p className="mt-2 text-3xl font-semibold text-header-foreground">
                      {loading ? "..." : data?.tradeCount.total ?? 0}
                    </p>
                  </div>
                  <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-sidebar-border bg-header/40 px-3 py-2 text-center">
                    <p className="text-xs uppercase tracking-wide text-header-muted">Average Trades / Month</p>
                    <p className="mt-2 text-3xl font-semibold text-primary">
                      {loading ? "..." : formatR(data?.tradeCount.averageByMonth, 2)}
                    </p>
                  </div>
                  <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-sidebar-border bg-header/40 px-3 py-2 text-center">
                    <p className="text-xs uppercase tracking-wide text-header-muted">Average Trades / Week</p>
                    <p className="mt-2 text-3xl font-semibold text-primary">
                      {loading ? "..." : formatR(data?.tradeCount.averageByWeek, 2)}
                    </p>
                  </div>
                  <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-sidebar-border bg-header/40 px-3 py-2 text-center">
                    <p className="text-xs uppercase tracking-wide text-header-muted">Average Trades / Day</p>
                    <p className="mt-2 text-3xl font-semibold text-primary">
                      {loading ? "..." : formatR(data?.tradeCount.averageByDay, 2)}
                    </p>
                  </div>
                </div>
              </SurfaceCard>
            </div>

            {/* Big stats card: full width */}
            <SurfaceCard className="p-4 lg:col-span-2">
            <div className="border-l-2 border-[#2196f3] pl-3">
              <p className="text-sm font-semibold text-header-foreground">Actual Result</p>
              <p className="mt-1 text-2xl font-semibold text-primary">
                {loading ? "..." : `${headlineResult >= 0 ? "+" : ""}${headlineResult.toFixed(2)} R`}
              </p>
              <p className="text-xs text-header-muted">Sum of all trade R</p>
            </div>

            <div className="mt-5 border-t border-sidebar-border pt-4">
              <p className="text-xs uppercase tracking-wide text-header-muted">Period Returns</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-header px-2 py-2">
                  <p className="text-header-muted">Weekly</p>
                  <p className="text-primary">{loading ? "..." : `${formatR(data?.tradingStats.periodReturns.weekly)} R`}</p>
                </div>
                <div className="rounded-md bg-header px-2 py-2">
                  <p className="text-header-muted">Daily</p>
                  <p className="text-primary">{loading ? "..." : `${formatR(data?.tradingStats.periodReturns.daily)} R`}</p>
                </div>
                <div className="rounded-md bg-header px-2 py-2">
                  <p className="text-header-muted">Yearly</p>
                  <p className="text-primary">{loading ? "..." : `${formatR(data?.tradingStats.periodReturns.yearly)} R`}</p>
                </div>
                <div className="rounded-md bg-header px-2 py-2">
                  <p className="text-header-muted">Monthly</p>
                  <p className="text-primary">{loading ? "..." : `${formatR(data?.tradingStats.periodReturns.monthly)} R`}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-sidebar-border pt-4 text-sm">
              <p className="mb-2 text-xs uppercase tracking-wide text-header-muted">Risk</p>
              <div className="space-y-2 text-dashboard-foreground">
                <div className="flex justify-between">
                  <span className="text-header-muted">Max Drawdown</span>
                  <span className="text-[#f77786]">{loading ? "..." : `${formatR(data?.tradingStats.risk.maxDrawdown.number)} R`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-header-muted">Max Drawdown Trades</span>
                  <span>{loading ? "..." : (data?.tradingStats.risk.maxDrawdown.tradeCount ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-header-muted">Max Drawup</span>
                  <span className="text-primary">{loading ? "..." : `${formatR(data?.tradingStats.risk.maxDrawup?.number)} R`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-header-muted">Max Drawup Trades</span>
                  <span>{loading ? "..." : (data?.tradingStats.risk.maxDrawup?.tradeCount ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-header-muted">Highest Win</span>
                  <span>{loading ? "..." : `${formatR(data?.tradingStats.risk.highestWin.number)} R`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-header-muted">Highest Lose</span>
                  <span className="text-[#f77786]">{loading ? "..." : `${formatR(data?.tradingStats.risk.highestLose.number)} R`}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-sidebar-border pt-4 text-sm">
              <p className="mb-2 text-xs uppercase tracking-wide text-header-muted">Trade Stats</p>
              <div className="space-y-2 text-dashboard-foreground">
                <div className="flex justify-between">
                  <span className="text-header-muted">Win rate (%)</span>
                  <span className="text-primary">{loading ? "..." : `${formatR(data?.tradingStats.tradeStats.winrate, 2)}%`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-header-muted">Profit Factor</span>
                  <span>{loading ? "..." : `${formatR(data?.tradingStats.tradeStats.profitFactor)} R`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-header-muted">Avg Win / Avg Loss</span>
                  <span>
                    <span className="text-primary">{loading ? "..." : `${formatR(data?.tradingStats.tradeStats.averageWin)}R`}</span> /{" "}
                    <span className="text-[#f77786]">{loading ? "..." : `${formatR(data?.tradingStats.tradeStats.averageLoose)}R`}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-header-muted">Avg Trade Duration</span>
                  <span>{loading ? "..." : data?.tradingStats.tradeStats.averageTradeDuration ?? "-"}</span>
                </div>
              </div>
            </div>
            </SurfaceCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
