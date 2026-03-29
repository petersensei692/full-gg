import { DataSource } from 'typeorm';
import { PairPipsValue } from '../../analytics/pairs-pips-values/entities/pair-pips-value.entity';

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

export async function seedPairsPipsValues(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(PairPipsValue);
  for (const row of PAIRS_PIPS_VALUES_SEED) {
    const existing = await repository.findOne({ where: { pair: row.pair } });
    if (!existing) {
      await repository.insert(row);
      console.log(`  ✓ Pair pip "${row.pair}" seeded`);
    }
  }
}

/** Demo bulk trades removed — user data only. */
export async function seedTradesForPairs(_dataSource: DataSource): Promise<void> {}
