import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('analysis')
export class Analysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  notes: string;

  @Column({ type: 'text', array: true, nullable: true })
  images: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
