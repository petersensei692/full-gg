import { DataSource } from 'typeorm';
import { PairPipsValue } from '../../analytics/pairs-pips-values/entities/pair-pips-value.entity';
import { Trade, TradeExecutionType, TradeType } from '../../analytics/trades/entities/trade.entity';

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

const EXEC_TYPES: TradeExecutionType[] = [
  'market order',
  'buy stop',
  'sell stop',
  'buy limit',
  'sell limit',
];

function basePriceForPair(pair: string): number {
  if (pair.includes('/JPY')) return 150;
  if (pair.startsWith('XAU/')) return 2300;
  if (pair.startsWith('XAG/')) return 26;
  if (pair.startsWith('WTI/')) return 78;
  return 1.12;
}

function closePriceFromPips(
  type: TradeType,
  entry: number,
  pip: number,
  pipsFromEntry: number,
): number {
  const signedMove = type === 'buy' ? pipsFromEntry : -pipsFromEntry;
  return Number((entry + signedMove * pip).toFixed(5));
}

function calculateProfitFactorEarned(input: {
  type: TradeType;
  executionPrice: number;
  initialSlPrice: number;
  positionSize: number;
  closePrices: Array<{ price: number; lots: number }>;
  pipStep: number;
}) {
  const riskPriceAbs = Math.abs(input.executionPrice - input.initialSlPrice);
  if (riskPriceAbs <= 0 || input.positionSize <= 0 || input.pipStep <= 0) {
    return { earnings: [], earningsNumber: 0, totalEarned: 0 };
  }

  const riskPips = riskPriceAbs / input.pipStep;
  let cumulative = 0;
  const earnings = input.closePrices.map((c) => {
    const priceDelta =
      input.type === 'buy'
        ? c.price - input.executionPrice
        : input.executionPrice - c.price;
    const closePips = priceDelta / input.pipStep;
    const sizeWeight = c.lots / input.positionSize;
    const rawEarnedR = (closePips / riskPips) * sizeWeight;
    const remainingAllowedLoss = -1 - cumulative;
    const earnedR = rawEarnedR < remainingAllowedLoss ? remainingAllowedLoss : rawEarnedR;
    cumulative += earnedR;
    return { earnedR };
  });

  return {
    earnings,
    earningsNumber: earnings.length,
    totalEarned: earnings.reduce((sum, e) => sum + e.earnedR, 0),
  };
}

export async function seedPairsPipsValues(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(PairPipsValue);
  for (const row of PAIRS_PIPS_VALUES_SEED) {
    const existing = await repository.findOne({ where: { pair: row.pair } });
    if (!existing) {
      await repository.insert(row);
      console.log(`  ✓ Pair pip "${row.pair}" seeded`);
    } else {
      await repository.update(existing.id, row);
      console.log(`  - Pair pip "${row.pair}" updated`);
    }
  }
}

