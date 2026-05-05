import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';

const stringArrayTransformer: ValueTransformer = {
  to: (v: string[] | null): string | null =>
    v == null ? null : JSON.stringify(v),
  from: (v: string | null): string[] | null =>
    v == null ? null : JSON.parse(v),
};

const scopeTransformer: ValueTransformer = {
  to: (v: 'global' | string[]): string =>
    typeof v === 'string' ? v : JSON.stringify(v),
  from: (v: string): 'global' | string[] =>
    v === 'global' ? 'global' : (JSON.parse(v) as string[]),
};

@Entity('global_analysis')
export class GlobalAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  notes: string;

  /** Short headline on stream cards (optional); propagated to asset copies when scoped. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true, transformer: stringArrayTransformer })
  images: string[] | null;

  @Column({ type: 'text', nullable: true, name: 'image_names', transformer: stringArrayTransformer })
  imageNames: string[] | null;

  @Column({ type: 'text', transformer: scopeTransformer })
  scope: 'global' | string[];

  @Column({ type: 'varchar', length: 20, name: 'analysis_type', default: 'daily' })
  analysisType: string;

  @Column({ type: 'boolean', default: false })
  favorite: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
