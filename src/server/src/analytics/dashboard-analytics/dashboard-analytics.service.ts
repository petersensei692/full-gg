import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trade } from '../trades/entities/trade.entity';
import {
  parsePairCurrencyListParam,
  tradeMatchesPairCurrencyScope,
} from '../analytics-pair-filters';

export type AnalyticsRange = '1D' | '1W' | '1M' | '1Y' | 'ALL';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return startOfDay(copy);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const chunks: string[] = [];
  if (days > 0) chunks.push(`${days}d`);
  if (hours > 0) chunks.push(`${hours}h`);
  chunks.push(`${minutes}m`);
  return chunks.join(' ');
}

function toRangeStart(now: Date, range: AnalyticsRange): Date | null {
  switch (range) {
    case '1D':
      return startOfDay(now);
    case '1W':
      return startOfWeek(now);
    case '1M':
      return startOfMonth(now);
    case '1Y':
      return startOfYear(now);
    case 'ALL':
    default:
      return null;
  }
}

function coerceRange(v?: string): AnalyticsRange {
  const normalized = (v ?? 'ALL').toUpperCase();
  if (normalized === '1D' || normalized === '1W' || normalized === '1M' || normalized === '1Y' || normalized === 'ALL') {
    return normalized;
  }
  return 'ALL';
}

@Injectable()
export class DashboardAnalyticsService {
  constructor(
    @InjectRepository(Trade)
    private readonly tradesRepository: Repository<Trade>,
  ) {}

  private inRange(date: Date, from: Date | null, to: Date): boolean {
    return (!from || date >= from) && date <= to;
  }

  private tradeTimeForRange(t: Trade): Date {
    if (t.executionTime) return new Date(t.executionTime);
    return new Date(t.createdAt);
  }

  private inclusiveDayCountForTradeStats(from: Date | null, to: Date, tradeTimes: Date[]): number {
    if (from) {
      const a = startOfDay(from).getTime();
      const b = startOfDay(to).getTime();
      return Math.max(1, Math.floor((b - a) / 86400000) + 1);
    }
    if (tradeTimes.length === 0) return 1;
    const min = Math.min(...tradeTimes.map((d) => startOfDay(d).getTime()));
    const max = startOfDay(to).getTime();
    return Math.max(1, Math.floor((max - min) / 86400000) + 1);
  }

  private inclusiveMonthCountForTradeStats(from: Date | null, to: Date, tradeTimes: Date[]): number {
    const keys = new Set<string>();
    if (from) {
      let d = new Date(from.getFullYear(), from.getMonth(), 1);
      const endM = new Date(to.getFullYear(), to.getMonth(), 1);
      while (d <= endM) {
        keys.add(`${d.getFullYear()}-${d.getMonth()}`);
        d.setMonth(d.getMonth() + 1);
      }
      return Math.max(1, keys.size);
    }
    for (const td of tradeTimes) {
      keys.add(`${td.getFullYear()}-${td.getMonth()}`);
    }
    keys.add(`${to.getFullYear()}-${to.getMonth()}`);
    return Math.max(1, keys.size);
  }

