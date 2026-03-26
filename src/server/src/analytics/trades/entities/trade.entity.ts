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

  @Column({ type: 'datetime', name: 'execution_time' })
  executionTime: Date;

  @Column({ type: 'float', name: 'execution_price' })
  executionPrice: number;

  @Column({ type: 'float', name: 'tp_price' })
  tpPrice: number;

  @Column({ type: 'float', name: 'sl_price' })
  slPrice: number;

  @Column({ type: 'float', name: 'profit_factor_targeted' })
  profitFactorTargeted: number;

  @Column({
    type: 'text',
    name: 'profit_factor_earned',
    transformer: {
      to: (v: TradeProfitFactorEarned) => JSON.stringify(v),
      from: (v: string) => JSON.parse(v) as TradeProfitFactorEarned,
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
      from: (v: string) => (v ? (JSON.parse(v) as TradeClosePrice[]) : []),
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
      from: (v: string) => (v ? (JSON.parse(v) as TradeNote[]) : []),
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
