/** Client-side pair parsing (keep in sync with server `analytics-pair-filters.ts`). */

const KNOWN_QUOTES = [
  "USDT",
  "USDC",
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "AUD",
  "NZD",
  "CAD",
  "XAU",
  "XAG",
  "WTI",
  "BTC",
  "ETH",
];

export function normalizePairSymbol(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
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

export function uniqueCurrenciesFromPairs(pairs: string[]): string[] {
  const s = new Set<string>();
  for (const pair of pairs) {
    const sp = splitPairSymbol(pair);
    if (sp) {
      s.add(sp[0]);
      s.add(sp[1]);
    }
  }
  return [...s].sort();
}
