import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Asset } from '../../../fondamental/assets/entities/asset.entity';

@Entity('pairs')
@Unique(['baseAssetId', 'quoteAssetId'])
export class Pair {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'base_asset_id' })
  baseAssetId: string;

  @Column({ type: 'uuid', name: 'quote_asset_id' })
  quoteAssetId: string;

  @ManyToOne(() => Asset, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'base_asset_id' })
  baseAsset: Asset;

  @ManyToOne(() => Asset, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'quote_asset_id' })
  quoteAsset: Asset;

  /** Denormalized display e.g. EUR/USD — used by trades string match. */
  @Column({ type: 'varchar', length: 32, unique: true })
  pair: string;

  @Column({ type: 'float', name: 'pair_format', default: 0.0001 })
  pairFormat: number;

  /** When null, new trades for this pair are rejected. */
  @Column({ type: 'float', name: 'pip_value', nullable: true })
  pipValue: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
