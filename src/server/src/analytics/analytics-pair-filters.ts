/** Shared pair / currency scope for dashboard & performance analytics. */

const KNOWN_QUOTES = [
  'USDT',
  'USDC',
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CHF',
  'AUD',
  'NZD',
  'CAD',
  'XAU',
  'XAG',
  'WTI',
  'BTC',
  'ETH',
];

export function normalizePairSymbol(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function splitPairSymbol(pair: string): [string, string] | null {
  const p = normalizePairSymbol(pair);
  const sorted = [...KNOWN_QUOTES].sort((a, b) => b.length - a.length);
  for (const q of sorted) {
    if (p.endsWith(q) && p.length > q.length) {
      const base = p.slice(0, -q.length);
      if (base.length >= 2) return [base, q];
    }
  }
  return null;
}

export function parsePairCurrencyListParam(s?: string): string[] {
  if (!s?.trim()) return [];
  return s
    .split(',')
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);
}

export function tradeMatchesPairCurrencyScope(
  pair: string,
  pairsFilter: string[],
  currenciesFilter: string[],
): boolean {
  const norm = normalizePairSymbol(pair);
  if (pairsFilter.length > 0) {
    const wanted = pairsFilter.map((x) => normalizePairSymbol(x));
    if (!wanted.includes(norm)) return false;
  }
  if (currenciesFilter.length > 0) {
    const curs = currenciesFilter.map((c) => c.toUpperCase());
    const sp = splitPairSymbol(pair);
    if (!sp) return false;
    if (!curs.includes(sp[0]) && !curs.includes(sp[1])) return false;
  }
  return true;
}
