import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScopeLabelAndGlobalAnalysisTable1739061000000
  implements MigrationInterface
{
  name = 'AddScopeLabelAndGlobalAnalysisTable1739061000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "analysis"
      ADD COLUMN "scope_label" varchar(500)
    `);
    await queryRunner.query(`
      ALTER TABLE "analysis"
      ADD COLUMN "global_analysis_id" varchar(36)
    `);
    await queryRunner.query(`
      CREATE TABLE "global_analysis" (
        "id" varchar(36) PRIMARY KEY,
        "notes" text NOT NULL,
        "images" text,
        "image_names" text,
        "scope" text NOT NULL,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "global_analysis"`);
    await queryRunner.query(`ALTER TABLE "analysis" DROP COLUMN "global_analysis_id"`);
    await queryRunner.query(`ALTER TABLE "analysis" DROP COLUMN "scope_label"`);
  }
}
