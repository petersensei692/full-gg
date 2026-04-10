import type { Trade } from "@/types/api";
import { normalizePairSymbol, splitPairSymbol } from "@/lib/pair-currency-utils";

export type TradeFilters = {
  /** Selected pairs (exact match on normalized symbol). */
  symbols: string[];
  /** Include any pair whose base or quote is in this list. */
  currencies: string[];
  buy: boolean;
  sell: boolean;
  profitMin: string;
  profitMax: string;
  holdMin: string;
  holdMax: string;
  volumeMin: string;
  volumeMax: string;
};

/**
 * Restricts typing/paste to a decimal number with at most `maxDecimals` fractional digits.
 * Empty string allowed. Commas normalized to dots (consistent with Number() parsing elsewhere).
 */
export function sanitizeDecimalFilterInput(
  raw: string,
  options?: { allowNegative?: boolean; maxDecimals?: number },
): string {
  const allowNegative = options?.allowNegative ?? false;
  const maxDecimals = options?.maxDecimals ?? 2;
  const s = raw.replace(/,/g, ".");
  let out = "";
  let i = 0;
  if (allowNegative && s[0] === "-") {
    out = "-";
    i = 1;
  }
  let hasDot = false;
  let fracCount = 0;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c >= "0" && c <= "9") {
      if (hasDot && fracCount >= maxDecimals) continue;
      out += c;
      if (hasDot) fracCount += 1;
    } else if (c === "." && !hasDot) {
      hasDot = true;
      out += ".";
    }
  }
  return out;
}

export function defaultTradeFilters(): TradeFilters {
  return {
    symbols: [],
    currencies: [],
    buy: true,
    sell: true,
    profitMin: "",
    profitMax: "",
    holdMin: "",
    holdMax: "",
    volumeMin: "",
    volumeMax: "",
  };
}

const PREFIX = "gg:tradeFilters:";

export type TradeFiltersPageKey = "dashboard" | "trades" | "performance";

export function loadTradeFilters(page: TradeFiltersPageKey): TradeFilters {
  if (typeof window === "undefined") return defaultTradeFilters();
  try {
    const raw = localStorage.getItem(PREFIX + page);
    if (!raw) return defaultTradeFilters();
    const o = JSON.parse(raw) as Partial<TradeFilters>;
    return {
      ...defaultTradeFilters(),
      ...o,
      symbols: Array.isArray(o.symbols) ? o.symbols : [],
      currencies: Array.isArray(o.currencies) ? o.currencies : [],
    };
  } catch {
    return defaultTradeFilters();
  }
}

export function saveTradeFilters(page: TradeFiltersPageKey, f: TradeFilters): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFIX + page, JSON.stringify(f));
}

/** Parse hold-time field: bare number = hours; or 2d1h30m, 90s, etc. */
export function parseDurationInput(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const bare = Number(t.replace(",", "."));
  if (Number.isFinite(bare) && bare >= 0 && !/[dhms]/i.test(t)) return bare * 3600000;
  let ms = 0;
  const d = t.match(/(\d+(?:\.\d+)?)\s*d/i);
  const h = t.match(/(\d+(?:\.\d+)?)\s*h/i);
  const m = t.match(/(\d+(?:\.\d+)?)\s*m/i);
  const sec = t.match(/(\d+(?:\.\d+)?)\s*s/i);
  if (d) ms += parseFloat(d[1]) * 86400000;
  if (h) ms += parseFloat(h[1]) * 3600000;
  if (m) ms += parseFloat(m[1]) * 60000;
  if (sec) ms += parseFloat(sec[1]) * 1000;
  if (ms > 0) return ms;
  const parts = t.split(":").map((x) => parseInt(x, 10));
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  return null;
}

export function durationMsToParts(ms: number): { d: number; h: number; m: number; s: number } {
  let sec = Math.round(ms / 1000);
  const s = sec % 60;
  sec = Math.floor(sec / 60);
  const m = sec % 60;
  sec = Math.floor(sec / 60);
  const h = sec % 24;
  const d = Math.floor(sec / 24);
  return { d, h, m, s };
}

export function partsToDurationMs(d: number, h: number, m: number, s: number): number {
  return (
    (((Math.max(0, d) * 24 + Math.max(0, h)) * 60 + Math.max(0, m)) * 60 + Math.max(0, s)) * 1000
  );
}

export function formatDurationMsForFilter(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const { d, h, m, s } = durationMsToParts(ms);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join("");
}

export function parseDurationInputToParts(s: string): { d: number; h: number; m: number; s: number } {
  const ms = parseDurationInput(s);
  if (ms == null || ms <= 0) return { d: 0, h: 0, m: 0, s: 0 };
  return durationMsToParts(ms);
}

export function tradeHoldMs(t: { executionTime: string | null; tradeCloseTime: string | null }): number {
  if (!t.tradeCloseTime || !t.executionTime) return 0;
  return Math.max(0, new Date(t.tradeCloseTime).getTime() - new Date(t.executionTime).getTime());
}

export function tradeMatchesFilters(t: Trade, f: TradeFilters): boolean {
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
  if (!f.buy && t.type === "buy") return false;
  if (!f.sell && t.type === "sell") return false;

  const r = t.profitFactorEarned?.totalEarned ?? 0;
  if (f.profitMin !== "") {
    const lo = Number(f.profitMin.replace(",", "."));
    if (Number.isFinite(lo) && r < lo) return false;
  }
  if (f.profitMax !== "") {
    const hi = Number(f.profitMax.replace(",", "."));
    if (Number.isFinite(hi) && r > hi) return false;
  }

  const vol = t.positionSize;
  if (f.volumeMin !== "") {
    const lo = Number(f.volumeMin.replace(",", "."));
    if (Number.isFinite(lo) && vol < lo) return false;
  }
  if (f.volumeMax !== "") {
    const hi = Number(f.volumeMax.replace(",", "."));
    if (Number.isFinite(hi) && vol > hi) return false;
  }

  const hold = tradeHoldMs(t);
  if (f.holdMin !== "") {
    const minMs = parseDurationInput(f.holdMin);
    if (minMs != null && hold < minMs) return false;
  }
  if (f.holdMax !== "") {
    const maxMs = parseDurationInput(f.holdMax);
    if (maxMs != null && hold > maxMs) return false;
  }

  return true;
}

export function filtersActive(f: TradeFilters): boolean {
  const d = defaultTradeFilters();
  if (f.symbols.length > 0 || f.currencies.length > 0) return true;
  if (!f.buy || !f.sell) return true;
  if (f.profitMin || f.profitMax || f.holdMin || f.holdMax || f.volumeMin || f.volumeMax) return true;
  return false;
}
