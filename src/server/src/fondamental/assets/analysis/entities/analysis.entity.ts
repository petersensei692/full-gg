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
import { Asset } from '../../entities/asset.entity';

const stringArrayTransformer: ValueTransformer = {
  to: (v: string[] | null): string | null =>
    v == null ? null : JSON.stringify(v),
  from: (v: string | null): string[] | null =>
    v == null ? null : JSON.parse(v),
};

@Entity('analysis')
export class Analysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'asset_id', nullable: true })
  assetId: string | null;

  @ManyToOne(() => Asset, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset | null;

  @Column({ type: 'text' })
  notes: string;

  @Column({ type: 'text', nullable: true, transformer: stringArrayTransformer })
  images: string[] | null;

  @Column({ type: 'text', nullable: true, name: 'image_names', transformer: stringArrayTransformer })
  imageNames: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