export async function seedTradesForPairs(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(Trade);
  const TOTAL_TRADES = 200;
  const now = new Date();
  const start = new Date(now.getTime() - 89 * 24 * 3600_000); // ~3 months window

  // Pre-shaped sequence to force realistic winning/losing streaks and drawdown periods.
  const seedOutcomePattern: number[] = [];
  const pushRun = (length: number, baseR: number, step = 0.08) => {
    for (let i = 0; i < length; i += 1) {
      const sign = baseR >= 0 ? 1 : -1;
      const magnitude = Math.max(0.15, Math.abs(baseR) + (i % 3) * step);
      seedOutcomePattern.push(Number((sign * magnitude).toFixed(3)));
    }
  };

  // Mix of runs: winning streaks, losing streaks, strong drawdowns, recoveries.
  pushRun(7, 0.55);
  pushRun(5, -0.45);
  pushRun(9, 0.75);
  pushRun(6, -0.65);
  pushRun(8, 0.9);
  pushRun(4, -0.35);
  pushRun(10, 0.6);
  pushRun(7, -0.7);
  pushRun(11, 0.85);
  pushRun(6, -0.5);
  pushRun(12, 0.95);
  pushRun(8, -0.8);
  while (seedOutcomePattern.length < TOTAL_TRADES) {
    const i = seedOutcomePattern.length;
    const wave = Math.sin(i / 5);
    const r = wave >= 0 ? 0.35 + wave * 0.9 : -(0.25 + Math.abs(wave) * 0.7);
    seedOutcomePattern.push(Number(r.toFixed(3)));
  }
  seedOutcomePattern.length = TOTAL_TRADES;

  const tradesPayload: Partial<Trade>[] = [];
  for (let i = 0; i < TOTAL_TRADES; i += 1) {
    const pairSeed = PAIRS_PIPS_VALUES_SEED[i % PAIRS_PIPS_VALUES_SEED.length];
    const pairWithSlash = pairSeed.pair;
    const pair = pairWithSlash.replace('/', '');
    const pip = pairSeed.pairFormat;
    const type: TradeType = i % 2 === 0 ? 'buy' : 'sell';
    const base = basePriceForPair(pairWithSlash) + (i % 5) * pip * 9;
    const executionType = EXEC_TYPES[i % EXEC_TYPES.length];
    const executionTime = new Date(start.getTime() + i * 32_400_000); // every 9h
    const positionSize = 1;
    const riskPips = 16 + (i % 9); // 16..24 pips
    const initialSlPrice = Number((base - riskPips * pip).toFixed(5));
    const targetedR = Number((1.2 + ((i * 17) % 170) / 100).toFixed(2)); // 1.2..2.9

    const desiredTotalR = Math.max(-0.98, Math.min(2.2, seedOutcomePattern[i]));
    const scenario = i % 5;

    let closePrices: Array<{
      price: number;
      type: 'fullClose' | 'partClose';
      lots: number;
      percentage: number;
      time: string;
    }> = [];

    if (scenario === 0 || scenario === 1) {
      // full close
      const pipsFromEntry = desiredTotalR * riskPips;
      closePrices = [
        {
          price: closePriceFromPips(type, Number(base.toFixed(5)), pip, pipsFromEntry),
          type: 'fullClose',
          lots: positionSize,
          percentage: 100,
          time: new Date(executionTime.getTime() + (45 + (i % 4) * 20) * 60_000).toISOString(),
        },
      ];
    } else if (scenario === 2 || scenario === 3) {
      // two partial closes
      const firstPart = Number((desiredTotalR * 0.42).toFixed(4));
      const secondPart = Number((desiredTotalR - firstPart).toFixed(4));
      closePrices = [
        {
          price: closePriceFromPips(type, Number(base.toFixed(5)), pip, firstPart * riskPips / 0.4),
          type: 'partClose',
          lots: 0.4,
          percentage: 40,
          time: new Date(executionTime.getTime() + (30 + (i % 5) * 12) * 60_000).toISOString(),
        },
        {
          price: closePriceFromPips(type, Number(base.toFixed(5)), pip, secondPart * riskPips / 0.6),
          type: 'partClose',
          lots: 0.6,
          percentage: 60,
          time: new Date(executionTime.getTime() + (95 + (i % 6) * 15) * 60_000).toISOString(),
        },
      ];
    } else {
      // three closes for more management variety
      const p1 = Number((desiredTotalR * 0.28).toFixed(4));
      const p2 = Number((desiredTotalR * 0.22).toFixed(4));
      const p3 = Number((desiredTotalR - p1 - p2).toFixed(4));
      closePrices = [
        {
          price: closePriceFromPips(type, Number(base.toFixed(5)), pip, p1 * riskPips / 0.3),
          type: 'partClose',
          lots: 0.3,
          percentage: 30,
          time: new Date(executionTime.getTime() + (25 + (i % 4) * 10) * 60_000).toISOString(),
        },
        {
          price: closePriceFromPips(type, Number(base.toFixed(5)), pip, p2 * riskPips / 0.2),
          type: 'partClose',
          lots: 0.2,
          percentage: 20,
          time: new Date(executionTime.getTime() + (70 + (i % 7) * 11) * 60_000).toISOString(),
        },
        {
          price: closePriceFromPips(type, Number(base.toFixed(5)), pip, p3 * riskPips / 0.5),
          type: 'partClose',
          lots: 0.5,
          percentage: 50,
          time: new Date(executionTime.getTime() + (130 + (i % 5) * 13) * 60_000).toISOString(),
        },
      ];
    }

    const profitFactorEarned = calculateProfitFactorEarned({
      type,
      executionPrice: Number(base.toFixed(5)),
      initialSlPrice,
      positionSize,
      closePrices: closePrices.map((c) => ({ price: c.price, lots: c.lots })),
      pipStep: pip,
    });

    const actualCloseTimes = closePrices.map((c) => new Date(c.time).getTime());
    tradesPayload.push({
      pair,
      type,
      executionType,
      executionTime,
      executionPrice: Number(base.toFixed(5)),
      tpPrice: closePriceFromPips(type, Number(base.toFixed(5)), pip, targetedR * riskPips),
      initialSlPrice,
      slEvolution: [
        { slUpdate1: closePriceFromPips(type, Number(base.toFixed(5)), pip, -riskPips * 0.65) },
        { slUpdate2: closePriceFromPips(type, Number(base.toFixed(5)), pip, -riskPips * 0.4) },
      ],
      profitFactorTargeted: targetedR,
      profitFactorEarned,
      positionSize,
      closePrices,
      tradeCloseTime: new Date(Math.max(...actualCloseTimes)),
      status: 'fullyClosed',
      trackNotes: [],
      pairWatched: null,
    });
  }

  await repository.clear();
  await repository.insert(tradesPayload);
  console.log(`  ✓ Seeded ${tradesPayload.length} analytics trades across ~3 months`);
}