  async getDashboardAnalytics(query: {
    tradeCountRange?: string;
    resultRange?: string;
    from?: string;
    to?: string;
    fromMs?: string;
    toMs?: string;
    pairs?: string;
    currencies?: string;
  }) {
    const now = new Date();
    const to =
      query.toMs != null && query.toMs !== '' && Number.isFinite(Number(query.toMs))
        ? new Date(Number(query.toMs))
        : query.to
          ? new Date(query.to)
          : now;
    const customFrom =
      query.fromMs != null && query.fromMs !== '' && Number.isFinite(Number(query.fromMs))
        ? new Date(Number(query.fromMs))
        : query.from
          ? new Date(query.from)
          : null;
    const tradeCountRange = coerceRange(query.tradeCountRange);
    const resultRange = coerceRange(query.resultRange);
    const tradeCountFrom = customFrom ?? toRangeStart(to, tradeCountRange);
    const resultFrom = customFrom ?? toRangeStart(to, resultRange);

    const allTrades = await this.tradesRepository.find({
      order: { createdAt: 'ASC' },
    });

    const pairsFilter = parsePairCurrencyListParam(query.pairs);
    const currenciesFilter = parsePairCurrencyListParam(query.currencies);
    const scope = (t: Trade) =>
      tradeMatchesPairCurrencyScope(t.pair, pairsFilter, currenciesFilter);

    const scopedAll = allTrades.filter(scope);
    const closedTrades = scopedAll.filter((t) => t.closePrices.length > 0 && !!t.tradeCloseTime);
    const tradeCountTrades = scopedAll.filter((t) => this.inRange(this.tradeTimeForRange(t), tradeCountFrom, to));
    const resultTrades = closedTrades.filter((t) =>
      this.inRange(new Date(t.tradeCloseTime as Date), resultFrom, to),
    );

    // Trade count evolution (weekly buckets)
    const weekMap = new Map<string, number>();
    for (const t of tradeCountTrades) {
      const wk = startOfWeek(this.tradeTimeForRange(t)).toISOString().slice(0, 10);
      weekMap.set(wk, (weekMap.get(wk) ?? 0) + 1);
    }
    const tradeCountWeeks = [...weekMap.entries()].sort(([a], [b]) => a.localeCompare(b));
    const countByWeek = tradeCountWeeks.length > 0 ? tradeCountWeeks[tradeCountWeeks.length - 1][1] : 0;
    const averageByWeek = tradeCountWeeks.length > 0
      ? Number((tradeCountTrades.length / tradeCountWeeks.length).toFixed(2))
      : 0;

    const tradeTimesForCount = tradeCountTrades.map((t) => this.tradeTimeForRange(t));
    const dayCountForAvg = this.inclusiveDayCountForTradeStats(tradeCountFrom, to, tradeTimesForCount);
    const monthCountForAvg = this.inclusiveMonthCountForTradeStats(tradeCountFrom, to, tradeTimesForCount);
    const averageByDay = Number((tradeCountTrades.length / dayCountForAvg).toFixed(2));
    const averageByMonth = Number((tradeCountTrades.length / monthCountForAvg).toFixed(2));

    const byDay = new Map<string, number>();
    for (const t of resultTrades) {
      const dayKey = startOfDay(new Date(t.tradeCloseTime as Date)).toISOString().slice(0, 10);
      byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + (t.profitFactorEarned?.totalEarned ?? 0));
    }
    // Trading stats
    const totalResult = resultTrades.reduce((sum, t) => sum + (t.profitFactorEarned?.totalEarned ?? 0), 0);
    const byDayResult = new Set(resultTrades.map((t) => startOfDay(new Date(t.tradeCloseTime as Date)).toISOString().slice(0, 10)));
    const byWeekResult = new Set(resultTrades.map((t) => startOfWeek(new Date(t.tradeCloseTime as Date)).toISOString().slice(0, 10)));
    const byMonthResult = new Set(resultTrades.map((t) => startOfMonth(new Date(t.tradeCloseTime as Date)).toISOString().slice(0, 10)));
    const byYearResult = new Set(resultTrades.map((t) => startOfYear(new Date(t.tradeCloseTime as Date)).toISOString().slice(0, 10)));
    const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

    // Consecutive losing drawdown run
    const chronClosed = [...resultTrades].sort(
      (a, b) => new Date(a.tradeCloseTime as Date).getTime() - new Date(b.tradeCloseTime as Date).getTime(),
    );
    let currentRun = 0;
    let currentStart: Date | null = null;
    let currentEnd: Date | null = null;
    let maxDrawdown = 0;
    let maxStart: Date | null = null;
    let maxEnd: Date | null = null;
    for (const t of chronClosed) {
      const r = t.profitFactorEarned?.totalEarned ?? 0;
      const closeAt = new Date(t.tradeCloseTime as Date);
      if (r < 0) {
        if (currentRun === 0) currentStart = closeAt;
        currentRun += r;
        currentEnd = closeAt;
        if (currentRun < maxDrawdown) {
          maxDrawdown = currentRun;
          maxStart = currentStart;
          maxEnd = currentEnd;
        }
      } else {
        currentRun = 0;
        currentStart = null;
        currentEnd = null;
      }
    }

