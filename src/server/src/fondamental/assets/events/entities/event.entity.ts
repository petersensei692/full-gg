import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  AfterLoad,
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

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  /**
   * Pasted image payloads (typically data URLs).
   * Nullable in DB so SQLite synchronize can migrate old rows; always an array after load.
   */
  @Column({ type: 'simple-json', name: 'events_images', nullable: true })
  eventsImages: string[];

  @AfterLoad()
  ensureEventsImages(): void {
    if (this.eventsImages == null || !Array.isArray(this.eventsImages)) {
      this.eventsImages = [];
    }
  }

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
