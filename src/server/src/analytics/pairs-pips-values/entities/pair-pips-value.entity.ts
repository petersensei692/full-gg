import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('pairs_pips_values')
export class PairPipsValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  pair: string;

  @Column({ type: 'float', name: 'pair_format' })
  pairFormat: number;

  @Column({ type: 'float', name: 'pip_value' })
  pipValue: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
