import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string; // SQLite stores as varchar(36)

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 50, default: 'currency' })
  type: string;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  /** Position within the asset's type section (1, 2, 3, ...). Used for ordering and reorder (up/down). */
  @Column({ type: 'int', default: 1 })
  place: number;

  /** When false, asset cannot be used as a leg of a trading pair. */
  @Column({ type: 'boolean', name: 'is_tradable', default: true })
  isTradable: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
