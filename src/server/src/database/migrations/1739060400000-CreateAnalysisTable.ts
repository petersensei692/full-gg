import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnalysisTable1739060400000 implements MigrationInterface {
  name = 'CreateAnalysisTable1739060400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "analysis" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "notes" text NOT NULL,
        "images" text[],
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_analysis_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "analysis"`);
  }
}
