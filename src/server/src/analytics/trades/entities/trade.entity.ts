import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WatchItem } from '../../../fondamental/assets/watch-items/entities/watch-item.entity';

export type TradeType = 'buy' | 'sell';
export type TradeExecutionType =
  | 'market order'
  | 'buy stop'
  | 'sell stop'
  | 'buy limit'
  | 'sell limit';
export type TradeCloseType = 'fullClose' | 'partClose';
export type TradeStatus =
  | 'pending'
  | 'executed'
  | 'partlyClosed'
  | 'fullyClosed'
  | 'cancelled';

export interface TradeProfitEarning {
  earnedR: number;
}

export interface TradeProfitFactorEarned {
  earnings: TradeProfitEarning[];
  earningsNumber: number;
  totalEarned: number;
}

export interface TradeClosePrice {
  price: number;
  type: TradeCloseType;
  lots: number;
  percentage: number;
  time: string;
}

export interface TradeNote {
  text: string;
  images: string[];
  /** Captions for images (same order as images). */
  imageNames?: string[];
  /** Analysis row IDs on base/quote assets; managed by the server when posting from the journal. */
  linkedAnalysisIds?: string[];
}

export interface TradeSlEvolutionEntry {
  [key: string]: number;
}

function parseJsonArray<T>(v: unknown, fallback: T[]): T[] {
  if (v == null) return fallback;
  if (typeof v !== 'string') return fallback;
  const s = v.trim();
  if (!s) return fallback;
  try {
    const parsed = JSON.parse(s) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function parseJsonObject<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v !== 'string') return fallback;
  const s = v.trim();
  if (!s) return fallback;
  try {
    const parsed = JSON.parse(s) as unknown;
    if (parsed == null || typeof parsed !== 'object') return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

function normalizeProfitFactorEarned(raw: Partial<TradeProfitFactorEarned> | null | undefined): TradeProfitFactorEarned {
  const earnings = Array.isArray(raw?.earnings)
    ? raw!.earnings!.filter((e) => e && typeof e.earnedR === 'number')
    : [];
  return {
    earnings,
    earningsNumber: typeof raw?.earningsNumber === 'number' ? raw.earningsNumber : earnings.length,
    totalEarned: typeof raw?.totalEarned === 'number' ? raw.totalEarned : 0,
  };
}

@Entity('analytics_trades')
export class Trade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  pair: string;

  @Column({ type: 'varchar', length: 10 })
  type: TradeType;

  @Column({ type: 'varchar', name: 'execution_type', length: 20 })
  executionType: TradeExecutionType;

  @Column({ type: 'datetime', name: 'execution_time', nullable: true })
  executionTime: Date | null;

  @Column({ type: 'float', name: 'execution_price' })
  executionPrice: number;

  @Column({ type: 'float', name: 'tp_price' })
  tpPrice: number;

  @Column({ type: 'float', name: 'initial_sl_price', default: 0 })
  initialSlPrice: number;

  @Column({
    type: 'text',
    name: 'sl_evolution',
    default: '[]',
    transformer: {
      to: (v: TradeSlEvolutionEntry[]) => JSON.stringify(v ?? []),
      from: (v: string) => parseJsonArray<TradeSlEvolutionEntry>(v, []),
    },
  })
  slEvolution: TradeSlEvolutionEntry[];

  @Column({ type: 'float', name: 'profit_factor_targeted' })
  profitFactorTargeted: number;

  @Column({
    type: 'text',
    name: 'profit_factor_earned',
    transformer: {
      to: (v: TradeProfitFactorEarned) =>
        JSON.stringify(normalizeProfitFactorEarned(v ?? { earnings: [], earningsNumber: 0, totalEarned: 0 })),
      from: (v: string) => normalizeProfitFactorEarned(parseJsonObject<Partial<TradeProfitFactorEarned>>(v, {})),
    },
  })
  profitFactorEarned: TradeProfitFactorEarned;

  @Column({ type: 'float', name: 'position_size' })
  positionSize: number;

  @Column({
    type: 'text',
    name: 'close_prices',
    transformer: {
      to: (v: TradeClosePrice[]) => JSON.stringify(v ?? []),
      from: (v: string) => parseJsonArray<TradeClosePrice>(v, []),
    },
  })
  closePrices: TradeClosePrice[];

  @Column({ type: 'datetime', name: 'trade_close_time', nullable: true })
  tradeCloseTime: Date | null;

  @Column({ type: 'varchar', length: 20 })
  status: TradeStatus;

  @Column({
    type: 'text',
    name: 'track_notes',
    transformer: {
      to: (v: TradeNote[]) => JSON.stringify(v ?? []),
      from: (v: string) => parseJsonArray<TradeNote>(v, []),
    },
  })
  trackNotes: TradeNote[];

  @ManyToOne(() => WatchItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pair_watched_id' })
  pairWatched: WatchItem | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