    const highestWinTrade = [...resultTrades].sort(
      (a, b) => (b.profitFactorEarned?.totalEarned ?? 0) - (a.profitFactorEarned?.totalEarned ?? 0),
    )[0];
    const highestLoseTrade = [...resultTrades].sort(
      (a, b) => (a.profitFactorEarned?.totalEarned ?? 0) - (b.profitFactorEarned?.totalEarned ?? 0),
    )[0];

    const wins = resultTrades.filter((t) => (t.profitFactorEarned?.totalEarned ?? 0) > 0);
    const losses = resultTrades.filter((t) => (t.profitFactorEarned?.totalEarned ?? 0) < 0);
    const withExec = resultTrades.filter((t) => t.executionTime != null);
    const avgDurationMs = safeDiv(
      withExec.reduce((sum, t) => {
        const open = new Date(t.executionTime as Date).getTime();
        const close = new Date(t.tradeCloseTime as Date).getTime();
        return sum + Math.max(0, close - open);
      }, 0),
      withExec.length,
    );

    // Big graph day-to-day R (single point per day; no repeated day labels)
    const dailyResultEntries = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dailySeries = dailyResultEntries.map(([label, value]) => ({
      label,
      value: Number(value.toFixed(4)),
    }));

    return {
      tradeCount: {
        countByWeek,
        averageByWeek,
        averageByDay,
        averageByMonth,
        total: tradeCountTrades.length,
        evolution: {
          labels: tradeCountWeeks.map(([label]) => label),
          values: tradeCountWeeks.map(([, value]) => value),
        },
      },
      tradingStats: {
        actualResult: Number(totalResult.toFixed(4)),
        periodReturns: {
          daily: Number(safeDiv(totalResult, byDayResult.size).toFixed(4)),
          weekly: Number(safeDiv(totalResult, byWeekResult.size).toFixed(4)),
          monthly: Number(safeDiv(totalResult, byMonthResult.size).toFixed(4)),
          yearly: Number(safeDiv(totalResult, byYearResult.size).toFixed(4)),
        },
        risk: {
          maxDrawdown: {
            number: Number(maxDrawdown.toFixed(4)),
            period: maxStart && maxEnd ? { from: maxStart.toISOString(), to: maxEnd.toISOString() } : null,
          },
          highestWin: {
            number: Number((highestWinTrade?.profitFactorEarned?.totalEarned ?? 0).toFixed(4)),
            trade: highestWinTrade ?? null,
          },
          highestLose: {
            number: Number((highestLoseTrade?.profitFactorEarned?.totalEarned ?? 0).toFixed(4)),
            trade: highestLoseTrade ?? null,
          },
        },
        tradeStats: {
          winrate: Number((safeDiv(wins.length, resultTrades.length) * 100).toFixed(2)),
          profitFactor: Number(safeDiv(totalResult, resultTrades.length).toFixed(4)),
          averageWin: Number(
            safeDiv(
              wins.reduce((sum, t) => sum + (t.profitFactorEarned?.totalEarned ?? 0), 0),
              wins.length,
            ).toFixed(4),
          ),
          averageLoose: Number(
            safeDiv(
              losses.reduce((sum, t) => sum + (t.profitFactorEarned?.totalEarned ?? 0), 0),
              losses.length,
            ).toFixed(4),
          ),
          averageTradeDuration: formatDuration(avgDurationMs),
        },
      },
      chartData: {
        resultEvolution: dailySeries,
      },
      appliedFilters: {
        tradeCountRange,
        resultRange,
        from: tradeCountFrom?.toISOString() ?? null,
        to: to.toISOString(),
      },
    };
  }
}
