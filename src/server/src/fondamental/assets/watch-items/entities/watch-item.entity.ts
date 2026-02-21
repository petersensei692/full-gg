import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WeeklyWatchlist } from '../../../weekly/weekly-watchlist/entities/weekly-watchlist.entity';
import { Asset } from '../../entities/asset.entity';

export interface Thesis {
  notes: string;
  images?: string[];
}

@Entity('watch_items')
export class WatchItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WeeklyWatchlist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'watchlist_id' })
  watchlist: WeeklyWatchlist;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'base_asset_id' })
  baseAsset: Asset;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'quote_asset_id' })
  quoteAsset: Asset;

  @Column({ type: 'varchar', length: 255, name: 'pair_name' })
  pairName: string;

  @Column({ type: 'varchar', length: 100 })
  bias: string;

  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to: (v: Thesis | null) => (v == null ? null : JSON.stringify(v)),
      from: (v: string | null) => (v == null ? null : (JSON.parse(v) as Thesis)),
    },
  })
  thesis: Thesis | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
