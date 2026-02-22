import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WeeklyCalendar } from '../../entities/weekly-calendar.entity';
import { Asset } from '../../../../assets/entities/asset.entity';

@Entity('asset_calendar')
export class AssetCalendar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'datetime', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'datetime', name: 'end_date' })
  endDate: Date;

  @ManyToOne(() => WeeklyCalendar, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'weekly_calendar_id' })
  weeklyCalendar: WeeklyCalendar;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
