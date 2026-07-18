import { DataSource } from 'typeorm';
import { Asset } from '../../fondamental/assets/entities/asset.entity';
import { Pair } from '../../analytics/pairs/entities/pair.entity';

/** Historical pip seed — lookup when seeding oriented pairs. */
const PAIRS_PIPS_VALUES_SEED: Array<{ pair: string; pairFormat: number; pipValue: number }> = [
  { pair: 'EUR/USD', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'GBP/USD', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'AUD/USD', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'NZD/USD', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'USD/JPY', pairFormat: 0.01, pipValue: 0.01 },
  { pair: 'USD/CHF', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'USD/CAD', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'EUR/GBP', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'EUR/JPY', pairFormat: 0.01, pipValue: 0.01 },
  { pair: 'EUR/CHF', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'EUR/AUD', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'EUR/CAD', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'EUR/NZD', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'GBP/JPY', pairFormat: 0.01, pipValue: 0.01 },
  { pair: 'GBP/CHF', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'GBP/AUD', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'GBP/CAD', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'GBP/NZD', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'AUD/JPY', pairFormat: 0.01, pipValue: 0.01 },
  { pair: 'AUD/CHF', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'AUD/CAD', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'AUD/NZD', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'NZD/JPY', pairFormat: 0.01, pipValue: 0.01 },
  { pair: 'NZD/CHF', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'NZD/CAD', pairFormat: 0.0001, pipValue: 0.0001 },
  { pair: 'CAD/JPY', pairFormat: 0.01, pipValue: 0.01 },
  { pair: 'CHF/JPY', pairFormat: 0.01, pipValue: 0.01 },
  { pair: 'XAU/USD', pairFormat: 0.01, pipValue: 0.01 },
  { pair: 'XAG/USD', pairFormat: 0.001, pipValue: 0.001 },
  { pair: 'WTI/USD', pairFormat: 0.01, pipValue: 0.01 },
];

const CURRENCY_ORDER = ['USD', 'EUR', 'GBP', 'AUD', 'NZD', 'CAD', 'CHF', 'JPY'] as const;
const USD_AS_BASE = new Set(['JPY', 'CHF', 'CAD']);

function currencyRank(name: string): number {
  const i = CURRENCY_ORDER.indexOf(name as (typeof CURRENCY_ORDER)[number]);
  return i >= 0 ? i : 999;
}

function orientPair(a: string, b: string): [string, string] {
  if (a === 'USD' || b === 'USD') {
    const other = a === 'USD' ? b : a;
    if (USD_AS_BASE.has(other)) return ['USD', other];
    return [other, 'USD'];
  }
  return currencyRank(a) <= currencyRank(b) ? [a, b] : [b, a];
}

function unorderedKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

function inferPip(pair: string): { pairFormat: number; pipValue: number } {
  const hit = PAIRS_PIPS_VALUES_SEED.find((r) => r.pair === pair);
  if (hit) return { pairFormat: hit.pairFormat, pipValue: hit.pipValue };
  const n = pair.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (n.includes('JPY') || n.startsWith('XAU') || n.startsWith('WTI')) {
    return { pairFormat: 0.01, pipValue: 0.01 };
  }
  if (n.startsWith('XAG')) return { pairFormat: 0.001, pipValue: 0.001 };
  return { pairFormat: 0.0001, pipValue: 0.0001 };
}

/**
 * Seed trading pairs: currency matrix (USD crosses first, then EUR, …),
 * then non-currency × USD. STOCKS excluded.
 * Pip values from PAIRS_PIPS_VALUES_SEED when the oriented symbol matches.
 */
export async function seedPairs(dataSource: DataSource): Promise<void> {
  const assetsRepo = dataSource.getRepository(Asset);
  const pairsRepo = dataSource.getRepository(Pair);

  const allAssets = await assetsRepo.find();
  const byName = new Map(allAssets.map((a) => [a.name, a]));

  const currencies = CURRENCY_ORDER.map((n) => byName.get(n)).filter(
    (a): a is Asset => !!a && a.isTradable !== false,
  );

  const nonCurrency = allAssets.filter(
    (a) =>
      a.isTradable !== false &&
      a.type !== 'currency' &&
      a.type !== 'stocks' &&
      a.name !== 'STOCKS',
  );

  type Planned = { base: Asset; quote: Asset; pair: string };
  const planned: Planned[] = [];
  const seen = new Set<string>();

  // Enqueue currency pairs grouped by primary focus (USD first, then EUR, …)
  for (const focus of CURRENCY_ORDER) {
    const focusAsset = byName.get(focus);
    if (!focusAsset) continue;
    for (const other of currencies) {
      if (other.id === focusAsset.id) continue;
      const key = unorderedKey(focusAsset.name, other.name);
      if (seen.has(key)) continue;

      const involvesUsd = focusAsset.name === 'USD' || other.name === 'USD';
      if (involvesUsd) {
        if (focus !== 'USD') continue;
      } else {
        const primary =
          currencyRank(focusAsset.name) <= currencyRank(other.name)
            ? focusAsset.name
            : other.name;
        if (focus !== primary) continue;
      }

      seen.add(key);
      const [bn, qn] = orientPair(focusAsset.name, other.name);
      const base = byName.get(bn);
      const quote = byName.get(qn);
      if (!base || !quote) continue;
      planned.push({ base, quote, pair: `${base.name}/${quote.name}` });
    }
  }

  for (const asset of nonCurrency) {
    const usd = byName.get('USD');
    if (!usd) break;
    const key = unorderedKey(asset.name, 'USD');
    if (seen.has(key)) continue;
    seen.add(key);
    const [bn, qn] = orientPair(asset.name, 'USD');
    const base = byName.get(bn);
    const quote = byName.get(qn);
    if (!base || !quote) continue;
    planned.push({ base, quote, pair: `${base.name}/${quote.name}` });
  }

  for (const p of planned) {
    const existing = await pairsRepo.findOne({ where: { pair: p.pair } });
    if (existing) continue;
    const pip = inferPip(p.pair);
    await pairsRepo.insert({
      baseAssetId: p.base.id,
      quoteAssetId: p.quote.id,
      pair: p.pair,
      pairFormat: pip.pairFormat,
      pipValue: pip.pipValue,
    });
    console.log(`  ✓ Pair "${p.pair}" seeded (pip ${pip.pipValue})`);
  }
}

/** @deprecated alias for callers that still import the old name */
export async function seedPairsPipsValues(dataSource: DataSource): Promise<void> {
  return seedPairs(dataSource);
}

/** Demo bulk trades removed — user data only. */
export async function seedTradesForPairs(_dataSource: DataSource): Promise<void> {}
