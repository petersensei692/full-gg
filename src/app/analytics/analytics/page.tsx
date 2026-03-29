"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AnalyticsDateRangePicker } from "@/components/analytics/AnalyticsDateRangePicker";
import { AnalyticsScopeDropdowns } from "@/components/analytics/AnalyticsScopeDropdowns";
import { performanceAnalyticsService, tradesApi } from "@/lib/api";
import { usePersistedDateRange } from "@/lib/usePersistedDateRange";
import { usePersistedAnalyticsScope } from "@/lib/usePersistedAnalyticsScope";
import type {
  PerformanceAnalyticsResponse,
  PerformanceFrequencyMode,
  PerformanceFrequencyUnit,
} from "@/types/api";
import { buildTradePerformanceAxisTicks } from "@/lib/analytics/trade-performance-axis";
import { APP_DATE_LOCALE, MONTH_SHORT_GRID } from "@/lib/date-locale";

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-sidebar-border bg-sidebar ${className}`}>{children}</div>;
}

function formatR2(n: number | undefined): string {
  if (typeof n !== "number" || Number.isNaN(n)) return "0.00";
  return n.toFixed(2);
}

const WEEK_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PerformanceAnalyticsPage() {
  const { from: appliedFrom, to: appliedTo, setRange: setAppliedRange, hydrated } = usePersistedDateRange("performance");
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth() + 1);
  const [freqUnit, setFreqUnit] = useState<PerformanceFrequencyUnit>("daily");
  const [freqMode, setFreqMode] = useState<PerformanceFrequencyMode>("winsLosses");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PerformanceAnalyticsResponse | null>(null);
  const [chartsReady, setChartsReady] = useState(false);
  const { scope, persist: persistScope, hydrated: scopeHydrated } = usePersistedAnalyticsScope("performance");
  const [pairOptions, setPairOptions] = useState<string[]>([]);

  useEffect(() => {
    setChartsReady(true);
  }, []);

  useEffect(() => {
    tradesApi
      .getDistinctPairs()
      .then((pairs) => setPairOptions(pairs))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const requestedUnit = freqUnit;
    try {
      const payload = await performanceAnalyticsService.get({
        from: appliedFrom,
        to: appliedTo,
        calendarYear: calYear,
        calendarMonth: calMonth,
        frequencyMode: freqMode,
        frequencyUnit: requestedUnit,
        pairs: scope.pairs,
        currencies: scope.currencies,
      });
      setData(payload);
      if (requestedUnit === "monthly" && payload.frequency.unit === "daily") {
        setFreqUnit("daily");
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [appliedFrom, appliedTo, calYear, calMonth, freqMode, freqUnit, scope.pairs, scope.currencies]);

  useEffect(() => {
    if (!hydrated || !scopeHydrated) return;
    fetchData();
  }, [hydrated, scopeHydrated, fetchData]);

  const monthTitle = useMemo(
    () => new Date(calYear, calMonth - 1, 1).toLocaleDateString(APP_DATE_LOCALE, { month: "long", year: "numeric" }),
    [calYear, calMonth],
  );

  const winrate = data?.widgets.dailyWinratePercent ?? 0;
  const tradeWins = data?.widgets.tradeWins ?? 0;
  const tradeLosses = data?.widgets.tradeLosses ?? 0;
  const tradeBreakeven = data?.widgets.tradeBreakeven ?? 0;
  const tradeTotal = Math.max(0, tradeWins + tradeLosses + tradeBreakeven);
  const lossSideCount = tradeLosses + tradeBreakeven;
  const winPctOfTotal = tradeTotal > 0 ? (tradeWins / tradeTotal) * 100 : 0;
  const lossPctOfTotal = tradeTotal > 0 ? (lossSideCount / tradeTotal) * 100 : 0;

  const pieData = useMemo(
    () => [
      { name: "Wins", value: Math.max(0, winrate), fill: "#3ea5ff" },
      { name: "Losses", value: Math.max(0, 100 - winrate), fill: "#e11d48" },
    ],
    [winrate],
  );

  const tradeWlRatio = data?.widgets.tradeWinLossRatio ?? 0;
  const winSeg = tradeTotal > 0 ? (tradeWins / tradeTotal) * 100 : 50;

  const tradePerformance = useMemo(
    () => data?.widgets.tradePerformanceR ?? [],
    [data?.widgets.tradePerformanceR],
  );

  const tradePerformanceChartRows = useMemo(
    () => tradePerformance.map((e, idx) => ({ ...e, idx })),
    [tradePerformance],
  );

  const performanceAxisTicks = useMemo(
    () => buildTradePerformanceAxisTicks(tradePerformance.map((e) => e.closedAt)),
    [tradePerformance],
  );

  const performanceTickLabelByIndex = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of performanceAxisTicks) m.set(t.index, t.label);
    return m;
  }, [performanceAxisTicks]);

  const performanceXTicks = useMemo(
    () => performanceAxisTicks.map((t) => t.index),
    [performanceAxisTicks],
  );

  const freqChartData = useMemo(
    () =>
      (data?.frequency.series ?? []).map((s) => ({
        name: s.label,
        wins: s.up,
        lossesNeg: -s.down,
      })),
    [data?.frequency.series],
  );

  const monthlyAvailable = data?.frequency.monthlyAvailable ?? false;

  const freqModeLabel =
    freqMode === "winsLosses" ? "Wins vs Losses" : freqMode === "buysSells" ? "Buys vs Sells" : "Profit R vs Loss R";

  const tooltipUpLabel =
    freqMode === "winsLosses" ? "Wins" : freqMode === "buysSells" ? "Buys" : "Profit R";
  const tooltipDownLabel =
    freqMode === "winsLosses" ? "Losses" : freqMode === "buysSells" ? "Sells" : "Loss R";

  const shiftMonth = (delta: number) => {
    const d = new Date(calYear, calMonth - 1 + delta, 1);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth() + 1);
  };

  return (
    <DashboardLayout>
      <div className="min-h-full bg-dashboard-bg text-dashboard-foreground">
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6">
          <header className="mb-6 flex flex-wrap items-center justify-start gap-2 border-b border-sidebar-border pb-4">
            <AnalyticsDateRangePicker
              from={appliedFrom}
              to={appliedTo}
              onApply={(nextFrom, nextTo) => {
                setAppliedRange(nextFrom, nextTo);
              }}
            />
            <AnalyticsScopeDropdowns pairOptions={pairOptions} scope={scope} onScopeChange={persistScope} />
          </header>

          <div className="grid grid-cols-1 gap-4 min-[1260px]:grid-cols-[3fr_2fr] min-[1260px]:items-stretch">
            <SurfaceCard className="flex min-h-0 min-w-0 flex-col p-4 min-[1260px]:h-full">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => shiftMonth(-1)}
                    className="rounded-lg border border-sidebar-border p-2 hover:bg-header"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <h2 className="min-w-[160px] text-center text-lg font-semibold text-header-foreground">{monthTitle}</h2>
                  <button
                    type="button"
                    onClick={() => shiftMonth(1)}
                    className="rounded-lg border border-sidebar-border p-2 hover:bg-header"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-header-muted">
                  <span>
                    Trades: <span className="text-header-foreground">{loading ? "…" : data?.calendar.summary.trades ?? 0}</span>
                  </span>
                  <span>
                    Wins: <span className="text-primary">{loading ? "…" : data?.calendar.summary.wins ?? 0}</span>
                  </span>
                  <span>
                    R:{" "}
                    <span className={(data?.calendar.summary.totalR ?? 0) >= 0 ? "text-primary" : "text-rose-400"}>
                      {loading ? "…" : `${(data?.calendar.summary.totalR ?? 0) >= 0 ? "+" : ""}${formatR2(data?.calendar.summary.totalR)}`}
                    </span>
                  </span>
                  <span>
                    Win%: <span className="text-header-foreground">{loading ? "…" : formatR2(data?.calendar.summary.winRatePercent)}%</span>
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-x-auto">
                <div className="flex min-h-full min-w-[640px] flex-col">
                  <div className="grid shrink-0 grid-cols-8 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-header-muted">
                    {WEEK_LABELS.map((d) => (
                      <div key={d} className="py-0.5">
                        {d}
                      </div>
                    ))}
                    <div className="py-0.5">Total</div>
                  </div>
                  {loading ? (
                    <div className="flex flex-1 items-center justify-center py-8 text-header-muted">Loading…</div>
                  ) : (
                    <div className="mt-0.5 flex min-h-0 flex-1 flex-col gap-1">
                    {(data?.calendar.weeks ?? []).map((week, wi) => (
                      <div
                        key={`w-${wi}`}
                        className="grid min-h-[44px] flex-1 grid-cols-8 gap-1 min-[1260px]:min-h-0"
                      >
                        {week.cells.map((cell, ci) => (
                          <div
                            key={`c-${wi}-${ci}`}
                            className={`flex min-h-[44px] flex-col justify-between rounded-md border border-sidebar-border/50 p-1 text-center min-[1260px]:min-h-0 min-[1260px]:flex-1 ${
                              cell.dayOfMonth ? "bg-header/30" : "border-transparent bg-transparent"
                            }`}
                          >
                            {cell.dayOfMonth != null ? (
                              <>
                                <span className="text-left text-[10px] text-header-muted">{cell.dayOfMonth}</span>
                                {cell.trades > 0 ? (
                                  <>
                                    <span className={`text-[11px] font-semibold leading-tight ${cell.totalR >= 0 ? "text-primary" : "text-rose-400"}`}>
                                      {cell.totalR >= 0 ? "+" : ""}
                                      {formatR2(cell.totalR)}R
                                    </span>
                                    <span className="text-[9px] text-header-muted">{cell.trades} tr</span>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-header-muted/50">—</span>
                                )}
                              </>
                            ) : null}
                          </div>
                        ))}
                        <div className="flex min-h-[44px] flex-col items-center justify-center rounded-md border border-primary/40 bg-primary/10 p-1 text-center min-[1260px]:min-h-0 min-[1260px]:flex-1">
                          <span className={`text-[11px] font-semibold ${week.weekTotalR >= 0 ? "text-primary" : "text-rose-400"}`}>
                            {week.weekTotalR >= 0 ? "+" : ""}
                            {formatR2(week.weekTotalR)}R
                          </span>
                          <span className="text-[9px] text-header-muted">{formatR2(week.weekWinRatePercent)}%</span>
                        </div>
                      </div>
                    ))}
                    </div>
                  )}
                </div>
              </div>
            </SurfaceCard>

            <div className="flex min-h-0 min-w-0 flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1260px]:grid-cols-[2fr_3fr]">
                <SurfaceCard className="p-3">
                  <p className="text-center text-sm font-medium text-header-foreground">
                    {formatR2(winrate)}% Winrate
                  </p>
                  <p className="mt-0.5 text-center text-[10px] text-header-muted">Closed trades in range</p>
                  <div className="mx-auto mt-2 aspect-square w-full max-w-[152px] min-h-[120px]">
                    {chartsReady ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius="48%"
                            outerRadius="72%"
                            paddingAngle={1}
                            startAngle={90}
                            endAngle={450}
                            stroke="none"
                          >
                            {pieData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const name = String(payload[0].name ?? "");
                              const winTitle =
                                tradeTotal > 0
                                  ? `Wins: ${tradeWins} trades (${formatR2(winPctOfTotal)}%)`
                                  : "No trades";
                              const lossTitle =
                                tradeTotal > 0
                                  ? `Non-wins: ${lossSideCount} trades (${formatR2(lossPctOfTotal)}%)`
                                  : "No trades";
                              const text = name === "Wins" ? winTitle : lossTitle;
                              return (
                                <div
                                  className="rounded-lg border border-sidebar-border bg-[#0b1323] px-3 py-2 text-xs shadow-lg text-header-foreground"
                                >
                                  {text}
                                </div>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full animate-pulse rounded-md bg-header/50" />
                    )}
                  </div>
                </SurfaceCard>

                <SurfaceCard className="flex flex-col justify-center gap-2 p-3">
                  <p className="text-center text-sm font-medium text-header-foreground">Win / Loss</p>
                  <p className="text-center text-xl font-semibold text-primary">{formatR2(tradeWlRatio)}</p>
                  <p className="text-center text-[10px] text-header-muted">
                    Bar width = win vs non-win trade counts. Center: avg win R ÷ avg loss |R|.
                  </p>
                  <div className="flex h-6 w-full items-center overflow-hidden rounded-full bg-header">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${winSeg}%` }}
                      title={
                        tradeTotal > 0
                          ? `Wins: ${tradeWins} trades (${formatR2(winPctOfTotal)}%)`
                          : undefined
                      }
                    />
                    <div
                      className="h-full flex-1 bg-rose-600/80"
                      title={
                        tradeTotal > 0
                          ? `Non-wins: ${lossSideCount} trades (${formatR2(lossPctOfTotal)}%)`
                          : undefined
                      }
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-header-muted">
                    <span>Win side</span>
                    <span>Loss side</span>
                  </div>
                </SurfaceCard>
              </div>

              <SurfaceCard className="p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => setFreqUnit("daily")}
                      className={`border-b-2 pb-1 ${freqUnit === "daily" ? "border-primary text-primary" : "border-transparent text-header-muted"}`}
                    >
                      Daily
                    </button>
                    <button
                      type="button"
                      disabled={!monthlyAvailable}
                      onClick={() => monthlyAvailable && setFreqUnit("monthly")}
                      className={`border-b-2 pb-1 ${
                        !monthlyAvailable ? "cursor-not-allowed opacity-40" : ""
                      } ${freqUnit === "monthly" ? "border-primary text-primary" : "border-transparent text-header-muted"}`}
                    >
                      Monthly
                    </button>
                  </div>
                  <select
                    value={freqMode}
                    onChange={(e) => setFreqMode(e.target.value as PerformanceFrequencyMode)}
                    className="rounded-lg border border-sidebar-border bg-header px-2 py-1.5 text-xs text-header-foreground"
                  >
                    <option value="winsLosses">Wins vs Losses</option>
                    <option value="buysSells">Buys vs Sells</option>
                    <option value="profitR">Total profits (R)</option>
                  </select>
                </div>
                <p className="mb-1 text-center text-xs text-header-muted">{freqModeLabel}</p>
                <div className="h-[190px] w-full min-w-0">
                  {chartsReady ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={freqChartData}
                        stackOffset="sign"
                        margin={{ top: 12, right: 8, left: 4, bottom: 0 }}
                      >
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.35)" />
                        <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                        <Tooltip
                          contentStyle={{ background: "#0b1323", border: "1px solid #27272a", borderRadius: 8 }}
                          formatter={(v, name) => {
                            const n = Number(v ?? 0);
                            const absVal = name === "lossesNeg" ? Math.abs(n) : n;
                            const formatted =
                              freqMode === "profitR" ? `${formatR2(absVal)} R` : String(absVal);
                            return [formatted, name === "lossesNeg" ? tooltipDownLabel : tooltipUpLabel];
                          }}
                        />
                        <Bar dataKey="lossesNeg" stackId="freq" fill="#e11d48" radius={[2, 2, 2, 2]} />
                        <Bar dataKey="wins" stackId="freq" fill="#3ea5ff" radius={[2, 2, 2, 2]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full animate-pulse rounded-md bg-header/50" />
                  )}
                </div>
              </SurfaceCard>
            </div>
          </div>

          <SurfaceCard className="mt-4 p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-semibold text-header-foreground">Performance</p>
              <span className="text-[10px] text-header-muted">One bar per trade (chronological)</span>
            </div>
            <div className="h-[min(480px,55vh)] min-h-[420px] w-full min-w-0">
              {chartsReady && !loading && tradePerformance.length === 0 ? (
                <div className="flex h-full items-center justify-center px-2 text-center text-xs text-header-muted">
                  No closed trades in this date range (with current filters).
                </div>
              ) : chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={tradePerformanceChartRows}
                    margin={{ top: 8, right: 8, left: 0, bottom: 24 }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="idx"
                      type="number"
                      domain={[-0.5, Math.max(0, tradePerformanceChartRows.length - 1) + 0.5]}
                      ticks={
                        performanceXTicks.length > 0
                          ? performanceXTicks
                          : (() => {
                              const n = tradePerformanceChartRows.length;
                              if (n <= 1) return [0];
                              return [0, n - 1];
                            })()
                      }
                      tickFormatter={(v) => {
                        const label = performanceTickLabelByIndex.get(Number(v));
                        if (label) return label;
                        const n = tradePerformanceChartRows.length;
                        if (n <= 1) return "";
                        const i = Number(v);
                        if (i === 0)
                          return new Date(tradePerformanceChartRows[0].closedAt).toLocaleDateString(APP_DATE_LOCALE, {
                            month: "short",
                            day: "numeric",
                          });
                        if (i === n - 1)
                          return new Date(tradePerformanceChartRows[n - 1].closedAt).toLocaleDateString(APP_DATE_LOCALE, {
                            month: "short",
                            day: "numeric",
                          });
                        return "";
                      }}
                      tick={{ fill: "#a1a1aa", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#a1a1aa", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0].payload as {
                          r: number;
                          pair: string;
                          closedAt: string;
                        };
                        const r = row.r;
                        const sign = r >= 0 ? "+" : "";
                        const when = new Date(row.closedAt).toLocaleString(APP_DATE_LOCALE, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        });
                        return (
                          <div className="rounded-lg border border-sidebar-border bg-[#0b1323] px-3 py-2 text-xs shadow-lg">
                            <p className="font-medium text-header-foreground">{row.pair}</p>
                            <p className="text-header-muted">{when}</p>
                            <p className={`mt-1 font-semibold ${r >= 0 ? "text-primary" : "text-rose-400"}`}>
                              {sign}
                              {formatR2(r)} R
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="r" radius={[2, 2, 0, 0]} maxBarSize={5}>
                      {tradePerformanceChartRows.map((e, i) => (
                        <Cell key={e.id ?? i} fill={e.r >= 0 ? "#3ea5ff" : "#e11d48"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full animate-pulse rounded-md bg-header/50" />
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard className="mt-4 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-header-foreground">Yearly Performance (R)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-sidebar-border text-header-muted">
                    <th className="py-2 text-left font-medium">Year</th>
                    {MONTH_SHORT_GRID.map((label, m) => (
                      <th key={m} className="px-1 py-2 text-center font-medium">
                        {label}
                      </th>
                    ))}
                    <th className="py-2 text-center font-medium text-primary">YTD</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.yearlyPerformance ?? []).map((row) => (
                    <tr key={row.year} className="border-b border-sidebar-border/60">
                      <td className="py-2 font-medium text-header-foreground">{row.year}</td>
                      {row.months.map((m) => (
                        <td key={m.month} className="px-1 py-2 text-center align-top">
                          {m.trades > 0 ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={m.totalR >= 0 ? "text-primary" : "text-rose-400"}>
                                {m.totalR >= 0 ? "+" : ""}
                                {formatR2(m.totalR)}
                              </span>
                              <span className="text-[10px] text-header-muted">{m.trades} tr</span>
                            </div>
                          ) : (
                            <span className="text-header-muted/40">—</span>
                          )}
                        </td>
                      ))}
                      <td className="rounded-md border border-primary/40 bg-primary/10 px-2 py-2 text-center align-top">
                        <div className={`font-semibold ${row.ytd.totalR >= 0 ? "text-primary" : "text-rose-400"}`}>
                          {row.ytd.totalR >= 0 ? "+" : ""}
                          {formatR2(row.ytd.totalR)}
                        </div>
                        <div className="text-[10px] text-header-muted">{row.ytd.trades} tr</div>
                        <div className="mt-1 text-[10px] text-primary">{formatR2(row.ytd.winRatePercent)}% WR</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && (data?.yearlyPerformance?.length ?? 0) === 0 ? (
                <p className="py-8 text-center text-header-muted">No closed trades yet.</p>
              ) : null}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
