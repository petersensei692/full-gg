import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trade } from '../trades/entities/trade.entity';
import {
  parsePairCurrencyListParam,
  tradeMatchesPairCurrencyScope,
} from '../analytics-pair-filters';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Calendar day in the runtime's local timezone (not UTC) — matches client date pickers. */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}

function distinctMonthsInRange(from: Date, to: Date): number {
  const set = new Set<string>();
  let d = new Date(from.getFullYear(), from.getMonth(), 1);
  const endM = new Date(to.getFullYear(), to.getMonth(), 1);
  while (d <= endM) {
    set.add(`${d.getFullYear()}-${d.getMonth()}`);
    d.setMonth(d.getMonth() + 1);
  }
  return set.size;
}

type FrequencyMode = 'winsLosses' | 'buysSells' | 'profitR';
type FrequencyUnit = 'daily' | 'monthly';

@Injectable()
export class PerformanceAnalyticsService {
  constructor(
    @InjectRepository(Trade)
    private readonly tradesRepository: Repository<Trade>,
  ) {}

  async getPerformanceAnalytics(query: {
    from?: string;
    to?: string;
    fromMs?: string;
    toMs?: string;
    calendarYear?: string;
    calendarMonth?: string;
    frequencyMode?: string;
    frequencyUnit?: string;
    pairs?: string;
    currencies?: string;
  }) {
    const now = new Date();
    const toParsed =
      query.toMs != null && query.toMs !== '' && Number.isFinite(Number(query.toMs))
        ? new Date(Number(query.toMs))
        : query.to
          ? new Date(query.to)
          : now;
    const to = toParsed;
    const from =
      query.fromMs != null && query.fromMs !== '' && Number.isFinite(Number(query.fromMs))
        ? new Date(Number(query.fromMs))
        : query.from
          ? new Date(query.from)
          : null;

    const cy = query.calendarYear ? parseInt(query.calendarYear, 10) : to.getFullYear();
    const cm = query.calendarMonth ? parseInt(query.calendarMonth, 10) : to.getMonth() + 1;
    const calYear = Number.isFinite(cy) ? cy : to.getFullYear();
    const calMonth = Number.isFinite(cm) ? Math.min(12, Math.max(1, cm)) : to.getMonth() + 1;

    const mode: FrequencyMode =
      query.frequencyMode === 'buysSells' || query.frequencyMode === 'profitR'
        ? query.frequencyMode
        : 'winsLosses';
    let unit: FrequencyUnit = query.frequencyUnit === 'monthly' ? 'monthly' : 'daily';

    const monthlyAvailable = !from || distinctMonthsInRange(from, to) >= 12;
    if (unit === 'monthly' && !monthlyAvailable) unit = 'daily';

    const allClosed = await this.tradesRepository.find({
      where: {},
      order: { tradeCloseTime: 'ASC' },
    });
    const pairsFilter = parsePairCurrencyListParam(query.pairs);
    const currenciesFilter = parsePairCurrencyListParam(query.currencies);
    const scope = (t: Trade) => tradeMatchesPairCurrencyScope(t.pair, pairsFilter, currenciesFilter);
    const closed = allClosed
      .filter((t) => t.closePrices.length > 0 && t.tradeCloseTime != null)
      .filter(scope);

    const inGlobal = (d: Date) => (!from || d >= from) && d <= to;
    const filtered = closed.filter((t) => inGlobal(new Date(t.tradeCloseTime as Date)));

    const monthStart = new Date(calYear, calMonth - 1, 1);
    const monthEnd = new Date(calYear, calMonth, 0, 23, 59, 59, 999);
    const inMonth = (d: Date) => d >= monthStart && d <= monthEnd;

    const addToByDay = (
      map: Map<string, { totalR: number; trades: number; wins: number; losses: number; breakeven: number }>,
      t: Trade,
    ) => {
      const closeAt = new Date(t.tradeCloseTime as Date);
      const key = dayKey(startOfDay(closeAt));
      const r = t.profitFactorEarned?.totalEarned ?? 0;
      const cur = map.get(key) ?? {
        totalR: 0,
        trades: 0,
        wins: 0,
        losses: 0,
        breakeven: 0,
      };
      cur.trades += 1;
      cur.totalR += r;
      if (r > 0) cur.wins += 1;
      else if (r < 0) cur.losses += 1;
      else cur.breakeven += 1;
      map.set(key, cur);
    };

    const byDayGlobal = new Map<
      string,
      { totalR: number; trades: number; wins: number; losses: number; breakeven: number }
    >();
    for (const t of filtered) {
      addToByDay(byDayGlobal, t);
    }

    const byDayMonth = new Map<
      string,
      { totalR: number; trades: number; wins: number; losses: number; breakeven: number }
    >();
    for (const t of closed) {
      const closeAt = new Date(t.tradeCloseTime as Date);
      if (inMonth(closeAt)) addToByDay(byDayMonth, t);
    }
    const firstWeekday = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();

    let monthTrades = 0;
    let monthWins = 0;
    let monthTotalR = 0;
    for (let d = 1; d <= daysInMonth; d += 1) {
      const key = dayKey(new Date(calYear, calMonth - 1, d));
      const cell = byDayMonth.get(key);
      if (cell) {
        monthTrades += cell.trades;
        monthWins += cell.wins;
        monthTotalR += cell.totalR;
      }
    }
    const monthWinRate = monthTrades > 0 ? round2((monthWins / monthTrades) * 100) : 0;

    const weeks: Array<{
      cells: Array<{
        date: string | null;
        dayOfMonth: number | null;
        totalR: number;
        trades: number;
        wins: number;
        losses: number;
      }>;
      weekTotalR: number;
      weekTrades: number;
      weekWins: number;
      weekWinRatePercent: number;
    }> = [];

    for (let w = 0; w < 6; w += 1) {
      const weekStart = 1 - firstWeekday + w * 7;
      if (weekStart > daysInMonth) break;
      const cells: Array<{
        date: string | null;
        dayOfMonth: number | null;
        totalR: number;
        trades: number;
        wins: number;
        losses: number;
      }> = [];
      let weekR = 0;
      let weekTrades = 0;
      let weekWins = 0;
      for (let c = 0; c < 7; c += 1) {
        const dom = weekStart + c;
        if (dom < 1 || dom > daysInMonth) {
          cells.push({
            date: null,
            dayOfMonth: null,
            totalR: 0,
            trades: 0,
            wins: 0,
            losses: 0,
          });
        } else {
          const key = dayKey(new Date(calYear, calMonth - 1, dom));
          const stats = byDayMonth.get(key);
          const totalR = stats?.totalR ?? 0;
          const trades = stats?.trades ?? 0;
          const wins = stats?.wins ?? 0;
          const losses = stats?.losses ?? 0;
          weekR += totalR;
          weekTrades += trades;
          weekWins += wins;
          cells.push({
            date: key,
            dayOfMonth: dom,
            totalR: round2(totalR),
            trades,
            wins,
            losses,
          });
        }
      }
      const weekWinRatePercent = weekTrades > 0 ? round2((weekWins / weekTrades) * 100) : 0;
      weeks.push({
        cells,
        weekTotalR: round2(weekR),
        weekTrades,
        weekWins,
        weekWinRatePercent,
      });
    }

    const sortedDayKeys = [...byDayGlobal.keys()].sort();
    const positiveDays = sortedDayKeys.filter((k) => (byDayGlobal.get(k)?.totalR ?? 0) > 0);
    const negativeDays = sortedDayKeys.filter((k) => (byDayGlobal.get(k)?.totalR ?? 0) < 0);
    const sumPos = positiveDays.reduce((s, k) => s + (byDayGlobal.get(k)?.totalR ?? 0), 0);
    const sumNegAbs = negativeDays.reduce((s, k) => s + Math.abs(byDayGlobal.get(k)?.totalR ?? 0), 0);
    const avgWinDay = positiveDays.length ? sumPos / positiveDays.length : 0;
    const avgLossDay = negativeDays.length ? sumNegAbs / negativeDays.length : 0;
    const dayWinLossRatio =
      avgLossDay > 1e-9 ? round2(avgWinDay / avgLossDay) : avgWinDay > 0 ? round2(avgWinDay) : 0;

    const totalTrades = filtered.length;
    const totalWins = filtered.filter((t) => (t.profitFactorEarned?.totalEarned ?? 0) > 0).length;
    const dailyWinratePercent =
      totalTrades > 0 ? round2((totalWins / totalTrades) * 100) : 0;

    const netDailyR = sortedDayKeys.map((k) => ({
      date: k,
      r: round2(byDayGlobal.get(k)?.totalR ?? 0),
    }));

    const tradesChrono = [...filtered].sort(
      (a, b) =>
        new Date(a.tradeCloseTime as Date).getTime() - new Date(b.tradeCloseTime as Date).getTime(),
    );
    const tradePerformanceR = tradesChrono.map((t) => {
      const closedAt = new Date(t.tradeCloseTime as Date);
      const label = closedAt.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      return {
        id: t.id,
        label,
        pair: t.pair,
        r: round2(t.profitFactorEarned?.totalEarned ?? 0),
        closedAt: closedAt.toISOString(),
      };
    });

    const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const emptyWeek = () =>
      Array.from({ length: 7 }, () => ({ up: 0, down: 0 }));
    const emptyMonth = () => Array.from({ length: 12 }, () => ({ up: 0, down: 0 }));

    const applyTradeToBuckets = (
      buckets: { up: number; down: number }[],
      index: number,
      t: Trade,
    ) => {
      const r = t.profitFactorEarned?.totalEarned ?? 0;
      if (mode === 'winsLosses') {
        if (r > 0) buckets[index].up += 1;
        else if (r < 0) buckets[index].down += 1;
      } else if (mode === 'buysSells') {
        if (t.type === 'buy') buckets[index].up += 1;
        else buckets[index].down += 1;
      } else {
        if (r > 0) buckets[index].up += r;
        else if (r < 0) buckets[index].down += Math.abs(r);
      }
    };

    let series: { label: string; up: number; down: number }[] = [];

    if (unit === 'daily') {
      const buckets = emptyWeek();
      for (const t of filtered) {
        const wd = new Date(t.tradeCloseTime as Date).getDay();
        applyTradeToBuckets(buckets, wd, t);
      }
      series = buckets.map((b, i) => ({
        label: weekdayLabels[i],
        up: round2(b.up),
        down: round2(b.down),
      }));
    } else {
      const buckets = emptyMonth();
      for (const t of filtered) {
        const m = new Date(t.tradeCloseTime as Date).getMonth();
        applyTradeToBuckets(buckets, m, t);
      }
      series = buckets.map((b, i) => ({
        label: monthLabels[i],
        up: round2(b.up),
        down: round2(b.down),
      }));
    }

    const yearSet = new Set<number>();
    for (const t of closed) {
      yearSet.add(new Date(t.tradeCloseTime as Date).getFullYear());
    }
    const years = [...yearSet].sort((a, b) => b - a);
    const yearlyPerformance = years.map((year) => {
      const months: Array<{ month: number; totalR: number; trades: number }> = [];
      let ytdR = 0;
      let ytdTrades = 0;
      let ytdWins = 0;
      for (let m = 1; m <= 12; m += 1) {
        let totalR = 0;
        let trades = 0;
        for (const t of closed) {
          const d = new Date(t.tradeCloseTime as Date);
          if (d.getFullYear() === year && d.getMonth() + 1 === m) {
            totalR += t.profitFactorEarned?.totalEarned ?? 0;
            trades += 1;
          }
        }
        ytdR += totalR;
        ytdTrades += trades;
        months.push({
          month: m,
          totalR: round2(totalR),
          trades,
        });
      }
      for (const t of closed) {
        const d = new Date(t.tradeCloseTime as Date);
        if (d.getFullYear() !== year) continue;
        const r = t.profitFactorEarned?.totalEarned ?? 0;
        if (r > 0) ytdWins += 1;
      }
      const ytdWinRatePercent = ytdTrades > 0 ? round2((ytdWins / ytdTrades) * 100) : 0;
      return {
        year,
        months,
        ytd: {
          totalR: round2(ytdR),
          trades: ytdTrades,
          wins: ytdWins,
          winRatePercent: ytdWinRatePercent,
        },
      };
    });

    return {
      calendar: {
        year: calYear,
        month: calMonth,
        summary: {
          trades: monthTrades,
          wins: monthWins,
          totalR: round2(monthTotalR),
          winRatePercent: monthWinRate,
        },
        weeks,
      },
      widgets: {
        dailyWinratePercent,
        dayWinLossRatio,
        netDailyR,
        tradePerformanceR,
      },
      frequency: {
        unit,
        mode,
        monthlyAvailable,
        series,
      },
      yearlyPerformance,
      appliedFilters: {
        from: from?.toISOString() ?? null,
        to: to.toISOString(),
      },
    };
  }
}
