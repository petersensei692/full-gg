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

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  note: string;

  @Column({ type: 'varchar', length: 10, default: 'tier_2' })
  tier: string;

  @Column({ type: 'varchar', length: 20, default: 'other' })
  type: string;

  @Column({ type: 'text', nullable: true, transformer: stringArrayTransformer })
  images: string[] | null;

  @Column({ type: 'text', nullable: true, name: 'image_names', transformer: stringArrayTransformer })
  imageNames: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
