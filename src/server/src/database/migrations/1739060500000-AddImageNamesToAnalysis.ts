import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageNamesToAnalysis1739060500000 implements MigrationInterface {
  name = 'AddImageNamesToAnalysis1739060500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "analysis"
      ADD COLUMN IF NOT EXISTS "image_names" text[]
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "analysis"
      DROP COLUMN IF EXISTS "image_names"
    `);
  }
}
