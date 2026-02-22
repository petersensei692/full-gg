import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WeeklyCalendar } from '../../../weekly/weekly-calendar/entities/weekly-calendar.entity';
import { Asset } from '../../entities/asset.entity';
import { AssetCalendar } from '../../../weekly/weekly-calendar/asset-calendar/entities/asset-calendar.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WeeklyCalendar, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'calendar_id' })
  calendar: WeeklyCalendar | null;

  @ManyToOne(() => AssetCalendar, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'asset_calendar_id' })
  assetCalendar: AssetCalendar | null;

  @Column({ type: 'varchar', length: 50 })
  day: string;

  @Column({ type: 'varchar', length: 50 })
  time: string;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  impact: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
