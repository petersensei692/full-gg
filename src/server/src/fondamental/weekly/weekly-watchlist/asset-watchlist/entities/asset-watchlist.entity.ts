import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WeeklyWatchlist } from '../../entities/weekly-watchlist.entity';
import { Asset } from '../../../../assets/entities/asset.entity';

@Entity('asset_watchlist')
export class AssetWatchlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'datetime', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'datetime', name: 'end_date' })
  endDate: Date;

  @ManyToOne(() => WeeklyWatchlist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'weekly_watchlist_id' })
  weeklyWatchlist: WeeklyWatchlist;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
