import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  ValueTransformer,
} from 'typeorm';

const stringArrayTransformer: ValueTransformer = {
  to: (v: string[] | null): string | null =>
    v == null || v.length === 0 ? null : JSON.stringify(v),
  from: (v: string | null): string[] | null =>
    v == null ? null : JSON.parse(v),
};
import { WeeklyWatchlist } from '../../../weekly/weekly-watchlist/entities/weekly-watchlist.entity';
import { AssetWatchlist } from '../../../weekly/weekly-watchlist/asset-watchlist/entities/asset-watchlist.entity';
import { Asset } from '../../entities/asset.entity';

export interface Thesis {
  notes: string;
  images?: string[];
  imageNames?: string[];
}

@Entity('watch_items')
export class WatchItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WeeklyWatchlist, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'watchlist_id' })
  watchlist: WeeklyWatchlist | null;

  @ManyToOne(() => AssetWatchlist, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'base_asset_watchlist_id' })
  baseAssetWatchlist: AssetWatchlist | null;

  @ManyToOne(() => AssetWatchlist, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'quote_asset_watchlist_id' })
  quoteAssetWatchlist: AssetWatchlist | null;

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

  @Column({ type: 'boolean', default: false })
  finished: boolean;

  /** UUIDs of analyses linked from the base asset context (order preserved). */
  @Column({
    type: 'text',
    nullable: true,
    name: 'linked_base_analysis_ids',
    transformer: stringArrayTransformer,
  })
  linkedBaseAnalysisIds: string[] | null;

  /** UUIDs of analyses linked from the quote asset context (order preserved). */
  @Column({
    type: 'text',
    nullable: true,
    name: 'linked_quote_analysis_ids',
    transformer: stringArrayTransformer,
  })
  linkedQuoteAnalysisIds: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
