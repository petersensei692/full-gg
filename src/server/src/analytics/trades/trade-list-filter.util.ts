import type { Trade } from './entities/trade.entity';
import { normalizePairSymbol, splitPairSymbol } from '../analytics-pair-filters';

/** Parse hold-time field: bare number = hours; or 1h30m, 90s, etc. */
export function parseDurationInputMs(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const bare = Number(t.replace(',', '.'));
  if (Number.isFinite(bare) && bare >= 0) return bare * 3600000;
  let ms = 0;
  const h = t.match(/(\d+(?:\.\d+)?)\s*h/i);
  const m = t.match(/(\d+(?:\.\d+)?)\s*m/i);
  const sec = t.match(/(\d+(?:\.\d+)?)\s*s/i);
  if (h) ms += parseFloat(h[1]) * 3600000;
  if (m) ms += parseFloat(m[1]) * 60000;
  if (sec) ms += parseFloat(sec[1]) * 1000;
  if (ms > 0) return ms;
  const parts = t.split(':').map((x) => parseInt(x, 10));
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  return null;
}

export function tradeHoldMs(t: { executionTime: Date | null; tradeCloseTime: Date | null }): number {
  if (!t.tradeCloseTime || !t.executionTime) return 0;
  return Math.max(0, new Date(t.tradeCloseTime).getTime() - new Date(t.executionTime).getTime());
}

export type TradeListFilterParams = {
  symbols: string[];
  currencies: string[];
  buy: boolean;
  sell: boolean;
  profitMin: string;
  profitMax: string;
  holdMin: string;
  holdMax: string;
  volumeMin: string;
  volumeMax: string;
  dateFrom?: string;
  dateTo?: string;
};

export function tradeInDateRange(t: Trade, dateFrom?: string, dateTo?: string): boolean {
  if (!dateFrom?.trim() && !dateTo?.trim()) return true;
  const fromT = dateFrom?.trim() ? new Date(dateFrom).getTime() : -Infinity;
  const toT = dateTo?.trim() ? new Date(dateTo).getTime() : Infinity;
  if (t.tradeCloseTime) {
    const close = new Date(t.tradeCloseTime).getTime();
    return close >= fromT && close <= toT;
  }
  const anchor = t.executionTime
    ? new Date(t.executionTime).getTime()
    : new Date(t.createdAt).getTime();
  return anchor >= fromT && anchor <= toT;
}

export function tradeMatchesListFilters(t: Trade, f: TradeListFilterParams): boolean {
  if (!f.buy && !f.sell) return false;
  const normPair = normalizePairSymbol(t.pair);
  if (f.symbols.length > 0) {
    const wanted = f.symbols.map((s) => normalizePairSymbol(s));
    if (!wanted.includes(normPair)) return false;
  }
  if (f.currencies.length > 0) {
    const curs = f.currencies.map((c) => c.toUpperCase());
    const sp = splitPairSymbol(t.pair);
    if (!sp || (!curs.includes(sp[0]) && !curs.includes(sp[1]))) return false;
  }
  if (!f.buy && t.type === 'buy') return false;
  if (!f.sell && t.type === 'sell') return false;

  const r = t.profitFactorEarned?.totalEarned ?? 0;
  if (f.profitMin !== '') {
    const lo = Number(f.profitMin.replace(',', '.'));
    if (Number.isFinite(lo) && r < lo) return false;
  }
  if (f.profitMax !== '') {
    const hi = Number(f.profitMax.replace(',', '.'));
    if (Number.isFinite(hi) && r > hi) return false;
  }

  const vol = t.positionSize;
  if (f.volumeMin !== '') {
    const lo = Number(f.volumeMin.replace(',', '.'));
    if (Number.isFinite(lo) && vol < lo) return false;
  }
  if (f.volumeMax !== '') {
    const hi = Number(f.volumeMax.replace(',', '.'));
    if (Number.isFinite(hi) && vol > hi) return false;
  }

  const hold = tradeHoldMs(t);
  if (f.holdMin !== '') {
    const minMs = parseDurationInputMs(f.holdMin);
    if (minMs != null && hold < minMs) return false;
  }
  if (f.holdMax !== '') {
    const maxMs = parseDurationInputMs(f.holdMax);
    if (maxMs != null && hold > maxMs) return false;
  }

  if (!tradeInDateRange(t, f.dateFrom, f.dateTo)) return false;

  return true;
}
