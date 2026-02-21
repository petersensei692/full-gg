import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('weekly_watchlist')
export class WeeklyWatchlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'datetime', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'datetime', name: 'end_date' })
  endDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
