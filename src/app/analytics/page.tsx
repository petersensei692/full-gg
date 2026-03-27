/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Filter, Flame } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { dashboardAnalyticsService } from "@/lib/api";
import type { AnalyticsRange, DashboardAnalyticsResponse } from "@/types/api";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

function formatR(value: number | undefined, digits = 4): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "0.0000";
  return value.toFixed(digits);
}

function addMonths(date: Date, offset: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + offset);
  return d;
}

function monthMatrix(year: number, month: number): Array<Array<Date | null>> {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const matrix: Array<Array<Date | null>> = [];
  let currentDay = 1;
  for (let r = 0; r < 6; r += 1) {
    const row: Array<Date | null> = [];
    for (let c = 0; c < 7; c += 1) {
      const cellIndex = r * 7 + c;
      if (cellIndex < startWeekday || currentDay > daysInMonth) row.push(null);
      else {
        row.push(new Date(year, month, currentDay));
        currentDay += 1;
      }
    }
    matrix.push(row);
  }
  return matrix;
}

function toIsoDateLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function startForRange(range: AnalyticsRange, now: Date): Date | null {
  const d = new Date(now);
  if (range === "ALL") return null;
  if (range === "1D") return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (range === "1W") {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  if (range === "1M") return new Date(d.getFullYear(), d.getMonth(), 1);
  return new Date(d.getFullYear(), 0, 1);
}

export default function AnalyticsPage() {
  const [globalFilterOpen, setGlobalFilterOpen] = useState(false);
  const [dateMode, setDateMode] = useState<"preset" | "relative" | "all">("all");
  const [globalRange, setGlobalRange] = useState<AnalyticsRange>("ALL");
  const [relativeAmount, setRelativeAmount] = useState<number>(26);
  const [relativeUnit, setRelativeUnit] = useState<"days" | "months">("days");
  const [appliedFrom, setAppliedFrom] = useState<Date | null>(null);
  const [appliedTo, setAppliedTo] = useState<Date>(new Date());
  const [draftFrom, setDraftFrom] = useState<Date | null>(null);
  const [draftTo, setDraftTo] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardAnalyticsResponse | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const [zoomStart, setZoomStart] = useState(0);
  const [zoomEnd, setZoomEnd] = useState(0);

  const globalFrom = appliedFrom;
  const globalTo = appliedTo;
  const globalLabel = useMemo(() => {
    if (!globalFrom) return "All Time";
    return `${toIsoDateLabel(globalFrom)} - ${toIsoDateLabel(globalTo)}`;
  }, [globalFrom, globalTo]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dashboardAnalyticsService
      .get({
        from: globalFrom ? globalFrom.toISOString() : undefined,
        to: globalTo.toISOString(),
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
  }, [globalFrom, globalTo]);

  useEffect(() => {
    setIsChartReady(true);
  }, []);

  const resultSeries = data?.chartData.resultEvolution ?? [];

  const chartSeries = useMemo(
    () =>
      resultSeries.map((p, idx) => ({
        idx,
        date: p.label,
        dateLabel: new Date(p.label).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        result: p.value,
      })),
    [resultSeries],
  );

  useEffect(() => {
    const last = Math.max(0, chartSeries.length - 1);
    setZoomStart(0);
    setZoomEnd(last);
  }, [chartSeries.length]);

  const visibleChartSeries = useMemo(() => {
    if (chartSeries.length === 0) return [];
    const safeStart = Math.max(0, Math.min(zoomStart, chartSeries.length - 1));
    const safeEnd = Math.max(safeStart, Math.min(zoomEnd, chartSeries.length - 1));
    return chartSeries.slice(safeStart, safeEnd + 1);
  }, [chartSeries, zoomStart, zoomEnd]);

  const handleChartWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (chartSeries.length <= 2) return;
    event.preventDefault();
    event.stopPropagation();

    const currentStart = Math.max(0, Math.min(zoomStart, chartSeries.length - 1));
    const currentEnd = Math.max(currentStart, Math.min(zoomEnd, chartSeries.length - 1));
    const currentWindow = currentEnd - currentStart + 1;
    const minWindow = Math.min(10, chartSeries.length);
    const isZoomed = currentWindow < chartSeries.length;

    // Horizontal wheel (or Shift + wheel) pans when zoomed.
    const hasHorizontalIntent = Math.abs(event.deltaX) > 1 || event.shiftKey;
    const panIntent = isZoomed && hasHorizontalIntent;
    if (panIntent) {
      const rawPan = (Math.abs(event.deltaX) > 0 ? event.deltaX : event.deltaY) / 40;
      const panStep = rawPan === 0 ? 0 : Math.sign(rawPan) * Math.max(1, Math.round(Math.abs(rawPan)));
      if (panStep === 0) return;
      let nextStart = currentStart + panStep;
      let nextEnd = currentEnd + panStep;
      if (nextStart < 0) {
        nextEnd += -nextStart;
        nextStart = 0;
      }
      if (nextEnd > chartSeries.length - 1) {
        const diff = nextEnd - (chartSeries.length - 1);
        nextStart = Math.max(0, nextStart - diff);
        nextEnd = chartSeries.length - 1;
      }
      setZoomStart(nextStart);
      setZoomEnd(nextEnd);
      return;
    }

    // Vertical wheel: up => zoom in, down => zoom out.
    const zoomIn = event.deltaY < 0;
    if (zoomIn) {
      if (currentWindow <= minWindow) return;
      const shrinkBy = Math.max(1, Math.round(currentWindow * 0.15));
      const nextWindow = Math.max(minWindow, currentWindow - shrinkBy);
      const center = Math.round((currentStart + currentEnd) / 2);
      let nextStart = center - Math.floor(nextWindow / 2);
      let nextEnd = nextStart + nextWindow - 1;
      if (nextStart < 0) {
        nextStart = 0;
        nextEnd = nextWindow - 1;
      }
      if (nextEnd > chartSeries.length - 1) {
        nextEnd = chartSeries.length - 1;
        nextStart = Math.max(0, nextEnd - nextWindow + 1);
      }
      setZoomStart(nextStart);
      setZoomEnd(nextEnd);
      return;
    }

    // Zoom out.
    if (currentWindow >= chartSeries.length) return;
    const growBy = Math.max(1, Math.round(currentWindow * 0.2));
    const nextWindow = Math.min(chartSeries.length, currentWindow + growBy);
    const center = Math.round((currentStart + currentEnd) / 2);
    let nextStart = center - Math.floor(nextWindow / 2);
    let nextEnd = nextStart + nextWindow - 1;
    if (nextStart < 0) {
      nextStart = 0;
      nextEnd = nextWindow - 1;
    }
    if (nextEnd > chartSeries.length - 1) {
      nextEnd = chartSeries.length - 1;
      nextStart = Math.max(0, nextEnd - nextWindow + 1);
    }
    setZoomStart(nextStart);
    setZoomEnd(nextEnd);
  };

  const headlineResult = data?.tradingStats.actualResult ?? 0;

  return (
    <DashboardLayout>
      <div className="min-h-full bg-dashboard-bg text-dashboard-foreground">
        <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6">
        <header className="mb-4 flex flex-wrap items-center justify-start gap-2">
            <button
              type="button"
              onClick={() => {
                setDraftFrom(appliedFrom);
                setDraftTo(appliedTo);
                setGlobalFilterOpen((o) => !o);
              }}
            >
            <SurfaceCard className="flex h-10 items-center gap-2 px-3 text-sm">
              <Calendar className="h-4 w-4 text-header-muted" />
              <span className="text-header-foreground">{globalLabel}</span>
            </SurfaceCard>
            </button>
            <button
              type="button"
              onClick={() => {
                setGlobalFilterOpen(false);
              }}
            >
            <SurfaceCard className="flex h-10 w-10 items-center justify-center">
              <Filter className="h-4 w-4 text-primary" />
            </SurfaceCard>
            </button>
            {globalFilterOpen && (
              <SurfaceCard className="relative z-20 w-full max-w-3xl p-4">
                <div className="grid w-full grid-cols-5 gap-2">
                  {([
                    ["Today", "1D"],
                    ["1 Week", "1W"],
                    ["1 Month", "1M"],
                    ["1 Year", "1Y"],
                    ["All Time", "ALL"],
                  ] as Array<[string, AnalyticsRange]>).map(([label, value]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setDateMode(value === "ALL" ? "all" : "preset");
                        setGlobalRange(value);
                        const end = new Date();
                        const start = startForRange(value, end);
                        setDraftFrom(start);
                        setDraftTo(end);
                      }}
                      className={`rounded-md border px-3 py-1.5 text-sm text-center ${
                        globalRange === value ? "border-primary text-primary" : "border-sidebar-border text-header-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="text-sm text-header-muted">In The Last</span>
                  <input
                    type="number"
                    min={1}
                    value={relativeAmount}
                    onChange={(e) => {
                      setRelativeAmount(Number(e.target.value) || 1);
                      setDateMode("relative");
                      const end = new Date();
                      const start = new Date(end);
                      if (relativeUnit === "days") start.setDate(start.getDate() - (Number(e.target.value) || 1));
                      else start.setMonth(start.getMonth() - (Number(e.target.value) || 1));
                      setDraftFrom(start);
                      setDraftTo(end);
                    }}
                    className="h-9 w-20 rounded-md border border-sidebar-border bg-header px-2 text-sm"
                  />
                  <select
                    value={relativeUnit}
                    onChange={(e) => {
                      setRelativeUnit(e.target.value as "days" | "months");
                      setDateMode("relative");
                      const end = new Date();
                      const start = new Date(end);
                      if (e.target.value === "days") start.setDate(start.getDate() - relativeAmount);
                      else start.setMonth(start.getMonth() - relativeAmount);
                      setDraftFrom(start);
                      setDraftTo(end);
                    }}
                    className="h-9 rounded-md border border-sidebar-border bg-header px-2 text-sm"
                  >
                    <option value="days">days</option>
                    <option value="months">months</option>
                  </select>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[0, 1].map((offset) => {
                    const base = addMonths(draftFrom ?? new Date(), offset);
                    const year = base.getFullYear();
                    const month = base.getMonth();
                    const matrix = monthMatrix(year, month);
                    return (
                      <div key={offset}>
                        <p className="mb-2 text-lg font-semibold text-header-foreground">
                          {base.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                        </p>
                        <div className="grid grid-cols-7 gap-1 text-xs text-header-muted mb-1">
                          {["S", "M", "T", "W", "T", "F", "S"].map((d, di) => (
                            <span key={`${offset}-${di}-${d}`} className="text-center">{d}</span>
                          ))}
                        </div>
                        <div className="space-y-1">
                          {matrix.map((row, ri) => (
                            <div key={`${offset}-r-${ri}`} className="grid grid-cols-7 gap-1">
                              {row.map((cell, ci) => {
                                if (!cell) return <span key={`${offset}-${ri}-${ci}`} className="h-8" />;
                                const inRange = !!draftFrom && cell >= draftFrom && cell <= draftTo;
                                return (
                                  <button
                                    key={`${offset}-${ri}-${ci}`}
                                    type="button"
                                    onClick={() => {
                                      if (!draftFrom || cell < draftFrom) setDraftFrom(cell);
                                      else setDraftTo(cell);
                                    }}
                                    className={`h-8 rounded text-sm ${
                                      inRange ? "bg-primary/30 text-primary-foreground" : "text-header-foreground hover:bg-header"
                                    }`}
                                  >
                                    {cell.getDate()}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setGlobalFilterOpen(false)}
                    className="rounded-md border border-sidebar-border px-4 py-2 text-sm text-header-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (dateMode === "all") {
                        setAppliedFrom(null);
                        setAppliedTo(new Date());
                      } else {
                        setAppliedFrom(draftFrom);
                        setAppliedTo(draftTo);
                      }
                      setGlobalFilterOpen(false);
                    }}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Apply
                  </button>
                </div>
              </SurfaceCard>
            )}
        </header>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Top row: two small cards side-by-side on wide screens */}
            <div className="grid grid-cols-1 gap-4 lg:col-span-2 lg:grid-cols-2">
              <SurfaceCard className="h-[170px] p-4">
                <div className="grid h-full grid-cols-2 gap-3">
                  <div className="flex h-full flex-col items-center justify-center rounded-lg border border-sidebar-border bg-header/40 px-3 py-2 text-center">
                    <p className="text-xs uppercase tracking-wide text-header-muted">Trade Count</p>
                    <p className="mt-2 text-3xl font-semibold text-header-foreground">
                      {loading ? "..." : data?.tradeCount.total ?? 0}
                    </p>
                  </div>
                  <div className="flex h-full flex-col items-center justify-center rounded-lg border border-sidebar-border bg-header/40 px-3 py-2 text-center">
                    <p className="text-xs uppercase tracking-wide text-header-muted">Average Trades / Week</p>
                    <p className="mt-2 text-3xl font-semibold text-primary">
                      {loading ? "..." : formatR(data?.tradeCount.averageByWeek, 2)}
                    </p>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard className="h-[170px] p-4">
                <div className="grid h-full grid-cols-2 gap-3">
                  <div className="flex h-full flex-col items-center justify-center rounded-lg border border-sidebar-border bg-header/40 px-3 py-2 text-center">
                    <p className="text-xs uppercase tracking-wide text-header-muted">Days Streak</p>
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-2xl font-semibold text-primary">{loading ? "..." : data?.streaks.days.HighestWinningStreak ?? 0}</p>
                      <Flame className="h-5 w-5 text-primary" />
                    </div>
                    <div className="mt-2 flex justify-center gap-1">
                      <span className="rounded-md bg-primary/20 px-2 py-0.5 text-xs text-primary">{loading ? "..." : data?.streaks.days.winningStreaksAmount ?? 0}</span>
                      <span className="rounded-md bg-rose-900/70 px-2 py-0.5 text-xs text-rose-200">{loading ? "..." : data?.streaks.days.loosingStreaksAmount ?? 0}</span>
                    </div>
                  </div>
                  <div className="flex h-full flex-col items-center justify-center rounded-lg border border-sidebar-border bg-header/40 px-3 py-2 text-center">
                    <p className="text-xs uppercase tracking-wide text-header-muted">Trades Streak</p>
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-2xl font-semibold text-primary">{loading ? "..." : data?.streaks.trades.HighestWinningStreak ?? 0}</p>
                      <Flame className="h-5 w-5 text-primary" />
                    </div>
                    <div className="mt-2 flex justify-center gap-1">
                      <span className="rounded-md bg-primary/20 px-2 py-0.5 text-xs text-primary">{loading ? "..." : data?.streaks.trades.winningStreaksAmount ?? 0}</span>
                      <span className="rounded-md bg-rose-900/70 px-2 py-0.5 text-xs text-rose-200">{loading ? "..." : data?.streaks.trades.loosingStreaksAmount ?? 0}</span>
                    </div>
                  </div>
                </div>
              </SurfaceCard>
            </div>

            {/* Big stats card: full width */}
            <SurfaceCard className="p-4 lg:col-span-2">
            <div className="border-l-2 border-[#2196f3] pl-3">
              <p className="text-sm font-semibold text-header-foreground">Actual Result</p>
              <p className="mt-1 text-2xl font-semibold text-primary">
                {loading ? "..." : `${headlineResult >= 0 ? "+" : ""}${headlineResult.toFixed(4)} R`}
              </p>
              <p className="text-xs text-header-muted">Sum of all trade R</p>
            </div>

            <div className="mt-5 border-t border-sidebar-border pt-4">
              <p className="text-xs uppercase tracking-wide text-header-muted">Period Returns</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-header px-2 py-2">
                  <p className="text-header-muted">Daily</p>
                  <p className="text-primary">{loading ? "..." : `${formatR(data?.tradingStats.periodReturns.daily)} R`}</p>
                </div>
                <div className="rounded-md bg-header px-2 py-2">
                  <p className="text-header-muted">Weekly</p>
                  <p className="text-primary">{loading ? "..." : `${formatR(data?.tradingStats.periodReturns.weekly)} R`}</p>
                </div>
                <div className="rounded-md bg-header px-2 py-2">
                  <p className="text-header-muted">Monthly</p>
                  <p className="text-primary">{loading ? "..." : `${formatR(data?.tradingStats.periodReturns.monthly)} R`}</p>
                </div>
                <div className="rounded-md bg-header px-2 py-2">
                  <p className="text-header-muted">Yearly</p>
                  <p className="text-primary">{loading ? "..." : `${formatR(data?.tradingStats.periodReturns.yearly)} R`}</p>
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

            <SurfaceCard className="p-4 lg:col-span-2">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-3xl font-semibold text-header-foreground">
                  {loading ? "..." : `${headlineResult >= 0 ? "+" : ""}${headlineResult.toFixed(4)} R`}
                </p>
                <p className="text-sm text-header-muted">Total Result</p>
              </div>
              <p className="text-xs text-header-muted">Daily R Evolution</p>
            </div>
            <div
              className="h-[340px] overscroll-contain rounded-lg border border-sidebar-border bg-gradient-to-b from-[#0b1930] to-[#0a1528] p-3"
              onWheel={handleChartWheel}
            >
              {isChartReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={visibleChartSeries} margin={{ top: 12, right: 8, left: 8, bottom: 10 }}>
                    <defs>
                      <linearGradient id="resultFillGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3ea5ff" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#3ea5ff" stopOpacity={0.06} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fill: "rgba(228,228,231,0.75)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      tick={{ fill: "rgba(228,228,231,0.75)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={42}
                      tickFormatter={(v) => `${Number(v).toFixed(0)}R`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0b1323",
                        border: "1px solid #27272a",
                        borderRadius: "10px",
                        color: "#e4e4e7",
                      }}
                      formatter={(value) => [`${Number(value ?? 0).toFixed(4)} R`, "Result"]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="result"
                      stroke="#3ea5ff"
                      strokeWidth={3}
                      fill="url(#resultFillGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#3ea5ff" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full animate-pulse rounded-md bg-header/60" />
              )}
            </div>
            </SurfaceCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
